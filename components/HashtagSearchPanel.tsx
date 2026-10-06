"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchHashtagSearchData } from "@/actions/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

export type HashtagSearchReadyData = {
  topTags: Array<{ tag: string; count: number }>;
  recentTags: Array<{ tag: string; created_at: string }>;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HashtagSearchReadyData };

export default function HashtagSearchPanel({
  initialData = null,
}: {
  /** 부모에서 사전 fetch한 데이터 — 탭 전환 즉시 노출 */
  initialData?: HashtagSearchReadyData | null;
}) {
  const [state, setState] = useState<LoadState>(() =>
    initialData
      ? { status: "ready", data: initialData }
      : { status: "loading" },
  );

  useEffect(() => {
    if (initialData) {
      setState({ status: "ready", data: initialData });
      return;
    }

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
          data: {
            topTags: result.data.topTags,
            recentTags: result.data.recentTags,
          },
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
  }, [initialData]);

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

  const { topTags } = state.data;

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
            className="flex w-full items-center gap-1 border-b border-[#E1E4EA] py-6 transition hover:bg-gray-50"
          >
            <span className="flex w-10 shrink-0 items-center justify-center text-base font-semibold tabular-nums text-[#252833] sm:text-lg">
              {index + 1}
            </span>
            <span className="flex w-12 shrink-0 items-center justify-center text-base font-semibold text-[#AEB6CC] sm:text-lg">
              -
            </span>
            <span className="min-w-0 flex-1 truncate pl-2 text-left text-sm font-bold text-[#245AB8] underline decoration-[1.5px] underline-offset-2 sm:text-base">
              #{item.tag}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
