"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface DocumentMapItem {
  id: string;
  taskId: string;
  taskName: string;
  company: string;
  type: string;
  status: string;
  currentApprovalOrder?: number;
  lat: number | null;
  lng: number | null;
  workAddress: string | null;
  workStartDate: string | null;
  workEndDate: string | null;
  documentType: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string; pin: string }> = {
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "제출완료",       pin: "#2563eb" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "검토중",         pin: "#d97706" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "최종결재 진행중", pin: "#ea580c" },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "승인완료",       pin: "#16a34a" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "반려",           pin: "#dc2626" },
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-600",   label: "작성중",         pin: "#6b7280" },
};

const DOC_TYPE_LABEL: Record<string, string> = {
  SAFETY_WORK_PERMIT: "안전작업허가서",
  CONFINED_SPACE:     "밀폐공간허가서",
  HOLIDAY_WORK:       "휴일작업신청서",
  POWER_OUTAGE:       "정전작업허가서",
};

const DOC_TYPE_CAL_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  SAFETY_WORK_PERMIT: { bg: "#dbeafe", text: "#1d4ed8", border: "#3b82f6" },
  CONFINED_SPACE:     { bg: "#ede9fe", text: "#6d28d9", border: "#8b5cf6" },
  HOLIDAY_WORK:       { bg: "#fef3c7", text: "#b45309", border: "#f59e0b" },
  POWER_OUTAGE:       { bg: "#fee2e2", text: "#b91c1c", border: "#ef4444" },
};

declare global { interface Window { kakao: any; } }

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ✅ 8번: workStartDate~workEndDate 기준 캘린더
// ✅ 9번: 전체 제목 표시 (용역명 + 허가종류)
function CalendarView({ documents, onDocClick }: {
  documents: DocumentMapItem[];
  onDocClick: (doc: DocumentMapItem) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const approvedDocs = documents.filter(
    (d) => d.status === "APPROVED" && d.workStartDate
  );

  const docsByDate: Record<string, DocumentMapItem[]> = {};
  approvedDocs.forEach((d) => {
    const start = d.workStartDate!;
    const end = d.workEndDate || d.workStartDate!;
    const dateRange = getDateRange(start, end);
    dateRange.forEach((dateKey) => {
      if (!docsByDate[dateKey]) docsByDate[dateKey] = [];
      if (!docsByDate[dateKey].find((x) => x.id === d.id)) {
        docsByDate[dateKey].push(d);
      }
    });
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: Array<{ date: number; cur: boolean; key: string }> = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    cells.push({ date: d, cur: false, key: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, cur: true, key: `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
  }
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    cells.push({ date: d, cur: false, key: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const selectedDocs = selectedDate ? (docsByDate[selectedDate] ?? []) : [];

  // ✅ 9번: 시작일에 "용역명 + 허가종류" 전체 표시, 이후 구간은 색상 바만
  const getCalLabel = (doc: DocumentMapItem, dateKey: string): string => {
    const isStart = doc.workStartDate === dateKey;
    const docTypeShort = DOC_TYPE_LABEL[doc.documentType] ?? "";
    if (isStart) {
      return `${doc.taskName} ${docTypeShort}`;
    }
    // 중간/종료일: 3일마다 또는 주 시작(일요일)에 반복 표시
    if (doc.workStartDate) {
      const startDt = new Date(doc.workStartDate + "T00:00:00");
      const curDt = new Date(dateKey + "T00:00:00");
      const diffDays = Math.round((curDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24));
      const dow = curDt.getDay();
      if (dow === 0 || (diffDays > 0 && diffDays % 3 === 0)) {
        return `${doc.taskName} ${docTypeShort}`;
      }
    }
    return "";
  };

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="text-sm font-bold text-gray-900">{year}년 {month + 1}월</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {["일","월","화","수","목","금","토"].map((d, i) => (
          <div key={d} className={`text-center py-2 text-xs font-semibold ${i===0?"text-red-500":i===6?"text-blue-500":"text-gray-500"}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {cells.map((cell, idx) => {
          const hasDocs = !!docsByDate[cell.key]?.length && cell.cur;
          const isToday = cell.key === todayKey && cell.cur;
          const isSelected = cell.key === selectedDate;
          const dow = idx % 7;
          const cellDocs = cell.cur ? (docsByDate[cell.key] ?? []) : [];

          const isStart = (doc: DocumentMapItem) => doc.workStartDate === cell.key;
          const isEnd = (doc: DocumentMapItem) => (doc.workEndDate || doc.workStartDate) === cell.key;
          const isSingle = (doc: DocumentMapItem) => doc.workStartDate === (doc.workEndDate || doc.workStartDate);

          return (
            <div key={idx}
              onClick={() => hasDocs && setSelectedDate(isSelected ? null : cell.key)}
              className={`min-h-[72px] border-r border-b border-gray-100 p-1 ${
                isSelected ? "bg-blue-50" : hasDocs ? "cursor-pointer hover:bg-gray-50" : ""
              } ${!cell.cur ? "bg-gray-50/50" : ""}`}
            >
              <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full mx-auto mb-1 font-medium ${
                isToday ? "bg-blue-600 text-white font-bold" :
                !cell.cur ? "text-gray-300" :
                dow===0 ? "text-red-500" : dow===6 ? "text-blue-500" : "text-gray-700"
              }`}>{cell.date}</div>
              <div className="space-y-0.5">
                {cellDocs.slice(0, 2).map((doc, i) => {
                  const col = DOC_TYPE_CAL_COLOR[doc.documentType] ?? DOC_TYPE_CAL_COLOR.SAFETY_WORK_PERMIT;
                  const single = isSingle(doc);
                  const start = isStart(doc);
                  const end = isEnd(doc);
                  const label = getCalLabel(doc, cell.key);

                  const borderRadius = single ? "4px" : start ? "4px 0 0 4px" : end ? "0 4px 4px 0" : "0";
                  const marginLeft = (!single && !start) ? "-4px" : "0";
                  const marginRight = (!single && !end) ? "-4px" : "0";

                  return (
                    <div key={i}
                      style={{
                        backgroundColor: col.bg,
                        color: col.text,
                        borderLeft: start || single ? `2.5px solid ${col.border}` : "none",
                        borderRadius,
                        marginLeft,
                        marginRight,
                      }}
                      className="text-[9px] px-1 py-0.5 truncate leading-tight font-medium min-h-[14px]"
                    >
                      {label}
                    </div>
                  );
                })}
                {cellDocs.length > 2 && <div className="text-[9px] text-gray-400 pl-1">+{cellDocs.length - 2}건</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 px-4 py-2.5 bg-white border-t border-gray-100">
        {Object.entries(DOC_TYPE_CAL_COLOR).map(([key, col]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: col.border }} />
            <span className="text-xs text-gray-500">{DOC_TYPE_LABEL[key]}</span>
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">승인완료 기준</span>
      </div>
      {selectedDate && selectedDocs.length > 0 && (
        <div className="mx-4 mb-4 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
            </span>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {selectedDocs.map((doc) => {
              const col = DOC_TYPE_CAL_COLOR[doc.documentType] ?? DOC_TYPE_CAL_COLOR.SAFETY_WORK_PERMIT;
              const periodText = doc.workStartDate && doc.workEndDate && doc.workStartDate !== doc.workEndDate
                ? `${doc.workStartDate} ~ ${doc.workEndDate}`
                : doc.workStartDate || "";
              return (
                <div key={doc.id} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => onDocClick(doc)}>
                  <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: col.border }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{doc.taskName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{DOC_TYPE_LABEL[doc.documentType]}</p>
                    <p className="text-xs text-gray-400">{periodText}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ backgroundColor: col.bg, color: col.text }}>
                    승인완료
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 메인 페이지 =====
export default function DashboardPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [documents, setDocuments] = useState<DocumentMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("ALL");
  const [viewMode, setViewMode] = useState<"map" | "calendar">("map");

  const stats = {
    total: documents.length,
    inProgress: documents.filter((d) => d.status === "IN_REVIEW" || d.status === "SUBMITTED").length,
    completed: documents.filter((d) => d.status === "APPROVED").length,
    rejected: documents.filter((d) => d.status === "REJECTED").length,
  };

  useEffect(() => {
    fetch("/api/documents?withLocation=true")
      .then((r) => r.json())
      .then((data) => {
        const docs: DocumentMapItem[] = (data.documents ?? []).map((d: any) => {
          const statusKey = d.status === "IN_REVIEW" && d.currentApprovalOrder === 2 ? "IN_REVIEW_FINAL" : d.status;
          const fd = d.formDataJson ?? {};
          const workStartDate: string | null = fd.workStartDate ?? fd.workDate ?? null;
          const workEndDate: string | null = fd.workEndDate ?? fd.workDate ?? null;
          return {
            id: d.id,
            taskId: d.taskId ?? "",
            taskName: d.task?.name ?? "제목없음",
            company: d.creator?.organization ?? "-",
            type: DOC_TYPE_LABEL[d.documentType] ?? d.documentType,
            documentType: d.documentType,
            status: statusKey,
            currentApprovalOrder: d.currentApprovalOrder,
            lat: d.workLatitude ?? null,
            lng: d.workLongitude ?? null,
            workAddress: d.workAddress ?? null,
            workStartDate,
            workEndDate,
          };
        });
        setDocuments(docs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (document.getElementById("kakao-map-script")) {
      if (window.kakao?.maps) setMapLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => setMapLoaded(true));
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || viewMode !== "map") return;
    const defaultCenter = new window.kakao.maps.LatLng(36.4618, 126.6422);
    const map = new window.kakao.maps.Map(mapRef.current, { center: defaultCenter, level: 9 });
    mapInstanceRef.current = map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { map.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)); map.setLevel(10); },
        () => {}
      );
    }
    const filtered = filterTab === "ALL" ? documents : documents.filter((d) => d.documentType === filterTab);
    filtered.filter((d) => d.lat && d.lng).forEach((doc) => {
      const pos = new window.kakao.maps.LatLng(doc.lat!, doc.lng!);
      const pinColor = STATUS_STYLE[doc.status]?.pin ?? "#2563eb";
      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${pinColor}"/><circle cx="16" cy="16" r="7" fill="white"/></svg>`)}`,
        new window.kakao.maps.Size(32, 40), { offset: new window.kakao.maps.Point(16, 40) }
      );
      const marker = new window.kakao.maps.Marker({ position: pos, map, image: markerImage });
      const periodText = doc.workStartDate && doc.workEndDate && doc.workStartDate !== doc.workEndDate
        ? `${doc.workStartDate} ~ ${doc.workEndDate}`
        : doc.workStartDate || "";
      const shortName = doc.taskName.length > 8 ? doc.taskName.slice(0, 8) + "..." : doc.taskName;
      const labelContent = `<div style="background:${pinColor};color:white;font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);font-family:sans-serif;margin-bottom:4px;">${shortName}</div>`;
      const labelOverlay = new window.kakao.maps.CustomOverlay({ position: pos, content: labelContent, yAnchor: 2.7, map });
      const infoContent = `<div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:140px;font-family:sans-serif;cursor:pointer"><p style="font-size:12px;font-weight:600;color:#111;margin:0 0 2px;">${doc.taskName}</p><p style="font-size:11px;color:#666;margin:0 0 4px;">${doc.type}</p>${doc.workAddress?`<p style="font-size:10px;color:#888;margin:0 0 4px;">${doc.workAddress}</p>`:""}<p style="font-size:10px;color:#888;margin:0 0 4px;">${periodText}</p><span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${pinColor}20;color:${pinColor};font-weight:500;">${STATUS_STYLE[doc.status]?.label??doc.status}</span></div>`;
      const infowindow = new window.kakao.maps.InfoWindow({ content: infoContent, removable: true });
      window.kakao.maps.event.addListener(marker, "click", () => infowindow.open(map, marker));
      void labelOverlay;
    });
  }, [mapLoaded, documents, filterTab, viewMode]);

  const filtered = filterTab === "ALL" ? documents : documents.filter((d) => d.documentType === filterTab);

  const handleDocClick = (doc: DocumentMapItem) => {
    router.push(`/approvals/${doc.id}`);
  };

  return (
    <div className="pb-20">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-2 mx-4 mt-4">
        {[
          { label: "전체",   value: stats.total,      color: "#2563eb", bg: "bg-blue-50" },
          { label: "진행중", value: stats.inProgress,  color: "#d97706", bg: "bg-amber-50" },
          { label: "승인",   value: stats.completed,   color: "#16a34a", bg: "bg-green-50" },
          { label: "반려",   value: stats.rejected,    color: "#dc2626", bg: "bg-red-50" },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} rounded-2xl p-3 text-center`}>
            <div className="text-xl font-bold" style={{ color: item.color }}>{loading ? "-" : item.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ✅ 7번: 탭 글씨 가독성 - text-gray-700로 진하게 */}
      <div className="bg-white border-b border-gray-200 flex mt-4 overflow-x-auto">
        {[
          { key: "ALL",               label: "전체" },
          { key: "SAFETY_WORK_PERMIT",label: "붙임1" },
          { key: "CONFINED_SPACE",    label: "붙임2" },
          { key: "HOLIDAY_WORK",      label: "붙임3" },
          { key: "POWER_OUTAGE",      label: "붙임4" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setFilterTab(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              filterTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 지도/캘린더 전환 */}
      <div className="flex gap-2 mx-4 mt-4">
        {/* ✅ 7번: 버튼 글씨도 text-gray-700 */}
        <button onClick={() => setViewMode("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            viewMode === "map" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          지도 현황
        </button>
        <button onClick={() => setViewMode("calendar")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            viewMode === "calendar" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          캘린더
        </button>
      </div>

      {/* 지도 */}
      {viewMode === "map" && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">작업위치 현황</h3>
            <div className="flex gap-2 text-xs flex-wrap justify-end">
              {Object.entries(STATUS_STYLE).filter(([k]) => k !== "DRAFT").map(([key, val]) => (
                <span key={key} className="flex items-center gap-1 text-gray-700">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: val.pin }}/>
                  {val.label}
                </span>
              ))}
            </div>
          </div>
          <div ref={mapRef} style={{ width: "100%", height: "320px" }}>
            {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-sm text-gray-400">지도 로딩 중...</p></div>}
          </div>
        </div>
      )}

      {/* 캘린더 */}
      {viewMode === "calendar" && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : (
            <CalendarView documents={filtered} onDocClick={handleDocClick} />
          )}
        </div>
      )}

      {/* 서류 목록 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">서류 목록</h3>
          <span className="text-xs text-gray-500">{filtered.length}건</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">해당하는 서류가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1e3a5f" }}>
                  <th className="text-left px-3 py-2.5 text-white font-medium">용역명</th>
                  <th className="text-center px-2 py-2.5 text-white font-medium">서류종류</th>
                  <th className="text-center px-2 py-2.5 text-white font-medium">업체</th>
                  <th className="text-center px-2 py-2.5 text-white font-medium">위치</th>
                  <th className="text-center px-2 py-2.5 text-white font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, idx) => {
                  const s = STATUS_STYLE[doc.status] ?? STATUS_STYLE["DRAFT"];
                  return (
                    <tr key={doc.id}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      onClick={() => handleDocClick(doc)}
                    >
                      <td className="px-3 py-2.5 text-gray-800 font-medium max-w-[110px] truncate">{doc.taskName}</td>
                      <td className="text-center px-2 py-2.5 text-gray-700">{doc.type}</td>
                      <td className="text-center px-2 py-2.5 text-gray-700 max-w-[80px] truncate">{doc.company}</td>
                      <td className="text-center px-2 py-2.5">
                        {doc.lat ? <span className="text-blue-500">📍</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="text-center px-2 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
