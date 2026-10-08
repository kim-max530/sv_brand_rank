"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { PromoBanner } from "@/lib/promo-banner";

type PromoBannerProps = {
  title: string;
  buttonText: string;
  buttonUrl: string;
  className?: string;
};

const DISMISSED_KEY = "solvook_promo_banner_dismissed";

/** 화면 하단을 따라다니며, 현재 탭 세션에서 닫을 수 있는 프로모 배너 */
export default function Banner({
  title,
  buttonText,
  buttonUrl,
  className = "",
}: PromoBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.sessionStorage.getItem(DISMISSED_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!title.trim() || !visible) return null;

  const href = buttonUrl.trim() || "https://solvook.com";
  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // sessionStorage를 사용할 수 없어도 현재 화면에서는 닫는다.
    }
    setVisible(false);
  };

  return (
    <>
      <div className="h-32 sm:h-20" aria-hidden />
      <section
        className={`fixed inset-x-0 bottom-0 z-50 w-full bg-[#2B7FFF] shadow-[0_-4px_16px_rgba(15,23,42,0.14)] ${className}`.trim()}
      >
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-12 py-4 text-center sm:flex-row sm:gap-4 sm:px-14 sm:py-5 sm:text-left">
          <p className="max-w-2xl break-keep text-sm font-medium leading-relaxed text-white sm:text-base">
            {title}
          </p>
          {buttonText.trim() ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackAnalyticsEvent("banner_click", buttonText.trim() || title)
              }
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2B7FFF] transition hover:bg-blue-50"
            >
              {buttonText}
            </a>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
            aria-label="배너 닫기"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </section>
    </>
  );
}

export function bannerFromPromo(banner: PromoBanner): PromoBannerProps {
  return {
    title: banner.title,
    buttonText: banner.buttonText,
    buttonUrl: banner.buttonUrl,
  };
}
