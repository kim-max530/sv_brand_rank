"use client";

import { useState } from "react";
import BrandInfoPanel from "@/components/admin/BrandInfoPanel";
import UploadPanel from "@/components/admin/UploadPanel";

type FileSubTab = "data" | "brand";

const SUB_TABS: Array<{ id: FileSubTab; label: string }> = [
  { id: "data", label: "데이터 업로드" },
  { id: "brand", label: "브랜드 정보 업로드" },
];

/** 파일 업로드 LNB — 데이터 / 브랜드 정보 서브 탭 */
export default function FileManagePanel({
  defaultTab = "data",
}: {
  defaultTab?: FileSubTab;
}) {
  const [subTab, setSubTab] = useState<FileSubTab>(defaultTab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          파일 업로드
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          주간 랭킹 데이터와 브랜드 정보(<code>brand_info.csv</code>)를
          분리해 관리합니다.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="파일 업로드 구분"
        className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
      >
        {SUB_TABS.map((item) => {
          const selected = item.id === subTab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSubTab(item.id)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                selected
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {subTab === "data" ? <UploadPanel /> : <BrandInfoPanel />}
      </div>
    </div>
  );
}
