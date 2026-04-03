"use client";

import { useState } from "react";
import Link from "next/link";

const mockTasks = [
  {
    id: "1",
    name: "내현지구 정밀안전진단",
    company: "한국안전연구원",
    status: "ACTIVE",
    counts: { inProgress: 3, completed: 12, rejected: 1 },
    lastDate: "2026.04.03",
  },
  {
    id: "2",
    name: "장은항 어촌뉴딜 정밀점검",
    company: "안전기술연구소",
    status: "ACTIVE",
    counts: { inProgress: 1, completed: 8, rejected: 0 },
    lastDate: "2026.04.03",
  },
  {
    id: "3",
    name: "대천1지구 정밀안전진단",
    company: "KR안전연구원",
    status: "ACTIVE",
    counts: { inProgress: 2, completed: 5, rejected: 2 },
    lastDate: "2026.04.02",
  },
  {
    id: "4",
    name: "증산지구 정기안전점검",
    company: "한국안전연구원",
    status: "ACTIVE",
    counts: { inProgress: 0, completed: 15, rejected: 0 },
    lastDate: "2026.04.01",
  },
];

const STATUS_COLORS = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600", label: "작성중" },
  SUBMITTED: { bg: "bg-blue-100", text: "text-blue-600", label: "제출완료" },
  IN_REVIEW: { bg: "bg-amber-100", text: "text-amber-600", label: "검토중" },
  APPROVED: { bg: "bg-green-100", text: "text-green-600", label: "검토완료" },
  REJECTED: { bg: "bg-red-100", text: "text-red-600", label: "반려" },
};

export default function TasksPage() {
  const [search, setSearch] = useState("");

  const filtered = mockTasks.filter(
    (t) =>
      t.name.includes(search) || t.company.includes(search)
  );

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">과업 목록</h1>
        <p className="text-sm text-gray-500">관할 프로젝트 현황</p>
      </div>

      {/* 요약 카드 */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "전체", value: mockTasks.length, color: "#2563eb" },
            { label: "진행중", value: mockTasks.reduce((a, t) => a + t.counts.inProgress, 0), color: "#d97706" },
            { label: "완료", value: mockTasks.reduce((a, t) => a + t.counts.completed, 0), color: "#16a34a" },
            { label: "반려", value: mockTasks.reduce((a, t) => a + t.counts.rejected, 0), color: "#dc2626" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="과업명 또는 업체명 검색"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 과업 목록 */}
      <div className="space-y-3">
        {filtered.map((task) => (
          <Link key={task.id} href={`/tasks/${task.id}`}>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{task.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{task.company}</p>
                </div>
                <span className="text-xs text-gray-400">{task.lastDate}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>
                  <span className="text-gray-600">진행중 {task.counts.inProgress}건</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>
                  <span className="text-gray-600">완료 {task.counts.completed}건</span>
                </span>
                {task.counts.rejected > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>
                    <span className="text-gray-600">반려 {task.counts.rejected}건</span>
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 신규 과업 생성 버튼 */}
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