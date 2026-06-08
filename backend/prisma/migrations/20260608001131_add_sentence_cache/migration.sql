-- CreateTable
CREATE TABLE "SentenceCache" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "grammarJson" TEXT NOT NULL,
    "vocabularyJson" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentenceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentenceCache_hash_key" ON "SentenceCache"("hash");

-- CreateIndex
CREATE INDEX "SentenceCache_model_idx" ON "SentenceCache"("model");
