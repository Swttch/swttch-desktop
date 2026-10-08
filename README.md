# Swttch Desktop

스위치의 독립 데스크탑 개발환경 프로젝트.
설치되는 앱 이름은 **Swttch**, 저장소와 내부 문서에서는 **Swttch Desktop**으로 구분한다.

- [MVP 기획과 다음 세션 인계](docs/mvp-planning.md)
- [MVP PRD와 수용 기준](docs/mvp-prd.md)
- [MVP 기술스펙 초안](docs/mvp-technical-spec.md)
- [핵심 원칙: Electron·localhost 브라우저 동등 실행](docs/core-principles.md)
- [디자인 시스템](DESIGN.md) · [UI 플레이북](docs/design-playbook.md)

현재는 **실행 가능한 개발 프리뷰**다. React 셸이 상단바·왼쪽 레일·중간 프로젝트/세션 사이드바·작업 영역을 구성하고, 기존 React 채팅 앱을 iframe에 담는다. 외부 탭바는 기본으로 표시하지 않는다.
Google·GitHub·이메일 로그인, 기존 계정 연동, 중앙 API, 설치 패키지는 아직 구현하지 않았다. 이 프리뷰는 필수 앱 로그인까지 포함한 전체 MVP 완료가 아니다.
**localhost 브라우저도 실제 실행 환경이다.** 셸 공통 기능은 Node.js HTTP API를 사용하며, 일반 프론트 구현·검증은 Codex 브라우저에서 진행한다. 전환 후 브라우저의 프로젝트 열기와 실제 CLI 응답은 확인했고, Electron 전용 호스트 통합은 별도 검증 대상이다.

## 실행

이 디렉토리를 작업 디렉토리로 사용한다. 개발 실행에는 Node.js 24 이상과 상위 플러그인 소스가 필요하다.

```bash
bash ./scripts/build.sh install
bash ./scripts/build.sh runtime-build
bash ./scripts/build.sh build
bash ./scripts/build.sh test
bash ./scripts/build.sh dev
```

`dev`는 Electron을 실행하지 않고 프론트 Vite를 `localhost:3000`, 공통 Node.js API를 `localhost:3030`에서 실행한다. 두 포트는 고정이며 이미 사용 중이면 다른 포트로 이동하지 않고 실행을 실패한다. API·채팅·WebSocket은 Vite 프록시를 통해 같은 origin으로 연결한다. **Codex 브라우저에서 [localhost](http://localhost:3000/)를 연다.**
**프로젝트 폴더 열기**에서 로컬 절대 경로 또는 `~/Projects/...`를 입력한다. 최근 프로젝트도 같은 API로 열린다. 기존 Claude Code CLI 설치 및 인증 상태를 사용한다.
React Fast Refresh로 프론트 수정이 반영된다. Node.js 서비스·Electron 메인·preload 수정은 실행 주체 재시작이 필요하다.
프론트 소스는 TypeScript(`.tsx`·`.ts`)이며 빌드 시 strict 타입체크를 실행한다.
`bash ./scripts/build.sh serve`는 빌드한 프론트와 같은 로컬 API를 localhost에서 제공한다.
`bash ./scripts/build.sh dev-electron`은 Vite 개발 서버에 Electron 호스트를 연결한다. `start`는 Electron이 별도 Node.js 로컬 호스트를 실행하고 같은 웹앱을 여는 경로다. 네이티브 통합 검증에만 사용한다.
최근 프로젝트를 선택하면 같은 폴더에서 새 채팅 화면을 연다. 마지막 세션 자동 복원·작업 자동 재개는 없다.

`runtime-build`는 상위 저장소의 공식 빌드 스크립트를 호출한다. 이미 빌드 산출물이 있으면 생략할 수 있다.
standalone tgz를 풀어 사용하려면 `SWTTCH_RUNTIME_DIR`을 backend.mjs와 webview 디렉토리가 들어 있는 폴더로 지정한다.

## 첫 버전의 동작과 데이터

- 같은 React 셸이 기존 채팅 웹앱을 iframe에 담는다. 로컬 HTTP·WebSocket 프록시로 같은 origin을 유지하므로 기존 프레임 정책과 연결 인증을 그대로 사용한다.
- 데스크탑 셸 프론트는 React + TypeScript + Tailwind v4 + Vite이며 `renderer/src/`에 있다. Electron 프로세스 및 preload는 `src/`에 있다.
- html/body의 기본 크기는 14px이며 rem 기반 크기도 함께 적용한다. 공통 툴팁은 Tippy, 토스트는 react-hot-toast를 사용한다.
- 2026-10-09 사용자 레퍼런스를 따라 상단바와 왼쪽 레일의 배경을 통일했다. 프로젝트·세션 목록이 있는 중간 사이드바만 제목줄 버튼 또는 `⇧⌘S`로 토글한다. 채팅 포커스에서도 동작한다.
- 상단에는 현재 프로젝트·대화 제목과 새 채팅·프로젝트 열기를 둔다. 개발 프리뷰 문구는 상단 2px 형광 라인으로 대체했다.
- 세션 목록은 기존 백엔드 `GET_SESSIONS`의 최근 30개 응답을 원본 필드 그대로 전달받는다. 세션 선택·새 채팅·목록 검색을 제공한다.
- iframe은 React 레이아웃에 따라 창 크기 및 사이드바 토글에 맞춰 배치된다. Electron bounds IPC는 사용하지 않는다.
- 공통 Node.js 서비스가 프로젝트 경로 검증·SQLite 최근 목록·백엔드 재시도를 처리한다. Electron preload는 네이티브 폴더 선택만 제공하며, 선택한 경로는 같은 공통 API로 전달한다.
- 전용 임시 포트와 loopback으로 실행한다. 기존 로컬 WebSocket 인증을 사용한다.
- 브라우저 탭을 닫아도 로컬 서버는 실행 주체가 관리한다. 개발 서버 종료 시 그 서버가 실행한 채팅 백엔드를 정리한다. 설치형 Electron의 앱 종료 시에는 앱이 실행한 Node.js 호스트가 백엔드를 정리한다.
- 앱 데이터는 `~/.swttch`: `desktop.sqlite`, `browser/`, `desktop-backend.log`, `runtime-secret`, 기존 백엔드의 엔티티 데이터. 런타임 비밀은 로컬 서비스가 소유하고 제어 토큰을 파생한다. Node 서비스 재실행에도 인증 식별자를 유지한다.
- 기존 백엔드의 전역 설정·설치 프로필 일부는 `~/.claude-code-gui`를 사용한다. CLI 원본 대화는 기존 `~/.claude` 경로에 유지한다. 전체 저장 경로 분리는 후속 작업이다.
- 개발용 데이터 루트를 바꾸려면 `SWTTCH_DESKTOP_HOME`을 지정한다. CLI 원본 및 기존 전역 설정 경로까지 바꾸지는 않는다.

## 확인한 결과

2026-10-08 macOS에서 Electron 실행, 채팅 인증·작업 폴더 전달, 실제 CLI 응답 `SWTTCH_DESKTOP_OK`, 응답 후 입력 대기를 확인했다.
공통 API 전환 후 Codex 브라우저에서 프로젝트 경로 오류·열기, 실제 CLI 응답 `SWTTCH_BROWSER_OK`, 입력 대기, 사이드바 접기·펼치기와 HMR 이후 열린 대화 유지를 확인했다. 브라우저 콘솔 오류는 관찰되지 않았다.
후속 서비스 전체 재시작 검증에서는 이전 인증 캐시가 연결을 막는 문제를 발견했다. 데스크탑 패키지 안에서 런타임 비밀 영속화와 연결 식별자별 캐시 갱신을 추가한 뒤 같은 localhost에서 채팅 재연결을 확인했다. 기존 플러그인 소스는 수정하지 않았다.
개발 백엔드만 종료했을 때 연결 종료 안내가 나타났고, 브라우저의 재시도 버튼으로 백엔드가 준비 상태로 돌아온 뒤 같은 프로젝트의 새 채팅 화면을 열 수 있었다. 기존 세션 자동 복원·작업 자동 재개는 검증하거나 구현하지 않았다.
SQLite·프로세스 생명주기·공통 API·브라우저별 프로젝트 상태·origin/CSRF·WebSocket 인증 전달·런타임 인증 유지·세션 응답 원본 전달 테스트 8개가 통과했다.
Windows·Linux 실행 및 설치 패키지는 미검증이다.

최근 브라우저 검증 캡처는 `artifacts/browser-layout.jpg`에 저장된다. 이전 Electron 검증 캡처 `artifacts/first-version.png`는 초기 구현의 기록이며 현재 호스트 통합 검증으로 취급하지 않는다.
레이아웃 수정 전 소스는 `artifacts/layout-v1/`에 보존했다. 이 백업은 현재 실행 경로에서 사용하지 않는다.
공통 API 전환 직전 소스는 `artifacts/react-native-host/`에 보존했다.

이 디렉토리는 상위 저장소의 `packages/` 제외 규칙을 유지하고 자체 로컬 Git 저장소로 관리한다. 첫 체크포인트는 `7793261`이며, 원격 저장소는 아직 연결하지 않았다.

## 프로젝트 DB와 가져오기

프로젝트 목록은 `~/.swttch/desktop.sqlite`의 `projects` 테이블 전체를 사용하며 최근 열기 5개와 별도로 관리한다. 프로젝트 페이지의 **기존 프로젝트 가져오기**는 `~/.claude-code-gui/entities/project/projects.entity.jsonl`만 읽는다. 별칭·설명·즐겨찾기·숨김 상태와 추가 원본 필드는 JSON 데이터로 보존한다. 원본 파일은 변경하지 않는다. 기존 DB 프로젝트는 유지하며 메타데이터가 없는 행만 보완한다. 반복 가져오기는 중복이나 덮어쓰기를 만들지 않는다. 잘못된 JSONL은 부분 반영 없이 오류를 표시한다. 숨긴 프로젝트는 DB에 보존하고 UI에서 제외한다.

저장 계층은 **Drizzle ORM + better-sqlite3**를 사용한다. `src/database/schema.cjs`가 프로젝트 테이블 스키마, `project.repository.cjs`가 조회·등록·트랜잭션 가져오기를 담당한다. DB 버전 업그레이드는 `connection.cjs`에서 수행한다. 주요 엔티티 필드는 실제 컬럼으로 저장하고 원본의 추가 필드도 JSON 컬럼에 보존한다.

프로젝트의 `id`는 자신의 PK, `projectId`는 부모 프로젝트의 PK를 저장하는 nullable self FK(`project_id → projects.id`)다. `null`이면 상위 프로젝트가 없다. Drizzle의 `parent`/`children` association을 제공하며 실제 부모 행 삭제 시 `ON DELETE SET NULL`을 적용한다. 없는 부모와 자기 자신·순환 관계는 거부한다. SQLite v5 업그레이드 및 최초 JSONL 가져오기에서는 기존 `projectId`를 유지하고, null인 항목은 경로상 가장 가까운 상위 프로젝트에 자동 연결한다. 이후 재가져오기·재시작은 사용자가 변경한 관계를 덮어쓰지 않는다. 원본 JSONL은 수정하지 않는다.

하위 프로젝트 목록과 세션 병합 범위는 폴더 경로를 재추론하지 않고 DB의 부모 관계를 재귀적으로 따른다. 경로 밖의 프로젝트도 명시적으로 연결할 수 있으며, `PATCH /desktop-api/projects/:projectId`의 `projectId`에 부모 ID 또는 null을 전달해 관계를 변경한다.

사이드바의 폴더 아이콘은 세션 펼침·접힘만 수행한다. 이름 클릭은 상세 이동과 펼침을 함께 수행한다. `sessionsExpanded`는 SQLite v6의 `sessions_expanded` boolean 컬럼에 저장하며 같은 프로젝트 PATCH 리소스로 변경한다. 앱 재시작 후에도 프로젝트별 상태가 복원된다.

## API와 프론트 통신 컨벤션

프론트 HTTP 요청의 서버 상태는 TanStack Query가 관리한다. 조회는 useQuery, 변경은 useMutation이며 SSE는 Query 캐시에 수신 상태를 반영한다. 임베딩한 기존 채팅 앱의 WebSocket은 재사용한다.

| 메서드 | 리소스 | 기능 |
|---|---|---|
| POST | /desktop-api/sessions | 로컬 브라우저 연결 생성 |
| GET / PUT | /desktop-api/workspace | 현재 작업 공간 조회·프로젝트/세션 전환 |
| GET | /desktop-api/projects | ORM 프로젝트 목록 |
| PATCH / DELETE | /desktop-api/projects/:projectId | 별칭·설명·고정 수정 / 세션 기록 삭제 |
| GET / PATCH | /desktop-api/projects/:projectId/session-scope | 하위 프로젝트 목록 및 프로젝트별 병합 설정 |
| GET | /desktop-api/projects/:projectId/sessions | 원본 세션 목록 조회 (offset, limit) |
| PATCH / DELETE | /desktop-api/projects/:projectId/sessions/:sessionId | 세션 이름 변경 / 삭제 |
| POST | /desktop-api/projects/:projectId/sessions/:sessionId/read-receipts | 세션 읽음 표시 |
| POST | /desktop-api/project-imports | 기존 엔티티 JSONL 가져오기 |
| POST | /desktop-api/backend-restarts | 채팅 백엔드 재시작 |

프로젝트 페이지는 플러그인 ProjectSelectorPage의 배지·별칭·설명·세션 수, 홈 축약 경로, 긴 경로 스크롤, 검색, 고정 우선 정렬, 최근 사용순/생성순과 localStorage 기억, 키보드 상하 이동/Enter 열기, 수정·복사·삭제 메뉴를 반영한다. 삭제는 중앙 확인창 뒤에 기존 Node 백엔드 DELETE_PROJECT 기능을 호출하며 실제 프로젝트 폴더는 유지한다. 초기 세션 수·타임스탬프는 가져온 엔티티 기준이다.

Electron도 ORM 드라이버의 Node ABI가 동일하도록 시스템 Node.js 24 이상으로 로컬 호스트를 실행한다. 별도 런타임 경로는 SWTTCH_NODE_EXECUTABLE로 지정한다. 현재 전환의 일반 기능은 localhost에서 검증했으며 Electron 창/네이티브 호스트 통합은 별도 검증 대상이다.

프로젝트 추가는 사이드바와 프로젝트 페이지에서 같은 `AddProjectModal`을 사용한다. 클릭하면 로컬 서비스가 Electron 폴더 선택 헬퍼를 실행해 실제 디렉터리를 선택한다. 폴더 업로드는 하지 않는다. Electron에서는 폴더 드롭의 실제 경로를 바로 읽고, 일반 브라우저에서는 드롭 폴더의 절대 경로가 제공되지 않으므로 선택창에서 같은 폴더를 확인한다. 등록은 `POST /desktop-api/projects`, 선택창은 `POST /desktop-api/folder-selections`, 상세 조회는 `GET /desktop-api/projects/:projectId`다. 추가 후 공유 PATH 상수와 replacePathParams로 `/projects/:projectId` 상세 라우트로 이동한다. 상세에서 실제 세션 조회·새 채팅·기존 세션 열기를 제공한다.

프로젝트 추가와 수정은 공통 `ProjectDialog` 입력폼을 사용합니다. 폴더 선택 후 표시 이름(별칭)과 설명을 입력하고 최종 추가를 누르면 하나의 POST 요청·ORM 트랜잭션으로 저장한 뒤 상세페이지로 이동합니다. 폴더 선택과 폼 입력은 아직 등록을 수행하지 않으며, 취소하면 프로젝트는 생성되지 않습니다. 선택된 폴더는 큰 드롭존 대신 폴더명·경로·변경 컨트롤로 표시됩니다.

프로젝트 상세 라우트와 REST 프로젝트 리소스는 /projects/:projectId 형식의 정수 ID를 사용합니다. SQLite v4 업그레이드는 원본 JSONL의 정수 ID를 기본키로 보존하며, ID가 없는 기존 항목에만 새 ID를 부여합니다. 폴더 경로는 데이터 필드와 기존 채팅 백엔드 작업 디렉터리로만 사용합니다.

프로젝트 상세의 세션 목록은 플러그인 세션 패널의 검색·날짜 그룹·페이징·활동/탭 필터·수정·삭제·키보드 동작을 적용한다. 전체 스펙과 환경별 적용은 [세션 목록](docs/session-list.md)을 참고한다.
