import { Suspense } from "react";
import RankingBoard from "@/components/RankingBoard";
import SiteHeader from "@/components/SiteHeader";
import { fetchActiveAuthorEvents } from "@/lib/author-events";
import { ensureAuthorStatsForUids } from "@/lib/author-stats";
import { fetchMergedRankings } from "@/lib/csv";
import { getPreviousWeekDateRange } from "@/lib/date";
import { fetchPromoBanner } from "@/lib/promo-banner";
import type { MergedRanking } from "@/types/ranking";

/** 시간 기반 재검증 없음 — /admin의 revalidatePath('/')로만 갱신 */
export const revalidate = false;

export default async function HomePage() {
  let rankings: MergedRanking[] = [];
  let errorMessage: string | null = null;
  const promoBanner = await fetchPromoBanner();

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
    <main className="relative flex flex-1 flex-col overflow-x-clip bg-[#F7F8FC]">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-14 sm:px-6 sm:pt-10">
        <header className="mb-9 text-center sm:mb-10">
          <h1 className="break-keep text-2xl font-extrabold tracking-[-0.035em] text-[#171B2B] sm:text-[1.75rem]">
            <span className="relative inline-block">
              지금 주목할 만한 인기 저자
              <span className="pointer-events-none absolute -top-1 left-full ml-1.5 rounded-full bg-[#E8F2FF] px-2 py-0.5 text-[10px] font-bold leading-none text-[#2B7FFF] sm:text-[11px]">
                Beta
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[23rem] break-keep text-sm font-medium leading-[1.75] text-[#747B91] sm:mt-3 sm:max-w-lg sm:leading-relaxed">
            자료 선택이 고민된다면?{" "}
            <span className="font-semibold text-[#245AB8] underline decoration-[1.5px] underline-offset-2">
              #태그
            </span>
            를 클릭해서 내게 맞는 브랜드를 탐색해 보세요.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
            <p className="font-medium break-keep">
              데이터를 불러오는 중 문제가 발생했습니다.
            </p>
            <p className="mt-2 break-all text-rose-600/90">{errorMessage}</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <p className="px-4 py-12 text-center text-sm text-gray-500">
                불러오는 중…
              </p>
            }
          >
            <RankingBoard
              rankings={rankings}
              weekRangeLabel={weekRangeLabel}
              promoBanner={promoBanner}
            />
          </Suspense>
        )}
      </div>
    </main>
  );
}
