"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "idle" | "ready" | "ios" | "inapp_kakao" | "inapp_other" | "installed";

export default function Header() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [showModal, setShowModal] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setInstallState("installed");
      return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isKakao = /KAKAOTALK|kakaotalk/i.test(ua);
    const isOtherInApp = /Instagram|NAVER|NaverApp|FB_IAB|FBAN|Line/i.test(ua);

    if (isKakao)      { setInstallState("inapp_kakao"); return; }
    if (isOtherInApp) { setInstallState("inapp_other"); return; }
    if (isIOS)        { setInstallState("ios"); return; }

    // Android Chrome: beforeinstallprompt 이벤트 캐치
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setInstallState("ready");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstallState("installed");
    window.addEventListener("appinstalled", installedHandler);

    // Android면 이벤트 오기 전에도 버튼 표시 (idle 유지)
    const isAndroid = /Android/i.test(ua);
    if (isAndroid) setInstallState("idle");

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    // ★ promptRef 있으면 무조건 바로 PWA 설치 프롬프트 실행
    if (promptRef.current) {
      try {
        await promptRef.current.prompt();
        const { outcome } = await promptRef.current.userChoice;
        if (outcome === "accepted") {
          setInstallState("installed");
          promptRef.current = null;
        }
        return;
      } catch {
        // 실패 시 모달로 폴백
      }
    }
    // iOS / 인앱 / promptRef 없는 경우 → 안내 모달
    setShowModal(true);
  };

  if (installState === "installed") return (
    <HeaderShell showInstallBtn={false} onInstall={handleInstall} />
  );

  return (
    <>
      <HeaderShell showInstallBtn={installState !== "installed"} onInstall={handleInstall} />
      {showModal && <InstallModal installState={installState} onClose={() => setShowModal(false)} />}
    </>
  );
}

function HeaderShell({ showInstallBtn, onInstall }: { showInstallBtn: boolean; onInstall: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14" style={{ background: "#1e3a5f" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="로고" width={32} height={32} className="object-contain" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-sm leading-tight">안전기술본부</span>
          <span className="text-blue-200 text-xs leading-tight">현장안전 허가작업 시스템</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showInstallBtn && (
          <button onClick={onInstall} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#2563eb", color: "white" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            앱설치
          </button>
        )}
        <button className="text-white opacity-80 p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#2563eb", color: "white" }}>나</div>
      </div>
    </header>
  );
}

function InstallModal({ installState, onClose }: { installState: InstallState; onClose: () => void }) {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://safety-docs.vercel.app";

  if (installState === "inapp_kakao") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-4">앱 설치 안내</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">📌 카카오톡 인앱 브라우저 감지</p>
          <p className="text-xs text-yellow-700">카카오톡 내에서는 앱 설치가 불가합니다.<br />아래 방법으로 외부 브라우저에서 열어주세요.</p>
        </div>
        <div className="space-y-3">
          {[
            { step: 1, title: "오른쪽 상단 ⋯ (더보기) 버튼 탭", desc: "카카오톡 브라우저 우측 상단 점 3개 버튼" },
            { step: 2, title: "\"다른 브라우저로 열기\" 선택", desc: "Chrome 또는 Safari로 열기를 선택하세요" },
            { step: 3, title: "열린 브라우저에서 앱설치 버튼 탭", desc: "동일한 화면에서 앱설치 버튼을 누르면 설치됩니다" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
              <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }} className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>
          주소 복사 후 닫기
        </button>
      </ModalWrapper>
    );
  }

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
              <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>확인</button>
      </ModalWrapper>
    );
  }

  if (installState === "inapp_other") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-3">앱 설치 안내</h2>
        <p className="text-sm text-gray-600 mb-4">인앱 브라우저에서는 설치가 제한됩니다.<br /><b>Chrome 또는 Safari</b>로 접속 후 설치해 주세요.</p>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">접속 주소</p>
          <p className="text-sm font-mono text-blue-600 break-all">{currentUrl}</p>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>주소 복사</button>
      </ModalWrapper>
    );
  }

  // Android idle - beforeinstallprompt 아직 안 온 경우
  return (
    <ModalWrapper onClose={onClose}>
      <h2 className="text-base font-bold text-gray-900 mb-3">앱 설치 안내</h2>
      <p className="text-sm text-gray-600 mb-4">Chrome 브라우저 주소창 우측의 <b>설치</b> 아이콘을 탭하거나, 메뉴(⋮)에서 <b>"앱 설치"</b>를 선택하세요.</p>
      <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">💡 이미 방문한 사이트는 Chrome이 자동으로 설치 버튼을 제공합니다.</div>
      <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>확인</button>
    </ModalWrapper>
  );
}

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
