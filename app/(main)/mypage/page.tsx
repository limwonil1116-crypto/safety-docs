"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface UserInfo {
  id: string; name: string; email: string;
  organization?: string; role: string; employeeNo?: string; phone?: string;
}
interface MyDocStat {
  total: number; draft: number; inProgress: number; approved: number; rejected: number;
}
interface PendingDoc {
  id: string; documentType: string; taskName: string;
  currentApprovalOrder: number; createdByName: string;
}

const ROLE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  CONTRACTOR:    { label: "수급업체",   color: "#2563eb", bg: "#eff6ff" },
  REVIEWER:      { label: "검토자",     color: "#d97706", bg: "#fffbeb" },
  FINAL_APPROVER:{ label: "최종허가자", color: "#16a34a", bg: "#f0fdf4" },
  ADMIN:         { label: "관리자",     color: "#7c3aed", bg: "#f5f3ff" },
};

const DOC_LABEL: Record<string, string> = {
  SAFETY_WORK_PERMIT: "안전작업허가서",
  CONFINED_SPACE: "밀폐공간작업허가서",
  HOLIDAY_WORK: "휴일작업신청서",
  POWER_OUTAGE: "정전작업허가서",
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
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSigning, setBulkSigning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkResults, setBulkResults] = useState<{id:string;name:string;ok:boolean}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, docsRes, appRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/documents?mine=true"),
        fetch("/api/approvals"),
      ]);
      const meData = await meRes.json();
      if (meRes.ok && meData.user) {
        setUser(meData.user);
        setForm({ name: meData.user.name ?? "", organization: meData.user.organization ?? "", phone: meData.user.phone ?? "" });
      }
      if (docsRes.ok) {
        const d = await docsRes.json();
        const docs = d.documents ?? [];
        setStats({
          total: docs.length,
          draft: docs.filter((x: any) => x.status === "DRAFT").length,
          inProgress: docs.filter((x: any) => ["SUBMITTED","IN_REVIEW"].includes(x.status)).length,
          approved: docs.filter((x: any) => x.status === "APPROVED").length,
          rejected: docs.filter((x: any) => x.status === "REJECTED").length,
        });
      }
      if (appRes.ok) {
        const appData = await appRes.json();
        const myTurn = (appData.documents ?? []).filter((x: any) => x.is_my_turn);
        setPendingDocs(myTurn.map((x: any) => ({
          id: x.id,
          documentType: x.document_type,
          taskName: x.task_name || "미입력",
          currentApprovalOrder: x.current_approval_order,
          createdByName: x.created_by_name || "",
        })));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!showBulkModal) return;
    setTimeout(() => {
      const c = canvasRef.current; if (!c) return;
      const ctx = c.getContext("2d"); if (!ctx) return;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    }, 100);
  }, [showBulkModal]);

  const getPos = (e: any, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    if (e.touches) return { x:(e.touches[0].clientX-r.left)*(c.width/r.width), y:(e.touches[0].clientY-r.top)*(c.height/r.height) };
    return { x:(e.clientX-r.left)*(c.width/r.width), y:(e.clientY-r.top)*(c.height/r.height) };
  };
  const startDraw = (e: any) => { e.preventDefault(); isDrawing.current=true; const c=canvasRef.current!; const ctx=c.getContext("2d")!; const p=getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const draw = (e: any) => { if(!isDrawing.current)return; e.preventDefault(); const c=canvasRef.current!; const ctx=c.getContext("2d")!; const p=getPos(e,c); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const endDraw = () => { isDrawing.current=false; };
  const clearCanvas = () => { const c=canvasRef.current!; const ctx=c.getContext("2d")!; ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); };
  const isCanvasEmpty = () => {
    const c = canvasRef.current; if (!c) return true;
    const ctx = c.getContext("2d")!;
    const data = ctx.getImageData(0,0,c.width,c.height).data;
    for (let i=0;i<data.length;i+=4) { if (data[i]<250||data[i+1]<250||data[i+2]<250) return false; }
    return true;
  };

  const handleBulkApprove = async () => {
    if (isCanvasEmpty()) { alert("서명을 입력해주세요."); return; }
    const signatureData = canvasRef.current!.toDataURL("image/png");
    setBulkSigning(true);
    const results: {id:string;name:string;ok:boolean}[] = [];
    for (const doc of pendingDocs) {
      try {
        const res = await fetch(`/api/documents/${doc.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE", signatureData, comment: "" }),
        });
        results.push({ id: doc.id, name: doc.taskName, ok: res.ok });
      } catch {
        results.push({ id: doc.id, name: doc.taskName, ok: false });
      }
    }
    setBulkResults(results);
    setBulkSigning(false);
    setBulkDone(true);
    fetchData();
  };

  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setUser(prev => prev ? { ...prev, ...form } : prev);
      setEditMode(false); setSaveMsg("저장됐습니다.");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) { setSaveMsg(e instanceof Error ? e.message : "저장에 실패했습니다."); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    await signOut({ callbackUrl: "/login" });
  };

  const roleInfo = user ? (ROLE_LABEL[user.role] ?? { label: user.role, color: "#6b7280", bg: "#f9fafb" }) : null;

  if (loading) return (
    <div className="p-4 space-y-4">
      {[1,2,3].map(i => (<div key={i} className="bg-white rounded-2xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3 mb-3" /><div className="h-10 bg-gray-100 rounded w-full" /></div>))}
    </div>
  );

  return (
    <div className="p-4 pb-28 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-lg font-bold text-gray-900">마이페이지</h1><p className="text-xs text-gray-400 mt-0.5">내 정보 및 활동 현황</p></div>
        {saveMsg && <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${saveMsg.includes("실패")||saveMsg.includes("오류")?"bg-red-100 text-red-600":"bg-green-100 text-green-600"}`}>{saveMsg}</span>}
      </div>

      {/* 일괄결재 바너 */}
      {pendingDocs.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-bold text-sm">내 결재 차례</p>
              <p className="text-blue-200 text-xs mt-0.5">{pendingDocs.length}건의 결재가 대기 중입니다</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{pendingDocs.length}</span>
            </div>
          </div>
          <div className="space-y-1.5 mb-3">
            {pendingDocs.slice(0,3).map(doc => (
              <div key={doc.id} className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span className="text-white text-xs flex-1 truncate">{doc.taskName}</span>
                <span className="text-blue-200 text-[10px]">{DOC_LABEL[doc.documentType]||doc.documentType}</span>
              </div>
            ))}
            {pendingDocs.length > 3 && <p className="text-blue-200 text-xs text-center">+{pendingDocs.length-3}건 더</p>}
          </div>
          <button onClick={() => { setShowBulkModal(true); setBulkDone(false); setBulkResults([]); }}
            className="w-full py-3 bg-white rounded-xl text-blue-600 font-bold text-sm shadow-sm flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            서명 후 일괄 결재
          </button>
        </div>
      )}

      {/* 프로필 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-16" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }} />
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-white" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a5f)" }}>
              {user?.name?.[0] ?? "?"}
            </div>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                편집
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditMode(false); setForm({ name: user?.name??"", organization: user?.organization??"", phone: user?.phone??"" }); }} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500">취소</button>
                <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: "#2563eb" }}>{saving?"저장 중...":"저장"}</button>
              </div>
            )}
          </div>
          {roleInfo && <span className="text-xs px-2.5 py-1 rounded-full font-semibold mb-2 inline-block" style={{ color: roleInfo.color, background: roleInfo.bg }}>{roleInfo.label}</span>}
          <div className="space-y-3 mt-2">
            {editMode ? (
              <>
                <div><label className="text-xs text-gray-500 mb-1 block">이름</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">소속</label><input value={form.organization} onChange={e=>setForm(p=>({...p,organization:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">연락처</label><input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="010-0000-0000" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </>
            ) : (
              <>
                <InfoRow label="이름" value={user?.name} />
                <InfoRow label="소속" value={user?.organization} />
                <InfoRow label="이메일" value={user?.email} />
                <InfoRow label="연락처" value={user?.phone} />
                {user?.employeeNo && <InfoRow label="사번" value={user.employeeNo} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 서류 통계 */}
      {stats && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">내 서류 현황</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label:"전체", value:stats.total, color:"#2563eb", bg:"#eff6ff" },
              { label:"진행중", value:stats.inProgress, color:"#d97706", bg:"#fffbeb" },
              { label:"승인", value:stats.approved, color:"#16a34a", bg:"#f0fdf4" },
              { label:"반려", value:stats.rejected, color:"#dc2626", bg:"#fef2f2" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ background: item.bg }}>
                <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 빠른 이동 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-gray-900 px-4 pt-4 pb-2">빠른 이동</h3>
        {[
          { label:"용역 목록", sub:"내 용역 및 서류 관리", path:"/tasks" },
          { label:"결재 현황", sub:"결재 대기 및 완료 서류", path:"/approvals" },
          { label:"작성중 허가서", sub:"임시저장 중인 허가서 목록", path:"/approvals?status=DRAFT" },
          { label:"전체 현황", sub:"지도 및 캘린더 보기", path:"/overview" },
        ].map((item, i, arr) => (
          <button key={item.path} onClick={() => router.push(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors ${i<arr.length-1?"border-b border-gray-50":""}`}>
            <div className="flex-1 text-left"><div className="text-sm font-medium text-gray-900">{item.label}</div><div className="text-xs text-gray-400">{item.sub}</div></div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">앱 정보</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between"><span>앱 이름</span><span className="text-gray-700 font-medium">스마트 안전관리 시스템</span></div>
          <div className="flex justify-between"><span>운영</span><span className="text-gray-700 font-medium">한국농어었공사 안전기술본부</span></div>
          <div className="flex justify-between"><span>버전</span><span className="text-gray-700 font-medium">1.0.0</span></div>
        </div>
      </div>

      <button onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-medium text-sm hover:bg-red-50 flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        로그아웃
      </button>

      {/* 일괄결재 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900">일괄 결재 서명</p>
                <p className="text-xs text-gray-400 mt-0.5">{pendingDocs.length}건 서류에 서명 후 일괄 승인</p>
              </div>
              {!bulkSigning && !bulkDone && (
                <button onClick={() => setShowBulkModal(false)} className="text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            {!bulkDone ? (
              <div className="p-5">
                <div className="mb-4 space-y-1.5 max-h-36 overflow-y-auto">
                  {pendingDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-xs text-gray-700 flex-1 truncate">{doc.taskName}</span>
                      <span className="text-[10px] text-blue-500">{DOC_LABEL[doc.documentType]||doc.documentType}</span>
                    </div>
                  ))}
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-700">서명 (아래에 서명하세요)</p>
                    <button onClick={clearCanvas} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-2 py-1">지우기</button>
                  </div>
                  <canvas ref={canvasRef} width={500} height={140}
                    className="w-full border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30 touch-none cursor-crosshair"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                </div>
                <button onClick={handleBulkApprove} disabled={bulkSigning}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: bulkSigning?"#6b7280":"linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
                  {bulkSigning
                    ? <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>결재 중...</>
                    : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>{pendingDocs.length}건 일괄 승인</>
                  }
                </button>
              </div>
            ) : (
              <div className="p-5">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="font-bold text-gray-900">일괄 결재 완료!</p>
                  <p className="text-xs text-gray-400 mt-1">{bulkResults.filter(r=>r.ok).length}/{bulkResults.length}건 성공</p>
                </div>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {bulkResults.map(r => (
                    <div key={r.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${r.ok?"bg-green-50":"bg-red-50"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={r.ok?"#16a34a":"#dc2626"} strokeWidth="2">
                        {r.ok?<polyline points="20 6 9 17 4 12"/>:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                      </svg>
                      <span className="text-xs text-gray-700 flex-1 truncate">{r.name}</span>
                      <span className={`text-[10px] font-medium ${r.ok?"text-green-600":"text-red-500"}`}>{r.ok?"승인":"실패"}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowBulkModal(false); setBulkDone(false); }}
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm">닫기</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium flex-1">{value}</span>
    </div>
  );
}
