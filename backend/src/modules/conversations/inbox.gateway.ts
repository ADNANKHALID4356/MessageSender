import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  adminId?: string;
  workspaceId?: string;
}

// CORS origin is configured dynamically in afterInit() via ConfigService
@WebSocketGateway({
  namespace: '/inbox',
})
export class InboxGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxGateway.name);

  // Track which users are in which workspace rooms
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  afterInit() {
    // Configure WebSocket CORS to match HTTP CORS (reads FRONTEND_URL)
    const frontendUrls = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .split(',')
      .map(u => u.trim());
    if (this.server) {
      (this.server as any).opts = {
        ...(this.server as any).opts,
        cors: {
          origin: frontendUrls,
          credentials: true,
        },
      };
    }
    this.logger.log(`Inbox WebSocket Gateway initialized (CORS: ${frontendUrls.join(', ')})`);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET', 'default_jwt_secret_change_me_in_production'),
      });

      client.userId = payload.sub;
      client.adminId = payload.adminId;

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Unauthorized WebSocket connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Remove from all workspace rooms
    if (client.workspaceId) {
      const room = `workspace:${client.workspaceId}`;
      client.leave(room);

      const users = this.connectedUsers.get(client.workspaceId);
      if (users) {
        users.delete(client.id);
        if (users.size === 0) this.connectedUsers.delete(client.workspaceId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ===========================================
  // CLIENT EVENTS
  // ===========================================

  @SubscribeMessage('join:workspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string },
  ) {
    const room = `workspace:${data.workspaceId}`;
    client.join(room);
    client.workspaceId = data.workspaceId;

    if (!this.connectedUsers.has(data.workspaceId)) {
      this.connectedUsers.set(data.workspaceId, new Set());
    }
    this.connectedUsers.get(data.workspaceId)!.add(client.id);

    this.logger.debug(`Client ${client.id} joined workspace ${data.workspaceId}`);
    return { event: 'joined', data: { workspaceId: data.workspaceId } };
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation:${data.conversationId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined conversation ${data.conversationId}`);
    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { event: 'left', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing:start', { userId: client.userId, conversationId: data.conversationId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing:stop', { userId: client.userId, conversationId: data.conversationId });
  }

  // ===========================================
  // SERVER-SIDE EMITTERS (called from services)
  // ===========================================

  /** Notify workspace of new message */
  emitNewMessage(workspaceId: string, conversationId: string, message: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('message:new', { conversationId, message });
    this.server.to(`conversation:${conversationId}`).emit('message:new', { message });
  }

  /** Notify workspace of conversation update (assignment, status change, etc.) */
  emitConversationUpdate(workspaceId: string, conversation: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('conversation:updated', { conversation });
  }

  /** Notify workspace of new conversation */
  emitNewConversation(workspaceId: string, conversation: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('conversation:new', { conversation });
  }

  /** Notify workspace of message status update */
  emitMessageStatus(workspaceId: string, conversationId: string, messageId: string, status: string) {
    this.server.to(`conversation:${conversationId}`).emit('message:status', { messageId, status });
  }

  /** Notify workspace of contact update */
  emitContactUpdate(workspaceId: string, contact: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('contact:updated', { contact });
  }

  /** Notify of campaign progress */
  emitCampaignProgress(workspaceId: string, campaignId: string, progress: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('campaign:progress', { campaignId, progress });
  }

  /** Get online user count for workspace */
  getOnlineCount(workspaceId: string): number {
    return this.connectedUsers.get(workspaceId)?.size ?? 0;
  }

  // ===========================================
  // Private
  // ===========================================

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return client.handshake?.auth?.token || client.handshake?.query?.token as string || null;
  }
}
