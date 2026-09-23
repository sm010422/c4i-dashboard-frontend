import { defineConfig } from "vitest/config";

// jsdom/@testing-library는 아직 안 넣었다 -- 지금 있는 테스트는 전부 순수 함수
// (src/lib/*)라 DOM이 필요 없다. 컴포넌트 렌더링 테스트를 추가할 때 같이 넣으면 된다.
// tsconfig paths(@/*)는 vite-tsconfig-paths 플러그인 대신 Vite 8의 네이티브
// resolve.tsconfigPaths 옵션으로 해결한다 (플러그인 쪽이 deprecated 안내가 떴다).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
  },
});
