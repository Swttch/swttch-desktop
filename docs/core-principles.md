# Swttch Desktop 핵심 원칙

## Electron과 localhost 브라우저의 동등한 실행

> 2026-10-08 사용자 확정.

**데스크탑 앱이지만 웹 브라우저에서도 localhost로 동일하게 사용할 수 있어야 한다.**

- 데스크탑 셸의 프론트는 React + TypeScript이며, Vite로 개발·빌드한다.
- Electron과 localhost 브라우저는 같은 프론트 코드와 로컬 Node.js 백엔드를 사용한다.
- 브라우저도 실제 제품 실행 환경이다. 정적인 디자인 미리보기나 Electron 기능의 목업으로 취급하지 않는다.
- 프로젝트·탭·세션·채팅 등 공통 기능은 두 실행 환경에서 실제로 동작해야 한다. Electron preload가 없다는 이유로 공통 기능을 비활성화하지 않는다.
- 로컬 비즈니스 로직과 데이터 I/O는 Node.js 백엔드에 둔다. 공통 기능이 Electron IPC에만 종속되지 않도록 설계한다.
- Electron은 창 제어·앱 생명주기·네이티브 다이얼로그 등 호스트 기능을 담당한다. 호스트별 차이는 어댑터로 한정하고, 브라우저에서도 같은 목적을 달성할 수 있는 경로를 제공한다.
- 일상적이고 일반적인 웹뷰의 구현·구동·확인은 Codex 브라우저에서 localhost로 진행해도 충분하다.
- 앱 시작 시 CCG 백엔드를 준비하며 웹뷰 원본 포트는 19836으로 고정한다. 기존 실행 중인 인스턴스는 인증 확인 후 재사용하고 앱이 소유하지 않은 백엔드를 종료하지 않는다. 모든 새 세션·기존 세션 URL에 절대 경로 workingDir를 반드시 포함한다. 브라우저 임베딩의 동일 출처 프록시는 기존 SAMEORIGIN 보안 정책을 유지한다.
- Electron 전용 호스트 동작과 통합은 별도로 Electron에서 확인한다. 일반 UI 수정마다 네이티브 앱 자동화를 요구하지 않는다.

## 구현 이력과 검증 범위

2026-10-08 원칙 추가 시점에는 React 셸이 `window.desktop`에 의존하고 브라우저 프로젝트 열기가 비활성화되어 있었다.
이후 프로젝트·최근 목록·백엔드 재시도를 공통 Node.js HTTP API로 옮기고, 같은 origin에 채팅을 프록시하는 구조로 전환했다. React 셸과 채팅 iframe은 두 호스트에서 동일하게 사용한다.
Codex 브라우저에서 프로젝트 경로 검증·열기, 실제 CLI 한 턴, 사이드바 토글, 백엔드 종료 표시 및 수동 재시도를 관찰했다. 2026-10-11 Electron의 프로젝트 선택·새/기존 세션 CLI 응답·종료 확인·마지막 세션 복원과 브라우저의 CCG 단절·수동 복구를 검증했다. 상세 근거와 남은 범위는 [실행·복구](lifecycle-recovery.md)를 참고한다.
Vite 페이지가 표시되는 것만으로 브라우저 기능 동등성을 검증했다고 기록하지 않는다.

## 셸과 임베딩 세션의 상태 경계

- 셸 URL에 개별 세션 ID·workingDir를 붙이지 않는다. 각 작업 뷰(탭)의 iframe이 자신의 세션 URL을 관리한다.
- 세션을 열 때 프로젝트 PK를 API에 전달하고 백엔드가 DB의 path를 조회한다. workingDir는 생성된 iframe URL에 반드시 포함한다.
- 기술적인 리소스 명칭은 sessions로 통일한다. 사용자 표시 문구에만 채팅을 사용한다.
- MVP는 단일 작업 뷰이며 다중 탭·패널을 추가해도 이 상태 경계를 유지한다.

## 세션 임베딩 연결 방식

- CCG 원본 서버는 localhost:19836이고 iframe은 셸과 동일한 origin의 /sessions/... URL을 사용한다.
- 개발에서는 Vite(3000) → 데스크탑 API 프록시(3030) → CCG(19836), 앱에서는 데스크탑 호스트 → CCG로 전달한다. HTTP·WebSocket과 workingDir·pair 파라미터를 보존한다.
- 원본 백엔드의 SAMEORIGIN 정책과 웹뷰 코드는 변경하지 않는다. 셸은 동일 출처 iframe의 제목·세션 경로를 읽어 작업 뷰의 표시 상태를 동기화한다.

## Test-driven development

User-approved on 2026-10-12. New functionality and behavior fixes follow Red → Green → Refactor. Before implementation, add the smallest meaningful test for the required behavior and confirm its intended failure. Implement until it passes, then refactor while retaining passing coverage. Bug reports receive regression coverage.

For visual-only changes, define acceptance criteria and observe the existing failing UI before editing, then verify the real result in the target UI. Avoid tests that merely repeat CSS or implementation details. Reports distinguish tests written first from tests added after implementation; earlier work is not retroactively described as TDD.
