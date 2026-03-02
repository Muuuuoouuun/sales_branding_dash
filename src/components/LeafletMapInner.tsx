"use client";

// ──────────────────────────────────────────────────────────────────────────────
// LeafletMapInner — loaded via dynamic import (ssr: false)
// Shows OpenStreetMap tiles centred on a Korean province.
// Users can scroll/drag to explore 시·군·구·동 level detail.
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons in Next.js / Webpack environments
import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── ViewChanger updates the map view when province changes ───────────────────
interface ViewChangerProps {
  center: [number, number];
  zoom: number;
}
function ViewChanger({ center, zoom }: ViewChangerProps) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [map, center, zoom]);
  return null;
}

// ── Main inner map component ─────────────────────────────────────────────────
interface Props {
  center: [number, number];
  zoom: number;
}

export default function LeafletMapInner({ center, zoom }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: "100%", height: "100%", background: "#1a1a2e" }}
      scrollWheelZoom
      zoomControl
    >
      {/* Dark OSM variant — looks better in the dark dashboard */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <ViewChanger center={center} zoom={zoom} />
    </MapContainer>
  );
}
