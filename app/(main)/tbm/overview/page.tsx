"use client";
import { useState, useEffect, useRef } from "react";

declare global { interface Window { kakao: any; } }

const REGIONS = [
  { name: "寃쎄린", lat: 37.4138, lng: 127.5183 },
  { name: "媛뺤썝", lat: 37.8228, lng: 128.1555 },
  { name: "異⑸턿", lat: 36.6357, lng: 127.4912 },
  { name: "異⑸궓", lat: 36.5184, lng: 126.8000 },
  { name: "?꾨턿", lat: 35.7175, lng: 127.1530 },
  { name: "?꾨궓", lat: 34.8679, lng: 126.9910 },
  { name: "寃쎈턿", lat: 36.4919, lng: 128.8889 },
  { name: "寃쎈궓", lat: 35.4606, lng: 128.2132 },
];

interface TbmReport {
  id: string; reportDate: string; contractorName: string; workToday: string;
  workerCount: number; newWorkerCount: number; instructorName: string;
  headquarters: string; branch: string; projectName: string; facilityName: string;
  workAddress: string; equipment: string; riskType: string; cctvUsed: boolean; eduStartTime: string;
  photoUrl: string; region: string; createdAt: string;
}

interface RegionStat {
  name: string; lat: number; lng: number;
  count: number; workerCount: number; cctvCount: number;
  reports: TbmReport[];
}

export default function TbmOverviewPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [reports, setReports] = useState<TbmReport[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionStat | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TbmReport | null>(null);

  useEffect(() => {
    loadTbm();
  }, [date]);

  const loadTbm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tbm?date=${date}`);
      const data = await res.json();
      setReports(data.tbmReports ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  // 吏??퀎 ?듦퀎 怨꾩궛
  const regionStats: RegionStat[] = REGIONS.map(r => {
    const regionReports = reports.filter(t =>
      t.workAddress?.includes(r.name) ||
      t.headquarters?.includes(r.name) ||
      t.region === r.name
    );
    return {
      ...r,
      count: regionReports.length,
      workerCount: regionReports.reduce((s, t) => s + (t.workerCount || 0), 0),
      cctvCount: regionReports.filter(t => t.cctvUsed).length,
      reports: regionReports,
    };
  });

  const totalCount = reports.length;
  const totalWorkers = reports.reduce((s, r) => s + (r.workerCount || 0), 0);

  // 移댁뭅?ㅻ㏊ 濡쒕뱶
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

  // 留덉빱 ?낅뜲?댄듃
  useEffect(() => {
    if (!mapLoaded || !mapObjRef.current) return;
    // 湲곗〈 留덉빱 ?쒓굅
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    regionStats.forEach(region => {
      if (region.count === 0) return;
      const pos = new window.kakao.maps.LatLng(region.lat, region.lng);
      const color = region.count >= 5 ? "#dc2626" : region.count >= 3 ? "#d97706" : "#2563eb";
      const content = `<div style="background:${color};color:white;border-radius:50%;width:44px;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">
        <span>${region.count}</span><span style="font-size:9px">${region.name}</span></div>`;
      const overlay = new window.kakao.maps.CustomOverlay({ position: pos, content, map: mapObjRef.current, zIndex: 3 });
      // ?대┃ ?대깽?몃뒗 DOM?쇰줈
      setTimeout(() => {
        const el = overlay.getContent();
        if (typeof el === "string") return;
        el.addEventListener?.("click", () => setSelectedRegion(region));
      }, 100);
      markersRef.current.push(overlay);
    });
  }, [mapLoaded, reports]);

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* ?ㅻ뜑 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-gray-900">TBM ?꾪솴 愿??/h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {/* ?꾩껜 ?듦퀎 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-blue-600">{totalCount}</p>
            <p className="text-xs text-blue-500">TBM 嫄댁닔</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-green-600">{totalWorkers}</p>
            <p className="text-xs text-green-500">?ъ엯?몄썝(紐?</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-purple-600">{reports.filter(r => r.cctvUsed).length}</p>
            <p className="text-xs text-purple-500">CCTV ?ъ슜</p>
          </div>
        </div>
      </div>

      {/* 吏??*/}
      <div ref={mapRef} style={{ height: "280px", position: "relative" }}>
        {!mapLoaded && (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-sm text-gray-400">吏??濡쒕뵫 以?..</p>
          </div>
        )}
      </div>

      {/* 吏??퀎 ?꾪솴 ?뚯씠釉?*/}
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">吏??퀎 TBM ?꾪솴</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-gray-600 font-semibold">吏??/th>
                  <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">TBM</th>
                  <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">?ъ엯?몄썝</th>
                  <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">CCTV</th>
                  <th className="text-center px-3 py-2.5 text-gray-600 font-semibold">?곸꽭</th>
                </tr>
              </thead>
              <tbody>
                {regionStats.map(r => (
                  <tr key={r.name}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedRegion?.name === r.name ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedRegion(r.count > 0 ? r : null)}>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{r.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      {r.count > 0 ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{r.count}</span> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{r.workerCount > 0 ? `${r.workerCount}紐? : "-"}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{r.cctvCount > 0 ? `${r.cctvCount}嫄? : "-"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {r.count > 0 && <button className="text-blue-500 underline text-xs">蹂닿린</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 吏???곸꽭 紐⑤떖 */}
      {selectedRegion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedRegion.name} TBM ?꾪솴</h2>
                <p className="text-xs text-gray-500">{date} 쨌 珥?{selectedRegion.count}嫄?쨌 {selectedRegion.workerCount}紐?/p>
              </div>
              <button onClick={() => setSelectedRegion(null)} className="text-gray-400 p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {selectedRegion.reports.length === 0 ? (
                <p className="text-center text-gray-400 py-8">TBM 蹂닿퀬?쒓? ?놁뒿?덈떎.</p>
              ) : selectedRegion.reports.map(r => (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.contractorName || "?쒓났??誘몄엯??}</p>
                      <p className="text-xs text-gray-500">{r.facilityName || r.projectName || ""}</p>
                    </div>
                    <div className="flex gap-1">
                      {r.cctvUsed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">CCTV</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">?뫕{r.workerCount}紐?/span>
                    </div>
                  </div>
                  {r.workToday && <p className="text-xs text-gray-700 mb-1 line-clamp-2">{r.workToday}</p>}
                  {r.workAddress && <p className="text-xs text-gray-400">?뱧 {r.workAddress}</p>}
                  {r.riskType && r.riskType !== "?대떦?놁쓬" && (
                    <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">{r.riskType}</span>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">援먯쑁?? {r.instructorName} 쨌 {r.eduStartTime || ""}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

