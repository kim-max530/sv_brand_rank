"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

/** 시안: 배경 없음 · 파란 볼드 · 굵은 밑줄 (띄어쓰기 태그도 밑줄 유지) */
export const TAG_BADGE_CLASS =
  "whitespace-nowrap text-[#2B7FFF] font-bold underline underline-offset-4 decoration-2 hover:cursor-pointer";

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
