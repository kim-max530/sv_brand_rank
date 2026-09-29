"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  appendAuthorHashtagAction,
  deleteHashtagClickEventsAction,
  fetchHashtagClickRanksAction,
  searchAuthorsForHashtagAction,
  type HashtagRankRow,
} from "@/actions/hashtag-admin";

export default function HashtagAdminPanel() {
  const [ranks, setRanks] = useState<HashtagRankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<
    Array<{ UID: string; 저자명: string; record2: string }>
  >([]);
  const [selected, setSelected] = useState<{
    UID: string;
    저자명: string;
    record2: string;
  } | null>(null);
  const [newTag, setNewTag] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRanks = async () => {
    setLoading(true);
    setError("");
    const result = await fetchHashtagClickRanksAction();
    if (!result.ok) {
      setError(result.error);
      setRanks([]);
    } else {
      setRanks(result.ranks);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRanks();
  }, []);

  const handleDelete = async (tag: string) => {
    const ok = window.confirm(
      `#${tag} 해시태그의 클릭 기록을 모두 삭제할까요?\n실시간 검색 랭킹에서 바로 사라집니다.`,
    );
    if (!ok) return;

    setDeletingTag(tag);
    setError("");
    setMessage("");
    const result = await deleteHashtagClickEventsAction(tag);
    setDeletingTag(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage(result.message);
    if (result.ranks) setRanks(result.ranks);
    else void loadRanks();
  };

  const handleSearch = async () => {
    setError("");
    setMessage("");
    setMatches([]);
    setSelected(null);

    const q = searchQuery.trim();
    if (!q) {
      setError("검색할 저자명 또는 UID를 입력해 주세요.");
      return;
    }

    setSearching(true);
    const result = await searchAuthorsForHashtagAction(q);
    setSearching(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMatches(result.authors);
    if (result.authors.length === 1) {
      setSelected(result.authors[0]);
      setMessage(
        `선택됨: ${result.authors[0].저자명} (${result.authors[0].UID})`,
      );
    } else {
      setMessage(
        `${result.authors.length}명의 후보가 있습니다. 아래에서 선택해 주세요.`,
      );
    }
  };

  const handleAppend = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selected) {
      setError("저자를 먼저 검색·선택해 주세요.");
      return;
    }

    setSaving(true);
    const result = await appendAuthorHashtagAction(selected.UID, newTag);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage(result.message);
    setNewTag("");
    setSelected({ ...selected, record2: result.record2 });
    setMatches((prev) =>
      prev.map((item) =>
        item.UID === selected.UID
          ? { ...item, record2: result.record2 }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">
              해시태그 클릭 랭킹
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              최근 7일 analytics_events(hashtag_click) 집계입니다. 삭제 시 해당
              태그의 클릭 기록이 제거됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadRanks()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">불러오는 중…</p>
        ) : ranks.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            표시할 해시태그 클릭 데이터가 없습니다.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5">순위</th>
                  <th className="px-3 py-2.5">해시태그</th>
                  <th className="px-3 py-2.5">클릭수</th>
                  <th className="px-3 py-2.5 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((row, index) => (
                  <tr
                    key={row.tag}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-3 py-2.5 tabular-nums text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-teal-800">
                      #{row.tag}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{row.count}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={deletingTag === row.tag}
                        onClick={() => void handleDelete(row.tag)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {deletingTag === row.tag ? "삭제 중…" : "삭제"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-xl font-semibold text-slate-900">
          저자 해시태그 추가
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          brand_info의 record2에 관리자 추가 태그를 안전하게 병합합니다. CSV
          원본은 유지되고 Supabase override로 저장됩니다.
        </p>

        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="저자명 또는 UID 검색"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching}
              className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
            >
              {searching ? "검색 중…" : "검색"}
            </button>
          </div>

          {matches.length > 1 ? (
            <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {matches.map((author) => (
                <li key={author.UID}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(author);
                      setSearchQuery(author.저자명);
                      setMatches([]);
                      setMessage(`선택됨: ${author.저자명} (${author.UID})`);
                      setError("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-teal-50"
                  >
                    <span className="font-medium text-slate-800">
                      {author.저자명}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {author.UID}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {selected ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3 text-sm">
              <p className="font-semibold text-teal-900">
                {selected.저자명}{" "}
                <span className="font-normal text-teal-700/80">
                  ({selected.UID})
                </span>
              </p>
              <p className="mt-1 break-keep text-xs text-teal-800/80">
                현재 해시태그:{" "}
                {selected.record2?.trim()
                  ? selected.record2
                  : "(없음)"}
              </p>
            </div>
          ) : null}

          <form onSubmit={handleAppend} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="추가할 해시태그 (예: #기출문제)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              disabled={saving || !selected}
              className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </form>
        </div>
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
