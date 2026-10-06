export default function PromoFooterBanner() {
  return (
    <section className="mt-10 hidden w-full bg-[#2B7FFF] lg:block">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <p className="max-w-2xl break-keep text-sm font-medium leading-relaxed text-white sm:text-base">
          중간고사 대비 자료, 더 좋은 자료는 없을지 고민되시나요? 쏠북 가입하고
          전문 브랜드를 만나보세요.
        </p>
        <a
          href="https://solvook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2B7FFF] transition hover:bg-blue-50"
        >
          중간고사 직전 자료 찾기
        </a>
      </div>
    </section>
  );
}
