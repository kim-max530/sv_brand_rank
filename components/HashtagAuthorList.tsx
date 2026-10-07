"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import AuthorModal from "@/components/AuthorModal";
import Banner from "@/components/Banner";
import { RankingRow } from "@/components/RankingBoard";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { bumpAuthorClicks } from "@/lib/author-stats-client";
import { HASHTAG_PAGE_SIZE } from "@/lib/constants";
import { hashtagHref } from "@/lib/hashtags";
import {
  bannerVisibleForPlacement,
  type PromoBanner,
} from "@/lib/promo-banner";
import { SUBJECTS } from "@/lib/ranking-tabs";
import { openAuthorExternalLink } from "@/lib/solvook-links";
import type { MergedRanking, Subject } from "@/types/ranking";

type SubjectFilter = "전체" | Subject;

export default function HashtagAuthorList({
  authors,
  tag,
  relatedTags,
  promoBanner,
}: {
  authors: MergedRanking[];
  tag: string;
  relatedTags: string[];
  promoBanner: PromoBanner;
}) {
  const [selected, setSelected] = useState<MergedRanking | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("전체");
  const [limit, setLimit] = useState(HASHTAG_PAGE_SIZE);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of authors) {
      initial[item.UID] = item.totalClicks ?? 0;
    }
    return initial;
  });

  useEffect(() => {
    setClickCounts((prev) => {
      const next = { ...prev };
      for (const item of authors) {
        if (next[item.UID] == null) {
          next[item.UID] = item.totalClicks ?? 0;
        }
      }
      return next;
    });
  }, [authors]);

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

  const handleMaterialsClick = (item: MergedRanking) => {
    const name = item.저자명?.trim() || item.UID;
    trackAnalyticsEvent("homepage_click", name);
    openAuthorExternalLink(item);
    if (!item.address?.trim()) return;

    setClickCounts((prev) => ({
      ...prev,
      [item.UID]: (prev[item.UID] ?? item.totalClicks ?? 0) + 1,
    }));
    setSelected((current) =>
      current && current.UID === item.UID
        ? { ...current, totalClicks: (current.totalClicks ?? 0) + 1 }
        : current,
    );
    void bumpAuthorClicks(item.UID).then((serverCount) => {
      if (serverCount == null) return;
      setClickCounts((prev) => ({ ...prev, [item.UID]: serverCount }));
      setSelected((current) =>
        current && current.UID === item.UID
          ? { ...current, totalClicks: serverCount }
          : current,
      );
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-lg font-bold text-[#245AB8] transition hover:text-[#184A9E]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            돌아가기
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center">
          <h1 className="inline-flex items-center whitespace-nowrap rounded bg-[#F2F6FC] px-2.5 py-1 text-2xl sm:text-3xl">
            <span className="mr-0.5 font-bold text-[#1D58B6]">#</span>
            <span className="font-bold text-[#1D58B6] underline decoration-[1.5px] underline-offset-2">
              {tag}
            </span>
          </h1>
          {relatedTags.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {relatedTags.map((related) => (
                <Link
                  key={related}
                  href={hashtagHref(related)}
                  className="inline-flex items-center whitespace-nowrap rounded bg-[#F2F6FC] px-2.5 py-1 text-xs transition hover:cursor-pointer hover:opacity-80"
                >
                  <span className="mr-0.5 font-bold text-[#1D58B6]">#</span>
                  <span className="font-bold text-[#1D58B6] underline decoration-[1.5px] underline-offset-2">
                    {related}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="과목 필터"
          className="mx-auto mt-6 flex w-fit items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(15,23,42,0.14)]"
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
                className={`min-w-[4.5rem] rounded-full px-4 py-2 text-sm font-bold transition ${
                  selectedFilter
                    ? item === "영어"
                      ? "bg-[#FF5520] text-white shadow-[0_2px_7px_rgba(255,85,32,0.3)]"
                      : item === "국어"
                        ? "bg-[#FFBE18] text-[#171B2B] shadow-[0_2px_7px_rgba(255,190,24,0.38)]"
                        : "bg-[#245AB8] text-white shadow-[0_2px_7px_rgba(36,90,184,0.25)]"
                    : "bg-white text-[#AEB6CC]"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </header>

      <div className="overflow-hidden border-t border-[#E1E4EA] bg-white">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-500">
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
                  totalClicks={clickCounts[item.UID] ?? item.totalClicks ?? 0}
                  onMaterialsClick={handleMaterialsClick}
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

      {bannerVisibleForPlacement(promoBanner, "hashtag_list") ? (
        <Banner
          title={promoBanner.title}
          buttonText={promoBanner.buttonText}
          buttonUrl={promoBanner.buttonUrl}
        />
      ) : null}

      <AuthorModal
        author={
          selected
            ? {
                ...selected,
                totalClicks:
                  clickCounts[selected.UID] ?? selected.totalClicks ?? 0,
              }
            : null
        }
        onClose={() => setSelected(null)}
        onMaterialsClick={handleMaterialsClick}
      />
    </div>
  );
}
