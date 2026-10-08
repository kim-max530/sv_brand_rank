"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAnalyticsSummary,
  type AnalyticsPeriod,
  type AnalyticsSummary,
} from "@/actions/analytics";

const PERIODS: Array<{ id: AnalyticsPeriod; label: string }> = [
  { id: "day", label: "일별" },
  { id: "week", label: "주차별" },
  { id: "month", label: "월별" },
];

const EVENT_LABELS: Record<string, string> = {
  page_view: "접속 횟수",
  tab_click: "탭 클릭",
  profile_click: "프로필 클릭",
  homepage_click: "홈페이지 연결",
  hashtag_click: "해시태그 클릭",
  banner_click: "배너 클릭",
};

type MetricKey = keyof AnalyticsSummary["metrics"];

const METRIC_CARDS: Array<{
  key: MetricKey;
  label: string;
  hint?: string;
  format?: "int" | "avg";
}> = [
  { key: "sessionViews", label: "접속 횟수", hint: "Session views" },
  { key: "uniqueVisitors", label: "접속자수", hint: "Unique Visitors" },
  { key: "homeLinkClicks", label: "홈페이지 연결", hint: "Home link clicks" },
  { key: "tabBrand", label: "탭 - 브랜드 랭킹" },
  { key: "tabRecommend", label: "탭 - 추천 랭킹" },
  { key: "tabHashtag", label: "탭 - 인기 #태그" },
  { key: "tabTextbook", label: "탭 - 교재별 랭킹" },
  { key: "hashtagClicks", label: "해시태그 클릭" },
  { key: "bannerClicks", label: "배너 클릭" },
  {
    key: "avgClicksPerVisitor",
    label: "평균 클릭 수",
    hint: "전체 클릭 ÷ 접속자수",
    format: "avg",
  },
];

export default function AnalyticsPanel() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("day");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async (nextPeriod: AnalyticsPeriod) => {
    setLoading(true);
    setError("");
    const result = await fetchAnalyticsSummary(nextPeriod);
    if (!result.ok) {
      setSummary(null);
      setError(result.error);
    } else {
      setSummary(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const handleResetAnalytics = async () => {
    const ok = window.confirm(
      "오늘 오픈을 위한 초기화입니까? 랭킹/브랜드 데이터는 유지되며, 지금까지의 모든 접속/클릭 통계 데이터만 영구 삭제됩니다. 진행하시겠습니까?",
    );
    if (!ok) return;

    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics/reset", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "사용 데이터 초기화에 실패했습니다.");
        setResetting(false);
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "사용 데이터 초기화에 실패했습니다.",
      );
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            사용 데이터
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            analytics_events 집계 ·{" "}
            {summary
              ? `${summary.rangeStart} ~ ${summary.rangeEnd}`
              : "기간을 선택하세요"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={resetting}
            onClick={() => void handleResetAnalytics()}
            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {resetting
              ? "초기화 중…"
              : "사용 데이터 초기화 (오픈용)"}
          </button>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {PERIODS.map((item) => {
              const selected = item.id === period;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    selected
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {METRIC_CARDS.map((card) => {
              const value = summary.metrics[card.key];
              const display =
                card.format === "avg"
                  ? value.toFixed(1)
                  : value.toLocaleString("ko-KR");
              return (
                <div
                  key={card.key}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  {card.hint ? (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {card.hint}
                    </p>
                  ) : null}
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-slate-900">
                    {display}
                  </p>
                </div>
              );
            })}
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-900">기간별 추이</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">구간</th>
                    <th className="px-4 py-2.5 font-medium">접속 횟수</th>
                    <th className="px-4 py-2.5 font-medium">탭</th>
                    <th className="px-4 py-2.5 font-medium">프로필</th>
                    <th className="px-4 py-2.5 font-medium">홈페이지 연결</th>
                    <th className="px-4 py-2.5 font-medium">해시</th>
                    <th className="px-4 py-2.5 font-medium">배너</th>
                    <th className="px-4 py-2.5 font-medium">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byBucket.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        해당 기간 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    summary.byBucket.map((row) => (
                      <tr
                        key={row.label}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {row.label}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {row.page_view}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {row.tab_click}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {row.profile_click}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {row.homepage_click}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {row.hashtag_click}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {row.banner_click}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold">
                          {row.all}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-900">
                타깃별 상위 이벤트
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">이벤트</th>
                    <th className="px-4 py-2.5 font-medium">타깃</th>
                    <th className="px-4 py-2.5 font-medium">횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byTarget.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        집계할 타깃 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    summary.byTarget.map((row) => (
                      <tr
                        key={`${row.event_type}-${row.target_name}`}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-4 py-2.5">
                          {EVENT_LABELS[row.event_type] ?? row.event_type}
                        </td>
                        <td className="px-4 py-2.5 break-keep">
                          {row.target_name}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold">
                          {row.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
