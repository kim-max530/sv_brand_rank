"use client";

import Link from "next/link";
import TagBadge, { TAG_BADGE_CLASS } from "@/components/TagBadge";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { hashtagHref, parseHashtags } from "@/lib/hashtags";

export type MetricChip = {
  key: string;
  label: string;
  tag: string;
  className?: string;
  title?: string;
};

/** 시안: 연파란 뱃지 + 파란 텍스트 + 하단 보더 */
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
        <TagBadge key={tag} tag={tag} />
      ))}
      {metricChips.map((chip) => (
        <Link
          key={chip.key}
          href={hashtagHref(chip.tag)}
          title={chip.title}
          className={chip.className ?? TAG_BADGE_CLASS}
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
