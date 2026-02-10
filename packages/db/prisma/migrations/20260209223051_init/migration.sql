-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('SUBMISSION', 'APPROVAL', 'RETURN', 'REJECTION', 'GENERAL');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "department_id" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_applications" (
    "id" TEXT NOT NULL,
    "application_number" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "expense_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,0) NOT NULL,
    "proposed_amount" DECIMAL(10,0),
    "final_amount" DECIMAL(10,0),
    "description" TEXT NOT NULL,
    "internal_category_id" TEXT,
    "is_cash_payment" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "expense_application_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_url" TEXT,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_results" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "extracted_date" TEXT,
    "extracted_amount" TEXT,
    "extracted_store_name" TEXT,
    "extracted_text" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_comments" (
    "id" TEXT NOT NULL,
    "expense_application_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "comment_type" "CommentType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "expense_application_id" TEXT NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_date" TIMESTAMP(3),
    "bank_data" JSONB,
    "batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_id_key" ON "members"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "internal_categories_code_key" ON "internal_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "expense_applications_application_number_key" ON "expense_applications"("application_number");

-- CreateIndex
CREATE INDEX "expense_applications_member_id_status_idx" ON "expense_applications"("member_id", "status");

-- CreateIndex
CREATE INDEX "expense_applications_status_submitted_at_idx" ON "expense_applications"("status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_results_receipt_id_key" ON "ocr_results"("receipt_id");

-- CreateIndex
CREATE INDEX "application_comments_expense_application_id_created_at_idx" ON "application_comments"("expense_application_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_payment_status_idx" ON "payments"("payment_status");

-- CreateIndex
CREATE INDEX "payments_batch_id_idx" ON "payments"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_member_id_idx" ON "refresh_tokens"("member_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_applications" ADD CONSTRAINT "expense_applications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_applications" ADD CONSTRAINT "expense_applications_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_applications" ADD CONSTRAINT "expense_applications_internal_category_id_fkey" FOREIGN KEY ("internal_category_id") REFERENCES "internal_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_expense_application_id_fkey" FOREIGN KEY ("expense_application_id") REFERENCES "expense_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_expense_application_id_fkey" FOREIGN KEY ("expense_application_id") REFERENCES "expense_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_expense_application_id_fkey" FOREIGN KEY ("expense_application_id") REFERENCES "expense_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
