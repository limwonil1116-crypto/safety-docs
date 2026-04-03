// auth.ts
// NextAuth.js v5 설정

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import KakaoProvider from "next-auth/providers/kakao";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해 주세요.");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("계정이 비활성 상태입니다. 관리자에게 문의하세요.");
        }

        if (!user.passwordHash) {
          throw new Error("소셜 로그인으로 가입된 계정입니다.");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        // 마지막 로그인 시각 갱신
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization ?? undefined,
        };
      },
    }),

    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // 카카오 로그인 처리
      if (account?.provider === "kakao") {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email ?? ""))
          .limit(1);

        if (!existing) {
          // 신규 가입 — PENDING 상태로 생성
          await db.insert(users).values({
            name: user.name ?? "카카오 사용자",
            email: user.email ?? "",
            provider: "kakao",
            providerUserId: user.id,
            role: "CONTRACTOR",
            status: "PENDING",
          });
          return "/signup?kakao=pending";
        }

        if (existing.status !== "ACTIVE") {
          return false;
        }

        // 마지막 로그인 갱신
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, existing.id));
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organization = (user as any).organization;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).organization = token.organization;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
});
