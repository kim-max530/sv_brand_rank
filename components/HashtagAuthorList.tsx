"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import AuthorModal from "@/components/AuthorModal";
import { RankingRow } from "@/components/RankingBoard";
import { HASHTAG_PAGE_SIZE } from "@/lib/constants";
import { hashtagHref } from "@/lib/hashtags";
import { homeHrefWithTab, SUBJECTS } from "@/lib/ranking-tabs";
import type { MergedRanking, Subject } from "@/types/ranking";

type SubjectFilter = "전체" | Subject;

export default function HashtagAuthorList({
  authors,
  tag,
  relatedTags,
}: {
  authors: MergedRanking[];
  tag: string;
  relatedTags: string[];
}) {
  const [selected, setSelected] = useState<MergedRanking | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("전체");
  const [limit, setLimit] = useState(HASHTAG_PAGE_SIZE);

  const filtered = useMemo(() => {
    if (subjectFilter === "전체") return authors;
    return authors.filter((item) =>
      (item.subjects ?? []).includes(subjectFilter),
    );
  }, [authors, subjectFilter]);

  const visible = filtered.slice(0, limit);
  const hasMore = limit < filtered.length;

  const onFilterChange = (next: SubjectFilter) => {
    setSubjectFilter(next);
    setLimit(HASHTAG_PAGE_SIZE);
  };

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Link
            href={homeHrefWithTab("해시검색")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition hover:text-teal-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            검색(#)
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="break-keep font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
            #{tag}
          </h1>
          {relatedTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
              {relatedTags.map((related) => (
                <Link
                  key={related}
                  href={hashtagHref(related)}
                  className="rounded-full px-1.5 py-0.5 text-teal-700/80 transition hover:bg-teal-50 hover:text-teal-900"
                >
                  #{related}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="과목 필터"
          className="mt-4 flex flex-wrap gap-2"
        >
          {(["전체", ...SUBJECTS] as SubjectFilter[]).map((item) => {
            const selectedFilter = item === subjectFilter;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selectedFilter}
                onClick={() => onFilterChange(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedFilter
                    ? "bg-teal-700 text-white"
                    : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            해당 조건의 브랜드관 저자가 없습니다.
          </p>
        ) : (
          <ul>
            {visible.map((item) => (
              <li key={item.UID}>
                <RankingRow
                  item={item}
                  onOpenIntro={setSelected}
                  showRank={false}
                  layout="hashtag"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((current) => current + HASHTAG_PAGE_SIZE)}
            className="rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            더보기
          </button>
        </div>
      ) : null}

      <AuthorModal author={selected} onClose={() => setSelected(null)} />
    </>
  );
}
