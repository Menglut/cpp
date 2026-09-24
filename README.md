# CppStudy 프론트엔드 프로토타입

`gptMaking.md`의 **개념 학습 → 문제 풀이 → 실행·제출 → 기록 확인** 흐름을 체험하는 한국어 프론트엔드입니다. Next.js App Router, React, TypeScript, Tailwind CSS, Monaco Editor를 사용합니다.

## 저장 위치 안내

요청한 `D:\project\cpp`는 읽을 수 있었지만 이 작업 세션에서 쓰기 권한이 부여되지 않았습니다. 따라서 프로젝트를 별도 출력 폴더에서 완성했습니다. 기존 `D:\project\cpp\gptMaking.md`는 변경하지 않았으며, 읽은 원본을 `docs/gptMaking.md`에 복사했습니다.

제공된 `cpp-study.zip`을 `D:\project\cpp`에 풀면 `D:\project\cpp\cpp-study\frontend`에서 실행할 수 있습니다. `cpp-study`가 이미 존재하면 다른 새 폴더에 풀어 기존 파일을 보존하세요.

## 실행

Node.js 20.9 이상이 필요합니다. 검증 환경은 Windows / Node.js 24.12.0입니다.

```powershell
cd D:\project\cpp\cpp-study\frontend
npm.cmd ci
npm.cmd run dev
```

브라우저에서 http://127.0.0.1:3000 을 엽니다. 기본 포트가 사용 중이면 터미널에 안내되는 주소를 사용하세요. 종료는 터미널에서 Ctrl+C입니다.

```powershell
# 타입 검사 및 배포용 빌드
npm.cmd run typecheck
npm.cmd run build

# 빌드 후 실행
npm.cmd start
```

패키지 버전은 `package.json`과 `package-lock.json`에 고정했습니다. 설치 후 Monaco 파일을 `public/monaco/vs`에 자동 복사하므로 실행 시 에디터를 위해 외부 CDN에 접속하지 않습니다. `npm ci --ignore-scripts`로 설치했다면 `node scripts/copy-monaco.mjs`를 별도로 실행하세요.

## 화면과 동작

| 경로 | 구현한 기능 |
|---|---|
| `/` | 학습 소개, 강의·문제 바로가기, 실제 데모 기록 기반 학습 현황 |
| `/learn` | 공개 샘플 강의 6개 목록 |
| `/learn/io` 등 | 목표·선행 개념·설명·예제·결과·실수·요약·관련 문제, 이전/다음, 코드 복사, 학습 완료 |
| `/problems` | 7개 문제, 번호·제목 검색, 난이도·유형·상태 필터, 페이지 이동, URL 쿼리 유지, 빈 결과 |
| `/problems/1004` 등 | 문제 설명·조건·예제, 조절 가능한 분할 화면, Monaco, 초안 저장·복원, 실행 입력·응답 예시, 제출 시뮬레이션 |
| `/login`, `/register` | 입력 검증, 학습자·관리자 데모, 원래 문제로 복귀 |
| `/me`, `/me/submissions` | 프로필, 완료 강의·해결 문제·제출 수, 본인 데모 제출 기록 |
| `/submissions/[id]` | 제출 당시 고정 소스, 문제 버전, 모의 상태와 시각 |
| `/admin` | 문제·강의 초안 작성·수정, Markdown 미리보기, 강의·문제 연결, 문제 조건, 예제·테스트·기준 코드 입력, 보관·복원 |

작은 화면의 풀이 페이지는 **문제 / 코드 / 결과** 탭으로 전환됩니다. 확인창은 키보드 포커스를 내부에 유지하며 Escape로 취소할 수 있습니다.

## 추천 체험 순서

1. 홈 → 첫 강의 → 관련 문제 `두 수 더하기`로 이동합니다.
2. `모의 제출`을 누르면 로그인 안내로 이동합니다. `학습자 데모`를 선택하면 원래 문제로 돌아옵니다.
3. Monaco에 코드를 작성합니다. 새로고침하면 초안이 복원됩니다. Ctrl+F로 검색하고 글자 크기를 바꿀 수 있습니다.
4. `예시 실행`으로 공개 예제의 응답 형태를 확인합니다. 직접 입력을 변경하면 실제 실행기 연결이 필요하다는 안내를 표시합니다.
5. 모의 판정 `AC`, `WA`, `CE` 등을 선택하고 `모의 제출`합니다. 대기 → 채점 중 → 선택한 결과로 전환합니다.
6. 제출 상세에서 저장된 코드를 확인합니다. 이후 에디터를 수정해도 제출 당시 코드는 유지됩니다.
7. AC 후 WA를 제출해도 해결 상태는 유지됩니다. 대기나 시스템 오류만 있는 문제는 오답 시도로 계산하지 않습니다.
8. 로그아웃 후 `관리자 데모`로 로그인 → 관리자에서 초안을 편집하고 저장·새로고침·미리보기를 확인합니다.

## 모의 기능과 구현 경계

- **실제 로그인·회원가입이 아닙니다.** 이메일은 브라우저 프로필 구분에만 사용합니다. 비밀번호는 확인·전송·저장하지 않습니다. 테스트 값만 입력하세요.
- **C++ 코드를 실행하거나 채점하지 않습니다.** 실행은 공개 예제의 고정 응답 형식, 제출은 사용자가 선택한 판정으로 동작합니다. 임의 코드에 대해 정답 여부를 추정하지 않습니다.
- 실제 시간·메모리·테스트 통과 수를 만들어 표시하지 않습니다. 측정되지 않은 항목은 측정 없음으로 표시합니다.
- 브라우저 로컬 저장소는 실제 접근 통제나 보안 경계가 아닙니다. 관리자·학습자 메뉴 구분은 UI 시연용입니다.
- 코드 초안 키는 프로필·문제·언어를 포함합니다. 로그아웃하면 해당 계정 초안을 지웁니다. 제출 기록과 완료 강의는 남아 동일 데모 프로필로 다시 볼 수 있습니다.
- 기록은 이 브라우저의 이 주소에만 보관됩니다. 다른 브라우저·포트·기기로 이동하거나 사이트 데이터를 삭제하면 공유되지 않습니다.
- 관리자 테스트 입력은 UI 시연용입니다. 실제 비공개 테스트를 프론트엔드 번들에 포함하지 않았습니다. 초안은 실제 검증 전 공개할 수 없으며 공개 목록에도 반영되지 않습니다.
- Markdown의 원시 HTML은 렌더링하지 않고 MDX/JavaScript를 실행하지 않습니다.
- 백엔드, 세션, DB, Redis, Judge Worker, 실제 검증·공개·재채점은 구현하지 않았습니다.
- 로드맵·힌트·오답노트·북마크·랭킹·공지·다크모드 등 확장 메뉴는 노출하지 않습니다. 원문 13개 교육 주제 전체가 아닌 6개 샘플 강의를 제공합니다.

## 주요 생성 파일

| 파일 | 역할 |
|---|---|
| `frontend/package.json`, `package-lock.json` | 실행 명령, 버전 고정 |
| `frontend/tsconfig.json`, `postcss.config.mjs` | TypeScript·Tailwind 설정 |
| `frontend/src/app/layout.tsx` | 한국어 문서·메타데이터·공통 스타일 |
| `frontend/src/app/[[...path]]/page.tsx` | App Router 진입점 |
| `frontend/src/app/loading.tsx`, `error.tsx` | 로딩·실패·재시도 화면 |
| `frontend/src/app/globals.css` | 디자인·반응형·포커스 스타일 |
| `frontend/src/components/studio.tsx` | 탐색·학습·문제 풀이·인증 데모·기록 UI |
| `frontend/src/components/code-editor.tsx` | 클라이언트 전용 Monaco |
| `frontend/src/components/admin.tsx` | 관리자 초안 편집·검토·보관 |
| `frontend/src/components/markdown.tsx` | 공통 Markdown 렌더링 |
| `frontend/src/components/confirm-dialog.tsx` | 네이티브 확인창 |
| `frontend/src/lib/data.ts` | 공개 샘플 콘텐츠·판정 상태 타입·모의 상태 전환 |
| `frontend/scripts/copy-monaco.mjs` | 에디터 정적 파일 준비 |
| `docs/gptMaking.md` | 원본 요구사항의 사본 |
| `docs/verification.md` | 검증 결과 및 남은 범위 |

원래 폴더에서 수정한 파일은 없습니다. 압축 파일에는 `node_modules`, `.next`, 생성된 Monaco 사본 등 다시 만들 수 있는 파일을 제외했습니다.

## 후속 개발 연결 지점

`studio.tsx`의 데모 프로필·로컬 저장·모의 제출을 명세의 `/api/v1` 클라이언트로 교체하세요. Monaco는 소스 작성만 담당하고, 코드 실행은 반드시 별도의 안전한 실행 서비스가 수행해야 합니다. 공개 문제 데이터와 관리자 비공개 테스트 DTO를 분리하고 모든 권한 검사는 서버에서 수행해야 합니다.

구성 참고: [Next.js 공식 설치 문서](https://nextjs.org/docs/app/getting-started/installation), [Monaco React 공식 저장소](https://github.com/suren-atoyan/monaco-react).
