"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

declare global { interface Window { kakao: any; } }

const RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·가설공사","철골 구조물 공사","2.0m이상 외부 도장공사","승강기 설치공사","취수탑 공사","복통, 잠관 공사","이외의 작업계획서작성 대상","해당없음"];

interface TaskItem { id: string; name: string; }

// 팅김 없는 텍스트 입력 컴포넌트
function TextInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current && ref.current !== document.activeElement) ref.current.value = value; }, [value]);
  return <input ref={ref} defaultValue={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={className} />;
}

function TextArea({ value, onChange, placeholder, className, rows }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (ref.current && ref.current !== document.activeElement) ref.current.value = value; }, [value]);
  return <textarea ref={ref} defaultValue={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={className} rows={rows} />;
}

function TbmNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapObjRef = useRef<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [customProjectName, setCustomProjectName] = useState(false);

  // 리렌더링 최소화를 위해 자주 바뀌는 값만 state로, 나머지는 ref
  const formRef = useRef({
    reportDate: new Date().toISOString().split("T")[0],
    eduStartTime: "09:00", eduEndTime: "09:10",
    projectName: "", contractorName: "", facilityName: "",
    workToday: "", workAddress: "",
    workLatitude: "", workLongitude: "",
    workerCount: "0", newWorkerCount: "0", equipment: "",
    riskType: "해당없음", cctvUsed: false,
    riskFactor1: "", riskMeasure1: "",
    riskFactor2: "", riskMeasure2: "",
    riskFactor3: "", riskMeasure3: "",
    mainRiskFactor: "", mainRiskMeasure: "",
    riskElement1: "", riskElement2: "", riskElement3: "",
    otherContent: "", instructorName: "", instructorPhone: "",
  });

  // AI 생성 후 input 리셋용 key
  const [aiKey, setAiKey] = useState(0);
  // 지도 주소 표시용
  const [workAddressDisplay, setWorkAddressDisplay] = useState("");
  const [hasLocation, setHasLocation] = useState(false);
  // cctvUsed 표시용
  const [cctvUsed, setCctvUsed] = useState(false);
  // AI 결과 표시용 state (input에 반영)
  const [aiResult, setAiResult] = useState<Record<string,string>>({});

  const setF = (k: string, v: any) => { (formRef.current as any)[k] = v; };

  // 과업 목록
  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => setTasks(d.tasks ?? [])).catch(() => {});
  }, []);

  // 카카오맵
  const loadKakaoMap = useCallback(() => {
    const initMap = () => {
      if (!mapRef.current) return;
      window.kakao.maps.load(() => {
        setMapLoaded(true);
        const center = new window.kakao.maps.LatLng(36.5, 127.5);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 7 });
        mapObjRef.current = map;
        const marker = new window.kakao.maps.Marker({ position: center, map });
        markerRef.current = marker;
        const geocoder = new window.kakao.maps.services.Geocoder();
        window.kakao.maps.event.addListener(map, "click", (e: any) => {
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          marker.setPosition(e.latLng);
          setF("workLatitude", String(lat));
          setF("workLongitude", String(lng));
          geocoder.coord2Address(lng, lat, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address?.address_name || result[0].address.address_name;
              setF("workAddress", addr);
              setWorkAddressDisplay(addr);
              setHasLocation(true);
            }
          });
        });
      });
    };
    if (window.kakao?.maps?.services) { initMap(); return; }
    if (window.kakao?.maps) { initMap(); return; }
    const existing = document.getElementById("kakao-map-script");
    if (existing) { const check = setInterval(() => { if (window.kakao?.maps) { clearInterval(check); initMap(); } }, 200); return; }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  const handleOpenMap = () => { setShowMap(true); setTimeout(loadKakaoMap, 100); };

  const handleAddressSearch = () => {
    if (!mapObjRef.current) return;
    const keyword = prompt("주소를 입력하세요:");
    if (!keyword) return;
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const lat = parseFloat(data[0].y), lng = parseFloat(data[0].x);
        const pos = new window.kakao.maps.LatLng(lat, lng);
        mapObjRef.current.setCenter(pos); mapObjRef.current.setLevel(4);
        markerRef.current.setPosition(pos);
        setF("workLatitude", String(lat)); setF("workLongitude", String(lng));
        const addr = data[0].road_address_name || data[0].address_name;
        setF("workAddress", addr);
        setWorkAddressDisplay(addr);
        setHasLocation(true);
      } else { alert("검색 결과가 없습니다."); }
    });
  };

  // AI 생성
  const handleAiGenerate = async () => {
    const f = formRef.current;
    if (!f.workToday && !f.workAddress && !f.facilityName) {
      alert("작업내용, 주소, 시설물 중 하나 이상 입력해주세요."); return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/tbm-risk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workToday: f.workToday, workAddress: f.workAddress, facilityName: f.facilityName, riskType: f.riskType, reportDate: f.reportDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 오류");
      const r = data.result;
      // formRef에 저장
      Object.keys(r).forEach(k => setF(k, r[k]));
      setAiResult(r);
      setAiKey(k => k + 1); // input 리렌더링 트리거
    } catch (e: any) { alert(e.message || "AI 생성 오류"); }
    finally { setAiLoading(false); }
  };

  // 서명
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  }, []);
  const getPos = (e: any, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    if (e.touches) return { x:(e.touches[0].clientX-r.left)*(c.width/r.width), y:(e.touches[0].clientY-r.top)*(c.height/r.height) };
    return { x:(e.clientX-r.left)*(c.width/r.width), y:(e.clientY-r.top)*(c.height/r.height) };
  };
  const startDraw = (e: any) => { e.preventDefault(); isDrawing.current=true; const c=canvasRef.current!; const ctx=c.getContext("2d")!; const p=getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const draw = (e: any) => { if(!isDrawing.current)return; e.preventDefault(); const c=canvasRef.current!; const ctx=c.getContext("2d")!; const p=getPos(e,c); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const endDraw = () => { isDrawing.current=false; };
  const clearCanvas = () => { const c=canvasRef.current!; const ctx=c.getContext("2d")!; ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); };

  const handleSubmit = async () => {
    const f = formRef.current;
    if (!f.contractorName) { alert("시공사명을 입력해주세요."); return; }
    if (!f.instructorName) { alert("성함을 입력해주세요."); return; }
    setLoading(true);
    try {
      const signatureData = canvasRef.current?.toDataURL("image/png")||"";
      const res = await fetch("/api/tbm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, cctvUsed, taskId, signatureData, workerCount: parseInt(f.workerCount)||0, newWorkerCount: parseInt(f.newWorkerCount)||0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("TBM 보고서가 제출됩니다.");
      router.push("/tbm");
    } catch (e: any) { alert(e.message||"오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
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
          <div className="grid grid-cols-3 gap-2">
            <Field label="교육 일자" required>
              <input type="date" defaultValue={formRef.current.reportDate} onChange={e => setF("reportDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="시작">
              <input type="time" defaultValue={formRef.current.eduStartTime} onChange={e => setF("eduStartTime", e.target.value)} className={inputCls} />
            </Field>
            <Field label="종료">
              <input type="time" defaultValue={formRef.current.eduEndTime} onChange={e => setF("eduEndTime", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="용역명 / 자체진단명">
            {!customProjectName ? (
              <div className="space-y-2">
                <select defaultValue="" onChange={e => setF("projectName", e.target.value)} className={inputCls}>
                  <option value="">-- 선택해주세요 --</option>
                  {tasks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <button onClick={() => setCustomProjectName(true)} className="text-xs text-blue-500 underline">직접 입력</button>
              </div>
            ) : (
              <div className="space-y-2">
                <input defaultValue={formRef.current.projectName} onChange={e => setF("projectName", e.target.value)} className={inputCls} placeholder="용역명 또는 자체진단명 입력" />
                <button onClick={() => setCustomProjectName(false)} className="text-xs text-blue-500 underline">목록에서 선택</button>
              </div>
            )}
          </Field>
          <Field label="시공사명" required>
            <input defaultValue={formRef.current.contractorName} onChange={e => setF("contractorName", e.target.value)} className={inputCls} placeholder="시공사명" />
          </Field>
          <Field label="시설물명">
            <input defaultValue={formRef.current.facilityName} onChange={e => setF("facilityName", e.target.value)} className={inputCls} placeholder="예: 예당저수지 복통" />
          </Field>
        </Section>

        <Section title="🏗️ 작업정보">
          <Field label="금일작업">
            <textarea defaultValue={formRef.current.workToday} onChange={e => setF("workToday", e.target.value)} className={inputCls} rows={3} placeholder="금일 작업내용" />
          </Field>
          <Field label="실제 작업주소">
            <div className="space-y-2">
              <input defaultValue={formRef.current.workAddress} onChange={e => { setF("workAddress", e.target.value); setWorkAddressDisplay(e.target.value); }} className={inputCls} placeholder="주소 직접 입력 또는 지도 선택" />
              <button onClick={handleOpenMap} className="w-full py-2.5 rounded-xl border-2 border-blue-200 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50">
                🗺️ 지도에서 위치 선택
              </button>
              {hasLocation && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">✅ {workAddressDisplay}</p>}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="투입인원(명)">
              <input type="number" min="0" defaultValue="0" onChange={e => setF("workerCount", e.target.value)} className={inputCls} />
            </Field>
            <Field label="신규근로자(명)">
              <input type="number" min="0" defaultValue="0" onChange={e => setF("newWorkerCount", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="투입장비">
            <input defaultValue={formRef.current.equipment} onChange={e => setF("equipment", e.target.value)} className={inputCls} placeholder="투입장비 목록" />
          </Field>
          <Field label="위험공종">
            <select defaultValue="해당없음" onChange={e => setF("riskType", e.target.value)} className={inputCls}>
              {RISK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="CCTV 사용여부">
            <div className="flex gap-3">
              {["사용중","사용안함"].map(v => (
                <button key={v} type="button" onClick={() => { setCctvUsed(v==="사용중"); setF("cctvUsed", v==="사용중"); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 ${(cctvUsed?"사용중":"사용안함")===v?"border-blue-500 bg-blue-50 text-blue-600":"border-gray-200 text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="⚠️ 위험요인 및 대책">
          <button onClick={handleAiGenerate} disabled={aiLoading}
            className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: aiLoading?"#6b7280":"linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            {aiLoading ? <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>AI 분석 중...</> : <>✨ AI 위험요인·대책 자동 생성</>}
          </button>
          <p className="text-xs text-gray-400 text-center">작업내용, 주소, 시설물, 위험공종 입력 후 클릭</p>

          {([1,2,3] as const).map(n => (
            <div key={n} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">잠재위험요인 {n}</p>
              <input key={`rf${n}-${aiKey}`} defaultValue={aiResult[`riskFactor${n}`]||""} onChange={e => setF(`riskFactor${n}`, e.target.value)} className={inputCls} placeholder={`위험요인 ${n}`} />
              <input key={`rm${n}-${aiKey}`} defaultValue={aiResult[`riskMeasure${n}`]||""} onChange={e => setF(`riskMeasure${n}`, e.target.value)} className={inputCls} placeholder={`대책 ${n}`} />
            </div>
          ))}
          <div className="bg-amber-50 rounded-xl p-3 space-y-2 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700">⭐ 중점위험요인</p>
            <input key={`mrf-${aiKey}`} defaultValue={aiResult.mainRiskFactor||""} onChange={e => setF("mainRiskFactor", e.target.value)} className={inputCls} placeholder="중점위험요인" />
            <input key={`mrm-${aiKey}`} defaultValue={aiResult.mainRiskMeasure||""} onChange={e => setF("mainRiskMeasure", e.target.value)} className={inputCls} placeholder="중점위험요인 대책" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">잠재위험요소</p>
            {([1,2,3] as const).map(n => (
              <input key={`re${n}-${aiKey}`} defaultValue={aiResult[`riskElement${n}`]||""} onChange={e => setF(`riskElement${n}`, e.target.value)} className={inputCls} placeholder={`잠재위험요소 ${n}`} />
            ))}
          </div>
        </Section>

        <Section title="📝 기타사항">
          <Field label="기타사항 (교육내용, 제안제도, 아차사고 등)">
            <textarea defaultValue={formRef.current.otherContent} onChange={e => setF("otherContent", e.target.value)} className={inputCls} rows={4} placeholder="위험성평가 내용 전달 등" />
          </Field>
        </Section>

        <Section title="✍️ 교육담당자">
          <div className="grid grid-cols-2 gap-3">
            <Field label="성함" required>
              <input defaultValue={formRef.current.instructorName} onChange={e => setF("instructorName", e.target.value)} className={inputCls} placeholder="교육담당자 이름" />
            </Field>
            <Field label="연락처">
              <input defaultValue={formRef.current.instructorPhone} onChange={e => {
                const v = e.target.value.replace(/\D/g,"");
                const f = v.length<=3?v:v.length<=7?v.slice(0,3)+"-"+v.slice(3):v.slice(0,3)+"-"+v.slice(3,7)+"-"+v.slice(7,11);
                setF("instructorPhone", f);
              }} className={inputCls} placeholder="010-0000-0000" maxLength={13} />
            </Field>
          </div>
          <Field label="서명">
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative" style={{ touchAction:"none" }}>
              <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">아래에 서명해주세요</div>
              <canvas ref={canvasRef} width={600} height={160} className="w-full"
                style={{ cursor:"crosshair", touchAction:"none", display:"block" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            </div>
            <button onClick={clearCanvas} className="mt-2 w-full py-2 rounded-xl border border-gray-200 text-xs text-gray-500">서명 지우기</button>
          </Field>
        </Section>
      </div>

      {showMap && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="bg-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">위치 선택</h2>
            <button onClick={() => setShowMap(false)} className="text-gray-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="bg-white px-4 py-2 flex gap-2 border-b border-gray-100">
            <button onClick={handleAddressSearch} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium">🔍 주소 검색</button>
            <button onClick={() => setShowMap(false)} className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 text-sm font-medium">✅ 선택 완료</button>
          </div>
          {workAddressDisplay && <div className="bg-white px-4 py-2 text-xs text-gray-600 border-b border-gray-100">📍 {workAddressDisplay}</div>}
          <div ref={mapRef} className="flex-1" style={{ minHeight:"400px" }}>
            {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-sm text-gray-400">지도 로딩 중...</p></div>}
          </div>
          <p className="bg-white text-center text-xs text-gray-400 py-2">지도를 클릭하면 위치가 선택됩니다</p>
        </div>
      )}

      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200">
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background:"#2563eb" }}>
          {loading ? "제출 중..." : "✅ TBM 보고서 제출"}
        </button>
      </div>
    </div>
  );
}

export default function TbmNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>}>
      <TbmNewInner />
    </Suspense>
  );
}
