"use client";

/** 브라우저에서 자료보기 클릭수 +1 */
export function bumpAuthorClicks(uid: string): Promise<number | null> {
  return fetch("/api/author-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as { total_clicks?: number };
      return typeof data.total_clicks === "number" ? data.total_clicks : null;
    })
    .catch((error) => {
      console.warn("[author-stats client]", error);
      return null;
    });
}
