/** 홈페이지(자료) 이동 — 하트 포함 집 아이콘 */
export default function StoreHeartIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3.5 8.5 12 2l8.5 6.5v10.25A2.25 2.25 0 0 1 18.25 21H5.75a2.25 2.25 0 0 1-2.25-2.25V8.5Z" />
      <path d="M12 17.1c-2.8-1.65-4.2-2.95-4.2-4.65A2.35 2.35 0 0 1 12 11a2.35 2.35 0 0 1 4.2 1.45c0 1.7-1.4 3-4.2 4.65Z" />
    </svg>
  );
}
