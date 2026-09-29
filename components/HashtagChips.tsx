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

/** 일반 해시태그: 버튼이 아닌 심플 인라인 텍스트 */
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
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`.trim()}
    >
      {tags.map((tag) => (
        <Link
          key={tag}
          href={hashtagHref(tag)}
          className="text-[11px] font-medium text-teal-700/90 transition hover:text-teal-900 hover:underline"
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
            "text-[11px] font-semibold text-orange-600 transition hover:underline"
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
