import { readFile } from "fs/promises";
import path from "path";
import Papa from "papaparse";
import {
  MISSING_RANK_FALLBACK,
  NEW_BADGE_RANK_THRESHOLD,
  RANKING_FILES,
  RECOMMEND_TOP_N,
  SUBJECTS,
} from "@/lib/constants";
import type {
  BrandInfo,
  MergedRanking,
  RankBadge,
  RankingCategory,
  RankingRecord,
  Subject,
} from "@/types/ranking";

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function decodeCsvBytes(bytes: Uint8Array): string {
  const utf8 = stripBom(new TextDecoder("utf-8").decode(bytes));
  const header = utf8.split(/\r?\n/, 1)[0] ?? "";

  const looksLikeUtf8Korean =
    header.includes("저자명") ||
    header.includes("과목") ||
    header.includes("brand_id") ||
    header.includes("brand_name");

  if (looksLikeUtf8Korean || !header.includes("UID")) {
    return utf8;
  }

  try {
    return stripBom(new TextDecoder("euc-kr").decode(bytes));
  } catch {
    return utf8;
  }
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim() !== "") {
      return String(direct).trim();
    }
  }

  const normalized = Object.entries(row).find(([header]) =>
    keys.some(
      (key) => stripBom(header).trim().toLowerCase() === key.toLowerCase(),
    ),
  );

  return normalized ? String(normalized[1] ?? "").trim() : "";
}

function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(stripBom(text), {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.error("CSV parse errors:", result.errors.slice(0, 5));
  }

  return result.data.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").trim() !== ""),
  );
}

async function readLocalCsv(filename: string): Promise<Uint8Array> {
  const buffer = await readFile(
    path.join(process.cwd(), "public", "data", filename),
  );
  return new Uint8Array(buffer);
}

async function fetchCsvBytes(filename: string): Promise<Uint8Array | null> {
  const baseUrl = process.env.CSV_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    try {
      return await readLocalCsv(filename);
    } catch (error) {
      console.warn(`Local CSV missing: ${filename}`, error);
      return null;
    }
  }

  const response = await fetch(`${baseUrl}/${filename}`, {
    cache: "force-cache",
    next: { tags: ["ranking-data"] },
  });

  if (!response.ok) {
    const body = await response.text();
    if (
      response.status === 404 ||
      body.includes("NoSuchKey") ||
      body.includes("not_found") ||
      body.includes("Object not found")
    ) {
      console.warn(`CSV not found (skipped): ${filename}`);
      return null;
    }

    throw new Error(
      `Failed to fetch ${baseUrl}/${filename}: ${response.status} ${response.statusText} ${body}`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

function normalizeSubject(value: string): Subject | null {
  const trimmed = value.trim();
  if (trimmed === "영어" || trimmed === "국어") return trimmed;
  if (trimmed === "EN" || trimmed.toUpperCase() === "ENGLISH") return "영어";
  if (trimmed === "KO" || trimmed.toUpperCase() === "KOREAN") return "국어";
  return null;
}

function toBrandInfo(row: Record<string, string>): BrandInfo | null {
  const UID = cell(row, "UID", "uid", "brand_id");
  const 저자명 = cell(row, "저자명", "brand_name", "nickname", "name");
  if (!UID || !저자명) return null;

  const address = cell(row, "address", "Address");
  const info1 = cell(row, "info1", "Info1");
  const info2 = cell(row, "info2", "Info2");
  const intro = cell(row, "intro", "Intro");
  const record = cell(row, "record", "Record");
  const range3 = cell(row, "range3", "Range3");
  const youtube_url = cell(
    row,
    "youtube_url",
    "youtube",
    "Youtube",
    "YouTube",
  );

  return {
    UID,
    저자명,
    ...(address ? { address } : {}),
    ...(info1 ? { info1 } : {}),
    ...(info2 ? { info2 } : {}),
    ...(intro ? { intro } : {}),
    ...(record ? { record } : {}),
    ...(range3 ? { range3 } : {}),
    ...(youtube_url ? { youtube_url } : {}),
  };
}

function toRankingRecord(row: Record<string, string>): RankingRecord | null {
  const UID = cell(row, "UID", "uid", "brand_id");
  const 과목 = normalizeSubject(cell(row, "과목", "subject", "Subject"));
  const rank = Number(cell(row, "rank", "Rank", "순위"));

  if (!UID || !과목 || Number.isNaN(rank)) return null;

  return { UID, 과목, rank };
}

function rankingKey(UID: string, 과목: Subject): string {
  return `${UID}::${과목}`;
}

function buildRankMap(rows: Record<string, string>[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const record = toRankingRecord(row);
    if (!record) continue;
    map.set(rankingKey(record.UID, record.과목), record.rank);
  }
  return map;
}

/**
 * prev 파일이 있을 때만 변동/뱃지 계산. 없으면 숨김.
 * NEW: (과거 없음 또는 과거 > 15위) AND (현재 ≤ 15위)
 * 그 외에는 ▲/▼/- (HOT: 3칸 이상 상승)
 */
function calcBadgeAndChangeText(
  currentRank: number,
  prevRank: number | undefined,
  hasPrevFile: boolean,
): { badge: RankBadge; changeText: string } {
  if (!hasPrevFile) {
    return { badge: null, changeText: "" };
  }

  const prevMissing = prevRank == null || !Number.isFinite(prevRank);
  const wasOutsideOrMissing =
    prevMissing || (prevRank as number) > NEW_BADGE_RANK_THRESHOLD;
  const isNowInside = currentRank <= NEW_BADGE_RANK_THRESHOLD;

  if (wasOutsideOrMissing && isNowInside) {
    return { badge: "NEW", changeText: "-" };
  }

  if (prevMissing) {
    return { badge: null, changeText: "-" };
  }

  const delta = (prevRank as number) - currentRank; // 양수 = 상승

  if (delta === 0) {
    return { badge: null, changeText: "-" };
  }

  if (delta > 0) {
    const changeText = `▲ ${delta}`;
    if (delta >= 3) {
      return { badge: "HOT", changeText };
    }
    return { badge: null, changeText };
  }

  return { badge: null, changeText: `▼ ${Math.abs(delta)}` };
}

function mergeRows(
  category: RankingCategory,
  rankings: RankingRecord[],
  brandMap: Map<string, BrandInfo>,
  brandNameFallback: Map<string, string>,
  prevRankMap: Map<string, number>,
  hasPrevFile: boolean,
): MergedRanking[] {
  return rankings
    .map((ranking) => {
      const info = brandMap.get(ranking.UID);
      const { badge, changeText } = calcBadgeAndChangeText(
        ranking.rank,
        prevRankMap.get(rankingKey(ranking.UID, ranking.과목)),
        hasPrevFile,
      );

      return {
        UID: ranking.UID,
        저자명:
          info?.저자명 ??
          brandNameFallback.get(ranking.UID) ??
          ranking.UID,
        과목: ranking.과목,
        rank: ranking.rank,
        address: info?.address,
        info1: info?.info1,
        info2: info?.info2,
        intro: info?.intro,
        record: info?.record,
        range3: info?.range3,
        youtube_url: info?.youtube_url,
        category,
        badge,
        changeText,
      } satisfies MergedRanking;
    })
    .sort((a, b) => a.rank - b.rank);
}

type CategoryRankMaps = Map<
  Exclude<RankingCategory, "추천">,
  Map<string, number>
>;

/**
 * 종합 점수 = count×1 + amount×1 + growth×5 + repurchase×10 + search×2
 * 없는 카테고리 순위는 MISSING_RANK_FALLBACK(100)
 * 과목별로 상위 RECOMMEND_TOP_N명 (점수 오름차순) → UID::과목 → rank
 */
function buildRecommendRankMap(
  brandMap: Map<string, BrandInfo>,
  categoryRankMaps: CategoryRankMaps,
): Map<string, number> {
  const brands = [...brandMap.values()];
  const result = new Map<string, number>();
  if (brands.length === 0) return result;

  for (const subject of SUBJECTS) {
    const scored = brands.map((info) => {
      let score = 0;
      for (const { category, weight } of RANKING_FILES) {
        const rankMap = categoryRankMaps.get(category);
        const rank =
          rankMap?.get(rankingKey(info.UID, subject)) ?? MISSING_RANK_FALLBACK;
        score += rank * weight;
      }
      return { info, score };
    });

    scored.sort(
      (a, b) =>
        a.score - b.score || a.info.저자명.localeCompare(b.info.저자명, "ko"),
    );

    scored.slice(0, RECOMMEND_TOP_N).forEach((entry, index) => {
      result.set(rankingKey(entry.info.UID, subject), index + 1);
    });
  }

  return result;
}

/**
 * 현재 발견 랭킹 + prev_* 기반 과거 발견 랭킹 비교로 badge/changeText 주입
 */
function buildRecommendRankings(
  brandMap: Map<string, BrandInfo>,
  categoryRankMaps: CategoryRankMaps,
  prevCategoryRankMaps: CategoryRankMaps,
  hasPrevData: boolean,
): MergedRanking[] {
  const brands = [...brandMap.values()];
  if (brands.length === 0) return [];

  const prevRecommendRanks = hasPrevData
    ? buildRecommendRankMap(brandMap, prevCategoryRankMaps)
    : new Map<string, number>();

  const results: MergedRanking[] = [];

  for (const subject of SUBJECTS) {
    const scored = brands.map((info) => {
      let score = 0;
      for (const { category, weight } of RANKING_FILES) {
        const rankMap = categoryRankMaps.get(category);
        const rank =
          rankMap?.get(rankingKey(info.UID, subject)) ?? MISSING_RANK_FALLBACK;
        score += rank * weight;
      }
      return { info, score };
    });

    scored.sort(
      (a, b) =>
        a.score - b.score || a.info.저자명.localeCompare(b.info.저자명, "ko"),
    );

    scored.slice(0, RECOMMEND_TOP_N).forEach((entry, index) => {
      const rank = index + 1;
      const key = rankingKey(entry.info.UID, subject);
      const { badge, changeText } = calcBadgeAndChangeText(
        rank,
        prevRecommendRanks.get(key),
        hasPrevData,
      );

      results.push({
        ...entry.info,
        과목: subject,
        rank,
        category: "추천",
        badge,
        changeText,
      });
    });
  }

  return results;
}

export function toPrevRankFilename(filename: string): string {
  return `prev_${filename}`;
}

/** brand_info.csv에서 저자명 부분일치 검색 */
export async function searchBrandAuthors(
  query: string,
): Promise<Array<{ UID: string; 저자명: string }>> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const bytes = await fetchCsvBytes("brand_info.csv");
  if (!bytes) return [];

  const matches: Array<{ UID: string; 저자명: string }> = [];
  const seen = new Set<string>();

  for (const info of parseCsv(decodeCsvBytes(bytes))
    .map(toBrandInfo)
    .filter((item): item is BrandInfo => item !== null)) {
    if (!info.저자명.toLowerCase().includes(q)) continue;
    if (seen.has(info.UID)) continue;
    seen.add(info.UID);
    matches.push({ UID: info.UID, 저자명: info.저자명 });
    if (matches.length >= 20) break;
  }

  return matches;
}

export async function fetchMergedRankings(): Promise<MergedRanking[]> {
  const [brandInfoBytes, ...fileBytes] = await Promise.all([
    fetchCsvBytes("brand_info.csv"),
    ...RANKING_FILES.flatMap(({ file }) => [
      fetchCsvBytes(file),
      fetchCsvBytes(toPrevRankFilename(file)),
    ]),
  ]);

  const brandMap = new Map<string, BrandInfo>();
  if (brandInfoBytes) {
    for (const info of parseCsv(decodeCsvBytes(brandInfoBytes))
      .map(toBrandInfo)
      .filter((item): item is BrandInfo => item !== null)) {
      brandMap.set(info.UID, info);
    }
  } else {
    console.warn(
      "brand_info.csv가 없어 랭킹 파일의 brand_name으로 표시합니다.",
    );
  }

  const merged: MergedRanking[] = [];
  const categoryRankMaps: CategoryRankMaps = new Map();
  const prevCategoryRankMaps: CategoryRankMaps = new Map();
  let loadedFiles = 0;
  let loadedPrevFiles = 0;

  RANKING_FILES.forEach(({ category }, index) => {
    const currentBytes = fileBytes[index * 2];
    const prevBytes = fileBytes[index * 2 + 1];
    if (!currentBytes) return;

    loadedFiles += 1;
    const rows = parseCsv(decodeCsvBytes(currentBytes));
    const brandNameFallback = new Map<string, string>();
    for (const row of rows) {
      const id = cell(row, "UID", "uid", "brand_id");
      const name = cell(row, "저자명", "brand_name");
      if (id && name) brandNameFallback.set(id, name);
    }

    const rankings = rows
      .map(toRankingRecord)
      .filter((item): item is RankingRecord => item !== null);

    const currentRankMap = buildRankMap(rows);
    categoryRankMaps.set(category, currentRankMap);

    const hasPrevFile = Boolean(prevBytes);
    const prevRankMap = hasPrevFile
      ? buildRankMap(parseCsv(decodeCsvBytes(prevBytes!)))
      : new Map<string, number>();

    if (hasPrevFile) {
      loadedPrevFiles += 1;
      prevCategoryRankMaps.set(category, prevRankMap);
    }

    // brand_info가 없을 때 추천 계산용으로 최소한의 BrandInfo 보강
    if (brandMap.size === 0) {
      for (const ranking of rankings) {
        if (brandMap.has(ranking.UID)) continue;
        brandMap.set(ranking.UID, {
          UID: ranking.UID,
          저자명: brandNameFallback.get(ranking.UID) ?? ranking.UID,
        });
      }
    }

    merged.push(
      ...mergeRows(
        category,
        rankings,
        brandMap,
        brandNameFallback,
        prevRankMap,
        hasPrevFile,
      ),
    );
  });

  if (loadedFiles === 0) {
    throw new Error("불러올 랭킹 CSV가 없습니다.");
  }

  merged.push(
    ...buildRecommendRankings(
      brandMap,
      categoryRankMaps,
      prevCategoryRankMaps,
      loadedPrevFiles > 0,
    ),
  );

  return merged;
}
