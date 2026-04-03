// types/index.ts
// 한국농어촌공사 안전기술본부 — 용역 법정서류 전자제출 시스템
// 전체 타입 정의

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type UserRole = "CONTRACTOR" | "REVIEWER" | "FINAL_APPROVER" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "LOCKED";
export type AuthProvider = "local" | "kakao";
export type TaskStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type DocumentType =
  | "SAFETY_WORK_PERMIT"  // 붙임1: 안전작업허가서
  | "CONFINED_SPACE"      // 붙임2: 밀폐공간 작업허가서
  | "HOLIDAY_WORK"        // 붙임3: 휴일작업 신청서
  | "POWER_OUTAGE";       // 붙임4: 정전작업 허가서

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  SAFETY_WORK_PERMIT: "안전작업허가서",
  CONFINED_SPACE: "밀폐공간 작업허가서",
  HOLIDAY_WORK: "휴일작업 신청서",
  POWER_OUTAGE: "정전작업 허가서",
};

export const DOCUMENT_TYPE_SHORT: Record<DocumentType, string> = {
  SAFETY_WORK_PERMIT: "붙임1",
  CONFINED_SPACE: "붙임2",
  HOLIDAY_WORK: "붙임3",
  POWER_OUTAGE: "붙임4",
};

export type DocumentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "작성중",
  SUBMITTED: "제출완료",
  IN_REVIEW: "검토중",
  APPROVED: "검토완료",
  REJECTED: "반려",
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: "secondary",
  SUBMITTED: "default",
  IN_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export type ApprovalStepStatus =
  | "PENDING"
  | "WAITING"
  | "APPROVED"
  | "REJECTED"
  | "SKIPPED";

export type ApprovalRole = "REVIEWER" | "FINAL_APPROVER";
export type ReviewCommentType = "REVIEW" | "REJECTION" | "APPROVAL_NOTE";
export type AttachmentType = "PHOTO" | "DOCUMENT";

export type PdfGenerationStatus =
  | "NOT_REQUESTED"
  | "QUEUED"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED";

export type EmailDispatchStatus =
  | "NOT_REQUESTED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "PARTIAL_FAILED"
  | "FAILED";

export type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED";
export type EmailRecipientType =
  | "WRITER"
  | "APPROVER"
  | "FINAL_APPROVER"
  | "CC"
  | "ADMIN";

export type NotificationType =
  | "APPROVAL_REQUESTED"
  | "MY_TURN"
  | "APPROVED"
  | "REJECTED"
  | "PDF_READY"
  | "EMAIL_FAILED"
  | "SYSTEM";

// ─── CORE ENTITIES ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  organization?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  employeeNo?: string;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface Task {
  id: string;
  name: string;
  contractorCompanyName?: string;
  description?: string;
  createdBy?: string;
  managerUserId?: string;
  status: TaskStatus;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Joined
  creator?: Pick<User, "id" | "name" | "organization">;
  manager?: Pick<User, "id" | "name" | "organization">;
  documentCount?: number;
}

export interface Document {
  id: string;
  taskId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  createdBy: string;
  currentApprovalOrder?: number;
  currentApproverUserId?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  rejectionCount: number;
  formDataJson: DocumentFormData;
  pdfGenerationStatus: PdfGenerationStatus;
  emailDispatchStatus: EmailDispatchStatus;
  createdAt: Date;
  updatedAt: Date;
  // Joined
  task?: Pick<Task, "id" | "name" | "contractorCompanyName">;
  creator?: Pick<User, "id" | "name" | "organization">;
  currentApprover?: Pick<User, "id" | "name" | "organization">;
}

// ─── DOCUMENT FORM DATA (붙임 4종 폼 구조) ────────────────────────────────────

/** 모든 서류 공통 기본 구조 */
export interface DocumentFormDataBase {
  // 기본정보
  requestDate?: string;       // 요청/작성일 (YYYY-MM-DD)
  workDate?: string;          // 작업일
  workStartTime?: string;     // 작업 시작 시각 (HH:mm)
  workEndTime?: string;       // 작업 종료 시각 (HH:mm)
  projectName?: string;       // 용역명
  applicantCompany?: string;  // 업체명
  applicantTitle?: string;    // 직책
  applicantName?: string;     // 신청자 성명
  workLocation?: string;      // 작업장소
  workContent?: string;       // 작업 내용
  participants?: string;      // 작업자/출입자 명단
  specialNotes?: string;      // 특이사항
  // 위치
  addressFull?: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  navigationUrl?: string;
}

/** 붙임1: 안전작업허가서 */
export interface SafetyWorkPermitForm extends DocumentFormDataBase {
  // 위험공종 확인
  riskWorkTypes?: {
    highPlace?: boolean;         // 2.0m 이상 고소작업
    waterWork?: boolean;         // 수상/수변작업
    confinedSpace?: boolean;     // 밀폐공간작업
    powerOutage?: boolean;       // 정전작업
    fireWork?: boolean;          // 화기작업
    other?: boolean;             // 기타
    otherDetail?: string;
  };
  // 위험요소
  riskFactors?: {
    narrowAccess?: boolean;
    slippery?: boolean;
    steepSlope?: boolean;
    waterHazard?: boolean;
    rockfall?: boolean;
    noRailing?: boolean;
    noLadder?: boolean;
    suffocation?: boolean;
    electrocution?: boolean;
    fire?: boolean;
    otherRisk?: boolean;
    otherRiskDetail?: string;
  };
  // 위험요소 개선대책
  riskSummary?: string;         // 위험요소 개선대책 요약
  riskImprovementPlan?: string; // 개선대책 결과 요약
  disasterType?: string;        // 재해 형태
  // 검토
  reviewOpinion?: string;
  reviewResult?: string;
  reviewerTitle?: string;
  reviewerName?: string;
  approverTitle?: string;
  approverName?: string;
}

/** 붙임2: 밀폐공간 작업허가서 */
export interface ConfinedSpaceForm extends DocumentFormDataBase {
  fireWorkRequired?: boolean;   // 화기작업 허가 필요여부
  engineRequired?: boolean;     // 내연기관/갈탄 사용여부
  // 안전조치 체크리스트
  safetyChecks?: {
    safetyManagerAssigned?: boolean;    // 안전담당자/감시인 배치
    valveBlocked?: boolean;             // 밸브차단, 맹판설치 등
    measurerQualified?: boolean;        // 측정자 자격조건
    gasMeasured?: boolean;              // 산소/유해가스 측정
    ventilationInstalled?: boolean;     // 환기시설 설치
    communicationEquipped?: boolean;    // 전화/무선기기
    explosionProofEquip?: boolean;      // 방폭형 전기기계
    fireExtinguisher?: boolean;         // 소화기 비치
    accessBlocked?: boolean;            // 관계자외 출입차단
    protectiveGear?: boolean;           // 보호구 비치
    emergencyEquip?: boolean;           // 대피/응급구조장비
    safetyEdu?: boolean;                // 작업 전 안전교육
    specialEdu?: boolean;               // 특별교육 이수
  };
  // 가스 농도 측정
  gasMeasurements?: Array<{
    measureTime?: string;
    substanceName?: string;
    concentration?: string;
    measurer?: string;
    entryCount?: number;
    exitCount?: number;
  }>;
  specialRequirements?: string;
}

/** 붙임3: 휴일작업 신청서 */
export interface HolidayWorkForm extends DocumentFormDataBase {
  targetFacility?: string;      // 작업대상 시설물
  facilityManager?: string;     // 시설관리자
  facilityManagerGrade?: string; // 관리자 등급
  facilityManagerName?: string;
  workPosition?: string;        // 작업위치
  // 참여자
  safetyManager?: string;
  safetyManagerPhone?: string;
  engineers?: Array<{
    name?: string;
    phone?: string;
  }>;
  laborers?: Array<{
    name?: string;
    phone?: string;
  }>;
  workTypes?: string[];         // 작업공종 목록
  riskSummary?: string;
  improvementPlan?: string;
  reviewOpinion?: string;
  reviewResult?: string;
  reviewerName?: string;
  approverName?: string;
}

/** 붙임4: 정전작업 허가서 */
export interface PowerOutageForm extends DocumentFormDataBase {
  confinedSpaceRequired?: boolean; // 밀폐공간출입 허가 필요
  fireWorkRequired?: boolean;      // 화기작업 허가 필요
  // 안전조치 체크리스트
  safetyChecks?: {
    mainSwitchOff?: boolean;       // 주 차단 스위치 내림
    controlBreakerOff?: boolean;   // 제어차단기 내림
    lockInstalled?: boolean;       // 잠금장치
    testPowerOff?: boolean;        // 시험전원 차단
    warningSignPosted?: boolean;   // 차단표지판 부착
    residualDischarged?: boolean;  // 잔류전하 방전
    voltageChecked?: boolean;      // 검전기로 충전여부 확인
    groundingInstalled?: boolean;  // 단락접지기구 설치
    localSwitchOff?: boolean;      // 현장 스위치 내림
  };
  // 점검 확인
  inspectionResults?: Array<{
    inspectionDevice?: string;
    cutoffConfirmer?: string;
    electricEngineer?: string;
    fieldMaintenance?: string;
  }>;
  specialRequirements?: string;
}

export type DocumentFormData =
  | SafetyWorkPermitForm
  | ConfinedSpaceForm
  | HolidayWorkForm
  | PowerOutageForm;

// ─── APPROVAL ─────────────────────────────────────────────────────────────────

export interface ApprovalLine {
  id: string;
  documentId: string;
  approverUserId: string;
  approvalOrder: number;
  approvalRole: ApprovalRole;
  stepStatus: ApprovalStepStatus;
  signatureRequired: boolean;
  signatureCompletedAt?: Date;
  signatureId?: string;
  actedAt?: Date;
  comment?: string;
  // Joined
  approver?: Pick<User, "id" | "name" | "organization" | "email">;
}

export interface ApprovalSummary {
  documentId: string;
  documentStatus: DocumentStatus;
  approvalLines: ApprovalLine[];
  currentStep?: ApprovalLine;
  canAct: boolean;
  isMyTurn: boolean;
}

export interface ReviewComment {
  id: string;
  documentId: string;
  approvalLineId?: string;
  authorUserId: string;
  commentType: ReviewCommentType;
  reviewOpinion?: string;
  actionRequest?: string;
  isDraft: boolean;
  createdAt: Date;
  // Joined
  author?: Pick<User, "id" | "name" | "organization">;
  approvalLine?: Pick<ApprovalLine, "approvalOrder" | "approvalRole">;
}

export interface DocumentSignature {
  id: string;
  documentId: string;
  approvalLineId: string;
  signerUserId: string;
  signatureData?: string;
  signatureImageUrl?: string;
  signedAt: Date;
  // Joined
  signer?: Pick<User, "id" | "name" | "organization">;
}

// ─── ATTACHMENTS ──────────────────────────────────────────────────────────────

export interface DocumentAttachment {
  id: string;
  documentId: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  attachmentType: AttachmentType;
  sortOrder: number;
  createdAt: Date;
  // Joined
  uploader?: Pick<User, "id" | "name">;
}

// ─── PDF & EMAIL ───────────────────────────────────────────────────────────────

export interface DocumentOutput {
  id: string;
  documentId: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  generationStatus: PdfGenerationStatus;
  version: number;
  isOfficial: boolean;
  generatedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

export interface EmailDispatch {
  id: string;
  documentId: string;
  dispatchStatus: EmailDispatchStatus;
  triggerType?: string;
  subject?: string;
  startedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
}

export interface EmailRecipient {
  id: string;
  dispatchId: string;
  recipientName?: string;
  recipientEmail: string;
  recipientType: EmailRecipientType;
  deliveryStatus: EmailDeliveryStatus;
  sentAt?: Date;
  failureReason?: string;
}

// ─── API REQUEST / RESPONSE ────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  organization: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  employeeNo?: string;
}

export interface TaskCreateRequest {
  name: string;
  contractorCompanyName?: string;
  description?: string;
  managerUserId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TaskUpdateRequest extends Partial<TaskCreateRequest> {
  status?: TaskStatus;
}

export interface DocumentCreateRequest {
  taskId: string;
  documentType: DocumentType;
  duplicatedFromDocumentId?: string;
}

export interface DocumentUpdateRequest {
  formDataJson?: DocumentFormData;
}

export interface DocumentSubmitRequest {
  approvalLineIds?: string[];
}

export interface ApprovalLineSaveRequest {
  approvers: Array<{
    userId: string;
    order: number;
    role: ApprovalRole;
  }>;
}

export interface ApproveRequest {
  reviewOpinion?: string;
  actionRequest?: string;
}

export interface RejectRequest {
  reviewOpinion: string;
  actionRequest: string;
}

export interface SignatureSaveRequest {
  approvalLineId: string;
  signatureData: string;  // base64
  signatureFormat?: string;
}

// ─── LIST / DASHBOARD ──────────────────────────────────────────────────────────

export interface ApprovalListQuery {
  type?: DocumentType | "ALL";
  dateFrom?: string;
  dateTo?: string;
  status?: DocumentStatus;
  keyword?: string;
  taskName?: string;
  companyName?: string;
  writerName?: string;
  approverName?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ApprovalListItem {
  id: string;
  documentType: DocumentType;
  taskName: string;
  contractorCompanyName?: string;
  writerName: string;
  status: DocumentStatus;
  currentApprovalOrder?: number;
  currentApproverName?: string;
  submittedAt?: Date;
  updatedAt: Date;
  isMyTurn?: boolean;
  hasAttachments?: boolean;
}

export interface ApprovalListResponse {
  items: ApprovalListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApprovalSummaryByType {
  all: number;
  SAFETY_WORK_PERMIT: number;
  CONFINED_SPACE: number;
  HOLIDAY_WORK: number;
  POWER_OUTAGE: number;
}

export interface DashboardSummaryResponse {
  total: number;
  inProgress: number;
  completed: number;
  rejected: number;
  myPendingCount: number;
  byType: ApprovalSummaryByType;
}

// ─── NOTIFICATION ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  targetDocumentId?: string;
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
  // Joined
  targetDocument?: Pick<Document, "id" | "documentType" | "status">;
}

// ─── FORM DATE PRESET ──────────────────────────────────────────────────────────

export type DatePreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  TODAY: "오늘",
  THIS_WEEK: "이번 주",
  THIS_MONTH: "이번 달",
  CUSTOM: "직접 선택",
};
