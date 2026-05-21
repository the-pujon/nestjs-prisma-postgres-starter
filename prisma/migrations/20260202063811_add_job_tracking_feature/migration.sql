-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('NO_RESPONSE', 'RESPONSE_RECEIVED', 'AWAITING_RESPONSE');

-- CreateEnum
CREATE TYPE "JobLocationType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "AppliedVia" AS ENUM ('LINKEDIN', 'INDEED', 'COMPANY_WEBSITE', 'REFERRAL', 'RECRUITER', 'JOB_BOARD', 'CAREER_FAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'ONSITE', 'PANEL', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('EMAIL', 'PHONE', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "JobTimelineEventType" AS ENUM ('APPLIED', 'RESPONSE_RECEIVED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED', 'WITHDRAWN', 'FOLLOW_UP_SENT', 'NOTE_ADDED', 'STATUS_CHANGED', 'DOCUMENT_ADDED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JobDocumentType" AS ENUM ('RESUME', 'COVER_LETTER', 'PORTFOLIO', 'OFFER_LETTER', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "JobSourceType" AS ENUM ('MANUAL', 'AI_URL_PARSED', 'AI_DESCRIPTION_PARSED', 'IMPORTED', 'EXTENSION');

-- CreateEnum
CREATE TYPE "JobReminderType" AS ENUM ('FOLLOW_UP_DUE', 'INTERVIEW_REMINDER', 'OFFER_DEADLINE', 'APPLICATION_DEADLINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companyUrl" TEXT,
    "companyLinkedin" TEXT,
    "companyFacebook" TEXT,
    "companyTwitter" TEXT,
    "companyLogo" TEXT,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "locationType" "JobLocationType" NOT NULL DEFAULT 'REMOTE',
    "salaryDisplay" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "appliedDate" TIMESTAMP(3) NOT NULL,
    "appliedVia" "AppliedVia" NOT NULL,
    "jobPostingUrl" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'APPLIED',
    "responseStatus" "ResponseStatus" NOT NULL DEFAULT 'NO_RESPONSE',
    "responseDate" TIMESTAMP(3),
    "techStack" TEXT[],
    "jobDescription" TEXT,
    "requirements" TEXT,
    "responsibilities" TEXT,
    "benefits" TEXT,
    "interviewScheduled" BOOLEAN NOT NULL DEFAULT false,
    "interviewDate" TIMESTAMP(3),
    "interviewType" "InterviewType",
    "interviewRound" INTEGER,
    "interviewLocation" TEXT,
    "interviewNotes" TEXT,
    "priority" "JobPriority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "offerAmount" DECIMAL(12,2),
    "offerDate" TIMESTAMP(3),
    "offerDeadline" TIMESTAMP(3),
    "offerNotes" TEXT,
    "rejectionReason" TEXT,
    "rejectionDate" TIMESTAMP(3),
    "notes" TEXT,
    "aiParsedData" JSONB,
    "aiConfidenceScore" DOUBLE PRECISION,
    "sourceType" "JobSourceType" NOT NULL DEFAULT 'MANUAL',
    "rawJobPosting" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastFollowUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFollowUp" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "type" "FollowUpType" NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTimelineEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "eventType" "JobTimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDocument" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobDocumentType" NOT NULL,
    "url" TEXT,
    "fileKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReminder" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reminderType" "JobReminderType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "message" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_authId_idx" ON "Job"("authId");

-- CreateIndex
CREATE INDEX "Job_authId_status_idx" ON "Job"("authId", "status");

-- CreateIndex
CREATE INDEX "Job_authId_appliedDate_idx" ON "Job"("authId", "appliedDate");

-- CreateIndex
CREATE INDEX "Job_authId_isArchived_idx" ON "Job"("authId", "isArchived");

-- CreateIndex
CREATE INDEX "Job_authId_isFavorite_idx" ON "Job"("authId", "isFavorite");

-- CreateIndex
CREATE INDEX "Job_authId_deletedAt_idx" ON "Job"("authId", "deletedAt");

-- CreateIndex
CREATE INDEX "Job_authId_priority_idx" ON "Job"("authId", "priority");

-- CreateIndex
CREATE INDEX "Job_authId_responseStatus_idx" ON "Job"("authId", "responseStatus");

-- CreateIndex
CREATE INDEX "Job_company_idx" ON "Job"("company");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "JobFollowUp_jobId_idx" ON "JobFollowUp"("jobId");

-- CreateIndex
CREATE INDEX "JobFollowUp_scheduledDate_status_idx" ON "JobFollowUp"("scheduledDate", "status");

-- CreateIndex
CREATE INDEX "JobFollowUp_jobId_status_idx" ON "JobFollowUp"("jobId", "status");

-- CreateIndex
CREATE INDEX "JobNote_jobId_idx" ON "JobNote"("jobId");

-- CreateIndex
CREATE INDEX "JobNote_jobId_isPinned_idx" ON "JobNote"("jobId", "isPinned");

-- CreateIndex
CREATE INDEX "JobNote_jobId_createdAt_idx" ON "JobNote"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobTimelineEvent_jobId_createdAt_idx" ON "JobTimelineEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobTimelineEvent_jobId_eventType_idx" ON "JobTimelineEvent"("jobId", "eventType");

-- CreateIndex
CREATE INDEX "JobDocument_jobId_idx" ON "JobDocument"("jobId");

-- CreateIndex
CREATE INDEX "JobDocument_jobId_type_idx" ON "JobDocument"("jobId", "type");

-- CreateIndex
CREATE INDEX "JobDocument_jobId_isDefault_idx" ON "JobDocument"("jobId", "isDefault");

-- CreateIndex
CREATE INDEX "JobReminder_jobId_idx" ON "JobReminder"("jobId");

-- CreateIndex
CREATE INDEX "JobReminder_scheduledAt_status_idx" ON "JobReminder"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "JobReminder_status_idx" ON "JobReminder"("status");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_authId_fkey" FOREIGN KEY ("authId") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFollowUp" ADD CONSTRAINT "JobFollowUp_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTimelineEvent" ADD CONSTRAINT "JobTimelineEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDocument" ADD CONSTRAINT "JobDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReminder" ADD CONSTRAINT "JobReminder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
