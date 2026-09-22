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

  const startYear = monday.getFullYear();
  const endYear = sunday.getFullYear();
  const startMonth = monday.getMonth() + 1;
  const endMonth = sunday.getMonth() + 1;
  const startDay = monday.getDate();
  const endDay = sunday.getDate();

  const startText = `${startYear}년 ${startMonth}월 ${startDay}일`;
  const endText =
    startYear === endYear
      ? `${endMonth}월 ${endDay}일`
      : `${endYear}년 ${endMonth}월 ${endDay}일`;

  return `집계일 : ${startText} ~ ${endText}`;
}
