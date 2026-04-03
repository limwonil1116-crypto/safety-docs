# Sprint 실행 계획 & Cursor 작업 지시서
# 한국농어촌공사 안전기술본부 — 용역 법정서류 전자제출 시스템

---

## 환경 변수 (.env.local)

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-secret

# 파일 저장소 (Vercel Blob 또는 Cloudflare R2)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# 이메일 (Gmail SMTP 또는 Resend)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-domain.com
```

---

## Cursor 프롬프트 순서 (이 순서대로 넣으세요)

---

### CURSOR TASK 01 — 프로젝트 초기 세팅

```
다음 설정으로 Next.js 14 App Router 프로젝트를 초기 세팅해줘.

기술 스택:
- Next.js 14 App Router (TypeScript)
- Tailwind CSS
- ShadCN UI
- Drizzle ORM
- NextAuth.js v5
- react-hook-form + zod

아래 파일들을 먼저 생성해줘:
1. drizzle.config.ts — DATABASE_URL 기반
2. db/index.ts — Drizzle 클라이언트 싱글톤
3. auth.ts — NextAuth v5 설정 (Credentials + Kakao 프로바이더)
4. middleware.ts — 아래 경로 규칙 적용:
   - /login, /signup, /forgot-password, /api/auth 는 공개
   - 나머지는 로그인 필요
   - 역할별 경로 제한:
     * CONTRACTOR: /tasks 만
     * REVIEWER, FINAL_APPROVER: /tasks, /approvals, /dashboard
     * ADMIN: 모두
5. app/layout.tsx — 공통 레이아웃

DB 스키마는 첨부 파일의 db/schema.ts를 사용해줘.
타입은 첨부 파일의 types/index.ts를 사용해줘.
```

---

### CURSOR TASK 02 — 로그인 / 회원가입 화면

```
아래 화면을 구현해줘. 레퍼런스 앱 스크린샷과 같은 스타일:
- 배경: 연한 파란색 그라데이션
- 카드: 흰색 둥근 카드
- 브랜드: "안전관리 시스템" + 방패 아이콘
- 하단 문의 연락처 표시

1. app/login/page.tsx — 로그인 화면
   - 이메일 + 비밀번호 입력
   - 로그인 정보 기억하기 체크박스
   - 로그인 버튼 (파란색)
   - 카카오로 로그인 버튼 (노란색)
   - 아이디 찾기 | 비밀번호 찾기
   - 계정이 없으신가요? 회원가입 링크
   - 하단: 문의처 (지역별 담당자 연락처)

2. app/signup/page.tsx — 회원가입 화면
   - 이름, 소속(기관명), 이메일, 비밀번호, 역할 선택
   - 역할: 용역업체(CONTRACTOR) / 공사 직원(REVIEWER)
   - zod 유효성 검사 연결

3. API 연결:
   - POST /api/auth/signup 구현
   - NextAuth Credentials 프로바이더 연결

ShadCN: Form, Input, Label, Button, Card, Checkbox, Select
```

---

### CURSOR TASK 03 — 공통 레이아웃 (헤더 + 사이드바)

```
앱 전체 공통 레이아웃을 구현해줘.

레퍼런스 앱 스크린샷 참고:
- 상단 헤더: 파란색 배경, 앱명("안전관리 시스템"), 공유 아이콘, 프로필 아바타
- 하단 네비게이션 바 (모바일): 홈, 과업, 승인, 대시보드, 더보기

파일:
1. components/layout/header.tsx
   - 앱 로고 + 시스템명
   - 알림 아이콘 (미읽음 뱃지)
   - 사용자 아바타 (드롭다운: 마이페이지, 로그아웃)

2. components/layout/mobile-bottom-bar.tsx
   - 역할별 메뉴 다름:
     CONTRACTOR: 과업목록, 문서작성, 알림, 마이페이지
     REVIEWER/FINAL_APPROVER: 승인목록, 대시보드, 알림, 마이페이지
     ADMIN: 대시보드, 사용자관리, 알림, 마이페이지

3. components/layout/sidebar.tsx (웹 데스크톱용)

4. app/(main)/layout.tsx
   - 헤더 + 사이드바/하단바 포함
   - 로그인 사용자만 접근 가능

ShadCN: Avatar, DropdownMenu, Badge, Sheet
```

---

### CURSOR TASK 04 — 과업 목록 / 생성 / 수정

```
과업(지구) 관리 기능을 구현해줘.

화면:
1. app/(main)/tasks/page.tsx
   - 과업 목록 (카드형 모바일, 테이블형 데스크톱)
   - 각 카드: 과업명, 업체명, 문서 현황 요약 (진행중 N건, 완료 N건)
   - 검색창
   - 신규 과업 생성 버튼 (CONTRACTOR만)

2. app/(main)/tasks/[taskId]/page.tsx
   - 과업 상세
   - 붙임 4종 탭 (전체/붙임1/붙임2/붙임3/붙임4)
   - 각 서류 상태 카드
   - 새 서류 작성 버튼

3. TaskCreateDialog.tsx — 과업 생성 다이얼로그
4. TaskEditDialog.tsx — 과업 수정 다이얼로그 (REVIEWER/ADMIN)

API:
- GET /api/tasks
- POST /api/tasks
- GET /api/tasks/[taskId]
- PATCH /api/tasks/[taskId]

DB: tasks 테이블 CRUD

ShadCN: Card, Badge, Dialog, Input, Button, Tabs, Table
```

---

### CURSOR TASK 05 — 문서 작성 폼 (붙임 4종 공통 셸)

```
붙임 4종 서류 작성 화면을 구현해줘.

화면:
1. app/(main)/tasks/[taskId]/documents/new/page.tsx
   - 서류 종류 선택 (4종 카드)
   - 이미 작성중인 서류 있으면 경고 표시

2. app/(main)/tasks/[taskId]/documents/[documentId]/edit/page.tsx
   - 공통 셸 구조:
     a. 상단 헤더: 과업명 > 서류종류, 마지막 저장 시각
     b. 반려 배너 (REJECTED 상태일 때)
     c. 기본정보 섹션
     d. 서류별 특화 섹션 (documentType에 따라 다른 컴포넌트)
     e. 위치 입력 섹션 (주소 검색)
     f. 결재자 지정 섹션
     g. 임시저장 / 제출 버튼

붙임1 (안전작업허가서) 특화 필드:
- 위험공종 체크박스 (6종)
- 위험요소 체크박스 (11종)
- 위험요소 개선대책 텍스트
- 검토의견 입력

붙임2 (밀폐공간) 특화 필드:
- 화기작업 허가 여부
- 내연기관 사용 여부
- 안전조치 체크리스트 (13항목)
- 가스 농도 측정 테이블

붙임3 (휴일작업) 특화 필드:
- 작업대상 시설물
- 참여자 목록 (테이블형 입력)
- 작업공종 목록

붙임4 (정전작업) 특화 필드:
- 밀폐공간출입 필요여부
- 화기작업 필요여부
- 안전조치 체크리스트 (9항목)
- 점검확인 테이블

API:
- POST /api/tasks/[taskId]/documents (신규 생성)
- PATCH /api/tasks/[taskId]/documents/[documentId] (임시저장)
- GET /api/tasks/[taskId]/documents/[documentId] (불러오기)

폼 관리: react-hook-form + zod
자동저장: 3분마다 또는 변경 감지 시 임시저장

ShadCN: Form, Input, Textarea, Checkbox, RadioGroup, Select, Card, Button, Badge, Separator, Toast
```

---

### CURSOR TASK 06 — 주소 검색 + 위치 입력

```
문서 작성 화면 내 위치 입력 섹션을 구현해줘.

1. components/documents/AddressSearchDialog.tsx
   - 주소 검색 다이얼로그
   - 입력창에 키워드 입력
   - /api/locations/search API 호출 (카카오 주소 API 프록시)
   - 결과 목록 표시
   - 선택하면 폼에 반영

2. app/api/locations/search/route.ts
   - GET ?q=검색어
   - 카카오 주소 API: https://dapi.kakao.com/v2/local/search/address.json
   - KAKAO_REST_API_KEY 환경변수 사용

3. components/documents/LocationSummaryCard.tsx
   - 선택된 주소 표시 카드
   - 상세 위치 입력 필드
   - 지도 링크 버튼

ShadCN: Dialog, Input, Button, Card, ScrollArea
```

---

### CURSOR TASK 07 — 파일 첨부

```
문서 작성 화면 내 첨부파일 섹션을 구현해줘.

1. components/documents/AttachmentUploadSection.tsx
   - 사진 탭 (JPG, JPEG, PNG)
   - 문서 탭 (HWP, PDF, XLS, XLSX)
   - 드래그 앤 드롭 또는 클릭 업로드
   - 업로드 진행률 표시
   - 업로드 완료 목록 (파일명, 크기, 삭제 버튼)

2. API:
   - POST /api/documents/[documentId]/attachments (multipart)
   - GET /api/documents/[documentId]/attachments
   - DELETE /api/documents/[documentId]/attachments/[attachmentId]
   - GET /api/documents/[documentId]/attachments/[attachmentId]/download

파일 저장소: Vercel Blob (또는 BLOB_READ_WRITE_TOKEN 기반)
허용 확장자 검증: jpg, jpeg, png, hwp, pdf, xls, xlsx
파일명/크기/업로더/업로드시각 DB 저장

ShadCN: Card, Button, Badge, Progress, Tabs
```

---

### CURSOR TASK 08 — 결재자 지정 + 제출

```
문서 작성 화면 내 결재선 설정과 제출 기능을 구현해줘.

1. components/documents/ApproverSelectorDialog.tsx
   - 결재자 검색 (/api/users/approvers)
   - 결재자 추가 (이름, 소속, 역할 표시)
   - 이미 추가된 사람 비활성 표시

2. components/documents/ApproverOrderEditor.tsx
   - 결재 순서 목록
   - 위/아래 이동 버튼
   - 제거 버튼
   - 최종 결재권자는 마지막 자리만 배치 가능

3. components/documents/SubmitConfirmDialog.tsx
   - 제출 전 최종 확인 다이얼로그
   - 결재선 요약 표시
   - 제출 후 수정 불가 안내

API:
- GET /api/users/approvers
- GET /api/documents/[documentId]/approval-line
- PUT /api/documents/[documentId]/approval-line
- POST /api/tasks/[taskId]/documents/[documentId]/submit
  처리: 문서 상태 IN_REVIEW로 변경, 첫 결재자 WAITING 설정, 알림 생성

ShadCN: Dialog, Card, Badge, Button, AlertDialog, Avatar, Separator
```

---

### CURSOR TASK 09 — 승인 목록 + 승인 상세

```
공사 직원용 승인 목록과 상세 화면을 구현해줘.

1. app/(main)/approvals/page.tsx
   - 상단: 서류 유형 탭 (전체/붙임1/붙임2/붙임3/붙임4)
   - 날짜 필터 (오늘/이번주/이번달/직접선택)
   - 문서 목록 (모바일:카드, 데스크톱:테이블)
   - 테이블 컬럼: 서류종류, 과업명, 업체명, 작성자, 상태, 현재결재단계, 현재결재자, 제출일

2. app/(main)/approvals/[documentId]/page.tsx
   - 상단: 상태 배지, 과업명, 서류명, 제출일
   - 요약카드: 위치 | 첨부 N개 | 이력 N건
   - 탭: 본문 | 첨부 | 결재이력
   - 결재선 표시 (순서, 이름, 상태)
   - 검토의견 입력 텍스트에어리어
   - 하단 액션바: 반려 버튼 | 승인/서명 버튼

API:
- GET /api/approvals (목록)
- GET /api/approvals/summary (탭 카운트)
- GET /api/documents/[documentId]/approval-summary (상세)
- GET /api/documents/[documentId]/review-comments (이력)

ShadCN: Tabs, Card, Badge, Table, Button, Textarea, Separator
```

---

### CURSOR TASK 10 — 검토의견 + 반려 처리

```
승인 상세 화면의 검토의견 입력과 반려 처리를 구현해줘.

1. components/approvals/ApprovalCommentSection.tsx
   - 검토의견 입력 (현재 차례일 때만)
   - 조치사항 입력
   - 임시저장 버튼

2. components/approvals/ApprovalRejectDialog.tsx
   - 반려 확인 다이얼로그
   - 반려 사유 필수 입력 확인
   - 반려 후 처리 안내

3. components/approvals/ApprovalCommentHistory.tsx
   - 이전 단계 검토의견 이력 표시

4. 작성자 화면에 반려 알림 배너 추가:
   - app/(main)/tasks/[taskId]/documents/[documentId]/edit/page.tsx
   - 상단 배너: 최근 반려 사유 + 조치사항

API:
- POST /api/documents/[documentId]/review-comments/draft
- POST /api/documents/[documentId]/reject (반려)
- POST /api/tasks/[taskId]/documents/[documentId]/resubmit (재제출)
- GET /api/documents/[documentId]/rejection-summary

검증:
- reviewOpinion 빈 값이면 반려 불가
- actionRequest 빈 값이면 반려 불가

ShadCN: Textarea, AlertDialog, Button, Card, Badge, Accordion
```

---

### CURSOR TASK 11 — 전자서명

```
전자서명 기능을 구현해줘.

1. components/approvals/SignaturePadCanvas.tsx
   - react-signature-canvas 라이브러리 사용
   - 충분한 높이 (모바일 150px 이상)
   - 다시쓰기 버튼 (캔버스 초기화)
   - 빈 캔버스 감지

2. components/approvals/SignatureCaptureDialog.tsx
   - 서명 입력 다이얼로그
   - 저장 버튼 (빈 캔버스면 비활성)
   - 취소 버튼
   - "저장 후 문서에 반영됩니다" 안내 문구

3. components/approvals/SignaturePreviewCard.tsx
   - 저장된 서명 미리보기
   - 다시 서명하기 버튼
   - 서명 저장 시각 표시

4. 승인 버튼 연동:
   - 서명 필수 단계에서 서명 미저장 시 승인 버튼 비활성

API:
- POST /api/documents/[documentId]/signatures
  body: { approvalLineId, signatureData (base64), signatureFormat }
- GET /api/documents/[documentId]/signatures/current
- GET /api/documents/[documentId]/signatures/history

ShadCN: Dialog, Button, Card, Badge, Tooltip
```

---

### CURSOR TASK 12 — 승인 처리 + 상태 갱신

```
최종 승인 처리 및 상태 전이 로직을 구현해줘.

API 구현:
POST /api/documents/[documentId]/approve
처리 로직:
1. 현재 로그인 사용자 = 현재 결재 차례 검증
2. 문서 상태 IN_REVIEW 검증
3. 서명 필수 단계 → 서명 존재 확인
4. 검토의견 있으면 저장 (isDraft: false)
5. 현재 approval_line 상태 APPROVED
6. 다음 단계 있으면:
   - 다음 단계 WAITING
   - documents.currentApprovalOrder, currentApproverUserId 갱신
   - 다음 결재자에게 알림 생성 (MY_TURN)
7. 마지막 단계면:
   - 문서 상태 APPROVED
   - approvedAt 기록
   - currentApprover 비움
   - 작성자에게 APPROVED 알림
   - PDF 생성 트리거 (POST /api/documents/[documentId]/pdf 비동기 호출)

프론트엔드:
- 승인 성공 후 화면 상태 갱신 (optimistic update 또는 재조회)
- 성공 토스트: "승인이 완료되었습니다. 다음 결재자에게 전달됩니다."
- 최종 승인 시: "최종 승인이 완료되었습니다. PDF가 생성됩니다."

ShadCN: Toast, AlertDialog
```

---

### CURSOR TASK 13 — PDF 자동 생성

```
최종 승인 후 PDF 자동 생성 기능을 구현해줘.

PDF 생성 방식: @react-pdf/renderer 또는 pdf-lib 선택

components/pdf/templates/ 폴더에 붙임 4종 각각의 출력 템플릿 구현:

붙임1 (안전작업허가서):
- 기존 서식 구조 최대한 유지 (첨부된 PDF 파일 참고)
- 상단: 안전작업허가서 제목, 요청일시, 허가일시
- 1. 작업허가 신청개요 테이블
- 2. 위험공종 확인내용 테이블 (체크박스 반영)
- 3. 용역감독 검토내용
- 결재란: 검토의견 + 서명 이미지

붙임2 (밀폐공간 작업허가서):
- 기존 서식 구조 반영
- 가스 농도 측정 테이블

붙임3 (휴일작업 신청서):
- 기존 서식 구조 반영
- 참여자 목록 테이블

붙임4 (정전작업 허가서):
- 기존 서식 구조 반영
- 안전조치 체크리스트

API:
POST /api/documents/[documentId]/pdf
처리:
1. 문서 + 결재선 + 서명 + 검토의견 데이터 집계
2. document_outputs 레코드 생성 (QUEUED)
3. 서류 유형별 템플릿으로 렌더링
4. 서명 이미지를 지정 위치에 삽입
5. Vercel Blob에 업로드
6. document_outputs 상태 COMPLETED, fileUrl 갱신
7. documents.pdfGenerationStatus 갱신

GET /api/documents/[documentId]/pdf/status
GET /api/documents/[documentId]/pdf/download

프론트엔드:
- 문서 상세에 DocumentPdfStatusCard 추가
- QUEUED/GENERATING: 스피너
- COMPLETED: 다운로드 버튼
- FAILED: 실패 안내 + 재생성 버튼

ShadCN: Card, Badge, Button, Skeleton, Toast
```

---

### CURSOR TASK 14 — 이메일 자동 발송

```
PDF 생성 완료 후 이메일 자동 발송 기능을 구현해줘.

API:
POST /api/documents/[documentId]/email
처리:
1. 수신자 계산:
   - 문서 작성자 이메일
   - 결재선 전체 참여자 이메일
   - 이메일 없는 사용자 제외 (제외 이유 기록)
2. document_email_dispatches 레코드 생성
3. 수신자별 document_email_recipients 생성
4. nodemailer로 이메일 발송
   - 제목: [안전작업허가] {서류종류} 승인 완료 - {과업명}
   - 본문: 과업명, 서류종류, 작성자, 최종승인일시, PDF 첨부 안내
   - 첨부: PDF 파일
5. 수신자별 deliveryStatus 갱신
6. documents.emailDispatchStatus 갱신

GET /api/documents/[documentId]/email/status
GET /api/documents/[documentId]/email/recipients
POST /api/documents/[documentId]/email/resend (재발송)

프론트엔드:
- 문서 상세에 DocumentEmailStatusCard 추가
- 수신자 목록 패널
- 실패 시 재발송 버튼 (REVIEWER, ADMIN만)

ShadCN: Card, Badge, Button, Table
```

---

### CURSOR TASK 15 — 승인 목록 검색 + 필터

```
승인 목록에 검색과 필터 기능을 추가해줘.

components:
1. ApprovalSearchBar.tsx
   - 과업명 / 업체명 / 작성자명 키워드 검색

2. ApprovalAdvancedFilters.tsx
   - 상태 필터 (전체/제출완료/검토중/검토완료/반려)
   - 날짜 범위 (오늘/이번주/이번달/직접선택)
   - 서류 유형 필터

3. ActiveFilterChips.tsx
   - 현재 적용 중인 필터 칩 표시
   - 개별 제거 버튼

URL 상태 동기화:
- URL query string으로 필터 상태 반영
- (?type=SAFETY_WORK_PERMIT&status=IN_REVIEW&dateFrom=2026-04-01&keyword=내현)
- 새로고침 시 필터 상태 유지

API 확장:
GET /api/approvals에 keyword, taskName, companyName, writerName 파라미터 추가

ShadCN: Input, Select, Button, Badge, Calendar, Popover
```

---

### CURSOR TASK 16 — 대시보드

```
공사 직원용 대시보드를 구현해줘.

app/(main)/dashboard/page.tsx

레이아웃:
1. 상단 KPI 카드 (4개):
   - 전체 건수
   - 진행중 건수 (IN_REVIEW)
   - 완료 건수 (APPROVED)
   - 내 승인 대기 건수

2. 서류 유형별 탭
   - 탭별 상태 분포 요약

3. 최근 승인 완료 목록 (5건)

4. 내 승인 대기 목록 (빠른 액션용)

5. 기간 필터 (상단 우측)

레퍼런스 앱 스크린샷의 테이블 형식 참고:
- 지사별 현황 테이블 (컬럼: 지사, 2Q 지구수, TBM 실시, 확인, 인원, 위험, CCTV, 도입율)
- 색상 구분 배지 사용

API:
- GET /api/dashboard/summary
- GET /api/dashboard/status-breakdown
- GET /api/dashboard/recent-approved
- GET /api/dashboard/pending

ShadCN: Card, Tabs, Table, Badge, Select, Button, Skeleton
```

---

### CURSOR TASK 17 — 알림함

```
알림 기능을 구현해줘.

1. components/layout/header.tsx에 알림 버튼 추가
   - 미읽음 수 배지
   - 클릭 시 Sheet 드로어로 알림 목록 표시

2. app/(main)/notifications/page.tsx
   - 알림 전체 목록
   - 유형별 필터 (결재요청/내차례/승인/반려/PDF완료)
   - 알림 클릭 시 해당 문서로 이동
   - 전체 읽음 처리 버튼

3. 알림 생성 지점:
   - 문서 제출 시 → 첫 번째 결재자에게 APPROVAL_REQUESTED
   - 이전 단계 승인 시 → 다음 결재자에게 MY_TURN
   - 최종 승인 시 → 작성자에게 APPROVED
   - 반려 시 → 작성자에게 REJECTED
   - PDF 생성 완료 시 → 작성자/관련자에게 PDF_READY

API:
- GET /api/notifications
- GET /api/notifications/unread-count
- POST /api/notifications/[notificationId]/read
- POST /api/notifications/read-all

ShadCN: Sheet, Badge, Button, Tabs, ScrollArea
```

---

### CURSOR TASK 18 — 최근 작성 내용 불러오기

```
문서 작성 시 최근 작성 내용 불러오기 기능을 구현해줘.

1. app/(main)/tasks/[taskId]/documents/new/page.tsx 수정
   - 서류 선택 후 "빈 문서로 작성" vs "최근 문서에서 불러오기" 선택 옵션

2. components/documents/RecentDocumentPicker.tsx
   - 동일 서류 유형의 최근 문서 목록 (최대 5건)
   - 각 항목: 과업명, 작성일, 작업위치, 상태
   - 선택 버튼

3. components/documents/ReuseConfirmDialog.tsx
   - 복사될 항목 안내:
     ✅ 복사: 작업개요, 위험요소, 안전조치, 위치, 작업자 목록
     ❌ 초기화: 작성일, 제출일, 서명, 검토의견, 결재이력

API:
- GET /api/tasks/[taskId]/documents/recent?type=
  동일 유형 최근 5건 반환
- POST /api/tasks/[taskId]/documents/[documentId]/duplicate
  특정 문서 내용 복사하여 신규 DRAFT 생성

ShadCN: Card, Button, Dialog, AlertDialog, Badge, Table
```

---

### CURSOR TASK 19 — Vercel 배포 설정

```
Vercel 배포를 위한 최종 설정을 완료해줘.

1. vercel.json 설정
2. next.config.js 환경변수 설정
3. drizzle migration 스크립트 추가:
   package.json에:
   "db:push": "drizzle-kit push",
   "db:migrate": "drizzle-kit migrate",
   "db:studio": "drizzle-kit studio"

4. .env.example 파일 생성 (모든 필요 환경변수 목록)

5. GitHub Actions CI 설정 (.github/workflows/deploy.yml):
   - main 브랜치 push 시 Vercel 자동 배포

6. README.md 작성:
   - 프로젝트 설명
   - 로컬 개발 환경 설정 방법
   - DB 마이그레이션 방법
   - 환경변수 설정 방법
   - Vercel 배포 방법
```

---

## 상태 전이 빠른 참조

```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED
                              ↘ REJECTED → DRAFT (재수정)
                                        ↘ SUBMITTED (재제출)
```

## 서류별 필수 입력 필드 (제출 시 검증)

```typescript
const REQUIRED_FIELDS: Record<DocumentType, string[]> = {
  SAFETY_WORK_PERMIT: [
    "requestDate", "workDate", "workStartTime", "workEndTime",
    "applicantName", "workLocation", "workContent"
  ],
  CONFINED_SPACE: [
    "requestDate", "workDate", "workStartTime", "workEndTime",
    "applicantName", "workLocation", "workContent", "participants"
  ],
  HOLIDAY_WORK: [
    "requestDate", "workDate", "workStartTime", "workEndTime",
    "applicantName", "workLocation", "workContent", "targetFacility"
  ],
  POWER_OUTAGE: [
    "requestDate", "workDate", "workStartTime", "workEndTime",
    "applicantName", "workLocation", "workContent", "participants"
  ],
};
```

## 색상 규칙 (상태 배지)

```typescript
// tailwind 클래스 기준
const STATUS_BADGE: Record<DocumentStatus, string> = {
  DRAFT:      "bg-gray-100 text-gray-700",
  SUBMITTED:  "bg-blue-100 text-blue-700",
  IN_REVIEW:  "bg-amber-100 text-amber-700",
  APPROVED:   "bg-green-100 text-green-700",
  REJECTED:   "bg-red-100 text-red-700",
};
```

## 허용 파일 형식

```typescript
const ALLOWED_EXTENSIONS = {
  PHOTO: ["jpg", "jpeg", "png"],
  DOCUMENT: ["hwp", "pdf", "xls", "xlsx"],
};
// 최대 용량: 정책 확정 후 반영 (임시: 파일당 10MB)
const MAX_FILE_SIZE_MB = 10;
```
