import SiteHeader from "@/components/SiteHeader";

export default function HashtagLoading() {
  return (
    <main className="relative flex flex-1 flex-col overflow-x-clip bg-[#F8F9FC]">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-3xl animate-pulse">
          <div className="h-5 w-12 rounded bg-slate-200" />
          <div className="mx-auto mt-5 h-11 w-40 rounded-[6px] bg-[#E7EFFF]" />
          <div className="mx-auto mt-6 h-12 w-56 rounded-full bg-white shadow-sm" />
          <div className="mt-8 overflow-hidden border-t border-[#E1E4EA] bg-white">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center gap-5 border-b border-[#E1E4EA] px-4 py-[14px]"
              >
                <div className="h-[84px] w-[84px] shrink-0 rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-32 rounded bg-slate-200" />
                  <div className="h-5 w-52 rounded-[5px] bg-[#E7EFFF]" />
                  <div className="h-7 w-full rounded-[4px] bg-[#EFF0F5]" />
                </div>
                <div className="h-7 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
