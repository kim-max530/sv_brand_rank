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
      <p className="px-4 py-12 text-center text-sm text-gray-500">
        데이터를 불러오는 중입니다
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-4 py-12 text-center text-sm text-gray-500">
        데이터를 불러오는 중입니다
        <p className="mt-2 text-xs text-gray-400">{state.message}</p>
      </div>
    );
  }

  const { topTags } = state;

  if (topTags.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-gray-500">
        최근 7일간 클릭된 해시태그가 없습니다.
      </p>
    );
  }

  return (
    <ul>
      {topTags.map((item, index) => (
        <li key={item.tag}>
          <Link
            href={hashtagHref(item.tag)}
            onClick={() => onTagClick(item.tag)}
            className="flex w-full items-center gap-3 border-b border-gray-100 px-1 py-4 transition hover:bg-gray-50 sm:gap-4 sm:px-2"
          >
            <span className="w-7 shrink-0 text-center text-lg font-bold tabular-nums text-gray-900 sm:w-8 sm:text-xl">
              {index + 1}
            </span>
            <span className="w-8 shrink-0 text-[11px] font-medium text-gray-400">
              -
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#2B7FFF] sm:text-base">
              #{item.tag}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
