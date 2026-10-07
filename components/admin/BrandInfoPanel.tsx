"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getBrandInfoStatusAction,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          브랜드 정보
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          <code>brand_info.csv</code>만 관리합니다. 주간 랭킹(지난주/이번 주)
          업로드·초기화와 완전히 분리되어 있습니다.
        </p>
      </div>

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
              <dt className="text-slate-500">전체 행</dt>
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
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {status.error}
          </p>
        )}

        <button
          type="button"
          onClick={refreshStatus}
          disabled={busy}
          className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          상태 새로고침
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">파일 업로드</h3>
        <p className="mt-1 text-sm text-slate-500">
          파일명이 달라도 됩니다. 내용에 <strong>UID</strong>와{" "}
          <strong>record2</strong> 열이 있으면 Storage에{" "}
          <code>brand_info.csv</code>로 저장하고 즉시 반영합니다.
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
          {busy ? "처리 중…" : "업로드 후 즉시 반영"}
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
