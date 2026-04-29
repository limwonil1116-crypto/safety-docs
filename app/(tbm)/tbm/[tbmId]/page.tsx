"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function TbmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tbmId = params.tbmId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tbm/${tbmId}`).then(r => r.json()).then(d => {
      setReport(d.tbmReport);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tbmId]);

  const Field = ({ label, value }: { label: string; value?: any }) => {
    if (value === null || value === undefined || value === "") return null;
    const display = typeof value === "boolean" ? (value ? "사용중" : "사용안함") : String(value);
    return (
      <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-900">{display}</span>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>;
  if (!report) return <div className="p-8 text-center text-red-500 text-sm">보고서를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">TBM 보고서</h1>
          <p className="text-xs text-gray-500">{report.reportDate}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">기본정보</h3>
          <Field label="교육 일자" value={report.reportDate} />
          <Field label="교육 시간" value={report.eduStartTime && report.eduEndTime ? `${report.eduStartTime} ~ ${report.eduEndTime}` : report.eduStartTime} />
          <Field label="본부" value={report.headquarters} />
          <Field label="지사" value={report.branch} />
          <Field label="사업명" value={report.projectName} />
          <Field label="사업종류" value={report.projectType} />
          <Field label="시공사명" value={report.contractorName} />
          <Field label="시설물명" value={report.facilityName} />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">작업정보</h3>
          <Field label="금일작업" value={report.workToday} />
          <Field label="작업주소" value={report.workAddress} />
          <Field label="투입인원" value={report.workerCount ? `${report.workerCount}명` : null} />
          <Field label="신규근로자" value={report.newWorkerCount ? `${report.newWorkerCount}명` : null} />
          <Field label="투입장비" value={report.equipment} />
          <Field label="위험공종" value={report.riskType} />
          <Field label="CCTV" value={report.cctvUsed} />
        </div>

        {(report.riskFactor1 || report.riskFactor2 || report.riskFactor3 || report.mainRiskFactor) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">위험요인 및 대책</h3>
            {[1,2,3].map(n => report[`riskFactor${n}`] ? (
              <div key={n} className="mb-3 bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">잠재위험요인 {n}</p>
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
                <p className="text-xs font-semibold text-gray-600 mb-1">잠재위험요소</p>
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

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">교육담당자</h3>
          <Field label="성함" value={report.instructorName} />
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
