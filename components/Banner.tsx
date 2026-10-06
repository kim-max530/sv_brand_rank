import type { PromoBanner } from "@/lib/promo-banner";

type PromoBannerProps = {
  title: string;
  buttonText: string;
  buttonUrl: string;
  className?: string;
};

/** 메인/태그 하단 프로모 배너 */
export default function Banner({
  title,
  buttonText,
  buttonUrl,
  className = "",
}: PromoBannerProps) {
  if (!title.trim()) return null;

  const href = buttonUrl.trim() || "https://solvook.com";

  return (
    <section
      className={`relative left-1/2 mt-8 w-screen -translate-x-1/2 bg-[#2B7FFF] lg:mt-10 ${className}`.trim()}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <p className="max-w-2xl break-keep text-sm font-medium leading-relaxed text-white sm:text-base">
          {title}
        </p>
        {buttonText.trim() ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2B7FFF] transition hover:bg-blue-50"
          >
            {buttonText}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function bannerFromPromo(banner: PromoBanner): PromoBannerProps {
  return {
    title: banner.title,
    buttonText: banner.buttonText,
    buttonUrl: banner.buttonUrl,
  };
}
