"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "idle" | "ready" | "ios" | "inapp_kakao" | "inapp_other" | "installed";

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-400 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InstallModal({ installState, onClose }: { installState: InstallState; onClose: () => void }) {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://safety-docs.vercel.app";

  if (installState === "ios") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-4">홈 화면에 앱 추가</h2>
        <div className="space-y-4">
          {[
            { step: 1, title: "하단 공유 버튼 탭", desc: "Safari 하단의 공유(□↑) 아이콘을 탭합니다" },
            { step: 2, title: "\"홈 화면에 추가\" 선택", desc: "스크롤하여 \"홈 화면에 추가\" 항목을 탭합니다" },
            { step: 3, title: "\"추가\" 탭", desc: "오른쪽 상단 \"추가\" 버튼을 탭하면 완료!" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">{step}</div>
              <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>
          확인
        </button>
      </ModalWrapper>
    );
  }

  if (installState === "inapp_other") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-3">앱 설치 안내</h2>
        <p className="text-sm text-gray-600 mb-4">인앱 브라우저에서는 앱 설치가 제한됩니다.<br /><b>Chrome 또는 Safari</b>로 직접 열어 설치해주세요.</p>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">직접 주소</p>
          <p className="text-sm font-mono text-blue-600 break-all">{currentUrl}</p>
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }}
          className="w-full py-3 rounded-xl text-white font-medium text-sm"
          style={{ background: "#2563eb" }}>
          주소 복사
        </button>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper onClose={onClose}>
      <h2 className="text-base font-bold text-gray-900 mb-3">앱 설치 안내</h2>
      <p className="text-sm text-gray-600 mb-4">Chrome 브라우저 주소창 오른쪽의 <b>설치</b> 아이콘을 탭하거나, 메뉴(⋮)에서 <b>"앱 설치"</b>를 선택하세요.</p>
      <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>
        확인
      </button>
    </ModalWrapper>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [installState, setInstallState] = useState<InstallState>("idle");
  const [showModal, setShowModal] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;

    // ✅ 안드로이드 인앱(카카오톡 등) → 페이지 로드 즉시 Chrome으로 자동 이동
    const isAndroid = /Android/i.test(ua);
    const isInApp = /KAKAOTALK|kakaotalk|Instagram|NAVER|NaverApp|FB_IAB|FBAN|Line|Twitter/i.test(ua);
    if (isAndroid && isInApp) {
      const currentUrl = window.location.href;
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
      window.location.replace(intentUrl);
      return;
    }

    // PWA 설치 상태 감지
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setInstallState("installed");
      return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isOtherInApp = /Instagram|NAVER|NaverApp|FB_IAB|FBAN|Line/i.test(ua);

    if (isOtherInApp) { setInstallState("inapp_other"); return; }
    if (isIOS) { setInstallState("ios"); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setInstallState("ready");
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installedHandler = () => setInstallState("installed");
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;

    if (isIOS) { setShowModal(true); return; }

    if (installState === "ready" && promptRef.current) {
      try {
        await promptRef.current.prompt();
        const { outcome } = await promptRef.current.userChoice;
        if (outcome === "accepted") {
          setInstallState("installed");
          promptRef.current = null;
        }
      } catch { setShowModal(true); }
    } else {
      setShowModal(true);
    }
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
      name: "담당자",
      org: "한국농어촌공사 안전기술본부 안전정책처 안전정책담당",
      tel: "042-479-8299",
    },
    {
      category: "시스템문의",
      name: "시스템담당자",
      org: "한국농어촌공사 디지털혁신처 디지털전략팀",
      tel: "041-339-1844",
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #dbeafe 0%, #eff6ff 50%, #dbeafe 100%)" }}
    >
      {/* 앱설치 버튼 - 우측 상단 고정 */}
      {installState !== "installed" && installState !== "idle" && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg"
            style={{ background: "#1e3a5f", color: "white" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            앱설치
          </button>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden bg-white shadow-sm">
              <Image src="/logo.png" alt="안전기술본부 로고" width={80} height={80} className="object-contain" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center leading-tight">
              안전기술본부<br />스마트 안전 작업허가 시스템
            </h1>
            <p className="text-sm text-gray-500 mt-1">계정으로 로그인하세요</p>
          </div>

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
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
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
                    <span className="text-xs font-semibold text-blue-600">· {c.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{c.org}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium text-gray-700">{c.name}</span>
                    <a href={`tel:${c.tel.replace(/-/g, "")}`}
                      className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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

      {showModal && (
        <InstallModal installState={installState} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
