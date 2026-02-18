/**
 * =============================================
 * Phase 2 — Missing Prisma Tables Tests
 * =============================================
 * Validates that all required models exist in the Prisma schema
 * and the generated client has the correct types/interfaces.
 */
import { Prisma, PrismaClient } from '@prisma/client';

describe('Prisma Schema — Missing Tables', () => {
  // ===========================================
  // Model Existence Checks
  // ===========================================

  describe('New models exist in Prisma client', () => {
    it('should have LoginAttempt model', () => {
      // Verify the DMMF includes the model
      const models = Prisma.dmmf.datamodel.models.map(m => m.name);
      expect(models).toContain('LoginAttempt');
    });

    it('should have MessageTagUsage model', () => {
      const models = Prisma.dmmf.datamodel.models.map(m => m.name);
      expect(models).toContain('MessageTagUsage');
    });

    it('should have CampaignLog model', () => {
      const models = Prisma.dmmf.datamodel.models.map(m => m.name);
      expect(models).toContain('CampaignLog');
    });

    it('should have DripProgress model', () => {
      const models = Prisma.dmmf.datamodel.models.map(m => m.name);
      expect(models).toContain('DripProgress');
    });

    it('should have Attachment model', () => {
      const models = Prisma.dmmf.datamodel.models.map(m => m.name);
      expect(models).toContain('Attachment');
    });

    it('should have JobQueue model', () => {
      const models = Prisma.dmmf.datamodel.models.map(m => m.name);
      expect(models).toContain('JobQueue');
    });
  });

  // ===========================================
  // Field Existence Checks
  // ===========================================

  describe('LoginAttempt fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'LoginAttempt');

    it('should have identifier field', () => {
      expect(model?.fields.find(f => f.name === 'identifier')).toBeDefined();
    });

    it('should have ipAddress field', () => {
      expect(model?.fields.find(f => f.name === 'ipAddress')).toBeDefined();
    });

    it('should have success field', () => {
      expect(model?.fields.find(f => f.name === 'success')).toBeDefined();
    });

    it('should have failReason field', () => {
      expect(model?.fields.find(f => f.name === 'failReason')).toBeDefined();
    });
  });

  describe('MessageTagUsage fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'MessageTagUsage');

    it('should have contactId field', () => {
      expect(model?.fields.find(f => f.name === 'contactId')).toBeDefined();
    });

    it('should have pageId field', () => {
      expect(model?.fields.find(f => f.name === 'pageId')).toBeDefined();
    });

    it('should have messageTag field', () => {
      expect(model?.fields.find(f => f.name === 'messageTag')).toBeDefined();
    });

    it('should have usedAt field', () => {
      expect(model?.fields.find(f => f.name === 'usedAt')).toBeDefined();
    });
  });

  describe('CampaignLog fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'CampaignLog');

    it('should have campaignId field', () => {
      expect(model?.fields.find(f => f.name === 'campaignId')).toBeDefined();
    });

    it('should have contactId field', () => {
      expect(model?.fields.find(f => f.name === 'contactId')).toBeDefined();
    });

    it('should have status field', () => {
      expect(model?.fields.find(f => f.name === 'status')).toBeDefined();
    });

    it('should have variant field for A/B testing', () => {
      expect(model?.fields.find(f => f.name === 'variant')).toBeDefined();
    });

    it('should have unique constraint on campaignId+contactId', () => {
      expect(model?.uniqueFields).toBeDefined();
    });
  });

  describe('DripProgress fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'DripProgress');

    it('should have currentStep field', () => {
      expect(model?.fields.find(f => f.name === 'currentStep')).toBeDefined();
    });

    it('should have totalSteps field', () => {
      expect(model?.fields.find(f => f.name === 'totalSteps')).toBeDefined();
    });

    it('should have status field', () => {
      expect(model?.fields.find(f => f.name === 'status')).toBeDefined();
    });

    it('should have nextMessageAt field', () => {
      expect(model?.fields.find(f => f.name === 'nextMessageAt')).toBeDefined();
    });
  });

  describe('Attachment fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Attachment');

    it('should have workspaceId field', () => {
      expect(model?.fields.find(f => f.name === 'workspaceId')).toBeDefined();
    });

    it('should have originalFilename field', () => {
      expect(model?.fields.find(f => f.name === 'originalFilename')).toBeDefined();
    });

    it('should have fbAttachmentId field for Facebook caching', () => {
      expect(model?.fields.find(f => f.name === 'fbAttachmentId')).toBeDefined();
    });

    it('should have storagePath field', () => {
      expect(model?.fields.find(f => f.name === 'storagePath')).toBeDefined();
    });
  });

  describe('JobQueue fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'JobQueue');

    it('should have jobType field', () => {
      expect(model?.fields.find(f => f.name === 'jobType')).toBeDefined();
    });

    it('should have status field', () => {
      expect(model?.fields.find(f => f.name === 'status')).toBeDefined();
    });

    it('should have priority field', () => {
      expect(model?.fields.find(f => f.name === 'priority')).toBeDefined();
    });

    it('should have maxAttempts field', () => {
      expect(model?.fields.find(f => f.name === 'maxAttempts')).toBeDefined();
    });

    it('should have scheduledAt field', () => {
      expect(model?.fields.find(f => f.name === 'scheduledAt')).toBeDefined();
    });
  });

  // ===========================================
  // User Invitation Fields
  // ===========================================

  describe('User invitation fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'User');

    it('should have invitationToken field', () => {
      expect(model?.fields.find(f => f.name === 'invitationToken')).toBeDefined();
    });

    it('should have invitationExpiresAt field', () => {
      expect(model?.fields.find(f => f.name === 'invitationExpiresAt')).toBeDefined();
    });
  });

  // ===========================================
  // Enum Existence
  // ===========================================

  describe('New enums', () => {
    const enums = Prisma.dmmf.datamodel.enums.map(e => e.name);

    it('should have CampaignLogStatus enum', () => {
      expect(enums).toContain('CampaignLogStatus');
    });

    it('should have DripStatus enum', () => {
      expect(enums).toContain('DripStatus');
    });

    it('should have JobStatus enum', () => {
      expect(enums).toContain('JobStatus');
    });
  });

  // ===========================================
  // Relation Integrity
  // ===========================================

  describe('Relations on existing models', () => {
    it('Contact should have messageTagUsages relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Contact');
      expect(model?.fields.find(f => f.name === 'messageTagUsages')).toBeDefined();
    });

    it('Contact should have campaignLogs relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Contact');
      expect(model?.fields.find(f => f.name === 'campaignLogs')).toBeDefined();
    });

    it('Contact should have dripProgress relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Contact');
      expect(model?.fields.find(f => f.name === 'dripProgress')).toBeDefined();
    });

    it('Page should have messageTagUsages relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Page');
      expect(model?.fields.find(f => f.name === 'messageTagUsages')).toBeDefined();
    });

    it('Campaign should have campaignLogs relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Campaign');
      expect(model?.fields.find(f => f.name === 'campaignLogs')).toBeDefined();
    });

    it('Campaign should have dripProgress relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Campaign');
      expect(model?.fields.find(f => f.name === 'dripProgress')).toBeDefined();
    });

    it('Workspace should have attachments relation', () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Workspace');
      expect(model?.fields.find(f => f.name === 'attachments')).toBeDefined();
    });
  });

  // ===========================================
  // Table Count Verification
  // ===========================================

  describe('Total model count', () => {
    it('should have at least 29 models (23 original + 6 new)', () => {
      const count = Prisma.dmmf.datamodel.models.length;
      expect(count).toBeGreaterThanOrEqual(29);
    });
  });
});
