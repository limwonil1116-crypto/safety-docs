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

    // Android Chrome: beforeinstallprompt ?대깽??罹먯튂
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setInstallState("ready");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstallState("installed");
    window.addEventListener("appinstalled", installedHandler);

    // Android硫??대깽???ㅺ린 ?꾩뿉??踰꾪듉 ?쒖떆 (idle ?좎?)
    const isAndroid = /Android/i.test(ua);
    if (isAndroid) setInstallState("idle");

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    // ??promptRef ?덉쑝硫?臾댁“嫄?諛붾줈 PWA ?ㅼ튂 ?꾨＼?꾪듃 ?ㅽ뻾
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
        // ?ㅽ뙣 ??紐⑤떖濡??대갚
      }
    }
    // iOS / ?몄빋 / promptRef ?녿뒗 寃쎌슦 ???덈궡 紐⑤떖
    setShowModal(true);
  };

  if (installState === "installed") return (
    <HeaderShell showInstallBtn={false} onInstall={handleInstall} />
  );

  return (
    <>
      <HeaderShell showInstallBtn={true} onInstall={handleInstall} />
      {showModal && <InstallModal installState={installState} onClose={() => setShowModal(false)} />}
    </>
  );
}

function HeaderShell({ showInstallBtn, onInstall }: { showInstallBtn: boolean; onInstall: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14" style={{ background: "#1e3a5f" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="濡쒓퀬" width={32} height={32} className="object-contain" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-sm leading-tight">안전기술본부</span>
          <span className="text-blue-200 text-xs leading-tight">현장안전 허가작업 시스템/span>
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
            ?깆꽕移?          </button>
        )}
        <button className="text-white opacity-80 p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#2563eb", color: "white" }}>??/div>
      </div>
    </header>
  );
}

function InstallModal({ installState, onClose }: { installState: InstallState; onClose: () => void }) {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://safety-docs.vercel.app";

  if (installState === "inapp_kakao") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-4">???ㅼ튂 ?덈궡</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">?뱦 移댁뭅?ㅽ넚 ?몄빋 釉뚮씪?곗? 媛먯?</p>
          <p className="text-xs text-yellow-700">移댁뭅?ㅽ넚 ?댁뿉?쒕뒗 ???ㅼ튂媛 遺덇??⑸땲??<br />?꾨옒 諛⑸쾿?쇰줈 ?몃? 釉뚮씪?곗??먯꽌 ?댁뼱二쇱꽭??</p>
        </div>
        <div className="space-y-3">
          {[
            { step: 1, title: "?ㅻⅨ履??곷떒 ??(?붾낫湲? 踰꾪듉 ??, desc: "移댁뭅?ㅽ넚 釉뚮씪?곗? ?곗륫 ?곷떒 ??3媛?踰꾪듉" },
            { step: 2, title: "\"?ㅻⅨ 釉뚮씪?곗?濡??닿린\" ?좏깮", desc: "Chrome ?먮뒗 Safari濡??닿린瑜??좏깮?섏꽭?? },
            { step: 3, title: "?대┛ 釉뚮씪?곗??먯꽌 ?깆꽕移?踰꾪듉 ??, desc: "?숈씪???붾㈃?먯꽌 ?깆꽕移?踰꾪듉???꾨Ⅴ硫??ㅼ튂?⑸땲?? },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
              <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }} className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>
          二쇱냼 蹂듭궗 ???リ린
        </button>
      </ModalWrapper>
    );
  }

  if (installState === "ios") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-4">???붾㈃????異붽?</h2>
        <div className="space-y-4">
          {[
            { step: 1, title: "?섎떒 怨듭쑀 踰꾪듉 ??, desc: "Safari ?섎떒??怨듭쑀(?△넁) ?꾩씠肄섏쓣 ??빀?덈떎" },
            { step: 2, title: "\"???붾㈃??異붽?\" ?좏깮", desc: "?ㅽ겕濡ㅽ븯??\"???붾㈃??異붽?\" ??ぉ????빀?덈떎" },
            { step: 3, title: "\"異붽?\" ??, desc: "?ㅻⅨ履??곷떒 \"異붽?\" 踰꾪듉????븯硫??꾨즺!" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">{step}</div>
              <div><p className="text-sm font-medium text-gray-900">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>?뺤씤</button>
      </ModalWrapper>
    );
  }

  if (installState === "inapp_other") {
    return (
      <ModalWrapper onClose={onClose}>
        <h2 className="text-base font-bold text-gray-900 mb-3">???ㅼ튂 ?덈궡</h2>
        <p className="text-sm text-gray-600 mb-4">?몄빋 釉뚮씪?곗??먯꽌???ㅼ튂媛 ?쒗븳?⑸땲??<br /><b>Chrome ?먮뒗 Safari</b>濡??묒냽 ???ㅼ튂??二쇱꽭??</p>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">?묒냽 二쇱냼</p>
          <p className="text-sm font-mono text-blue-600 break-all">{currentUrl}</p>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(currentUrl); onClose(); }} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>二쇱냼 蹂듭궗</button>
      </ModalWrapper>
    );
  }

  // Android idle - beforeinstallprompt ?꾩쭅 ????寃쎌슦
  return (
    <ModalWrapper onClose={onClose}>
      <h2 className="text-base font-bold text-gray-900 mb-3">???ㅼ튂 ?덈궡</h2>
      <p className="text-sm text-gray-600 mb-4">Chrome 釉뚮씪?곗? 二쇱냼李??곗륫??<b>?ㅼ튂</b> ?꾩씠肄섏쓣 ??븯嫄곕굹, 硫붾돱(???먯꽌 <b>"???ㅼ튂"</b>瑜??좏깮?섏꽭??</p>
      <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">?뮕 ?대? 諛⑸Ц???ъ씠?몃뒗 Chrome???먮룞?쇰줈 ?ㅼ튂 踰꾪듉???쒓났?⑸땲??</div>
      <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: "#2563eb" }}>?뺤씤</button>
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
