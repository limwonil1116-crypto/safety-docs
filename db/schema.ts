// db/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  numeric,
  inet,
  smallint,
  bigint,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===== ENUMS =====

export const userRoleEnum = pgEnum("user_role", [
  "CONTRACTOR",
  "REVIEWER",
  "FINAL_APPROVER",
  "ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "LOCKED",
]);

export const authProviderEnum = pgEnum("auth_provider", [
  "local",
  "kakao",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "SAFETY_WORK_PERMIT",
  "CONFINED_SPACE",
  "HOLIDAY_WORK",
  "POWER_OUTAGE",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
]);

export const approvalStepStatusEnum = pgEnum("approval_step_status", [
  "PENDING",
  "WAITING",
  "APPROVED",
  "REJECTED",
  "SKIPPED",
]);

export const approvalRoleEnum = pgEnum("approval_role", [
  "REVIEWER",
  "FINAL_APPROVER",
]);

export const reviewCommentTypeEnum = pgEnum("review_comment_type", [
  "REVIEW",
  "REJECTION",
  "APPROVAL_NOTE",
]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "PHOTO",
  "DOCUMENT",
]);

export const pdfGenerationStatusEnum = pgEnum("pdf_generation_status", [
  "NOT_REQUESTED",
  "QUEUED",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const emailDispatchStatusEnum = pgEnum("email_dispatch_status", [
  "NOT_REQUESTED",
  "QUEUED",
  "SENDING",
  "SENT",
  "PARTIAL_FAILED",
  "FAILED",
]);

export const emailDeliveryStatusEnum = pgEnum("email_delivery_status", [
  "PENDING",
  "SENT",
  "FAILED",
]);

export const emailRecipientTypeEnum = pgEnum("email_recipient_type", [
  "WRITER",
  "APPROVER",
  "FINAL_APPROVER",
  "CC",
  "ADMIN",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "APPROVAL_REQUESTED",
  "MY_TURN",
  "APPROVED",
  "REJECTED",
  "PDF_READY",
  "EMAIL_FAILED",
  "SYSTEM",
]);

// ===== USERS =====

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  organization: varchar("organization", { length: 150 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("CONTRACTOR"),
  status: userStatusEnum("status").notNull().default("PENDING"),
  phone: varchar("phone", { length: 30 }),
  employeeNo: varchar("employee_no", { length: 50 }),
  provider: authProviderEnum("provider").default("local"),
  providerUserId: varchar("provider_user_id", { length: 191 }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ===== TASKS =====

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  contractorCompanyName: varchar("contractor_company_name", { length: 150 }),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  managerUserId: uuid("manager_user_id").references(() => users.id),
  status: taskStatusEnum("status").notNull().default("ACTIVE"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ===== DOCUMENTS =====

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  status: documentStatusEnum("status").notNull().default("DRAFT"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  lastUpdatedBy: uuid("last_updated_by").references(() => users.id),
  currentApprovalOrder: integer("current_approval_order"),
  currentApproverUserId: uuid("current_approver_user_id").references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  rejectionCount: integer("rejection_count").notNull().default(0),
  lastRejectedBy: uuid("last_rejected_by").references(() => users.id),
  duplicatedFromDocumentId: uuid("duplicated_from_document_id"),
  formDataJson: jsonb("form_data_json").notNull().default({}),
  // ===== 작업 위치 (추가된 컬럼) =====
  workLatitude: doublePrecision("work_latitude"),
  workLongitude: doublePrecision("work_longitude"),
  workAddress: text("work_address"),
  // ===== PDF =====
  finalPdfOutputId: uuid("final_pdf_output_id"),
  pdfGenerationStatus: pdfGenerationStatusEnum("pdf_generation_status").default("NOT_REQUESTED"),
  pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true }),
  outputVersion: integer("output_version").notNull().default(0),
  // ===== 이메일 =====
  lastEmailDispatchId: uuid("last_email_dispatch_id"),
  emailDispatchStatus: emailDispatchStatusEnum("email_dispatch_status").default("NOT_REQUESTED"),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  emailFailureReason: text("email_failure_reason"),
  latestReviewCommentId: uuid("latest_review_comment_id"),
  latestRejectionCommentId: uuid("latest_rejection_comment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ===== DOCUMENT HISTORIES =====

export const documentHistories = pgTable("document_histories", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  previousStatus: documentStatusEnum("previous_status"),
  nextStatus: documentStatusEnum("next_status"),
  changedFieldsJson: jsonb("changed_fields_json"),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT APPROVAL LINES =====

export const documentApprovalLines = pgTable("document_approval_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  approverUserId: uuid("approver_user_id").references(() => users.id).notNull(),
  approvalOrder: integer("approval_order").notNull(),
  approvalRole: approvalRoleEnum("approval_role").notNull().default("REVIEWER"),
  stepStatus: approvalStepStatusEnum("step_status").notNull().default("PENDING"),
  signatureRequired: boolean("signature_required").notNull().default(true),
  signatureCompletedAt: timestamp("signature_completed_at", { withTimezone: true }),
  signatureId: uuid("signature_id"),
  actedAt: timestamp("acted_at", { withTimezone: true }),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT APPROVAL ACTIONS =====

export const documentApprovalActions = pgTable("document_approval_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  approvalLineId: uuid("approval_line_id").references(() => documentApprovalLines.id).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id).notNull(),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  previousStepStatus: approvalStepStatusEnum("previous_step_status"),
  nextStepStatus: approvalStepStatusEnum("next_step_status"),
  comment: text("comment"),
  reviewCommentId: uuid("review_comment_id"),
  rejectionReasonSummary: text("rejection_reason_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT REVIEW COMMENTS =====

export const documentReviewComments = pgTable("document_review_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  approvalLineId: uuid("approval_line_id").references(() => documentApprovalLines.id),
  authorUserId: uuid("author_user_id").references(() => users.id).notNull(),
  commentType: reviewCommentTypeEnum("comment_type").notNull().default("REVIEW"),
  reviewOpinion: text("review_opinion"),
  actionRequest: text("action_request"),
  isDraft: boolean("is_draft").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT SIGNATURES =====

export const documentSignatures = pgTable("document_signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  approvalLineId: uuid("approval_line_id").references(() => documentApprovalLines.id).notNull(),
  signerUserId: uuid("signer_user_id").references(() => users.id).notNull(),
  signatureData: text("signature_data"),
  signatureImageUrl: text("signature_image_url"),
  signatureFormat: varchar("signature_format", { length: 20 }).default("PNG"),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT ATTACHMENTS =====

export const documentAttachments = pgTable("document_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }),
  attachmentType: attachmentTypeEnum("attachment_type").notNull().default("DOCUMENT"),
  sortOrder: integer("sort_order").notNull().default(0),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ===== DOCUMENT ATTACHMENT HISTORIES =====

export const documentAttachmentHistories = pgTable("document_attachment_histories", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  attachmentId: uuid("attachment_id").references(() => documentAttachments.id),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT OUTPUTS =====

export const documentOutputs = pgTable("document_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  outputType: varchar("output_type", { length: 20 }).notNull().default("PDF"),
  fileName: varchar("file_name", { length: 255 }),
  fileUrl: text("file_url"),
  fileSize: bigint("file_size", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }).default("application/pdf"),
  generationStatus: pdfGenerationStatusEnum("generation_status").notNull().default("NOT_REQUESTED"),
  version: integer("version").notNull().default(1),
  isOfficial: boolean("is_official").notNull().default(false),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT OUTPUT HISTORIES =====

export const documentOutputHistories = pgTable("document_output_histories", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentOutputId: uuid("document_output_id").references(() => documentOutputs.id),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  attemptNo: integer("attempt_no").notNull().default(1),
  status: pdfGenerationStatusEnum("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT EMAIL DISPATCHES =====

export const documentEmailDispatches = pgTable("document_email_dispatches", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  dispatchStatus: emailDispatchStatusEnum("dispatch_status").notNull().default("NOT_REQUESTED"),
  triggerType: varchar("trigger_type", { length: 50 }),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  subject: varchar("subject", { length: 255 }),
  bodySnapshot: text("body_snapshot"),
  attachmentOutputId: uuid("attachment_output_id").references(() => documentOutputs.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== DOCUMENT EMAIL RECIPIENTS =====

export const documentEmailRecipients = pgTable("document_email_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  dispatchId: uuid("dispatch_id").references(() => documentEmailDispatches.id).notNull(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  recipientName: varchar("recipient_name", { length: 100 }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientType: emailRecipientTypeEnum("recipient_type").notNull(),
  deliveryStatus: emailDeliveryStatusEnum("delivery_status").notNull().default("PENDING"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== NOTIFICATIONS =====

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  targetDocumentId: uuid("target_document_id").references(() => documents.id),
  isRead: boolean("is_read").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

// ===== RELATIONS =====

export const usersRelations = relations(users, ({ many }) => ({
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  createdDocuments: many(documents, { relationName: "createdDocuments" }),
  approvalLines: many(documentApprovalLines),
  signatures: many(documentSignatures),
  notifications: many(notifications),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(users, { fields: [tasks.createdBy], references: [users.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  task: one(tasks, { fields: [documents.taskId], references: [tasks.id] }),
  creator: one(users, { fields: [documents.createdBy], references: [users.id], relationName: "createdDocuments" }),
  approvalLines: many(documentApprovalLines),
  reviewComments: many(documentReviewComments),
  signatures: many(documentSignatures),
  attachments: many(documentAttachments),
  outputs: many(documentOutputs),
  emailDispatches: many(documentEmailDispatches),
  notifications: many(notifications),
  histories: many(documentHistories),
}));

export const documentApprovalLinesRelations = relations(documentApprovalLines, ({ one }) => ({
  document: one(documents, { fields: [documentApprovalLines.documentId], references: [documents.id] }),
  approver: one(users, { fields: [documentApprovalLines.approverUserId], references: [users.id] }),
}));
