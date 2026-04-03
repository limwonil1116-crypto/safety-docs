# 한국농어촌공사 안전기술본부 — 용역 법정서류 전자제출 시스템
# Cursor 구현 가이드 (완전판)

## 스택
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- ShadCN UI
- Drizzle ORM + PostgreSQL (Neon / Supabase)
- NextAuth.js v5
- Vercel 배포

## 초기 세팅 명령어

```bash
npx create-next-app@latest safety-docs --typescript --tailwind --app --no-src-dir
cd safety-docs
npx shadcn@latest init
npx shadcn@latest add button input label card badge tabs table dialog alert-dialog select textarea checkbox radio-group separator skeleton toast avatar popover calendar sheet dropdown-menu form pagination
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
npm install next-auth@beta
npm install react-hook-form @hookform/resolvers zod
npm install react-signature-canvas
npm install @react-pdf/renderer pdf-lib
npm install nodemailer
npm install date-fns
npm install zustand
```
