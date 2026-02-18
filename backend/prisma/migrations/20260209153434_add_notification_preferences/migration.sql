-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "notification_preferences" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notification_preferences" JSONB DEFAULT '{}';
