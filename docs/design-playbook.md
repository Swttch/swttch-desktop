# 데스크탑 UI 플레이북

> 2026-10-09. 작업 모드: Operate. 시각 기준은 사용자가 첨부한 Codex 레이아웃과 [DESIGN.md](../DESIGN.md).

## 수정할 때

1. 데스크탑 패키지의 경계를 확인한다. 상위 플러그인 소스를 수정하지 않는다.
2. 새 컴포넌트보다 기존 토큰과 공통 IconButton·목록 행을 먼저 사용한다.
   html/body는 14px, 툴팁은 공통 Tippy, 토스트는 react-hot-toast의 단일 Toaster를 사용한다.
3. 가짜 프로젝트·세션·탭을 보여주지 않는다. 로딩·빈 목록·오류를 각각 표시한다.
4. 세션 목록은 원본 백엔드의 응답을 그대로 받아 프론트에서 표시한다. 제목·식별자 필드명을 바꾸지 않는다.
5. `bash ./scripts/build.sh build`로 strict TypeScript와 Tailwind/Vite 빌드를 확인한다.

## 브라우저에서 확인할 때

- `bash ./scripts/build.sh dev`, Codex 브라우저의 localhost 사용.
- 상단·레일의 배경 일치, 중간 사이드바만 접히는지, 외부 기본 탭바가 없는지 확인.
- 버튼과 `⇧⌘S` 양쪽 토글 확인. iframe 입력에 포커스가 있어도 단축키 확인.
- 실제 프로젝트·세션 선택, 선택 행, 대화 제목, 검색 및 새 채팅 확인.
- 준비·로딩·빈 목록·오류·disabled 상태를 성공으로 오인하지 않도록 확인.
- 수정 전 화면은 `artifacts/pre-reference-layout/`에 보존한다. 결과 캡처를 남겨 사용자 검수를 요청한다.
- 검사 한 번, 발견한 문제를 한 번에 수정, 최종 확인 한 번으로 끝낸다. 추가 기능 실패는 기능 검증으로 따로 해결하고 무한 시각 폴리싱을 하지 않는다.

## 사이드바 섹션 상태

- 활성 세션·프로젝트 섹션의 펼침 상태는 SidebarStateProvider의 React Context로 공유한다.
- localStorage의 swttch-sidebar-sections-v1에 저장하고, 같은 출처의 다른 창에도 storage 이벤트로 반영한다.
- 서버 데이터는 계속 TanStack Query가 소유한다. Context에 프로젝트·세션 응답을 복제하지 않는다.
- 제목 바로 오른쪽 chevron으로 전환하며, 접힌 내용은 DOM을 유지하고 inert/aria-hidden으로 탐색에서 제외한다. 높이·불투명도 전환은 기존 sidebar-session-collapse를 사용하며 reduced-motion을 따른다.
- 즐겨찾기·활성 세션·프로젝트 섹션을 펼치는 클릭에서 해당 목록의 Query 캐시를 무효화해 한 번 백그라운드 갱신한다. 캐시된 목록과 페이지네이션 상태는 유지하고, 접는 클릭은 갱신을 요청하지 않는다.
