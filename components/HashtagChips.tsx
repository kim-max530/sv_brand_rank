"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref, parseHashtags } from "@/lib/hashtags";

export default function HashtagChips({
  record2,
  className = "",
}: {
  record2?: string | null;
  className?: string;
}) {
  const tags = parseHashtags(record2);
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
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
