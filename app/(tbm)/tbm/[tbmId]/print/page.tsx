"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function TbmPrintPage() {
  const params = useParams();
  const tbmId = params.tbmId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tbm/${tbmId}`).then(r => r.json()).then(d => {
      setReport(d.tbmReport);
      setLoading(false);
      // 데이터 로드 후 자동 인쇄
      setTimeout(() => window.print(), 600);
    }).catch(() => setLoading(false));
  }, [tbmId]);

  if (loading) return <div style={{padding:40,textAlign:"center"}}>로딩 중...</div>;
  if (!report) return <div style={{padding:40,textAlign:"center"}}>보고서를 찾을 수 없습니다.</div>;

  const riskRows = [1,2,3].map(n => ({
    factor: report[`riskFactor${n}`] || "",
    measure: report[`riskMeasure${n}`] || "",
  }));
  const elemRows = [1,2,3].map(n => report[`riskElement${n}`] || "");

  return (
    <div style={{ fontFamily: "나눔고딕,맑은고딕,AppleGothic,sans-serif", padding: "12mm 15mm", minHeight: "297mm", background: "white", fontSize: "9pt", color: "#111" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #555; padding: 4px 6px; vertical-align: middle; }
        .label { background: #f5f5f5; font-weight: bold; text-align: center; white-space: nowrap; }
        .header-row td { background: #e8e8e8; font-weight: bold; text-align: center; }
      `}</style>

      <div className="no-print" style={{marginBottom:16,display:"flex",gap:8}}>
        <button onClick={() => window.print()} style={{padding:"6px 16px",background:"#2563eb",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>인쇄</button>
        <button onClick={() => window.close()} style={{padding:"6px 16px",background:"#6b7280",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>닫기</button>
      </div>

      {/* 제목 */}
      <div style={{textAlign:"center",fontWeight:"bold",fontSize:"14pt",marginBottom:12}}>
        Tool Box Meeting 회의록
      </div>

      {/* 상단 테이블 */}
      <table style={{marginBottom:4}}>
        <tbody>
          <tr>
            <td className="label" style={{width:"12%"}}>TBM리더</td>
            <td colSpan={2}>◆ 소속 : {report.contractorName || ""}</td>
            <td className="label" style={{width:"8%"}}>이름</td>
            <td style={{width:"15%"}}>{report.instructorName || ""}</td>
            <td style={{width:"12%",textAlign:"center"}}>
              {report.signatureData && <img src={report.signatureData} alt="서명" style={{height:32,objectFit:"contain"}} />}
              (서명)
            </td>
          </tr>
          <tr>
            <td className="label">TBM 일시</td>
            <td colSpan={5}>{report.reportDate} {report.eduStartTime}~{report.eduEndTime} ({Math.round((()=>{try{const[sh,sm]=(report.eduStartTime||"0:0").split(":").map(Number);const[eh,em]=(report.eduEndTime||"0:0").split(":").map(Number);return((eh*60+em)-(sh*60+sm));}catch{return 0;}})())} 분) 작업 날짜와 동일함</td>
          </tr>
          <tr>
            <td className="label">작업명</td>
            <td colSpan={5}>{report.projectName || ""} {report.facilityName ? `(${report.facilityName})` : ""}</td>
          </tr>
          <tr>
            <td className="label">작업내용</td>
            <td colSpan={5}>{report.workToday || ""}</td>
          </tr>
          <tr>
            <td className="label">TBM 장소</td>
            <td colSpan={3}>{report.workAddress || ""}</td>
            <td className="label">위험성평가
실시여부</td>
            <td colSpan={1} style={{textAlign:"center"}}>예 ☑ &nbsp;아니오 □</td>
          </tr>
        </tbody>
      </table>

      {/* 위험요인 테이블 */}
      <table style={{marginBottom:4}}>
        <thead>
          <tr className="header-row">
            <th style={{width:"50%"}}>잠재위험요인(수시위험성평가와 연계)</th>
            <th style={{width:"50%"}}>대책(제거&gt;대체&gt;통제 순서고리)</th>
          </tr>
        </thead>
        <tbody>
          {riskRows.map((row, i) => (
            <tr key={i}>
              <td style={{minHeight:28}}>{i+1}. {row.factor}</td>
              <td>{i+1}. {row.measure}</td>
            </tr>
          ))}
          <tr>
            <td className="label">중점위험 요인</td>
            <td>선정: {report.mainRiskFactor || ""}</td>
          </tr>
          <tr>
            <td colSpan={2}>대책: {report.mainRiskMeasure || ""}</td>
          </tr>
        </tbody>
      </table>

      <div style={{fontSize:"8pt",marginBottom:4}}>■ 작업 전 안전조치 확인 ※ 위 잠재위험요인(중점위험 포함) 안전조치 여부 재확인</div>

      {/* 잠재위험요소 */}
      <table style={{marginBottom:4}}>
        <thead>
          <tr className="header-row">
            <th style={{width:"70%"}}>잠재위험요소(중점위험 포함)</th>
            <th style={{width:"30%"}}>조치여부</th>
          </tr>
        </thead>
        <tbody>
          {elemRows.map((elem, i) => (
            <tr key={i}>
              <td>{i+1}. {elem}</td>
              <td style={{textAlign:"center"}}>예 ☑ &nbsp;아니오 □</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{fontSize:"8pt",marginBottom:4}}>■ 작업 전 일일안전점검 시행 결과 ※ 공사현장 일일안전점검을 통해 위험성평가가 이행 확인</div>
      <div style={{fontSize:"8pt",marginBottom:8}}>■ 기타사항(교육내용, 제안제도, 아차사고 등)</div>
      <div style={{border:"1px solid #555",minHeight:60,padding:6,marginBottom:8,whiteSpace:"pre-wrap",fontSize:"9pt"}}>{report.otherContent || ""}</div>

      {/* 추진인원/장비 + 사진 */}
      <table>
        <thead>
          <tr className="header-row">
            <th style={{width:"33%"}}>TBM 실시사진</th>
            <th style={{width:"33%"}}>투입인원</th>
            <th style={{width:"34%"}}>투입장비</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{height:120,textAlign:"center",verticalAlign:"middle",padding:4}}>
              {report.photoUrl
                ? <img src={report.photoUrl} alt="TBM사진" style={{maxWidth:"100%",maxHeight:110,objectFit:"contain"}} />
                : <span style={{color:"#aaa",fontSize:"8pt"}}>사진 없음</span>
              }
            </td>
            <td style={{verticalAlign:"top",padding:6}}>
              - 반장 1명<br/>
              - 보인 {Math.max(0,(report.workerCount||1)-1)}명
              {report.newWorkerCount > 0 && <><br/>(신규 {report.newWorkerCount}명)</>}
            </td>
            <td style={{verticalAlign:"top",padding:6}}>{report.equipment ? `- ${report.equipment}` : "- 없음"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
