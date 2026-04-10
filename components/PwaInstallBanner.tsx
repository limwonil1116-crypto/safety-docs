"use client";
// components/PwaInstallBanner.tsx
// 사용법: app/(main)/layout.tsx 상단에 <PwaInstallBanner /> 추가

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 이미 설치됐으면 표시 안 함
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // 이미 닫은 경우 24시간 동안 표시 안 함
    const dismissedAt = localStorage.getItem("pwa-banner-dismissed");
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) return;

    // iOS 감지
    const ua = navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(iosDevice);

    if (iosDevice) {
      // iOS Safari에서 standalone이 아닐 때만 표시
      const isInStandaloneMode = ("standalone" in window.navigator) && (window.navigator as any).standalone;
      if (!isInStandaloneMode) setShowBanner(true);
    } else {
      // Android/Desktop: beforeinstallprompt 이벤트 대기
      const handler = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
        setShowBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (!showBanner || dismissed) return null;

  return (
    <>
      {/* 설치 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        {/* 앱 아이콘 */}
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">안전관리 시스템</p>
          <p className="text-xs text-blue-100 mt-0.5">홈 화면에 추가하면 앱처럼 사용할 수 있어요</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleInstall}
            className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">
            {isIOS ? "설치 방법" : "설치"}
          </button>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      {/* 배너 높이만큼 공간 확보 */}
      <div className="h-[60px]" />

      {/* iOS 설치 가이드 모달 */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
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
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">하단 공유 버튼 탭</p>
                  <p className="text-xs text-gray-500 mt-0.5">Safari 하단의 공유(□↑) 아이콘을 탭합니다</p>
                  <div className="mt-2 bg-gray-100 rounded-xl p-3 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">"홈 화면에 추가" 선택</p>
                  <p className="text-xs text-gray-500 mt-0.5">스크롤하여 "홈 화면에 추가" 항목을 탭합니다</p>
                  <div className="mt-2 bg-gray-100 rounded-xl p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">홈 화면에 추가</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">"추가" 탭</p>
                  <p className="text-xs text-gray-500 mt-0.5">오른쪽 상단 "추가" 버튼을 탭하면 완료!</p>
                </div>
              </div>
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
