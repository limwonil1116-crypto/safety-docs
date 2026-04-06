"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface TaskCounts {
  inProgress: number;
  completed: number;
  rejected: number;
}

interface Task {
  id: string;
  name: string;
  contractorCompanyName?: string;
  status: string;
  counts: TaskCounts;
  lastDate: string;
}

function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    contractorCompanyName: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("과업명을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">새 과업 생성</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">과업명 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예) 내현지구 정밀안전진단"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">업체명</label>
            <input
              value={form.contractorCompanyName}
              onChange={(e) => setForm({ ...form, contractorCompanyName: e.target.value })}
              placeholder="예) 한국안전연구원"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">종료일</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="과업에 대한 간단한 설명"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background: "#2563eb" }}
        >
          {loading ? "생성 중..." : "과업 생성"}
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = search ? `?keyword=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/tasks${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "불러오기 실패");
      setTasks(data.tasks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 300);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const totalInProgress = tasks.reduce((a, t) => a + t.counts.inProgress, 0);
  const totalCompleted = tasks.reduce((a, t) => a + t.counts.completed, 0);
  const totalRejected = tasks.reduce((a, t) => a + t.counts.rejected, 0);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">과업 목록</h1>
        <p className="text-sm text-gray-500">전체 프로젝트 현황</p>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "전체", value: tasks.length, color: "#2563eb" },
            { label: "진행중", value: totalInProgress, color: "#d97706" },
            { label: "완료", value: totalCompleted, color: "#16a34a" },
            { label: "반려", value: totalRejected, color: "#dc2626" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xl font-bold" style={{ color: item.color }}>
                {loading ? "-" : item.value}
              </div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="과업명 또는 업체명 검색"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search ? "검색 결과가 없습니다." : "등록된 과업이 없습니다."}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{task.name}</h3>
                    {task.contractorCompanyName && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.contractorCompanyName}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{task.lastDate}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span className="text-gray-600">진행중 {task.counts.inProgress}건</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    <span className="text-gray-600">완료 {task.counts.completed}건</span>
                  </span>
                  {task.counts.rejected > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      <span className="text-gray-600">반려 {task.counts.rejected}건</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: "#2563eb" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchTasks}
        />
      )}
    </div>
  );
}