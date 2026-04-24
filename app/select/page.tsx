"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function Sparks() {
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; delay: number; duration: number; size: number }>>([]);
  useEffect(() => {
    const items = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
      size: 3 + Math.random() * 5,
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
        @keyframes spin-cw  { to { transform: rotate(360deg);  } }
        @keyframes spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function SelectPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0"
        style={{ backgroundImage: "url('/main_02.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(160deg, rgba(15,30,60,0.82) 0%, rgba(30,58,92,0.75) 50%, rgba(10,20,40,0.88) 100%)" }} />
      <div className="absolute inset-0 z-10"><Sparks /></div>

      <div className="relative z-20 w-full max-w-sm px-6"
        style={{ animation: visible ? "fadeUp 0.7s ease forwards" : "none", opacity: visible ? 1 : 0 }}>

        {/* 로고 영역 */}
        <div className="flex flex-col items-center mb-8">
          {/* 로고 + 이중 링 */}
          <div className="relative flex items-center justify-center mb-5"
            style={{ width: 96, height: 96 }}>

            {/* 바깥 링 테두리만 - 시계방향 */}
            <svg className="absolute inset-0" width="96" height="96" viewBox="0 0 96 96"
              style={{ animation: "spin-cw 6s linear infinite" }}>
              <circle cx="48" cy="48" r="46"
                fill="none"
                stroke="url(#goldGrad1)"
                strokeWidth="3"
                strokeDasharray="80 210"
                strokeLinecap="round" />
              <defs>
                <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="50%" stopColor="#ff8c00" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
              </defs>
            </svg>

            {/* 안쪽 링 테두리만 - 반시계방향 */}
            <svg className="absolute" width="78" height="78" viewBox="0 0 78 78"
              style={{
                animation: "spin-ccw 4s linear infinite",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                position: "absolute",
              }}>
              <circle cx="39" cy="39" r="37"
                fill="none"
                stroke="url(#goldGrad2)"
                strokeWidth="2"
                strokeDasharray="50 180"
                strokeLinecap="round" />
              <defs>
                <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff6600" />
                  <stop offset="50%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#ff6600" />
                </linearGradient>
              </defs>
            </svg>

            {/* 로고 중앙 */}
            <div className="relative z-10 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl"
              style={{ width: 64, height: 64, background: "white" }}>
              <img src="/logo.png" alt="로고" style={{ width: 54, height: 54, objectFit: "contain" }} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">스마트 안전관리</h1>
        </div>

        {/* 선택 버튼 */}
        <div className="space-y-3">
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

          {/* KRC 로고 - TBM 버튼 아래, 흰색 투명 처리 */}
          <div className="flex justify-center pt-5">
            <img src="/krc_logo.png" alt="한국농어촌공사"
              style={{
                height: 36,
                objectFit: "contain",
                filter: "brightness(10) saturate(0) opacity(0.85)",
              }} />
          </div>
        </div>
      </div>
    </div>
  );
}
