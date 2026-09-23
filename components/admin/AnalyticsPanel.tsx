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
  page_view: "페이지 접속",
  tab_click: "탭 클릭",
  profile_click: "프로필 클릭",
  homepage_click: "홈페이지 클릭",
};

export default function AnalyticsPanel() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("day");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                "page_view",
                "tab_click",
                "profile_click",
                "homepage_click",
              ] as const
            ).map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  {EVENT_LABELS[key]}
                </p>
                <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-slate-900">
                  {summary.totals[key].toLocaleString("ko-KR")}
                </p>
              </div>
            ))}
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
                    <th className="px-4 py-2.5 font-medium">접속</th>
                    <th className="px-4 py-2.5 font-medium">탭</th>
                    <th className="px-4 py-2.5 font-medium">프로필</th>
                    <th className="px-4 py-2.5 font-medium">홈</th>
                    <th className="px-4 py-2.5 font-medium">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byBucket.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
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
