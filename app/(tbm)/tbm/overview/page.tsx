"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { kakao: any; } }

const HIGH_RISK_TYPES = ["2.0m 이상 고소작업","1.5m 이상 굴착·가설공사","철곸 구조물 공사","2.0m이상 외부 도장공사","승강기 설치공사","취수탑 공사","복통, 잠관 공사","이외의 작업계획서작성 대상"];

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

  // 필터 적용된 reports
  const filteredReports = reports.filter(r => {
    if (taskFilter) {
      const t = r.taskType || "";
      if (t !== taskFilter) return false;
    }
    if (highRiskFilter && !HIGH_RISK_TYPES.includes(r.riskType)) return false;
    return true;
  });

  const getRegionReports = (regionName: string) =>
    filteredReports.filter(t => t.workAddress?.includes(regionName) || t.headquarters?.includes(regionName) || t.region === regionName);

  const regionStats: RegionStat[] = REGIONS.map(r => {
    const rps = getRegionReports(r.name);
    return {
      ...r,
      count: rps.length,
      workerCount: rps.reduce((s, t) => s + (t.workerCount || 0), 0),
      newWorkerCount: rps.reduce((s, t) => s + (t.newWorkerCount || 0), 0),
      cctvCount: rps.filter(t => t.cctvUsed).length,
      highRiskCount: rps.filter(t => HIGH_RISK_TYPES.includes(t.riskType)).length,
      reports: rps,
    };
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

  const clearDetailMarkers = () => {
    markerRefs.current.forEach(m => m.setMap(null));
    markerRefs.current = [];
  };

  // 지도 초기화
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

  // 전국 지역 마커 업데이트
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
    const pos = new window.kakao.maps.LatLng(region.lat, region.lng);
    mapObjRef.current.setCenter(pos);
    mapObjRef.current.setLevel(9);
    clearDetailMarkers();

    setTimeout(() => {
      region.reports.forEach((r, i) => {
        if (!r.workLatitude || !r.workLongitude) return;
        const lat = parseFloat(r.workLatitude);
        const lng = parseFloat(r.workLongitude);
        if (isNaN(lat) || isNaN(lng)) return;
        const mPos = new window.kakao.maps.LatLng(lat, lng);
        const isHigh = HIGH_RISK_TYPES.includes(r.riskType);
        // 용역=초록, 자체진단=파랑, 기타=회색
        const bgColor = r.taskType === "용역" ? "#16a34a" : r.taskType === "자체진단" ? "#1d4ed8" : "#7c3aed";
        const label = r.projectName || r.facilityName || r.contractorName || `${i+1}번`;
        const textColor = isHigh ? "#ff0000" : "#ffffff";
        const fontWeight = isHigh ? "900" : "bold";
        const div = document.createElement("div");
        div.innerHTML = `<div style="background:${bgColor};color:${isHigh ? "#ffeb3b" : "white"};border-radius:20px;padding:5px 12px;font-size:11px;font-weight:bold;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2.5px solid rgba(255,255,255,0.8);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;text-shadow:${isHigh ? "0 0 4px rgba(0,0,0,0.5)" : "none"};">${label}${isHigh ? " ⚠" : ""}</div>`;
        div.addEventListener("click", () => setSelectedReport(r));
        const overlay = new window.kakao.maps.CustomOverlay({ position: mPos, content: div, map: mapObjRef.current, zIndex: 5 });
        markerRefs.current.push(overlay);
      });
      const noCoord = region.reports.filter(r => !r.workLatitude || !r.workLongitude);
      if (noCoord.length > 0) {
        const div = document.createElement("div");
        div.innerHTML = `<div style="background:#9ca3af;color:white;border-radius:20px;padding:4px 8px;font-size:10px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid white;">좌표없음 ${noCoord.length}건</div>`;
        div.addEventListener("click", () => alert(noCoord.map(r => r.contractorName).join(", ") + " - 위치 좌표가 없습니다."));
        const overlay = new window.kakao.maps.CustomOverlay({ position: pos, content: div, map: mapObjRef.current, zIndex: 4 });
        markerRefs.current.push(overlay);
      }
    }, 300);
  };

  const handleBackToAll = () => {
    setSelectedRegion(null);
    setSelectedReport(null);
    clearDetailMarkers();
    if (mapObjRef.current) {
      mapObjRef.current.setCenter(new window.kakao.maps.LatLng(36.2, 127.8));
      mapObjRef.current.setLevel(13);
      overlaysRef.current.forEach(o => o.setMap(mapObjRef.current));
    }
  };

  // 지역 선택 시 표시할 리포트 (고위험 필터 포함)
  const regionDisplayReports = selectedRegion
    ? (highRiskFilter
        ? selectedRegion.reports.filter(r => HIGH_RISK_TYPES.includes(r.riskType))
        : selectedRegion.reports)
    : [];

  const F = ({ label, value }: { label: string; value?: any }) => {
    if (!value && value !== 0) return null;
    const v = typeof value === "boolean" ? (value ? "사용중" : "사용안함") : String(value);
    return (
      <div className="flex gap-2 py-1 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
        <span className="text-xs text-gray-800 whitespace-pre-wrap">{v}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* 헤더 */}
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

        {/* 날짜 네비 */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <button onClick={() => moveDate(-1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => moveDate(1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* 필터 버튼 */}
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

      {/* 지도 */}
      <div ref={mapRef} style={{ height: "260px" }}>
        {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-100"><p className="text-sm text-gray-400">지도 로딩 중...</p></div>}
      </div>

      {/* 전체 통계 테이블 */}
      {!selectedRegion && (
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">지역별 TBM 현황</h2>
              <span className="text-xs text-gray-400">지역 클릭 시 상세보기</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">지역</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">TBM</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">투입</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">신규</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">고위험</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">CCTV</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-blue-100 bg-blue-50 font-bold">
                  <td className="px-3 py-2 text-blue-700">총계</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalCount}</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalWorkers}</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalNewWorkers}</td>
                  <td className="px-2 py-2 text-center text-red-500 font-bold">{totalHighRisk}</td>
                  <td className="px-2 py-2 text-center text-blue-700">{totalCctv}</td>
                </tr>
                {regionStats.map(r => (
                  <tr key={r.name}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${r.count === 0 ? "opacity-40" : ""}`}
                    onClick={() => handleSelectRegion(r)}>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                    <td className="px-2 py-2 text-center">
                      {r.count > 0 ? <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{r.count}</span> : <span className="text-gray-300">-</span>}
                    </td>
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

      {/* 지역 선택 - 상세 표 */}
      {selectedRegion && !selectedReport && (
        <div className="p-4 space-y-3">
          {/* 통계 요약 */}
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

          {/* 상세 목록 테이블 - 세련된 디자인 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{background:"linear-gradient(135deg,#f8faff,#f0f4ff)"}}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">상세 목록</span>
                <span className="text-xs text-gray-400">{regionDisplayReports.length}건</span>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1 text-[10px] text-green-700 font-medium"><span className="w-3 h-3 rounded-full bg-green-500 inline-block shadow-sm"></span>용역</div>
                <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm"></span>자체진단</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr style={{background:"#f1f5f9"}}>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold border-b border-gray-200 w-8">NO</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200">사업명</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200">사진</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200 min-w-[140px]">작업내용</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200 min-w-[120px]">교육내용</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200">회사명</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200">주소</th>
                    <th className="text-center px-2 py-2.5 text-gray-600 font-semibold border-b border-gray-200">투입인원</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200">투입장비</th>
                    <th className="text-left px-3 py-2.5 text-gray-600 font-semibold border-b border-gray-200">위험공종</th>
                    <th className="text-center px-2 py-2.5 text-gray-600 font-semibold border-b border-gray-200">소장</th>
                  </tr>
                </thead>
                <tbody>
                  {regionDisplayReports.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-10 text-gray-400">TBM 보고서가 없습니다.</td></tr>
                  ) : regionDisplayReports.map((r, i) => {
                    const isHigh = HIGH_RISK_TYPES.includes(r.riskType);
                    const isYongYeok = r.taskType === "용역";
                    const rowBg = isHigh ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50";
                    return (
                      <tr key={r.id}
                        onClick={() => setSelectedReport(r)}
                        className={`${rowBg} cursor-pointer hover:bg-blue-50/70 transition-colors border-b border-gray-100`}>
                        <td className="px-3 py-3 text-center text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-1.5">
                            <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isYongYeok ? "bg-green-500" : "bg-blue-600"}`}></span>
                            <div>
                              <p className={`font-semibold text-xs leading-tight ${isHigh ? "text-red-600" : "text-gray-800"}`}>
                                {r.projectName || r.facilityName || "-"}
                              </p>
                              {r.band && <p className="text-[10px] text-gray-400 mt-0.5">{r.band}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {(r as any).photoUrl
                            ? <img src={(r as any).photoUrl} alt="사진" className="w-14 h-10 object-cover rounded-lg border border-gray-200" />
                            : <div className="w-14 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-[9px]">없음</div>
                          }
                        </td>
                        <td className="px-3 py-3 text-gray-700 max-w-[160px]">
                          <p className="line-clamp-3 text-[11px] leading-snug">{r.workToday || "-"}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-600 max-w-[140px]">
                          {(r.riskFactor1 || r.mainRiskFactor) ? (
                            <div className="text-[10px] leading-snug space-y-0.5">
                              {r.riskFactor1 && <p className="line-clamp-1">• {r.riskFactor1}</p>}
                              {r.riskFactor2 && <p className="line-clamp-1">• {r.riskFactor2}</p>}
                              {r.mainRiskFactor && <p className="text-amber-600 font-medium line-clamp-1">★ {r.mainRiskFactor}</p>}
                            </div>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-[11px]">{r.contractorName || "-"}</td>
                        <td className="px-3 py-3 text-gray-500 text-[10px] max-w-[120px]">
                          <p className="line-clamp-2">{r.workAddress || "-"}</p>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">{r.workerCount || 0}</span>
                          {r.newWorkerCount > 0 && <p className="text-[9px] text-orange-500 mt-0.5">신규{r.newWorkerCount}</p>}
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-[10px] max-w-[100px]">
                          <p className="line-clamp-2">{r.equipment || "-"}</p>
                        </td>
                        <td className="px-3 py-3">
                          {isHigh
                            ? <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">{r.riskType}</span>
                            : <span className="text-gray-400 text-[10px]">{r.riskType === "해당없음" ? "-" : r.riskType || "-"}</span>}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600 text-[11px] whitespace-nowrap">{r.instructorName || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 보고서 상세 */}
      {selectedReport && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedReport(null)} className="flex items-center gap-1 text-blue-500 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              {selectedRegion?.name} 목록
            </button>
            <button onClick={() => router.push(`/tbm/${selectedReport.id}`)}
              className="text-xs text-blue-500 border border-blue-200 rounded-lg px-3 py-1.5">전체보기</button>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 mb-2">기본정보</h3>
            <F label="일자" value={selectedReport.reportDate} />
            <F label="시공사" value={selectedReport.contractorName} />
            <F label="시설물" value={selectedReport.facilityName} />
            <F label="사업명" value={selectedReport.projectName} />
            <F label="유형" value={selectedReport.taskType} />
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 mb-2">작업정보</h3>
            <F label="금일작업" value={selectedReport.workToday} />
            <F label="주소" value={selectedReport.workAddress} />
            <F label="투입인원" value={selectedReport.workerCount ? `${selectedReport.workerCount}명` : null} />
            <F label="신규근로자" value={selectedReport.newWorkerCount ? `${selectedReport.newWorkerCount}명` : null} />
            <F label="투입장비" value={selectedReport.equipment} />
            <F label="위험공종" value={selectedReport.riskType} />
            <F label="CCTV" value={selectedReport.cctvUsed} />
          </div>
          {selectedReport.photoUrl && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 mb-2">TBM 실시사진</h3>
              <img src={selectedReport.photoUrl} alt="TBM사진" className="w-full rounded-xl object-cover max-h-48" />
            </div>
          )}
          {(selectedReport.riskFactor1 || selectedReport.mainRiskFactor) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 mb-2">위험요인 및 대책</h3>
              {[1,2,3].map(n => (selectedReport as any)[`riskFactor${n}`] && (
                <div key={n} className="mb-2 bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[10px] font-semibold text-gray-500">잠재위험요인 {n}</p>
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
            <F label="성함" value={selectedReport.instructorName} />
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
