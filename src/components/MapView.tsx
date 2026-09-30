"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Region, TargetEvent } from "@/types/target";
import { smoothPath } from "@/lib/pathSmoothing";

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "#ff3333",
  HIGH: "#ff9900",
  MEDIUM: "#ffff00",
  LOW: "#00ff41",
};

// SHIP 전용 고정 테두리색. 등급별 fill(THREAT_COLORS)은 항공기와 동일하게 유지해서
// 위협도 의미는 그대로 두고, 이 테두리 하나로 "항공기냐 선박이냐"를 등급과 무관하게
// 항상 구분되게 한다 -- 같은 LOW/CRITICAL이면 모양(삼각형 vs 선체) 말고는 색이 완전히
// 겹쳐서 구분이 안 된다는 피드백을 받고 추가했다.
const SHIP_STROKE = "#00d9ff";

// 마커 아이콘 캐시. useInterpolatedTargets가 매 애니메이션 프레임(rAF, ~60fps)마다
// targets 객체를 새로 만들어서 MapView가 그만큼 자주 리렌더되는데, 그때마다
// targetIcon()이 매번 새 L.divIcon을 생성하면(위경도만 바뀌고 heading/등급은
// 그대로인데도) react-leaflet의 <Marker>가 매 프레임 marker.setIcon()을 불필요하게
// 호출하게 된다 -- 줌 중엔 Leaflet의 CSS 트랜스폼과 겹쳐서 이게 버벅임("부자연스러움")
// 으로 눈에 띈다. 아이콘은 (종류, 위협등급, 방위각) 조합에만 의존하고 대상 개체나
// 위치와는 무관하므로, 이 조합을 키로 캐싱해서 재사용한다. heading은 정수도로
// 반올림해서 키 공간을 361개로 제한한다(사람 눈에 1도 차이는 어차피 안 보인다).
const iconCache = new Map<string, L.DivIcon>();

function cachedIcon(key: string, build: () => L.DivIcon): L.DivIcon {
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = build();
  iconCache.set(key, icon);
  return icon;
}

function dotIcon(color: string, stroke?: string) {
  return cachedIcon(`dot|${color}|${stroke ?? ""}`, () => {
    const border = stroke ? `border:2px solid ${stroke};` : "";
    const glowColor = stroke ?? color;
    return L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};${border}filter:drop-shadow(0 0 5px ${glowColor});box-sizing:border-box;"></div>`,
      className: "",
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
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
    if (heading === null) return dotIcon(color, SHIP_STROKE);
    const deg = Math.round(heading);

    // 뱃머리(뾰족)-> 선체(가늘고 긴 평행)-> 선미(평평)로 이어지는 top-down 선박 실루엣.
    // 처음엔 8x16 비율로 그렸는데 너무 뭉툭해서(정사각형에 가까움) "배처럼" 안 보였다 --
    // 6x20으로 더 가늘고 길게 조정해서 실제 선박 실루엣에 가깝게 만들었다.
    // 삼각형(항공기)의 rotate() 규칙과 동일: 0도=북을 향한 기본 방향, 시계방향 회전.
    // 처음엔 얇은 테두리(1.2px)만 둘렀는데 항공기랑 색 차이가 잘 안 느껴진다는
    // 피드백을 받았다 -- 글로우 자체를 위협색이 아니라 테두리색(파란)으로 바꾸고
    // 테두리도 굵게(2.5px) 키워서, 가까이서 봐야 보이는 얇은 선이 아니라 한눈에
    // 들어오는 파란 후광으로 만들었다. fill은 여전히 등급색이라 위협도 의미는 유지.
    return cachedIcon(
      `ship|${color}|${deg}`,
      () =>
        L.divIcon({
          html: `<svg width="13" height="24" viewBox="0 0 12 22" style="transform:rotate(${deg}deg);transform-origin:6px 11px;filter:drop-shadow(0 0 5px ${SHIP_STROKE});">
        <polygon points="6,0 9,6 9,20 3,20 3,6" fill="${color}" stroke="${SHIP_STROKE}" stroke-width="2.5" />
      </svg>`,
          className: "",
          iconSize: [13, 24],
          iconAnchor: [6, 11],
        })
    );
  }

  if (heading === null) return dotIcon(color);
  const deg = Math.round(heading);

  // CSS 삼각형은 위쪽을 기본 방향(0도=북)으로 그린 뒤, heading만큼 시계방향 회전한다 --
  // CSS의 rotate() 양수 방향과 항공 방위각(북 기준 시계방향) 방향이 그대로 일치한다.
  return cachedIcon(
    `aircraft|${color}|${deg}`,
    () =>
      L.divIcon({
        html: `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid ${color};transform:rotate(${deg}deg);transform-origin:center 10px;filter:drop-shadow(0 0 2px ${color});"></div>`,
        className: "",
        iconSize: [12, 14],
        iconAnchor: [6, 10],
      })
  );
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
  // history는 실제 수신 좌표(20초 간격 등)를 그대로 이은 각진 폴리라인이라, 확대할수록
  // 마커의 부드러운 이동과 대조되어 궤적만 꺾여 보인다. 렌더링용으로만 스플라인
  // 보간을 추가한다 -- history 자체(실좌표)는 그대로 두고 화면에 그릴 점만 늘린다.
  // history 참조는 실제 WebSocket 이벤트가 올 때만 바뀌므로(매 애니메이션 프레임마다
  // 재계산되지 않음), useMemo로 감싸 프레임마다 재계산되는 걸 막는다.
  const smoothedHistory = useMemo(() => {
    const out: Record<string, [number, number][]> = {};
    for (const [id, coords] of Object.entries(history)) out[id] = smoothPath(coords);
    return out;
  }, [history]);

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
      {Object.entries(smoothedHistory).map(([targetId, coords]) => (
        <Polyline key={targetId} positions={coords} color="#00ff41" weight={1.5} opacity={0.6} />
      ))}
    </MapContainer>
  );
}
