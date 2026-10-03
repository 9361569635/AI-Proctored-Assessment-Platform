-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'MANAGEMENT', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "FinalStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'NOT_SHORTLISTED', 'UNDER_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShortlistCategory" AS ENUM ('STRONGLY_RECOMMENDED', 'RECOMMENDED', 'CONSIDER', 'UNDER_REVIEW', 'NOT_SHORTLISTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionSourceType" AS ENUM ('AI_GENERATED', 'CURATED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('APTITUDE', 'LOGICAL', 'REASONING', 'COMMUNICATION', 'GRAMMAR', 'EASY_CODING', 'MODERATE_CODING', 'HARD_CODING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'COMPLETED', 'FAILED_ELIGIBILITY');

-- CreateEnum
CREATE TYPE "CodingLanguage" AS ENUM ('PYTHON', 'C', 'CPP', 'JAVA', 'R', 'SWIFT');

-- CreateEnum
CREATE TYPE "ProctoringSeverity" AS ENUM ('INFO', 'WARNING', 'VIOLATION', 'CRITICAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "parsedData" JSONB NOT NULL,
    "matchResult" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "proficiency" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "session" "SessionType" NOT NULL,
    "question" TEXT NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'AI_GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessmentSessionId" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCodingQuestion" (
    "id" TEXT NOT NULL,
    "assessmentSessionId" TEXT NOT NULL,
    "codingQuestionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SessionCodingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "totalScore" DOUBLE PRECISION,
    "eligibility" "EligibilityStatus" NOT NULL DEFAULT 'PENDING',
    "resultReleaseTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSession" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "status" "SessionStatus" NOT NULL DEFAULT 'LOCKED',

    CONSTRAINT "AssessmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "marks" DOUBLE PRECISION,
    "timeTaken" INTEGER,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingQuestion" (
    "id" TEXT NOT NULL,
    "session" "SessionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "marks" INTEGER NOT NULL,

    CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "codingQuestionId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingSubmission" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "codingQuestionId" TEXT NOT NULL,
    "language" "CodingLanguage" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "passedTests" INTEGER NOT NULL,
    "totalTests" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "executionTimeMs" INTEGER,
    "memoryUsageKb" INTEGER,
    "compileError" TEXT,
    "runtimeError" TEXT,
    "testCaseResults" JSONB,

    CONSTRAINT "CodingResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioResponse" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "audioFilePath" TEXT NOT NULL,
    "transcript" TEXT,
    "similarityScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" "ProctoringSeverity" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "candidateId" TEXT NOT NULL,
    "aptitudeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logicalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasoningScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communicationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grammarScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "easyCodingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moderateCodingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hardCodingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("candidateId")
);

-- CreateTable
CREATE TABLE "Shortlisting" (
    "candidateId" TEXT NOT NULL,
    "eligibility" "EligibilityStatus" NOT NULL DEFAULT 'PENDING',
    "finalStatus" "FinalStatus" NOT NULL DEFAULT 'PENDING',
    "category" "ShortlistCategory",
    "managementComment" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "resultReleaseAt" TIMESTAMP(3),
    "aiAnalysis" JSONB,

    CONSTRAINT "Shortlisting_pkey" PRIMARY KEY ("candidateId")
);

-- CreateTable
CREATE TABLE "SecurityCapability" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "camera" BOOLEAN NOT NULL,
    "microphone" BOOLEAN NOT NULL,
    "fullscreen" BOOLEAN NOT NULL,
    "clipboardBlocking" BOOLEAN NOT NULL,
    "visibilityMonitor" BOOLEAN NOT NULL,
    "faceDetection" BOOLEAN NOT NULL,
    "phoneDetection" BOOLEAN NOT NULL,
    "voiceMonitoring" BOOLEAN NOT NULL,
    "dynamicWatermark" BOOLEAN NOT NULL,
    "secureExamMode" BOOLEAN NOT NULL,
    "userAgent" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "SecurityCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");

-- CreateIndex
CREATE INDEX "Candidate_jobRoleId_idx" ON "Candidate"("jobRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementUser_userId_key" ON "ManagementUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_candidateId_key" ON "Resume"("candidateId");

-- CreateIndex
CREATE INDEX "Skill_candidateId_idx" ON "Skill"("candidateId");

-- CreateIndex
CREATE INDEX "Question_assessmentSessionId_idx" ON "Question"("assessmentSessionId");

-- CreateIndex
CREATE INDEX "SessionCodingQuestion_assessmentSessionId_idx" ON "SessionCodingQuestion"("assessmentSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCodingQuestion_assessmentSessionId_codingQuestionId_key" ON "SessionCodingQuestion"("assessmentSessionId", "codingQuestionId");

-- CreateIndex
CREATE INDEX "Assessment_candidateId_idx" ON "Assessment"("candidateId");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "AssessmentSession_assessmentId_idx" ON "AssessmentSession"("assessmentId");

-- CreateIndex
CREATE INDEX "Answer_sessionId_idx" ON "Answer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_questionId_key" ON "Answer"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "TestCase_codingQuestionId_idx" ON "TestCase"("codingQuestionId");

-- CreateIndex
CREATE INDEX "CodingSubmission_candidateId_idx" ON "CodingSubmission"("candidateId");

-- CreateIndex
CREATE INDEX "CodingSubmission_codingQuestionId_idx" ON "CodingSubmission"("codingQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingResult_submissionId_key" ON "CodingResult"("submissionId");

-- CreateIndex
CREATE INDEX "AudioResponse_candidateId_idx" ON "AudioResponse"("candidateId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_assessmentId_idx" ON "ProctoringEvent"("assessmentId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_eventType_idx" ON "ProctoringEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityCapability_candidateId_idx" ON "SecurityCapability"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityCapability_assessmentId_key" ON "SecurityCapability"("assessmentId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementUser" ADD CONSTRAINT "ManagementUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessmentSessionId_fkey" FOREIGN KEY ("assessmentSessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCodingQuestion" ADD CONSTRAINT "SessionCodingQuestion_assessmentSessionId_fkey" FOREIGN KEY ("assessmentSessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCodingQuestion" ADD CONSTRAINT "SessionCodingQuestion_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingResult" ADD CONSTRAINT "CodingResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CodingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioResponse" ADD CONSTRAINT "AudioResponse_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioResponse" ADD CONSTRAINT "AudioResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlisting" ADD CONSTRAINT "Shortlisting_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityCapability" ADD CONSTRAINT "SecurityCapability_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityCapability" ADD CONSTRAINT "SecurityCapability_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
