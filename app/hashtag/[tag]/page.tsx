import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import HashtagAuthorList, {
  HashtagPagination,
} from "@/components/HashtagAuthorList";
import { HASHTAG_PAGE_SIZE } from "@/lib/constants";
import { fetchBrandInfoList, fetchMergedRankings } from "@/lib/csv";
import {
  authorHasHashtag,
  hashtagHref,
  normalizeHashtagParam,
} from "@/lib/hashtags";
import type { MergedRanking } from "@/types/ranking";

export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: raw } = await params;
  const tag = normalizeHashtagParam(raw);
  return {
    title: tag ? `#${tag} | 쏠북 랭킹` : "해시태그 | 쏠북 랭킹",
    description: tag
      ? `#${tag} 해시태그가 포함된 저자 목록`
      : "해시태그 저자 목록",
  };
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return 1;
  return n;
}

function safeAddress(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export default async function HashtagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { tag: rawTag } = await params;
  const query = await searchParams;
  const tag = normalizeHashtagParam(rawTag);

  if (!tag) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          해시태그
        </h1>
        <p className="mt-3 text-slate-600">유효하지 않은 해시태그입니다.</p>
        <Link href="/" className="mt-6 text-sm font-medium text-teal-700">
          홈으로 돌아가기
        </Link>
      </main>
    );
  }

  let authors: MergedRanking[] = [];
  try {
    const [all, rankings] = await Promise.all([
      fetchBrandInfoList(),
      fetchMergedRankings(),
    ]);

    const metaByUid = new Map<
      string,
      {
        isInPopular: boolean;
        isInRecommend: boolean;
        isTopGrowth: boolean;
        isTopRepurchase: boolean;
      }
    >();

    for (const row of rankings) {
      const current = metaByUid.get(row.UID) ?? {
        isInPopular: false,
        isInRecommend: false,
        isTopGrowth: false,
        isTopRepurchase: false,
      };
      if (row.category === "인기") current.isInPopular = true;
      if (row.category === "추천") current.isInRecommend = true;
      if (row.isTopGrowth) current.isTopGrowth = true;
      if (row.isTopRepurchase) current.isTopRepurchase = true;
      metaByUid.set(row.UID, current);
    }

    authors = all
      .filter(
        (info) =>
          authorHasHashtag(info.record2, tag) && safeAddress(info.address),
      )
      .map((info) => {
        const meta = metaByUid.get(info.UID);
        return {
          ...info,
          과목: "영어" as const,
          rank: 0,
          category: "인기" as const,
          badge: null,
          changeText: "",
          isInPopular: meta?.isInPopular ?? false,
          isInRecommend: meta?.isInRecommend ?? false,
          isTopGrowth: meta?.isTopGrowth ?? false,
          isTopRepurchase: meta?.isTopRepurchase ?? false,
        };
      })
      .sort((a, b) => {
        if (a.isInPopular !== b.isInPopular) {
          return a.isInPopular ? -1 : 1;
        }
        return a.저자명.localeCompare(b.저자명, "ko");
      });
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          #{tag}
        </h1>
        <p className="mt-3 text-rose-600">
          데이터를 불러오는 중 문제가 발생했습니다.
        </p>
      </main>
    );
  }

  const total = authors.length;
  const totalPages = Math.max(1, Math.ceil(total / HASHTAG_PAGE_SIZE));
  const requestedPage = parsePage(query.page);

  if (total > 0 && requestedPage > totalPages) {
    redirect(hashtagHref(tag));
  }

  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * HASHTAG_PAGE_SIZE;
  const pageAuthors = authors.slice(start, start + HASHTAG_PAGE_SIZE);

  return (
    <main className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,116,144,0.12),_transparent_50%)]"
      />

      <div className="w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-md transition hover:opacity-80"
            aria-label="홈으로 이동"
          >
            <Image
              src="/Logo.png"
              alt="쏠북"
              width={140}
              height={40}
              className="h-[1.2rem] w-auto sm:h-[1.35rem]"
              priority
            />
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="text-sm font-medium text-teal-700">Hashtag</p>
          <h1 className="mt-1 break-keep font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
            #{tag}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {total > 0
              ? `브랜드관 저자 ${total}명 · ${page}/${totalPages} 페이지`
              : "해당 해시태그의 브랜드관 저자가 없습니다."}
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
          <HashtagAuthorList authors={pageAuthors} />
        </div>

        <HashtagPagination tag={tag} page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
