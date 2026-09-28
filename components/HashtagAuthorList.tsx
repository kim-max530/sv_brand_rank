"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AuthorModal from "@/components/AuthorModal";
import { RankingRow } from "@/components/RankingBoard";
import { hashtagHref } from "@/lib/hashtags";
import type { MergedRanking } from "@/types/ranking";

export default function HashtagAuthorList({
  authors,
}: {
  authors: MergedRanking[];
}) {
  const [selected, setSelected] = useState<MergedRanking | null>(null);
  const items = useMemo(() => authors, [authors]);

  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-slate-500">
        해당 해시태그에 해당하는 저자가 없습니다.
      </p>
    );
  }

  return (
    <>
      <ul>
        {items.map((item) => (
          <li key={item.UID}>
            <RankingRow
              item={item}
              onOpenIntro={setSelected}
              showRank={false}
            />
          </li>
        ))}
      </ul>
      <AuthorModal author={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export function HashtagPagination({
  tag,
  page,
  totalPages,
}: {
  tag: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const base = hashtagHref(tag);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="페이지네이션"
      className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
    >
      {pages.map((n) => {
        const selected = n === page;
        const href = n === 1 ? base : `${base}?page=${n}`;
        return (
          <Link
            key={n}
            href={href}
            className={`min-w-9 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
              selected
                ? "bg-teal-700 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
            }`}
          >
            {n}
          </Link>
        );
      })}
    </nav>
  );
}
