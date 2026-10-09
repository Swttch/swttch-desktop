# Swttch Desktop 에이전트 지침

작업 전에 [핵심 원칙](docs/core-principles.md)을 읽고 따른다.
프론트 작업에서는 [디자인 시스템](DESIGN.md)과 [UI 플레이북](docs/design-playbook.md)을 함께 읽는다. Tailwind 유틸리티 및 공통 토큰을 사용한다.
- html/body 기본 크기는 14px. 공통 툴팁은 Tippy, 공통 토스트는 react-hot-toast를 사용한다.

- Electron과 localhost 브라우저에서 같은 React + TypeScript 프론트 및 로컬 Node.js 백엔드를 사용한다.
- 브라우저에서도 공통 기능이 실제로 동작해야 한다. Electron 전용 preload 의존이나 브라우저 목업을 공통 기능의 구현 완료로 간주하지 않는다.
- 일반적인 프론트 구현·구동·검증은 Codex 브라우저의 localhost에서 진행한다. Electron 전용 통합만 네이티브 앱에서 따로 검증한다.
- 빌드·테스트·개발 실행은 이 디렉토리의 `bash ./scripts/build.sh <command>`를 사용한다.
- 기존 채팅 앱과 백엔드는 재사용한다. 셸에 CLI·세션 비즈니스 로직을 중복 구현하지 않는다.
- MVP의 단일 패널·단일 탭 범위를 유지한다.
- 기본 외부 탭바는 표시하지 않는다. 왼쪽 레일은 유지하고 `⇧⌘S`로 중간 프로젝트·세션 사이드바만 토글한다.
- 페이지 이동은 React Router 기반 `useRouter()`의 `router.push(PATH.*)`로 구현한다. 경로 리터럴은 `src/paths.mjs`에서 정의하고 프론트는 `renderer/src/routes.ts`에서 import한다. 경로 파라미터는 공통 `replacePathParams`로 치환한다.

- 실제 SQLite 데이터 접근은 Drizzle ORM 스키마와 repository를 사용한다. 원시 SQL은 버전 업그레이드 DDL로 한정한다. 프로젝트 가져오기는 `~/.claude-code-gui/entities/project/projects.entity.jsonl`만 대상으로 하며 원본을 변경하지 않는다.

- 데스크탑 프론트의 HTTP 조회·변경은 반드시 TanStack Query (`useQuery`/`useMutation`)로 관리한다. 서버 상태를 별도 React state로 복제하지 않는다. SSE는 이벤트 수신 후 Query 캐시를 갱신한다. 기존 임베딩 채팅의 WebSocket 구현은 재사용한다.
- 백엔드는 RESTful API를 원칙으로 한다. 리소스 중심 경로, 조회 GET, 생성 POST, 전체 변경 PUT, 부분 변경 PATCH, 삭제 DELETE를 사용한다. 경로 상수는 공유 `src/api-paths.mjs`에서 관리한다.

- 셸 URL은 앱·프로젝트 탐색 전용이다. 개별 세션 URL은 각 작업 뷰의 iframe에서 관리하며 sessions 복수형 명칭을 사용한다. 세션 열기 API는 프로젝트 ID를 받아 DB path를 조회하고, iframe URL에 workingDir를 반드시 포함한다.
