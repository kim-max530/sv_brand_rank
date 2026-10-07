"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

/** 시안: 연파란 뱃지 + 파란 볼드 */
export const TAG_BADGE_CLASS =
  "rounded-md bg-[#E8F2FF] px-2 py-1 text-xs font-bold text-[#2B7FFF]";

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
