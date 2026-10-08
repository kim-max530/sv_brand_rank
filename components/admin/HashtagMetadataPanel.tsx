"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchHashtagInfoAdminAction,
  hideHashtagAction,
  restoreHashtagAction,
  saveHashtagDescriptionAction,
  type HashtagInfoAdminRow,
} from "@/actions/hashtag-metadata";

export default function HashtagMetadataPanel() {
  const [rows, setRows] = useState<HashtagInfoAdminRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingTag, setSavingTag] = useState<string | null>(null);
  const [hidingTag, setHidingTag] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const result = await fetchHashtagInfoAdminAction();
    if (!result.ok) {
      setError(result.error);
      setRows([]);
    } else {
      setRows(result.rows);
      const nextDrafts: Record<string, string> = {};
      for (const row of result.rows) {
        nextDrafts[row.tag.toLowerCase()] = row.description;
      }
      setDrafts(nextDrafts);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.tag.toLowerCase().includes(q));
  }, [rows, filter]);

  const handleSave = async (tag: string) => {
    const key = tag.toLowerCase();
    setSavingTag(tag);
    setError("");
    setMessage("");
    const result = await saveHashtagDescriptionAction(
      tag,
      drafts[key] ?? "",
    );
    setSavingTag(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    if (result.rows) {
      setRows(result.rows);
      const nextDrafts: Record<string, string> = {};
      for (const row of result.rows) {
        nextDrafts[row.tag.toLowerCase()] = row.description;
      }
      setDrafts(nextDrafts);
    }
  };

  const handleHide = async (tag: string) => {
    const ok = window.confirm(
      `#${tag} 태그를 숨길까요?\n랭킹·Top5·인기 태그 등 서비스 화면에서 더 이상 표시되지 않습니다.`,
    );
    if (!ok) return;

    setHidingTag(tag);
    setError("");
    setMessage("");
    const result = await hideHashtagAction(tag);
    setHidingTag(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    if (result.rows) setRows(result.rows);
  };

  const handleRestore = async (tag: string) => {
    setHidingTag(tag);
    setError("");
    setMessage("");
    const result = await restoreHashtagAction(tag);
    setHidingTag(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    if (result.rows) setRows(result.rows);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">
              해시태그 정보 관리
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              brand_info에 등록된 해시태그를 가나다순으로 관리합니다. 설명은
              CSV 재업로드와 무관하게 영구 보존되며, 삭제 시 서비스 화면에서
              숨김 처리됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>

        <div className="mt-4">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="해시태그 검색"
            className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">불러오는 중…</p>
        ) : visibleRows.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            표시할 해시태그가 없습니다.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5">해시태그</th>
                  <th className="px-3 py-2.5">브랜드 수</th>
                  <th className="min-w-[240px] px-3 py-2.5">설명</th>
                  <th className="px-3 py-2.5 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const key = row.tag.toLowerCase();
                  const draft = drafts[key] ?? "";
                  const dirty = draft !== row.description;
                  return (
                    <tr
                      key={row.tag}
                      className={`border-t border-slate-100 ${
                        row.isHidden ? "bg-slate-50/80 text-slate-400" : "text-slate-700"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={`font-medium ${
                            row.isHidden ? "text-slate-400 line-through" : "text-teal-800"
                          }`}
                        >
                          #{row.tag}
                        </span>
                        {row.isHidden ? (
                          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            숨김
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {row.authorCount}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="친절한 설명 텍스트"
                            disabled={row.isHidden}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            disabled={
                              savingTag === row.tag || row.isHidden || !dirty
                            }
                            onClick={() => void handleSave(row.tag)}
                            className="shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                          >
                            {savingTag === row.tag ? "저장 중…" : "저장"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {row.isHidden ? (
                          <button
                            type="button"
                            disabled={hidingTag === row.tag}
                            onClick={() => void handleRestore(row.tag)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {hidingTag === row.tag ? "처리 중…" : "복구"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={hidingTag === row.tag}
                            onClick={() => void handleHide(row.tag)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {hidingTag === row.tag ? "처리 중…" : "삭제"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {message ? (
        <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
