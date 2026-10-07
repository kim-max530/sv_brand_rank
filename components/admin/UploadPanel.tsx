"use client";

import { useMemo, useState, useTransition } from "react";
import { revalidateHomePage } from "@/actions/revalidate";
import {
  deleteRankingCsvBatch,
  uploadRankingCsv,
} from "@/actions/upload-csv";
import {
  CURR_RANKING_UPLOAD_FILES,
  PREV_RANKING_UPLOAD_FILES,
} from "@/lib/constants";

const STORAGE_BUCKET = "weekly_ranking";

type UploadTarget = { file: string; label: string };
type UploadSectionKey = "brand" | "prev" | "curr";

const PREV_TARGETS: UploadTarget[] = PREV_RANKING_UPLOAD_FILES.map(
  ({ file, label }) => ({ file, label }),
);

const BRAND_TARGETS: UploadTarget[] = [
  { file: "brand_info.csv", label: "브랜드 정보 (brand_info.csv)" },
];

const CURR_TARGETS: UploadTarget[] = CURR_RANKING_UPLOAD_FILES.map(
  ({ file, label }) => ({ file, label }),
);

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileState {
  file: File | null;
  status: UploadStatus;
  message: string;
}

function createInitialFileState(targets: UploadTarget[]): Record<string, FileState> {
  return Object.fromEntries(
    targets.map(({ file }) => [
      file,
      { file: null, status: "idle" as const, message: "" },
    ]),
  );
}

function UploadSection({
  title,
  description,
  targets,
  fileStates,
  onFileChange,
  onUpload,
  onReset,
  busy,
}: {
  title: string;
  description: string;
  targets: UploadTarget[];
  fileStates: Record<string, FileState>;
  onFileChange: (targetName: string, file: File | null) => void;
  onUpload: () => void;
  onReset: () => void;
  busy: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <p className="mt-1 text-xs text-slate-400">
        버킷: <code className="text-slate-600">{STORAGE_BUCKET}</code>
      </p>

      <ul className="mt-5 space-y-4">
        {targets.map(({ file, label }) => {
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
                  disabled={busy}
                  onChange={(event) =>
                    onFileChange(file, event.target.files?.[0] ?? null)
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
          onClick={onUpload}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          업로드
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          초기화(삭제)
        </button>
      </div>
    </section>
  );
}

export default function UploadPanel() {
  const [brandStates, setBrandStates] = useState(() =>
    createInitialFileState(BRAND_TARGETS),
  );
  const [prevStates, setPrevStates] = useState(() =>
    createInitialFileState(PREV_TARGETS),
  );
  const [currStates, setCurrStates] = useState(() =>
    createInitialFileState(CURR_TARGETS),
  );
  const [globalError, setGlobalError] = useState("");
  const [globalMessage, setGlobalMessage] = useState("");
  const [revalidateMessage, setRevalidateMessage] = useState("");
  const [isRevalidating, startRevalidate] = useTransition();
  const [busyAction, setBusyAction] = useState(false);

  const isBusy = busyAction || isRevalidating;

  const isUploading = useMemo(
    () =>
      Object.values(brandStates).some((s) => s.status === "uploading") ||
      Object.values(prevStates).some((s) => s.status === "uploading") ||
      Object.values(currStates).some((s) => s.status === "uploading"),
    [brandStates, prevStates, currStates],
  );

  const updateState = (
    section: UploadSectionKey,
    name: string,
    patch: Partial<FileState>,
  ) => {
    const setter =
      section === "brand"
        ? setBrandStates
        : section === "prev"
          ? setPrevStates
          : setCurrStates;
    setter((prev) => ({
      ...prev,
      [name]: { ...prev[name], ...patch },
    }));
  };

  const handleFileChange = (
    section: UploadSectionKey,
    targetName: string,
    file: File | null,
  ) => {
    if (!file) {
      updateState(section, targetName, {
        file: null,
        status: "idle",
        message: "",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      updateState(section, targetName, {
        file: null,
        status: "error",
        message: "CSV 파일만 업로드할 수 있습니다.",
      });
      return;
    }

    if (file.name.toLowerCase() !== targetName.toLowerCase()) {
      updateState(section, targetName, {
        file: null,
        status: "error",
        message: `파일명을 ${targetName}(으)로 맞춰 주세요.`,
      });
      return;
    }

    updateState(section, targetName, {
      file,
      status: "idle",
      message: `${file.name} 선택됨`,
    });
  };

  const uploadOne = async (
    section: UploadSectionKey,
    targetName: string,
    file: File,
  ) => {
    updateState(section, targetName, {
      status: "uploading",
      message: "업로드 중…",
    });

    try {
      const formData = new FormData();
      formData.set("targetName", targetName);
      formData.set("file", file);

      const result = await uploadRankingCsv(formData);

      if (!result.ok) {
        updateState(section, targetName, {
          status: "error",
          message: result.error,
        });
        return false;
      }

      updateState(section, targetName, {
        status: "success",
        message: result.message,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "업로드에 실패했습니다.";
      updateState(section, targetName, { status: "error", message });
      return false;
    }
  };

  const handleUploadSection = async (
    section: UploadSectionKey,
    targets: UploadTarget[],
  ) => {
    setGlobalError("");
    setGlobalMessage("");
    setRevalidateMessage("");

    const states =
      section === "brand"
        ? brandStates
        : section === "prev"
          ? prevStates
          : currStates;
    const selected = targets.filter(
      ({ file }) => states[file]?.file instanceof File,
    );

    if (selected.length === 0) {
      setGlobalError("업로드할 CSV 파일을 하나 이상 선택해 주세요.");
      return;
    }

    setBusyAction(true);
    let successCount = 0;
    for (const { file } of selected) {
      const current = states[file]?.file;
      if (!current) continue;
      const ok = await uploadOne(section, file, current);
      if (ok) successCount += 1;
    }
    setBusyAction(false);

    if (successCount === 0) {
      setGlobalError(
        "업로드에 성공한 파일이 없습니다. SUPABASE_SECRET_KEY와 Storage 버킷 설정을 확인하세요.",
      );
    } else {
      setGlobalMessage(`${successCount}개 파일 업로드 완료`);
    }
  };

  const handleResetSection = async (
    section: UploadSectionKey,
    targets: UploadTarget[],
  ) => {
    const label =
      section === "brand"
        ? "브랜드 정보(brand_info.csv)"
        : section === "prev"
        ? "지난주 랭킹 데이터(prev_rank_*)"
        : "이번 주 랭킹 데이터(rank_*)";
    const ok = window.confirm(
      `${label}를 Storage에서 모두 삭제(초기화)할까요?\n이 작업은 되돌릴 수 없습니다.`,
    );
    if (!ok) return;

    setGlobalError("");
    setGlobalMessage("");
    setBusyAction(true);
    const result = await deleteRankingCsvBatch(targets.map((t) => t.file));
    setBusyAction(false);

    if (!result.ok) {
      setGlobalError(result.error);
      return;
    }

    setGlobalMessage(result.message);
    if (section === "brand") {
      setBrandStates(createInitialFileState(BRAND_TARGETS));
    } else if (section === "prev") {
      setPrevStates(createInitialFileState(PREV_TARGETS));
    } else {
      setCurrStates(createInitialFileState(CURR_TARGETS));
    }
  };

  const handleRevalidate = () => {
    setGlobalError("");
    setGlobalMessage("");
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
          지난주(<code>prev_rank_*.csv</code>)와 이번 주(
          <code>rank_*.csv</code>)를 분리해 관리합니다. 순위 변동·NEW 뱃지는 두
          세트를 비교해 계산됩니다.
        </p>
      </div>

      <UploadSection
        title="브랜드 정보 업로드 (상시 기준 데이터)"
        description="brand_info.csv — 저자명, 브랜드 주소, 소개 및 태그(record2)를 관리합니다. 주간 랭킹 초기화와 독립적으로 유지됩니다."
        targets={BRAND_TARGETS}
        fileStates={brandStates}
        onFileChange={(name, file) => handleFileChange("brand", name, file)}
        onUpload={() => void handleUploadSection("brand", BRAND_TARGETS)}
        onReset={() => void handleResetSection("brand", BRAND_TARGETS)}
        busy={isBusy || isUploading}
      />

      <UploadSection
        title="지난주 랭킹 데이터 업로드 (초기화 및 비교용)"
        description="prev_rank_*.csv — 순위 변동 비교 기준. 비어 있으면 변동 표시를 숨깁니다."
        targets={PREV_TARGETS}
        fileStates={prevStates}
        onFileChange={(name, file) => handleFileChange("prev", name, file)}
        onUpload={() => void handleUploadSection("prev", PREV_TARGETS)}
        onReset={() => void handleResetSection("prev", PREV_TARGETS)}
        busy={isBusy || isUploading}
      />

      <UploadSection
        title="이번 주 랭킹 데이터 업로드 (현재 서비스 노출용)"
        description="rank_*.csv — 현재 주간 순위를 갱신하며 brand_info.csv에는 영향을 주지 않습니다."
        targets={CURR_TARGETS}
        fileStates={currStates}
        onFileChange={(name, file) => handleFileChange("curr", name, file)}
        onUpload={() => void handleUploadSection("curr", CURR_TARGETS)}
        onReset={() => void handleResetSection("curr", CURR_TARGETS)}
        busy={isBusy || isUploading}
      />

      <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-teal-900">즉시 반영</h3>
        <p className="mt-1 text-sm text-teal-800/80">
          메인 페이지(`/`) 캐시를 강제로 초기화합니다.
        </p>
        <button
          type="button"
          onClick={handleRevalidate}
          disabled={isBusy || isUploading}
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

      {globalMessage ? (
        <p
          className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800"
          role="status"
        >
          {globalMessage}
        </p>
      ) : null}

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
