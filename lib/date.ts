/**
 * 오늘 기준 '가장 최근에 지난 일요일'을 끝으로 하는
 * 직전 주(월요일~일요일) 날짜 범위를 한글 문장으로 반환합니다.
 */
export function getPreviousWeekDateRange(now: Date = new Date()): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const day = today.getDay(); // 0=일 … 6=토
  // 오늘이 일요일이면 '지난' 일요일은 7일 전, 그 외에는 이번 주가 아닌 직전 일요일
  const daysSinceLastSunday = day === 0 ? 7 : day;

  const sunday = new Date(today);
  sunday.setDate(today.getDate() - daysSinceLastSunday);

  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);

  const pad = (n: number) => String(n).padStart(2, "0");
  const startText = `${monday.getFullYear()}.${pad(monday.getMonth() + 1)}.${pad(monday.getDate())}`;
  const endText = `${sunday.getFullYear()}.${pad(sunday.getMonth() + 1)}.${pad(sunday.getDate())}`;

  return `(${startText} ~ ${endText})`;
}
