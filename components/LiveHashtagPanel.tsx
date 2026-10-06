"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchLiveHashtagRanking,
  type LiveHashtagRankItem,
} from "@/actions/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

const REFRESH_MS = 5 * 60 * 1000;
const PULSE_MS = 30 * 1000;
const TOP_N = 5;

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
  variant?: "sidebar" | "strip";
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    const result = await fetchLiveHashtagRanking();
    if (!result.ok) {
      setLoading(false);
      return;
    }

    const prev = prevRanksRef.current;
    const top = result.data.slice(0, TOP_N);
    const nextRows = top.map((item) => ({
      ...item,
      changeText: calcChange(item.tag, item.rank, prev),
    }));

    const nextPrev = new Map<string, number>();
    for (const item of top) {
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

  useEffect(() => {
    const id = window.setInterval(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    }, PULSE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={
        variant === "sidebar" ? "w-[260px] shrink-0" : "w-full"
      }
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">
            실시간 #태그 검색량 Top 5
          </h2>
        </div>

        {loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-gray-500">
            불러오는 중…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-gray-500">
            최근 클릭된 해시태그가 없습니다.
          </p>
        ) : (
          <ul
            className={`transition-opacity duration-700 ease-in-out ${
              pulse ? "opacity-40" : "opacity-100"
            }`}
          >
            {rows.map((item) => (
              <li key={item.tag}>
                <Link
                  href={hashtagHref(item.tag)}
                  onClick={() => trackAnalyticsEvent("hashtag_click", item.tag)}
                  className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 transition hover:bg-gray-50"
                >
                  <span className="w-4 shrink-0 text-center text-sm font-bold tabular-nums text-gray-900">
                    {item.rank}
                  </span>
                  <span
                    className={`w-8 shrink-0 text-[11px] font-semibold tabular-nums ${
                      item.changeText.startsWith("▲")
                        ? "text-red-500"
                        : item.changeText.startsWith("▼")
                          ? "text-blue-500"
                          : "text-gray-400"
                    }`}
                  >
                    {item.changeText}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                    #{item.tag}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="px-4 py-2 text-right text-[10px] text-gray-400">
          30초마다 갱신 표시
        </p>
      </div>
    </aside>
  );
}
