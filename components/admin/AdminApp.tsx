"use client";

import { useEffect, useState, type FormEvent } from "react";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import AuthorEventsPanel from "@/components/admin/AuthorEventsPanel";
import UploadPanel from "@/components/admin/UploadPanel";
import { ADMIN_ID, ADMIN_PW } from "@/lib/admin-auth";
import {
  clearAdminAuthCookie,
  isAdminAuthenticated,
  setAdminAuthCookie,
} from "@/lib/admin-auth-client";

type AdminTab = "upload" | "analytics" | "events";

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "upload", label: "파일 업로드" },
  { id: "analytics", label: "사용 데이터" },
  { id: "events", label: "저자 이벤트" },
];

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (id === ADMIN_ID && password === ADMIN_PW) {
      setAdminAuthCookie();
      setError("");
      onSuccess();
      return;
    }
    setError("아이디 또는 비밀번호가 올바르지 않습니다.");
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          관리자 로그인
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          로그인 세션은 1일간 유지됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">ID</span>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("upload");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:gap-6 lg:py-8">
      <aside className="shrink-0 lg:w-56">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
                Admin
              </p>
              <h1 className="mt-1 font-display text-lg font-semibold text-slate-900">
                주간 랭킹 관리
              </h1>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
            >
              로그아웃
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1.5">
            {TABS.map((item) => {
              const selected = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    selected
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {tab === "upload" ? <UploadPanel /> : null}
        {tab === "analytics" ? <AnalyticsPanel /> : null}
        {tab === "events" ? <AuthorEventsPanel /> : null}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAdminAuthenticated());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-20 text-sm text-slate-500">
        세션 확인 중…
      </div>
    );
  }

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <AdminShell
      onLogout={() => {
        clearAdminAuthCookie();
        setAuthed(false);
      }}
    />
  );
}
