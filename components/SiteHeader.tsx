"use client";

import Image from "next/image";
import { Menu, Search } from "lucide-react";

export default function SiteHeader() {
  return (
    <header className="w-full border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:justify-center">
        <a
          href="https://solvook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center transition hover:opacity-80"
          aria-label="쏠북 홈으로 이동"
        >
          <Image
            src="/Logo.png"
            alt="SOLVOOK"
            width={140}
            height={40}
            className="h-[1.35rem] w-auto sm:h-[1.5rem]"
            priority
          />
        </a>

        <div className="flex items-center gap-3 lg:absolute lg:right-6">
          <a
            href="https://solvook.com/search"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-700 transition hover:bg-gray-50"
            aria-label="검색"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} />
          </a>
          <a
            href="https://solvook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-700 transition hover:bg-gray-50 lg:hidden"
            aria-label="메뉴"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </a>
        </div>
      </div>
    </header>
  );
}
