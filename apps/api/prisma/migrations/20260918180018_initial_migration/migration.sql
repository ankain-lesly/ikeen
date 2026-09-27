-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('password', 'phone', 'magicLink');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('token', 'otp', 'code', 'link');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('email_verification', 'phone_verification', 'password_reset', 'two_factor_auth', 'passwordless_login', 'email_change', 'account_deletion', 'subscription_confirmation');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('email', 'phone');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('default', 'email', 'push', 'sms');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('order', 'delivery', 'payment', 'general');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('default', 'normal', 'high');

-- CreateEnum
CREATE TYPE "NotifyPlatformType" AS ENUM ('web', 'ios', 'android');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('pending', 'inactive', 'active', 'deleted', 'achieved');

-- CreateTable
CREATE TABLE "auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AuthType" NOT NULL DEFAULT 'password',
    "provider" VARCHAR(50) NOT NULL DEFAULT 'self',
    "providerId" VARCHAR(255),
    "password" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "type" "UserType" NOT NULL DEFAULT 'user',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" VARCHAR(500),
    "lastLogin" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dateOfBirth" TIMESTAMP(3),
    "gender" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'active',
    "currency" VARCHAR(4) NOT NULL DEFAULT 'XAF',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "identifier" TEXT NOT NULL,
    "identifierType" "IdentifierType" NOT NULL,
    "type" "VerificationType" NOT NULL,
    "method" "VerificationMethod" NOT NULL DEFAULT 'code',
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "tokenHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "merchantId" TEXT,
    "action" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "changes" JSONB,
    "details" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'general',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'default',
    "platform" "NotifyPlatformType" NOT NULL DEFAULT 'web',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'default',
    "sentAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "data" JSONB,
    "link" TEXT,
    "linkLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "NotifyPlatformType" NOT NULL,
    "token" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceId" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_userId_key" ON "auth"("userId");

-- CreateIndex
CREATE INDEX "auth_userId_idx" ON "auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "verification_tokens_identifier_type_idx" ON "verification_tokens"("identifier", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_identifier_status_idx" ON "verification_tokens"("identifier", "status");

-- CreateIndex
CREATE INDEX "verification_tokens_expiresAt_idx" ON "verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_merchantId_createdAt_idx" ON "audit_logs"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_severity_idx" ON "audit_logs"("action", "severity");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_merchantId_action_createdAt_idx" ON "audit_logs"("merchantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_userType_idx" ON "notifications"("userId", "userType");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "push_tokens"("userId");

-- CreateIndex
CREATE INDEX "push_tokens_deviceId_idx" ON "push_tokens"("deviceId");

-- AddForeignKey
ALTER TABLE "auth" ADD CONSTRAINT "auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
