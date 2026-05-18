"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  StickyNote,
  X,
} from "lucide-react";

type CrewJob = {
  id: string;
  locationName: string;
  clientName: string | null;
  status: string;
  jobDate: string | null;
  notes: string | null;
};

function formatJobDate(isoDate: string | null): string {
  if (!isoDate) return "Date not set";
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  const local = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(local);
}

function statusPillClass(status: string): string {
  if (status === "in_progress") {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-slate-100 text-slate-700";
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In progress";
  if (status === "pending") return "Pending";
  return status;
}

const MAX_PHOTOS = 5;

type PendingPhoto = {
  id: string;
  file: Blob;
  previewUrl: string;
};

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxWidth = 1600;
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
        0.7,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

export default function CrewPage() {
  const params = useParams();
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanerName, setCleanerName] = useState<string | null>(null);
  const [jobs, setJobs] = useState<CrewJob[]>([]);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [modalJob, setModalJob] = useState<CrewJob | null>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );

  const revokePhotos = useCallback((items: PendingPhoto[]) => {
    for (const p of items) {
      URL.revokeObjectURL(p.previewUrl);
    }
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setPhotos((prev) => {
      revokePhotos(prev);
      return [];
    });
    setModalJob(null);
  }, [isSubmitting, revokePhotos]);

  const openCompleteModal = (job: CrewJob) => {
    if (!token?.trim()) return;
    setPhotos((prev) => {
      revokePhotos(prev);
      return [];
    });
    setModalJob(job);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || photos.length >= MAX_PHOTOS) return;

    try {
      const compressed = await compressImage(file);
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(compressed);
      setPhotos((prev) => [...prev, { id, file: compressed, previewUrl }]);
    } catch {
      setToast({ message: "Couldn't process photo. Try again.", type: "error" });
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCompleteJob = async () => {
    if (!token?.trim() || !modalJob) return;

    setIsSubmitting(true);
    setCompletingJobId(modalJob.id);

    try {
      for (const photo of photos) {
        const formData = new FormData();
        formData.append("jobId", modalJob.id);
        formData.append("photo", photo.file, "photo.jpg");

        const uploadRes = await fetch(
          `/api/crew/${encodeURIComponent(token)}/photos`,
          { method: "POST", body: formData, cache: "no-store" },
        );

        if (!uploadRes.ok) {
          const data = (await uploadRes.json().catch(() => ({}))) as { error?: string };
          setToast({
            message: data?.error || "Couldn't upload photo. Try again.",
            type: "error",
          });
          return;
        }
      }

      const res = await fetch(`/api/crew/${encodeURIComponent(token)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: modalJob.id }),
        cache: "no-store",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setToast({
          message: data?.error || "Couldn't mark complete. Try again.",
          type: "error",
        });
        return;
      }

      const completedId = modalJob.id;
      setJobs((prev) => prev.filter((j) => j.id !== completedId));
      setPhotos((prev) => {
        revokePhotos(prev);
        return [];
      });
      setModalJob(null);
      setToast({ message: "Job complete!", type: "success" });
    } catch {
      setToast({
        message: "Couldn't mark complete. Try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
      setCompletingJobId(null);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!token?.trim()) {
      setError("Link not found. Contact your manager.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (isBackground = false) => {
      if (!isBackground) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const res = await fetch(`/api/crew/${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          cleaner?: { name: string };
          jobs?: CrewJob[];
        };

        if (cancelled) return;

        if (res.ok) {
          setCleanerName(data.cleaner?.name ?? null);
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
          return;
        }

        if (res.status === 403) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "This link is no longer active. Contact your manager.",
          );
          return;
        }

        if (res.status === 404) {
          setError("Link not found. Contact your manager.");
          return;
        }

        setError("Couldn't load jobs. Try again.");
      } catch {
        if (!cancelled) {
          setError("Couldn't load jobs. Try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    // A — Auto-refresh every 60 seconds
    const intervalId = window.setInterval(() => {
      void load(true);
    }, 60000);

    // D — Refresh when the page becomes visible again (e.g., user unlocks phone)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 font-[family-name:var(--font-geist-sans)]">
        <p className="animate-pulse text-base text-slate-500">Loading your jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 font-[family-name:var(--font-geist-sans)]">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" aria-hidden />
          <h1 className="text-xl font-semibold text-slate-900">Hmm.</h1>
          <p className="mt-2 text-base text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] text-slate-900">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 top-[18.25rem] z-50 flex max-w-[min(100%-2rem,28rem)] -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          )}
          {toast.message}
        </div>
      ) : null}
      <header className="bg-emerald-500 py-6 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 shadow-sm">
            <Check className="h-6 w-6 text-white" strokeWidth={3} aria-hidden />
          </div>
          <p className="text-lg font-semibold tracking-tight">ProofClean</p>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Hi{cleanerName ? ` ${cleanerName}` : ""}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {jobs.length > 0
            ? "Here are your upcoming jobs."
            : "No jobs assigned to you right now."}
        </p>
      </section>

      <div className="mx-auto my-3 flex max-w-[calc(28rem-2rem)] items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <Lock className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="text-sm text-amber-800">
          This is your personal link. Don&apos;t share it with anyone.
        </p>
      </div>

      <div className="mx-auto max-w-md px-4 pb-8">
        {jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  {job.clientName ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {job.clientName}
                    </p>
                  ) : null}
                  <p className="text-lg font-semibold text-slate-900">{job.locationName}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{formatJobDate(job.jobDate)}</span>
                  </div>
                  {job.notes?.trim() ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="flex items-start gap-2">
                        <StickyNote
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden
                        />
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{job.notes}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex justify-end">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(job.status)}`}
                    >
                      {statusLabel(job.status)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500"
                    onClick={() => openCompleteModal(job)}
                    disabled={completingJobId === job.id}
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                    {completingJobId === job.id ? "Completing..." : "Mark Complete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-2 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">Nothing scheduled right now.</p>
            <p className="mt-2 max-w-sm text-base text-slate-600">
              Check back later or contact your manager if you think this is wrong.
            </p>
          </div>
        )}
      </div>

      {modalJob ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-modal-title"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="complete-modal-title" className="text-xl font-semibold text-slate-900">
              Complete this job?
            </h2>

            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700">Add photos (optional)</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => void handlePhotoSelect(e)}
                  disabled={photos.length >= MAX_PHOTOS || isSubmitting}
                />
                <button
                  type="button"
                  className="flex min-h-[88px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photos.length >= MAX_PHOTOS || isSubmitting}
                >
                  <Camera className="h-8 w-8" aria-hidden />
                  <span className="text-base font-semibold">
                    {photos.length >= MAX_PHOTOS ? "Max 5 photos" : "Take photo"}
                  </span>
                </button>
                <span className="text-sm font-medium tabular-nums text-slate-600">
                  {photos.length}/{MAX_PHOTOS}
                </span>
              </div>

              {photos.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                        onClick={() => removePhoto(photo.id)}
                        disabled={isSubmitting}
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-base font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleCompleteJob()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    Completing...
                  </>
                ) : (
                  "Complete Job"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
