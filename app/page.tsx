import Image from "next/image";
import { Suspense } from "react";
import RankingBoard from "@/components/RankingBoard";
import { fetchActiveAuthorEvents } from "@/lib/author-events";
import { ensureAuthorStatsForUids } from "@/lib/author-stats";
import { fetchMergedRankings } from "@/lib/csv";
import { getPreviousWeekDateRange } from "@/lib/date";
import type { MergedRanking } from "@/types/ranking";

/** 시간 기반 재검증 없음 — /admin의 revalidatePath('/')로만 갱신 */
export const revalidate = false;

export default async function HomePage() {
  let rankings: MergedRanking[] = [];
  let errorMessage: string | null = null;

  try {
    const [merged, eventMap] = await Promise.all([
      fetchMergedRankings(),
      fetchActiveAuthorEvents(),
    ]);

    const withEvents = merged.map((item) => {
      const discount = eventMap.get(item.UID);
      if (discount == null) return item;
      return {
        ...item,
        hasEvent: true,
        eventDiscount: discount,
      };
    });

    const clickMap = await ensureAuthorStatsForUids(
      withEvents.map((item) => item.UID),
    );

    rankings = withEvents.map((item) => ({
      ...item,
      totalClicks: clickMap.get(item.UID) ?? item.totalClicks ?? 0,
    }));
  } catch (error) {
    console.error(error);
    errorMessage =
      error instanceof Error
        ? error.message
        : "랭킹 데이터를 불러오지 못했습니다.";
  }

  const weekRangeLabel = getPreviousWeekDateRange();

  return (
    <main className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,116,144,0.12),_transparent_50%)]"
      />

      <div className="w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:h-16 sm:px-6">
          <a
            href="https://solvook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md transition hover:opacity-80"
            aria-label="쏠북 홈으로 이동"
          >
            <Image
              src="/Logo.png"
              alt="쏠북"
              width={140}
              height={40}
              className="h-[1.2rem] w-auto sm:h-[1.35rem]"
              priority
            />
          </a>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mx-auto mb-8 w-full max-w-5xl text-center sm:mb-10">
          <h1 className="break-keep font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            <span className="relative inline-block">
              쏠북, 좋은 자료의 발견
              <span className="pointer-events-none absolute -top-2 left-full ml-1 rounded-md bg-blue-50 px-2 py-[0.2rem] text-[12px] font-bold leading-none text-blue-500 sm:ml-1.5">
                Beta
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl break-keep text-sm text-slate-500 sm:text-base">
            인기/추천, 해시태그 목록으로 좋은 자료 더 잘 쓰이게
          </p>
        </header>

        {errorMessage ? (
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
            <p className="font-medium break-keep">
              데이터를 불러오는 중 문제가 발생했습니다.
            </p>
            <p className="mt-2 break-all text-rose-600/90">{errorMessage}</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <p className="mx-auto w-full max-w-5xl px-4 py-12 text-center text-sm text-slate-500">
                불러오는 중…
              </p>
            }
          >
            <RankingBoard
              rankings={rankings}
              weekRangeLabel={weekRangeLabel}
            />
          </Suspense>
        )}
      </div>
    </main>
  );
}
