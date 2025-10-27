-- CreateTable
CREATE TABLE "public"."etherscan_cache" (
    "id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etherscan_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "etherscan_cache_request_type_idx" ON "public"."etherscan_cache"("request_type");

-- CreateIndex
CREATE INDEX "etherscan_cache_expires_at_idx" ON "public"."etherscan_cache"("expires_at");

-- CreateIndex
CREATE INDEX "etherscan_cache_created_at_idx" ON "public"."etherscan_cache"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "etherscan_cache_request_type_parameters_key" ON "public"."etherscan_cache"("request_type", "parameters");
