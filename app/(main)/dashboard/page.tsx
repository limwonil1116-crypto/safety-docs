"use client";

import { useState, useEffect, useRef } from "react";

const mockDocuments = [
  { id: "1", taskName: "내현지구 정밀안전진단", company: "한국안전연구원", type: "안전작업허가서", status: "IN_REVIEW", lat: 36.4918, lng: 126.6422 },
  { id: "2", taskName: "장은항 어촌뉴딜", company: "안전기술연구소", type: "밀폐공간 작업허가서", status: "APPROVED", lat: 36.3318, lng: 126.5122 },
  { id: "3", taskName: "대천1지구 정밀안전진단", company: "KR안전연구원", type: "안전작업허가서", status: "REJECTED", lat: 36.3218, lng: 126.6022 },
  { id: "4", taskName: "증산지구 정기안전점검", company: "한국안전연구원", type: "휴일작업 신청서", status: "APPROVED", lat: 36.5518, lng: 126.7122 },
  { id: "5", taskName: "재현지구 정밀점검", company: "안전기술연구소", type: "정전작업 허가서", status: "IN_REVIEW", lat: 36.4218, lng: 126.4822 },
  { id: "6", taskName: "도고면 기반시설점검", company: "KR안전연구원", type: "안전작업허가서", status: "SUBMITTED", lat: 36.6018, lng: 126.8022 },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string; pin: string }> = {
  SUBMITTED: { bg: "bg-blue-100",  text: "text-blue-600",  label: "제출완료", pin: "#2563eb" },
  IN_REVIEW: { bg: "bg-amber-100", text: "text-amber-600", label: "검토중",   pin: "#d97706" },
  APPROVED:  { bg: "bg-green-100", text: "text-green-600", label: "검토완료", pin: "#16a34a" },
  REJECTED:  { bg: "bg-red-100",   text: "text-red-600",   label: "반려",     pin: "#dc2626" },
};

declare global {
  interface Window { kakao: any; }
}

export default function DashboardPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("ALL");

  const stats = {
    total: mockDocuments.length,
    inProgress: mockDocuments.filter((d) => d.status === "IN_REVIEW" || d.status === "SUBMITTED").length,
    completed: mockDocuments.filter((d) => d.status === "APPROVED").length,
    rejected: mockDocuments.filter((d) => d.status === "REJECTED").length,
  };

  // 카카오맵 로드
  useEffect(() => {
    if (document.getElementById("kakao-map-script")) {
      if (window.kakao?.maps) {
        setMapLoaded(true);
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => setMapLoaded(true));
    };
    document.head.appendChild(script);
  }, []);

  // 지도 초기화 + 마커 생성
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const center = new window.kakao.maps.LatLng(36.4618, 126.6422);
    const map = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 9,
    });
    mapInstanceRef.current = map;

    const filtered = activeTab === "ALL"
      ? mockDocuments
      : mockDocuments.filter((d) => {
          if (activeTab === "SAFETY_WORK_PERMIT") return d.type === "안전작업허가서";
          if (activeTab === "CONFINED_SPACE") return d.type === "밀폐공간 작업허가서";
          if (activeTab === "HOLIDAY_WORK") return d.type === "휴일작업 신청서";
          if (activeTab === "POWER_OUTAGE") return d.type === "정전작업 허가서";
          return true;
        });

    filtered.forEach((doc) => {
      const pos = new window.kakao.maps.LatLng(doc.lat, doc.lng);
      const pinColor = STATUS_STYLE[doc.status]?.pin || "#2563eb";

      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${pinColor}"/>
            <circle cx="16" cy="16" r="7" fill="white"/>
          </svg>
        `)}`,
        new window.kakao.maps.Size(32, 40),
        { offset: new window.kakao.maps.Point(16, 40) }
      );

      const marker = new window.kakao.maps.Marker({
        position: pos,
        map,
        image: markerImage,
      });

      // 말풍선
      const infoContent = `
        <div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:140px;font-family:sans-serif;">
          <p style="font-size:12px;font-weight:600;color:#111;margin:0 0 2px;">${doc.taskName}</p>
          <p style="font-size:11px;color:#666;margin:0 0 4px;">${doc.type}</p>
          <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${pinColor}20;color:${pinColor};font-weight:500;">
            ${STATUS_STYLE[doc.status]?.label}
          </span>
        </div>
      `;
      const infowindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
        removable: true,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        infowindow.open(map, marker);
        setSelectedDoc(doc);
      });
    });
  }, [mapLoaded, activeTab]);

  const filtered = activeTab === "ALL"
    ? mockDocuments
    : mockDocuments.filter((d) => {
        if (activeTab === "SAFETY_WORK_PERMIT") return d.type === "안전작업허가서";
        if (activeTab === "CONFINED_SPACE") return d.type === "밀폐공간 작업허가서";
        if (activeTab === "HOLIDAY_WORK") return d.type === "휴일작업 신청서";
        if (activeTab === "POWER_OUTAGE") return d.type === "정전작업 허가서";
        return true;
      });

  return (
    <div className="pb-20">
      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-2 mx-4 mt-4">
        {[
          { label: "전체", value: stats.total, color: "#2563eb", bg: "bg-blue-50" },
          { label: "진행중", value: stats.inProgress, color: "#d97706", bg: "bg-amber-50" },
          { label: "완료", value: stats.completed, color: "#16a34a", bg: "bg-green-50" },
          { label: "반려", value: stats.rejected, color: "#dc2626", bg: "bg-red-50" },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} rounded-2xl p-3 text-center`}>
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 서류 유형 탭 */}
      <div className="bg-white border-b border-gray-200 flex mt-4 overflow-x-auto">
        {[
          { key: "ALL", label: "전체" },
          { key: "SAFETY_WORK_PERMIT", label: "붙임1" },
          { key: "CONFINED_SPACE", label: "붙임2" },
          { key: "HOLIDAY_WORK", label: "붙임3" },
          { key: "POWER_OUTAGE", label: "붙임4" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">작업위치 현황</h3>
          <div className="flex gap-3 text-xs">
            {Object.entries(STATUS_STYLE).map(([key, val]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: val.pin }}/>
                {val.label}
              </span>
            ))}
          </div>
        </div>
        <div ref={mapRef} style={{ width: "100%", height: "320px" }}>
          {!mapLoaded && (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <p className="text-sm text-gray-400">지도 로딩 중...</p>
            </div>
          )}
        </div>
      </div>

      {/* 문서 현황 테이블 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">문서 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#1e3a5f" }}>
                <th className="text-left px-3 py-2.5 text-white font-medium">과업명</th>
                <th className="text-center px-2 py-2.5 text-white font-medium">서류종류</th>
                <th className="text-center px-2 py-2.5 text-white font-medium">업체명</th>
                <th className="text-center px-2 py-2.5 text-white font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, idx) => {
                const s = STATUS_STYLE[doc.status];
                return (
                  <tr key={doc.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2.5 text-gray-800 font-medium max-w-[120px] truncate">{doc.taskName}</td>
                    <td className="text-center px-2 py-2.5 text-gray-600">{doc.type}</td>
                    <td className="text-center px-2 py-2.5 text-gray-500">{doc.company}</td>
                    <td className="text-center px-2 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}