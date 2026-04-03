"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const mockTask = {
  id: "1",
  name: "내현지구 정밀안전진단",
  company: "한국안전연구원",
  period: "2026.01.01 ~ 2026.12.31",
};

const mockDocuments = [
  {
    id: "1",
    type: "SAFETY_WORK_PERMIT",
    typeLabel: "안전작업허가서",
    typeShort: "붙임1",
    status: "IN_REVIEW",
    statusLabel: "검토중",
    writer: "홍길동",
    submittedAt: "2026.04.03",
    currentApprover: "김담당",
  },
  {
    id: "2",
    type: "SAFETY_WORK_PERMIT",
    typeLabel: "안전작업허가서",
    typeShort: "붙임1",
    status: "APPROVED",
    statusLabel: "검토완료",
    writer: "홍길동",
    submittedAt: "2026.03.28",
    currentApprover: null,
  },
  {
    id: "3",
    type: "CONFINED_SPACE",
    typeLabel: "밀폐공간 작업허가서",
    typeShort: "붙임2",
    status: "REJECTED",
    statusLabel: "반려",
    writer: "홍길동",
    submittedAt: "2026.04.01",
    currentApprover: null,
  },
  {
    id: "4",
    type: "HOLIDAY_WORK",
    typeLabel: "휴일작업 신청서",
    typeShort: "붙임3",
    status: "DRAFT",
    statusLabel: "작성중",
    writer: "홍길동",
    submittedAt: null,
    currentApprover: null,
  },
];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  DRAFT:     { bg: "bg-gray-100",   text: "text-gray-600" },
  SUBMITTED: { bg: "bg-blue-100",   text: "text-blue-600" },
  IN_REVIEW: { bg: "bg-amber-100",  text: "text-amber-600" },
  APPROVED:  { bg: "bg-green-100",  text: "text-green-600" },
  REJECTED:  { bg: "bg-red-100",    text: "text-red-600" },
};

const TABS = [
  { key: "ALL", label: "전체" },
  { key: "SAFETY_WORK_PERMIT", label: "붙임1" },
  { key: "CONFINED_SPACE", label: "붙임2" },
  { key: "HOLIDAY_WORK", label: "붙임3" },
  { key: "POWER_OUTAGE", label: "붙임4" },
];

export default function TaskDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("ALL");

  const filtered = activeTab === "ALL"
    ? mockDocuments
    : mockDocuments.filter((d) => d.type === activeTab);

  return (
    <div>
      {/* 과업 정보 헤더 */}
      <div className="px-4 pt-4 pb-3" style={{ background: "#1e3a5f" }}>
        <Link href="/tasks" className="flex items-center gap-1 text-blue-300 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          과업 목록
        </Link>
        <h2 className="text-white font-bold text-base">{mockTask.name}</h2>
        <p className="text-blue-200 text-xs mt-0.5">{mockTask.company}</p>
        <p className="text-blue-300 text-xs mt-0.5">{mockTask.period}</p>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab.key === "ALL"
            ? mockDocuments.length
            : mockDocuments.filter((d) => d.type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500"
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 문서 목록 */}
      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">해당 서류가 없습니다</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                    {doc.typeShort}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{doc.typeLabel}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[doc.status].bg} ${STATUS_STYLE[doc.status].text}`}>
                  {doc.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>작성자: {doc.writer}</span>
                {doc.submittedAt && <span>제출일: {doc.submittedAt}</span>}
                {doc.currentApprover && <span>검토자: {doc.currentApprover}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                {doc.status === "DRAFT" || doc.status === "REJECTED" ? (
                  <Link href={`/tasks/${params.taskId}/documents/${doc.id}/edit`}
                    className="flex-1 text-center py-2 rounded-xl text-sm font-medium text-white"
                    style={{ background: "#2563eb" }}>
                    {doc.status === "REJECTED" ? "수정하기" : "이어서 작성"}
                  </Link>
                ) : (
                  <Link href={`/tasks/${params.taskId}/documents/${doc.id}/detail`}
                    className="flex-1 text-center py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                    상세 보기
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 새 서류 작성 버튼 */}
      <button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: "#2563eb" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}