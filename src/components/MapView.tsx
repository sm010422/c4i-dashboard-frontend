"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { TargetEvent } from "@/types/target";

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "#ff3333",
  HIGH: "#ff9900",
  MEDIUM: "#ffff00",
  LOW: "#00ff41",
};

function targetIcon(threatLevel?: string) {
  const color = threatLevel ? THREAT_COLORS[threatLevel] ?? "#00ff41" : "#00ff41";
  return L.divIcon({
    html: `<div style="filter: drop-shadow(0 0 3px ${color});">✈️</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

interface MapViewProps {
  targets: Record<string, TargetEvent>;
  history: Record<string, [number, number][]>;
  threatLevels: Record<string, string>;
  onSelectTarget: (targetId: string) => void;
}

export default function MapView({ targets, history, threatLevels, onSelectTarget }: MapViewProps) {
  return (
    <MapContainer center={[36.5, 127.5]} zoom={7} className="h-full w-full map-tint">
      <TileLayer
        attribution="OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.values(targets).map((t) => (
        <Marker
          key={t.targetId}
          position={[t.latitude, t.longitude]}
          icon={targetIcon(threatLevels[t.targetId])}
          eventHandlers={{ click: () => onSelectTarget(t.targetId) }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]}>
            {t.targetId}
            <br />
            고도: {t.altitude.toFixed(0)}m / 속도: {t.speed.toFixed(0)}km/h
          </Tooltip>
        </Marker>
      ))}
      {Object.entries(history).map(([targetId, coords]) => (
        <Polyline key={targetId} positions={coords} color="#00ff41" weight={1.5} opacity={0.6} />
      ))}
    </MapContainer>
  );
}
