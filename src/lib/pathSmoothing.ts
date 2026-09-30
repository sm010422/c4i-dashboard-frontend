/**
 * MapView의 궤적(Polyline)을 부드럽게 그리기 위한 순수 함수.
 *
 * `history`는 실제 수신 좌표(ADS-B 20초 간격, AIS는 더 불규칙)를 그대로 이어붙인
 * 값이라, 지도를 확대할수록 항공기/선박이 실제로 그렸을 곡선이 아니라 각진 직선
 * 구간이 눈에 띈다 -- 마커 자체는 useInterpolatedTargets로 부드럽게 움직이는데
 * 뒤에 남는 궤적 선만 꺾여 보여서 "부자연스럽다"는 피드백의 주 원인이었다.
 *
 * Catmull-Rom 스플라인으로 실제 좌표 사이를 보간한 점들을 추가해서, 실측 데이터는
 * 그대로 지나가되(제어점이 곧 실좌표) 그 사이를 곡선으로 채운다 -- 새 위치를
 * 예측/추정하는 게 아니라 순전히 "이미 알고 있는 두 점 사이를 어떻게 그릴지"의
 * 렌더링 문제라, dead reckoning처럼 사실을 왜곡할 위험이 없다.
 */
export function smoothPath(points: [number, number][], segmentsPerPoint = 8): [number, number][] {
  if (points.length < 3) return points;

  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  const result: [number, number][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    for (let s = 0; s < segmentsPerPoint; s++) {
      const t = s / segmentsPerPoint;
      const t2 = t * t;
      const t3 = t2 * t;
      const lat =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const lon =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      result.push([lat, lon]);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}
