import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "쏠북, 좋은 자료의 발견",
  description: "과목·기준별 주간 브랜드 랭킹을 확인하세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://muplofnrjexvbggwyuyb.supabase.co"
          crossOrigin=""
        />
        <link
          rel="dns-prefetch"
          href="https://muplofnrjexvbggwyuyb.supabase.co"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
