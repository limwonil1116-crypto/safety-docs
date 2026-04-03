// API 전체 명세 — 각 파일 경로와 구현 지침

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/auth/signup/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/signup
 * body: SignupRequest
 * 처리: 이메일 중복 확인 → bcrypt 해시 → users 테이블 INSERT → 성공 반환
 * 상태: 201 Created
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/auth/[...nextauth]/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * NextAuth.js v5 핸들러 — auth.ts에서 설정
 * Credentials provider + Kakao OAuth provider
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/auth/me/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/auth/me
 * 세션 기반 현재 사용자 정보 반환
 * 응답: User (id, name, organization, email, role, status)
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/users/approvers/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/users/approvers?keyword=&role=&organization=&page=&limit=
 * 결재 가능 사용자 목록 조회 (REVIEWER, FINAL_APPROVER 역할)
 * 인증 필요
 * 응답: { items: User[], total: number }
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/users/[userId]/role/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * PATCH /api/users/[userId]/role
 * body: { role: UserRole, status?: UserStatus }
 * ADMIN 전용
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/tasks?status=&keyword=&page=&limit=
 * 역할별 필터: CONTRACTOR → 본인 생성 과업, REVIEWER/ADMIN → 전체
 *
 * POST /api/tasks
 * body: TaskCreateRequest
 * CONTRACTOR 전용
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/tasks/[taskId]
 * PATCH /api/tasks/[taskId]
 * body: TaskUpdateRequest — REVIEWER/ADMIN 가능
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/tasks/[taskId]/documents?type=&status=
 * 과업 내 문서 목록 (요약 정보만)
 *
 * POST /api/tasks/[taskId]/documents
 * body: DocumentCreateRequest
 * 처리: 과업 존재 확인 → 동일 유형 DRAFT/SUBMITTED 존재 확인 → 신규 문서 생성 → DRAFT 상태
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/availability/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/tasks/[taskId]/documents/availability
 * 붙임 4종 각각에 대해 새로 작성 가능 여부 반환
 * 응답: { SAFETY_WORK_PERMIT: { canCreate: boolean, existingDocId?: string }, ... }
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/recent/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/tasks/[taskId]/documents/recent?type=
 * 동일 유형의 최근 작성 문서 목록 (불러오기용)
 * 응답: Document[] (최대 5건, 기본정보 + form_data 포함)
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/[documentId]/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/tasks/[taskId]/documents/[documentId]
 * 문서 상세 (본문 + 결재선 + 첨부 요약 + 이력)
 *
 * PATCH /api/tasks/[taskId]/documents/[documentId]
 * body: DocumentUpdateRequest
 * DRAFT, REJECTED 상태일 때만 가능
 * 처리: form_data 갱신 → 이력 저장
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/[documentId]/submit/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/tasks/[taskId]/documents/[documentId]/submit
 * 처리:
 *   1. 문서 상태 DRAFT 확인
 *   2. 필수값 검증 (documentType별 required 필드)
 *   3. 결재선 존재 확인
 *   4. 상태 SUBMITTED → IN_REVIEW
 *   5. 첫 번째 결재자 WAITING으로 설정
 *   6. 이력 저장
 *   7. 첫 번째 결재자에게 알림 생성
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/[documentId]/resubmit/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/tasks/[taskId]/documents/[documentId]/resubmit
 * 처리:
 *   1. 문서 상태 REJECTED 확인
 *   2. 작성자 권한 확인
 *   3. 필수값 재검증
 *   4. 결재선 재초기화 (기존 유지, 단계 상태만 초기화)
 *   5. 상태 SUBMITTED → IN_REVIEW
 *   6. 첫 번째 결재자 WAITING 설정
 *   7. 이력 저장
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/tasks/[taskId]/documents/[documentId]/duplicate/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/tasks/[taskId]/documents/[documentId]/duplicate
 * 처리:
 *   1. 원본 문서 조회
 *   2. 신규 DRAFT 문서 생성
 *   3. form_data 복사 (단, 날짜/서명/검토의견 제외)
 *   4. duplicatedFromDocumentId 기록
 *   응답: 새 문서 ID
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/approval-line/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/approval-line
 * 현재 결재선 조회 (결재자 정보 포함)
 *
 * PUT /api/documents/[documentId]/approval-line
 * body: ApprovalLineSaveRequest
 * 검증: 중복 사용자 없음, 순서 연속, 최종 결재권자 마지막, 비활성 사용자 없음
 * DRAFT, REJECTED 상태에서만 가능
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/approval-summary/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/approval-summary
 * 승인 상세 화면용 집계 데이터
 * 응답: 문서 + 결재선 + 검토의견 + 첨부 요약 + canAct + isMyTurn
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/approve/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/documents/[documentId]/approve
 * body: ApproveRequest
 * 처리:
 *   1. 현재 차례 + IN_REVIEW 상태 검증
 *   2. 서명 필수 단계 시 서명 존재 확인
 *   3. 검토의견 저장 (입력된 경우)
 *   4. 현재 step APPROVED
 *   5. 다음 단계 있으면 → WAITING + 알림 발송
 *   6. 마지막 단계면 → 문서 APPROVED + PDF 생성 트리거
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/reject/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/documents/[documentId]/reject
 * body: RejectRequest (reviewOpinion 필수, actionRequest 필수)
 * 처리:
 *   1. 현재 차례 + IN_REVIEW 상태 검증
 *   2. 검토의견 REJECTION 타입으로 저장
 *   3. 현재 step REJECTED
 *   4. 문서 상태 REJECTED
 *   5. rejectionCount +1, rejectedAt, rejection_reason 갱신
 *   6. 작성자에게 반려 알림
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/review-comments/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/review-comments
 * 검토/반려 이력 전체 조회
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/review-comments/draft/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/documents/[documentId]/review-comments/draft
 * body: { reviewOpinion?, actionRequest? }
 * 현재 차례 검토자 전용 임시저장
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/rejection-summary/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/rejection-summary
 * 최신 반려 사유 요약 (작성자 수정 화면 배너용)
 * 응답: { documentStatus, latestRejector, rejectedAt, reviewOpinion, actionRequest, rejectionCount }
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/signatures/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/documents/[documentId]/signatures
 * body: SignatureSaveRequest
 * 처리:
 *   1. 현재 차례 + IN_REVIEW 검증
 *   2. 기존 서명 있으면 덮어쓰기
 *   3. approval_line의 signatureId, signatureCompletedAt 갱신
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/signatures/current/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/signatures/current
 * 현재 로그인 사용자의 현재 단계 서명 상태 조회
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/signatures/history/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/signatures/history
 * 단계별 서명 이력 조회
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/attachments/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/attachments
 * 첨부파일 목록
 *
 * POST /api/documents/[documentId]/attachments
 * multipart/form-data
 * 검증: 허용 확장자 (jpg, jpeg, png, hwp, pdf, xls, xlsx), 최대 용량 (정책 확정 후)
 * 처리: 파일 저장소 업로드 → 메타데이터 저장 → 이력 저장
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/attachments/[attachmentId]/download/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/documents/[documentId]/attachments/[attachmentId]/download
 * 권한 확인 → 다운로드 URL 반환 또는 스트리밍
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/pdf/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/documents/[documentId]/pdf
 * 최종 승인 문서 PDF 생성 트리거
 * 처리:
 *   1. 상태 APPROVED 확인
 *   2. document_outputs 레코드 생성 (QUEUED)
 *   3. 비동기 PDF 생성 시작
 *     a. 문서 데이터 집계
 *     b. 서류 유형별 템플릿 선택
 *     c. @react-pdf/renderer 또는 pdf-lib 렌더링
 *     d. 파일 저장소 업로드
 *     e. output 상태 COMPLETED 갱신
 *     f. 이메일 발송 트리거
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/documents/[documentId]/email/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/documents/[documentId]/email
 * PDF 완료 후 이메일 자동 발송
 * 수신자 계산: 작성자 + 결재선 전체 + (참조 정책 추가 시)
 * nodemailer 사용
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/approvals/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/approvals?type=&dateFrom=&dateTo=&status=&keyword=&page=&limit=
 * 승인 목록 — REVIEWER, FINAL_APPROVER, ADMIN만 접근 가능
 * 기본 상태 필터: SUBMITTED, IN_REVIEW, APPROVED, REJECTED (DRAFT 제외)
 * 기본 날짜 기준: submitted_at
 * 기본 정렬: submitted_at DESC
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/approvals/mine/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/approvals/mine?status=&type=&page=
 * 현재 로그인 사용자의 결재 대기/완료 목록
 * 핵심: document_approval_lines.approver_user_id = 현재 사용자
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/approvals/summary/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/approvals/summary?dateFrom=&dateTo=&status=
 * 서류 유형별 건수 집계 (탭 배지용)
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/dashboard/summary/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/dashboard/summary?dateFrom=&dateTo=
 * 응답: DashboardSummaryResponse
 * REVIEWER, FINAL_APPROVER, ADMIN 전용
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/notifications/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/notifications?page=&limit=&type=
 * 현재 사용자 알림 목록
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/notifications/unread-count/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/notifications/unread-count
 * 응답: { count: number }
 * 헤더 알림 배지용
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/locations/search/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/locations/search?q=
 * 카카오 주소 검색 API 프록시
 * 서버측에서 KAKAO_REST_API_KEY 사용
 */

/*
 * ────────────────────────────────────────────────────────────────────────────
 * app/api/locations/reverse-geocode/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * GET /api/locations/reverse-geocode?lat=&lng=
 * 카카오 역지오코딩 API 프록시
 */
