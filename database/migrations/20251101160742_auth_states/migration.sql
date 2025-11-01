/*
  Warnings:

  - The values [PENDING,VERIFICATION_FAILED,BATCHED,SETTLING] on the enum `AuthorizationStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUBMITTING] on the enum `BatchStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `authorization_valid` on the `authorizations` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuthorizationStatus_new" AS ENUM ('VERIFIED', 'AUTHORIZE', 'TIMELOCK', 'READY', 'EXPIRED', 'SETTLED', 'FAILED', 'CANCELLED');
ALTER TABLE "public"."authorizations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."authorizations" ALTER COLUMN "status" TYPE "public"."AuthorizationStatus_new" USING ("status"::text::"public"."AuthorizationStatus_new");
ALTER TYPE "public"."AuthorizationStatus" RENAME TO "AuthorizationStatus_old";
ALTER TYPE "public"."AuthorizationStatus_new" RENAME TO "AuthorizationStatus";
DROP TYPE "public"."AuthorizationStatus_old";
ALTER TABLE "public"."authorizations" ALTER COLUMN "status" SET DEFAULT 'VERIFIED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."BatchStatus_new" AS ENUM ('PENDING', 'READY', 'SUBMITTED', 'CONFIRMED', 'FAILED');
ALTER TABLE "public"."authorization_batches" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."authorization_batches" ALTER COLUMN "status" TYPE "public"."BatchStatus_new" USING ("status"::text::"public"."BatchStatus_new");
ALTER TYPE "public"."BatchStatus" RENAME TO "BatchStatus_old";
ALTER TYPE "public"."BatchStatus_new" RENAME TO "BatchStatus";
DROP TYPE "public"."BatchStatus_old";
ALTER TABLE "public"."authorization_batches" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."authorizations" DROP COLUMN "authorization_valid",
ALTER COLUMN "status" SET DEFAULT 'VERIFIED';
