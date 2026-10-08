"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { fetchHashtagSearchData } from "@/actions/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

export type HashtagSearchReadyData = {
  topTags: Array<{
    tag: string;
    count: number;
    authorCount: number;
    description: string;
  }>;
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
        <li
          key={item.tag}
          className="flex w-full items-center border-b border-gray-200 py-3"
        >
          <Link
            href={hashtagHref(item.tag)}
            onClick={() => onTagClick(item.tag)}
            className="flex w-full items-center transition-opacity hover:cursor-pointer hover:opacity-80"
          >
            {/* 1. 순위 및 등락 (고정 너비) */}
            <div className="flex w-16 flex-shrink-0 items-center gap-2">
              <span className="w-5 text-center text-lg font-bold tabular-nums text-[#1A1E27]">
                {index + 1}
              </span>
              <div className="mx-auto h-[2px] w-4 rounded-full bg-[#9E9E9E]" />
            </div>

            {/* 2. 해시태그 뱃지 (고정 너비 — 설명 시작점 통일) */}
            <div className="w-[180px] flex-shrink-0">
              <span className="inline-flex items-center rounded bg-[#F2F6FC] px-2.5 py-1">
                <span className="mr-0.5 font-bold text-[#1D58B6]">#</span>
                <span className="font-bold text-[#1D58B6] underline decoration-[1.5px] underline-offset-2">
                  {item.tag}
                </span>
              </span>
            </div>

            {/* 3. 해시태그 설명 */}
            <div className="min-w-0 flex-1 pr-4">
              <p className="truncate text-[13px] text-[#8E939F]">
                {item.description || " "}
              </p>
            </div>

            {/* 4. 포함된 브랜드 수 */}
            <div className="flex flex-shrink-0 items-center gap-1 text-[13px] text-[#717680]">
              <Users className="h-4 w-4" aria-hidden />
              <span>브랜드 {item.authorCount}명</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
