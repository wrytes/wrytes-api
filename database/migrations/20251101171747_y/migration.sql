/*
  Warnings:

  - You are about to drop the `authorization_batch_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `authorization_batches` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."authorization_batch_members" DROP CONSTRAINT "authorization_batch_members_authorization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."authorization_batch_members" DROP CONSTRAINT "authorization_batch_members_batch_id_fkey";

-- DropTable
DROP TABLE "public"."authorization_batch_members";

-- DropTable
DROP TABLE "public"."authorization_batches";

-- DropEnum
DROP TYPE "public"."BatchStatus";
