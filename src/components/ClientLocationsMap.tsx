"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import { AlertTriangle } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const BRAND_GREEN = "#10b981";

export type ClientMapLocation = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type MappedLocation = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

type ClientLocationsMapProps = {
  locations: ClientMapLocation[];
};

export default function ClientLocationsMap({ locations }: ClientLocationsMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapped = useMemo<MappedLocation[]>(
    () =>
      locations
        .filter(
          (location) =>
            location.latitude !== null &&
            location.latitude !== undefined &&
            location.longitude !== null &&
            location.longitude !== undefined,
        )
        .map((location) => ({
          id: location.id,
          name: location.name,
          address: location.address,
          latitude: location.latitude as number,
          longitude: location.longitude as number,
        })),
    [locations],
  );

  const unmappedCount = locations.length - mapped.length;

  const selected = useMemo(
    () => mapped.find((location) => location.id === selectedId) ?? null,
    [mapped, selectedId],
  );

  const initialViewState = useMemo(() => {
    if (mapped.length === 0) {
      return { longitude: -79.38, latitude: 43.65, zoom: 3 };
    }
    const avgLng = mapped.reduce((sum, loc) => sum + loc.longitude, 0) / mapped.length;
    const avgLat = mapped.reduce((sum, loc) => sum + loc.latitude, 0) / mapped.length;
    return { longitude: avgLng, latitude: avgLat, zoom: mapped.length === 1 ? 13 : 9 };
  }, [mapped]);

  const fitToLocations = useCallback(() => {
    const map = mapRef.current;
    if (!map || mapped.length === 0) return;

    if (mapped.length === 1) {
      map.flyTo({
        center: [mapped[0].longitude, mapped[0].latitude],
        zoom: 13,
        duration: 0,
      });
      return;
    }

    let minLng = mapped[0].longitude;
    let maxLng = mapped[0].longitude;
    let minLat = mapped[0].latitude;
    let maxLat = mapped[0].latitude;

    for (const loc of mapped) {
      minLng = Math.min(minLng, loc.longitude);
      maxLng = Math.max(maxLng, loc.longitude);
      minLat = Math.min(minLat, loc.latitude);
      maxLat = Math.max(maxLat, loc.latitude);
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 72, maxZoom: 14, duration: 0 },
    );
  }, [mapped]);

  useEffect(() => {
    if (mapRef.current) fitToLocations();
  }, [fitToLocations]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-600">
        Map is unavailable (Mapbox token missing).
      </div>
    );
  }

  if (mapped.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-slate-200 bg-[#f7fafa] p-8 text-center">
        <p className="text-sm font-medium text-slate-600">
          No mapped locations yet — add addresses to these locations to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-slate-200">
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          initialViewState={initialViewState}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onLoad={fitToLocations}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {mapped.map((location) => (
            <Marker
              key={location.id}
              longitude={location.longitude}
              latitude={location.latitude}
              anchor="bottom"
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                setSelectedId(location.id);
              }}
            >
              <button
                type="button"
                aria-label={location.name}
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
                    fill={BRAND_GREEN}
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle cx="13" cy="12" r="4" fill="#ffffff" />
                </svg>
              </button>
            </Marker>
          ))}

          {selected ? (
            <Popup
              longitude={selected.longitude}
              latitude={selected.latitude}
              anchor="bottom"
              offset={28}
              closeOnClick
              onClose={() => setSelectedId(null)}
              maxWidth="280px"
            >
              <div className="font-[family-name:var(--font-geist-sans)]">
                <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
                {selected.address ? (
                  <p className="mt-1 text-xs text-slate-500">{selected.address}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">No address</p>
                )}
              </div>
            </Popup>
          ) : null}
        </Map>
      </div>

      {unmappedCount > 0 ? (
        <div className="mt-3 flex shrink-0 items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <span>
            {unmappedCount} of {locations.length} locations have no address yet — add one to map them.
          </span>
        </div>
      ) : null}
    </div>
  );
}
