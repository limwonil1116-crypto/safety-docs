// middleware.ts — 임시 버전 (DB 없이 동작)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup", 
  "/forgot-password",
  "/_next",
  "/favicon.ico",
  "/api/auth",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // 임시: 로그인 없이도 접근 가능하게 (개발 초기)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
