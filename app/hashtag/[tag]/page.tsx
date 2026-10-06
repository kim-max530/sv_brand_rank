import Link from "next/link";
import type { Metadata } from "next";
import HashtagAuthorList from "@/components/HashtagAuthorList";
import SiteHeader from "@/components/SiteHeader";
import { getHashtagPageData } from "@/lib/hashtag-index";
import { normalizeHashtagParam } from "@/lib/hashtags";
import { fetchPromoBanner } from "@/lib/promo-banner";

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

  try {
    const [{ authors, relatedTags }, promoBanner] = await Promise.all([
      getHashtagPageData(tag),
      fetchPromoBanner(),
    ]);

    return (
      <main className="relative flex flex-1 flex-col overflow-x-clip bg-[#F8F9FC]">
        <SiteHeader />
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
          <HashtagAuthorList
            authors={authors}
            tag={tag}
            relatedTags={relatedTags}
            promoBanner={promoBanner}
          />
        </div>
      </main>
    );
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

}
