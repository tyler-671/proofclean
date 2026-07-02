"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type MapJob = {
  id: string;
  latitude: number;
  longitude: number;
  cleanerId: string | null;
  cleanerName: string;
  clientName: string | null;
  locationName: string;
  address: string | null;
  jobDate: string | null;
  status: string;
};

type JobsMapProps = {
  jobs: MapJob[];
};

const CLEANER_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#d946ef",
];

const UNASSIGNED_COLOR = "#64748b";

function colorForCleaner(cleanerId: string | null): string {
  if (!cleanerId) return UNASSIGNED_COLOR;

  let hash = 0;
  for (let i = 0; i < cleanerId.length; i += 1) {
    hash = (hash * 31 + cleanerId.charCodeAt(i)) | 0;
  }

  const index = Math.abs(hash) % CLEANER_COLORS.length;
  return CLEANER_COLORS[index];
}

function formatStatus(status: string): string {
  if (status === "in_progress") return "In progress";
  if (status === "pending") return "Pending";
  if (status === "complete") return "Complete";
  return status;
}

function formatJobDate(jobDate: string | null): string {
  if (!jobDate) return "Not set";
  const [y, m, d] = jobDate.split("-").map(Number);
  if (!y || !m || !d) return jobDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function JobsMap({ jobs }: JobsMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const legend = useMemo(() => {
    const seen: Record<string, { key: string; name: string; color: string }> = {};
    for (const job of jobs) {
      const key = job.cleanerId ?? `__name__${job.cleanerName}`;
      if (!seen[key]) {
        seen[key] = {
          key,
          name: job.cleanerName || "Unassigned",
          color: colorForCleaner(job.cleanerId),
        };
      }
    }
    return Object.values(seen).sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs]);

  const initialViewState = useMemo(() => {
    if (jobs.length === 0) {
      return { longitude: -79.38, latitude: 43.65, zoom: 3 };
    }
    const avgLng = jobs.reduce((sum, job) => sum + job.longitude, 0) / jobs.length;
    const avgLat = jobs.reduce((sum, job) => sum + job.latitude, 0) / jobs.length;
    return { longitude: avgLng, latitude: avgLat, zoom: jobs.length === 1 ? 13 : 9 };
  }, [jobs]);

  const fitToJobs = useCallback(() => {
    const map = mapRef.current;
    if (!map || jobs.length === 0) return;

    if (jobs.length === 1) {
      map.flyTo({
        center: [jobs[0].longitude, jobs[0].latitude],
        zoom: 13,
        duration: 0,
      });
      return;
    }

    let minLng = jobs[0].longitude;
    let maxLng = jobs[0].longitude;
    let minLat = jobs[0].latitude;
    let maxLat = jobs[0].latitude;

    for (const job of jobs) {
      minLng = Math.min(minLng, job.longitude);
      maxLng = Math.max(maxLng, job.longitude);
      minLat = Math.min(minLat, job.latitude);
      maxLat = Math.max(maxLat, job.latitude);
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 72, maxZoom: 14, duration: 0 },
    );
  }, [jobs]);

  useEffect(() => {
    if (mapRef.current) fitToJobs();
  }, [fitToJobs]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-600">
        Map is unavailable (Mapbox token missing).
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={fitToJobs}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {jobs.map((job) => (
          <Marker
            key={job.id}
            longitude={job.longitude}
            latitude={job.latitude}
            anchor="bottom"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              setSelectedJobId(job.id);
            }}
          >
            <button
              type="button"
              aria-label={`${job.locationName} — ${job.cleanerName}`}
              className="flex cursor-pointer items-center justify-center focus:outline-none"
            >
              <svg
                width="26"
                height="34"
                viewBox="0 0 26 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-md"
                aria-hidden
              >
                <path
                  d="M13 1C6.925 1 2 5.925 2 12c0 7.7 9.15 18.55 10.02 19.56a1.28 1.28 0 0 0 1.96 0C14.85 30.55 24 19.7 24 12 24 5.925 19.075 1 13 1Z"
                  fill={colorForCleaner(job.cleanerId)}
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="13" cy="12" r="4" fill="#ffffff" />
              </svg>
            </button>
          </Marker>
        ))}

        {selectedJob ? (
          <Popup
            longitude={selectedJob.longitude}
            latitude={selectedJob.latitude}
            anchor="bottom"
            offset={28}
            closeOnClick
            onClose={() => setSelectedJobId(null)}
            maxWidth="280px"
          >
            <div className="font-[family-name:var(--font-geist-sans)]">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForCleaner(selectedJob.cleanerId) }}
                />
                <p className="text-sm font-bold text-slate-900">{selectedJob.cleanerName || "Unassigned"}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedJob.clientName ?? selectedJob.locationName}
              </p>
              {selectedJob.clientName ? (
                <p className="text-xs font-medium text-slate-600">{selectedJob.locationName}</p>
              ) : null}
              {selectedJob.address ? (
                <p className="mt-1 text-xs text-slate-500">{selectedJob.address}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>{formatJobDate(selectedJob.jobDate)}</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {formatStatus(selectedJob.status)}
                </span>
              </div>
            </div>
          </Popup>
        ) : null}
      </Map>

      {legend.length > 0 ? (
        <div className="absolute left-3 top-3 z-10 max-h-[calc(100%-1.5rem)] w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cleaners
          </p>
          <ul className="space-y-1.5">
            {legend.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-xs font-medium text-slate-700">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
