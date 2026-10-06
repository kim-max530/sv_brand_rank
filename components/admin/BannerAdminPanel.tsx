"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  fetchPromoBannerAction,
  savePromoBannerAction,
} from "@/actions/promo-banner";
import {
  BANNER_PLACEMENT_LABELS,
  DEFAULT_PROMO_BANNER,
  type PromoBanner,
} from "@/lib/promo-banner";

export default function BannerAdminPanel() {
  const [form, setForm] = useState({
    title: DEFAULT_PROMO_BANNER.title,
    button_text: DEFAULT_PROMO_BANNER.buttonText,
    button_url: DEFAULT_PROMO_BANNER.buttonUrl,
    show_brand: true,
    show_recommend: true,
    show_hashtag_tab: true,
    show_hashtag_list: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await fetchPromoBannerAction();
      if (!result.ok) {
        setError(result.error);
      } else if (result.banner) {
        applyBanner(result.banner);
      }
      setLoading(false);
    })();
  }, []);

  const applyBanner = (banner: PromoBanner) => {
    setForm({
      title: banner.title,
      button_text: banner.buttonText,
      button_url: banner.buttonUrl,
      show_brand: banner.showBrand,
      show_recommend: banner.showRecommend,
      show_hashtag_tab: banner.showHashtagTab,
      show_hashtag_list: banner.showHashtagList,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("button_text", form.button_text);
    fd.set("button_url", form.button_url);
    if (form.show_brand) fd.set("show_brand", "on");
    if (form.show_recommend) fd.set("show_recommend", "on");
    if (form.show_hashtag_tab) fd.set("show_hashtag_tab", "on");
    if (form.show_hashtag_list) fd.set("show_hashtag_list", "on");

    const result = await savePromoBannerAction(fd);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.banner) applyBanner(result.banner);
    setMessage(result.message);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
        배너 설정을 불러오는 중…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-semibold text-slate-900">
        배너 관리
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        메인 하단 프로모 배너 문구·버튼·노출 위치를 설정합니다. Supabase에{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">promo_banners</code>{" "}
        테이블이 필요합니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">제목</span>
          <textarea
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            placeholder="중간고사 대비 자료, 더 좋은 자료는 없을지 고민되시나요? …"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">
            버튼 텍스트
          </span>
          <input
            type="text"
            value={form.button_text}
            onChange={(e) =>
              setForm((p) => ({ ...p, button_text: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            placeholder="중간고사 직전 자료 찾기"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">
            버튼 링크 (URL)
          </span>
          <input
            type="url"
            value={form.button_url}
            onChange={(e) =>
              setForm((p) => ({ ...p, button_url: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            placeholder="https://solvook.com"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            노출 위치 (복수 선택)
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {(
              [
                ["show_brand", "brand"],
                ["show_recommend", "recommend"],
                ["show_hashtag_tab", "hashtag_tab"],
                ["show_hashtag_list", "hashtag_list"],
              ] as const
            ).map(([key, placement]) => (
              <label
                key={key}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                />
                {BANNER_PLACEMENT_LABELS[placement]}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-teal-700" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
  );
}
