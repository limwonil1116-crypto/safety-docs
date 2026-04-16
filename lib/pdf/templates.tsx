// lib/pdf/templates.tsx
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";

const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "NanumGothic",
  fonts: [
    { src: path.join(fontDir, "NanumGothic-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontDir, "NanumGothic-Bold.ttf"), fontWeight: "bold" },
  ],
});

const C = {
  navy: "#1a3a5c", sectionBg: "#bdd7ee", greenBg: "#e2efda",
  thBg: "#9dc3e6", rowEven: "#deeaf1", border: "#7f9fbf",
  labelBg: "#f2f2f2", white: "#ffffff", black: "#000000",
};

const S = StyleSheet.create({
  page: { fontFamily: "NanumGothic", fontSize: 9, paddingTop: 14, paddingBottom: 26, paddingHorizontal: 18, color: "#000" },
  titleBox: { border: "1.5px solid " + C.black, paddingVertical: 11, marginBottom: 3 },
  titleMain: { fontSize: 17, fontWeight: "bold", textAlign: "center", letterSpacing: 2 },
  secHeader: { backgroundColor: C.sectionBg, border: "0.8px solid " + C.border, padding: "4 6", fontSize: 9, fontWeight: "bold", marginBottom: 0 },
  table: { border: "0.8px solid " + C.border, marginBottom: 5 },
  tr: { flexDirection: "row", borderBottom: "0.5px solid " + C.border },
  trLast: { flexDirection: "row" },
  th: { backgroundColor: C.thBg, fontWeight: "bold", padding: "4 4", fontSize: 8.5, borderRight: "0.5px solid " + C.border, textAlign: "center" },
  td: { padding: "4 5", fontSize: 8.5, borderRight: "0.5px solid " + C.border },
  tdc: { padding: "4 5", fontSize: 8.5, borderRight: "0.5px solid " + C.border, textAlign: "center" },
  il: { fontWeight: "bold", padding: "4 5", fontSize: 8.5, borderRight: "0.5px solid " + C.border, backgroundColor: C.labelBg },
  iv: { flex: 1, padding: "4 5", fontSize: 8.5 },
  footer: { position: "absolute", bottom: 8, left: 18, right: 18, borderTop: "0.5px solid #aaa", paddingTop: 3, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#666" },
});

function CB({ checked, size = 8 }: { checked: boolean; size?: number }) {
  return (
    <View style={{ width: size, height: size, marginRight: 2, alignItems: "center", justifyContent: "center", border: "0.8px solid #444", backgroundColor: checked ? C.navy : C.white }}>
      {checked && <Text style={{ color: "white", fontSize: size - 2.5, lineHeight: 1 }}>✓</Text>}
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

function fmtDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const datePart = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (!timeStr) return datePart;
    const [h, m] = timeStr.split(":");
    return `${datePart} ${h}시 ${m || "00"}분`;
  } catch { return `${dateStr} ${timeStr || ""}`; }
}

function buildPeriod(fd: Record<string, any>): string {
  const s = fmtDateTime(fd.workStartDate || fd.workDate, fd.workStartTime);
  const e = fmtDateTime(fd.workEndDate || fd.workDate, fd.workEndTime);
  if (!s) return "";
  return s === e ? s : `${s} ~ ${e}`;
}

function ApplicantRow({ applicantCompany, applicantTitle, applicantName, signatureData, labelWidth = 55 }: {
  applicantCompany?: string; applicantTitle?: string; applicantName?: string;
  signatureData?: string; labelWidth?: number;
}) {
  return (
    <View style={[S.tr, { alignItems: "center", minHeight: 30 }]}>
      <Text style={[S.il, { width: labelWidth }]}>신 청 인</Text>
      <Text style={[S.iv, { flex: 1.5, borderRight: "0.5px solid " + C.border }]}>{`(업체명) ${applicantCompany || ""}`}</Text>
      <Text style={[S.iv, { flex: 1, borderRight: "0.5px solid " + C.border }]}>{`(직책) ${applicantTitle || ""}`}</Text>
      <View style={{ flex: 2, flexDirection: "row", alignItems: "center", padding: "3 5", gap: 4 }}>
        <Text style={{ fontSize: 8.5, flex: 1 }}>{`(성명) ${applicantName || ""}`}</Text>
        <Text style={{ fontSize: 7.5, color: "#888" }}>(서명)</Text>
        {signatureData
          ? <Image src={signatureData} style={{ width: 52, height: 20, objectFit: "contain" }} />
          : <View style={{ width: 52, height: 20, border: "0.5px dashed #ccc" }} />}
      </View>
    </View>
  );
}

function ApproverRow({ roleLabel, deptLabel, name, signatureData, borderBottom = true }: {
  roleLabel: string; deptLabel?: string; name?: string; signatureData?: string; borderBottom?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", borderBottom: borderBottom ? "0.5px solid " + C.border : "none", minHeight: 32 }}>
      <View style={{ width: 75, padding: "3 5", backgroundColor: C.labelBg, borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
        <Text style={{ fontSize: 8, fontWeight: "bold", color: C.navy }}>{roleLabel}</Text>
      </View>
      <Text style={{ flex: 2, fontSize: 7.5, padding: "3 5", borderRight: "0.5px solid " + C.border, color: "#555" }}>
        {deptLabel || "(부서) 안전기술본부   (직책) 용역감독원"}
      </Text>
      {/* #서명 fix: 성명 칸 | 서명 칸 분리 */}
      <View style={{ width: 72, padding: "3 5", borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
        <Text style={{ fontSize: 8.5 }}>{`(성명) ${name || ""}`}</Text>
      </View>
      <View style={{ width: 80, padding: "2 4", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 7.5, color: "#888", marginBottom: 2 }}>(서명)</Text>
        {signatureData
          ? <Image src={signatureData} style={{ width: 72, height: 20, objectFit: "contain" }} />
          : <View style={{ width: 72, height: 18, border: "0.5px dashed #ccc" }} />}
      </View>
    </View>
  );
}

function ApproverSection({ entries }: { entries: Array<{ roleLabel: string; deptLabel?: string; name?: string; signatureData?: string }> }) {
  return (
    <View style={{ border: "0.8px solid " + C.border, marginTop: 6 }}>
      {entries.map((e, i) => (
        <ApproverRow key={i} roleLabel={e.roleLabel} deptLabel={e.deptLabel} name={e.name} signatureData={e.signatureData} borderBottom={i < entries.length - 1} />
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
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const riskRows: Array<{ riskFactor: string; improvement: string; disasterType: string }> =
    fd.riskRows ?? [{ riskFactor: "", improvement: "", disasterType: "" }];
  const periodText = buildPeriod(fd);

  // 위험공종 - 체크박스 목록 (왼쪽 열)
  const riskTypes = [
    { key: "riskHighPlace",     label: "2.0m 이상 고소작업" },
    { key: "riskWaterWork",     label: "수상 또는 수변작업" },
    { key: "riskConfinedSpace", label: "밀폐공간(복통 포함)작업" },
    { key: "riskPowerOutage",   label: "정전작업" },
    { key: "riskFireWork",      label: "화기작업" },
    { key: "riskOther",         label: `기타(발주자 요청)${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}` },
  ];

  // #6 fix: 관련작업(장소) - 공종명 아래에 들여쓰기로 세부 장소 표시
  // 원본 법정 양식처럼: 공종명이 왼쪽 열, 관련작업(장소)는 가운데 열에 공종별로 나열
  const relatedWorkByType: Array<{ typeName: string; details: string[] }> = [];
  if (fd.riskHighPlace) {
    const items = Array.isArray(fd.riskHighPlaceItems) ? fd.riskHighPlaceItems as string[] : [];
    const details = [...items];
    if (fd.riskHighPlaceDetail) details.push(fd.riskHighPlaceDetail as string);
    if (details.length > 0) relatedWorkByType.push({ typeName: "고소작업", details });
  }
  if (fd.riskWaterWork) {
    const items = Array.isArray(fd.riskWaterWorkItems) ? fd.riskWaterWorkItems as string[] : [];
    const details = [...items];
    if (fd.riskWaterWorkDetail) details.push(fd.riskWaterWorkDetail as string);
    if (details.length > 0) relatedWorkByType.push({ typeName: "수변작업", details });
  }
  if (fd.riskConfinedSpace && fd.riskConfinedSpaceDetail) relatedWorkByType.push({ typeName: "밀폐공간", details: [fd.riskConfinedSpaceDetail as string] });
  if (fd.riskPowerOutage && fd.riskPowerOutageDetail) relatedWorkByType.push({ typeName: "정전작업", details: [fd.riskPowerOutageDetail as string] });
  if (fd.riskFireWork && fd.riskFireWorkDetail) relatedWorkByType.push({ typeName: "화기작업", details: [fd.riskFireWorkDetail as string] });

  const factors = [
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
    { key: "factorOther",         label: `기타${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}` },
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={{ fontSize: 8, textAlign: "right", marginBottom: 1, color: "#555" }}>
          {`요청일시 : ${fd.requestDate || ""}    허가일시 : `}
        </Text>
        <View style={S.titleBox}>
          <Text style={S.titleMain}>안 전 작 업 허 가 서</Text>
        </View>
        <Text style={{ fontSize: 7.5, textAlign: "center", marginBottom: 4, color: "#555" }}>
          {"<서식 16> 6.4 안전작업허가 관련"}
        </Text>

        <Text style={S.secHeader}>1. 작업허가 신청개요</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.il, { width: 55 }]}>용 역 명</Text>
            <Text style={[S.iv, { borderRight: 0 }]}>{taskName || fd.projectName || ""}</Text>
          </View>
          <ApplicantRow applicantCompany={fd.applicantCompany} applicantTitle={fd.applicantTitle} applicantName={fd.applicantName} signatureData={applicantSignature} />
          <View style={S.tr}>
            <Text style={[S.il, { width: 55 }]}>작업시간</Text>
            <Text style={[S.iv, { flex: 2, borderRight: "0.5px solid " + C.border }]}>{periodText}</Text>
            <Text style={[S.il, { width: 42 }]}>작업장소</Text>
            <Text style={[S.iv, { flex: 2, borderRight: 0 }]}>{fd.workLocation || ""}</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.il, { width: 55 }]}>작업 내용</Text>
            <Text style={[S.iv, { borderRight: 0, minHeight: 24 }]}>{fd.workContent || ""}</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 55 }]}>작업자명단</Text>
            <Text style={[S.iv, { borderRight: 0, minHeight: 20 }]}>{fd.participants || ""}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 8.5, textAlign: "center", marginBottom: 3 }}>위 작업을 다음의 조건하에서만 허가함.</Text>

        <Text style={S.secHeader}>2. 위험공종 확인내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            {/* #6 fix: 표 헤더 - 원본 법정 양식과 동일하게 */}
            <Text style={[S.th, { width: 90 }]}>{"작업허가제 대상공종\n(관련공종 체크)"}</Text>
            <Text style={[S.th, { flex: 1 }]}>관련작업(장소)</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>예상되는 위험요소</Text>
          </View>
          <View style={[S.trLast, { minHeight: 100 }]}>
            {/* 왼쪽: 작업허가제 대상공종 체크박스 */}
            <View style={[S.td, { width: 90 }]}>
              {riskTypes.map(item => (
                <View key={item.key} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
                  <CB checked={!!fd[item.key]} />
                  <Text style={{ fontSize: 8, flex: 1 }}>{item.label}</Text>
                </View>
              ))}
            </View>
            {/* 가운데: 관련작업(장소) - 공종명 + 들여쓰기로 세부 장소 */}
            <View style={[S.td, { flex: 1 }]}>
              {relatedWorkByType.map((item, i) => (
                <View key={i} style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 8, fontWeight: "bold", marginBottom: 1.5 }}>□ {item.typeName}</Text>
                  {item.details.map((d, j) => (
                    <Text key={j} style={{ fontSize: 7.5, color: "#333", marginLeft: 8, marginBottom: 1 }}>- {d}</Text>
                  ))}
                </View>
              ))}
            </View>
            {/* 오른쪽: 예상되는 위험요소 체크박스 */}
            <View style={[S.td, { flex: 1, borderRight: 0 }]}>
              {factors.map(f => (
                <View key={f.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                  <CB checked={!!fd[f.key]} />
                  <Text style={{ fontSize: 7.5 }}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 3 }]}>{"위험요소\n(위험성 평가 결과 요약)"}</Text>
            <Text style={[S.th, { flex: 3 }]}>{"개선대책\n(개선대책 결과 요약)"}</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>재해형태</Text>
          </View>
          {riskRows.map((row, idx) => (
            <View key={idx} style={idx === riskRows.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 3, minHeight: 22 }]}>{row.riskFactor || ""}</Text>
              <Text style={[S.td, { flex: 3, minHeight: 22 }]}>{row.improvement || ""}</Text>
              <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 22 }]}>{row.disasterType || ""}</Text>
            </View>
          ))}
        </View>

        <Text style={S.secHeader}>3. 용역감독 검토내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>검토의견</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>조치결과</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.td, { flex: 1, minHeight: 35 }]}>{fd.reviewOpinion || ""}</Text>
            <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 35 }]}>{fd.reviewResult || ""}</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.il, { width: 75 }]}>최종 검토자</Text>
            <Text style={[S.iv, { flex: 2, borderRight: "0.5px solid " + C.border, fontSize: 7.5, color: "#555" }]}>
              {"(부서) 안전기술본부   (직책) 용역감독원"}
            </Text>
            <View style={{ width: 72, padding: "3 5", borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
              <Text style={{ fontSize: 8.5 }}>{`(성명) ${a1?.approverName || ""}`}</Text>
            </View>
            <View style={{ width: 80, padding: "2 4", alignItems: "center", justifyContent: "center", borderRight: 0 }}>
              <Text style={{ fontSize: 7.5, color: "#888", marginBottom: 2 }}>(서명)</Text>
              {a1?.signatureData
                ? <Image src={a1.signatureData} style={{ width: 72, height: 20, objectFit: "contain" }} />
                : <View style={{ width: 72, height: 18, border: "0.5px dashed #ccc" }} />}
            </View>
          </View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 75 }]}>최종 허가자</Text>
            <Text style={[S.iv, { flex: 2, borderRight: "0.5px solid " + C.border, fontSize: 7.5, color: "#555" }]}>
              {"(부서) 안전기술본부   (직책) 용역감독원"}
            </Text>
            <View style={{ width: 72, padding: "3 5", borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
              <Text style={{ fontSize: 8.5 }}>{`(성명) ${a2?.approverName || ""}`}</Text>
            </View>
            <View style={{ width: 80, padding: "2 4", alignItems: "center", justifyContent: "center", borderRight: 0 }}>
              <Text style={{ fontSize: 7.5, color: "#888", marginBottom: 2 }}>(서명)</Text>
              {a2?.signatureData
                ? <Image src={a2.signatureData} style={{ width: 72, height: 20, objectFit: "contain" }} />
                : <View style={{ width: 72, height: 18, border: "0.5px dashed #ccc" }} />}
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 8, color: "#555", marginTop: 2 }}>
          {"붙 임  1. 해당공종 수시 위험성평가표\n       2. 개선대책 확인자료(사진 등)"}
        </Text>
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
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const periodText = buildPeriod(fd);
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}>
          <Text style={S.titleMain}>밀폐공간 작업 허가서<Text style={{ fontSize: 11, fontWeight: "normal" }}>(수급업체용)</Text></Text>
        </View>
        <View style={S.table}>
          <ApplicantRow applicantCompany={fd.applicantCompany} applicantTitle={fd.applicantTitle} applicantName={fd.applicantName} signatureData={applicantSignature} labelWidth={98} />
          {[
            { label: "○ 용 역 명",    val: taskName || fd.serviceName || "" },
            { label: "○ 작업수행시간", val: periodText },
            { label: "○ 작 업 장 소", val: fd.workLocation || "" },
            { label: "○ 작 업 내 용", val: fd.workContent || "" },
            { label: "○ 출입자 명단", val: fd.entryList || "" },
          ].map((row, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.il, { width: 98 }]}>{row.label}</Text>
              <Text style={[S.iv, { borderRight: 0, minHeight: 20 }]}>{row.val}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 8.5, textAlign: "center", marginBottom: 3 }}>위 공간에서의 작업을 다음의 조건하에서만 허가함.</Text>
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "4 7", marginBottom: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>1. 화기작업 허가 필요여부 :   </Text>
            <CB checked={fd.needFireWork === "필요"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needFireWork === "불필요"} /><Text style={{ fontSize: 9 }}> 불필요</Text>
          </View>
        </View>
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "4 7", marginBottom: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>2. 내연기관(양수기) 등 사용여부 :   </Text>
            <CB checked={fd.useInternalEngine === "사용"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 사용   </Text>
            <CB checked={fd.useInternalEngine === "미사용"} /><Text style={{ fontSize: 9 }}> 미사용</Text>
          </View>
        </View>
        <Text style={S.secHeader}>3. 안전조치 요구사항</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 4 }]}>확인항목</Text>
            <Text style={[S.th, { flex: 1 }]}>해당여부</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>확인결과</Text>
          </View>
          {checks.map((item, idx) => (
            <View key={idx} style={idx === checks.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 4, minHeight: 20, backgroundColor: idx % 2 === 1 ? C.rowEven : C.white }]}>{`○ ${item.label}`}</Text>
              <Text style={[S.tdc, { flex: 1, minHeight: 20, backgroundColor: item.applicable === "해당" ? "#dce6f0" : C.white }]}>{item.applicable || ""}</Text>
              <Text style={[S.tdc, { flex: 2, borderRight: 0, minHeight: 20, backgroundColor: item.result ? "#ebf3e8" : C.white }]}>{item.result || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secHeader}>5. 특별조치 필요사항</Text>
        <View style={[S.table, { marginBottom: 5 }]}>
          <Text style={[S.td, { borderRight: 0, minHeight: 45 }]}>{fd.specialMeasures || ""}</Text>
        </View>
        <ApproverSection entries={[
          { roleLabel: "(계획확인) 허가자", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "(이행확인) 확인자", name: a2?.approverName, signatureData: a2?.signatureData },
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
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const periodText = buildPeriod(fd);
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}><Text style={S.titleMain}>용역현장 휴일작업 신청서</Text></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 9 }}>{`작업일시: ${periodText}`}</Text>
          <Text style={{ fontSize: 9 }}>{`신고일시: ${fd.requestDate || ""}`}</Text>
        </View>
        <Text style={S.secHeader}>1. 용역 개요</Text>
        <View style={S.table}>
          <View style={S.tr}><Text style={[S.il, { width: 55 }]}>용역명</Text><Text style={[S.iv, { borderRight: 0 }]}>{taskName || fd.serviceName || ""}</Text></View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 55 }]}>수급인</Text>
            <Text style={[S.iv, { flex: 1, borderRight: "0.5px solid " + C.border }]}>{fd.contractorCompany || ""}</Text>
            <Text style={[S.il, { width: 52 }]}>용역기간</Text>
            <Text style={[S.iv, { flex: 1, borderRight: 0 }]}>{`${fd.contractPeriodStart || ""} ~ ${fd.contractPeriodEnd || ""}`}</Text>
          </View>
        </View>
        <Text style={S.secHeader}>2. 휴일작업 개요</Text>
        <View style={S.table}>
          {[
            [{ w: 72, label: "작업대상 시설물", val: fd.facilityName }, { w: 52, label: "시설관리자", val: `${fd.facilityManager || ""} (${fd.facilityManagerGrade || ""})` }],
            [{ w: 72, label: "위치", val: fd.facilityLocation }, { w: 52, label: "작업위치", val: fd.workPosition }],
            [{ w: 72, label: "작업공종", val: fd.workContents }, { w: 52, label: "위험요소", val: fd.riskFactors }],
          ].map((cols, ri) => (
            <View key={ri} style={S.tr}>
              {cols.map((c, ci) => (
                <React.Fragment key={ci}>
                  <Text style={[S.il, { width: c.w }]}>{c.label}</Text>
                  <Text style={[S.iv, ci < cols.length - 1 ? { borderRight: "0.5px solid " + C.border } : { borderRight: 0 }]}>{c.val || ""}</Text>
                </React.Fragment>
              ))}
            </View>
          ))}
          <View style={S.trLast}><Text style={[S.il, { width: 72 }]}>개선대책</Text><Text style={[S.iv, { borderRight: 0 }]}>{fd.improvementMeasures || ""}</Text></View>
        </View>
        <Text style={S.secHeader}>휴일작업 참여자 (상주인력)</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 2 }]}>역할</Text>
            <Text style={[S.th, { flex: 2 }]}>성명</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>연락처</Text>
          </View>
          {participants.map((p, idx) => (
            <View key={idx} style={idx === participants.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 2, minHeight: 20 }]}>{p.role || ""}</Text>
              <Text style={[S.td, { flex: 2, minHeight: 20 }]}>{p.name || ""}</Text>
              <Text style={[S.td, { flex: 2, borderRight: 0, minHeight: 20 }]}>{p.phone || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secHeader}>3. 용역감독원 검토내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>검토의견</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>조치결과</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.td, { flex: 1, minHeight: 35 }]}>{fd.reviewOpinion || ""}</Text>
            <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 35 }]}>{fd.reviewResult || ""}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 9, textAlign: "center", marginVertical: 4 }}>위와 같이 휴일작업을 신청하오니 승인하여 주시기 바랍니다.</Text>
        <View style={{ border: "0.8px solid " + C.border, marginBottom: 3 }}>
          <ApproverRow roleLabel="신청자" deptLabel={`소속: ${fd.applicantOrg || ""}`} name={fd.applicantName} signatureData={applicantSignature} borderBottom={false} />
        </View>
        <ApproverSection entries={[
          { roleLabel: "검토자 (용역감독원)", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "승인자 (관리감독자)", name: a2?.approverName, signatureData: a2?.signatureData },
        ]} />
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
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const inspRows = inspItems.length > 0 ? inspItems : [
    { equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" },
    { equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" },
  ];
  const periodText = buildPeriod(fd);
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
          <ApplicantRow applicantCompany={fd.applicantCompany} applicantTitle={fd.applicantTitle} applicantName={fd.applicantName} signatureData={applicantSignature} labelWidth={100} />
          {[
            { label: "○ 용 역 명",    val: taskName || fd.serviceName || "" },
            { label: "○ 작업수행시간", val: periodText },
            { label: "○ 작 업 장 소", val: fd.workLocation || "" },
            { label: "○ 작 업 내 용", val: fd.workContent || "" },
            { label: "○ 출입자 명단", val: fd.entryList || "" },
          ].map((row, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.il, { width: 100 }]}>{row.label}</Text>
              <Text style={[S.iv, { borderRight: 0, minHeight: 20 }]}>{row.val}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 4 }}>위 공간에서의 작업을 다음의 조건하에서만 허가함.</Text>
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "4 7", marginBottom: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>1. 밀폐공간출입 허가 필요여부 :   </Text>
            <CB checked={fd.needConfinedSpace === "필요"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needConfinedSpace === "불필요"} /><Text style={{ fontSize: 9 }}> 불필요</Text>
          </View>
        </View>
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "4 7", marginBottom: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>2. 화기작업 허가 필요여부 :   </Text>
            <CB checked={fd.needFireWork === "필요"} /><Text style={{ fontSize: 9, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needFireWork === "불필요"} /><Text style={{ fontSize: 9 }}> 불필요</Text>
          </View>
        </View>
        <Text style={S.secHeader}>3. 안전조치 요구사항</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 4 }]}>확인항목</Text>
            <Text style={[S.th, { flex: 1 }]}>해당여부</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>확인결과</Text>
          </View>
          {checks.map((item, idx) => (
            <View key={idx} style={idx === checks.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 4, minHeight: 22, backgroundColor: idx % 2 === 1 ? C.rowEven : C.white }]}>{`○ ${item.label}`}</Text>
              <Text style={[S.tdc, { flex: 1, minHeight: 22, backgroundColor: item.applicable === "해당" ? "#dce6f0" : C.white }]}>{item.applicable || ""}</Text>
              <Text style={[S.tdc, { flex: 2, borderRight: 0, minHeight: 22, backgroundColor: item.result ? "#ebf3e8" : C.white }]}>{item.result || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secHeader}>4. 점검 확인 결과</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>점검기기</Text>
            <Text style={[S.th, { flex: 1 }]}>차단확인자</Text>
            <Text style={[S.th, { flex: 1 }]}>전기담당자</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>현장정비</Text>
          </View>
          {inspRows.map((item, idx) => (
            <View key={idx} style={idx === inspRows.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 1, minHeight: 22 }]}>{item.equipment || ""}</Text>
              <Text style={[S.td, { flex: 1, minHeight: 22 }]}>{item.cutoffConfirmer || ""}</Text>
              <Text style={[S.td, { flex: 1, minHeight: 22 }]}>{item.electrician || ""}</Text>
              <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 22 }]}>{item.siteRepair || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secHeader}>5. 특별조치 필요사항</Text>
        <View style={[S.table, { marginBottom: 5 }]}>
          <Text style={[S.td, { borderRight: 0, minHeight: 55 }]}>{fd.specialMeasures || ""}</Text>
        </View>
        <ApproverSection entries={[
          { roleLabel: "(계획확인) 허가자", name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "(이행확인) 확인자", name: a2?.approverName, signatureData: a2?.signatureData },
        ]} />
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}
