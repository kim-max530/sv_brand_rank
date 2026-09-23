"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteAuthorEventAction,
  fetchAuthorEventsAction,
  searchAuthorsByNameAction,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<Array<{ UID: string; 저자명: string }>>(
    [],
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

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

  const handleSearch = async () => {
    setError("");
    setMessage("");
    setMatches([]);
    setForm((prev) => ({ ...prev, uid: "", author_name: "" }));

    const q = searchQuery.trim();
    if (!q) {
      setError("검색할 저자명을 입력해 주세요.");
      return;
    }

    setSearching(true);
    const result = await searchAuthorsByNameAction(q);
    setSearching(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMatches(result.authors);
    if (result.authors.length === 1) {
      const only = result.authors[0];
      setForm((prev) => ({
        ...prev,
        uid: only.UID,
        author_name: only.저자명,
      }));
      setMessage(`선택됨: ${only.저자명} (${only.UID})`);
    } else {
      setMessage(
        `${result.authors.length}명의 후보가 있습니다. 아래에서 선택해 주세요.`,
      );
    }
  };

  const handleSelectAuthor = (author: { UID: string; 저자명: string }) => {
    setForm((prev) => ({
      ...prev,
      uid: author.UID,
      author_name: author.저자명,
    }));
    setSearchQuery(author.저자명);
    setMatches([]);
    setError("");
    setMessage(`선택됨: ${author.저자명} (${author.UID})`);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (!form.uid || !form.author_name) {
      setSaving(false);
      setError("저자 검색 후 대상을 선택해 주세요.");
      return;
    }

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
    setSearchQuery("");
    setMatches([]);
  };

  const handleEdit = (row: AuthorEventRow) => {
    setForm({
      author_name: row.author_name,
      uid: row.uid,
      start_date: row.start_date,
      end_date: row.end_date,
    });
    setSearchQuery(row.author_name);
    setMatches([]);
    setMessage(`선택됨: ${row.author_name} (${row.uid})`);
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
          저자명 검색으로 UID를 자동 조회한 뒤 이벤트 기간을 등록합니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h3 className="text-lg font-semibold text-slate-900">이벤트 등록</h3>

        <div className="mt-4 space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              저자명
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    uid: "",
                    author_name: "",
                  }));
                  setMatches([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder="저자명 입력 후 검색"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={searching}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {searching ? "검색 중…" : "검색"}
              </button>
            </div>
          </div>

          {matches.length > 1 ? (
            <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80">
              {matches.map((author) => (
                <li key={author.UID}>
                  <button
                    type="button"
                    onClick={() => handleSelectAuthor(author)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white"
                  >
                    <span className="font-medium text-slate-900">
                      {author.저자명}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {author.UID}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
            <span className="text-slate-500">선택된 UID: </span>
            {form.uid ? (
              <span className="font-mono font-medium text-slate-800">
                {form.uid}
                <span className="ml-2 font-sans text-slate-600">
                  ({form.author_name})
                </span>
              </span>
            ) : (
              <span className="text-slate-400">검색 후 자동 입력</span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <button
          type="submit"
          disabled={saving || !form.uid}
          className="mt-5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
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
