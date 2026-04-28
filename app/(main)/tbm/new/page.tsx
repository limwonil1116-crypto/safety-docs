"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

declare global { interface Window { kakao: any; daum: any; } }

const PROJECT_TYPES = ["생산기반사업","지역개발사업","유지관리사업","조사사업","스마트팜사업","지하수지질","기타사업"];
const RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·가설공사","철골 구조물 공사","2.0m이상 외부 도장공사","승강기 설치공사","취수탑 공사","복통, 잠관 공사","이외의 작업계획서작성 대상","해당없음"];

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

  const [form, setForm] = useState({
    reportDate: new Date().toISOString().split("T")[0],
    eduStartTime: "09:00", eduEndTime: "09:10",
    projectName: "", projectType: "유지관리사업",
    contractorName: "", facilityName: "",
    workToday: "", workAddress: "",
    workLatitude: "", workLongitude: "",
    workerCount: 0, newWorkerCount: 0, equipment: "",
    riskType: "해당없음", cctvUsed: false,
    riskFactor1: "", riskMeasure1: "",
    riskFactor2: "", riskMeasure2: "",
    riskFactor3: "", riskMeasure3: "",
    mainRiskFactor: "", mainRiskMeasure: "",
    riskElement1: "", riskElement2: "", riskElement3: "",
    otherContent: "", instructorName: "", instructorPhone: "",
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // 카카오맵 스크립트 로드
  const loadKakaoMap = () => {
    const initMap = () => {
      if (!mapRef.current) return;
      window.kakao.maps.load(() => {
        setMapLoaded(true);
        const center = new window.kakao.maps.LatLng(36.5, 127.5);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 13 });
        mapObjRef.current = map;
        const marker = new window.kakao.maps.Marker({ position: center, map });
        markerRef.current = marker;

        // 주소 검색 서비스
        const geocoder = new window.kakao.maps.services.Geocoder();

        window.kakao.maps.event.addListener(map, "click", (e: any) => {
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          marker.setPosition(e.latLng);
          set("workLatitude", String(lat));
          set("workLongitude", String(lng));
          geocoder.coord2Address(lng, lat, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address?.address_name || result[0].address.address_name;
              set("workAddress", addr);
            }
          });
        });
      });
    };

    if (window.kakao?.maps?.services) { setMapLoaded(true); initMap(); return; }
    if (window.kakao?.maps) { initMap(); return; }
    const existing = document.getElementById("kakao-map-script");
    if (existing) { const check = setInterval(() => { if (window.kakao?.maps) { clearInterval(check); initMap(); } }, 200); return; }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.onload = initMap;
    document.head.appendChild(script);
  };

  const handleOpenMap = () => {
    setShowMap(true);
    setTimeout(loadKakaoMap, 100);
  };

  // 주소 검색
  const handleAddressSearch = () => {
    if (!mapObjRef.current) return;
    const keyword = prompt("주소를 입력하세요:");
    if (!keyword) return;
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const lat = parseFloat(data[0].y);
        const lng = parseFloat(data[0].x);
        const pos = new window.kakao.maps.LatLng(lat, lng);
        mapObjRef.current.setCenter(pos);
        mapObjRef.current.setLevel(4);
        markerRef.current.setPosition(pos);
        set("workLatitude", String(lat));
        set("workLongitude", String(lng));
        set("workAddress", data[0].road_address_name || data[0].address_name);
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  // AI 위험요인 생성
  const handleAiGenerate = async () => {
    if (!form.workToday && !form.workAddress) {
      alert("작업내용 또는 작업주소를 먼저 입력해주세요.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/tbm-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workToday: form.workToday,
          workAddress: form.workAddress,
          facilityName: form.facilityName,
          riskType: form.riskType,
          reportDate: form.reportDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const r = data.result;
      setForm(p => ({
        ...p,
        riskFactor1: r.riskFactor1 || p.riskFactor1,
        riskMeasure1: r.riskMeasure1 || p.riskMeasure1,
        riskFactor2: r.riskFactor2 || p.riskFactor2,
        riskMeasure2: r.riskMeasure2 || p.riskMeasure2,
        riskFactor3: r.riskFactor3 || p.riskFactor3,
        riskMeasure3: r.riskMeasure3 || p.riskMeasure3,
        mainRiskFactor: r.mainRiskFactor || p.mainRiskFactor,
        mainRiskMeasure: r.mainRiskMeasure || p.mainRiskMeasure,
        riskElement1: r.riskElement1 || p.riskElement1,
        riskElement2: r.riskElement2 || p.riskElement2,
        riskElement3: r.riskElement3 || p.riskElement3,
      }));
    } catch (e: any) { alert(e.message || "AI 생성 오류"); }
    finally { setAiLoading(false); }
  };

  // 서명 캔버스
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
          <div className="grid grid-cols-3 gap-3">
            <Field label="교육 일자" required>
              <input type="date" value={form.reportDate} onChange={e => set("reportDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="시작시간">
              <input type="time" value={form.eduStartTime} onChange={e => set("eduStartTime", e.target.value)} className={inputCls} />
            </Field>
            <Field label="종료시간">
              <input type="time" value={form.eduEndTime} onChange={e => set("eduEndTime", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="사업명">
            <input value={form.projectName} onChange={e => set("projectName", e.target.value)} className={inputCls} placeholder="사업명" />
          </Field>
          <Field label="사업종류">
            <select value={form.projectType} onChange={e => set("projectType", e.target.value)} className={inputCls}>
              {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="시공사명" required>
            <input value={form.contractorName} onChange={e => set("contractorName", e.target.value)} className={inputCls} placeholder="시공사명" />
          </Field>
          <Field label="시설물명">
            <input value={form.facilityName} onChange={e => set("facilityName", e.target.value)} className={inputCls} placeholder="시설물명 (예: 예당저수지 복통)" />
          </Field>
        </Section>

        <Section title="🏗️ 작업정보">
          <Field label="금일작업">
            <textarea value={form.workToday} onChange={e => set("workToday", e.target.value)} className={inputCls} rows={3} placeholder="금일 작업내용" />
          </Field>
          <Field label="실제 작업주소">
            <div className="space-y-2">
              <input value={form.workAddress} onChange={e => set("workAddress", e.target.value)} className={inputCls} placeholder="주소를 직접 입력하거나 지도에서 선택" />
              <button onClick={handleOpenMap}
                className="w-full py-2.5 rounded-xl border-2 border-blue-200 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                🗺️ 지도에서 위치 선택
              </button>
              {form.workLatitude && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  ✅ 위치 선택됨: {form.workAddress}
                </p>
              )}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="투입인원(명)">
              <input type="number" min="0" value={form.workerCount} onChange={e => set("workerCount", parseInt(e.target.value)||0)} className={inputCls} />
            </Field>
            <Field label="신규근로자(명)">
              <input type="number" min="0" value={form.newWorkerCount} onChange={e => set("newWorkerCount", parseInt(e.target.value)||0)} className={inputCls} />
            </Field>
          </div>
          <Field label="투입장비">
            <input value={form.equipment} onChange={e => set("equipment", e.target.value)} className={inputCls} placeholder="투입장비 목록" />
          </Field>
          <Field label="위험공종">
            <select value={form.riskType} onChange={e => set("riskType", e.target.value)} className={inputCls}>
              {RISK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="CCTV 사용여부">
            <div className="flex gap-3">
              {["사용중","사용안함"].map(v => (
                <button key={v} type="button" onClick={() => set("cctvUsed", v === "사용중")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${(form.cctvUsed ? "사용중" : "사용안함") === v ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="⚠️ 위험요인 및 대책">
          <button onClick={handleAiGenerate} disabled={aiLoading}
            className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: aiLoading ? "#6b7280" : "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            {aiLoading ? (
              <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>AI 분석 중...</>
            ) : (
              <>✨ AI 위험요인·대책 자동 생성</>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">작업내용, 주소, 시설물, 위험공종을 입력 후 클릭하세요</p>

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
            <Field label="성함" required>
              <input value={form.instructorName} onChange={e => set("instructorName", e.target.value)} className={inputCls} placeholder="교육담당자 이름" />
            </Field>
            <Field label="연락처">
              <input value={form.instructorPhone} onChange={e => {
                const v = e.target.value.replace(/\D/g,"");
                const f = v.length<=3?v:v.length<=7?v.slice(0,3)+"-"+v.slice(3):v.slice(0,3)+"-"+v.slice(3,7)+"-"+v.slice(7,11);
                set("instructorPhone", f);
              }} className={inputCls} placeholder="010-0000-0000" maxLength={13} />
            </Field>
          </div>
          <Field label="서명">
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative" style={{ touchAction: "none" }}>
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

      {/* 지도 모달 */}
      {showMap && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="bg-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">위치 선택</h2>
            <button onClick={() => setShowMap(false)} className="text-gray-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="bg-white px-4 py-2 flex gap-2 border-b border-gray-100">
            <button onClick={handleAddressSearch}
              className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium">
              🔍 주소 검색
            </button>
            <button onClick={() => setShowMap(false)}
              className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 text-sm font-medium">
              ✅ 선택 완료
            </button>
          </div>
          {form.workAddress && (
            <div className="bg-white px-4 py-2 text-xs text-gray-600 border-b border-gray-100">
              📍 {form.workAddress}
            </div>
          )}
          <div ref={mapRef} className="flex-1" style={{ minHeight: "400px" }}>
            {!mapLoaded && (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-400">지도 로딩 중...</p>
              </div>
            )}
          </div>
          <p className="bg-white text-center text-xs text-gray-400 py-2">지도를 클릭하면 위치가 선택됩니다</p>
        </div>
      )}

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

export default function TbmNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>}>
      <TbmNewInner />
    </Suspense>
  );
}
