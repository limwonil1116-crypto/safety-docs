"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TbmReport {
  id: string; reportDate: string; contractorName: string; workToday: string;
  workerCount: number; instructorName: string; riskType: string;
  facilityName: string; projectName: string; createdAt: string;
}

const HIGH_RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·가설공사","철곸 구조물 공사","2.0m이상 외부 도장공사","승강기 설치공사","취수탑 공사","복통, 잠관 공사","이외의 작업계획서작성 대상"];

export default function TbmPage() {
  const router = useRouter();
  const [reports, setReports] = useState<TbmReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tbm").then(r => r.json()).then(d => {
      setReports(d.tbmReports ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const highRiskCount = reports.filter(r => HIGH_RISK_TYPES.includes(r.riskType)).length;

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
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
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-blue-600">{reports.length}</p>
            <p className="text-xs text-blue-500">전체</p>
          </div>
          <div className="bg-red-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-red-500">{highRiskCount}</p>
            <p className="text-xs text-red-400">고위험공종</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-green-600">{reports.reduce((s,r) => s+(r.workerCount||0), 0)}</p>
            <p className="text-xs text-green-500">투입인원</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"/>
              <div className="h-3 bg-gray-100 rounded w-2/3"/>
            </div>
          ))
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p className="text-gray-500 text-sm">등록된 TBM 보고서가 없습니다.</p>
            <button onClick={() => router.push("/tbm/new")}
              className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: "#2563eb" }}>
              첫 TBM 작성하기
            </button>
          </div>
        ) : (
          reports.map(r => (
            <Link key={r.id} href={`/tbm/${r.id}`}>
              <div className="bg-white rounded-2xl p-4 shadow-sm active:opacity-80">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">TBM</span>
                    {HIGH_RISK_TYPES.includes(r.riskType) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">고위험</span>
                    )}
                    <span className="text-sm font-bold text-gray-900">{r.reportDate}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-1">{r.contractorName || "시공사 미입력"}</p>
                {r.facilityName && <p className="text-xs text-blue-500 mb-0.5">파일 {r.facilityName}</p>}
                <p className="text-xs text-gray-500 line-clamp-1">{r.workToday || "작업내용 없음"}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">투입 {r.workerCount}명</span>
                  {r.instructorName && <span className="text-xs text-gray-400">파일 {r.instructorName}</span>}
                  {r.riskType && r.riskType !== "해당없음" && <span className="text-xs text-orange-400">파일 {r.riskType}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
