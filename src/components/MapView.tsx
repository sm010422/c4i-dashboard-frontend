"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Region, TargetEvent } from "@/types/target";

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "#ff3333",
  HIGH: "#ff9900",
  MEDIUM: "#ffff00",
  LOW: "#00ff41",
};

/**
 * heading이 있으면(ADS-B의 track) 실제 진행방향으로 회전한 삼각형 마커,
 * 없으면(가짜 시뮬레이터, 또는 지상 정지 중이라 방향 데이터가 없는 경우)
 * 방향을 안다고 거짓으로 암시하지 않도록 그냥 점으로 표시한다.
 */
function targetIcon(threatLevel: string | undefined, heading: number | null) {
  const color = threatLevel ? THREAT_COLORS[threatLevel] ?? "#00ff41" : "#00ff41";

  if (heading === null) {
    return L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};filter:drop-shadow(0 0 3px ${color});"></div>`,
      className: "",
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
  }

  // CSS 삼각형은 위쪽을 기본 방향(0도=북)으로 그린 뒤, heading만큼 시계방향 회전한다 --
  // CSS의 rotate() 양수 방향과 항공 방위각(북 기준 시계방향) 방향이 그대로 일치한다.
  return L.divIcon({
    html: `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid ${color};transform:rotate(${heading}deg);transform-origin:center 10px;filter:drop-shadow(0 0 2px ${color});"></div>`,
    className: "",
    iconSize: [12, 14],
    iconAnchor: [6, 10],
  });
}

function MapRecenter({ region }: { region: Region }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(region.center, region.zoom, { duration: 0.8 });
  }, [region, map]);
  return null;
}

interface MapViewProps {
  targets: Record<string, TargetEvent>;
  history: Record<string, [number, number][]>;
  threatLevels: Record<string, string>;
  onSelectTarget: (targetId: string) => void;
  region: Region;
}

export default function MapView({ targets, history, threatLevels, onSelectTarget, region }: MapViewProps) {
  return (
    <MapContainer center={region.center} zoom={region.zoom} className="h-full w-full map-tint">
      <MapRecenter region={region} />
      <TileLayer
        attribution="OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.values(targets).map((t) => (
        <Marker
          key={t.targetId}
          position={[t.latitude, t.longitude]}
          icon={targetIcon(threatLevels[t.targetId], t.heading)}
          eventHandlers={{ click: () => onSelectTarget(t.targetId) }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]}>
            {t.targetId}
            <br />
            고도: {t.altitude.toFixed(0)}m / 속도: {t.speed.toFixed(0)}km/h
            {t.heading !== null && ` / 방위 ${t.heading.toFixed(0)}°`}
          </Tooltip>
        </Marker>
      ))}
      {Object.entries(history).map(([targetId, coords]) => (
        <Polyline key={targetId} positions={coords} color="#00ff41" weight={1.5} opacity={0.6} />
      ))}
    </MapContainer>
  );
}
