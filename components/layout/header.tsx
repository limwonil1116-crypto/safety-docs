"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Header() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 이미 설치된 경우
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }
    // Android Chrome: beforeinstallprompt 이벤트 캐치
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    // 카톡/인앱브라우저 감지
    const isInApp = /KAKAO|kakaotalk|Instagram|NAVER|NaverApp|FB_IAB|FBAN/i.test(ua);

    if (isInApp) {
      // 인앱브라우저: 외부 브라우저로 열기 안내
      alert("앱 설치를 위해 Safari 또는 Chrome 브라우저로 열어주세요.\n\n• Safari: 하단 공유 → 홈 화면에 추가\n• Chrome: 주소창 우측 메뉴 → 홈 화면에 추가");
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstallPrompt(null);
    } else {
      // 이미 설치됐거나 지원 안 하는 경우
      alert("이미 설치되어 있거나, 브라우저 메뉴에서 '홈 화면에 추가'를 이용해주세요.");
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: "#1e3a5f" }}>
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
          {/* PWA 설치 버튼 - 설치 완료 전엔 항상 표시 */}
          {!isStandalone && (
            <button onClick={handleInstall}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "#2563eb", color: "white" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              앱 설치
            </button>
          )}
          <button className="text-white opacity-80 p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "#2563eb", color: "white" }}>
            나
          </div>
        </div>
      </header>

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
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">{step}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
