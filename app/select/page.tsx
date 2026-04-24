"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 불꽃 파티클
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
        <div key={s.id} className="absolute bottom-0 animate-spark"
          style={{
            left: `${s.x}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}>
          <div style={{
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, #ffd700, #ff8c00)`,
            boxShadow: `0 0 ${s.size * 2}px #ffd700, 0 0 ${s.size * 4}px #ff6600`,
          }} />
        </div>
      ))}
      <style>{`
        @keyframes spark {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          50% { transform: translateY(-40vh) translateX(${Math.random() > 0.5 ? "" : "-"}${Math.floor(Math.random() * 30 + 10)}px) scale(0.8); opacity: 0.8; }
          100% { transform: translateY(-80vh) translateX(${Math.random() > 0.5 ? "" : "-"}${Math.floor(Math.random() * 60 + 20)}px) scale(0); opacity: 0; }
        }
        .animate-spark {
          animation: spark linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function SelectPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/main_02.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }} />
      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(160deg, rgba(15,30,60,0.82) 0%, rgba(30,58,92,0.75) 50%, rgba(10,20,40,0.88) 100%)" }} />

      {/* 불꽃 파티클 */}
      <div className="absolute inset-0 z-10">
        <Sparks />
      </div>

      {/* 컨텐츠 */}
      <div className={`relative z-20 w-full max-w-sm px-6 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

        {/* 로고 + 타이틀 */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            {/* KRC 로고 스타일 */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{ background: "linear-gradient(135deg, #1a3a6c, #2563eb)" }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="white"/>
                <path d="M9 12l2 2 4-4" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">스마트 안전관리</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-yellow-400/60" />
            <p className="text-yellow-300 text-sm font-medium tracking-wide">한국농어촌공사 안전기술본부</p>
            <div className="h-px w-8 bg-yellow-400/60" />
          </div>
        </div>

        {/* 선택 버튼들 */}
        <div className="space-y-3">
          <p className="text-white/70 text-xs text-center mb-4 tracking-wide">업무 유형을 선택해주세요</p>

          {/* 도급사업 */}
          <button onClick={() => router.push("/tasks?category=CONTRACTOR")}
            className="w-full rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold text-white">도급사업 (용역)</div>
              <div className="text-xs text-white/60 mt-0.5">수급업체 안전작업허가서 관리</div>
            </div>
            <svg className="text-white/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          {/* 자체진단 */}
          <button onClick={() => router.push("/tasks?category=SELF")}
            className="w-full rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold text-white">자체진단</div>
              <div className="text-xs text-white/60 mt-0.5">지구별 자체 안전진단 관리</div>
            </div>
            <svg className="text-white/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          {/* 일일안전교육(TBM) */}
          <button onClick={() => router.push("/tbm")}
            className="w-full rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,215,0,0.3)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold text-white">일일안전교육 (TBM)</div>
              <div className="text-xs text-white/60 mt-0.5">현장 안전교육 보고서 작성</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#ffd700", color: "#92400e" }}>NEW</span>
              <svg className="text-white/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        </div>

        <p className="text-white/30 text-xs text-center mt-8">© 한국농어촌공사 안전기술본부</p>
      </div>
    </div>
  );
}
