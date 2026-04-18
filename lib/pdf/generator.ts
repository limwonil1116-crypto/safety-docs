// lib/pdf/generator.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import React from "react";
import { SafetyWorkPermitPDF, ConfinedSpacePDF, HolidayWorkPDF, PowerOutagePDF, AttachmentPagesPDF } from "./templates";

export interface ApprovalLineInfo {
  approverName?: string;
  approverOrg?: string;
  approvalOrder: number;
  signatureData?: string;
  actedAt?: string;
}

export interface AttachmentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  attachmentType: string;
  description: string | null;
}

export interface GeneratePDFOptions {
  documentId: string;
  documentType: string;
  formData: Record<string, unknown>;
  approvalLines: ApprovalLineInfo[];
  createdAt: string;
  taskName?: string;
  applicantSignature?: string;
  workAddress?: string | null;
  attachments?: AttachmentInfo[];  // ✅ 첨부파일
}

export async function generatePDF(options: GeneratePDFOptions): Promise<{ buffer: Buffer; filename: string }> {
  const {
    documentId, documentType, formData, approvalLines,
    createdAt, taskName, applicantSignature, workAddress,
    attachments = [],
  } = options;

  const TYPE_MAP: Record<string, string> = {
    SAFETY_WORK_PERMIT: "안전작업허가서",
    CONFINED_SPACE:     "밀폐공간작업허가서",
    HOLIDAY_WORK:       "휴일작업신청서",
    POWER_OUTAGE:       "정전작업허가서",
  };

  const typeName = TYPE_MAP[documentType] ?? "안전서류";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `${typeName}_${dateStr}_${documentId.slice(0, 8)}.pdf`;

  const commonProps = {
    formData: formData as Record<string, any>,
    approvalLines,
    documentId,
    createdAt,
    taskName,
    applicantSignature,
    workAddress,
    attachments,
  };

  // ✅ 메인 문서 element
  let mainElement: React.ReactElement;
  switch (documentType) {
    case "CONFINED_SPACE": mainElement = React.createElement(ConfinedSpacePDF,    commonProps); break;
    case "HOLIDAY_WORK":   mainElement = React.createElement(HolidayWorkPDF,      commonProps); break;
    case "POWER_OUTAGE":   mainElement = React.createElement(PowerOutagePDF,      commonProps); break;
    default:               mainElement = React.createElement(SafetyWorkPermitPDF, commonProps);
  }

  // ✅ 첨부파일 페이지 (이미지/PDF URL들을 추가 페이지로)
  // - 위험성평가표: description === "위험성평가표" 인 DOCUMENT 파일
  // - 개선대책: PHOTO 타입 (사진)
  const riskAssessFiles = attachments.filter(a =>
    a.attachmentType === "DOCUMENT" && a.description === "위험성평가표"
  );
  const safetyCheckPhotos = attachments.filter(a =>
    a.attachmentType === "PHOTO"
  );
  const safetyCheckDocs = attachments.filter(a =>
    a.attachmentType === "DOCUMENT" && a.description === "개선대책확인자료"
  );

  const hasAttachments = riskAssessFiles.length > 0 || safetyCheckPhotos.length > 0 || safetyCheckDocs.length > 0;

  // 첨부파일이 있으면 함께 렌더링
  if (hasAttachments) {
    const attachElement = React.createElement(AttachmentPagesPDF, {
      riskAssessFiles,
      safetyCheckPhotos,
      safetyCheckDocs,
      documentId,
      createdAt,
    });
    // 두 Document를 합치기 위해 각각 buffer 생성 후 합침
    const [mainBuffer, attachBuffer] = await Promise.all([
      renderToBuffer(mainElement),
      renderToBuffer(attachElement),
    ]);
    // PDF 병합 (간단히 PDFLib 없이 buffer concat은 안되므로 PDFLib 사용)
    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();
    const mainPdf = await PDFDocument.load(mainBuffer);
    const attachPdf = await PDFDocument.load(attachBuffer);
    const mainPages = await mergedPdf.copyPages(mainPdf, mainPdf.getPageIndices());
    mainPages.forEach(p => mergedPdf.addPage(p));
    const attachPages = await mergedPdf.copyPages(attachPdf, attachPdf.getPageIndices());
    attachPages.forEach(p => mergedPdf.addPage(p));
    const mergedBytes = await mergedPdf.save();
    return { buffer: Buffer.from(mergedBytes), filename };
  }

  const buffer = await renderToBuffer(mainElement);
  return { buffer: Buffer.from(buffer), filename };
}

export async function generateAndUploadPDF(options: GeneratePDFOptions): Promise<{ url: string; filename: string; size: number }> {
  const { buffer, filename } = await generatePDF(options);
  const blob = await put(
    `pdf/${options.documentId}/${filename}`,
    buffer,
    { access: "public", contentType: "application/pdf", addRandomSuffix: false }
  );
  return { url: blob.url, filename, size: buffer.length };
}
