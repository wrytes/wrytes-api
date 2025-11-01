-- CreateEnum
CREATE TYPE "public"."AuthorizationStatus" AS ENUM ('PENDING', 'VERIFIED', 'VERIFICATION_FAILED', 'BATCHED', 'SETTLING', 'SETTLED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('PENDING', 'READY', 'SUBMITTING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."authorizations" (
    "id" TEXT NOT NULL,
    "kind" INTEGER NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "valid_after" TEXT NOT NULL,
    "valid_before" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signer" TEXT NOT NULL,
    "status" "public"."AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "authorization_valid" BOOLEAN,
    "allowance_amount" TEXT,
    "settlement_hash" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."authorization_batches" (
    "id" TEXT NOT NULL,
    "batch_number" SERIAL NOT NULL,
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'PENDING',
    "max_items" INTEGER NOT NULL DEFAULT 50,
    "max_value" TEXT,
    "max_wait_time" INTEGER NOT NULL DEFAULT 3600,
    "transaction_hash" TEXT,
    "gas_used" TEXT,
    "gas_price" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "authorization_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."authorization_batch_members" (
    "id" TEXT NOT NULL,
    "authorization_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_batch_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authorizations_signer_idx" ON "public"."authorizations"("signer");

-- CreateIndex
CREATE INDEX "authorizations_nonce_idx" ON "public"."authorizations"("nonce");

-- CreateIndex
CREATE INDEX "authorizations_status_idx" ON "public"."authorizations"("status");

-- CreateIndex
CREATE INDEX "authorizations_kind_idx" ON "public"."authorizations"("kind");

-- CreateIndex
CREATE INDEX "authorizations_from_address_idx" ON "public"."authorizations"("from_address");

-- CreateIndex
CREATE INDEX "authorizations_to_address_idx" ON "public"."authorizations"("to_address");

-- CreateIndex
CREATE INDEX "authorizations_token_idx" ON "public"."authorizations"("token");

-- CreateIndex
CREATE INDEX "authorizations_created_at_idx" ON "public"."authorizations"("created_at");

-- CreateIndex
CREATE INDEX "authorizations_settled_at_idx" ON "public"."authorizations"("settled_at");

-- CreateIndex
CREATE UNIQUE INDEX "authorizations_signer_nonce_key" ON "public"."authorizations"("signer", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "authorization_batches_batch_number_key" ON "public"."authorization_batches"("batch_number");

-- CreateIndex
CREATE INDEX "authorization_batches_status_idx" ON "public"."authorization_batches"("status");

-- CreateIndex
CREATE INDEX "authorization_batches_created_at_idx" ON "public"."authorization_batches"("created_at");

-- CreateIndex
CREATE INDEX "authorization_batches_submitted_at_idx" ON "public"."authorization_batches"("submitted_at");

-- CreateIndex
CREATE INDEX "authorization_batch_members_batch_id_idx" ON "public"."authorization_batch_members"("batch_id");

-- CreateIndex
CREATE INDEX "authorization_batch_members_authorization_id_idx" ON "public"."authorization_batch_members"("authorization_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorization_batch_members_authorization_id_batch_id_key" ON "public"."authorization_batch_members"("authorization_id", "batch_id");

-- AddForeignKey
ALTER TABLE "public"."authorization_batch_members" ADD CONSTRAINT "authorization_batch_members_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "public"."authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."authorization_batch_members" ADD CONSTRAINT "authorization_batch_members_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."authorization_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
