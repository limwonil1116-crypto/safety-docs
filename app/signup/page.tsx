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
    email: "",
    password: "",
    passwordConfirm: "",
    role: "CONTRACTOR",
    phone: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          organization: form.organization,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }

      router.push("/login?signup=success");
    } catch {
      setError("회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

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
              <label className="block text-xs text-gray-500 mb-1">이름 <span className="text-red-500">*</span></label>
              <input type="text" value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="홍길동" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">소속 기관</label>
              <input type="text" value={form.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
                placeholder="한국안전연구원"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">이메일 <span className="text-red-500">*</span></label>
              <input type="email" value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="example@email.com" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">전화번호</label>
              <input type="tel" value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">역할 <span className="text-red-500">*</span></label>
              <select value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="CONTRACTOR">용역업체 (작성자)</option>
                <option value="REVIEWER">공사 직원 (검토자)</option>
                <option value="FINAL_APPROVER">최종 결재권자</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">비밀번호 <span className="text-red-500">*</span></label>
              <input type="password" value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="8자 이상" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">비밀번호 확인 <span className="text-red-500">*</span></label>
              <input type="password" value={form.passwordConfirm}
                onChange={(e) => handleChange("passwordConfirm", e.target.value)}
                placeholder="비밀번호 재입력" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
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