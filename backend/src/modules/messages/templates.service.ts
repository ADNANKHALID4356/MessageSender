import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
} from './dto/template.dto';

// Re-export DTOs for backward compatibility
export { CreateTemplateDto, UpdateTemplateDto, CreateCannedResponseDto, UpdateCannedResponseDto };

// ===========================================
// Service
// ===========================================

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================
  // MESSAGE TEMPLATES
  // ===========================================

  async createTemplate(workspaceId: string, dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        workspaceId,
        name: dto.name,
        category: dto.category || 'general',
        content: dto.content as any,
      },
    });
  }

  async getTemplates(workspaceId: string, category?: string) {
    const where: Record<string, unknown> = { workspaceId, isActive: true };
    if (category) where.category = category;

    return this.prisma.messageTemplate.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });
  }

  async getTemplate(workspaceId: string, templateId: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(workspaceId: string, templateId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        category: dto.category,
        content: dto.content as any,
        isActive: dto.isActive,
      },
    });
  }

  async deleteTemplate(workspaceId: string, templateId: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });
    if (!template) throw new NotFoundException('Template not found');

    await this.prisma.messageTemplate.delete({ where: { id: templateId } });
    return { deleted: true };
  }

  async incrementTemplateUsage(templateId: string) {
    await this.prisma.messageTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });
  }

  async getTemplateCategories(workspaceId: string) {
    const templates = await this.prisma.messageTemplate.findMany({
      where: { workspaceId, isActive: true },
      select: { category: true },
      distinct: ['category'],
    });
    return templates.map((t) => t.category);
  }

  // ===========================================
  // CANNED RESPONSES
  // ===========================================

  async createCannedResponse(workspaceId: string, dto: CreateCannedResponseDto) {
    // Check for duplicate shortcut
    const existing = await this.prisma.cannedResponse.findUnique({
      where: { workspaceId_shortcut: { workspaceId, shortcut: dto.shortcut } },
    });
    if (existing) {
      throw new ConflictException(`Shortcut "/${dto.shortcut}" already exists`);
    }

    return this.prisma.cannedResponse.create({
      data: {
        workspaceId,
        shortcut: dto.shortcut,
        title: dto.title,
        content: dto.content,
        category: dto.category || 'general',
      },
    });
  }

  async getCannedResponses(workspaceId: string, category?: string) {
    const where: Record<string, unknown> = { workspaceId };
    if (category) where.category = category;

    return this.prisma.cannedResponse.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
    });
  }

  async updateCannedResponse(workspaceId: string, responseId: string, dto: UpdateCannedResponseDto) {
    const response = await this.prisma.cannedResponse.findFirst({
      where: { id: responseId, workspaceId },
    });
    if (!response) throw new NotFoundException('Canned response not found');

    // Check duplicate shortcut if changing
    if (dto.shortcut && dto.shortcut !== response.shortcut) {
      const existing = await this.prisma.cannedResponse.findUnique({
        where: { workspaceId_shortcut: { workspaceId, shortcut: dto.shortcut } },
      });
      if (existing) throw new ConflictException(`Shortcut "/${dto.shortcut}" already exists`);
    }

    return this.prisma.cannedResponse.update({
      where: { id: responseId },
      data: {
        shortcut: dto.shortcut,
        title: dto.title,
        content: dto.content,
        category: dto.category,
      },
    });
  }

  async deleteCannedResponse(workspaceId: string, responseId: string) {
    const response = await this.prisma.cannedResponse.findFirst({
      where: { id: responseId, workspaceId },
    });
    if (!response) throw new NotFoundException('Canned response not found');

    await this.prisma.cannedResponse.delete({ where: { id: responseId } });
    return { deleted: true };
  }

  async findCannedByShortcut(workspaceId: string, shortcut: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { workspaceId_shortcut: { workspaceId, shortcut } },
    });

    if (response) {
      // Increment usage
      await this.prisma.cannedResponse.update({
        where: { id: response.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    return response;
  }
}
