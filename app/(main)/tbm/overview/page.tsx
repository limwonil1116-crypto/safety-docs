"use client";
import { useState, useEffect, useRef } from "react";

declare global { interface Window { kakao: any; } }

const REGIONS = [
  { name: "경기", lat: 37.4138, lng: 127.5183 },
  { name: "강원", lat: 37.8228, lng: 128.1555 },
  { name: "충북", lat: 36.6357, lng: 127.4912 },
  { name: "충남", lat: 36.5184, lng: 126.8000 },
  { name: "전북", lat: 35.7175, lng: 127.1530 },
  { name: "전남", lat: 34.8679, lng: 126.9910 },
  { name: "경북", lat: 36.4919, lng: 128.8889 },
  { name: "경남", lat: 35.4606, lng: 128.2132 },
];

interface TbmReport {
  id: string;
  reportDate: string;
  contractorName: string;
  workToday: string;
  workerCount: number;
  newWorkerCount: number;
  instructorName: string;
  headquarters: string;
  branch: string;
  projectName: string;
  facilityName: string;
  workAddress: string;
  equipment: string;
  riskType: string;
  cctvUsed: boolean;
  eduStartTime: string;
  photoUrl: string;
  region: string;
  createdAt: string;
}

interface RegionStat {
  name: string;
  lat: number;
  lng: number;
  count: number;
  workerCount: number;
  cctvCount: number;
  reports: TbmReport[];
}

export default function TbmOverviewPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [reports, setReports] = useState<TbmReport[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionStat | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

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

  const getRegionReports = (regionName: string) =>
    reports.filter(t =>
      t.workAddress?.includes(regionName) ||
      t.headquarters?.includes(regionName) ||
      t.region === regionName
    );

  const regionStats: RegionStat[] = REGIONS.map(r => {
    const rps = getRegionReports(r.name);
    return {
      ...r,
      count: rps.length,
      workerCount: rps.reduce((s, t) => s + (t.workerCount || 0), 0),
      cctvCount: rps.filter(t => t.cctvUsed).length,
      reports: rps,
    };
  });

  const totalCount = reports.length;
  const totalWorkers = reports.reduce((s, r) => s + (r.workerCount || 0), 0);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return;
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(36.5, 127.8);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 8 });
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
    if (!mapLoaded || !mapObjRef.current) return;
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    regionStats.forEach(region => {
      const pos = new window.kakao.maps.LatLng(region.lat, region.lng);
      const color = region.count >= 5 ? "#dc2626" : region.count >= 3 ? "#d97706" : region.count > 0 ? "#2563eb" : "#9ca3af";
      const div = document.createElement("div");
      div.innerHTML = `<div style="background:${color};color:white;border-radius:50%;width:48px;height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;"><span>${region.count}</span><span style="font-size:9px">${region.name}</span></div>`;
      div.addEventListener("click", () => setSelectedRegion(region));
      const overlay = new window.kakao.maps.CustomOverlay({ position: pos, content: div, map: mapObjRef.current, zIndex: 3 });
      overlaysRef.current.push(overlay);
    });
  }, [mapLoaded, reports]);

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-gray-900">TBM 현황 관제</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-blue-600">{totalCount}</p>
            <p className="text-xs text-blue-500">TBM 건수</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-green-600">{totalWorkers}</p>
            <p className="text-xs text-green-500">투입인원(명)</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-purple-600">{reports.filter(r => r.cctvUsed).length}</p>
            <p className="text-xs text-purple-500">CCTV 사용</p>
          </div>
        </div>
      </div>

      <div ref={mapRef} style={{ height: "260px" }}>
        {!mapLoaded && (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-sm text-gray-400">지도 로딩 중...</p>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">지역별 TBM 현황</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2.5 text-gray-600 font-semibold">지역</th>
                <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">TBM</th>
                <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">투입인원</th>
                <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">CCTV</th>
              </tr>
            </thead>
            <tbody>
              {regionStats.map(r => (
                <tr key={r.name}
                  className={`border-b border-gray-50 cursor-pointer ${selectedRegion?.name === r.name ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedRegion(r.count > 0 ? r : null)}>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2.5 text-center">
                    {r.count > 0 ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{r.count}</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{r.workerCount > 0 ? `${r.workerCount}명` : "-"}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{r.cctvCount > 0 ? `${r.cctvCount}건` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRegion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedRegion.name} TBM 현황</h2>
                <p className="text-xs text-gray-500">{date} · 총 {selectedRegion.count}건 · {selectedRegion.workerCount}명</p>
              </div>
              <button onClick={() => setSelectedRegion(null)} className="text-gray-400 p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {selectedRegion.reports.length === 0 ? (
                <p className="text-center text-gray-400 py-8">TBM 보고서가 없습니다.</p>
              ) : selectedRegion.reports.map(r => (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.contractorName || "시공사 미입력"}</p>
                      <p className="text-xs text-gray-500">{r.facilityName || r.projectName || ""}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {r.cctvUsed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">CCTV</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">투입 {r.workerCount}명</span>
                    </div>
                  </div>
                  {r.workToday && <p className="text-xs text-gray-700 mb-1 line-clamp-2">{r.workToday}</p>}
                  {r.workAddress && <p className="text-xs text-gray-400">파일 {r.workAddress}</p>}
                  {r.riskType && r.riskType !== "해당없음" && (
                    <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">{r.riskType}</span>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">교육자: {r.instructorName} · {r.eduStartTime || ""}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
