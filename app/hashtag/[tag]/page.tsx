import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import HashtagAuthorList from "@/components/HashtagAuthorList";
import { fetchBrandInfoList, fetchMergedRankings } from "@/lib/csv";
import {
  authorHasHashtag,
  collectRelatedHashtags,
  normalizeHashtagParam,
  resolveSystemBadgeTag,
} from "@/lib/hashtags";
import type { MergedRanking, Subject } from "@/types/ranking";

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

function safeAddress(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function toAuthorView(
  info: {
    UID: string;
    저자명: string;
    address?: string;
    info1?: string;
    info2?: string;
    intro?: string;
    record?: string;
    record2?: string;
    range3?: string;
    youtube_url?: string;
    변형문제?: boolean;
    워크북?: boolean;
    분석지?: boolean;
  },
  meta:
    | {
        isInPopular: boolean;
        isInRecommend: boolean;
        isTopGrowth: boolean;
        isTopRepurchase: boolean;
        isTopSearch: boolean;
        subjects: Set<Subject>;
      }
    | undefined,
): MergedRanking {
  const subjects = meta ? [...meta.subjects] : [];
  return {
    ...info,
    과목: (subjects[0] ?? "영어") as Subject,
    subjects,
    rank: 0,
    category: "인기",
    badge: null,
    changeText: "",
    isInPopular: meta?.isInPopular ?? false,
    isInRecommend: meta?.isInRecommend ?? false,
    isTopGrowth: meta?.isTopGrowth ?? false,
    isTopRepurchase: meta?.isTopRepurchase ?? false,
    isTopSearch: meta?.isTopSearch ?? false,
  };
}

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = normalizeHashtagParam(rawTag);

  if (!tag) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          검색(#)
        </h1>
        <p className="mt-3 text-slate-600">유효하지 않은 해시태그입니다.</p>
        <Link
          href="/?tab=search"
          className="mt-6 text-sm font-medium text-teal-700"
        >
          홈으로 돌아가기
        </Link>
      </main>
    );
  }

  let authors: MergedRanking[] = [];
  let relatedTags: string[] = [];

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
        isTopSearch: boolean;
        subjects: Set<Subject>;
      }
    >();

    for (const row of rankings) {
      const current = metaByUid.get(row.UID) ?? {
        isInPopular: false,
        isInRecommend: false,
        isTopGrowth: false,
        isTopRepurchase: false,
        isTopSearch: false,
        subjects: new Set<Subject>(),
      };
      if (row.category === "인기") current.isInPopular = true;
      if (row.category === "추천") current.isInRecommend = true;
      if (row.isTopGrowth) current.isTopGrowth = true;
      if (row.isTopRepurchase) current.isTopRepurchase = true;
      if (row.isTopSearch) current.isTopSearch = true;
      current.subjects.add(row.과목);
      metaByUid.set(row.UID, current);
    }

    const systemTag = resolveSystemBadgeTag(tag);

    const matched = all.filter((info) => {
      const meta = metaByUid.get(info.UID);

      if (systemTag === "재구매") {
        return Boolean(meta?.isTopRepurchase);
      }
      if (systemTag === "HOT") {
        return Boolean(meta?.isTopGrowth);
      }
      if (systemTag === "검색어") {
        return Boolean(meta?.isTopSearch);
      }

      return authorHasHashtag(info.record2, tag) && safeAddress(info.address);
    });

    relatedTags = systemTag
      ? []
      : collectRelatedHashtags(matched, tag, 7);

    authors = matched
      .map((info) => toAuthorView(info, metaByUid.get(info.UID)))
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
        <HashtagAuthorList
          authors={authors}
          tag={tag}
          relatedTags={relatedTags}
        />
      </div>
    </main>
  );
}
