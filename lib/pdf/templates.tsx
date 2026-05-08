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

// ✅ 1번: 여백 최소화 + 폰트/표 크기 확대
const S = StyleSheet.create({
  page: { fontFamily: "NanumGothic", fontSize: 8.5, paddingTop: 4, paddingBottom: 12, paddingHorizontal: 9, color: "#000" },
  titleBox: { border: "1.5px solid " + C.black, paddingVertical: 7, marginBottom: 2 },
  titleMain: { fontSize: 17, fontWeight: "bold", textAlign: "center", letterSpacing: 2 },
  secHeader: { backgroundColor: C.sectionBg, border: "0.8px solid " + C.border, padding: "3 6", fontSize: 9, fontWeight: "bold", marginBottom: 0 },
  table: { border: "0.8px solid " + C.border, marginBottom: 3 },
  tr: { flexDirection: "row", borderBottom: "0.5px solid " + C.border },
  trLast: { flexDirection: "row" },
  th: { backgroundColor: C.thBg, fontWeight: "bold", padding: "3 3", fontSize: 8.5, borderRight: "0.5px solid " + C.border, textAlign: "center" },
  td: { padding: "3 4", fontSize: 8.5, borderRight: "0.5px solid " + C.border },
  tdc: { padding: "3 4", fontSize: 8.5, borderRight: "0.5px solid " + C.border, textAlign: "center" },
  il: { fontWeight: "bold", padding: "3 4", fontSize: 8.5, borderRight: "0.5px solid " + C.border, backgroundColor: C.labelBg },
  iv: { flex: 1, padding: "3 4", fontSize: 8.5 },
  footer: { position: "absolute", bottom: 6, left: 12, right: 12, borderTop: "0.5px solid #aaa", paddingTop: 3, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: "#666" },
});

export interface AttachmentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  attachmentType: string;
  description: string | null;
}

function CB({ checked, size = 9 }: { checked: boolean; size?: number }) {
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
      <Text style={S.footerText}>{`작성일시: ${new Date(createdAt).toLocaleString("ko-KR")} | 한국농어촌공사 안전기술본부`}</Text>
    </View>
  );
}

function fmtDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const datePart = `${m}월 ${d}일`;
    if (!timeStr) return datePart;
    const [h, min] = timeStr.split(":");
    const hNum = parseInt(h, 10);
    const ampm = hNum < 12 ? "오전" : "오후";
    const h12 = hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum;
    return `${datePart} ${ampm} ${h12}시 ${min || "00"}분`;
  } catch { return `${dateStr} ${timeStr || ""}`; }
}

function buildPeriod(fd: Record<string, any>): string {
  const s = fmtDateTime(fd.workStartDate || fd.workDate, fd.workStartTime);
  const e = fmtDateTime(fd.workEndDate || fd.workDate, fd.workEndTime);
  if (!s) return "";
  return s === e ? s : `${s} ~ ${e}`;
}

// ✅ 좌표값 감지 함수 (예: "36.70531, 126.83768" 형태)
function isCoordinate(val: string): boolean {
  return /^-?\d+\.\d+,?\s*-?\d+\.\d+$/.test(val.trim());
}

function getWorkLocation(fd: Record<string, any>, workAddress?: string | null): string {
  // 1순위: DB의 workAddress (카카오 역지오코딩 주소) - 좌표가 아닌 경우만
  if (workAddress && workAddress.trim() && !isCoordinate(workAddress)) return workAddress;
  // 2순위: formData.workLocation - 좌표가 아닌 경우만
  if (fd.workLocation && fd.workLocation.trim() && !isCoordinate(fd.workLocation)) return fd.workLocation;
  // 3순위: facilityLocation (붙임3)
  if (fd.facilityLocation && fd.facilityLocation.trim() && !isCoordinate(fd.facilityLocation)) return fd.facilityLocation;
  // 4순위: workAddress가 좌표더라도 없는 것보다는 나음 (표시는 하되 빈칸 방지)
  if (workAddress && workAddress.trim()) return workAddress;
  if (fd.workLocation && fd.workLocation.trim()) return fd.workLocation;
  if (fd.facilityLocation && fd.facilityLocation.trim()) return fd.facilityLocation;
  return "";
}

function ApplicantRow({ applicantCompany, applicantTitle, applicantName, signatureData, labelWidth = 55 }: {
  applicantCompany?: string; applicantTitle?: string; applicantName?: string;
  signatureData?: string; labelWidth?: number;
}) {
  return (
    <View style={[S.tr, { alignItems: "stretch", minHeight: 36 }]}>
      <Text style={[S.il, { width: labelWidth }]}>신  청  인</Text>
      <View style={{ flex: 1.5, borderRight: "0.5px solid " + C.border, padding: "4 4", justifyContent: "center" }}>
        <Text style={{ fontSize: 9 }}>{`(업체명) ${applicantCompany || ""}`}</Text>
      </View>
      <View style={{ flex: 1, borderRight: "0.5px solid " + C.border, padding: "4 4", justifyContent: "center" }}>
        <Text style={{ fontSize: 9 }}>{`(직책) ${applicantTitle || ""}`}</Text>
      </View>
      <View style={{ flex: 1, borderRight: "0.5px solid " + C.border, padding: "4 4", justifyContent: "center" }}>
        <Text style={{ fontSize: 9 }}>{`(성명) ${applicantName || ""}`}</Text>
      </View>
      <View style={{ width: 95, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: "4 4", gap: 4 }}>
        <Text style={{ fontSize: 8, color: "#888" }}>(서명)</Text>
        {signatureData
          ? <Image src={signatureData} style={{ width: 60, height: 22, objectFit: "contain" }} />
          : <View style={{ width: 60, height: 20, border: "0.5px dashed #ccc" }} />}
      </View>
    </View>
  );
}

function ApproverRow({ roleLabel, deptLabel, name, signatureData, borderBottom = true }: {
  roleLabel: string; deptLabel?: string; name?: string; signatureData?: string; borderBottom?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", borderBottom: borderBottom ? "0.5px solid " + C.border : "none", minHeight: 36 }}>
      <View style={{ width: 78, padding: "4 5", backgroundColor: C.labelBg, borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
        <Text style={{ fontSize: 9, fontWeight: "bold", color: C.navy }}>{roleLabel}</Text>
      </View>
      <View style={{ flex: 2, borderRight: "0.5px solid " + C.border, padding: "4 5", justifyContent: "center" }}>
        <Text style={{ fontSize: 8.5, color: "#555" }}>
          {deptLabel || "(부서) 한국농어촌공사   (직책) 용역관리자"}
        </Text>
      </View>
      <View style={{ width: 85, padding: "4 5", borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
        <Text style={{ fontSize: 9.5 }}>{`(성명) ${name || ""}`}</Text>
      </View>
      <View style={{ width: 105, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: "4 4", gap: 4 }}>
        <Text style={{ fontSize: 8, color: "#888" }}>(서명)</Text>
        {signatureData
          ? <Image src={signatureData} style={{ width: 75, height: 22, objectFit: "contain" }} />
          : <View style={{ width: 75, height: 20, border: "0.5px dashed #ccc" }} />}
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

// ✅ 2번: 첨부파일 페이지들 (위험성평가표, 개선대책 사진/문서)
// renderToBuffer는 Document 컴포넌트를 직접 받으므로 Document로 감싸서 반환
export function AttachmentPagesPDF({ riskAssessFiles, safetyCheckPhotos, safetyCheckDocs, documentId, createdAt }: {
  riskAssessFiles: AttachmentInfo[];
  safetyCheckPhotos: AttachmentInfo[];
  safetyCheckDocs: AttachmentInfo[];
  documentId: string;
  createdAt: string;
}) {
  return (
    <Document>
      {/* 위험성평가표 페이지 (각 파일을 1페이지씩) */}
      {riskAssessFiles.map((file, idx) => {
        const isImage = file.mimeType?.startsWith("image/");
        return (
          <Page key={`risk-${idx}`} size="A4" style={{ fontFamily: "NanumGothic", padding: 12, paddingBottom: 24 }}>
            <View style={{ backgroundColor: C.sectionBg, padding: "6 8", marginBottom: 8, border: "0.8px solid " + C.border }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: C.navy }}>
                {`붙임 1. 위험성평가표${riskAssessFiles.length > 1 ? ` (${idx + 1}/${riskAssessFiles.length})` : ""}`}
              </Text>
              <Text style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{file.fileName}</Text>
            </View>
            {isImage ? (
              <Image src={file.fileUrl} style={{ width: "100%", objectFit: "contain", maxHeight: 700 }} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", border: "1px solid #ddd" }}>
                <Text style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>{file.fileName}</Text>
                <Text style={{ fontSize: 9, color: "#999" }}>PDF/Excel 파일 - 별도 확인 필요</Text>
              </View>
            )}
            <Footer documentId={documentId} createdAt={createdAt} />
          </Page>
        );
      })}

      {/* 개선대책 확인자료 (사진) - 한 페이지에 최대 6장 그리드 */}
      {(() => {
        if (safetyCheckPhotos.length === 0) return null;
        const photosPerPage = 6;
        const chunks: AttachmentInfo[][] = [];
        for (let i = 0; i < safetyCheckPhotos.length; i += photosPerPage) {
          chunks.push(safetyCheckPhotos.slice(i, i + photosPerPage));
        }
        return chunks.map((chunk, pageIdx) => (
          <Page key={`photo-${pageIdx}`} size="A4" style={{ fontFamily: "NanumGothic", padding: 12, paddingBottom: 24 }}>
            <View style={{ backgroundColor: C.sectionBg, padding: "6 8", marginBottom: 8, border: "0.8px solid " + C.border }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: C.navy }}>
                {`붙임 2. 개선대책 확인자료 (사진)${chunks.length > 1 ? ` (${pageIdx + 1}/${chunks.length})` : ""}`}
              </Text>
              <Text style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{`${chunk.length}장`}</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {chunk.map((photo, i) => (
                <View key={i} style={{ width: "31%", marginBottom: 6 }}>
                  <Image src={photo.fileUrl} style={{ width: "100%", height: 140, objectFit: "cover", border: "0.5px solid #ccc" }} />
                  <Text style={{ fontSize: 7.5, color: "#666", marginTop: 2, textAlign: "center" }}>{photo.fileName}</Text>
                </View>
              ))}
            </View>
            <Footer documentId={documentId} createdAt={createdAt} />
          </Page>
        ));
      })()}

      {/* 개선대책 문서 파일 */}
      {safetyCheckDocs.map((file, idx) => {
        const isImage = file.mimeType?.startsWith("image/");
        return (
          <Page key={`doc-${idx}`} size="A4" style={{ fontFamily: "NanumGothic", padding: 12, paddingBottom: 24 }}>
            <View style={{ backgroundColor: C.sectionBg, padding: "6 8", marginBottom: 8, border: "0.8px solid " + C.border }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: C.navy }}>개선대책 확인자료 (문서)</Text>
              <Text style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{file.fileName}</Text>
            </View>
            {isImage ? (
              <Image src={file.fileUrl} style={{ width: "100%", objectFit: "contain", maxHeight: 700 }} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, color: "#666" }}>{file.fileName}</Text>
              </View>
            )}
            <Footer documentId={documentId} createdAt={createdAt} />
          </Page>
        );
      })}
    </Document>
  );
}

// ===== 붙임1: 안전작업허가서 =====
export function SafetyWorkPermitPDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature, workAddress, isSelf = false }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approverOrg?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
  workAddress?: string | null; attachments?: AttachmentInfo[]; isSelf?: boolean;
}) {
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const riskRows: Array<{ riskFactor: string; improvement: string; disasterType: string }> =
    fd.riskRows ?? [{ riskFactor: "", improvement: "", disasterType: "" }];
  const periodText = buildPeriod(fd);
  const workLocationText = getWorkLocation(fd, workAddress);

  const riskTypes = [
    { key: "riskHighPlace",     label: "2.0m 이상 고소작업" },
    { key: "riskWaterWork",     label: "수상 또는 수중작업" },
    { key: "riskConfinedSpace", label: "밀폐공간(협소포함)작업" },
    { key: "riskPowerOutage",   label: "정전작업" },
    { key: "riskFireWork",      label: "화기작업" },
    { key: "riskOther",         label: `기타(별지에 별기재)` },
  ];

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
    if (details.length > 0) relatedWorkByType.push({ typeName: "수중작업", details });
  }
  if (fd.riskConfinedSpace && fd.riskConfinedSpaceDetail) relatedWorkByType.push({ typeName: "밀폐공간", details: [fd.riskConfinedSpaceDetail as string] });
  if (fd.riskPowerOutage && fd.riskPowerOutageDetail) relatedWorkByType.push({ typeName: "정전작업", details: [fd.riskPowerOutageDetail as string] });
  if (fd.riskFireWork && fd.riskFireWorkDetail) relatedWorkByType.push({ typeName: "화기작업", details: [fd.riskFireWorkDetail as string] });
  // ✅ 3번: 기타 세부내용도 오른쪽 관련작업(장소) 칸으로
  if (fd.riskOther && fd.riskOtherDetail) relatedWorkByType.push({ typeName: "기타", details: [fd.riskOtherDetail as string] });

  const factors = [
    { key: "factorNarrowAccess",  label: "진출입로 협소" },
    { key: "factorSlippery",      label: "미끄러짐(이끼, 습기)" },
    { key: "factorSteepSlope",    label: "급경사면" },
    { key: "factorWaterHazard",   label: "파랑‧유수‧수심" },
    { key: "factorRockfall",      label: "낙석‧토사붕괴" },
    { key: "factorNoRailing",     label: "난간 미설치" },
    { key: "factorLadderNoGuard", label: "사다리‧방호울 미설치" },
    { key: "factorSuffocation",   label: "질식·화재·폭발" },
    { key: "factorElectricFire",  label: "감전·전기불꽃 화재" },
    { key: "factorSparkFire",   label: "스파크, 화염에 의한 화재" },
    { key: "factorOther",         label: `기타${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}` },
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={{ fontSize: 8.5, textAlign: "right", marginBottom: 1, color: "#555" }}>
          {`신청일시 : ${fd.requestDate || ""}    허가일시 : `}
        </Text>
        <View style={S.titleBox}>
          <Text style={S.titleMain}>안 전 작 업 허 가 서</Text>
        </View>
        <Text style={{ fontSize: 8, textAlign: "center", marginBottom: 4, color: "#555" }}>
          {"<서식 16> 6.4 안전작업허가서 양식"}
        </Text>

        <Text style={S.secHeader}>1. 작업허가 신청개요</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.il, { width: 58 }]}>용  역  명</Text>
            <Text style={[S.iv, { borderRight: 0 }]}>{taskName || fd.projectName || ""}</Text>
          </View>
          <ApplicantRow applicantCompany={fd.applicantCompany} applicantTitle={fd.applicantTitle} applicantName={fd.applicantName} signatureData={applicantSignature} />
          <View style={S.tr}>
            <Text style={[S.il, { width: 58 }]}>작업시간</Text>
            <Text style={[S.iv, { flex: 2, borderRight: "0.5px solid " + C.border }]}>{periodText}</Text>
            <Text style={[S.il, { width: 44 }]}>작업장소</Text>
            <Text style={[S.iv, { flex: 2, borderRight: 0 }]}>{workLocationText}</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.il, { width: 58 }]}>작업 내용</Text>
            <Text style={[S.iv, { borderRight: 0, minHeight: 36 }]}>{fd.workContent || ""}</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 58 }]}>작업참여자</Text>
            <Text style={[S.iv, { borderRight: 0, minHeight: 22 }]}>{fd.participants || ""}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 3 }}>※ 작업하는 모든 근무자는 아래의 조건사항을 이행하여야 합니다</Text>

        <Text style={S.secHeader}>2. 위험공종 확인부서(※ 해당 항목 체크)</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { width: 135 }]}>{"작업허가 공종구분\n(해당구분 체크)"}</Text>
            <Text style={[S.th, { flex: 1 }]}>관련작업(장소)</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>발생하는 위험요소</Text>
          </View>
          <View style={[S.trLast, { minHeight: 100 }]}>
            <View style={[S.td, { width: 135 }]}>
              {riskTypes.map(item => (
                <View key={item.key} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 5 }}>
                  <CB checked={!!fd[item.key]} />
                  <Text style={{ fontSize: 9, flex: 1 }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={[S.td, { flex: 1 }]}>
              {relatedWorkByType.map((item, i) => (
                <View key={i} style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 2 }}>▶ {item.typeName}</Text>
                  {item.details.map((d, j) => (
                    <Text key={j} style={{ fontSize: 8.5, color: "#333", marginLeft: 8, marginBottom: 1 }}>- {d}</Text>
                  ))}
                </View>
              ))}
            </View>
            <View style={[S.td, { flex: 1, borderRight: 0 }]}>
              {factors.map(f => (
                <View key={f.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3.5 }}>
                  <CB checked={!!fd[f.key]} />
                  <Text style={{ fontSize: 8.5 }}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 3 }]}>{"위험요소\n(위험성 평가 결과 포함)"}</Text>
            <Text style={[S.th, { flex: 3 }]}>{"개선대책\n(개선대책 결과 포함)"}</Text>
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
            <Text style={[S.td, { flex: 1, minHeight: 30 }]}>{fd.reviewOpinion || ""}</Text>
            <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 30 }]}>{fd.reviewResult || ""}</Text>
          </View>
          <View style={S.tr}>
            <Text style={[S.il, { width: 78 }]}>(계획확인)허가자</Text>
            <View style={{ flex: 2, borderRight: "0.5px solid " + C.border, padding: "4 5", justifyContent: "center" }}>
              <Text style={{ fontSize: 8.5, color: "#555" }}>(부서) 안전기술본부   (직책) {isSelf ? "부장" : "용역감독원"}</Text>
            </View>
            <View style={{ width: 85, padding: "4 5", borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
              <Text style={{ fontSize: 9.5 }}>{`(성명) ${a1?.approverName || ""}`}</Text>
            </View>
            <View style={{ width: 105, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: "4 4", gap: 4, borderRight: 0 }}>
              <Text style={{ fontSize: 8, color: "#888" }}>(서명)</Text>
              {a1?.signatureData
                ? <Image src={a1.signatureData} style={{ width: 75, height: 22, objectFit: "contain" }} />
                : <View style={{ width: 75, height: 20, border: "0.5px dashed #ccc" }} />}
            </View>
          </View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 78 }]}>(이행확인)확인자</Text>
            <View style={{ flex: 2, borderRight: "0.5px solid " + C.border, padding: "4 5", justifyContent: "center" }}>
              <Text style={{ fontSize: 8.5, color: "#555" }}>(부서) 안전기술본부   (직책) {isSelf ? "부장" : "용역감독원"}</Text>
            </View>
            <View style={{ width: 85, padding: "4 5", borderRight: "0.5px solid " + C.border, justifyContent: "center" }}>
              <Text style={{ fontSize: 9.5 }}>{`(성명) ${a2?.approverName || ""}`}</Text>
            </View>
            <View style={{ width: 105, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: "4 4", gap: 4, borderRight: 0 }}>
              <Text style={{ fontSize: 8, color: "#888" }}>(서명)</Text>
              {a2?.signatureData
                ? <Image src={a2.signatureData} style={{ width: 75, height: 22, objectFit: "contain" }} />
                : <View style={{ width: 75, height: 20, border: "0.5px dashed #ccc" }} />}
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 9, color: "#555", marginTop: 2 }}>
          {"붙임 1. 해당공종 시작 전 위험성평가표\n       2. 개선대책 확인자료(사진 첨부)"}
        </Text>
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}

// ===== 붙임2: 밀폐공간작업허가서 =====
export function ConfinedSpacePDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature, workAddress, isSelf = false }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approverOrg?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
  workAddress?: string | null; attachments?: AttachmentInfo[]; isSelf?: boolean;
}) {
  const checks: Array<{ label: string; applicable: string; result: string }> = fd.safetyChecks ?? [];
  const gasMeasureRows: Array<{ time: string; hour?: string; minute?: string; substances: string; measurer: string; entryCount: string; exitCount: string }> =
    fd.gasMeasureRows ?? [
      { time: "전", hour: "", minute: "", substances: "", measurer: "", entryCount: "", exitCount: "" },
      { time: "중", hour: "", minute: "", substances: "", measurer: "", entryCount: "", exitCount: "" },
      { time: "후", hour: "", minute: "", substances: "", measurer: "", entryCount: "", exitCount: "" },
    ];
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const periodText = buildPeriod(fd);
  const workLocationText = getWorkLocation(fd, workAddress);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}>
          <Text style={S.titleMain}>밀폐공간 작업 허가서<Text style={{ fontSize: 13, fontWeight: "normal" }}>(용역업체용)</Text></Text>
        </View>
        <View style={S.table}>
          <ApplicantRow applicantCompany={fd.applicantCompany} applicantTitle={fd.applicantTitle} applicantName={fd.applicantName} signatureData={applicantSignature} labelWidth={100} />
          {[
            { label: "용  역  명",    val: taskName || fd.serviceName || "" },
            { label: "작업수행기간", val: periodText },
            { label: "작업장소",     val: workLocationText },
            { label: "작업내용",     val: fd.workContent || "" },
            { label: "출입자 명단", val: fd.entryList || "" },
          ].map((row, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.il, { width: 100 }]}>{row.label}</Text>
              <Text style={[S.iv, { borderRight: 0, minHeight: 16 }]}>{row.val}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 3 }}>위 공간에서의 작업을 다음의 조건하에서만 허가함.</Text>

        {/* 1. 화기작업 허가필요유무 */}
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "3 6", marginBottom: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>1. 화기작업 허가필요유무 :   </Text>
            <CB checked={fd.needFireWork === "필요"} /><Text style={{ fontSize: 10, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needFireWork === "불필요"} /><Text style={{ fontSize: 10 }}> 불필요</Text>
          </View>
        </View>

        {/* 2. 내연기관(양수기) 또는 갈탄 등의 사용여부 */}
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "3 6", marginBottom: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>2. 내연기관(양수기) 또는 갈탄 등의 사용여부 :   </Text>
            <CB checked={fd.useInternalEngine === "사용"} /><Text style={{ fontSize: 10, marginRight: 14 }}> 사용   </Text>
            <CB checked={fd.useInternalEngine === "미사용"} /><Text style={{ fontSize: 10 }}> 미사용</Text>
          </View>
        </View>

        {/* 3. 안전조치 요구사항 */}
        <Text style={S.secHeader}>3. 안전조치 요구사항</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 4 }]}>확인항목</Text>
            <Text style={[S.th, { flex: 1 }]}>해당여부</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>확인결과</Text>
          </View>
          {checks.map((item, idx) => {
            const isBold = item.label.startsWith("●");
            const displayLabel = item.label.replace(/^●/, "");
            return (
              <View key={idx} style={idx === checks.length - 1 ? S.trLast : S.tr}>
                <Text style={[S.td, { flex: 4, minHeight: 14, fontWeight: isBold ? "bold" : "normal", backgroundColor: idx % 2 === 1 ? C.rowEven : C.white }]}>
                  {`○ ${displayLabel}`}
                </Text>
                <Text style={[S.tdc, { flex: 1, minHeight: 14, backgroundColor: item.applicable === "해당" ? "#dce6f0" : C.white }]}>{item.applicable || ""}</Text>
                <Text style={[S.tdc, { flex: 2, borderRight: 0, minHeight: 14, backgroundColor: item.result ? "#ebf3e8" : C.white }]}>{item.result || ""}</Text>
              </View>
            );
          })}
        </View>

        {/* 4. 산소 및 유해가스 농도 측정결과 */}
        <Text style={S.secHeader}>4. 산소 및 유해가스 농도 측정결과</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { width: 55, textAlign: "center" }]}>측정시간</Text>
            <Text style={[S.th, { flex: 3 }]}>측정물질명 및 농도</Text>
            <Text style={[S.th, { flex: 1.5 }]}>측정자</Text>
            <View style={{ flex: 1, borderRight: 0 }}>
              <Text style={[S.th, { borderRight: 0, borderBottom: "0.5px solid " + C.border, textAlign: "center", paddingBottom: 3 }]}>인원 확인(감시인)</Text>
              <View style={{ flexDirection: "row" }}>
                <Text style={[S.th, { flex: 1, borderRight: "0.5px solid " + C.border, fontSize: 8.5 }]}>입</Text>
                <Text style={[S.th, { flex: 1, borderRight: 0, fontSize: 8.5 }]}>출</Text>
              </View>
            </View>
          </View>
          {gasMeasureRows.map((row, idx) => (
            <View key={idx} style={idx === gasMeasureRows.length - 1 ? S.trLast : S.tr}>
              <View style={{ width: 55, borderRight: "0.5px solid " + C.border, padding: "4 4", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold" }}>{row.time}</Text>
                <Text style={{ fontSize: 8.5 }}>{`${row.hour || "  "}시 ${row.minute || "  "}분`}</Text>
              </View>
              <Text style={[S.td, { flex: 3, minHeight: 18 }]}>{row.substances || ""}</Text>
              <Text style={[S.td, { flex: 1.5, minHeight: 18 }]}>{row.measurer || ""}</Text>
              <Text style={[S.tdc, { flex: 0.5, minHeight: 18 }]}>{row.entryCount || ""}</Text>
              <Text style={[S.tdc, { flex: 0.5, borderRight: 0, minHeight: 18 }]}>{row.exitCount || ""}</Text>
            </View>
          ))}
        </View>

        {/* 5. 특별조치 필요사항 */}
        <Text style={S.secHeader}>5. 특별조치 필요사항</Text>
        <View style={[S.table, { marginBottom: 5 }]}>
          <Text style={[S.td, { borderRight: 0, minHeight: 20 }]}>{fd.specialMeasures || ""}</Text>
        </View>

        <ApproverSection entries={[
          { roleLabel: "(계획확인) 허가자", deptLabel: `(부서) 안전기술본부   (직책) ${isSelf ? "부장" : "용역감독원"}`, name: a1?.approverName, signatureData: a1?.signatureData },
          { roleLabel: "(이행확인) 확인자", deptLabel: `(부서) 안전기술본부   (직책) ${isSelf ? "부장" : "용역감독원"}`, name: a2?.approverName, signatureData: a2?.signatureData },
        ]} />
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}

// ===== 붙임3: 휴일작업신청서 =====
export function HolidayWorkPDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature, workAddress, isSelf = false }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approverOrg?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
  workAddress?: string | null; attachments?: AttachmentInfo[]; isSelf?: boolean;
}) {
  const participants: Array<{ role: string; name: string; phone: string }> = fd.participants ?? [];
  const a1 = approvalLines.find(l => l.approvalOrder === 1);
  const a2 = approvalLines.find(l => l.approvalOrder === 2);
  const periodText = buildPeriod(fd);
  const workLocationText = getWorkLocation(fd, workAddress);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.titleBox}><Text style={S.titleMain}>안전관리 휴일작업 신청서</Text></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 10.5 }}>{`작업일시: ${periodText}`}</Text>
          <Text style={{ fontSize: 10 }}>{`신고일시: ${fd.requestDate || ""}`}</Text>
        </View>
        <Text style={[S.secHeader, { marginTop: 4 }]}>1. 용역 개요</Text>
        <View style={S.table}>
          <View style={S.tr}><Text style={[S.il, { width: 58 }]}>용역명</Text><Text style={[S.iv, { borderRight: 0 }]}>{taskName || fd.serviceName || ""}</Text></View>
          <View style={S.trLast}>
            <Text style={[S.il, { width: 58 }]}>수급인</Text>
            <Text style={[S.iv, { flex: 1, borderRight: "0.5px solid " + C.border }]}>{fd.contractorCompany || ""}</Text>
            <Text style={[S.il, { width: 55 }]}>용역기간</Text>
            <Text style={[S.iv, { flex: 1, borderRight: 0 }]}>{`${fd.contractPeriodStart || fd.workStartDate || ""} ~ ${fd.contractPeriodEnd || fd.workEndDate || ""}`}</Text>
          </View>
        </View>
        <Text style={S.secHeader}>2. 휴일작업 개요</Text>
        <View style={S.table}>
          {[
            [{ w: 75, label: "작업대상 시설물", val: fd.facilityName }, { w: 55, label: "시설 관리자", val: `${fd.facilityManager || ""} (${fd.facilityManagerGrade || ""})` }],
            [{ w: 75, label: "위치", val: workLocationText }, { w: 55, label: "작업위치", val: fd.workPosition }],
            [{ w: 75, label: "작업공종", val: fd.workContents }, { w: 55, label: "위험요소", val: fd.riskFactors }],
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
          <View style={S.trLast}><Text style={[S.il, { width: 75 }]}>개선대책</Text><Text style={[S.iv, { borderRight: 0 }]}>{fd.improvementMeasures || ""}</Text></View>
        </View>
        <Text style={S.secHeader}>휴일작업 참여자(감독사 포함)</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 2 }]}>직위구분</Text>
            <Text style={[S.th, { flex: 2 }]}>성명</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>연락처</Text>
          </View>
          {participants.map((p, idx) => (
            <View key={idx} style={idx === participants.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 2, minHeight: 24 }]}>{p.role || ""}</Text>
              <Text style={[S.td, { flex: 2, minHeight: 24 }]}>{p.name || ""}</Text>
              <Text style={[S.td, { flex: 2, borderRight: 0, minHeight: 24 }]}>{p.phone || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secHeader}>3. 용역감독 검토내용</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 1 }]}>검토의견</Text>
            <Text style={[S.th, { flex: 1, borderRight: 0 }]}>조치결과</Text>
          </View>
          <View style={S.trLast}>
            <Text style={[S.td, { flex: 1, minHeight: 50 }]}>{fd.reviewOpinion || ""}</Text>
            <Text style={[S.td, { flex: 1, borderRight: 0, minHeight: 50 }]}>{fd.reviewResult || ""}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 10, textAlign: "center", marginVertical: 4 }}>위와 같이 휴일작업을 신청하오니 검토하여 승인하여 주시기 바랍니다.</Text>
        <View style={{ border: "0.8px solid " + C.border, marginBottom: 3 }}>
          {/* 신청자 행 */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: "4 6", minHeight: 36 }}>
            <Text style={{ fontSize: 9, width: 55, color: C.black }}>신청자</Text>
            <Text style={{ fontSize: 9, flex: 1 }}>{`(소속) ${fd.applicantOrg || ""}  (안전보건관리책임자) ${fd.applicantName || ""}`}</Text>
            <Text style={{ fontSize: 9, width: 30, color: C.black, textAlign: "center" }}>(서명)</Text>
            {applicantSignature
              ? <Image src={applicantSignature} style={{ width: 50, height: 28, objectFit: "contain" }} />
              : <View style={{ width: 50, height: 28 }} />}
          </View>
          {/* 검토자 행 */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: "4 6", minHeight: 28, borderTop: "0.5px solid " + C.border }}>
            <Text style={{ fontSize: 9, width: 55, color: C.black }}>검토자</Text>
            <Text style={{ fontSize: 9, flex: 1 }}>{`(소속) ${a1?.approverOrg || ""}  (용역감독원) ${a1?.approverName || ""}`}</Text>
            <Text style={{ fontSize: 9, width: 30, color: C.black, textAlign: "center" }}>(서명)</Text>
            {a1?.signatureData
              ? <Image src={a1.signatureData} style={{ width: 50, height: 28, objectFit: "contain" }} />
              : <View style={{ width: 50, height: 28 }} />}
          </View>
          {/* 승인자 행 */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: "4 6", minHeight: 28, borderTop: "0.5px solid " + C.border }}>
            <Text style={{ fontSize: 9, width: 55, color: C.black }}>승인자</Text>
            <Text style={{ fontSize: 9, flex: 1 }}>{`(소속) ${a2?.approverOrg || ""}  (관리감독자) ${a2?.approverName || ""}`}</Text>
            <Text style={{ fontSize: 9, width: 30, color: C.black, textAlign: "center" }}>(서명)</Text>
            {a2?.signatureData
              ? <Image src={a2.signatureData} style={{ width: 50, height: 28, objectFit: "contain" }} />
              : <View style={{ width: 50, height: 28 }} />}
          </View>
        </View>
        <Text style={{ fontSize: 13, fontWeight: "bold", textAlign: "center", marginTop: 6 }}>한국농어촌공사 안전기술본부 귀하</Text>
        <Footer documentId={documentId} createdAt={createdAt} />
      </Page>
    </Document>
  );
}

// ===== 붙임4: 정전작업허가서 =====
export function PowerOutagePDF({ formData: fd, approvalLines, documentId, createdAt, taskName, applicantSignature, workAddress, isSelf = false }: {
  formData: Record<string, any>;
  approvalLines: Array<{ approverName?: string; approverOrg?: string; approvalOrder: number; signatureData?: string; actedAt?: string }>;
  documentId: string; createdAt: string; taskName?: string; applicantSignature?: string;
  workAddress?: string | null; attachments?: AttachmentInfo[]; isSelf?: boolean;
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
  const workLocationText = getWorkLocation(fd, workAddress);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={[S.titleBox, { marginBottom: 5 }]}>
          <Text style={{ fontSize: 20, fontWeight: "bold", textAlign: "center" }}>
            {"정전작업 허가서"}
            <Text style={{ fontSize: 13, fontWeight: "normal" }}>{"(용역업체용)"}</Text>
          </Text>
        </View>
        <View style={S.table}>
          <ApplicantRow applicantCompany={fd.applicantCompany} applicantTitle={fd.applicantTitle} applicantName={fd.applicantName} signatureData={applicantSignature} labelWidth={102} />
          {[
            { label: "용  역  명",    val: taskName || fd.serviceName || "" },
            { label: "작업수행기간", val: periodText },
            { label: "작업장소",     val: workLocationText },
            { label: "작업내용",     val: fd.workContent || "" },
            { label: "입장자 명단", val: fd.entryList || "" },
          ].map((row, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.il, { width: 102 }]}>{row.label}</Text>
              <Text style={[S.iv, { borderRight: 0, minHeight: 20 }]}>{row.val}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 10, textAlign: "center", marginBottom: 4 }}>위 작업을 다음의 조건하에서만 허가함.</Text>
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "3 6", marginBottom: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>1. 밀폐공간작업 허가 필요여부 :   </Text>
            <CB checked={fd.needConfinedSpace === "필요"} /><Text style={{ fontSize: 10, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needConfinedSpace === "불필요"} /><Text style={{ fontSize: 10 }}> 불필요</Text>
          </View>
        </View>
        <View style={{ backgroundColor: C.greenBg, border: "0.8px solid " + C.border, padding: "3 6", marginBottom: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>2. 화기작업 허가 필요여부 :   </Text>
            <CB checked={fd.needFireWork === "필요"} /><Text style={{ fontSize: 10, marginRight: 14 }}> 필요   </Text>
            <CB checked={fd.needFireWork === "불필요"} /><Text style={{ fontSize: 10 }}> 불필요</Text>
          </View>
        </View>
        <Text style={S.secHeader}>3. 안전조치 이행사항</Text>
        <View style={S.table}>
          <View style={S.tr}>
            <Text style={[S.th, { flex: 4 }]}>확인항목</Text>
            <Text style={[S.th, { flex: 1 }]}>해당여부</Text>
            <Text style={[S.th, { flex: 2, borderRight: 0 }]}>확인결과</Text>
          </View>
          {checks.map((item, idx) => (
            <View key={idx} style={idx === checks.length - 1 ? S.trLast : S.tr}>
              <Text style={[S.td, { flex: 4, minHeight: 14, backgroundColor: idx % 2 === 1 ? C.rowEven : C.white }]}>{`▶ ${item.label}`}</Text>
              <Text style={[S.tdc, { flex: 1, minHeight: 14, backgroundColor: item.applicable === "해당" ? "#dce6f0" : C.white }]}>{item.applicable || ""}</Text>
              <Text style={[S.tdc, { flex: 2, borderRight: 0, minHeight: 14, backgroundColor: item.result ? "#ebf3e8" : C.white }]}>{item.result || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={S.secHeader}>4. 기기 확인 결과</Text>
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
          <Text style={[S.td, { borderRight: 0, minHeight: 20 }]}>{fd.specialMeasures || ""}</Text>
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


// ===== TBM \uc77c\uc77c\uc548\uc804\uad50\uc721\ubcf4\uace0\uc11c PDF =====
export function TbmReportPDF({ report }: { report: Record<string, any> }) {
  const T = StyleSheet.create({
    page: { fontFamily: "NanumGothic", fontSize: 8.5, paddingTop: 10, paddingBottom: 20, paddingHorizontal: 14, color: "#000" },
    titleBox: { border: "1.5px solid #000", paddingVertical: 8, marginBottom: 6 },
    titleMain: { fontSize: 18, fontWeight: "bold", textAlign: "center", letterSpacing: 2 },
    section: { marginBottom: 6 },
    secHeader: { backgroundColor: "#bdd7ee", border: "0.8px solid #7f9fbf", padding: "3 6", fontSize: 9.5, fontWeight: "bold", marginBottom: 0 },
    table: { border: "0.8px solid #7f9fbf" },
    tr: { flexDirection: "row", borderBottom: "0.5px solid #7f9fbf" },
    trLast: { flexDirection: "row" },
    label: { fontWeight: "bold", padding: "3 5", fontSize: 8.5, borderRight: "0.5px solid #7f9fbf", backgroundColor: "#f2f2f2", width: 90 },
    val: { flex: 1, padding: "3 5", fontSize: 8.5 },
    riskBox: { border: "0.8px solid #7f9fbf", marginBottom: 3, padding: "4 6" },
    riskTitle: { fontSize: 8.5, fontWeight: "bold", color: "#1a3a5c", marginBottom: 2 },
    riskContent: { fontSize: 8.5 },
    riskMeasure: { fontSize: 8, color: "#1a5c3a", marginTop: 1 },
    mainRiskBox: { border: "0.8px solid #f59e0b", backgroundColor: "#fffbeb", marginBottom: 3, padding: "4 6" },
    footer: { position: "absolute", bottom: 6, left: 14, right: 14, borderTop: "0.5px solid #aaa", paddingTop: 3, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: "#666" },
  });

  const Field = ({ label, value }: { label: string; value?: any }) => {
    if (value === null || value === undefined || value === "") return null;
    const display = typeof value === "boolean" ? (value ? "\uc0ac\uc6a9" : "\ubbf8\uc0ac\uc6a9") : String(value);
    return (
      <View style={T.tr}>
        <Text style={T.label}>{label}</Text>
        <Text style={T.val}>{display}</Text>
      </View>
    );
  };

  const hasRisk = report.riskFactor1 || report.riskFactor2 || report.riskFactor3 || report.mainRiskFactor;

  return (
    <Document>
      <Page size="A4" style={T.page}>
        <View style={T.titleBox}>
          <Text style={T.titleMain}>TBM \uc77c\uc77c\uc548\uc804\uad50\uc721\ubcf4\uace0\uc11c</Text>
        </View>

        {/* 1. \uae30\ubcf8\uc815\ubcf4 */}
        <Text style={T.secHeader}>1. \uae30\ubcf8\uc815\ubcf4</Text>
        <View style={[T.table, T.section]}>
          <Field label="\ubcf4\uace0\uc77c\uc790" value={report.reportDate} />
          <Field label="\uad50\uc721\uc2dc\uac04" value={report.eduStartTime && report.eduEndTime ? `${report.eduStartTime} ~ ${report.eduEndTime}` : report.eduStartTime} />
          <Field label="\ubcf8\ubd80" value={report.headquarters} />
          <Field label="\uc9c0\uc18c" value={report.branch} />
          <Field label="\uc0ac\uc5c5\uba85" value={report.projectName} />
          <Field label="\uc0ac\uc5c5\uc720\ud615" value={report.projectType} />
          <Field label="\uc218\uae09\uc0ac\uba85" value={report.contractorName} />
          <View style={T.trLast}>
            <Text style={T.label}>\uc2dc\uc124\uba85</Text>
            <Text style={T.val}>{report.facilityName || ""}</Text>
          </View>
        </View>

        {/* 2. \uc791\uc5c5\uc815\ubcf4 */}
        <Text style={T.secHeader}>2. \uc791\uc5c5\uc815\ubcf4</Text>
        <View style={[T.table, T.section]}>
          <Field label="\ub2f9\uc77c\uc791\uc5c5" value={report.workToday} />
          <Field label="\uc791\uc5c5\uc7a5\uc18c" value={report.workAddress} />
          <Field label="\uc791\uc5c5\uc778\uc6d0" value={report.workerCount ? `${report.workerCount}\uba85` : null} />
          <Field label="\uc2e0\uaddc\uc785\uc7a5\uc790" value={report.newWorkerCount ? `${report.newWorkerCount}\uba85` : null} />
          <Field label="\uc791\uc5c5\uae30\uacc4" value={report.equipment} />
          <Field label="\uc704\ud5d8\uc885\ubcd1" value={report.riskType} />
          <View style={T.trLast}>
            <Text style={T.label}>CCTV</Text>
            <Text style={T.val}>{report.cctvUsed ? "\uc0ac\uc6a9" : "\ubbf8\uc0ac\uc6a9"}</Text>
          </View>
        </View>

        {/* 3. \uc704\ud5d8\uc694\uc778 \ubc0f \uc870\uce58 */}
        {hasRisk && (
          <View style={T.section}>
            <Text style={T.secHeader}>3. \uc704\ud5d8\uc694\uc778 \ubc0f \uc870\uce58</Text>
            <View style={{ marginTop: 2 }}>
              {[1, 2, 3].map(n => report[`riskFactor${n}`] ? (
                <View key={n} style={T.riskBox}>
                  <Text style={T.riskTitle}>\uc704\ud5d8\uc694\uc778 {n}</Text>
                  <Text style={T.riskContent}>{report[`riskFactor${n}`]}</Text>
                  {report[`riskMeasure${n}`] && <Text style={T.riskMeasure}>\u2192 \uc870\uce58: {report[`riskMeasure${n}`]}</Text>}
                </View>
              ) : null)}
              {report.mainRiskFactor && (
                <View style={T.mainRiskBox}>
                  <Text style={[T.riskTitle, { color: "#92400e" }]}>\uc911\uc810\uc704\ud5d8\uc694\uc778</Text>
                  <Text style={T.riskContent}>{report.mainRiskFactor}</Text>
                  {report.mainRiskMeasure && <Text style={[T.riskMeasure, { color: "#92400e" }]}>\u2192 \uc870\uce58: {report.mainRiskMeasure}</Text>}
                </View>
              )}
              {(report.riskElement1 || report.riskElement2 || report.riskElement3) && (
                <View style={T.riskBox}>
                  <Text style={T.riskTitle}>\uc704\ud5d8\uc694\uc18c</Text>
                  {[1, 2, 3].map(n => report[`riskElement${n}`] ? <Text key={n} style={T.riskContent}>{report[`riskElement${n}`]}</Text> : null)}
                </View>
              )}
            </View>
          </View>
        )}

        {/* 4. \uae30\ud0c0\uc0ac\ud56d */}
        {report.otherContent && (
          <View style={T.section}>
            <Text style={T.secHeader}>4. \uae30\ud0c0\uc0ac\ud56d</Text>
            <View style={{ border: "0.8px solid #7f9fbf", padding: "4 6" }}>
              <Text style={{ fontSize: 8.5 }}>{report.otherContent}</Text>
            </View>
          </View>
        )}

        {/* 5. \ud604\uc7a5\uc0ac\uc9c4 */}
        {report.photoUrl && (
          <View style={T.section}>
            <Text style={T.secHeader}>5. TBM \ud604\uc7a5\uc0ac\uc9c4</Text>
            <Image src={report.photoUrl} style={{ width: "100%", maxHeight: 160, objectFit: "contain", marginTop: 2, border: "0.5px solid #ccc" }} />
          </View>
        )}

        {/* 6. \uad50\uc721\ub2f4\ub2f9\uc790 */}
        <Text style={T.secHeader}>6. \uad50\uc721\ub2f4\ub2f9\uc790</Text>
        <View style={[T.table, { marginBottom: 8 }]}>
          <Field label="\uc131\uba85" value={report.instructorName} />
          <View style={T.trLast}>
            <Text style={T.label}>\uc5f0\ub77d\ucc98</Text>
            <Text style={T.val}>{report.instructorPhone || ""}</Text>
          </View>
        </View>

        {/* \uc11c\uba85 */}
        {report.signatureData && (
          <View style={{ border: "0.8px solid #7f9fbf", padding: "6 10", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 8.5, color: "#555" }}>\uc11c\uba85</Text>
            <Image src={report.signatureData} style={{ height: 28, width: 100, objectFit: "contain" }} />
          </View>
        )}

        <View style={T.footer}>
          <Text style={T.footerText}>{`TBM ID: ${(report.id || "").slice(0, 8)}`}</Text>
          <Text style={T.footerText}>{`\ubc1c\uae09\uc77c\uc2dc: ${new Date().toLocaleString("ko-KR")} | \ubcf8 \ubb38\uc11c\ub294 \uc804\uc790\ubb38\uc11c\ub85c \ubc1c\uae09\ub418\uc5c8\uc2b5\ub2c8\ub2e4`}</Text>
        </View>
      </Page>
    </Document>
  );
}
