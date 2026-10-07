"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref } from "@/lib/hashtags";

/** #와 텍스트 분리 · 딥블루/페일블루 · #에는 밑줄 없음 */
export function HashtagMark({
  text = "태그",
  withBg = true,
  className = "",
}: {
  text?: string;
  /** false: Top 5 패널용 (배경/패딩 없음) */
  withBg?: boolean;
  className?: string;
}) {
  const label = text.replace(/^#/, "").trim() || "태그";
  return (
    <span
      className={`inline-flex items-center ${
        withBg ? "rounded bg-[#F2F6FC] px-2.5 py-1" : ""
      } ${className}`.trim()}
    >
      <span className="mr-0.5 font-bold text-[#1D58B6]">#</span>
      <span className="font-bold text-[#1D58B6] underline decoration-[1.5px] underline-offset-2">
        {label}
      </span>
    </span>
  );
}

/** 랭킹 리스트용 (축소 폰트 + 배경) */
export const TAG_BADGE_CLASS =
  "inline-flex items-center whitespace-nowrap rounded bg-[#F2F6FC] px-2.5 py-1 text-[11px] hover:cursor-pointer";

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
      <span className="mr-0.5 font-bold text-[#1D58B6]">#</span>
      <span className="font-bold text-[#1D58B6] underline decoration-[1.5px] underline-offset-2">
        {label}
      </span>
    </Link>
  );
}
