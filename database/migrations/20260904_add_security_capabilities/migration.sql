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
CREATE UNIQUE INDEX "SecurityCapability_assessmentId_key" ON "SecurityCapability"("assessmentId");
CREATE INDEX "SecurityCapability_candidateId_idx" ON "SecurityCapability"("candidateId");
ALTER TABLE "SecurityCapability" ADD CONSTRAINT "SecurityCapability_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityCapability" ADD CONSTRAINT "SecurityCapability_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
