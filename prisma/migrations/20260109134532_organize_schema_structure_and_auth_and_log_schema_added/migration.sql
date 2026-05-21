/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "userRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "userStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "mfaMethod" AS ENUM ('totp', 'sms', 'email', 'webauthn');

-- CreateEnum
CREATE TYPE "loginAction" AS ENUM ('login', 'logout');

-- CreateEnum
CREATE TYPE "email_type" AS ENUM ('verification', 'password_reset', 'notification');

-- CreateEnum
CREATE TYPE "email_provider" AS ENUM ('sendgrid', 'mailgun', 'ses', 'stmp');

-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked');

-- CreateEnum
CREATE TYPE "eventType" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'password_change', 'profile_update');

-- CreateEnum
CREATE TYPE "actionType" AS ENUM ('create', 'update', 'delete');

-- DropTable
DROP TABLE "Post";

-- CreateTable
CREATE TABLE "ActivityLogEvent" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "actionType" NOT NULL,
    "actionedBy" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" "eventType",

    CONSTRAINT "ActivityLogEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLogEventDetail" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,

    CONSTRAINT "ActivityLogEventDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "userRole" NOT NULL DEFAULT 'USER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "userStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authSecurity" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "lockExpiresAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" "mfaMethod",
    "mfaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPasswordChange" TIMESTAMP(3),

    CONSTRAINT "authSecurity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loginHistory" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "device_id" TEXT,
    "geo_country" TEXT,
    "geo_city" TEXT,
    "action" "loginAction" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailHistory" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "emailTo" TEXT NOT NULL,
    "emailType" "email_type" NOT NULL,
    "subject" TEXT NOT NULL,
    "emailProvider" "email_provider",
    "messageId" TEXT NOT NULL,
    "emailStatus" "email_status" NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emailHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userProfile" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLogEvent_tableName_recordId_createdAt_idx" ON "ActivityLogEvent"("tableName", "recordId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_actionedBy_createdAt_idx" ON "ActivityLogEvent"("actionedBy", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLogEventDetail_eventId_idx" ON "ActivityLogEventDetail"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "authUser_email_key" ON "authUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authUser_username_key" ON "authUser"("username");

-- CreateIndex
CREATE INDEX "authUser_email_id_providerId_idx" ON "authUser"("email", "id", "providerId");

-- CreateIndex
CREATE INDEX "authUser_username_idx" ON "authUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "authSecurity_authId_key" ON "authSecurity"("authId");

-- CreateIndex
CREATE INDEX "authSecurity_authId_idx" ON "authSecurity"("authId");

-- CreateIndex
CREATE INDEX "loginHistory_authId_createdAt_idx" ON "loginHistory"("authId", "createdAt");

-- CreateIndex
CREATE INDEX "emailHistory_authId_idx" ON "emailHistory"("authId");

-- CreateIndex
CREATE INDEX "emailHistory_emailTo_idx" ON "emailHistory"("emailTo");

-- CreateIndex
CREATE INDEX "emailHistory_sentAt_idx" ON "emailHistory"("sentAt");

-- CreateIndex
CREATE INDEX "emailHistory_messageId_idx" ON "emailHistory"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "userProfile_authId_key" ON "userProfile"("authId");

-- CreateIndex
CREATE INDEX "userProfile_authId_idx" ON "userProfile"("authId");

-- AddForeignKey
ALTER TABLE "ActivityLogEvent" ADD CONSTRAINT "ActivityLogEvent_actionedBy_fkey" FOREIGN KEY ("actionedBy") REFERENCES "authUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogEventDetail" ADD CONSTRAINT "ActivityLogEventDetail_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ActivityLogEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authSecurity" ADD CONSTRAINT "authSecurity_authId_fkey" FOREIGN KEY ("authId") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loginHistory" ADD CONSTRAINT "loginHistory_authId_fkey" FOREIGN KEY ("authId") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailHistory" ADD CONSTRAINT "emailHistory_authId_fkey" FOREIGN KEY ("authId") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userProfile" ADD CONSTRAINT "userProfile_authId_fkey" FOREIGN KEY ("authId") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
