"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TbmReport {
  id: string; reportDate: string; contractorName: string; workToday: string;
  workerCount: number; instructorName: string; riskType: string;
  facilityName: string; projectName: string; createdAt: string;
  taskType: string; band: string;
}

const HIGH_RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·가설공사","철곸 구조물 공사","2.0m이상 외부 도장공사","승강기 설치공사","취수탑 공사","복통, 잠관 공사","이외의 작업계획서작성 대상"];

const today = () => new Date().toISOString().split("T")[0];

export default function TbmPage() {
  const router = useRouter();
  const [reports, setReports] = useState<TbmReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [taskFilter, setTaskFilter] = useState<"" | "용역" | "자체진단">("");
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [date, setDate] = useState(today()); // ✅ 오늘 날짜 디폴트

  const loadReports = (d: string) => {
    setLoading(true);
    const url = d ? `/api/tbm?date=${d}` : "/api/tbm";
    fetch(url).then(r => r.json()).then(data => {
      setReports(data.tbmReports ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadReports(date); }, [date]);

  const moveDate = (days: number) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("이 TBM 보고서를 삭제하시겠습니까?")) return;
    await fetch(`/api/tbm/${id}`, { method: "DELETE" });
    setReports(prev => prev.filter(r => r.id !== id));
    setMenuOpen(null);
  };

  // ✅ taskType null/undefined/빈문자 모두 처리
  const filtered = reports.filter(r => {
    if (taskFilter) {
      const t = r.taskType || "";
      if (t !== taskFilter) return false;
    }
    if (highRiskOnly && !HIGH_RISK_TYPES.includes(r.riskType)) return false;
    return true;
  });
  const highRiskCount = filtered.filter(r => HIGH_RISK_TYPES.includes(r.riskType)).length;

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">TBM 보고서</h1>
            <p className="text-xs text-gray-500 mt-0.5">일일 안전교육 보고</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/tbm/overview")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-blue-600 text-sm font-medium border border-blue-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              관제
            </button>
            <button onClick={() => router.push("/tbm/new")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: "#2563eb" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              작성
            </button>
          </div>
        </div>

        {/* ✅ 날짜 네비 - 오늘 날짜 디폴트 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button onClick={() => moveDate(-1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => moveDate(1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {date !== today() && (
            <button onClick={() => setDate(today())} className="text-xs text-blue-500 border border-blue-200 rounded-lg px-2 py-1">오늘</button>
          )}
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {(["", "용역", "자체진단"] as const).map(f => (
            <button key={f} onClick={() => setTaskFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${taskFilter === f ? (f === "용역" ? "bg-green-600 text-white border-green-600" : f === "자체진단" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-700 text-white border-gray-700") : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
              {f || "전체"}
            </button>
          ))}
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-blue-600">{filtered.length}</p>
            <p className="text-xs text-blue-500">전체</p>
          </div>
          <div onClick={() => setHighRiskOnly(v => !v)}
            className={`rounded-xl p-2.5 text-center cursor-pointer transition-all ${highRiskOnly ? "bg-red-500 shadow-inner" : "bg-red-50 hover:bg-red-100"}`}>
            <p className={`text-xl font-bold ${highRiskOnly ? "text-white" : "text-red-500"}`}>{highRiskCount}</p>
            <p className={`text-xs font-medium ${highRiskOnly ? "text-red-100" : "text-red-400"}`}>고위험{highRiskOnly ? " ✓" : ""}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-green-600">{filtered.reduce((s,r) => s+(r.workerCount||0), 0)}</p>
            <p className="text-xs text-green-500">투입인원</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3" ref={menuRef}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"/>
              <div className="h-3 bg-gray-100 rounded w-2/3"/>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">이 날짜에 TBM이 없습니다.</p>
            <button onClick={() => router.push("/tbm/new")}
              className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-medium inline-block"
              style={{ background: "#2563eb" }}>TBM 작성하기</button>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="relative">
              <Link href={`/tbm/${r.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm active:opacity-80 pr-14">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* ✅ 용역/자체진단 배지 앞에 표시 */}
                      {r.taskType === "용역" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold border border-green-200">용역</span>
                      )}
                      {r.taskType === "자체진단" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">자체진단</span>
                      )}
                      {HIGH_RISK_TYPES.includes(r.riskType) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold border border-red-200">고위험</span>
                      )}
                      <span className="text-xs font-bold text-gray-900">{r.reportDate}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                  {/* ✅ 용역명/자체진단명 우선 표시 */}
                  <p className="text-sm font-bold text-gray-900 mb-0.5">{r.projectName || r.contractorName || "미입력"}</p>
                  {r.facilityName && <p className="text-xs text-blue-500 mb-0.5">📍 {r.facilityName}</p>}
                  <p className="text-xs text-gray-500 line-clamp-1 mb-1.5">{r.workToday || "작업내용 없음"}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">투입 {r.workerCount}명</span>
                    {r.contractorName && <span className="text-xs text-gray-400">{r.contractorName}</span>}
                    {r.riskType && r.riskType !== "해당없음" && (
                      <span className="text-xs text-orange-500 font-medium">{r.riskType}</span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id); }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                  </svg>
                </button>
                {menuOpen === r.id && (
                  <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 w-28">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/tbm/new?editId=${r.id}`); setMenuOpen(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      수정
                    </button>
                    <div className="border-t border-gray-100"/>
                    <button onClick={(e) => handleDelete(e, r.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
