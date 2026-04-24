"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TaskCounts { inProgress: number; completed: number; rejected: number; }
interface Task {
  id: string; name: string; contractorCompanyName?: string;
  status: string; counts: TaskCounts; lastDate: string;
  category?: string; division?: string;
}

const CONTRACTOR_DIVISIONS = ["전체", "1반", "2반", "3반", "4반", "5반"];
const SELF_DIVISIONS = ["전체", "1반", "2반", "3반", "4반", "5반", "6반", "7반", "8반", "9반", "10반"];

function CreateTaskModal({ category, onClose, onCreated }: { category: string; onClose: () => void; onCreated: () => void }) {
  const isSelf = category === "SELF";
  const divisions = isSelf ? SELF_DIVISIONS.slice(1) : CONTRACTOR_DIVISIONS.slice(1);
  const [form, setForm] = useState({ name: "", contractorCompanyName: "", description: "", startDate: "", endDate: "", division: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError(isSelf ? "지구명을 입력해주세요." : "용역명을 입력해주세요."); return; }
    setLoading(true); setError("");
    try {
      const meta = JSON.stringify({ category, division: form.division });
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, description: meta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onCreated(); onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">{isSelf ? "지구 등록" : "용역 신규 등록"}</h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">{isSelf ? "지구명" : "용역명"} *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder={isSelf ? "예) 예당저수지" : "예) 예당저수지 복통 안전진단"}
              className={inputClass} />
          </div>
          {!isSelf && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">수급업체명</label>
              <input value={form.contractorCompanyName} onChange={e => setForm({...form, contractorCompanyName: e.target.value})}
                placeholder="예) (주)한국안전엔지니어링" className={inputClass} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">{isSelf ? "조사반" : "관리반"}</label>
            <select value={form.division} onChange={e => setForm({...form, division: e.target.value})}
              className={inputClass}>
              <option value="">선택 안함</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">시작일</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                className={inputClass} style={{ colorScheme: "light" }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">종료일</label>
              <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
                className={inputClass} style={{ colorScheme: "light" }} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-5 py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background: isSelf ? "#16a34a" : "#2563eb" }}>
          {loading ? "등록 중..." : isSelf ? "지구 등록" : "용역 등록"}
        </button>
      </div>
    </div>
  );
}

function EditTaskModal({ task, category, onClose, onUpdated }: { task: Task; category: string; onClose: () => void; onUpdated: () => void }) {
  const isSelf = category === "SELF";
  const divisions = isSelf ? SELF_DIVISIONS.slice(1) : CONTRACTOR_DIVISIONS.slice(1);
  const [form, setForm] = useState({ name: task.name, contractorCompanyName: task.contractorCompanyName ?? "", division: task.division ?? "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("이름을 입력해주세요."); return; }
    setLoading(true); setError("");
    try {
      const meta = JSON.stringify({ category, division: form.division });
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, contractorCompanyName: form.contractorCompanyName, description: meta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onUpdated(); onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">수정</h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">{isSelf ? "지구명" : "용역명"} *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} />
          </div>
          {!isSelf && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">수급업체명</label>
              <input value={form.contractorCompanyName} onChange={e => setForm({...form, contractorCompanyName: e.target.value})} className={inputClass} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">{isSelf ? "조사반" : "관리반"}</label>
            <select value={form.division} onChange={e => setForm({...form, division: e.target.value})} className={inputClass}>
              <option value="">선택 안함</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">취소</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
            style={{ background: "#2563eb" }}>
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TasksPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get("category") || "CONTRACTOR";
  const isSelf = category === "SELF";
  const divisions = isSelf ? SELF_DIVISIONS : CONTRACTOR_DIVISIONS;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("전체");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = search ? `?keyword=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/tasks${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "데이터 오류");
      // category/division 파싱
      const parsed = (data.tasks as Task[]).map(t => {
        try {
          const meta = JSON.parse(t.contractorCompanyName?.startsWith("{") ? t.contractorCompanyName : (t as any).description || "{}");
          return { ...t, category: meta.category || "CONTRACTOR", division: meta.division || "" };
        } catch { return { ...t, category: "CONTRACTOR", division: "" }; }
      }).filter(t => t.category === category);
      setTasks(parsed);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 300);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // division 필터 변경 시 전체로 리셋
  useEffect(() => { setDivisionFilter("전체"); }, [category]);

  const handleDeleteTask = async (task: Task) => {
    setMenuOpenId(null);
    if (!confirm(`"${task.name}"을(를) 삭제하시겠습니까?

모든 서류도 함께 삭제됩니다.`)) return;
    setDeletingId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      fetchTasks();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "삭제에 실패했습니다."); }
    finally { setDeletingId(null); }
  };

  const filtered = divisionFilter === "전체" ? tasks : tasks.filter(t => t.division === divisionFilter);
  const totalInProgress = filtered.reduce((a, t) => a + t.counts.inProgress, 0);
  const totalCompleted = filtered.reduce((a, t) => a + t.counts.completed, 0);
  const totalRejected = filtered.reduce((a, t) => a + t.counts.rejected, 0);
  const accentColor = isSelf ? "#16a34a" : "#2563eb";

  return (
    <div className="p-4 pb-24">
      {menuOpenId && <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />}

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/")} className="text-gray-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{isSelf ? "자체진단" : "도급사업 (용역)"}</h1>
          <p className="text-sm text-gray-500">{isSelf ? "지구별 자체 안전진단" : "수급업체 용역 현황"}</p>
        </div>
      </div>

      {/* KPI */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "전체",   value: filtered.length, color: accentColor },
            { label: "진행중", value: totalInProgress,  color: "#d97706" },
            { label: "완료",   value: totalCompleted,   color: "#16a34a" },
            { label: "반려",   value: totalRejected,    color: "#dc2626" },
          ].map(item => (
            <div key={item.label}>
              <div className="text-xl font-bold" style={{ color: item.color }}>{loading ? "-" : item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 반 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
        {divisions.map(d => (
          <button key={d} onClick={() => setDivisionFilter(d)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${divisionFilter === d ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={divisionFilter === d ? { background: accentColor } : {}}>
            {d}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isSelf ? "지구명 검색" : "용역명 또는 업체명 검색"}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2"/><div className="h-3 bg-gray-100 rounded w-1/2"/></div>)}</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{search ? "검색 결과가 없습니다." : isSelf ? "등록된 지구가 없습니다." : "등록된 용역이 없습니다."}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-stretch">
                <Link href={`/tasks/${task.id}`} className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {task.division && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white shrink-0"
                            style={{ background: accentColor }}>{task.division}</span>
                        )}
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{task.name}</h3>
                      </div>
                      {!isSelf && task.contractorCompanyName && (
                        <p className="text-xs text-gray-500">{task.contractorCompanyName}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{task.lastDate}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/><span className="text-gray-600">진행중 {task.counts.inProgress}건</span></span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/><span className="text-gray-600">완료 {task.counts.completed}건</span></span>
                    {task.counts.rejected > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/><span className="text-gray-600">반려 {task.counts.rejected}건</span></span>}
                  </div>
                </Link>
                <div className="relative flex items-start pt-3 pr-3">
                  <button onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                  </button>
                  {menuOpenId === task.id && (
                    <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-28 z-30">
                      <button onClick={() => { setMenuOpenId(null); setEditingTask(task); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        수정
                      </button>
                      <div className="border-t border-gray-100"/>
                      <button onClick={() => { setMenuOpenId(null); handleDeleteTask(task); }} disabled={deletingId === task.id}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        {deletingId === task.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: accentColor }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showCreate && <CreateTaskModal category={category} onClose={() => setShowCreate(false)} onCreated={fetchTasks} />}
      {editingTask && <EditTaskModal task={editingTask} category={category} onClose={() => setEditingTask(null)} onUpdated={fetchTasks} />}
    </div>
  );
}

import { Suspense } from "react";
export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400 text-sm">로딩 중...</div>}>
      <TasksPageInner />
    </Suspense>
  );
}
