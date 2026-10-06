"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref, parseHashtags } from "@/lib/hashtags";

export type MetricChip = {
  key: string;
  label: string;
  tag: string;
  className?: string;
  title?: string;
};

/** 시안: 연파란 뱃지 + 파란 텍스트 */
export default function HashtagChips({
  record2,
  className = "",
  metricChips = [],
}: {
  record2?: string | null;
  className?: string;
  metricChips?: MetricChip[];
}) {
  const tags = parseHashtags(record2);
  if (tags.length === 0 && metricChips.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}
    >
      {tags.map((tag) => (
        <Link
          key={tag}
          href={hashtagHref(tag)}
          className="inline-flex items-center rounded-full bg-[#E8F2FF] px-2 py-0.5 text-[11px] font-medium text-[#2B7FFF] transition hover:bg-[#d9ebff]"
          onClick={(event) => {
            event.stopPropagation();
            trackAnalyticsEvent("hashtag_click", tag);
          }}
        >
          #{tag}
        </Link>
      ))}
      {metricChips.map((chip) => (
        <Link
          key={chip.key}
          href={hashtagHref(chip.tag)}
          title={chip.title}
          className={
            chip.className ??
            "inline-flex items-center rounded-full bg-[#E8F2FF] px-2 py-0.5 text-[11px] font-semibold text-[#2B7FFF]"
          }
          onClick={(event) => {
            event.stopPropagation();
            trackAnalyticsEvent("hashtag_click", chip.tag);
          }}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
