// lib/pdf/templates.tsx
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";

const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "NanumGothic",
  fonts: [
    { src: path.join(fontDir, "NanumGothic-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontDir, "NanumGothic-Bold.ttf"),    fontWeight: "bold" },
  ],
});

const C = {
  navy:      "#1a3a5c",
  sectionBg: "#bdd7ee",
  greenBg:   "#e2efda",
  thBg:      "#9dc3e6",
  rowEven:   "#deeaf1",
  border:    "#7f9fbf",
  labelBg:   "#f2f2f2",
  white:     "#ffffff",
};

const S = StyleSheet.create({
  page: { fontFamily: "NanumGothic", fontSize: 9, paddingTop: 14, paddingBottom: 24, paddingHorizontal: 18, color: "#000" },
  titleBox: { border: "1.5px solid " + C.border, paddingVertical: 9, marginBottom: 5 },
  titleMain: { fontSize: 17, fontWeight: "bold", textAlign: "center" },
  titleSub: { fontSize: 11, fontWeight: "normal" },
  secBlue: { backgroundColor: C.sectionBg, border: "0.8px solid " + C.border, padding: "4 6", fontSize: 9, fontWeight: "bold", marginBottom: 0 },
  secGreen: { backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "4 7", fontSize: 9, fontWeight: "bold", marginBottom: 1 },
  table: { border: "0.8px solid " + C.border, marginBottom: 5 },
  tr: { flexDirection: "row", borderBottom: "0.5px solid " + C.border },
  trLast: { flexDirection: "row" },
  th: { backgroundColor: C.thBg, fontWeight: "bold", padding: "4 4", fontSize: 9, borderRight: "0.5px solid " + C.border, textAlign: "center" },
  td: { padding: "3 5", fontSize: 9, borderRight: "0.5px solid " + C.border },
  tdc: { padding: "3 5", fontSize: 9, borderRight: "0.5px solid " + C.border, textAlign: "center" },
  il: { fontWeight: "bold", padding: "3 6", fontSize: 9, borderRight: "0.5px solid " + C.border, backgroundColor: C.labelBg },
  iv: { flex: 1, padding: "3 6", fontSize: 9 },
  footer: { position: "absolute", bottom: 9, left: 18, right: 18, borderTop: "0.5px solid #aaa", paddingTop: 3, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#666" },
});

function CB({ checked }: { checked: boolean }) {
  return (
    <View style={{ width: 9, height: 9, marginRight: 3, alignItems: "center", justifyContent: "center", border: checked ? "0.8px solid " + C.navy : "0.8px solid #444", backgroundColor: checked ? C.navy : C.white }}>
      {checked && <Text style={{ color: "white", fontSize: 6.5 }}>v</Text>}
    </View>
  );
}

function Footer({ documentId, createdAt }: { documentId: string; createdAt: string }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>{`문서번호: ${documentId.slice(0, 8)}`}</Text>
      <Text style={S.footerText}>{`생성일시: ${new Date(createdAt).toLocaleString("ko-KR")} | 한국농어촌공사 안전관리시스템`}</Text>
    </View>
  );
}

// ===== 날짜+시간 → "M월 D일 HH:MM" 형식 변환 =====
function formatDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const datePart = `${month}월 ${day}일`;
    if (!timeStr) return datePart;
    // "09:00" → "09시 00분"
    const [h, m] = timeStr.split(":");
    const timePart = `${h}시 ${m || "00"}분`;
    return `${datePart} ${timePart}`;
  } catch {
    return `${dateStr} ${timeStr || ""}`;
  }
}

// "2026-04-18 09:00 ~ 2026-04-23 18:00" 형식으로 작업수행시간 생성
function buildWorkPeriodText(fd: Record<string, any>): string {
  const startDate = fd.workStartDate || fd.workDate || "";
  const endDate   = fd.workEndDate   || fd.workDate || "";
  const startTime = fd.workStartTime || "";
  const endTime   = fd.workEndTime   || "";

  if (!startDate) return "";

  const start = formatDateTime(startDate, startTime);
  const end   = formatDateTime(endDate,   endTime);

  if (start === end) return start;
  return `${start} ~ ${end}`;
}

// ===== 붙임1 전용: 신청인 행에 서명 이미지 인라인 =====
function ApplicantRowWithSign({ applicantCompany, applicantTitle, applicantName, signatureData }: {
  applicantCompany?: string;
  applicantTitle?: string;
  applicantName?: string;
  signatureData?: string;
}) {
  return (
    <View style={[S.tr, { alignItems: "center", minHeight: 28 }]}>
      <Text style={[S.il, { width: 75 }]}>신청인</Text>
      <Text style={[S.iv, { flex: 1, borderRight: "0.5px solid " + C.border }]}>{`(업체명) ${applicantCompany || ""}`}</Text>
      <Text style={[S.iv, { flex: 1, borderRight: "0.5px solid " + C.border }]}>{`(직책) ${applicantTitle || ""}`}</Text>
      <View style={{ flex: 1.5, flexDirection: "row", alignItems: "center", padding: "2 5", gap: 4 }}>
        <Text style={{ fontSize: 9, flex: 1 }}>{`(성명) ${applicantName || ""}`}</Text>
        {signatureData
          ? <Image src={signatureData} style={{ width: 55, height: 22, objectFit: "contain" }} />
          : <View style={{ width: 55, height: 22, border: "0.5px dashed #ccc" }} />}
      </View>
    </View>
  );
}

// ===== 붙임2/3/4 신청인 행 (상단 표에 인라인 서명 포함) =====
// "○ 신 청 인" 레이블 행에 서명 이미지까지 포함
function ConfinedApplicantRow({ label, applicantCompany, applicantTitle, applicantName, signatureData, labelWidth = 98 }: {
  label: string;
  applicantCompany?: string;
  applicantTitle?: string;
  applicantName?: string;
  signatureData?: string;
  labelWidth?: number;
}) {
  return (
    <View style={[S.tr, { alignItems: "center", minHeight: 26 }]}>
      <Text style={[S.il, { width: labelWidth }]}>{label}</Text>
      {/* 업체명 직책 성명 */}
      <Text style={[S.iv, { flex: 2, borderRight: "0.5px solid " + C.border }]}>
        {`(업체명) ${applicantCompany || ""}   (직책) ${applicantTitle || ""}   (성명) ${applicantName || ""}`}
      </Text>
      {/* 서명 이미지 */}
      <View style={{ width: 70, padding: "2 4", alignItems: "center", justifyContent: "center" }}>
        {signatureData
          ? <Image src={signatureData} style={{ width: 62, height: 20, objectFit: "contain" }} />
          : <View style={{ width: 62, height: 20, border: "0.5px dashed #ccc" }} />}
      </View>
    </View>
  );
}

// ===== 허가자/확인자 서명란 - 표 형태 =====
// | (역할) 허가자              |
// | (부서) 안전기술본부 (직책) 용역감독원 |
// | (성명) 임원일  서명: [이미지] |
function ApproverSignTable({ entries, marginTop = 7 }: {
  entries: Array<{ roleLabel: string; deptLabel?: string; name?: string; signatureData?: string }>;
  marginTop?: number;
}) {
  return (
    <View style={{ border: "0.8px solid " + C.border, marginTop }}>
      {entries.map((e, i) => (
        <View key={i} style={{
          borderBottom: i < entries.length - 1 ? "0.5px solid " + C.border : "none",
        }}>
          {/* 역할 헤더 행 */}
          <View style={{
            backgroundColor: C.sectionBg,
            borderBottom: "0.5px solid " + C.border,
            padding: "3 6",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: C.navy }}>{e.roleLabel}</Text>
            {e.deptLabel && (
              <Text style={{ fontSize: 7, color: "#444" }}>{e.deptLabel}</Text>
            )}
          </View>
          {/* 성명 + 서명 행 */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: "4 6", minHeight: 32 }}>
            {/* 성명 */}
            <Text style={{ fontSize: 9, flex: 1 }}>{`(성명) ${e.name || ""}`}</Text>
            {/* 서명 레이블 + 이미지 */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderLeft: "0.5px solid " + C.border, paddingLeft: 8 }}>
              <Text style={{ fontSize: 8, color: "#666" }}>서명</Text>
              <View style={{ width: 1, height: 20, backgroundColor: C.border, marginHorizontal: 3 }} />
              {e.signatureData
                ? <Image src={e.signatureData} style={{ width: 80, height: 28, objectFit: "contain" }} />
                : <View style={{ width: 80, height: 28, border: "0.5px dashed #ccc" }} />}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// 붙임1 하단 서명란: 검토자/허가자 표
function SignSection1({ entries }: {
  entries: Array<{ roleLabel: string; deptLabel?: string; name?: string; signatureData?: string }>;
}) {
  return (
    <View style={{ border: "0.8px solid " + C.border, marginTop: 7, flexDirection: "row" }}>
      {entries.map((e, i) => (
        <View key={i} style={{
          flex: 1,
          borderRight: i < entries.length - 1 ? "0.5px solid " + C.border : "none",
          padding: "5 6",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 70,
        }}>
          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: C.navy, textAlign: "center" }}>{e.roleLabel}</Text>
          {e.deptLabel && <Text style={{ fontSize: 6.5, color: "#555", textAlign: "center", marginTop: 1 }}>{e.deptLabel}</Text>}
          <View style={{ position: "relative", width: 80, height: 38, marginTop: 4, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 8, color: "#aaa" }}>(서명)</Text>
            {e.signatureData && <Image src={e.signatureData} style={{ position: "absolute", top: 0, left: 0, width: 80, height: 38, objectFit: "contain" }} />}
          </View>
          <Text style={{ fontSize: 8.5, textAlign: "center", marginTop: 2 }}>{`(성명) ${e.name || ""}`}</Text>
        </View>
      ))}
    </View>
  );
}

// ===== 붙임1: 안전작업허가서 =====
export function SafetyWorkPermitPDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
}) {
  const riskRows = fd.riskRows ?? [{ riskFactor: "", improvement: "", disasterType: "" }];
  const a1 = approvalLines.find((l) => l.approvalOrder === 1);
  const a2 = approvalLines.find((l) => l.approvalOrder === 2);
  const riskTypeList = [
    { key: "riskHighPlace",     label: "2.0m 이상 고소작업" },
    { key: "riskWaterWork",     label: "수상 또는 수변작업" },
    { key: "riskConfinedSpace", label: "밀폐공간(복통 포함)작업" },
    { key: "riskPowerOutage",   label: "정전작업" },
    { key: "riskFireWork",      label: "화기작업" },
    { key: "riskOther",         label: `기타(발주자 요청)${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}` },
  ];
  const factorList = [
    { key: "factorNarrowAccess",  label: "진출입로 협소" },
    { key: "factorSlippery",      label: "미끄러짐(이끼, 습기)" },
    { key: "factorSteepSlope",    label: "급경사" },
    { key: "factorWaterHazard",   label: "파랑·유수·수심" },
    { key: "factorRockfall",      label: "낙석·토사붕괴" },
    { key: "factorNoRailing",     label: "난간 미설치" },
    { key: "factorLadderNoGuard", label: "사다리·방호울 미설치" },
    { key: "factorSuffocation",   label: "질식·화재·폭발" },
    { key: "factorElectricFire",  label: "감전·전기불꽃 화재" },
    { key: "factorSparkFire",     label: "스파크·화염에 의한 화재" },
  ];
  const workPeriodText = buildWorkPeriodText(fd);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}><Text style={S.titleMain}>안 전 작 업 허 가 서</Text></View>
        <Text style={{ fontSize: 8, textAlign: "center", marginBottom: 5, color: "#555" }}>{"<서식 16> 6.4 안전작업허가 관련"}</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.il, { width: 75 }]}>요청일시</Text>
            <Text style={[S.iv, { borderRight: "0.5px solid " + C.border }]}>{fd.requestDate||""}</Text>
            <Text style={[S.il, { width: 60 }]}>작업기간</Text>
            <Text style={S.iv}>{workPeriodText}</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.il, { width: 75 }]}>작업장소</Text>
            <Text style={S.iv}>{fd.workLocation||""}</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.il, { width: 75 }]}>용역명</Text>
            <Text style={S.iv}>{taskName || fd.projectName || ""}</Text>
          </View>
          <ApplicantRowWithSign
            applicantCompany={fd.applicantCompany}
            applicantTitle={fd.applicantTitle}
            applicantName={fd.applicantName}
            signatureData={applicantSignature}
          />
          <View style={S.tr}>
            <Text style={[S.il, { width: 75 }]}>작업 내용</Text>
            <Text style={S.iv}>{fd.workContent||""}</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 75 }]}>작업자명단</Text>
            <Text style={S.iv}>{fd.participants||""}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 8.5, textAlign: "center", marginBottom: 4 }}>위 작업을 다음의 조건하에서만 허가함.</Text>
        <Text style={S.secBlue}>1. 위험공종 확인내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 2 }]}>작업허가제 대상공종 (관련공종 체크)</Text>
            <Text style={[S.th, { flex: 2 }]}>관련작업(장소)</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>예상되는 위험요소</Text>
          </View>
          <View style={[S.trLast, { minHeight: 80 }]}>
            <View style={[S.td, { flex: 2 }]}>
              {riskTypeList.map((item) => (
                <View key={item.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 2.5 }}>
                  <CB checked={!!fd[item.key]} />
                  <Text style={{ fontSize: 8.5 }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={[S.td, { flex: 2 }]}>
              <Text style={{ fontSize: 8.5 }}>{[fd.riskHighPlaceDetail, fd.riskWaterWorkDetail].filter(Boolean).join("\n")||""}</Text>
            </View>
            <View style={[S.td, { flex: 2, borderRight: 0 }]}>
              {factorList.filter((f) => fd[f.key]).map((f) => (
                <Text key={f.key} style={{ fontSize: 8.5 }}>• {f.label}</Text>
              ))}
              {fd.factorOther && fd.factorOtherDetail && <Text style={{ fontSize: 8.5 }}>• 기타: {fd.factorOtherDetail}</Text>}
            </View>
          </View>
        </View>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 3 }]}>위험요소 (위험성 평가 결과 요약)</Text>
            <Text style={[S.th, { flex: 3 }]}>개선대책 (개선대책 결과 요약)</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>재해형태</Text>
          </View>
          {riskRows.map((row: any, idx: number) => (
            <View key={idx} style={idx === riskRows.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 3, minHeight: 20 }]}>{row.riskFactor||""}</Text>
              <Text style={[S.td, { flex: 3, minHeight: 20 }]}>{row.improvement||""}</Text>
              <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 20 }]}>{row.disasterType||""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secBlue}>2. 용역감독 검토내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>검토의견</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>조치결과</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.td, { flex: 1, minHeight: 35 }]}>{fd.reviewOpinion||""}</Text>
            <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 35 }]}>{fd.reviewResult||""}</Text>
          </View>
        </View>
        <SignSection1 entries={[
          { roleLabel: "최종 검토자 (용역감독)", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "최종 허가자 (용역감독)", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a2?.approverName, signatureData: a2?.signatureData },
        ]} />
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}

// ===== 붙임2: 밀폐공간작업허가서 =====
export function ConfinedSpacePDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
}) {
  const checks: Array<{ label: string; applicable: string; result: string }> = fd.safetyChecks ?? [];
  const a1 = approvalLines.find((l) => l.approvalOrder === 1);
  const a2 = approvalLines.find((l) => l.approvalOrder === 2);
  const workPeriodText = buildWorkPeriodText(fd);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}>
          <Text style={S.titleMain}>밀폐공간 작업 허가서<Text style={S.titleSub}>(수급업체용)</Text></Text>
        </View>
        <View style={S.table}>
          {/* 신청인 - 맨 위, 서명 포함 */}
          <ConfinedApplicantRow
            label="○ 신 청 인"
            applicantCompany={fd.applicantCompany}
            applicantTitle={fd.applicantTitle}
            applicantName={fd.applicantName}
            signatureData={applicantSignature}
          />
          {[
            { label: "○ 용 역 명", val: taskName || fd.serviceName || "" },
            { label: "○ 작업수행시간", val: workPeriodText },
            { label: "○ 작 업 장 소", val: fd.workLocation || "" },
            { label: "○ 작 업 내 용", val: fd.workContent || "" },
            { label: "○ 출입자 명단", val: fd.entryList || "" },
          ].map((row, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.il, { width: 98 }]}>{row.label}</Text>
              <Text style={[S.iv, { borderRight: 0, minHeight: 18 }]}>{row.val}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 8.5, textAlign: "center", marginBottom: 3 }}>위 공간에서의 작업을 다음의 조건하에서만 허가함.</Text>
        <View style={S.secGreen}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>1. 화기작업 허가 필요여부 :   </Text>
            <CB checked={fd.needFireWork === "필요"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needFireWork === "불필요"} /><Text style={{ fontSize: 9 }}> 불필요</Text>
          </View>
        </View>
        <View style={[S.secGreen, { marginBottom: 5 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>2. 내연기관(양수기) 등 사용여부 :   </Text>
            <CB checked={fd.useInternalEngine === "사용"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 사용   </Text>
            <CB checked={fd.useInternalEngine === "미사용"} /><Text style={{ fontSize: 9 }}> 미사용</Text>
          </View>
        </View>
        <Text style={S.secBlue}>3. 안전조치 요구사항</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 4 }]}>확인항목</Text>
            <Text style={[S.th, { flex: 1 }]}>해당여부</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>확인결과</Text>
          </View>
          {checks.map((item, idx) => (
            <View key={idx} style={idx === checks.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 4, minHeight: 18, backgroundColor: idx % 2 === 1 ? C.rowEven : C.white }]}>{`○ ${item.label}`}</Text>
              <Text style={[S.tdc, { flex: 1, minHeight: 18, backgroundColor: item.applicable === "해당" ? "#dce6f0" : C.white }]}>{item.applicable||""}</Text>
              <Text style={[S.tdc, { flex: 2, borderRight: 0, minHeight: 18, backgroundColor: item.result ? "#ebf3e8" : C.white }]}>{item.result||""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secBlue}>5. 특별조치 필요사항</Text>
        <View style={[S.table, { marginBottom: 5 }]}>
          <Text style={[S.td, { borderRight: 0, minHeight: 40 }]}>{fd.specialMeasures||""}</Text>
        </View>
        {/* 허가자/확인자 서명 표: (성명) 000  서명: [이미지] */}
        <ApproverSignTable entries={[
          { roleLabel: "(계획확인) 허가자", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "(이행확인) 확인자", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a2?.approverName, signatureData: a2?.signatureData },
        ]} />
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}

// ===== 붙임3: 휴일작업신청서 =====
export function HolidayWorkPDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
}) {
  const participants: Array<{ role: string; name: string; phone: string }> = fd.participants ?? [];
  const a1 = approvalLines.find((l) => l.approvalOrder === 1);
  const a2 = approvalLines.find((l) => l.approvalOrder === 2);
  const workPeriodText = buildWorkPeriodText(fd);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}><Text style={S.titleMain}>용역현장 휴일작업 신청서</Text></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 9 }}>{`작업일시: ${workPeriodText}`}</Text>
          <Text style={{ fontSize: 9 }}>{`신고일시: ${fd.requestDate||""}`}</Text>
        </View>
        <Text style={S.secBlue}>1. 용역 개요</Text>
        <View style={S.table}>
          <View style={S.tr}><Text style={[S.il, { width: 55 }]}>용역명</Text><Text style={[S.iv, { borderRight: 0 }]}>{taskName || fd.serviceName || ""}</Text></View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 55 }]}>수급인</Text>
            <Text style={[S.iv, { flex: 1, borderRight: "0.5px solid " + C.border }]}>{fd.contractorCompany||""}</Text>
            <Text style={[S.il, { width: 52 }]}>용역기간</Text>
            <Text style={[S.iv, { flex: 1, borderRight: 0 }]}>{`${fd.contractPeriodStart||""} ~ ${fd.contractPeriodEnd||""}`}</Text>
          </View>
        </View>
        <Text style={S.secBlue}>2. 휴일작업 개요</Text>
        <View style={S.table}>
          {[
            [{ w: 72, label: "작업대상 시설물", val: fd.facilityName }, { w: 52, label: "시설관리자", val: `${fd.facilityManager||""} (${fd.facilityManagerGrade||""})` }],
            [{ w: 72, label: "위치", val: fd.facilityLocation }, { w: 52, label: "작업위치", val: fd.workPosition }],
            [{ w: 72, label: "작업공종", val: fd.workContents }, { w: 52, label: "위험요소", val: fd.riskFactors }],
          ].map((cols, ri) => (
            <View key={ri} style={S.tr}>
              {cols.map((c, ci) => (
                <React.Fragment key={ci}>
                  <Text style={[S.il, { width: c.w }]}>{c.label}</Text>
                  <Text style={[S.iv, ci < cols.length - 1 ? { borderRight: "0.5px solid " + C.border } : { borderRight: 0 }]}>{c.val||""}</Text>
                </React.Fragment>
              ))}
            </View>
          ))}
          <View style={S.trLast}><Text style={[S.il, { width: 72 }]}>개선대책</Text><Text style={[S.iv, { borderRight: 0 }]}>{fd.improvementMeasures||""}</Text></View>
        </View>
        <Text style={S.secBlue}>휴일작업 참여자 (상주인력)</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 2 }]}>역할</Text>
            <Text style={[S.th, { flex: 2 }]}>성명</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>연락처</Text>
          </View>
          {participants.map((p, idx) => (
            <View key={idx} style={idx === participants.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 2, minHeight: 18 }]}>{p.role||""}</Text>
              <Text style={[S.td, { flex: 2, minHeight: 18 }]}>{p.name||""}</Text>
              <Text style={[S.td, { flex: 2, borderRight: 0, minHeight: 18 }]}>{p.phone||""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secBlue}>3. 용역감독원 검토내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>검토의견</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>조치결과</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.td, { flex: 1, minHeight: 30 }]}>{fd.reviewOpinion||""}</Text>
            <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 30 }]}>{fd.reviewResult||""}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 9, textAlign: "center", marginVertical: 4 }}>위와 같이 휴일작업을 신청하오니 승인하여 주시기 바랍니다.</Text>
        {/* 신청자 서명 */}
        <View style={{ border: "0.8px solid " + C.border, marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: "4 6", minHeight: 30 }}>
            <Text style={{ fontSize: 8.5, flex: 1 }}>
              {`신청자 (안전보건관리책임자)   소속: ${fd.applicantOrg||""}   (성명) ${fd.applicantName||""}`}
            </Text>
            {applicantSignature
              ? <Image src={applicantSignature} style={{ width: 70, height: 24, objectFit: "contain" }} />
              : <View style={{ width: 70, height: 24, border: "0.5px dashed #ccc" }} />}
          </View>
        </View>
        {/* 검토자/승인자 서명 표 */}
        <ApproverSignTable entries={[
          { roleLabel: "검토자 (용역감독원)", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "승인자 (관리감독자)", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a2?.approverName, signatureData: a2?.signatureData },
        ]} marginTop={0} />
        <Text style={{ fontSize: 9.5, fontWeight: "bold", textAlign: "center", marginTop: 5 }}>한국농어촌공사 안전기술본부장 귀하</Text>
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}

// ===== 붙임4: 정전작업허가서 =====
export function PowerOutagePDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
}) {
  const checks: Array<{ label: string; applicable: string; result: string }> = fd.safetyChecks ?? [];
  const inspItems: Array<{ equipment: string; cutoffConfirmer: string; electrician: string; siteRepair: string }> = fd.inspectionItems ?? [];
  const a1 = approvalLines.find((l) => l.approvalOrder === 1);
  const a2 = approvalLines.find((l) => l.approvalOrder === 2);
  const inspRows = inspItems.length > 0 ? inspItems : [
    { equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" },
    { equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" },
  ];
  const workPeriodText = buildWorkPeriodText(fd);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={[S.titleBox, { marginBottom: 5 }]}>
          <Text style={{ fontSize: 17, fontWeight: "bold", textAlign: "center" }}>
            {"정전작업 허가서"}
            <Text style={{ fontSize: 11, fontWeight: "normal" }}>{"(수급업체용)"}</Text>
          </Text>
        </View>
        <View style={S.table}>
          {/* 신청인 - 맨 위, 서명 포함 */}
          <ConfinedApplicantRow
            label="○ 신 청 인"
            applicantCompany={fd.applicantCompany}
            applicantTitle={fd.applicantTitle}
            applicantName={fd.applicantName}
            signatureData={applicantSignature}
            labelWidth={100}
          />
          {[
            { label: "○ 용 역 명", val: taskName || fd.serviceName || "" },
            { label: "○ 작업수행시간", val: workPeriodText },
            { label: "○ 작 업 장 소", val: fd.workLocation || "" },
            { label: "○ 작 업 내 용", val: fd.workContent || "" },
            { label: "○ 출입자 명단", val: fd.entryList || "" },
          ].map((row, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.il, { width: 100 }]}>{row.label}</Text>
              <Text style={[S.iv, { borderRight: 0, minHeight: 18 }]}>{row.val}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 4 }}>위 공간에서의 작업을 다음의 조건하에서만 허가함.</Text>
        <View style={S.secGreen}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>1. 밀폐공간출입 허가 필요여부 :   </Text>
            <CB checked={fd.needConfinedSpace === "필요"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needConfinedSpace === "불필요"} /><Text style={{ fontSize: 9 }}> 불필요</Text>
          </View>
        </View>
        <View style={[S.secGreen, { marginBottom: 5 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>2. 화기작업 허가 필요여부 :   </Text>
            <CB checked={fd.needFireWork === "필요"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needFireWork === "불필요"} /><Text style={{ fontSize: 9 }}> 불필요</Text>
          </View>
        </View>
        <Text style={S.secBlue}>3. 안전조치 요구사항</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 4 }]}>확인항목</Text>
            <Text style={[S.th, { flex: 1 }]}>해당여부</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>확인결과</Text>
          </View>
          {checks.map((item, idx) => (
            <View key={idx} style={idx === checks.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 4, minHeight: 20, backgroundColor: idx % 2 === 1 ? C.rowEven : C.white }]}>{`○ ${item.label}`}</Text>
              <Text style={[S.tdc, { flex: 1, minHeight: 20, backgroundColor: item.applicable === "해당" ? "#dce6f0" : C.white }]}>{item.applicable||""}</Text>
              <Text style={[S.tdc, { flex: 2, borderRight: 0, minHeight: 20, backgroundColor: item.result ? "#ebf3e8" : C.white }]}>{item.result||""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secBlue}>4. 점검 확인 결과</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>점검기기</Text>
            <Text style={[S.th, { flex: 1 }]}>차단확인자</Text>
            <Text style={[S.th, { flex: 1 }]}>전기담당자</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>현장정비</Text>
          </View>
          {inspRows.map((item, idx) => (
            <View key={idx} style={idx === inspRows.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 1, minHeight: 20 }]}>{item.equipment||""}</Text>
              <Text style={[S.td, { flex: 1, minHeight: 20 }]}>{item.cutoffConfirmer||""}</Text>
              <Text style={[S.td, { flex: 1, minHeight: 20 }]}>{item.electrician||""}</Text>
              <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 20 }]}>{item.siteRepair||""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secBlue}>5. 특별조치 필요사항</Text>
        <View style={[S.table, { marginBottom: 5 }]}>
          <Text style={[S.td, { borderRight: 0, minHeight: 55 }]}>{fd.specialMeasures||""}</Text>
        </View>
        {/* 허가자/확인자 서명 표 */}
        <ApproverSignTable entries={[
          { roleLabel: "(계획확인) 허가자", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "(이행확인) 확인자", deptLabel: "(부서) 안전기술본부   (직책) 용역감독원", name: a2?.approverName, signatureData: a2?.signatureData },
        ]} />
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}
