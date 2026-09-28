"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchHashtagSearchData } from "@/actions/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      topTags: Array<{ tag: string; count: number }>;
      recentTags: Array<{ tag: string; created_at: string }>;
    };

export default function HashtagSearchPanel() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await fetchHashtagSearchData();
        if (cancelled) return;
        if (!result.ok) {
          setState({
            status: "error",
            message: result.error || "데이터를 불러오는 중입니다",
          });
          return;
        }
        setState({
          status: "ready",
          topTags: result.data.topTags,
          recentTags: result.data.recentTags,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "데이터를 불러오는 중입니다",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onTagClick = (tag: string) => {
    trackAnalyticsEvent("hashtag_click", tag);
  };

  if (state.status === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-12 text-center text-sm text-slate-500 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
        데이터를 불러오는 중입니다
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-12 text-center text-sm text-slate-500 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
        데이터를 불러오는 중입니다
        <p className="mt-2 text-xs text-slate-400">{state.message}</p>
      </div>
    );
  }

  const { topTags, recentTags } = state;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
        {topTags.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            최근 7일간 클릭된 해시태그가 없습니다.
          </p>
        ) : (
          <ul>
            {topTags.map((item, index) => (
              <li key={item.tag}>
                <Link
                  href={hashtagHref(item.tag)}
                  onClick={() => onTagClick(item.tag)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 transition hover:bg-slate-50/80 sm:gap-4 sm:px-4"
                >
                  <span className="w-7 shrink-0 text-center font-display text-lg font-semibold tabular-nums text-slate-800 sm:w-8">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-teal-700 sm:text-base">
                    #{item.tag}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {item.count}회
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="w-full shrink-0 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm lg:sticky lg:top-4 lg:w-44">
        <p className="text-[11px] font-semibold tracking-tight text-slate-600">
          다른 유저가 방금 클릭한 해시태그
        </p>
        {recentTags.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">아직 클릭 기록이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {recentTags.map((item, index) => (
              <li key={`${item.tag}-${item.created_at}-${index}`}>
                <Link
                  href={hashtagHref(item.tag)}
                  onClick={() => onTagClick(item.tag)}
                  className="block truncate text-xs font-medium text-teal-700 transition hover:text-teal-900"
                >
                  #{item.tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
