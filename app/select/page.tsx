"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function Sparks() {
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; delay: number; duration: number; size: number }>>([]);
  useEffect(() => {
    const items = Array.from({ length: 18 }, (_, i) => ({
      id: i, x: Math.random() * 100,
      delay: Math.random() * 3, duration: 2 + Math.random() * 2, size: 3 + Math.random() * 5,
    }));
    setSparks(items);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparks.map(s => (
        <div key={s.id} className="absolute bottom-0"
          style={{ left: `${s.x}%`, animation: `spark ${s.duration}s ${s.delay}s linear infinite` }}>
          <div style={{
            width: s.size, height: s.size, borderRadius: "50%",
            background: "radial-gradient(circle, #ffd700, #ff8c00)",
            boxShadow: `0 0 ${s.size * 2}px #ffd700, 0 0 ${s.size * 4}px #ff6600`,
          }} />
        </div>
      ))}
      <style>{`
        @keyframes spark {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-85vh) scale(0); opacity: 0; }
        }
        @keyframes orbit1 { from { transform: rotate(0deg)   translateX(56px) rotate(0deg);   } to { transform: rotate(360deg)  translateX(56px) rotate(-360deg);  } }
        @keyframes orbit2 { from { transform: rotate(120deg) translateX(48px) rotate(-120deg); } to { transform: rotate(480deg)  translateX(48px) rotate(-480deg);  } }
        @keyframes orbit3 { from { transform: rotate(240deg) translateX(64px) rotate(-240deg); } to { transform: rotate(600deg)  translateX(64px) rotate(-600deg);  } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function OrbitingStar({ orbitAnim, duration, size = 6 }: { orbitAnim: string; duration: number; size?: number }) {
  return (
    <div className="absolute" style={{
      top: "50%", left: "50%",
      width: 0, height: 0,
      animation: `${orbitAnim} ${duration}s linear infinite`,
    }}>
      {/* 별 본체 */}
      <div style={{
        width: size, height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle, #fff8dc, #ffd700)",
        boxShadow: `0 0 ${size * 1.5}px #ffd700, 0 0 ${size * 3}px #ffaa00`,
        marginTop: -size / 2,
        marginLeft: -size / 2,
        position: "relative",
      }}>
        {/* 꼬리 */}
        <div style={{
          position: "absolute",
          right: size,
          top: size / 2 - 1,
          width: size * 4,
          height: 2,
          background: "linear-gradient(to left, rgba(255,215,0,0.8), transparent)",
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

export default function SelectPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const LOGO_SIZE = 80;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0"
        style={{ backgroundImage: "url('/main_02.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(160deg, rgba(15,30,60,0.82) 0%, rgba(30,58,92,0.75) 50%, rgba(10,20,40,0.88) 100%)" }} />
      <div className="absolute inset-0 z-10"><Sparks /></div>

      <div className="relative z-20 w-full max-w-sm px-6 flex flex-col items-center"
        style={{ animation: visible ? "fadeUp 0.7s ease forwards" : "none", opacity: visible ? 1 : 0 }}>

        {/* 로고 + 별똥별 3개 */}
        <div className="relative flex items-center justify-center mb-5"
          style={{ width: 160, height: 160 }}>

          {/* 별똥별 3개 - 각각 다른 궤도/속도 */}
          <OrbitingStar orbitAnim="orbit1" duration={3.5} size={7} />
          <OrbitingStar orbitAnim="orbit2" duration={5}   size={5} />
          <OrbitingStar orbitAnim="orbit3" duration={4}   size={6} />

          {/* 로고 */}
          <div className="relative z-10 flex items-center justify-center shadow-2xl"
            style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: "50%", background: "white" }}>
            <img src="/logo.png" alt="로고"
              style={{ width: LOGO_SIZE - 12, height: LOGO_SIZE - 12, objectFit: "contain" }} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg mb-8">스마트 안전관리</h1>

        {/* 선택 버튼 */}
        <div className="w-full space-y-3">
          <p className="text-white/60 text-xs text-center mb-3 tracking-wide">업무 유형을 선택해주세요</p>

          {[
            {
              label: "도급사업 (용역)", sub: "수급업체 안전작업허가서 관리",
              path: "/tasks?category=CONTRACTOR",
              color: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              badge: null,
            },
            {
              label: "자체진단", sub: "지구별 자체 안전진단 관리",
              path: "/tasks?category=SELF",
              color: "linear-gradient(135deg, #16a34a, #15803d)",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
              badge: null,
            },
            {
              label: "일일안전교육 (TBM)", sub: "현장 안전교육 보고서 작성",
              path: "/tbm",
              color: "linear-gradient(135deg, #d97706, #b45309)",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
              badge: "NEW",
            },
          ].map((item) => (
            <button key={item.label} onClick={() => router.push(item.path)}
              className="w-full rounded-2xl p-4 flex items-center gap-4 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.18)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: item.color }}>{item.icon}</div>
              <div className="text-left flex-1">
                <div className="text-sm font-bold text-white">{item.label}</div>
                <div className="text-xs text-white/50 mt-0.5">{item.sub}</div>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold mr-1"
                  style={{ background: "#ffd700", color: "#92400e" }}>{item.badge}</span>
              )}
              <svg className="text-white/30 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}

          {/* 하단 텍스트 */}
          <p className="text-white/30 text-[10px] text-center pt-4">
            © 2026. 한국농어촌공사 안전기술본부 All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
