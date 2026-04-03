# 한국농어촌공사 안전기술본부
# 용역 법정서류 전자제출·검토·승인 시스템

## 개요

용역 수행 과정에서 반복 제출되는 법정서류(안전작업허가서, 밀폐공간, 휴일작업, 정전작업)를  
전자적으로 작성·제출·결재·보관하는 앱/웹 기반 시스템입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 App Router |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS + ShadCN UI |
| ORM | Drizzle ORM |
| DB | PostgreSQL (Neon) |
| 인증 | NextAuth.js v5 |
| 폼 | react-hook-form + zod |
| 서명 | react-signature-canvas |
| PDF | @react-pdf/renderer |
| 파일 | Vercel Blob |
| 이메일 | nodemailer |
| 배포 | Vercel |

---

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/safety-docs.git
cd safety-docs
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 파일을 열어 각 항목 설정
```

필수 환경변수:
- `DATABASE_URL` — Neon 또는 Supabase PostgreSQL 연결 URL
- `NEXTAUTH_SECRET` — 랜덤 32자 문자열 (`openssl rand -base64 32`)
- `KAKAO_CLIENT_ID` — 카카오 개발자 REST API 키
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob 토큰
- `KAKAO_REST_API_KEY` — 지도 검색용 카카오 REST API 키

### 3. DB 마이그레이션

```bash
npm run db:push
# 또는
npm run db:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

---

## Vercel 배포

### 1. GitHub 저장소 연결

1. GitHub에 저장소 생성 후 push
2. Vercel 대시보드에서 "Import Project"
3. 저장소 선택 → 자동 Next.js 감지

### 2. 환경변수 설정

Vercel 대시보드 > Settings > Environment Variables에서  
`.env.example`의 모든 항목을 입력합니다.

### 3. Neon DB 연결 (권장)

Vercel Marketplace에서 Neon을 연결하면 `DATABASE_URL`이 자동 주입됩니다.

### 4. Vercel Blob 설정

Vercel 대시보드 > Storage > Blob > Create Store  
생성 후 `BLOB_READ_WRITE_TOKEN` 자동 주입됩니다.

### 5. 배포 후 DB 마이그레이션

```bash
# Vercel CLI로 프로덕션 DB에 스키마 적용
npx vercel env pull .env.production.local
DATABASE_URL=$(cat .env.production.local | grep DATABASE_URL | cut -d= -f2) npm run db:push
```

---

## 서류 4종 구조

| 서류 | 코드 | 설명 |
|------|------|------|
| 안전작업허가서 | `SAFETY_WORK_PERMIT` | 붙임1 — 매주 제출 |
| 밀폐공간 작업허가서 | `CONFINED_SPACE` | 붙임2 — 해당 공종 시 |
| 휴일작업 신청서 | `HOLIDAY_WORK` | 붙임3 — 휴일 작업 시 |
| 정전작업 허가서 | `POWER_OUTAGE` | 붙임4 — 정전 작업 시 |

---

## 사용자 역할

| 역할 | 코드 | 권한 |
|------|------|------|
| 용역업체 작성자 | `CONTRACTOR` | 문서 작성·제출 |
| 공사 직원 검토자 | `REVIEWER` | 검토·승인·반려 |
| 최종 결재권자 | `FINAL_APPROVER` | 최종 승인 |
| 관리자 | `ADMIN` | 전체 관리 |

---

## 문서 상태 흐름

```
DRAFT(작성중) → SUBMITTED(제출완료) → IN_REVIEW(검토중) → APPROVED(검토완료)
                                                        ↘ REJECTED(반려) → DRAFT
```

---

## 주요 디렉토리 구조

```
app/
├── (main)/           # 인증 필요 페이지
│   ├── tasks/        # 과업 관리
│   ├── approvals/    # 승인 목록/상세
│   ├── dashboard/    # 대시보드
│   ├── notifications/ # 알림함
│   └── admin/        # 관리자
├── login/            # 로그인
├── signup/           # 회원가입
└── api/              # API Routes

components/
├── ui/               # ShadCN 컴포넌트
├── layout/           # 헤더, 사이드바
├── documents/        # 문서 작성 관련
├── approvals/        # 승인 관련
├── dashboard/        # 대시보드
└── pdf/              # PDF 템플릿

db/
├── schema.ts         # Drizzle 스키마 (전체 테이블)
└── index.ts          # DB 클라이언트

types/
└── index.ts          # 전체 TypeScript 타입
```

---

## 결정 필요 정책 (개발 전 확정 요망)

- [ ] 붙임 4종 최종 양식 확정
- [ ] 일반 로그인 + 카카오 로그인 병행 정책
- [ ] 최종 결재권자 필수 포함 여부
- [ ] 반려 후 결재선 유지/수정 정책
- [ ] PDF 검토의견 반영 범위
- [ ] 이메일 기본 수신자 정책
- [ ] 첨부파일 최대 용량 / 보관 기간
- [ ] 전자서명 내부 규정 수준
- [ ] 외부 API (카카오 지도 등) 선정
- [ ] 재생성/재발송 권한 범위

---

## 라이선스

한국농어촌공사 안전기술본부 내부 시스템 — 외부 배포 금지
