"use client";

import { useRouter } from "next/navigation";

export default function SelectPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(160deg, #1e3a5f 0%, #2563eb 100%)" }}>
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">스마트 안전관리</h1>
        <p className="text-blue-200 text-sm mt-1">한국농어촌공사 안전기술본부</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <p className="text-white/80 text-sm text-center mb-6">업무 유형을 선택해주세요</p>

        <button onClick={() => router.push("/tasks?category=CONTRACTOR")}
          className="w-full bg-white rounded-2xl p-6 flex items-center gap-4 shadow-lg hover:bg-blue-50 active:scale-95 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="text-base font-bold text-gray-900">도급사업 (용역)</div>
            <div className="text-xs text-gray-500 mt-0.5">수급업체 안전작업허가서 관리</div>
          </div>
          <svg className="ml-auto text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <button onClick={() => router.push("/tasks?category=SELF")}
          className="w-full bg-white rounded-2xl p-6 flex items-center gap-4 shadow-lg hover:bg-green-50 active:scale-95 transition-all">
          <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="text-base font-bold text-gray-900">자체진단</div>
            <div className="text-xs text-gray-500 mt-0.5">지구별 자체 안전진단 관리</div>
          </div>
          <svg className="ml-auto text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}
