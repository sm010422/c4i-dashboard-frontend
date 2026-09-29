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

function dotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};filter:drop-shadow(0 0 3px ${color});"></div>`,
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

/**
 * heading이 있으면(ADS-B의 track, AIS의 TrueHeading/Cog) 실제 진행방향으로 회전한
 * 모양 마커, 없으면(가짜 시뮬레이터, 또는 정지 중이라 방향 데이터가 없는 경우)
 * 방향을 안다고 거짓으로 암시하지 않도록 그냥 점으로 표시한다 -- SHIP도 동일한 원칙.
 *
 * SHIP(AIS)은 항공기(삼각형)와 지도에서 한눈에 구분되도록, 뱃머리가 뾰족하고 선체가
 * 긴 top-down 선박 실루엣(SVG)으로 그린다 -- 새 데이터 소스(2번째 실시간 피드)가
 * 섞여 있다는 걸 시각적으로도 드러내는 편이 다중 소스 융합이라는 의도에 맞다고 판단.
 */
function targetIcon(threatLevel: string | undefined, heading: number | null, targetType?: string) {
  const color = threatLevel ? THREAT_COLORS[threatLevel] ?? "#00ff41" : "#00ff41";

  if (targetType === "SHIP") {
    if (heading === null) return dotIcon(color);

    // 뱃머리(뾰족)-> 선체(평행)-> 선미(평평)로 이어지는 top-down 선박 실루엣.
    // 삼각형(항공기)의 rotate() 규칙과 동일: 0도=북을 향한 기본 방향, 시계방향 회전.
    return L.divIcon({
      html: `<svg width="14" height="20" viewBox="0 0 12 18" style="transform:rotate(${heading}deg);transform-origin:6px 9px;filter:drop-shadow(0 0 3px ${color});">
        <polygon points="6,0 10,6 10,16 2,16 2,6" fill="${color}" />
      </svg>`,
      className: "",
      iconSize: [14, 20],
      iconAnchor: [7, 9],
    });
  }

  if (heading === null) return dotIcon(color);

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
          icon={targetIcon(threatLevels[t.targetId], t.heading, t.targetType)}
          eventHandlers={{ click: () => onSelectTarget(t.targetId) }}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {t.targetId}
            <br />
            {t.targetType === "SHIP"
              ? `속도: ${t.speed.toFixed(0)}km/h`
              : `고도: ${t.altitude.toFixed(0)}m / 속도: ${t.speed.toFixed(0)}km/h`}
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
