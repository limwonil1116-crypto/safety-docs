"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const mockDocument = {
  id: "1",
  type: "SAFETY_WORK_PERMIT",
  typeLabel: "안전작업허가서",
  typeShort: "붙임1",
  taskName: "내현지구 정밀안전진단",
  company: "한국안전연구원",
  writer: "홍길동",
  status: "IN_REVIEW",
  statusLabel: "검토중",
  submittedAt: "2026.04.03 09:30",
  isMyTurn: true,
  formData: {
    requestDate: "2026-04-03",
    workDate: "2026-04-04",
    workStartTime: "09:00",
    workEndTime: "18:00",
    projectName: "내현지구 정밀안전진단",
    applicantCompany: "한국안전연구원",
    applicantName: "홍길동",
    workLocation: "내현지구 여수로 구간",
    workContent: "1블록 보강토 쌓기 7블록 외 3개소 방수로 옹벽 재료조사 및 외관조사",
    participants: "홍길동, 이철수, 박민수",
    riskHighPlace: true,
    riskWaterWork: false,
    riskConfinedSpace: false,
    riskPowerOutage: false,
    riskFireWork: false,
    factorSlippery: true,
    factorSteepSlope: true,
    factorNoRailing: true,
    riskSummary: "방수로 옹벽 작업시 추락 위험",
    improvementPlan: "안전난간에 안전로프 설치",
    disasterType: "추락",
  },
  approvalLines: [
    { order: 1, name: "김담당", org: "안전기술본부", role: "REVIEWER", status: "WAITING" },
    { order: 2, name: "이부장", org: "안전기술본부", role: "FINAL_APPROVER", status: "PENDING" },
  ],
  reviewHistory: [],
  attachments: [
    { id: "1", name: "현장사진_01.jpg", type: "PHOTO", size: "2.3MB" },
    { id: "2", name: "위험성평가표.pdf", type: "DOCUMENT", size: "1.1MB" },
  ],
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  SUBMITTED: { bg: "bg-blue-100",  text: "text-blue-600" },
  IN_REVIEW: { bg: "bg-amber-100", text: "text-amber-600" },
  APPROVED:  { bg: "bg-green-100", text: "text-green-600" },
  REJECTED:  { bg: "bg-red-100",   text: "text-red-600" },
};

const STEP_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: "bg-gray-100",  text: "text-gray-500",  label: "대기" },
  WAITING:  { bg: "bg-amber-100", text: "text-amber-600", label: "검토중" },
  APPROVED: { bg: "bg-green-100", text: "text-green-600", label: "승인" },
  REJECTED: { bg: "bg-red-100",   text: "text-red-600",   label: "반려" },
};

export default function ApprovalDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("본문");
  const [reviewOpinion, setReviewOpinion] = useState("");
  const [actionRequest, setActionRequest] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const doc = mockDocument;
  const f = doc.formData;

  return (
    <div className="pb-32">
      {/* 상단 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <Link href="/approvals" className="flex items-center gap-1 text-gray-400 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          승인 목록
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {doc.typeShort}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[doc.status].bg} ${STATUS_STYLE[doc.status].text}`}>
                {doc.statusLabel}
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900">{doc.taskName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{doc.typeLabel} · {doc.company} · {doc.writer}</p>
            <p className="text-xs text-gray-400 mt-0.5">제출일: {doc.submittedAt}</p>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            첨부 {doc.attachments.length}개
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            결재 {doc.approvalLines.length}단계
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 flex">
        {["본문", "첨부", "결재현황"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">

        {/* 본문 탭 */}
        {activeTab === "본문" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">기본정보</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "요청일", value: f.requestDate },
                  { label: "작업예정일", value: f.workDate },
                  { label: "작업시간", value: `${f.workStartTime} ~ ${f.workEndTime}` },
                  { label: "용역명", value: f.projectName },
                  { label: "업체명", value: f.applicantCompany },
                  { label: "신청자", value: f.applicantName },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <span className="text-gray-400 w-24 flex-shrink-0">{item.label}</span>
                    <span className="text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">작업정보</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "작업장소", value: f.workLocation },
                  { label: "작업내용", value: f.workContent },
                  { label: "작업자", value: f.participants },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <span className="text-gray-400 w-24 flex-shrink-0">{item.label}</span>
                    <span className="text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">위험공종 / 위험요소</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {f.riskHighPlace && <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg">고소작업</span>}
                {f.factorSlippery && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">미끄러짐</span>}
                {f.factorSteepSlope && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">급경사</span>}
                {f.factorNoRailing && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">난간 미설치</span>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <span className="text-gray-400 w-24 flex-shrink-0">개선대책</span>
                  <span className="text-gray-900">{f.riskSummary}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-gray-400 w-24 flex-shrink-0">재해형태</span>
                  <span className="text-gray-900">{f.disasterType}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 첨부 탭 */}
        {activeTab === "첨부" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">첨부파일</h3>
            <div className="space-y-2">
              {doc.attachments.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      file.type === "PHOTO" ? "bg-blue-100" : "bg-red-100"
                    }`}>
                      {file.type === "PHOTO" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400">{file.size}</p>
                    </div>
                  </div>
                  <button className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg">
                    다운로드
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 결재현황 탭 */}
        {activeTab === "결재현황" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">결재선</h3>
            <div className="space-y-3">
              {doc.approvalLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "#e0e7ff", color: "#3730a3" }}>
                    {line.order}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{line.name}</span>
                      <span className="text-xs text-gray-400">{line.org}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {line.role === "FINAL_APPROVER" ? "최종 결재권자" : "검토자"}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STEP_STYLE[line.status].bg} ${STEP_STYLE[line.status].text}`}>
                    {STEP_STYLE[line.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 검토의견 입력 (내 차례일 때) */}
        {doc.isMyTurn && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
              검토의견 입력
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">검토의견</label>
                <textarea value={reviewOpinion}
                  onChange={(e) => setReviewOpinion(e.target.value)}
                  placeholder="검토 결과 의견을 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  조치사항 <span className="text-red-400">(반려 시 필수)</span>
                </label>
                <textarea value={actionRequest}
                  onChange={(e) => setActionRequest(e.target.value)}
                  placeholder="필요한 조치사항을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 반려 확인 모달 */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">반려하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-4">
              반려 시 작성자에게 알림이 발송되고 수정 요청이 됩니다.
            </p>
            {(!reviewOpinion || !actionRequest) && (
              <p className="text-xs text-red-500 mb-3">검토의견과 조치사항을 모두 입력해 주세요.</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                취소
              </button>
              <button
                disabled={!reviewOpinion || !actionRequest}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "#dc2626" }}>
                반려
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 승인 확인 모달 */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">승인하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-4">
              승인 후 다음 결재자에게 자동으로 전달됩니다.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                취소
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: "#16a34a" }}>
                승인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 액션 버튼 */}
      {doc.isMyTurn && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button onClick={() => setShowRejectConfirm(true)}
            className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">
            반려
          </button>
          <button onClick={() => setShowApproveConfirm(true)}
            className="flex-2 px-8 py-3 rounded-xl text-white text-sm font-medium"
            style={{ background: "#16a34a" }}>
            승인
          </button>
        </div>
      )}
    </div>
  );
}