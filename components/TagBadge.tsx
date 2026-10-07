"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

/** 시안: 연파란 배경 + 파란 볼드 + 밑줄 (랭킹 리스트용 축소 폰트) */
export const TAG_BADGE_CLASS =
  "whitespace-nowrap rounded-md bg-[#E8F2FF] px-1.5 py-0.5 text-[11px] font-bold text-[#2B7FFF] underline decoration-2 underline-offset-4 hover:cursor-pointer";

/** 탭·타이틀 등 일반 #태그 하이라이트 */
export const TAG_HIGHLIGHT_CLASS =
  "whitespace-nowrap rounded-md bg-[#E8F2FF] px-1.5 py-0.5 font-bold text-[#2B7FFF] underline decoration-2 underline-offset-4";

export default function TagBadge({
  tag,
  className = "",
}: {
  tag: string;
  className?: string;
}) {
  const label = tag.replace(/^#/, "").trim();
  if (!label) return null;

  return (
    <Link
      href={hashtagHref(label)}
      className={`${TAG_BADGE_CLASS} ${className}`.trim()}
      onClick={(event) => {
        event.stopPropagation();
        trackAnalyticsEvent("hashtag_click", label);
      }}
    >
      #{label}
    </Link>
  );
}
