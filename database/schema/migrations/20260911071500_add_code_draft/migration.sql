-- CreateTable
CREATE TABLE "CodeDraft" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "codingQuestionId" TEXT NOT NULL,
    "language" "CodingLanguage" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeDraft_candidateId_idx" ON "CodeDraft"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeDraft_candidateId_codingQuestionId_language_key" ON "CodeDraft"("candidateId", "codingQuestionId", "language");

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
