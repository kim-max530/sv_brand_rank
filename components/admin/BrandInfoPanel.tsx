"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getBrandInfoStatusAction,
  restoreBrandInfoFromBundleAction,
  uploadBrandInfoCsv,
  type BrandInfoStatus,
} from "@/actions/brand-info";

export default function BrandInfoPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<BrandInfoStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, startBusy] = useTransition();

  const refreshStatus = () => {
    startBusy(async () => {
      const next = await getBrandInfoStatusAction();
      setStatus(next);
    });
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const handleUpload = () => {
    setMessage("");
    setError("");
    if (!file) {
      setError("업로드할 brand_info.csv를 선택해 주세요.");
      return;
    }

    startBusy(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadBrandInfoCsv(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      setFile(null);
      const next = await getBrandInfoStatusAction();
      setStatus(next);
    });
  };

  const handleRestore = () => {
    setMessage("");
    setError("");
    const ok = window.confirm(
      "배포본(public/data/brand_info.csv)으로 Storage brand_info를 덮어쓸까요?",
    );
    if (!ok) return;

    startBusy(async () => {
      const result = await restoreBrandInfoFromBundleAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      const next = await getBrandInfoStatusAction();
      setStatus(next);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          브랜드 정보
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          <code>brand_info.csv</code>만 관리합니다. 필수 열:{" "}
          <strong>UID</strong>, <strong>address</strong>,{" "}
          <strong>record2</strong>. 주간 랭킹 업로드와 완전히 분리됩니다.
        </p>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
        <p className="font-semibold">문제가 이렇게 보일 때</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            브랜드 랭킹: “앗, 조건에 맞는 브랜드가 없어요” → address 없는
            brand_info
          </li>
          <li>추천 랭킹: 모든 저자에 홈 대신 검색 아이콘 → address 누락</li>
        </ul>
        <p className="mt-2">
          Storage에 <code>brand_name,range</code> 형식 파일이 올라가면 위 증상이
          납니다. 반드시 UID/address/record2가 있는 파일을 올리거나 아래
          “배포본으로 복구”를 사용하세요.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">현재 상태</h3>
        <p className="mt-1 text-sm text-slate-500">
          Storage에 올라간 실제 파일을 직접 확인합니다.
        </p>

        {status == null ? (
          <p className="mt-4 text-sm text-slate-500">상태 확인 중…</p>
        ) : status.ok ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">소스</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {status.source === "storage" ? "Storage" : "배포본"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">전체 행(UID)</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {status.rowCount}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">address 있음</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {status.withAddress}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">태그(record2) 있음</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {status.withTags}
              </dd>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-teal-50 px-4 py-3 text-teal-900">
              <p className="font-medium">{status.updatedHint}</p>
              <p className="mt-1 break-all text-xs text-teal-800/80">
                header: {status.header}
              </p>
              {status.sampleTags.length > 0 ? (
                <p className="mt-1 text-sm">
                  샘플 태그:{" "}
                  {status.sampleTags.map((tag) => `#${tag}`).join(", ")}
                </p>
              ) : (
                <p className="mt-1 text-sm text-rose-700">
                  태그 샘플이 없습니다. record2 열을 확인해 주세요.
                </p>
              )}
            </div>
          </dl>
        ) : (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>{status.error}</p>
            {status.header ? (
              <p className="mt-2 break-all text-xs text-rose-600/90">
                header: {status.header}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={refreshStatus}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            상태 새로고침
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={busy}
            className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 disabled:opacity-50"
          >
            배포본으로 Storage 복구
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">파일 업로드</h3>
        <p className="mt-1 text-sm text-slate-500">
          파일명이 달라도 됩니다. 업로드 후 Storage를 다시 읽어 검증하고, 메인
          캐시까지 즉시 갱신합니다.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-4 block w-full max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
        />
        {file ? (
          <p className="mt-2 text-sm text-slate-500">선택됨: {file.name}</p>
        ) : null}

        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !file}
          className="mt-5 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "처리 중…" : "업로드 후 검증·즉시 반영"}
        </button>

        {message ? (
          <p
            className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
