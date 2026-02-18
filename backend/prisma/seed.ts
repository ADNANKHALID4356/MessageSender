import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@messagesender.com',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
    },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'default-workspace' },
    update: {},
    create: {
      id: 'default-workspace',
      name: 'Default Workspace',
      description: 'Default workspace for testing',
      colorTheme: '#3B82F6',
      isActive: true,
      sortOrder: 0,
    },
  });

  console.log(`✅ Workspace created: ${workspace.name}`);

  // Create sample user
  const userPassword = await bcrypt.hash('User@123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'user@messagesender.com' },
    update: {},
    create: {
      email: 'user@messagesender.com',
      passwordHash: userPassword,
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Give user access to workspace
  await prisma.workspaceUserAccess.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      permissionLevel: 'MANAGER',
    },
  });

  console.log(`✅ User granted MANAGER access to workspace`);

  // Create sample tags
  const tagColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
  const tagNames = ['VIP', 'Hot Lead', 'Subscriber', 'Newsletter', 'Support'];

  for (let i = 0; i < tagNames.length; i++) {
    await prisma.tag.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: tagNames[i],
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: tagNames[i],
        color: tagColors[i],
      },
    });
  }

  console.log(`✅ Sample tags created`);

  // ===========================================
  // Default Facebook Message Tag Templates
  // These are pre-built templates for the 4 Facebook-approved
  // message tags that allow messaging beyond the 24-hour window
  // ===========================================

  const facebookTagTemplates = [
    {
      name: 'Event Reminder',
      category: 'CONFIRMED_EVENT_UPDATE',
      content: {
        text: 'Hi {{name}}! This is a reminder about your upcoming event: {{event_name}} on {{event_date}}. We look forward to seeing you there!',
      },
    },
    {
      name: 'Event Cancellation Notice',
      category: 'CONFIRMED_EVENT_UPDATE',
      content: {
        text: 'Hi {{name}}, we regret to inform you that {{event_name}} scheduled for {{event_date}} has been cancelled. We apologize for any inconvenience.',
      },
    },
    {
      name: 'Event Schedule Change',
      category: 'CONFIRMED_EVENT_UPDATE',
      content: {
        text: 'Hi {{name}}, the schedule for {{event_name}} has been updated. The new date/time is {{new_date}}. Please update your calendar accordingly.',
      },
    },
    {
      name: 'Order Confirmation',
      category: 'POST_PURCHASE_UPDATE',
      content: {
        text: 'Thank you for your order, {{name}}! Your order #{{order_id}} has been confirmed. You will receive a shipping update soon.',
      },
    },
    {
      name: 'Shipping Update',
      category: 'POST_PURCHASE_UPDATE',
      content: {
        text: 'Great news, {{name}}! Your order #{{order_id}} has been shipped. Track your package here: {{tracking_url}}',
      },
    },
    {
      name: 'Delivery Confirmation',
      category: 'POST_PURCHASE_UPDATE',
      content: {
        text: 'Hi {{name}}, your order #{{order_id}} has been delivered! We hope you enjoy your purchase. Let us know if you have any questions.',
      },
    },
    {
      name: 'Account Status Update',
      category: 'ACCOUNT_UPDATE',
      content: {
        text: 'Hi {{name}}, there has been an update to your account. {{update_details}}. If you did not make this change, please contact support immediately.',
      },
    },
    {
      name: 'Payment Issue Alert',
      category: 'ACCOUNT_UPDATE',
      content: {
        text: 'Hi {{name}}, we encountered an issue processing your payment. Please update your payment method to avoid service interruption. {{action_url}}',
      },
    },
    {
      name: 'Profile Verification',
      category: 'ACCOUNT_UPDATE',
      content: {
        text: 'Hi {{name}}, your account verification is {{status}}. {{additional_info}}',
      },
    },
    {
      name: 'Human Agent Follow-up',
      category: 'HUMAN_AGENT',
      content: {
        text: 'Hi {{name}}, this is {{agent_name}} following up on your support request #{{ticket_id}}. {{message}}',
      },
    },
    {
      name: 'Support Resolution',
      category: 'HUMAN_AGENT',
      content: {
        text: 'Hi {{name}}, your support request #{{ticket_id}} has been resolved. If you need further assistance, please don\'t hesitate to reach out.',
      },
    },
  ];

  for (const template of facebookTagTemplates) {
    // Use upsert-like logic: check if exists first
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        workspaceId: workspace.id,
        name: template.name,
      },
    });

    if (!existing) {
      await prisma.messageTemplate.create({
        data: {
          workspaceId: workspace.id,
          name: template.name,
          category: template.category,
          content: template.content,
          isActive: true,
        },
      });
    }
  }

  console.log(`✅ Facebook message tag templates created (${facebookTagTemplates.length} templates)`);

  // ===========================================
  // Default Canned Responses
  // ===========================================

  const defaultCannedResponses = [
    {
      shortcut: 'greeting',
      title: 'Welcome Greeting',
      content: 'Hi there! 👋 Welcome! How can we help you today?',
      category: 'general',
    },
    {
      shortcut: 'thanks',
      title: 'Thank You',
      content: 'Thank you for reaching out! We appreciate your message and will get back to you shortly.',
      category: 'general',
    },
    {
      shortcut: 'hours',
      title: 'Business Hours',
      content: 'Our business hours are Monday-Friday, 9 AM - 6 PM. We\'ll respond to your message as soon as possible during these hours.',
      category: 'support',
    },
    {
      shortcut: 'escalate',
      title: 'Escalation Notice',
      content: 'I\'m escalating your request to our specialist team. Someone will follow up with you within 24 hours.',
      category: 'support',
    },
    {
      shortcut: 'bye',
      title: 'Closing Message',
      content: 'Thank you for contacting us! If you have any other questions, feel free to message us anytime. Have a great day! 😊',
      category: 'general',
    },
  ];

  for (const cr of defaultCannedResponses) {
    const existing = await prisma.cannedResponse.findUnique({
      where: {
        workspaceId_shortcut: {
          workspaceId: workspace.id,
          shortcut: cr.shortcut,
        },
      },
    });

    if (!existing) {
      await prisma.cannedResponse.create({
        data: {
          workspaceId: workspace.id,
          shortcut: cr.shortcut,
          title: cr.title,
          content: cr.content,
          category: cr.category,
        },
      });
    }
  }

  console.log(`✅ Default canned responses created (${defaultCannedResponses.length} responses)`);

  // Create sample custom field definitions
  const customFields = [
    { name: 'Phone Number', key: 'phone', type: 'TEXT' },
    { name: 'Company', key: 'company', type: 'TEXT' },
    { name: 'Lead Score', key: 'lead_score', type: 'NUMBER' },
    { name: 'Subscription Date', key: 'subscription_date', type: 'DATE' },
    { name: 'Interest', key: 'interest', type: 'DROPDOWN' },
  ];

  for (let i = 0; i < customFields.length; i++) {
    await prisma.customFieldDefinition.upsert({
      where: {
        workspaceId_fieldKey: {
          workspaceId: workspace.id,
          fieldKey: customFields[i].key,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        fieldName: customFields[i].name,
        fieldKey: customFields[i].key,
        fieldType: customFields[i].type as any,
        options: customFields[i].type === 'DROPDOWN' 
          ? ['Product A', 'Product B', 'Service', 'Support'] 
          : [],
        sortOrder: i,
      },
    });
  }

  console.log(`✅ Custom field definitions created`);

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin: admin / Admin@123');
  console.log('   User:  user@messagesender.com / User@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
