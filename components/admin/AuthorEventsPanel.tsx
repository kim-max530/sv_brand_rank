"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteAuthorEventAction,
  fetchAuthorEventsAction,
  upsertAuthorEventAction,
} from "@/actions/author-events";
import type { AuthorEventRow } from "@/lib/author-events";

const emptyForm = {
  author_name: "",
  uid: "",
  start_date: "",
  end_date: "",
};

export default function AuthorEventsPanel() {
  const [events, setEvents] = useState<AuthorEventRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await fetchAuthorEventsAction();
      if (!result.ok) {
        setError(result.error);
      } else {
        setEvents(result.events ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.set("author_name", form.author_name);
    formData.set("uid", form.uid);
    formData.set("start_date", form.start_date);
    formData.set("end_date", form.end_date);

    const result = await upsertAuthorEventAction(formData);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEvents(result.events ?? []);
    setMessage(result.message);
    setForm(emptyForm);
  };

  const handleEdit = (row: AuthorEventRow) => {
    setForm({
      author_name: row.author_name,
      uid: row.uid,
      start_date: row.start_date,
      end_date: row.end_date,
    });
    setMessage("");
    setError("");
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm(`UID ${uid} 이벤트를 삭제할까요?`)) return;
    setError("");
    setMessage("");
    const result = await deleteAuthorEventAction(uid);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEvents(result.events ?? []);
    setMessage(result.message);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          저자 이벤트
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          UID 기준으로 upsert · 기간 내 저자에게 Event 뱃지/모달 말풍선이
          표시됩니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h3 className="text-lg font-semibold text-slate-900">이벤트 등록</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              저자명
            </span>
            <input
              required
              value={form.author_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, author_name: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">UID</span>
            <input
              required
              value={form.uid}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, uid: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              시작일
            </span>
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, start_date: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              종료일
            </span>
            <input
              required
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, end_date: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장 (Upsert)"}
        </button>
      </form>

      {message ? (
        <p className="text-sm font-medium text-teal-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">등록된 이벤트</h3>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-sm text-slate-500">불러오는 중…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">저자명</th>
                  <th className="px-4 py-2.5 font-medium">UID</th>
                  <th className="px-4 py-2.5 font-medium">시작</th>
                  <th className="px-4 py-2.5 font-medium">종료</th>
                  <th className="px-4 py-2.5 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      등록된 이벤트가 없습니다.
                    </td>
                  </tr>
                ) : (
                  events.map((row) => (
                    <tr
                      key={row.uid}
                      className="border-t border-slate-100 text-slate-700"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {row.author_name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {row.uid}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {row.start_date}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {row.end_date}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(row.uid)}
                            className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
