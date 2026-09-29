"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref, parseHashtags } from "@/lib/hashtags";

export type MetricChip = {
  key: string;
  label: string;
  tag: string;
  className?: string;
  /** hover 안내 (시스템 뱃지) */
  title?: string;
};

/** record2 해시태그 먼저, metricChips는 맨 뒤에 이어붙임 */
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
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={hashtagHref(tag)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-200 hover:text-gray-800"
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
            "inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100"
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
