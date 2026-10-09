# 세션 소스 싱크

SQLite v7의 `sessions`는 숫자 PK `id`, CLI 원본 식별자 `uid`, nullable 프로젝트 FK `projectId`를 가진다. `src`는 원본 JSONL 절대 경로이며 재발견할 수 있는 위치 정보다.

`title`, CLI `/rename`/`--name`의 `customTitle`, 기존 플러그인의 `alias`를 분리해서 저장한다. 표시 우선순위는 플러그인 그대로 `alias → customTitle → title`이다. 기존 별칭 파일은 읽기만 하며 데스크탑에서 쓰거나 지우지 않는다. 따라서 기존 별칭이 있는 세션은 CLI 제목을 바꿔도 별칭이 우선 표시된다.

원본 해석은 플러그인의 JSONL 파서를 데스크탑 build 단계에서 독립 번들로 만들어 재사용한다. 원본 플러그인 파일은 수정하지 않는다. 원본 목록 필드는 `data`에 보존하고 소스 분석 결과도 함께 기록한다. 메시지 본문 전체를 DB에 복제하지 않는다.

## Promise API

`createSessionSourceSync`가 반환하는 함수:

- `syncSessionSource(uid)`: 한 세션의 파일·CLI 제목·플러그인 별칭을 읽고 Drizzle upsert 후 세션 행을 반환한다. 동일 UID의 동시 읽기는 공유한다.
- `syncSessionSources(uids)`: 중복 UID를 제거하고 `Promise.allSettled`로 병렬 싱크한다. 한 파일의 실패가 다른 세션의 성공을 취소하지 않는다.
- `syncAllSessionSources()`: 테이블의 전체 세션을 16개 단위로 병렬 싱크한다. 실패한 행의 마지막 정상 데이터를 유지한다.

원본이 읽는 중 변경되면 실패로 반환하며 마지막 정상 DB 값을 보존한다. 파일이 없어져도 행을 자동 삭제하지 않는다. `sourceSyncedAt`, `sourceMtime`, `sourceSize`로 마지막 정상 소스 스냅샷을 구별한다.

REST `POST /desktop-api/session-source-syncs`는 `{uids: [uid]}`로 단건, `{uids: [...]}`로 여러 건, `{}`로 전체 싱크한다. 응답의 results는 UID별 fulfilled/rejected 결과를 가진다. 프론트 호출도 TanStack Query mutation으로 관리한다.

세션 목록 GET은 DB만 조회한다. 프로젝트별 session-imports POST가 원본 세션을 발견해 DB에 등록하고 소스 싱크한다. `isOpen`, `activity`, `activityUpdatedAt`는 원본 백엔드의 실시간 상태 스냅샷이다. 시작 시 초기화하고 활동 이벤트로 갱신하며 파일 소스 싱크는 이 런타임 상태를 덮어쓰지 않는다.

## GUI 이름 변경

기존 플러그인 `RENAME_SESSION`은 호출하지 않는다. CLI `--resume <uid> --name <title>`을 별도 PTY에서 실행한다. 프롬프트를 보내지 않으며 도구·MCP·사용자 커스터마이징을 비활성화한다. 원본의 custom-title 기록을 확인한 후 이 작업이 소유한 CLI만 종료하고 단건 소스 싱크를 수행한다.

`--no-session-persistence`와 `CLAUDE_CODE_SKIP_PROMPT_HISTORY`는 제목 메타데이터 저장도 끄므로 이 작업에서는 사용하지 않는다. `--print`의 `/rename` 방식은 기존 대화에 명령 기록을 추가하므로 사용하지 않는다. 설치된 CLI에서 `--name` 방식은 기존 메시지 개수를 유지하고 custom-title/agent-name 등 메타데이터만 추가하는 것을 임시 원본으로 검증했다.

CLI 신뢰 확인이 필요한 프로젝트는 자동 승인하지 않고 오류를 반환한다. 모델 호출·새 세션 생성·기존 실행 중인 CLI 종료는 이 작업에 포함하지 않는다.


## 활성 세션 조회와 상태 싱크

- 사이드바는 GET /desktop-api/active-sessions를 TanStack Query로 조회한다. Drizzle에서 isOpen = true인 세션과 등록된 표시 가능 프로젝트를 조인하며, 실제 상태 변경 시각 → 마지막 메시지 시각 → UID 순으로 정렬한다. 한 페이지는 5개다.
- 시작할 때 저장된 런타임 상태를 초기화하고, 백엔드 WebSocket 연결 직후 GET_SESSION_ACTIVITY로 전체 스냅샷을 받는다. 이후 SESSION_ACTIVITY_CHANGED마다 트랜잭션으로 DB 상태를 반영한다. 변하지 않은 상태의 시각은 유지한다.
- DB 저장 후 SSE의 activityRevision을 갱신한다. 화면은 이를 받아 활성 세션 Query를 무효화하고 DB를 다시 조회한다. 이미 펼친 페이지는 유지된다.
- 열린 UID가 DB에 없으면 서버가 원본 백엔드 목록을 페이지 단위로 탐색해 해당 세션만 소스 싱크한다. 완료 시 최신 상태 스냅샷을 재적용하고 SSE로 알린다. 활성 목록 GET 자체는 원본 백엔드나 파일을 조회하지 않는다.
- 연결이 끊긴 동안에는 마지막 확인 상태를 유지한다. 1초 뒤 재연결을 시도하고, 재연결 직후 전체 스냅샷으로 보정한다. 따라서 DB 상태는 실행 상태의 캐시이며 실제 실행 여부의 기준은 CCG 백엔드다.


## 일반 세션 목록과 마이그레이션

- 사이드바 하위 세션과 프로젝트 상세 세션 목록 모두 GET /desktop-api/projects/:projectId/sessions로 SQLite를 조회한다. includeNested=true일 때 DB의 프로젝트 소속 관계에 따라 하위 프로젝트도 조회한다. GET은 원본 백엔드·소스 파일을 읽지 않는다.
- 상세 새로고침 버튼 및 ⇧⌘P/Ctrl+Shift+P는 POST /desktop-api/projects/:projectId/session-imports를 실행한다. 원본 백엔드 목록을 프로젝트마다 30개씩 가져와 UID 기준으로 upsert하고 소스 싱크한다. 중복 생성·원본 수정·없는 파일의 자동 삭제는 하지 않는다.
- 가져오기 실패는 화면에 표시한다. 이미 가져온 데이터는 유지하며 다시 실행할 수 있다.
- 런타임 이벤트는 DB에 공통 적용하고 SSE activityRevision으로 모든 세션 Query를 무효화한다. 조회 결과에 isOpen/activity를 함께 보내 두 목록의 상태 표시·필터도 DB 값을 사용한다.
- SESSIONS_UPDATED의 생성/변경/완료 이벤트는 해당 UID의 소스 싱크 후 알린다. 미등록 UID는 서버에서 발견해 등록하고, 삭제 이벤트는 해당 DB 행을 제거한다.
