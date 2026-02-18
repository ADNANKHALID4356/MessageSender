/*
  Warnings:

  - You are about to drop the column `is_active` on the `recurring_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `messages_sent_count` on the `recurring_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `opted_out_at` on the `recurring_subscriptions` table. All the data in the column will be lost.
  - Changed the type of `frequency` on the `recurring_subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED');

-- DropIndex
DROP INDEX "otn_tokens_token_key";

-- DropIndex
DROP INDEX "recurring_subscriptions_is_active_idx";

-- DropIndex
DROP INDEX "recurring_subscriptions_token_key";

-- AlterTable
ALTER TABLE "recurring_subscriptions" DROP COLUMN "is_active",
DROP COLUMN "messages_sent_count",
DROP COLUMN "opted_out_at",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "messages_sent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "next_allowed_at" TIMESTAMP(3),
ADD COLUMN     "payload" VARCHAR(500),
ADD COLUMN     "requested_at" TIMESTAMP(3),
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "title" VARCHAR(100),
ALTER COLUMN "token" DROP NOT NULL,
DROP COLUMN "frequency",
ADD COLUMN     "frequency" VARCHAR(20) NOT NULL,
ALTER COLUMN "opted_in_at" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "otn_tokens_token_idx" ON "otn_tokens"("token");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_status_idx" ON "recurring_subscriptions"("status");
