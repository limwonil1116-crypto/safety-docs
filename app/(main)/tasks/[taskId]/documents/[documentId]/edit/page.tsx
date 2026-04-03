"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const DOCUMENT_TYPES = {
  SAFETY_WORK_PERMIT: "안전작업허가서",
  CONFINED_SPACE: "밀폐공간 작업허가서",
  HOLIDAY_WORK: "휴일작업 신청서",
  POWER_OUTAGE: "정전작업 허가서",
};

export default function DocumentEditPage() {
  const params = useParams();
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    requestDate: "2026-04-03",
    workDate: "2026-04-04",
    workStartTime: "09:00",
    workEndTime: "18:00",
    projectName: "내현지구 정밀안전진단",
    applicantCompany: "한국안전연구원",
    applicantTitle: "안전관리자",
    applicantName: "",
    workLocation: "",
    workContent: "",
    participants: "",
    // 위험공종
    riskHighPlace: false,
    riskWaterWork: false,
    riskConfinedSpace: false,
    riskPowerOutage: false,
    riskFireWork: false,
    riskOther: false,
    // 위험요소
    factorNarrowAccess: false,
    factorSlippery: false,
    factorSteepSlope: false,
    factorWaterHazard: false,
    factorRockfall: false,
    factorNoRailing: false,
    factorSuffocation: false,
    factorElectrocution: false,
    factorFire: false,
    riskSummary: "",
    improvementPlan: "",
    disasterType: "",
    specialNotes: "",
  });

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date();
    setLastSaved(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} 저장됨`);
    setSaving(false);
  };

  return (
    <div className="pb-24">
      {/* 상단 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/tasks/${params.taskId}`} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="text-xs text-gray-500">내현지구 정밀안전진단</span>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">안전작업허가서</h2>
          {lastSaved && (
            <span className="text-xs text-gray-400">{lastSaved}</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* 섹션1: 기본정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>1</span>
            기본정보
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">요청일 <span className="text-red-500">*</span></label>
                <input type="date" value={form.requestDate}
                  onChange={(e) => handleChange("requestDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업예정일 <span className="text-red-500">*</span></label>
                <input type="date" value={form.workDate}
                  onChange={(e) => handleChange("workDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업 시작 시각 <span className="text-red-500">*</span></label>
                <input type="time" value={form.workStartTime}
                  onChange={(e) => handleChange("workStartTime", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업 종료 시각 <span className="text-red-500">*</span></label>
                <input type="time" value={form.workEndTime}
                  onChange={(e) => handleChange("workEndTime", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">용역명</label>
              <input type="text" value={form.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">업체명</label>
                <input type="text" value={form.applicantCompany}
                  onChange={(e) => handleChange("applicantCompany", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">신청자 성명 <span className="text-red-500">*</span></label>
                <input type="text" value={form.applicantName}
                  onChange={(e) => handleChange("applicantName", e.target.value)}
                  placeholder="성명 입력"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
          </div>
        </div>

        {/* 섹션2: 작업정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>2</span>
            작업정보
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">작업장소 <span className="text-red-500">*</span></label>
              <input type="text" value={form.workLocation}
                onChange={(e) => handleChange("workLocation", e.target.value)}
                placeholder="작업 장소를 입력하세요"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">작업내용 <span className="text-red-500">*</span></label>
              <textarea value={form.workContent}
                onChange={(e) => handleChange("workContent", e.target.value)}
                placeholder="작업 내용을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">작업자 명단</label>
              <textarea value={form.participants}
                onChange={(e) => handleChange("participants", e.target.value)}
                placeholder="작업자 이름을 입력하세요 (쉼표로 구분)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            </div>
          </div>
        </div>

        {/* 섹션3: 위험공종 확인 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>3</span>
            위험공종 확인
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "riskHighPlace", label: "2.0m 이상 고소작업" },
              { key: "riskWaterWork", label: "수상/수변작업" },
              { key: "riskConfinedSpace", label: "밀폐공간작업" },
              { key: "riskPowerOutage", label: "정전작업" },
              { key: "riskFireWork", label: "화기작업" },
              { key: "riskOther", label: "기타" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-blue-50">
                <input type="checkbox"
                  checked={(form as any)[item.key]}
                  onChange={(e) => handleChange(item.key, e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"/>
                <span className="text-xs text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 섹션4: 위험요소 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>4</span>
            위험요소
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { key: "factorNarrowAccess", label: "진출입로 협소" },
              { key: "factorSlippery", label: "미끄러짐" },
              { key: "factorSteepSlope", label: "급경사" },
              { key: "factorWaterHazard", label: "파랑·유수·수심" },
              { key: "factorRockfall", label: "낙석·토사붕괴" },
              { key: "factorNoRailing", label: "난간 미설치" },
              { key: "factorSuffocation", label: "질식·화재·폭발" },
              { key: "factorElectrocution", label: "감전·전기화재" },
              { key: "factorFire", label: "스파크·화염" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-amber-50">
                <input type="checkbox"
                  checked={(form as any)[item.key]}
                  onChange={(e) => handleChange(item.key, e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600"/>
                <span className="text-xs text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">위험요소 개선대책</label>
              <textarea value={form.riskSummary}
                onChange={(e) => handleChange("riskSummary", e.target.value)}
                placeholder="위험요소 개선대책을 입력하세요"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">재해형태</label>
              <input type="text" value={form.disasterType}
                onChange={(e) => handleChange("disasterType", e.target.value)}
                placeholder="예: 추락, 낙하"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>

        {/* 섹션5: 특이사항 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>5</span>
            특이사항
          </h3>
          <textarea value={form.specialNotes}
            onChange={(e) => handleChange("specialNotes", e.target.value)}
            placeholder="특이사항을 입력하세요"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
        </div>

      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-60">
          {saving ? "저장 중..." : "임시저장"}
        </button>
        <button
          className="flex-2 px-8 py-3 rounded-xl text-white text-sm font-medium"
          style={{ background: "#2563eb" }}>
          제출하기
        </button>
      </div>
    </div>
  );
}