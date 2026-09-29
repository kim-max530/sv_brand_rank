"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import {
  fetchLiveHashtagRanking,
  type LiveHashtagRankItem,
} from "@/actions/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

const REFRESH_MS = 5 * 60 * 1000;
const MOBILE_INITIAL = 6;

type Row = LiveHashtagRankItem & {
  changeText: string;
};

function calcChange(
  tag: string,
  rank: number,
  prevRanks: Map<string, number>,
): string {
  const prev = prevRanks.get(tag.toLowerCase());
  if (prev == null) return "-";
  const delta = prev - rank;
  if (delta === 0) return "-";
  if (delta > 0) return `▲ ${delta}`;
  return `▼ ${Math.abs(delta)}`;
}

export default function LiveHashtagPanel({
  variant = "sidebar",
}: {
  /** sidebar: 데스크탑 우측 / strip: 모바일 상단 */
  variant?: "sidebar" | "strip";
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    const result = await fetchLiveHashtagRanking();
    if (!result.ok) {
      setLoading(false);
      return;
    }

    const prev = prevRanksRef.current;
    const nextRows = result.data.map((item) => ({
      ...item,
      changeText: calcChange(item.tag, item.rank, prev),
    }));

    const nextPrev = new Map<string, number>();
    for (const item of result.data) {
      nextPrev.set(item.tag.toLowerCase(), item.rank);
    }
    prevRanksRef.current = nextPrev;

    setRows(nextRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const visible =
    variant === "strip" && !expanded ? rows.slice(0, MOBILE_INITIAL) : rows;

  return (
    <aside
      className={
        variant === "sidebar"
          ? "hidden w-full shrink-0 lg:block lg:w-[38%] lg:max-w-sm"
          : "w-full lg:hidden"
      }
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
          <h2 className="text-sm font-semibold text-slate-800">
            실시간 해시태그 Top 10
          </h2>
          <p className="text-[11px] text-slate-400">5분마다 자동 갱신</p>
        </div>

        {loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            불러오는 중…
          </p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            최근 클릭된 해시태그가 없습니다.
          </p>
        ) : (
          <ul>
            {visible.map((item) => (
              <li key={item.tag}>
                <Link
                  href={hashtagHref(item.tag)}
                  onClick={() => trackAnalyticsEvent("hashtag_click", item.tag)}
                  className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 transition hover:bg-slate-50/80 sm:gap-3 sm:px-4"
                >
                  <span
                    className={`w-7 shrink-0 text-center text-[11px] font-semibold tabular-nums ${
                      item.changeText.startsWith("▲")
                        ? "text-red-500"
                        : item.changeText.startsWith("▼")
                          ? "text-blue-500"
                          : "text-gray-400"
                    }`}
                  >
                    {item.changeText}
                  </span>
                  <span className="w-6 shrink-0 text-center font-display text-base font-semibold tabular-nums text-slate-800">
                    {item.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-teal-700">
                    #{item.tag}
                  </span>
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-slate-500"
                    title={`저자 ${item.authorCount}명`}
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {item.authorCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {variant === "strip" && rows.length > MOBILE_INITIAL ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            {expanded ? "접기 ▴" : "더보기 ▾"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
