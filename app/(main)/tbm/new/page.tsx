"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const HEADQUARTERS = ["본사","경기","강원","충북","충남","전북","전남","경북","경남","제주","화안","금강","새만금","영산강","새만금산업단지","토지개발","기타"];
const PROJECT_TYPES = ["생산기반사업","지역개발사업","유지관리사업","조사사업","스마트팜사업","지하수지질","기타사업"];
const RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·가설공사","철골 구조물 공사","2.0m이상 외부 도장공사","승강기 설치공사","취수탑 공사","복통, 잠관 공사","이외의 작업계획서작성 대상","해당없음"];

export default function TbmNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().split("T")[0],
    eduStartTime: "09:00", eduEndTime: "09:10",
    headquarters: "충남", branch: "", projectName: "", projectType: "유지관리사업",
    contractorName: "", workToday: "", workAddress: "",
    workerCount: 0, newWorkerCount: 0, equipment: "",
    riskType: "해당없음", cctvUsed: false,
    riskFactor1: "", riskMeasure1: "",
    riskFactor2: "", riskMeasure2: "",
    riskFactor3: "", riskMeasure3: "",
    mainRiskFactor: "", mainRiskMeasure: "",
    riskElement1: "", riskElement2: "", riskElement3: "",
    otherContent: "", instructorName: "", instructorPhone: "",
    signatureData: "", photoUrl: "",
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width), y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) };
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e: any) => { e.preventDefault(); isDrawing.current = true; const c = canvasRef.current!; const ctx = c.getContext("2d")!; const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (e: any) => { if (!isDrawing.current) return; e.preventDefault(); const c = canvasRef.current!; const ctx = c.getContext("2d")!; const p = getPos(e, c); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const endDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => { const c = canvasRef.current!; const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); };

  const handleSubmit = async () => {
    if (!form.contractorName) { alert("시공사명을 입력해주세요."); return; }
    if (!form.instructorName) { alert("성함을 입력해주세요."); return; }
    setLoading(true);
    try {
      const signatureData = canvasRef.current?.toDataURL("image/png") || "";
      const res = await fetch("/api/tbm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, taskId, signatureData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("TBM 보고서가 제출됩니다.");
      router.push("/tbm");
    } catch (e: any) { alert(e.message || "오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const selectCls = inputCls;
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-base font-bold text-gray-900">TBM 보고서 작성</h1>
      </div>

      <div className="p-4 space-y-4 pb-32">
        <Section title="📋 기본정보">
          <div className="grid grid-cols-2 gap-3">
            <Field label="교육 일자" required><input type="date" value={form.reportDate} onChange={e => set("reportDate", e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작"><input type="time" value={form.eduStartTime} onChange={e => set("eduStartTime", e.target.value)} className={inputCls} /></Field>
              <Field label="종료"><input type="time" value={form.eduEndTime} onChange={e => set("eduEndTime", e.target.value)} className={inputCls} /></Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="본부" required>
              <select value={form.headquarters} onChange={e => set("headquarters", e.target.value)} className={selectCls}>
                {HEADQUARTERS.map(h => <option key={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="지사"><input value={form.branch} onChange={e => set("branch", e.target.value)} className={inputCls} placeholder="지사명" /></Field>
          </div>
          <Field label="사업명"><input value={form.projectName} onChange={e => set("projectName", e.target.value)} className={inputCls} placeholder="사업명" /></Field>
          <Field label="사업종류">
            <select value={form.projectType} onChange={e => set("projectType", e.target.value)} className={selectCls}>
              {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="시공사명" required><input value={form.contractorName} onChange={e => set("contractorName", e.target.value)} className={inputCls} placeholder="시공사명" /></Field>
        </Section>

        <Section title="🏗️ 작업정보">
          <Field label="금일작업"><textarea value={form.workToday} onChange={e => set("workToday", e.target.value)} className={inputCls} rows={3} placeholder="금일 작업내용" /></Field>
          <Field label="실제 작업주소"><input value={form.workAddress} onChange={e => set("workAddress", e.target.value)} className={inputCls} placeholder="작업 주소" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="투입인원(명)"><input type="number" min="0" value={form.workerCount} onChange={e => set("workerCount", parseInt(e.target.value)||0)} className={inputCls} /></Field>
            <Field label="신규근로자(명)"><input type="number" min="0" value={form.newWorkerCount} onChange={e => set("newWorkerCount", parseInt(e.target.value)||0)} className={inputCls} /></Field>
          </div>
          <Field label="투입장비"><input value={form.equipment} onChange={e => set("equipment", e.target.value)} className={inputCls} placeholder="투입장비 목록" /></Field>
          <Field label="위험공종">
            <select value={form.riskType} onChange={e => set("riskType", e.target.value)} className={selectCls}>
              {RISK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="CCTV 사용여부">
            <div className="flex gap-3">
              {["사용중","사용안함"].map(v => (
                <button key={v} type="button" onClick={() => set("cctvUsed", v === "사용중")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 ${(form.cctvUsed ? "사용중" : "사용안함") === v ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="⚠️ 위험요인 및 대책">
          {[1,2,3].map(n => (
            <div key={n} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">잠재위험요인 {n}</p>
              <input value={(form as any)[`riskFactor${n}`]} onChange={e => set(`riskFactor${n}`, e.target.value)} className={inputCls} placeholder={`위험요인 ${n}`} />
              <input value={(form as any)[`riskMeasure${n}`]} onChange={e => set(`riskMeasure${n}`, e.target.value)} className={inputCls} placeholder={`대책 ${n}`} />
            </div>
          ))}
          <div className="bg-amber-50 rounded-xl p-3 space-y-2 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700">⭐ 중점위험요인</p>
            <input value={form.mainRiskFactor} onChange={e => set("mainRiskFactor", e.target.value)} className={inputCls} placeholder="중점위험요인" />
            <input value={form.mainRiskMeasure} onChange={e => set("mainRiskMeasure", e.target.value)} className={inputCls} placeholder="중점위험요인 대책" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">잠재위험요소</p>
            {[1,2,3].map(n => (
              <input key={n} value={(form as any)[`riskElement${n}`]} onChange={e => set(`riskElement${n}`, e.target.value)} className={inputCls} placeholder={`잠재위험요소 ${n}`} />
            ))}
          </div>
        </Section>

        <Section title="📝 기타사항">
          <Field label="기타사항 (교육내용, 제안제도, 아차사고 등)">
            <textarea value={form.otherContent} onChange={e => set("otherContent", e.target.value)} className={inputCls} rows={4} placeholder="위험성평가 내용 전달 등" />
          </Field>
        </Section>

        <Section title="✍️ 교육담당자">
          <div className="grid grid-cols-2 gap-3">
            <Field label="성함" required><input value={form.instructorName} onChange={e => set("instructorName", e.target.value)} className={inputCls} placeholder="교육담당자 이름" /></Field>
            <Field label="연락처"><input value={form.instructorPhone} onChange={e => { const v = e.target.value.replace(/\D/g,""); const f = v.length<=3?v:v.length<=7?v.slice(0,3)+"-"+v.slice(3):v.slice(0,3)+"-"+v.slice(3,7)+"-"+v.slice(7,11); set("instructorPhone", f); }} className={inputCls} placeholder="010-0000-0000" maxLength={13} /></Field>
          </div>
          <Field label="서명">
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative">
              <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">아래에 서명해주세요</div>
              <canvas ref={canvasRef} width={600} height={160} className="w-full"
                style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            </div>
            <button onClick={clearCanvas} className="mt-2 w-full py-2 rounded-xl border border-gray-200 text-xs text-gray-500">서명 지우기</button>
          </Field>
        </Section>
      </div>

      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200">
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background: "#2563eb" }}>
          {loading ? "제출 중..." : "✅ TBM 보고서 제출"}
        </button>
      </div>
    </div>
  );
}
