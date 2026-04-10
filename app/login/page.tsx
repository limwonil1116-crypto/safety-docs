"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // PWA 설치
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as any).standalone) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);
    if (ios) {
      setShowInstall(true);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
        setShowInstall(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); return; }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.push("/tasks");
      }
    } catch {
      setError("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const contacts = [
    {
      category: "업무담당",
      name: "담당자명",
      org: "한국농어촌공사 안전기술본부 안전관리처 안전관리부",
      tel: "042-479-8299",
    },
    {
      category: "시스템담당",
      name: "시스템 담당자",
      org: "한국농어촌공사 디지털혁신처 디지털기반부",
      tel: "041-339-1844",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #dbeafe 0%, #eff6ff 50%, #dbeafe 100%)" }}>

      {/* PWA 설치 버튼 - 우측 상단 고정 */}
      {showInstall && (
        <div className="fixed top-4 right-4 z-50">
          <button onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg"
            style={{ background: "#1e3a5f", color: "white" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            앱 설치
          </button>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          {/* 공유 버튼 */}
          <div className="flex justify-start mb-4">
            <button className="text-gray-400 hover:text-gray-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>

          {/* 로고 + 시스템명 */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden bg-white shadow-sm">
              <Image src="/logo.png" alt="안전기술본부 로고" width={80} height={80} className="object-contain" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center leading-tight">
              안전기술본부<br />스마트 안전관리 시스템
            </h1>
            <p className="text-sm text-gray-500 mt-1">계정으로 로그인하세요</p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일 주소</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <label htmlFor="remember" className="text-sm text-gray-600">로그인 정보 기억하기</label>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-medium text-sm transition-opacity disabled:opacity-60"
              style={{ background: "#2563eb" }}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <button className="w-full mt-3 py-3 rounded-xl font-medium text-sm transition-opacity"
            style={{ background: "#FEE500", color: "#000000" }}>
            카카오로 로그인
          </button>

          <div className="flex justify-center gap-4 mt-4 text-sm text-gray-500">
            <Link href="/forgot-password" className="hover:text-blue-600">이메일 찾기</Link>
            <span>|</span>
            <Link href="/forgot-password" className="hover:text-blue-600">비밀번호 찾기</Link>
          </div>
          <div className="text-center mt-3">
            <Link href="/signup" className="text-sm font-medium" style={{ color: "#2563eb" }}>
              계정이 없으신가요? 회원가입
            </Link>
          </div>

          {/* 문의처 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">문의</p>
            <div className="space-y-2.5">
              {contacts.map((c) => (
                <div key={c.category} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-blue-600">• {c.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{c.org}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium text-gray-700">{c.name}</span>
                    <a href={`tel:${c.tel.replace(/-/g, "")}`}
                      className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {c.tel}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* iOS 설치 가이드 모달 */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">홈 화면에 추가하기</h2>
              <button onClick={() => setShowIOSGuide(false)} className="text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {[
                { step: 1, title: "하단 공유 버튼 탭", desc: "Safari 하단의 공유(□↑) 아이콘을 탭합니다" },
                { step: 2, title: '"홈 화면에 추가" 선택', desc: '스크롤하여 "홈 화면에 추가" 항목을 탭합니다' },
                { step: 3, title: '"추가" 탭', desc: '오른쪽 상단 "추가" 버튼을 탭하면 완료!' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm"
              style={{ background: "#2563eb" }}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
