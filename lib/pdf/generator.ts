// lib/pdf/generator.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import React from "react";
import { SafetyWorkPermitPDF, ConfinedSpacePDF, HolidayWorkPDF, PowerOutagePDF } from "./templates";

export interface ApprovalLineInfo {
  approverName?: string;
  approverOrg?: string;
  approvalOrder: number;
  signatureData?: string;
  actedAt?: string;
}

export interface GeneratePDFOptions {
  documentId: string;
  documentType: string;
  formData: Record<string, unknown>;
  approvalLines: ApprovalLineInfo[];
  createdAt: string;
  taskName?: string;
  applicantSignature?: string;
}

export async function generatePDF(options: GeneratePDFOptions): Promise<{ buffer: Buffer; filename: string }> {
  const { documentId, documentType, formData, approvalLines, createdAt, taskName, applicantSignature } = options;
  const TYPE_MAP: Record<string, string> = {
    SAFETY_WORK_PERMIT: "안전작업허가서",
    CONFINED_SPACE:     "밀폐공간작업허가서",
    HOLIDAY_WORK:       "휴일작업신청서",
    POWER_OUTAGE:       "정전작업허가서",
  };
  const typeName = TYPE_MAP[documentType] ?? "안전서류";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `${typeName}_${dateStr}_${documentId.slice(0, 8)}.pdf`;
  const commonProps = { formData: formData as Record<string, any>, approvalLines, documentId, createdAt, taskName, applicantSignature };
  let element: React.ReactElement;
  switch (documentType) {
    case "CONFINED_SPACE": element = React.createElement(ConfinedSpacePDF, commonProps); break;
    case "HOLIDAY_WORK":   element = React.createElement(HolidayWorkPDF,   commonProps); break;
    case "POWER_OUTAGE":   element = React.createElement(PowerOutagePDF,   commonProps); break;
    default:               element = React.createElement(SafetyWorkPermitPDF, commonProps);
  }
  const buffer = await renderToBuffer(element);
  return { buffer: Buffer.from(buffer), filename };
}

export async function generateAndUploadPDF(options: GeneratePDFOptions): Promise<{ url: string; filename: string; size: number }> {
  const { buffer, filename } = await generatePDF(options);
  const blob = await put(`pdf/${options.documentId}/${filename}`, buffer, { access: "public", contentType: "application/pdf", addRandomSuffix: false });
  return { url: blob.url, filename, size: buffer.length };
}
