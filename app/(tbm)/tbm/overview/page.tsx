"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { kakao: any; } }

const normalizeType = (t: string) => {
  if (!t) return "";
  if (t === "CONTRACTOR" || t === "용역") return "용역";
  if (t === "SELF" || t === "자체진단") return "자체진단";
  return t;
};

const HIGH_RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·흙막이공사","밀폐공간 작업(질식·폭발)","2.0m이상 비계·동바리설치작업","전동·기계톱 벌목작업","수중공사 작업","용접, 용단 작업","잠함·케이슨작업·잠수작업"];

const REGIONS = [
  { name: "서울", lat: 37.5665, lng: 126.9780 },{ name: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "대구", lat: 35.8714, lng: 128.6014 },{ name: "인천", lat: 37.4563, lng: 126.7052 },
  { name: "광주", lat: 35.1595, lng: 126.8526 },{ name: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "울산", lat: 35.5384, lng: 129.3114 },{ name: "세종", lat: 36.4800, lng: 127.2890 },
  { name: "경기", lat: 37.4138, lng: 127.5183 },{ name: "강원", lat: 37.8228, lng: 128.1555 },
  { name: "충북", lat: 36.6357, lng: 127.4912 },{ name: "충남", lat: 36.5184, lng: 126.8000 },
  { name: "전북", lat: 35.7175, lng: 127.1530 },{ name: "전남", lat: 34.8679, lng: 126.9910 },
  { name: "경북", lat: 36.4919, lng: 128.8889 },{ name: "경남", lat: 35.4606, lng: 128.2132 },
  { name: "제주", lat: 33.4996, lng: 126.5312 },
];

interface TbmReport {
  id: string; reportDate: string; contractorName: string; workToday: string;
  workerCount: number; newWorkerCount: number; instructorName: string;
  headquarters: string; projectName: string; facilityName: string;
  workAddress: string; workLatitude: string; workLongitude: string;
  equipment: string; riskType: string; cctvUsed: boolean;
  eduStartTime: string; eduEndTime: string; region: string;
  taskType: string; band: string;
  riskFactor1: string; riskMeasure1: string; riskFactor2: string; riskMeasure2: string;
  riskFactor3: string; riskMeasure3: string; mainRiskFactor: string; mainRiskMeasure: string;
  otherContent: string; instructorPhone: string; signatureData: string;
  createdAt: string; photoUrl: string;
}

interface RegionStat {
  name: string; lat: number; lng: number;
  count: number; workerCount: number; newWorkerCount: number;
  cctvCount: number; highRiskCount: number; reports: TbmReport[];
}

// 네비게이션 팝업 컴포넌트
function NaviModal({ address, lat, lng, onClose }: { address: string; lat: string; lng: string; onClose: () => void }) {
  const encoded = encodeURIComponent(address);
  const navers = [
    {
      label: "카카오맵", color: "#FEE500", text: "#000",
      onClick: () => {
        const url = lat && lng
          ? `kakaomap://look?p=${lat},${lng}`
          : `kakaomap://search?q=${encoded}`;
        window.location.href = url;
        setTimeout(() => { window.open(`https://map.kakao.com/link/search/${encoded}`, "_blank"); }, 1000);
      }
    },
    {
      label: "티맵", color: "#1A73E8", text: "#fff",
      onClick: () => {
        const url = lat && lng
          ? `tmap://route?goalname=${encoded}&goaly=${lat}&goalx=${lng}`
          : `tmap://search?name=${encoded}`;
        window.location.href = url;
        setTimeout(() => { window.open(`https://tmap.life/${encoded}`, "_blank"); }, 1000);
      }
    },
    {
      label: "네이버맵", color: "#03C75A", text: "#fff",
      onClick: () => {
        const url = lat && lng
          ? `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encoded}&appname=safety-docs`
          : `nmap://search?query=${encoded}&appname=safety-docs`;
        window.location.href = url;
        setTimeout(() => { window.open(`https://map.naver.com/v5/search/${encoded}`, "_blank"); }, 1000);
      }
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <span className="text-sm font-bold text-gray-900">네비게이션 선택</span>
          </div>
          <button onClick={onClose} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2 mb-4">
          <p className="text-xs text-gray-500 mb-0.5">목적지:</p>
          <p className="text-sm text-gray-800 font-medium">{address}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {navers.map(n => (
            <button key={n.label} onClick={n.onClick}
              className="py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1"
              style={{ backgroundColor: n.color, color: n.text }}>
              <span className="text-lg font-black">{n.label[0]}</span>
              <span className="text-xs">{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TbmOverviewPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const markerRefs = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [reports, setReports] = useState<TbmReport[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionStat | null>(null);
  const [selectedReport, setSelectedReport] = useState<TbmReport | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<"" | "용역" | "자체진단">("");
  const [highRiskFilter, setHighRiskFilter] = useState(false);
  const [naviTarget, setNaviTarget] = useState<{ address: string; lat: string; lng: string } | null>(null);

  useEffect(() => { loadTbm(); }, [date]);

  const loadTbm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tbm?date=${date}`);
      const data = await res.json();
      setReports(data.tbmReports ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  const filteredReports = reports.filter(r => {
    if (taskFilter) { const t = r.taskType || ""; if (t !== taskFilter) return false; }
    if (highRiskFilter && !HIGH_RISK_TYPES.includes(r.riskType)) return false;
    return true;
  });

  const getRegionReports = (regionName: string) =>
    filteredReports.filter(t => t.workAddress?.includes(regionName) || t.headquarters?.includes(regionName) || t.region === regionName);

  const regionStats: RegionStat[] = REGIONS.map(r => {
    const rps = getRegionReports(r.name);
    return { ...r, count: rps.length, workerCount: rps.reduce((s, t) => s + (t.workerCount || 0), 0), newWorkerCount: rps.reduce((s, t) => s + (t.newWorkerCount || 0), 0), cctvCount: rps.filter(t => t.cctvUsed).length, highRiskCount: rps.filter(t => HIGH_RISK_TYPES.includes(t.riskType)).length, reports: rps };
  });

  const totalCount = filteredReports.length;
  const totalWorkers = filteredReports.reduce((s, r) => s + (r.workerCount || 0), 0);
  const totalNewWorkers = filteredReports.reduce((s, r) => s + (r.newWorkerCount || 0), 0);
  const totalHighRisk = filteredReports.filter(r => HIGH_RISK_TYPES.includes(r.riskType)).length;
  const totalCctv = filteredReports.filter(r => r.cctvUsed).length;

  const moveDate = (days: number) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  const clearDetailMarkers = () => { markerRefs.current.forEach(m => m.setMap(null)); markerRefs.current = []; };

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return;
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(36.2, 127.8);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 13 });
        mapObjRef.current = map;
        setMapLoaded(true);
      });
    };
    if (window.kakao?.maps) { initMap(); return; }
    const existing = document.getElementById("kakao-map-script");
    if (existing) { const check = setInterval(() => { if (window.kakao?.maps) { clearInterval(check); initMap(); } }, 200); return; }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapObjRef.current || selectedRegion) return;
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    regionStats.forEach(region => {
      const pos = new window.kakao.maps.LatLng(region.lat, region.lng);
      const color = region.count >= 5 ? "#dc2626" : region.count >= 3 ? "#d97706" : region.count > 0 ? "#2563eb" : "#d1d5db";
      const div = document.createElement("div");
      div.innerHTML = `<div style="background:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;"><span>${region.count}</span><span style="font-size:8px;margin-top:-2px">${region.name}</span></div>`;
      div.addEventListener("click", () => handleSelectRegion(region));
      const overlay = new window.kakao.maps.CustomOverlay({ position: pos, content: div, map: mapObjRef.current, zIndex: 3 });
      overlaysRef.current.push(overlay);
    });
  }, [mapLoaded, filteredReports, selectedRegion]);

  const handleSelectRegion = (region: RegionStat) => {
    if (region.count === 0) return;
    setSelectedRegion(region);
    setSelectedReport(null);
    if (!mapObjRef.current) return;
    overlaysRef.current.forEach(o => o.setMap(null));
    const coordReports = region.reports.filter(r => r.workLatitude && r.workLongitude);
    let centerLat = region.lat, centerLng = region.lng;
    if (coordReports.length > 0) {
      centerLat = coordReports.reduce((s, r) => s + parseFloat(r.workLatitude), 0) / coordReports.length;
      centerLng = coordReports.reduce((s, r) => s + parseFloat(r.workLongitude), 0) / coordReports.length;
    }
    const pos = new window.kakao.maps.LatLng(centerLat, centerLng);
    mapObjRef.current.setCenter(pos);
    mapObjRef.current.setLevel(coordReports.length > 1 ? 10 : 7);
    clearDetailMarkers();
    setTimeout(() => {
      region.reports.forEach((r, i) => {
        if (!r.workLatitude || !r.workLongitude) return;
        const lat = parseFloat(r.workLatitude), lng = parseFloat(r.workLongitude);
        if (isNaN(lat) || isNaN(lng)) return;
        const mPos = new window.kakao.maps.LatLng(lat, lng);
        const isHigh = HIGH_RISK_TYPES.includes(r.riskType);
        const bgColor = normalizeType(r.taskType) === "자체진단" ? "#1d4ed8" : "#16a34a";
        const typeTag = normalizeType(r.taskType) === "자체진단" ? "[자체] " : "[용역] ";
        const baseName = r.projectName || r.facilityName || r.contractorName || `${i+1}번`;
        const label = typeTag + baseName;
        const div = document.createElement("div");
        div.innerHTML = `<div style="background:${bgColor};color:${isHigh ? "#ffeb3b" : "white"};border-radius:20px;padding:5px 12px;font-size:11px;font-weight:bold;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2.5px solid rgba(255,255,255,0.9);white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${label}${isHigh ? " ⚠" : ""}</div>`;
        div.addEventListener("click", () => setSelectedReport(r));
        const overlay = new window.kakao.maps.CustomOverlay({ position: mPos, content: div, map: mapObjRef.current, zIndex: 5 });
        markerRefs.current.push(overlay);
      });
      const noCoord = region.reports.filter(r => !r.workLatitude || !r.workLongitude);
      if (noCoord.length > 0) {
        const pos2 = new window.kakao.maps.LatLng(centerLat, centerLng);
        const div = document.createElement("div");
        div.innerHTML = `<div style="background:#9ca3af;color:white;border-radius:20px;padding:4px 8px;font-size:10px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid white;">좌표없음 ${noCoord.length}건</div>`;
        div.addEventListener("click", () => alert(noCoord.map(r => r.contractorName).join(", ") + " - 위치 좌표가 없습니다."));
        const overlay = new window.kakao.maps.CustomOverlay({ position: pos2, content: div, map: mapObjRef.current, zIndex: 4 });
        markerRefs.current.push(overlay);
      }
    }, 300);
  };

  const handleBackToAll = () => {
    setSelectedRegion(null); setSelectedReport(null); clearDetailMarkers();
    if (mapObjRef.current) {
      mapObjRef.current.setCenter(new window.kakao.maps.LatLng(36.2, 127.8));
      mapObjRef.current.setLevel(13);
      overlaysRef.current.forEach(o => o.setMap(mapObjRef.current));
    }
  };

  const regionDisplayReports = selectedRegion
    ? selectedRegion.reports.filter(r => {
        if (taskFilter && normalizeType(r.taskType) !== taskFilter) return false;
        if (highRiskFilter && !HIGH_RISK_TYPES.includes(r.riskType)) return false;
        return true;
      })
    : [];

  const F = ({ label, value }: { label: string; value?: any }) => {
    if (!value && value !== 0) return null;
    const v = typeof value === "boolean" ? (value ? "사용" : "미사용") : String(value);
    return (
      <div className="flex gap-2 py-1 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
        <span className="text-xs text-gray-800 whitespace-pre-wrap">{v}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {naviTarget && (
        <NaviModal
          address={naviTarget.address}
          lat={naviTarget.lat}
          lng={naviTarget.lng}
          onClose={() => setNaviTarget(null)}
        />
      )}

      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-gray-900">TBM 현황 관제</h1>
          {selectedRegion ? (
            <button onClick={handleBackToAll} className="text-xs text-blue-500 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              전체보기
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <button onClick={() => moveDate(-1)} disabled={loading} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="relative">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              </div>
            )}
          </div>
          <button onClick={() => moveDate(1)} disabled={loading} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["", "용역", "자체진단"] as const).map(f => (
            <button key={f} onClick={() => { setTaskFilter(f); setSelectedRegion(null); setSelectedReport(null); clearDetailMarkers(); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${taskFilter === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
              {f || "전체"}
            </button>
          ))}
          <button onClick={() => setHighRiskFilter(v => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${highRiskFilter ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-600 border-gray-300"}`}>
            🔴 고위험만
          </button>
        </div>
      </div>

      <div className="relative">
        <div ref={mapRef} style={{ height: "260px" }}>
          {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-100"><p className="text-sm text-gray-400">지도 로딩 중..</p></div>}
        </div>
        {loading && mapLoaded && (
          <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center gap-2 z-10">
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <p className="text-sm text-blue-600 font-medium">데이터 불러오는 중..</p>
          </div>
        )}
      </div>

      {!selectedRegion && (
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">지역별 TBM 현황</h2>
              <span className="text-xs text-gray-400">지역 탭 클릭 시 상세보기</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">지역</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">TBM</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">작업인원</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">신규</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">고위험</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">CCTV</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-blue-100 bg-blue-50 font-bold">
                  <td className="px-3 py-2 text-blue-700">전체</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalCount}</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalWorkers}</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalNewWorkers}</td>
                  <td className="px-2 py-2 text-center text-red-500 font-bold">{totalHighRisk}</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalCctv}</td>
                </tr>
                {regionStats.map(r => (
                  <tr key={r.name} className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${r.count === 0 ? "opacity-40" : ""}`} onClick={() => handleSelectRegion(r)}>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                    <td className="px-2 py-2 text-center">{r.count > 0 ? <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{r.count}</span> : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-2 text-center text-gray-700">{r.workerCount > 0 ? r.workerCount : "-"}</td>
                    <td className="px-2 py-2 text-center text-gray-700">{r.newWorkerCount > 0 ? r.newWorkerCount : "-"}</td>
                    <td className="px-2 py-2 text-center">{r.highRiskCount > 0 ? <span className="text-red-500 font-bold">{r.highRiskCount}</span> : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-2 text-center text-gray-700">{r.cctvCount > 0 ? r.cctvCount : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRegion && !selectedReport && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{selectedRegion.name} TBM 보고서</h2>
            <span className="text-xs text-gray-500">{regionDisplayReports.length}건 · {selectedRegion.workerCount}명</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "TBM", value: selectedRegion.count, color: "blue" },
              { label: "투입", value: selectedRegion.workerCount, color: "green" },
              { label: "고위험", value: selectedRegion.highRiskCount, color: "red" },
              { label: "CCTV", value: selectedRegion.cctvCount, color: "purple" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 rounded-xl p-2 text-center`}>
                <p className={`text-lg font-bold text-${color}-600`}>{value}</p>
                <p className={`text-[10px] text-${color}-500`}>{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{background:"linear-gradient(135deg,#f8faff,#f0f4ff)"}}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">상세 목록</span>
                <span className="text-xs text-gray-400">{regionDisplayReports.length}건</span>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1 text-[10px] text-green-700 font-medium"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>용역</div>
                <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>자체진단</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: "900px" }}>
                <thead>
                  <tr style={{background:"#f1f5f9"}}>
                    <th className="text-center px-2 py-2.5 text-gray-500 font-semibold border-b border-gray-200" style={{width:"36px"}}>NO</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"180px"}}>사업명</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"60px"}}>사진</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"180px"}}>교육내용</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"160px"}}>위험요인</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"100px"}}>회사명</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"110px"}}>주소</th>
                    <th className="text-center px-2 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"60px"}}>투입인원</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"80px"}}>투입장비</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"80px"}}>위험공종</th>
                    <th className="text-center px-2 py-2.5 text-gray-600 font-semibold border-b border-gray-200" style={{width:"90px"}}>소장</th>
                  </tr>
                </thead>
                <tbody>
                  {regionDisplayReports.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-10 text-gray-400">TBM 보고서가 없습니다.</td></tr>
                  ) : regionDisplayReports.map((r, i) => {
                    const isHigh = HIGH_RISK_TYPES.includes(r.riskType);
                    const isYongYeok = normalizeType(r.taskType) === "용역";
                    const rowBg = isHigh ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50";
                    return (
                      <tr key={r.id} onClick={() => setSelectedReport(r)}
                        className={`${rowBg} cursor-pointer hover:bg-blue-50/70 transition-colors border-b border-gray-100`}>
                        <td className="px-2 py-3 text-center text-gray-400 font-medium whitespace-nowrap">{i + 1}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`text-[9px] px-1 py-0.5 rounded font-bold mr-1 ${isYongYeok ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {isYongYeok ? "[용역]" : "[자체]"}
                          </span>
                          <span className={`font-semibold text-xs ${isHigh ? "text-red-600" : "text-gray-800"}`}>
                            {r.projectName || r.facilityName || "-"}
                          </span>
                          {r.band && <p className="text-[10px] text-gray-400 mt-0.5">{r.band}</p>}
                        </td>
                        <td className="px-3 py-3">
                          {(() => {
                            if (!r.photoUrl) return <div className="w-14 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-[9px]">없음</div>;
                            let photos: {url:string;caption:string}[] = [];
                            try { const p = JSON.parse(r.photoUrl); photos = Array.isArray(p) ? p : [{url:r.photoUrl,caption:""}]; } catch { photos = [{url:r.photoUrl,caption:""}]; }
                            return (
                              <div className="space-y-1">
                                <div className="relative">
                                  <img src={photos[0].url} alt="사진" className="w-16 h-12 object-cover rounded-lg border border-gray-200" />
                                  {photos.length > 1 && <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded">{photos.length}장</span>}
                                </div>
                                {photos[0].caption && <p className="text-[9px] text-gray-500 max-w-[64px] truncate">{photos[0].caption}</p>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          <p className="line-clamp-3 text-[11px] leading-snug">{r.workToday || "-"}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {(r.riskFactor1 || r.mainRiskFactor) ? (
                            <div className="text-[10px] leading-snug space-y-0.5">
                              {r.riskFactor1 && <p className="line-clamp-1">• {r.riskFactor1}</p>}
                              {r.riskFactor2 && <p className="line-clamp-1">• {r.riskFactor2}</p>}
                              {r.mainRiskFactor && <p className="text-amber-600 font-medium line-clamp-1">★ {r.mainRiskFactor}</p>}
                            </div>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-gray-700 text-[11px]">{r.contractorName || "-"}</td>
                        <td className="px-3 py-3">
                          {r.workAddress ? (
                            <button onClick={e => { e.stopPropagation(); setNaviTarget({ address: r.workAddress, lat: r.workLatitude, lng: r.workLongitude }); }}
                              className="text-blue-500 text-left flex items-start gap-0.5 hover:text-blue-700 group">
                              <svg className="mt-0.5 shrink-0 group-hover:text-blue-700" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              <span className="text-[10px] leading-tight line-clamp-2 underline underline-offset-1">{r.workAddress}</span>
                            </button>
                          ) : <span className="text-gray-400 text-[10px]">-</span>}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">{r.workerCount || 0}</span>
                          {r.newWorkerCount > 0 && <p className="text-[9px] text-orange-500 mt-0.5">신규{r.newWorkerCount}</p>}
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-[10px]">
                          <p className="line-clamp-2">{r.equipment || "-"}</p>
                        </td>
                        <td className="px-3 py-3">
                          {isHigh
                            ? <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">{r.riskType}</span>
                            : <span className="text-gray-400 text-[10px]">{r.riskType === "해당없음" ? "-" : r.riskType || "-"}</span>}
                        </td>
                        <td className="px-2 py-3 text-center text-[11px]">
                          <div className="font-medium text-gray-700">{r.instructorName || "-"}</div>
                          {r.instructorPhone && (
                            <a href={`tel:${r.instructorPhone}`} onClick={e => e.stopPropagation()}
                              className="text-blue-500 text-[10px] flex items-center justify-center gap-0.5 mt-0.5 hover:text-blue-700">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5a2 2 0 0 1 1.99-2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5v-.58z"/></svg>
                              {r.instructorPhone}
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedReport(null)} className="flex items-center gap-1 text-blue-500 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              {selectedRegion?.name} 목록
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push(`/tbm/${selectedReport.id}`)} className="text-xs text-blue-500 border border-blue-200 rounded-lg px-3 py-1.5">전체보기</button>
              <button onClick={() => router.push(`/tbm/new?editId=${selectedReport.id}`)} className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5">수정</button>
              <button onClick={async () => {
                if (!confirm("이 TBM을 삭제하시겠습니까?")) return;
                await fetch(`/api/tbm/${selectedReport.id}`, { method: "DELETE" });
                setSelectedReport(null); setSelectedRegion(null);
              }} className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5">삭제</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 mb-2">기본정보</h3>
            <F label="일자" value={selectedReport.reportDate} />
            <F label="수급사" value={selectedReport.contractorName} />
            <F label="시설명" value={selectedReport.facilityName} />
            <F label="사업명" value={selectedReport.projectName} />
            <F label="유형" value={normalizeType(selectedReport.taskType || "")} />
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 mb-2">작업정보</h3>
            <F label="당일작업" value={selectedReport.workToday} />
            <div className="flex gap-2 py-1 border-b border-gray-50">
              <span className="text-xs text-gray-400 w-20 shrink-0">주소</span>
              {selectedReport.workAddress ? (
                <button onClick={() => setNaviTarget({ address: selectedReport.workAddress, lat: selectedReport.workLatitude, lng: selectedReport.workLongitude })}
                  className="text-xs text-blue-500 flex items-center gap-1 hover:text-blue-700">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="underline">{selectedReport.workAddress}</span>
                </button>
              ) : <span className="text-xs text-gray-400">-</span>}
            </div>
            <F label="작업인원" value={selectedReport.workerCount ? `${selectedReport.workerCount}명` : null} />
            <F label="신규입장자" value={selectedReport.newWorkerCount ? `${selectedReport.newWorkerCount}명` : null} />
            <F label="작업기계" value={selectedReport.equipment} />
            <F label="위험종별" value={selectedReport.riskType} />
            <F label="CCTV" value={selectedReport.cctvUsed} />
          </div>
          {selectedReport.photoUrl && (() => {
            let photos: {url:string;caption:string}[] = [];
            try { const p = JSON.parse(selectedReport.photoUrl); photos = Array.isArray(p) ? p : [{url:selectedReport.photoUrl,caption:""}]; } catch { photos = [{url:selectedReport.photoUrl,caption:""}]; }
            return (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-500">TBM 현장사진 <span className="text-gray-400 font-normal">{photos.length}장</span></h3>
                  <button onClick={() => window.open(`/api/tbm/${selectedReport.id}/pdf`, "_blank")}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 flex items-center gap-1 hover:bg-red-50">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    PDF
                  </button>
                </div>
                <div className="space-y-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-gray-100">
                      <img src={photo.url} alt={photo.caption || `사진 ${idx+1}`} className="w-full object-cover max-h-48" />
                      {photo.caption && (
                        <div className="px-3 py-1.5 bg-gray-50 flex items-center gap-1.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          <span className="text-xs text-gray-700">{photo.caption}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {(selectedReport.riskFactor1 || selectedReport.mainRiskFactor) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 mb-2">위험요인 및 조치</h3>
              {[1,2,3].map(n => (selectedReport as any)[`riskFactor${n}`] && (
                <div key={n} className="mb-2 bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[10px] font-semibold text-gray-500">위험요인 {n}</p>
                  <p className="text-xs text-gray-800">{(selectedReport as any)[`riskFactor${n}`]}</p>
                  {(selectedReport as any)[`riskMeasure${n}`] && <p className="text-[10px] text-blue-600">→ {(selectedReport as any)[`riskMeasure${n}`]}</p>}
                </div>
              ))}
              {selectedReport.mainRiskFactor && (
                <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-600">중점위험요인</p>
                  <p className="text-xs text-gray-800">{selectedReport.mainRiskFactor}</p>
                  {selectedReport.mainRiskMeasure && <p className="text-[10px] text-amber-600">→ {selectedReport.mainRiskMeasure}</p>}
                </div>
              )}
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 mb-2">교육담당자</h3>
            <F label="성명" value={selectedReport.instructorName} />
            <F label="연락처" value={selectedReport.instructorPhone} />
            {selectedReport.signatureData && (
              <img src={selectedReport.signatureData} alt="서명" className="h-12 mt-2 border border-gray-200 rounded-lg bg-white" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
