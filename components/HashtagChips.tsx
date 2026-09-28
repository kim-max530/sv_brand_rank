"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref, parseHashtags } from "@/lib/hashtags";

export type MetricChip = {
  key: string;
  label: string;
  tag: string;
  className?: string;
};

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
      {metricChips.map((chip) => (
        <Link
          key={chip.key}
          href={hashtagHref(chip.tag)}
          className={
            chip.className ??
            "inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold transition hover:border-teal-300 hover:bg-teal-50"
          }
          onClick={(event) => {
            event.stopPropagation();
            trackAnalyticsEvent("hashtag_click", chip.tag);
          }}
        >
          {chip.label}
        </Link>
      ))}
      {tags.map((tag) => (
        <Link
          key={tag}
          href={hashtagHref(tag)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
          onClick={(event) => {
            event.stopPropagation();
            trackAnalyticsEvent("hashtag_click", tag);
          }}
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
