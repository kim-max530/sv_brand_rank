import type { Subject } from "@/types/ranking";

function subjectCode(subject: Subject | string): "EN" | "KO" {
  return subject === "국어" || subject === "KO" ? "KO" : "EN";
}

/** 브랜드관 또는 검색 페이지를 새 탭으로 엽니다. */
export function openAuthorExternalLink(item: {
  address?: string | null;
  저자명?: string | null;
  UID: string;
  과목: Subject | string;
}): void {
  const address = typeof item.address === "string" ? item.address.trim() : "";
  if (address) {
    window.open(
      `https://solvook.com/@${address}/products`,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  const authorName =
    (typeof item.저자명 === "string" && item.저자명.trim()) || item.UID;
  const code = subjectCode(item.과목);
  window.open(
    `https://solvook.com/search?q=${encodeURIComponent(authorName)}&subject=${code}`,
    "_blank",
    "noopener,noreferrer",
  );
}
