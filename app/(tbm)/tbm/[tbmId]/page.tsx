"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

declare global { interface Window { kakao: any; } }

export default function TbmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tbmId = params.tbmId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapLoaded = useRef(false);

  useEffect(() => {
    fetch(`/api/tbm/${tbmId}`).then(r => r.json()).then(d => {
      setReport(d.tbmReport);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tbmId]);

  useEffect(() => {
    if (!report || !report.workLatitude || !report.workLongitude || !mapRef.current || mapLoaded.current) return;
    const lat = parseFloat(report.workLatitude);
    const lng = parseFloat(report.workLongitude);
    const initMap = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 4 });
        new window.kakao.maps.Marker({ position: center, map });
        mapLoaded.current = true;
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
  }, [report]);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/tbm/${tbmId}/pdf`);
      if (!res.ok) throw new Error("PDF 생성 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setPdfLoading(false);
    }
  };

  const Field = ({ label, value }: { label: string; value?: any }) => {
    if (value === null || value === undefined || value === "") return null;
    const display = typeof value === "boolean" ? (value ? "사용" : "미사용") : String(value);
    return (
      <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-900">{display}</span>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">로딩 중..</div>;
  if (!report) return <div className="p-8 text-center text-red-500 text-sm">보고서를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">TBM 보고서</h1>
            <p className="text-xs text-gray-500">{report.reportDate}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePdf}
            disabled={pdfLoading}
            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {pdfLoading ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            )}
            PDF
          </button>
          <button onClick={() => router.push(`/tbm/new?editId=${tbmId}`)}
            className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium">수정</button>
          <button onClick={async () => {
            if (!confirm("삭제하시겠습니까?")) return;
            await fetch(`/api/tbm/${tbmId}`, { method: "DELETE" });
            router.push("/tbm");
          }} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium">삭제</button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">기본정보</h3>
          <Field label="보고일자" value={report.reportDate} />
          <Field label="교육시간" value={report.eduStartTime && report.eduEndTime ? `${report.eduStartTime} ~ ${report.eduEndTime}` : report.eduStartTime} />
          <Field label="본부" value={report.headquarters} />
          <Field label="지소" value={report.branch} />
          <Field label="사업명" value={report.projectName} />
          <Field label="사업유형" value={report.projectType} />
          <Field label="수급사명" value={report.contractorName} />
          <Field label="시설명" value={report.facilityName} />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">작업정보</h3>
          <Field label="당일작업" value={report.workToday} />
          <Field label="작업장소" value={report.workAddress} />

          {report.workLatitude && report.workLongitude && (
            <div className="mt-2 mb-2">
              <div ref={mapRef} style={{ width: "100%", height: "200px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">지도 로딩 중..</div>
              </div>
            </div>
          )}

          <Field label="작업인원" value={report.workerCount ? `${report.workerCount}명` : null} />
          <Field label="신규입장자" value={report.newWorkerCount ? `${report.newWorkerCount}명` : null} />
          <Field label="작업기계" value={report.equipment} />
          <Field label="위험종별" value={report.riskType} />
          <Field label="CCTV" value={report.cctvUsed} />
        </div>

        {(report.riskFactor1 || report.riskFactor2 || report.riskFactor3 || report.mainRiskFactor) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">위험요인 및 조치</h3>
            {[1,2,3].map(n => report[`riskFactor${n}`] ? (
              <div key={n} className="mb-3 bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">위험요인 {n}</p>
                <p className="text-sm text-gray-800">{report[`riskFactor${n}`]}</p>
                {report[`riskMeasure${n}`] && <p className="text-xs text-blue-600 mt-1">{report[`riskMeasure${n}`]}</p>}
              </div>
            ) : null)}
            {report.mainRiskFactor && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 mb-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">중점위험요인</p>
                <p className="text-sm text-gray-800">{report.mainRiskFactor}</p>
                {report.mainRiskMeasure && <p className="text-xs text-amber-600 mt-1">{report.mainRiskMeasure}</p>}
              </div>
            )}
            {(report.riskElement1 || report.riskElement2 || report.riskElement3) && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">위험요소</p>
                {[1,2,3].map(n => report[`riskElement${n}`] ? <p key={n} className="text-sm text-gray-700">{report[`riskElement${n}`]}</p> : null)}
              </div>
            )}
          </div>
        )}

        {report.otherContent && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-2">기타사항</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.otherContent}</p>
          </div>
        )}

        {report.photoUrl && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">TBM 현장사진</h3>
            <img src={report.photoUrl} alt="TBM 현장사진" className="w-full rounded-xl object-cover max-h-64" />
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">교육담당자</h3>
          <Field label="성명" value={report.instructorName} />
          <Field label="연락처" value={report.instructorPhone} />
          {report.signatureData && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">서명</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white inline-block">
                <img src={report.signatureData} alt="서명" className="h-16 object-contain px-3" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
