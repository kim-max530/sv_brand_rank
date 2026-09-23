"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, Store, X } from "lucide-react";
import {
  cacheBannerSrc,
  getBannerImageCandidates,
  getCachedBannerSrc,
  initialCandidateIndex,
} from "@/lib/brand-images";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { openAuthorExternalLink } from "@/lib/solvook-links";
import { toYouTubeEmbedUrl } from "@/lib/youtube";
import type { MergedRanking } from "@/types/ranking";

function BannerImage({ uid, name }: { uid: string; name: string }) {
  const candidates = getBannerImageCandidates(uid);
  const [index, setIndex] = useState(() =>
    initialCandidateIndex(candidates, getCachedBannerSrc(uid)),
  );
  const src = candidates[index] ?? null;
  const failed = candidates.length === 0 || index >= candidates.length;

  if (!src || failed) return null;

  return (
    <div className="w-full bg-slate-50">
      <Image
        src={src}
        alt={`${name} 배너`}
        width={800}
        height={400}
        sizes="(max-width: 672px) 100vw, 672px"
        quality={75}
        className="h-auto w-full max-h-64 object-contain"
        loading="eager"
        fetchPriority="high"
        onLoad={() => cacheBannerSrc(uid, src)}
        onError={() => setIndex((current) => current + 1)}
      />
    </div>
  );
}

interface AuthorModalProps {
  author: MergedRanking | null;
  onClose: () => void;
}

export default function AuthorModal({ author, onClose }: AuthorModalProps) {
  useEffect(() => {
    if (!author) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [author, onClose]);

  if (!author) return null;

  const authorName = author.저자명?.trim() || "저자";
  const info2 = author.info2?.trim() ?? "";
  const record = author.record?.trim() ?? "";
  const range3 = author.range3?.trim() ?? "";
  const address = author.address?.trim() ?? "";
  const embedUrl = toYouTubeEmbedUrl(author.youtube_url);
  const showEventCue = Boolean(author.hasEvent);

  const openHomepage = () => {
    trackAnalyticsEvent("homepage_click", authorName);
    openAuthorExternalLink(author);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="author-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <BannerImage uid={author.UID} name={authorName} />

        <div className={`p-5 sm:p-6 ${showEventCue ? "pt-14" : ""}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2
                id="author-modal-title"
                className="break-keep font-display text-xl font-semibold text-slate-900"
              >
                {authorName}
              </h2>
              <div className="relative shrink-0">
                {showEventCue ? (
                  <div className="absolute -top-12 left-1/2 z-10 w-max max-w-[14rem] -translate-x-1/2 animate-bounce">
                    <div className="relative rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-semibold leading-snug break-keep text-amber-950 shadow-lg">
                      {authorName} 할인 쿠폰/패키지 이벤트 진행 중
                      <span
                        aria-hidden
                        className="absolute top-full left-1/2 -mt-px -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-amber-400"
                      />
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={openHomepage}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-teal-700"
                  aria-label={
                    address
                      ? `${authorName} 브랜드관 열기`
                      : `${authorName} 검색하기`
                  }
                >
                  {address ? (
                    <Store className="h-5 w-5" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-teal-700 uppercase">
                소개
              </h3>
              <p className="whitespace-pre-wrap break-keep text-sm leading-relaxed text-slate-700">
                {info2 || "등록된 소개가 없습니다."}
              </p>
            </section>

            <section className="border-t border-slate-100 pt-5">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-teal-700 uppercase">
                주요 이력
              </h3>
              <p className="whitespace-pre-wrap break-keep text-sm leading-relaxed text-slate-700">
                {record || "등록된 이력이 없습니다."}
              </p>
            </section>

            {range3 ? (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-teal-700 uppercase">
                  주요 교재
                </h3>
                <p className="whitespace-pre-wrap break-keep text-sm leading-relaxed text-slate-700">
                  {range3.endsWith("등") ? range3 : `${range3} 등`}
                </p>
              </section>
            ) : null}

            {embedUrl ? (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-teal-700 uppercase">
                  영상
                </h3>
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
                  <iframe
                    src={embedUrl}
                    title={`${authorName} 유튜브 영상`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
