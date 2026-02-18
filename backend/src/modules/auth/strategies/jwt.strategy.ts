import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const session = await this.authService.validateSession(payload.sessionId);

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Return a consistent user object:
    // - `id` and `userId` both point to the user/admin ID (for @CurrentUser compatibility)
    // - `role` derived from isAdmin flag for RolesGuard compatibility
    // - Admin users get SUPER_ADMIN role (highest privilege)
    return {
      id: payload.sub,
      userId: payload.sub,
      isAdmin: payload.isAdmin,
      role: payload.isAdmin ? 'SUPER_ADMIN' : undefined,
      sessionId: payload.sessionId,
    };
  }
}
