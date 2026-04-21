"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  organization?: string;
  role: string;
  employeeNo?: string;
  phone?: string;
}

interface MyDocStat {
  total: number;
  draft: number;
  inProgress: number;
  approved: number;
  rejected: number;
}

const ROLE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  CONTRACTOR:    { label: "수급업체",   color: "#2563eb", bg: "#eff6ff" },
  REVIEWER:      { label: "검토자",     color: "#d97706", bg: "#fffbeb" },
  FINAL_APPROVER:{ label: "최종허가자", color: "#16a34a", bg: "#f0fdf4" },
  ADMIN:         { label: "관리자",     color: "#7c3aed", bg: "#f5f3ff" },
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<MyDocStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", organization: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, docsRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/documents?mine=true"),
      ]);
      const meData = await meRes.json();
      if (meRes.ok && meData.user) {
        setUser(meData.user);
        setForm({
          name: meData.user.name ?? "",
          organization: meData.user.organization ?? "",
          phone: meData.user.phone ?? "",
        });
      }
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        const docs = docsData.documents ?? [];
        setStats({
          total: docs.length,
          draft: docs.filter((d: any) => d.status === "DRAFT").length,
          inProgress: docs.filter((d: any) => ["SUBMITTED","IN_REVIEW"].includes(d.status)).length,
          approved: docs.filter((d: any) => d.status === "APPROVED").length,
          rejected: docs.filter((d: any) => d.status === "REJECTED").length,
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setUser(prev => prev ? { ...prev, ...form } : prev);
      setEditMode(false);
      setSaveMsg("저장됐습니다.");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally { setSaving(false); }
  };

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    await signOut({ callbackUrl: "/login" });
  };

  const roleInfo = user ? (ROLE_LABEL[user.role] ?? { label: user.role, color: "#6b7280", bg: "#f9fafb" }) : null;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-10 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">마이페이지</h1>
          <p className="text-xs text-gray-400 mt-0.5">내 정보 및 활동 현황</p>
        </div>
        {saveMsg && (
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${saveMsg.includes("실패") || saveMsg.includes("오류") ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* 상단 배너 */}
        <div className="h-16" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }} />
        <div className="px-4 pb-4">
          {/* 아바타 */}
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a5f)" }}>
              {user?.name?.[0] ?? "?"}
            </div>
            {!editMode ? (
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                편집
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditMode(false); setForm({ name: user?.name ?? "", organization: user?.organization ?? "", phone: user?.phone ?? "" }); }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500">취소</button>
                <button onClick={handleSave} disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: "#2563eb" }}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            )}
          </div>

          {/* 역할 배지 */}
          {roleInfo && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold mb-2 inline-block"
              style={{ color: roleInfo.color, background: roleInfo.bg }}>
              {roleInfo.label}
            </span>
          )}

          {/* 정보 필드 */}
          <div className="space-y-3 mt-2">
            {editMode ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">이름</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">소속</label>
                  <input value={form.organization} onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">연락처</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            ) : (
              <>
                <InfoRow icon="👤" label="이름" value={user?.name} />
                <InfoRow icon="🏢" label="소속" value={user?.organization} />
                <InfoRow icon="✉️" label="이메일" value={user?.email} />
                <InfoRow icon="📱" label="연락처" value={user?.phone} />
                {user?.employeeNo && <InfoRow icon="🪪" label="사번" value={user.employeeNo} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 서류 활동 통계 */}
      {stats && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">📋</span>
            내 서류 현황
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "전체",   value: stats.total,      color: "#2563eb", bg: "#eff6ff" },
              { label: "진행중", value: stats.inProgress,  color: "#d97706", bg: "#fffbeb" },
              { label: "승인",   value: stats.approved,    color: "#16a34a", bg: "#f0fdf4" },
              { label: "반려",   value: stats.rejected,    color: "#dc2626", bg: "#fef2f2" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ background: item.bg }}>
                <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          {stats.draft > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500">작성중인 서류</span>
              <span className="text-xs font-bold text-gray-700">{stats.draft}건</span>
              <button onClick={() => router.push("/tasks")} className="ml-auto text-xs text-blue-500 font-medium">바로가기 →</button>
            </div>
          )}
        </div>
      )}

      {/* 빠른 이동 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-gray-900 px-4 pt-4 pb-2">빠른 이동</h3>
        {[
          { icon: "📋", label: "용역 목록",   sub: "내 용역 및 서류 관리",   path: "/tasks" },
          { icon: "✅", label: "결재 현황",   sub: "결재 대기 및 완료 서류", path: "/approvals" },
          { icon: "📊", label: "전체 현황",   sub: "지도 및 캘린더 보기",    path: "/overview" },
        ].map((item, i, arr) => (
          <button key={item.path} onClick={() => router.push(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
            <span className="text-xl w-8 text-center">{item.icon}</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-400">{item.sub}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>

      {/* 앱 정보 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">앱 정보</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between"><span>앱 이름</span><span className="text-gray-700 font-medium">스마트 안전관리 시스템</span></div>
          <div className="flex justify-between"><span>운영</span><span className="text-gray-700 font-medium">한국농어촌공사 안전기술본부</span></div>
          <div className="flex justify-between"><span>버전</span><span className="text-gray-700 font-medium">1.0.0</span></div>
        </div>
      </div>

      {/* 로그아웃 */}
      <button onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-medium text-sm hover:bg-red-50 active:bg-red-100 transition-colors flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        로그아웃
      </button>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center">{icon}</span>
      <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium flex-1">{value}</span>
    </div>
  );
}
