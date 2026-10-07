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
  authorCountByTag,
}: {
  variant?: "sidebar" | "strip";
  authorCountByTag?: Map<string, number>;
}) {
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
      <div className="rounded-xl border border-[#2B7FFF] bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1 text-base font-bold text-[#1A1E27]">
          실시간{" "}
          <span className="rounded-md bg-[#E8F2FF] px-1.5 py-0.5 font-bold text-[#2B7FFF]">
            #태그
          </span>{" "}
          검색량 Top 5
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
            className={`py-1 transition-opacity duration-700 ease-in-out ${
              pulse ? "opacity-40" : "opacity-100"
            }`}
          >
            {rows.map((item) => {
              const count =
                authorCountByTag?.get(item.tag.toLowerCase()) ??
                item.authorCount;
              return (
                <li key={item.tag} className="border-b border-[#E5E7EB] last:border-b-0">
                  <Link
                    href={hashtagHref(item.tag)}
                    onClick={() =>
                      trackAnalyticsEvent("hashtag_click", item.tag)
                    }
                    className="flex w-full items-center justify-between py-2 transition hover:opacity-80"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-4 font-bold">{item.rank}</span>
                      <span
                        className={`w-6 text-xs font-bold ${
                          item.changeText.startsWith("▲")
                            ? "text-[#FF3B30]"
                            : item.changeText.startsWith("▼")
                              ? "text-[#2B7FFF]"
                              : "text-[#9E9E9E]"
                        }`}
                      >
                        {item.changeText}
                      </span>
                      <span className="truncate font-bold text-[#2B7FFF] underline underline-offset-2">
                        #{item.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#717680]">
                      <Users className="h-3.5 w-3.5" />
                      <span>{count}명</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {updatedLabel ? (
          <p className="border-t border-[#E5E7EB] pt-2.5 text-right text-[10px] text-gray-400">
            {updatedLabel} 갱신
          </p>
        ) : null}
      </div>
    </aside>
  );
}
