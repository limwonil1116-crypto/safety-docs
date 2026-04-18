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

    const isKakao = /KAKAOTALK|kakaotalk/i.test(ua);
    const isOtherInApp = /Instagram|NAVER|NaverApp|FB_IAB|FBAN|Line/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;

    if (isKakao)      { setInstallState("inapp_kakao"); return; }
    if (isOtherInApp) { setInstallState("inapp_other"); return; }
    if (isIOS)        { setInstallState("ios"); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setInstallState("ready");
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstallState("installed"));

    if (/Android/i.test(ua)) setInstallState("idle");

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    // ✅ prompt 있으면 바로 설치 팝업 (모달 없이)
    if (promptRef.current) {
      try {
        await promptRef.current.prompt();
        const { outcome } = await promptRef.current.userChoice;
        if (outcome === "accepted") {
          setInstallState("installed");
          promptRef.current = null;
        }
        return;
      } catch {}
    }

    // ✅ 2번: 안드로이드 인앱(카카오 등) → 크롬으로 자동 열기
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isInApp = /KAKAOTALK|kakaotalk|Instagram|NAVER|NaverApp|FB_IAB|FBAN|Line/i.test(ua);

    if (isAndroid && isInApp) {
      // 크롬 딥링크로 자동 이동 (묻지 않고 바로)
      const currentUrl = window.location.href;
      const chromeUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeUrl;
      // 딥링크 실패 대비 300ms 후 주소 복사 + 안내
      setTimeout(() => {
        navigator.clipboard?.writeText(currentUrl).catch(() => {});
        setShowModal(true);
      }, 800);
      return;
    }

    // iOS 또는 크롬 prompt 없는 경우 → 안내 모달
    setShowModal(true);
  };

  // ✅ 안드로이드 인앱: 버튼을 Chrome intent 링크로 (클릭 즉시 Chrome 열림)
  const getInstallHref = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isInApp = /KAKAOTALK|kakaotalk|Instagram|NAVER|NaverApp|FB_IAB|FBAN|Line/i.test(ua);
    if (isAndroid && isInApp) {
      const url = window.location.href.replace(/^https?:\/\//, "");
      return `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
    }
    return undefined;
  };
  const installHref = getInstallHref();

  if (installState === "installed") return <HeaderShell showInstallBtn={false} onInstall={handleInstall} />;
  return (
    <>
      <HeaderShell showInstallBtn={true} onInstall={handleInstall} installHref={installHref} />
      {showModal && <InstallModal installState={installState} onClose={() => setShowModal(false)} />}
    </>
  );
}

function HeaderShell({ showInstallBtn, onInstall, installHref }: { showInstallBtn: boolean; onInstall: () => void; installHref?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14" style={{ background: "#1e3a5f" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="로고" width={32} height={32} className="object-contain" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-sm leading-tight">안전기술본부</span>
          <span className="text-blue-200 text-xs leading-tight">스마트 안전관리 시스템</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showInstallBtn && (
          // ✅ 안드로이드 인앱: <a href="intent://..."> 로 Chrome 자동 실행
          // 일반 안드로이드 Chrome: onClick으로 beforeinstallprompt 실행
          installHref ? (
            <a href={installHref}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "#2563eb", color: "white" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              앱설치
            </a>
          ) : (
          <button onClick={onInstall} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#2563eb", color: "white" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            앱설치
          </button>
          )
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

  // ✅ 카카오톡 인앱: Chrome으로 바로 열기 딥링크 제공
  if (installState === "inapp_kakao") {
    const chromeUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;

    const openInChrome = () => {
      // Android Chrome 딥링크로 바로 이동
      window.location.href = chromeUrl;
      // 딥링크 실패 대비: 주소 클립보드 복사
      setTimeout(() => {
        navigator.clipboard?.writeText(currentUrl).catch(() => {});
      }, 1000);
    };

    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-4">앱 설치 안내</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">카카오톡 인앱 브라우저 감지</p>
          <p className="text-xs text-yellow-700">카카오톡 내에서는 앱 설치가 불가합니다. Chrome에서 열어야 설치할 수 있습니다.</p>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { step: 1, title: "오른쪽 상단 더보기(…) 버튼 탭", desc: "카카오톡 브라우저 우측 상단 점 3개 버튼" },
            { step: 2, title: "다른 브라우저로 열기 선택", desc: "Chrome으로 열기를 선택하세요" },
            { step: 3, title: "앱설치 버튼 탭", desc: "Chrome에서 앱설치 버튼을 누르면 설치됩니다" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
              <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={openInChrome} className="w-full py-3 rounded-xl text-white font-medium text-sm mb-2" style={{ background: "#2563eb" }}>
          Chrome으로 열기
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }} className="w-full py-2.5 rounded-xl text-gray-600 font-medium text-sm border border-gray-200">
          주소 복사 후 닫기
        </button>
      </ModalWrapper>
    );
  }

  // iOS
  if (installState === "ios") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-4">홈 화면에 앱 추가</h2>
        <div className="space-y-4">
          {[
            { step: 1, title: "하단 공유 버튼 탭", desc: "Safari 하단의 공유 아이콘을 탭합니다" },
            { step: 2, title: "홈 화면에 추가 선택", desc: "스크롤하여 홈 화면에 추가 항목을 탭합니다" },
            { step: 3, title: "추가 탭", desc: "오른쪽 상단 추가 버튼을 탭하면 완료!" },
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

  // 기타 인앱
  if (installState === "inapp_other") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-3">앱 설치 안내</h2>
        <p className="text-sm text-gray-600 mb-4">인앱 브라우저에서는 설치가 제한됩니다. Chrome으로 접속 후 설치해 주세요.</p>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">접속 주소</p>
          <p className="text-sm font-mono text-blue-600 break-all">{currentUrl}</p>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>주소 복사</button>
      </ModalWrapper>
    );
  }

  // Android - prompt 없음 (Samsung Internet 등)
  return (
    <ModalWrapper onClose={onClose}>
      <h2 className="text-base font-bold text-gray-900 mb-3">앱 설치 안내</h2>
      <p className="text-sm text-gray-600 mb-3">Chrome 브라우저에서 접속하시면 홈 화면에 바로 설치할 수 있습니다.</p>
      <div className="bg-blue-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs text-blue-700">
        <p>• Chrome: 주소창 우측 설치 아이콘 탭</p>
        <p>• Samsung Internet: 메뉴(≡) → 페이지 추가 → 홈 화면에 추가</p>
      </div>
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
