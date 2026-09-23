"use client";

import { useEffect, useRef, useState } from "react";
import type { TargetEvent } from "@/types/target";

// 백엔드(AdsbFiPollingService) 폴링 주기가 20초라 그대로 렌더링하면 마커가
// 20초마다 순간이동한다. 새 좌표가 들어올 때마다 "화면에 보이던 위치 -> 새 좌표"로
// 이 시간(ms) 동안 선형보간해서 자연스럽게 미끄러지듯 이동하는 것처럼 보이게 한다.
// 실제 항공기 궤적을 예측하는 dead reckoning이 아니라 순전히 표시용 애니메이션.
// docs/concepts/03-polling-interval-and-coordinate-interpolation.md 참고.
const ANIMATION_DURATION_MS = 4000;

interface Anim {
  from: [number, number];
  to: [number, number];
  startedAt: number;
}

function lerp(from: [number, number], to: [number, number], t: number): [number, number] {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

export function useInterpolatedTargets(targets: Record<string, TargetEvent>): Record<string, TargetEvent> {
  const animsRef = useRef<Record<string, Anim>>({});
  const targetsRef = useRef(targets);
  const [displayed, setDisplayed] = useState(targets);
  const wasAnimatingRef = useRef(false);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // targets가 바뀔 때마다(=새 WebSocket 이벤트) 각 targetId의 애니메이션을
  // "지금 화면에 보이는 위치 -> 새로 받은 좌표"로 새로 건다.
  useEffect(() => {
    const now = performance.now();
    const anims = animsRef.current;

    for (const [id, t] of Object.entries(targets)) {
      const prev = anims[id];
      if (!prev) {
        anims[id] = { from: [t.latitude, t.longitude], to: [t.latitude, t.longitude], startedAt: now };
        continue;
      }
      if (prev.to[0] === t.latitude && prev.to[1] === t.longitude) continue;

      const progress = Math.min(1, (now - prev.startedAt) / ANIMATION_DURATION_MS);
      const currentPos = lerp(prev.from, prev.to, progress);
      anims[id] = { from: currentPos, to: [t.latitude, t.longitude], startedAt: now };
    }

    // 더 이상 스트림에 없는(지역 전환/필터 변경으로 빠진) targetId 정리.
    for (const id of Object.keys(anims)) {
      if (!(id in targets)) delete anims[id];
    }
  }, [targets]);

  // 하나의 rAF 루프가 전체 마커의 보간을 동시에 처리한다(마커별 루프를 따로 안 돎).
  useEffect(() => {
    let rafId: number;

    function tick() {
      const now = performance.now();
      const anims = animsRef.current;
      const currentTargets = targetsRef.current;
      let animating = false;
      const next: Record<string, TargetEvent> = {};

      for (const [id, t] of Object.entries(currentTargets)) {
        const anim = anims[id];
        if (!anim) {
          next[id] = t;
          continue;
        }
        const progress = Math.min(1, (now - anim.startedAt) / ANIMATION_DURATION_MS);
        if (progress < 1) animating = true;
        const [latitude, longitude] = lerp(anim.from, anim.to, progress);
        next[id] = { ...t, latitude, longitude };
      }

      // 아무것도 움직이는 중이 아니면 굳이 매 프레임 setState로 리렌더를 유발하지 않는다 --
      // 막 멈춘 프레임(wasAnimating) 한 번만 최종 위치로 정확히 맞춰준다.
      if (animating || wasAnimatingRef.current) {
        setDisplayed(next);
      }
      wasAnimatingRef.current = animating;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return displayed;
}
