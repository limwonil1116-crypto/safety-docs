"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

declare global { interface Window { kakao: any; daum: any; } }

const RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·흙막이공사","밀폐공간 작업(질식·폭발)","2.0m이상 비계·동바리설치작업","전동·기계톱 벌목작업","수중공사 작업","용접, 용단 작업","잠함·케이슨작업·잠수작업","해당없음"];

interface TaskItem { id: string; name: string; category: string; division: string; }
interface PhotoItem { url: string; caption: string; }

function LocationPickerModal({ initialAddress, initialLat, initialLng, onConfirm, onClose }: {
  initialAddress: string; initialLat: number | null; initialLng: number | null;
  onConfirm: (address: string, lat: number, lng: number) => void; onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [gpsLoading, setGpsLoading] = useState(false);
  const setAddressRef = useRef(setAddress);
  const setLatRef = useRef(setLat);
  const setLngRef = useRef(setLng);
  useEffect(() => { setAddressRef.current = setAddress; setLatRef.current = setLat; setLngRef.current = setLng; });

  useEffect(() => {
    const initMap = () => { window.kakao.maps.load(() => setMapLoaded(true)); };
    if (window.kakao?.maps?.services) { setMapLoaded(true); return; }
    if (window.kakao?.maps) { initMap(); return; }
    const existing = document.getElementById("kakao-map-script");
    if (existing) { const check = setInterval(() => { if (window.kakao?.maps?.services) { setMapLoaded(true); clearInterval(check); } else if (window.kakao?.maps) { initMap(); clearInterval(check); } }, 200); return; }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.onload = initMap; document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.kakao?.maps) return;
    const defaultLat = lat ?? 36.5, defaultLng = lng ?? 127.5;
    const center = new window.kakao.maps.LatLng(defaultLat, defaultLng);
    const map = new window.kakao.maps.Map(mapRef.current, { center, level: lat ? 5 : 13 });
    mapInstanceRef.current = map;
    const marker = new window.kakao.maps.Marker({ position: center, map });
    markerRef.current = marker;
    if (!initialLat && !initialLng && navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition((pos) => {
        const gLat = pos.coords.latitude; const gLng = pos.coords.longitude;
        setLat(gLat); setLng(gLng);
        const ll = new window.kakao.maps.LatLng(gLat, gLng);
        map.setCenter(ll); map.setLevel(3); marker.setPosition(ll);
        if (window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(gLng, gLat, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
              setAddressRef.current(addr);
            }
          });
        }
        setGpsLoading(false);
      }, (err) => { setGpsLoading(false); }, { timeout: 8000, enableHighAccuracy: true });
    }
    window.kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
      const latlng = mouseEvent.latLng; marker.setPosition(latlng);
      const newLat = latlng.getLat(); const newLng = latlng.getLng();
      setLatRef.current(newLat); setLngRef.current(newLng);
      if (!window.kakao.maps.services) { return; }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(newLng, newLat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
          setAddressRef.current(addr);
        }
      });
    });
  }, [mapLoaded]);

  const handleAddressSearch = () => {
    const load = () => { new window.daum.Postcode({ oncomplete: (data: any) => {
      const addr = data.roadAddress || data.jibunAddress; setAddress(addr);
      const gc = new window.kakao.maps.services.Geocoder();
      gc.addressSearch(addr, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const nLat = parseFloat(result[0].y); const nLng = parseFloat(result[0].x);
          setLat(nLat); setLng(nLng);
          const ll = new window.kakao.maps.LatLng(nLat, nLng);
          mapInstanceRef.current?.setCenter(ll); markerRef.current?.setPosition(ll);
        }
      });
    }}).open(); };
    if (window.daum?.Postcode) load();
    else { const s = document.createElement("script"); s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"; s.onload = load; document.head.appendChild(s); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">작업 위치 지정</h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="p-5 pb-28 space-y-4">
          <div className="flex gap-2">
            <input type="text" value={address} readOnly className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700" />
            <button onClick={handleAddressSearch} className="px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ background: "#2563eb" }}>주소 검색</button>
          </div>
          {gpsLoading && (
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-600 flex items-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              현재 위치를 가져오는 중..
            </div>
          )}
          <div className="rounded-2xl overflow-hidden border border-gray-200">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">지도를 클릭하면 위치 지정 · 핀을 드래그로 이동 가능</div>
            <div ref={mapRef} style={{ width: "100%", height: "280px" }}>
              {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-sm text-gray-400">지도 로딩 중..</p></div>}
            </div>
          </div>
          <button onClick={() => { if (lat && lng) onConfirm(address, lat, lng); }} disabled={!lat || !lng}
            className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-40" style={{ background: "#2563eb" }}>
            이 위치로 설정
          </button>
        </div>
      </div>
    </div>
  );
}

function TbmNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const editId = searchParams.get("editId");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [customProjectName, setCustomProjectName] = useState(false);
  const [taskCategory, setTaskCategory] = useState<"" | "용역" | "자체진단">("");
  const [taskBand, setTaskBand] = useState("");
  const [workAddressDisplay, setWorkAddressDisplay] = useState("");
  const [hasLocation, setHasLocation] = useState(false);
  const [cctvUsed, setCctvUsed] = useState(false);
  const [aiKey, setAiKey] = useState(0);
  const [aiResult, setAiResult] = useState<Record<string,string>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formKey, setFormKey] = useState(0);

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
    taskType: "", band: "",
  });
  const setF = (k: string, v: any) => { (formRef.current as any)[k] = v; };

  // photoUrl 파싱 (단일 URL 또는 JSON 배열 모두 처리)
  const parsePhotoUrl = (photoUrl: string): PhotoItem[] => {
    if (!photoUrl) return [];
    try {
      const parsed = JSON.parse(photoUrl);
      if (Array.isArray(parsed)) return parsed;
      return [{ url: photoUrl, caption: "" }];
    } catch {
      return [{ url: photoUrl, caption: "" }];
    }
  };

  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => {
      const parsed = (d.tasks ?? []).map((t: any) => {
        try {
          const meta = JSON.parse(t.description || "{}");
          return { ...t, category: meta.category || "CONTRACTOR", division: meta.division || "" };
        } catch { return { ...t, category: "CONTRACTOR", division: "" }; }
      });
      setTasks(parsed);
    }).catch(() => {});
    if (editId) {
      fetch(`/api/tbm/${editId}`).then(r => r.json()).then(d => {
        const r = d.tbmReport; if (!r) return;
        Object.keys(formRef.current).forEach(k => {
          if (r[k] !== undefined && r[k] !== null) setF(k, String(r[k]));
        });
        setWorkAddressDisplay(r.workAddress || "");
        setHasLocation(!!r.workLatitude);
        setCctvUsed(r.cctvUsed || false);
        if (r.photoUrl) setPhotos(parsePhotoUrl(r.photoUrl));
        if (r.taskType) setTaskCategory(r.taskType as "" | "용역" | "자체진단");
        if (r.band) setTaskBand(r.band);
        setFormKey(k => k + 1);
      }).catch(() => {});
    }
  }, [editId]);

  const handleAiGenerate = async () => {
    const f = formRef.current;
    if (!f.workToday && !f.workAddress && !f.facilityName) { alert("작업내용, 장소, 시설명 중 하나 이상 입력해주세요."); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/tbm-risk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workToday: f.workToday, workAddress: f.workAddress, facilityName: f.facilityName, riskType: f.riskType, reportDate: f.reportDate }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 오류");
      const r = data.result;
      Object.keys(r).forEach(k => setF(k, r[k]));
      setAiResult(r); setAiKey(k => k + 1);
    } catch (e: any) { alert(e.message || "AI 생성 오류"); }
    finally { setAiLoading(false); }
  };

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  }, []);
  const getPos = (e: any, c: HTMLCanvasElement) => { const r = c.getBoundingClientRect(); if (e.touches) return { x:(e.touches[0].clientX-r.left)*(c.width/r.width), y:(e.touches[0].clientY-r.top)*(c.height/r.height) }; return { x:(e.clientX-r.left)*(c.width/r.width), y:(e.clientY-r.top)*(c.height/r.height) }; };
  const startDraw = (e: any) => { e.preventDefault(); isDrawing.current=true; const c=canvasRef.current!; const ctx=c.getContext("2d")!; const p=getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const draw = (e: any) => { if(!isDrawing.current)return; e.preventDefault(); const c=canvasRef.current!; const ctx=c.getContext("2d")!; const p=getPos(e,c); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const endDraw = () => { isDrawing.current=false; };
  const clearCanvas = () => { const c=canvasRef.current!; const ctx=c.getContext("2d")!; ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); };

  const handlePhotoUpload = async (files: FileList) => {
    setPhotoUploading(true);
    try {
      const newPhotos: PhotoItem[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `업로드 실패`); }
        const data = await res.json();
        if (data.url) newPhotos.push({ url: data.url, caption: "" });
      }
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err: any) { alert("사진 업로드 실패: " + (err.message || "알 수 없는 오류")); }
    finally { setPhotoUploading(false); if (photoInputRef.current) photoInputRef.current.value = ""; }
  };

  const updateCaption = (idx: number, caption: string) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p));
  };
  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const [tempSaving, setTempSaving] = useState(false);
  const [tempSavedAt, setTempSavedAt] = useState("");

  const handleTempSave = async () => {
    const f = formRef.current;
    if (!f.contractorName && !f.projectName) { alert("수급사명 또는 사업명을 입력해주세요."); return; }
    setTempSaving(true);
    try {
      const photoUrl = photos.length > 0 ? JSON.stringify(photos) : "";
      const finalTaskType = f.taskType || taskCategory || "";
      const url = editId ? `/api/tbm/${editId}` : "/api/tbm";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, taskType: finalTaskType, cctvUsed, taskId, signatureData: "", photoUrl, workerCount: parseInt(f.workerCount)||0, newWorkerCount: parseInt(f.newWorkerCount)||0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!editId && data.tbmReport?.id) {
        // 새 보고서인 경우 URL을 editId로 업데이트
        window.history.replaceState(null, "", `/tbm/new?editId=${data.tbmReport.id}`);
      }
      const now = new Date();
      setTempSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`);
    } catch (e: any) { alert("임시저장 실패: " + (e.message || "오류")); }
    finally { setTempSaving(false); }
  };

  const handleSubmit = async () => {
    const f = formRef.current;
    if (!f.contractorName) { alert("수급사명을 입력해주세요."); return; }
    if (!f.instructorName) { alert("성명을 입력해주세요."); return; }
    setLoading(true);
    try {
      const signatureData = canvasRef.current?.toDataURL("image/png")||"";
      const url = editId ? `/api/tbm/${editId}` : "/api/tbm";
      const method = editId ? "PATCH" : "POST";
      const finalTaskType = f.taskType || taskCategory || "";
      // 사진을 JSON 배열로 저장
      const photoUrl = photos.length > 0 ? JSON.stringify(photos) : "";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, taskType: finalTaskType, cctvUsed, taskId, signatureData, photoUrl, workerCount: parseInt(f.workerCount)||0, newWorkerCount: parseInt(f.newWorkerCount)||0 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(editId ? "TBM 보고서가 수정되었습니다." : "TBM 보고서가 제출되었습니다.");
      router.push("/tbm");
    } catch (e: any) { alert(e.message||"오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const bandOptions = taskCategory === "용역" ? ["전체","1반","2반","3반","4반","5반"] : taskCategory === "자체진단" ? ["전체","1반","2반","3반","4반","5반","6반","7반","8반","9반","10반"] : [];
  const filteredTasks = tasks.filter((t: TaskItem) => {
    if (taskCategory === "용역" && t.category !== "CONTRACTOR") return false;
    if (taskCategory === "자체진단" && t.category !== "SELF") return false;
    if (taskBand && taskBand !== "전체" && t.division !== taskBand) return false;
    return true;
  });
  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-base font-bold text-gray-900">{editId ? "TBM 보고서 수정" : "TBM 보고서 작성"}</h1>
      </div>

      <div key={formKey} className="p-4 space-y-4 pb-32">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">기본정보</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">보고일자 <span className="text-red-500">*</span></label><input type="date" defaultValue={formRef.current.reportDate} onChange={e => setF("reportDate", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">시작</label><input type="time" defaultValue={formRef.current.eduStartTime} onChange={e => setF("eduStartTime", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">종료</label><input type="time" defaultValue={formRef.current.eduEndTime} onChange={e => setF("eduEndTime", e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">용역명 / 자체진단명</label>
              <div className="space-y-2">
                <div className="flex gap-2">{(["", "용역", "자체진단"] as const).map(cat => (<button key={cat} type="button" onClick={() => { setTaskCategory(cat); setTaskBand(""); setF("taskType", cat); setF("band", ""); }} className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 ${taskCategory===cat?"border-blue-500 bg-blue-50 text-blue-600":"border-gray-200 text-gray-500"}`}>{cat||"전체"}</button>))}</div>
                {taskCategory && <div className="flex gap-1.5 flex-wrap">{bandOptions.map(b => (<button key={b} type="button" onClick={() => { setTaskBand(b); setF("band", b); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${taskBand===b?"border-blue-500 bg-blue-50 text-blue-600":"border-gray-200 text-gray-500"}`}>{b}</button>))}</div>}
                {!customProjectName ? (
                  <div className="space-y-1.5">
                    <select defaultValue={formRef.current.projectName} onChange={e => {
                      const name = e.target.value; setF("projectName", name);
                      const selected = (tasks as TaskItem[]).find((t: TaskItem) => t.name === name);
                      if (selected) { const cat = (selected as any).category === "SELF" ? "자체진단" : "용역"; setTaskCategory(cat as "" | "용역" | "자체진단"); setF("taskType", cat); }
                    }} className={inputCls}>
                      <option value="">-- 선택해주세요 --</option>
                      {filteredTasks.map((t: TaskItem) => <option key={t.id} value={t.name}>{(t as any).category === "SELF" ? "[자체진단] " : "[용역] "}{t.name}</option>)}
                    </select>
                    <button onClick={() => setCustomProjectName(true)} className="text-xs text-blue-500 underline">직접 입력</button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input defaultValue={formRef.current.projectName} onChange={e => setF("projectName", e.target.value)} className={inputCls} placeholder="용역명 또는 자체진단명 입력" />
                    <button onClick={() => setCustomProjectName(false)} className="text-xs text-blue-500 underline">목록에서 선택</button>
                  </div>
                )}
              </div>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">수급사명 <span className="text-red-500">*</span></label><input defaultValue={formRef.current.contractorName} onChange={e => setF("contractorName", e.target.value)} className={inputCls} placeholder="수급사명" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">시설명</label><input defaultValue={formRef.current.facilityName} onChange={e => setF("facilityName", e.target.value)} className={inputCls} placeholder="예: 예당저수지" /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">작업정보</h3>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">당일작업</label><textarea defaultValue={formRef.current.workToday} onChange={e => setF("workToday", e.target.value)} className={inputCls} rows={3} placeholder="당일 작업내용" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">실제 작업장소</label>
              <div className="space-y-2">
                <input defaultValue={formRef.current.workAddress} onChange={e => { setF("workAddress", e.target.value); setWorkAddressDisplay(e.target.value); }} className={inputCls} placeholder="장소 직접 입력" />
                <button onClick={() => setShowLocationPicker(true)} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium ${hasLocation?"border-blue-400 bg-blue-50 text-blue-600":"border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{hasLocation ? workAddressDisplay||"위치 선택됨" : "지도에서 위치 선택 (GPS 자동설정)"}</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">작업인원(명)</label><input type="number" min="0" defaultValue={formRef.current.workerCount} onChange={e => setF("workerCount", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">신규입장자 명</label><input type="number" min="0" defaultValue={formRef.current.newWorkerCount} onChange={e => setF("newWorkerCount", e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">작업기계</label><input defaultValue={formRef.current.equipment} onChange={e => setF("equipment", e.target.value)} className={inputCls} placeholder="작업기계 목록" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">위험종별</label>
              <select defaultValue={formRef.current.riskType} onChange={e => setF("riskType", e.target.value)} className={inputCls}>
                {RISK_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">CCTV 사용여부</label><div className="flex gap-3">{["사용함","사용안함"].map(v => (<button key={v} type="button" onClick={() => { setCctvUsed(v==="사용함"); setF("cctvUsed", v==="사용함"); }} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 ${(cctvUsed?"사용함":"사용안함")===v?"border-blue-500 bg-blue-50 text-blue-600":"border-gray-200 text-gray-500"}`}>{v}</button>))}</div></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">위험요인 및 조치</h3>
          <div className="space-y-3">
            <button onClick={handleAiGenerate} disabled={aiLoading} className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: aiLoading?"#6b7280":"linear-gradient(135deg,#7c3aed,#2563eb)" }}>{aiLoading ? <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>AI 분석 중...</> : <>AI 위험요인·조치 자동 생성</>}</button>
            {([1,2,3] as const).map(n => (
              <div key={n} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">위험요인 {n}</p>
                <input key={`rf${n}-${aiKey}`} defaultValue={aiResult[`riskFactor${n}`]||(formRef.current as any)[`riskFactor${n}`]||""} onChange={e => setF(`riskFactor${n}`, e.target.value)} className={inputCls} placeholder={`위험요인 ${n}`} />
                <input key={`rm${n}-${aiKey}`} defaultValue={aiResult[`riskMeasure${n}`]||(formRef.current as any)[`riskMeasure${n}`]||""} onChange={e => setF(`riskMeasure${n}`, e.target.value)} className={inputCls} placeholder={`조치 ${n}`} />
              </div>
            ))}
            <div className="bg-amber-50 rounded-xl p-3 space-y-2 border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">중점위험요인</p>
              <input key={`mrf-${aiKey}`} defaultValue={aiResult.mainRiskFactor||formRef.current.mainRiskFactor||""} onChange={e => setF("mainRiskFactor", e.target.value)} className={inputCls} placeholder="중점위험요인" />
              <input key={`mrm-${aiKey}`} defaultValue={aiResult.mainRiskMeasure||formRef.current.mainRiskMeasure||""} onChange={e => setF("mainRiskMeasure", e.target.value)} className={inputCls} placeholder="중점위험요인 조치" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">위험요소</p>
              {([1,2,3] as const).map(n => (
                <input key={`re${n}-${aiKey}`} defaultValue={aiResult[`riskElement${n}`]||(formRef.current as any)[`riskElement${n}`]||""} onChange={e => setF(`riskElement${n}`, e.target.value)} className={inputCls} placeholder={`위험요소 ${n}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">기타사항</h3>
          <textarea defaultValue={formRef.current.otherContent} onChange={e => setF("otherContent", e.target.value)} className={inputCls} rows={4} placeholder="위험성평가 내용 외 기타" />
        </div>

        {/* 멀티 사진 업로드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">TBM 현장사진</h3>
            <span className="text-xs text-gray-400">{photos.length}장</span>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={async (e) => { if (e.target.files) await handlePhotoUpload(e.target.files); }}
          />
          {/* 등록된 사진 목록 */}
          {photos.length > 0 && (
            <div className="space-y-3 mb-3">
              {photos.map((photo, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="relative">
                    <img src={photo.url} alt={`사진 ${idx+1}`} className="w-full object-cover max-h-48" />
                    <button onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs">✕</button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{idx + 1}/{photos.length}</div>
                  </div>
                  <div className="px-3 py-2 bg-gray-50">
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={e => updateCaption(idx, e.target.value)}
                      placeholder="사진 설명 입력 (예: 현장 전경, 작업 전 점검 등)"
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* 사진 추가 버튼 */}
          <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
            className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center gap-1.5 text-gray-400 hover:border-blue-400 hover:text-blue-500 disabled:opacity-50">
            {photoUploading ? (
              <><svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span className="text-sm">업로드 중..</span></>
            ) : (
              <><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span className="text-sm">{photos.length > 0 ? "사진 추가" : "사진 등록"}</span>
              <span className="text-xs">여러 장 동시 선택 가능</span></>
            )}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">교육담당자</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">성명 <span className="text-red-500">*</span></label><input defaultValue={formRef.current.instructorName} onChange={e => setF("instructorName", e.target.value)} className={inputCls} placeholder="교육담당자 이름" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">연락처</label><input defaultValue={formRef.current.instructorPhone} onChange={e => { const v=e.target.value.replace(/\D/g,""); const f=v.length<=3?v:v.length<=7?v.slice(0,3)+"-"+v.slice(3):v.slice(0,3)+"-"+v.slice(3,7)+"-"+v.slice(7,11); setF("instructorPhone",f); }} className={inputCls} placeholder="010-0000-0000" maxLength={13} /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">서명</label>
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative" style={{ touchAction:"none" }}>
                <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">여기에 서명해주세요</div>
                <canvas ref={canvasRef} width={600} height={160} className="w-full" style={{ cursor:"crosshair", touchAction:"none", display:"block" }} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
              <button onClick={clearCanvas} className="mt-2 w-full py-2 rounded-xl border border-gray-200 text-xs text-gray-500">서명 지우기</button>
            </div>
          </div>
        </div>
      </div>

      {showLocationPicker && (
        <LocationPickerModal
          initialAddress={formRef.current.workAddress}
          initialLat={formRef.current.workLatitude ? parseFloat(formRef.current.workLatitude) : null}
          initialLng={formRef.current.workLongitude ? parseFloat(formRef.current.workLongitude) : null}
          onConfirm={(addr, lat, lng) => { setF("workAddress", addr); setF("workLatitude", String(lat)); setF("workLongitude", String(lng)); setWorkAddressDisplay(addr); setHasLocation(true); setShowLocationPicker(false); }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200 space-y-2">
        <button onClick={handleTempSave} disabled={tempSaving}
          className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
          {tempSaving ? (
            <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>저장 중..</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>임시저장{tempSavedAt ? ` (${tempSavedAt})` : ""}</>
          )}
        </button>
        <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background:"#2563eb" }}>{loading ? "제출 중.." : editId ? "수정 완료" : "TBM 보고서 제출"}</button>
      </div>
    </div>
  );
}

export default function TbmNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">로딩 중..</div>}>
      <TbmNewInner />
    </Suspense>
  );
}
