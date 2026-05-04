"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function LogoImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      // 모서리 픽셀 색상을 배경색으로 간주
      const br = data[0], bg = data[1], bb = data[2];
      const threshold = 40;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        if (Math.abs(r-br) < threshold && Math.abs(g-bg) < threshold && Math.abs(b-bb) < threshold) {
          data[i+3] = 0; // 투명
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };
    img.src = "/logo.png";
  }, []);
  return (
    <canvas ref={canvasRef}
      style={{ width: 80, height: 80, filter: "drop-shadow(0 0 12px rgba(255,215,0,0.7))" }} />
  );
}

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
        @keyframes spin-cw  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// 방패 모양 path - viewBox 0 0 100 100 기준
// M 50,5 L 90,20 L 90,50 Q 90,80 50,95 Q 10,80 10,50 L 10,20 Z
const SHIELD_PATH = "M 50,4 L 92,20 L 92,52 Q 90,82 50,96 Q 10,82 8,52 L 8,20 Z";
const SHIELD_PATH_MID = "M 50,8 L 86,22 L 86,52 Q 84,78 50,91 Q 16,78 14,52 L 14,22 Z";
const SHIELD_PATH_INNER = "M 50,13 L 80,26 L 80,52 Q 78,74 50,86 Q 22,74 20,52 L 20,26 Z";

export default function SelectPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0"
        style={{ backgroundImage: "url('/main_02.jpg')", backgroundSize: "cover", backgroundPosition: "50% 50%", backgroundAttachment: "fixed" }} />
      <div className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(160deg, rgba(15,30,60,0.82) 0%, rgba(30,58,92,0.75) 50%, rgba(10,20,40,0.88) 100%)" }} />
      <div className="absolute inset-0 z-10"><Sparks /></div>

      <div className="relative z-20 w-full max-w-sm px-6 flex flex-col items-center"
        style={{ animation: visible ? "fadeUp 0.7s ease forwards" : "none", opacity: visible ? 1 : 0 }}>

        {/* 로고 + 방패형 3줄 회전 링 */}
        <div className="relative flex items-center justify-center mb-5"
          style={{ width: 160, height: 160 }}>

          {/* 1번 링 - 바깥쪽, 시계방향 느리게 */}
          <svg width="160" height="160" viewBox="0 0 100 100"
            className="absolute inset-0"
            style={{ animation: "spin-cw 8s linear infinite", transformOrigin: "50% 50%" }}>
            <defs>
              <linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" stopOpacity="1"/>
                <stop offset="50%" stopColor="#ff8c00" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#ffd700" stopOpacity="1"/>
              </linearGradient>
            </defs>
            <path d={SHIELD_PATH} fill="none" stroke="url(#sg1)" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 4px #ffd700)" }} />
          </svg>

          {/* 2번 링 - 중간, 반시계방향 */}
          <svg width="136" height="136" viewBox="0 0 100 100"
            className="absolute"
            style={{
              animation: "spin-ccw 5s linear infinite",
              transformOrigin: "50% 50%",
              top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              position: "absolute",
            }}>
            <defs>
              <linearGradient id="sg2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffe566" stopOpacity="1"/>
                <stop offset="50%" stopColor="#ffaa00" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#ffe566" stopOpacity="1"/>
              </linearGradient>
            </defs>
            <path d={SHIELD_PATH_MID} fill="none" stroke="url(#sg2)" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 3px #ffaa00)" }} />
          </svg>

          {/* 3번 링 - 안쪽, 시계방향 중간 */}
          <svg width="112" height="112" viewBox="0 0 100 100"
            className="absolute"
            style={{
              animation: "spin-cw 12s linear infinite",
              transformOrigin: "50% 50%",
              top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              position: "absolute",
            }}>
            <defs>
              <linearGradient id="sg3" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" stopOpacity="0.9"/>
                <stop offset="50%" stopColor="#ff6600" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#ffd700" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
            <path d={SHIELD_PATH_INNER} fill="none" stroke="url(#sg3)" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 2px #ffd700)" }} />
          </svg>

          {/* 로고 - 배경 없이 그대로 */}
          <div className="relative z-10 flex items-center justify-center"
            style={{ width: 80, height: 80 }}>
            <LogoImage />
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

          <p className="text-white/30 text-[10px] text-center pt-4">
            © 2026. 한국농어촌공사 안전기술본부 All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
