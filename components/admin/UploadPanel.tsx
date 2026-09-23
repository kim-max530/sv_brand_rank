"use client";

import { useMemo, useState, useTransition } from "react";
import { revalidateHomePage } from "@/actions/revalidate";
import { uploadRankingCsv } from "@/actions/upload-csv";
import { RANKING_FILES } from "@/lib/constants";

const STORAGE_BUCKET = "weekly_ranking";

const UPLOAD_TARGETS = [
  { file: "brand_info.csv", label: "브랜드 정보 (brand_info.csv)" },
  ...RANKING_FILES.map(({ file, category }) => ({
    file,
    label: `${category} (${file})`,
  })),
] as const;

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileState {
  file: File | null;
  status: UploadStatus;
  message: string;
}

function createInitialFileState(): Record<string, FileState> {
  return Object.fromEntries(
    UPLOAD_TARGETS.map(({ file }) => [
      file,
      { file: null, status: "idle" as const, message: "" },
    ]),
  );
}

export default function UploadPanel() {
  const [fileStates, setFileStates] = useState(createInitialFileState);
  const [globalError, setGlobalError] = useState("");
  const [revalidateMessage, setRevalidateMessage] = useState("");
  const [isRevalidating, startRevalidate] = useTransition();

  const isUploading = useMemo(
    () =>
      Object.values(fileStates).some((state) => state.status === "uploading"),
    [fileStates],
  );

  const updateFileState = (name: string, patch: Partial<FileState>) => {
    setFileStates((prev) => ({
      ...prev,
      [name]: { ...prev[name], ...patch },
    }));
  };

  const handleFileChange = (targetName: string, file: File | null) => {
    if (!file) {
      updateFileState(targetName, { file: null, status: "idle", message: "" });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      updateFileState(targetName, {
        file: null,
        status: "error",
        message: "CSV 파일만 업로드할 수 있습니다.",
      });
      return;
    }

    updateFileState(targetName, {
      file,
      status: "idle",
      message: `${file.name} 선택됨`,
    });
  };

  const uploadOne = async (targetName: string, file: File) => {
    updateFileState(targetName, {
      status: "uploading",
      message: "업로드 중…",
    });

    try {
      const formData = new FormData();
      formData.set("targetName", targetName);
      formData.set("file", file);

      const result = await uploadRankingCsv(formData);

      if (!result.ok) {
        updateFileState(targetName, {
          status: "error",
          message: result.error,
        });
        return false;
      }

      updateFileState(targetName, {
        status: "success",
        message: result.message,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "업로드에 실패했습니다.";
      updateFileState(targetName, { status: "error", message });
      return false;
    }
  };

  const handleUploadSelected = async () => {
    setGlobalError("");
    setRevalidateMessage("");

    const selected = UPLOAD_TARGETS.filter(
      ({ file }) => fileStates[file]?.file instanceof File,
    );

    if (selected.length === 0) {
      setGlobalError("업로드할 CSV 파일을 하나 이상 선택해 주세요.");
      return;
    }

    let successCount = 0;
    for (const { file } of selected) {
      const current = fileStates[file]?.file;
      if (!current) continue;
      const ok = await uploadOne(file, current);
      if (ok) successCount += 1;
    }

    if (successCount === 0) {
      setGlobalError(
        "업로드에 성공한 파일이 없습니다. SUPABASE_SECRET_KEY와 Storage 버킷 설정을 확인하세요.",
      );
    }
  };

  const handleRevalidate = () => {
    setGlobalError("");
    setRevalidateMessage("");

    startRevalidate(async () => {
      const result = await revalidateHomePage();
      if (result.ok) {
        setRevalidateMessage("성공적으로 반영되었습니다");
        window.alert("성공적으로 반영되었습니다");
      } else {
        setGlobalError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          파일 업로드
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          rank_*.csv 업로드 시 기존 파일을 prev_rank_*.csv로 보관한 뒤 덮어씁니다.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">CSV 업로드</h3>
        <p className="mt-1 text-sm text-slate-500">
          버킷: <code className="text-slate-700">{STORAGE_BUCKET}</code> (upsert)
        </p>

        <ul className="mt-5 space-y-4">
          {UPLOAD_TARGETS.map(({ file, label }) => {
            const state = fileStates[file];
            return (
              <li
                key={file}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{file}</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={isUploading || isRevalidating}
                    onChange={(event) =>
                      handleFileChange(file, event.target.files?.[0] ?? null)
                    }
                    className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
                  />
                </div>
                {state?.message ? (
                  <p
                    className={`mt-2 text-sm ${
                      state.status === "error"
                        ? "text-rose-600"
                        : state.status === "success"
                          ? "text-teal-700"
                          : "text-slate-500"
                    }`}
                  >
                    {state.message}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUploadSelected}
            disabled={isUploading || isRevalidating}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "업로드 중…" : "선택한 파일 업로드"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-teal-900">즉시 반영</h3>
        <p className="mt-1 text-sm text-teal-800/80">
          메인 페이지(`/`) 캐시를 강제로 초기화합니다.
        </p>
        <button
          type="button"
          onClick={handleRevalidate}
          disabled={isUploading || isRevalidating}
          className="mt-4 rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRevalidating ? "캐시 초기화 중…" : "즉시 반영 (캐시 초기화)"}
        </button>
        {revalidateMessage ? (
          <p className="mt-3 text-sm font-medium text-teal-800" role="status">
            {revalidateMessage}
          </p>
        ) : null}
      </section>

      {globalError ? (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {globalError}
        </p>
      ) : null}
    </div>
  );
}
