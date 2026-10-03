/*
  Warnings:

  - A unique constraint covering the columns `[candidateId,assessmentId,sessionId,codingQuestionId,language]` on the table `CodeDraft` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assessmentId` to the `CodeDraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `CodeDraft` table without a default value. This is not possible if the table is not empty.

*/
DELETE FROM "CodeDraft";
-- DropIndex
DROP INDEX "CodeDraft_candidateId_codingQuestionId_language_key";

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "photoData" BYTEA,
ADD COLUMN     "photoMimeType" TEXT;

-- AlterTable
ALTER TABLE "CodeDraft" ADD COLUMN     "assessmentId" TEXT NOT NULL,
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CodeDraft_candidateId_assessmentId_sessionId_codingQuestion_key" ON "CodeDraft"("candidateId", "assessmentId", "sessionId", "codingQuestionId", "language");