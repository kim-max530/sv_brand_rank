"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  fetchLiveHashtagRanking,
  type LiveHashtagRankItem,
} from "@/actions/analytics";
import { TAG_HIGHLIGHT_CLASS } from "@/components/TagBadge";
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

/** KST 기준 M월 D일 HH:mm */
function formatUpdatedAt(date: Date): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

export default function LiveHashtagPanel({
  variant = "sidebar",
  authorCountByTag: _authorCountByTag,
}: {
  variant?: "sidebar" | "strip";
  authorCountByTag?: Map<string, number>;
}) {
  void _authorCountByTag;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);
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
    setUpdatedLabel(formatUpdatedAt(new Date()));
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
      setUpdatedLabel(formatUpdatedAt(new Date()));
      window.setTimeout(() => setPulse(false), 700);
    }, PULSE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={variant === "sidebar" ? "w-[260px] shrink-0" : "w-full"}
    >
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-400 bg-white p-5 shadow-[4px_4px_15px_rgba(0,0,0,0.05)]">
        <h3 className="mb-3 flex flex-wrap items-center justify-center gap-1 text-sm font-bold text-[#1A1E27]">
          실시간 <span className={TAG_HIGHLIGHT_CLASS}>#태그</span> 검색량 Top
          5
        </h3>

        {loading && rows.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-500">
            불러오는 중…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-500">
            최근 클릭된 해시태그가 없습니다.
          </p>
        ) : (
          <ul
            className={`w-full py-1 transition-opacity duration-700 ease-in-out ${
              pulse ? "opacity-40" : "opacity-100"
            }`}
          >
            {rows.map((item) => (
              <li key={item.tag}>
                <Link
                  href={hashtagHref(item.tag)}
                  onClick={() =>
                    trackAnalyticsEvent("hashtag_click", item.tag)
                  }
                  className="flex w-full items-center gap-1.5 py-2 transition-opacity hover:cursor-pointer hover:opacity-80"
                >
                  <span className="w-4 shrink-0 text-center text-xs font-bold">
                    {item.rank}
                  </span>
                  <span
                    className={`w-6 shrink-0 text-center text-xs font-bold ${
                      item.changeText.startsWith("▲")
                        ? "text-[#FF3B30]"
                        : item.changeText.startsWith("▼")
                          ? "text-[#2B7FFF]"
                          : "text-[#9E9E9E]"
                    }`}
                  >
                    {item.changeText}
                  </span>
                  <span className="inline-flex min-w-0 max-w-full items-center">
                    <span
                      className={`${TAG_HIGHLIGHT_CLASS} truncate text-sm`}
                    >
                      #{item.tag}
                    </span>
                    <ArrowUpRight className="ml-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {updatedLabel ? (
          <p className="mt-2 w-full text-center text-[10px] text-gray-400">
            {updatedLabel} 갱신
          </p>
        ) : null}
      </div>
    </aside>
  );
}
