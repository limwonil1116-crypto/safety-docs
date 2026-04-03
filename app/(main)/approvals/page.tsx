"use client";

import { useState } from "react";
import Link from "next/link";

const mockApprovals = [
  {
    id: "1",
    type: "SAFETY_WORK_PERMIT",
    typeLabel: "안전작업허가서",
    typeShort: "붙임1",
    taskName: "내현지구 정밀안전진단",
    company: "한국안전연구원",
    writer: "홍길동",
    status: "IN_REVIEW",
    statusLabel: "검토중",
    currentApprover: "김담당",
    submittedAt: "2026.04.03",
    isMyTurn: true,
  },
  {
    id: "2",
    type: "CONFINED_SPACE",
    typeLabel: "밀폐공간 작업허가서",
    typeShort: "붙임2",
    taskName: "장은항 어촌뉴딜 정밀점검",
    company: "안전기술연구소",
    writer: "이철수",
    status: "IN_REVIEW",
    statusLabel: "검토중",
    currentApprover: "박검토",
    submittedAt: "2026.04.03",
    isMyTurn: false,
  },
  {
    id: "3",
    type: "HOLIDAY_WORK",
    typeLabel: "휴일작업 신청서",
    typeShort: "붙임3",
    taskName: "대천1지구 정밀안전진단",
    company: "KR안전연구원",
    writer: "박민수",
    status: "APPROVED",
    statusLabel: "검토완료",
    currentApprover: null,
    submittedAt: "2026.04.01",
    isMyTurn: false,
  },
  {
    id: "4",
    type: "SAFETY_WORK_PERMIT",
    typeLabel: "안전작업허가서",
    typeShort: "붙임1",
    taskName: "증산지구 정기안전점검",
    company: "한국안전연구원",
    writer: "홍길동",
    status: "REJECTED",
    statusLabel: "반려",
    currentApprover: null,
    submittedAt: "2026.04.02",
    isMyTurn: false,
  },
  {
    id: "5",
    type: "POWER_OUTAGE",
    typeLabel: "정전작업 허가서",
    typeShort: "붙임4",
    taskName: "내현지구 정밀안전진단",
    company: "한국안전연구원",
    writer: "홍길동",
    status: "SUBMITTED",
    statusLabel: "제출완료",
    currentApprover: "김담당",
    submittedAt: "2026.04.03",
    isMyTurn: true,
  },
];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  SUBMITTED: { bg: "bg-blue-100",  text: "text-blue-600" },
  IN_REVIEW: { bg: "bg-amber-100", text: "text-amber-600" },
  APPROVED:  { bg: "bg-green-100", text: "text-green-600" },
  REJECTED:  { bg: "bg-red-100",   text: "text-red-600" },
};

const TABS = [
  { key: "ALL",                label: "전체" },
  { key: "SAFETY_WORK_PERMIT", label: "붙임1" },
  { key: "CONFINED_SPACE",     label: "붙임2" },
  { key: "HOLIDAY_WORK",       label: "붙임3" },
  { key: "POWER_OUTAGE",       label: "붙임4" },
];

const DATE_FILTERS = ["오늘", "이번 주", "이번 달", "직접 선택"];

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("오늘");
  const [search, setSearch] = useState("");

  const filtered = mockApprovals.filter((doc) => {
    const tabMatch = activeTab === "ALL" || doc.type === activeTab;
    const searchMatch =
      search === "" ||
      doc.taskName.includes(search) ||
      doc.company.includes(search) ||
      doc.writer.includes(search);
    return tabMatch && searchMatch;
  });

  const myTurnCount = mockApprovals.filter((d) => d.isMyTurn).length;

  return (
    <div>
      {/* 상단 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-gray-900">승인 목록</h1>
          {myTurnCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600">
              내 차례 {myTurnCount}건
            </span>
          )}
        </div>

        {/* 날짜 필터 */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {DATE_FILTERS.map((f) => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                dateFilter === f
                  ? "text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              style={dateFilter === f ? { background: "#2563eb" } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab.key === "ALL"
            ? mockApprovals.length
            : mockApprovals.filter((d) => d.type === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500"
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="과업명, 업체명, 작성자 검색"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
      </div>

      {/* 목록 */}
      <div className="px-4 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">해당 문서가 없습니다</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <Link key={doc.id} href={`/approvals/${doc.id}`}>
              <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-shadow hover:shadow-md ${
                doc.isMyTurn ? "border-blue-200" : "border-gray-100"
              }`}>
                {/* 내 차례 배너 */}
                {doc.isMyTurn && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse inline-block"/>
                    내 차례입니다
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                      {doc.typeShort}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{doc.taskName}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[doc.status].bg} ${STATUS_STYLE[doc.status].text}`}>
                    {doc.statusLabel}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-2">{doc.typeLabel}</p>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{doc.company}</span>
                  <span>·</span>
                  <span>작성자: {doc.writer}</span>
                  <span>·</span>
                  <span>{doc.submittedAt}</span>
                </div>

                {doc.currentApprover && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    현재 검토자: {doc.currentApprover}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}