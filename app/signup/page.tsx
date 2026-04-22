"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    organization: "",
    contractorName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    role: "CONTRACTOR",
    phone: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleOrgChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      organization: value === "용역업체" ? "" : value,
      contractorName: value === "용역업체" ? prev.contractorName : "",
    }));
  };

  const orgType = form.organization === "한국농어촌공사" ? "한국농어촌공사"
    : form.contractorName !== "" || form.organization === "" && form.contractorName === "" ? "용역업체"
    : "한국농어촌공사";

  // 소속기관 드롭다운 현재 선택값
  const selectedOrg = form.organization === "한국농어촌공사" ? "한국농어촌공사" : "용역업체";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (form.password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (!form.organization && !form.contractorName) {
      setError("소속기관을 선택해주세요.");
      return;
    }

    const finalOrg = form.organization === "한국농어촌공사"
      ? "한국농어촌공사"
      : form.contractorName;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          organization: finalOrg,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "회원가입에 실패했습니다."); return; }
      router.push("/login?signup=success");
    } catch {
      setError("회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #dbeafe 0%, #eff6ff 50%, #dbeafe 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#2563eb">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">회원가입</h1>
            <p className="text-sm text-gray-500 mt-1">안전관리 시스템</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">이름 <span className="text-red-500">*</span></label>
              <input type="text" value={form.name}
                onChange={e => handleChange("name", e.target.value)}
                placeholder="홍길동" required className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">소속기관 <span className="text-red-500">*</span></label>
              <select
                value={selectedOrg}
                onChange={e => {
                  if (e.target.value === "한국농어촌공사") {
                    setForm(prev => ({ ...prev, organization: "한국농어촌공사", contractorName: "" }));
                  } else {
                    setForm(prev => ({ ...prev, organization: "", contractorName: "" }));
                  }
                }}
                className={inputClass}>
                <option value="">선택해주세요</option>
                <option value="한국농어촌공사">한국농어촌공사</option>
                <option value="용역업체">용역업체</option>
              </select>
              {selectedOrg === "용역업체" && (
                <input type="text" value={form.contractorName}
                  onChange={e => setForm(prev => ({ ...prev, contractorName: e.target.value }))}
                  placeholder="업체명을 입력해주세요" required
                  className={inputClass + " mt-2"} />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">이메일 <span className="text-red-500">*</span></label>
              <input type="email" value={form.email}
                onChange={e => handleChange("email", e.target.value)}
                placeholder="example@email.com" required className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">전화번호</label>
              <input type="tel" value={form.phone}
                onChange={e => handleChange("phone", e.target.value)}
                placeholder="010-0000-0000" className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">비밀번호 <span className="text-red-500">*</span></label>
              <input type="password" value={form.password}
                onChange={e => handleChange("password", e.target.value)}
                placeholder="8자 이상" required className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">비밀번호 확인 <span className="text-red-500">*</span></label>
              <input type="password" value={form.passwordConfirm}
                onChange={e => handleChange("passwordConfirm", e.target.value)}
                placeholder="비밀번호 재입력" required className={inputClass} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-60 mt-2"
              style={{ background: "#2563eb" }}>
              {loading ? "처리 중..." : "회원가입"}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600">
              이미 계정이 있으신가요? <span className="text-blue-600 font-medium">로그인</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
