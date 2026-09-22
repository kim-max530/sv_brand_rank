import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "저자 검색",
  description: "저자명으로 검색합니다.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ author?: string }>;
}) {
  const params = await searchParams;
  const author = params.author?.trim() ?? "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-slate-900">
        저자 검색
      </h1>
      <p className="mt-3 text-slate-600">
        {author
          ? `“${author}”에 대한 검색 결과 페이지입니다.`
          : "검색할 저자명을 입력해 주세요."}
      </p>
    </main>
  );
}
