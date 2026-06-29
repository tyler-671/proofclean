"use client";

import { SearchBox } from "@mapbox/search-js-react";
import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type AddressSelection = {
  address: string;
  latitude: number;
  longitude: number;
};

type LocationAddressFieldProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelectionChange: (selection: AddressSelection | null) => void;
  placeholder?: string;
};

const searchBoxTheme = {
  variables: {
    colorPrimary: "#10b981",
    colorBackground: "#ffffff",
    colorBackgroundHover: "#f7fafa",
    colorBackgroundActive: "#ecfdf5",
    borderRadius: "8px",
    fontFamily: "var(--font-geist-sans), 'Lexend Deca', sans-serif",
    boxShadow: "0 0 0 1px rgb(226 232 240)",
  },
};

function parseRetrieveResponse(res: SearchBoxRetrieveResponse): AddressSelection | null {
  const feature = res.features[0];
  if (!feature) return null;

  const coordinates = feature.geometry?.coordinates;
  const props = feature.properties;

  const address =
    props.full_address?.trim() ||
    props.place_formatted?.trim() ||
    props.name?.trim() ||
    "";

  if (!address) return null;

  if (coordinates && coordinates.length >= 2) {
    return {
      address,
      latitude: coordinates[1],
      longitude: coordinates[0],
    };
  }

  if (props.coordinates) {
    return {
      address,
      latitude: props.coordinates.latitude,
      longitude: props.coordinates.longitude,
    };
  }

  return null;
}

export default function LocationAddressField({
  id,
  value,
  onValueChange,
  onSelectionChange,
  placeholder = "Search address...",
}: LocationAddressFieldProps) {
  if (!mapboxToken) {
    return (
      <p className="text-xs text-slate-500">
        Address search is unavailable (Mapbox token missing).
      </p>
    );
  }

  return (
    <div id={id} className="location-address-field w-full [&_.SearchBox]:w-full">
      <SearchBox
        accessToken={mapboxToken}
        value={value}
        onChange={onValueChange}
        onRetrieve={(res) => {
          const selection = parseRetrieveResponse(res);
          if (selection) {
            onValueChange(selection.address);
            onSelectionChange(selection);
          }
        }}
        onClear={() => {
          onValueChange("");
          onSelectionChange(null);
        }}
        placeholder={placeholder}
        options={{ country: "ca", proximity: "ip", language: "en" }}
        theme={searchBoxTheme}
      />
    </div>
  );
}
