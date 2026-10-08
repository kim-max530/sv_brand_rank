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

/** 시안: 연파란 배경 + 파란 밑줄 텍스트 */
export default function HashtagChips({
  record2,
  subject,
  className = "",
  metricChips = [],
}: {
  record2?: string | null;
  subject?: string | null;
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
        <TagBadge key={tag} tag={tag} subject={subject} />
      ))}
      {metricChips.map((chip) => (
        <Link
          key={chip.key}
          href={hashtagHref(chip.tag, subject)}
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
