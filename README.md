# CppStudy C++ 학습 플랫폼 MVP

`gptMaking.md`의 **개념 학습 → 문제 풀이 → 실행·제출 → 기록 확인** 흐름을 체험하는 한국어 프론트엔드입니다. Next.js App Router, React, TypeScript, Tailwind CSS, Monaco Editor를 사용합니다.

## 저장 위치 안내

요청한 `D:\project\cpp`는 읽을 수 있었지만 이 작업 세션에서 쓰기 권한이 부여되지 않았습니다. 따라서 프로젝트를 별도 출력 폴더에서 완성했습니다. 기존 `D:\project\cpp\gptMaking.md`는 변경하지 않았으며, 읽은 원본을 `docs/gptMaking.md`에 복사했습니다.

현재 프로젝트는 npm workspaces 모노레포이며 Web은 `apps/web`, API는 `apps/api`에 있습니다.

## 실행

Node.js 24 이상이 필요합니다. 검증 환경은 Windows / Node.js 24.12.0입니다.

```powershell
cd D:\project\react\cpp
npm.cmd ci
npm.cmd run dev:web
```

브라우저에서 http://127.0.0.1:3000 을 엽니다. 기본 포트가 사용 중이면 터미널에 안내되는 주소를 사용하세요. 종료는 터미널에서 Ctrl+C입니다.

```powershell
# 전체 workspace 타입 검사 및 배포용 빌드
npm.cmd run typecheck
npm.cmd run build

# 백엔드 인프라와 API
npm.cmd run infra:up
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
npm.cmd run dev:api
```

패키지 버전은 `package.json`과 `package-lock.json`에 고정했습니다. 설치 후 Monaco 파일을 `public/monaco/vs`에 자동 복사하므로 실행 시 에디터를 위해 외부 CDN에 접속하지 않습니다. `npm ci --ignore-scripts`로 설치했다면 `node scripts/copy-monaco.mjs`를 별도로 실행하세요.

## 화면과 동작

| 경로                     | 구현한 기능                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `/`                      | 학습 소개, 강의·문제 바로가기, DB 학습 기록 기반 현황                                  |
| `/learn`                 | 대분류와 `1.1` 세부 번호로 묶은 PostgreSQL 공개 강의 목록                              |
| `/learn/io` 등           | 계층형 과정 목차, 표·이미지·강조 코드·콜아웃·자동 목차를 지원하는 강의 본문            |
| `/problems`              | API로 조회한 문제, 번호·제목 검색, 난이도·유형·상태 필터, 페이지 이동                  |
| `/problems/1004` 등      | 문제 설명·조건·예제, Monaco, 초안 저장, API 실행·제출, 결과 폴링                       |
| `/login`, `/register`    | 실제 회원가입·로그인·로그아웃, 쿠키 세션, 원래 페이지로 복귀                           |
| `/me`, `/me/submissions` | DB에 저장된 강의 완료·해결 문제·제출 수 및 본인 제출 기록                              |
| `/submissions/[id]`      | 제출 당시 고정 소스, 문제 버전, 판정과 자원 사용량                                     |
| `/admin`                 | 학습 카테고리·강의·문제·미디어 관리, Markdown 미리보기, 버전 편집, 검증·공개·보관·복원 |

작은 화면의 풀이 페이지는 **문제 / 코드 / 결과** 탭으로 전환됩니다. 확인창은 키보드 포커스를 내부에 유지하며 Escape로 취소할 수 있습니다.

## 추천 체험 순서

1. 홈 → 첫 강의 → 관련 문제 `두 수 더하기`로 이동합니다.
2. `제출`을 누르면 로그인 안내로 이동합니다. 회원가입하거나 로그인하면 원래 문제로 돌아옵니다.
3. Monaco에 코드를 작성합니다. 새로고침하면 초안이 복원됩니다. Ctrl+F로 검색하고 글자 크기를 바꿀 수 있습니다.
4. `실행`으로 API → Queue → Worker 결과 흐름을 확인합니다.
5. `제출`하면 대기 → 실행 → 판정 상태가 폴링되고 DB 학습 기록에 반영됩니다.
6. 제출 상세에서 저장된 코드를 확인합니다. 이후 에디터를 수정해도 제출 당시 코드는 유지됩니다.
7. AC 후 WA를 제출해도 해결 상태는 유지됩니다. 대기나 시스템 오류만 있는 문제는 오답 시도로 계산하지 않습니다.
8. 관리자 계정으로 로그인하면 관리자 메뉴에 접근할 수 있습니다.

## 모의 기능과 구현 경계

- 회원가입·로그인·로그아웃은 NestJS API와 PostgreSQL 세션 저장소에 연결되어 있습니다. 비밀번호는 Argon2id로 해시하고 브라우저에는 HttpOnly 세션 쿠키만 저장합니다.
- 실행 Worker는 개발용 Fake Provider와 실제 Judge0 CE Provider를 환경변수로 선택할 수 있습니다. Judge0 모드에서는 비동기 제출·폴링으로 C11 또는 C++17 코드를 선택한 컴파일러에서 실행합니다.
- 로컬 개발 환경에서 원격 Judge0를 사용할 때는 2358 포트를 공개하지 않고 SSH 터널을 사용합니다. 설정 방법은 `docs/judge0-provider.md`에 기록되어 있습니다.
- 관리자 권한은 서버 세션의 role로 판정합니다. 관리자 편집 데이터와 숨김 테스트는 PostgreSQL의 관리자 API로만 조회·저장합니다.
- 코드 초안 키는 계정·문제·언어를 포함하며 현재 브라우저에만 저장됩니다. 로그아웃하면 해당 계정 초안을 지웁니다.
- 강의 완료와 제출 기록은 PostgreSQL에 저장되므로 같은 계정으로 다른 브라우저에서 로그인해도 조회할 수 있습니다.
- 관리자 문제 초안은 기준 코드가 공개 예제 1개와 숨김 테스트 3개 이상을 모두 통과해야 공개할 수 있습니다. 비공개 테스트는 공개 API와 프론트엔드 번들에 포함하지 않습니다.
- 공개된 강의와 문제는 직접 덮어쓰지 않고 새 버전을 만들어 편집합니다. 새 강의 버전이 공개되기 전까지 학습자는 기존 공개 본문을 봅니다.
- 강의는 `학습 카테고리 → 세부 강의`의 두 단계로 구성합니다. `1.1` 번호는 저장하지 않고 카테고리와 강의 순서에서 자동 계산합니다.
- Markdown은 GFM 표, 이미지와 캡션, C++ 구문 강조·복사, 자동 목차, `note`/`tip`/`warning`/`summary` 콜아웃을 지원합니다. 원시 HTML과 MDX/JavaScript는 실행하지 않습니다.
- 관리자 미디어는 PNG/JPEG/GIF/WebP, 최대 5MB로 제한하고 MIME과 파일 시그니처를 함께 검사합니다. 로컬 파일은 기본적으로 `apps/api/uploads`에 저장하며 운영 환경에서는 영속 볼륨 또는 객체 저장소가 필요합니다.
- Judge0 Provider와 기준 코드 검증 Worker가 연결되어 있습니다. 재채점, Redis 장애 복구 및 다중 Worker 경쟁 검증은 후속 범위입니다.
- 로드맵·힌트·오답노트·북마크·랭킹·공지·다크모드 등 확장 메뉴는 노출하지 않습니다. 원문 13개 교육 주제 전체가 아닌 6개 샘플 강의를 제공합니다.

## 주요 생성 파일

| 파일                                | 역할                             |
| ----------------------------------- | -------------------------------- |
| `package.json`, `package-lock.json` | workspace 실행 명령, 버전 고정   |
| `apps/web`                          | 기존 Next.js 프런트엔드          |
| `apps/api`                          | NestJS 인증·콘텐츠·실행 요청 API |
| `apps/judge-worker`                 | Outbox Dispatcher와 Judge Worker |
| `packages/contracts`                | 공개 요청·응답 타입              |
| `packages/judge-domain`             | 출력 비교 순수 로직              |
| `prisma/schema.prisma`              | PostgreSQL 데이터 모델           |
| `compose.yaml`                      | 로컬 PostgreSQL·Redis            |
| `docs/gptMaking.md`                 | 원본 요구사항의 사본             |
| `docs/verification.md`              | 검증 결과 및 남은 범위           |

원래 폴더에서 수정한 파일은 없습니다. 압축 파일에는 `node_modules`, `.next`, 생성된 Monaco 사본 등 다시 만들 수 있는 파일을 제외했습니다.

## 후속 개발 연결 지점

다음 작업은 AC/WA/CE/RE/TLE/MLE/OLE fixture를 이용한 Judge0 판정 검증과 브라우저 E2E, Outbox 장애 복구 검증입니다. 반복 검증 절차는 `docs/test_checklist.md`를 참고합니다.

구성 참고: [Next.js 공식 설치 문서](https://nextjs.org/docs/app/getting-started/installation), [Monaco React 공식 저장소](https://github.com/suren-atoyan/monaco-react).

## 단일 서버 운영 배포

운영 배포 파일이 준비되어 있다. Web, API, 애플리케이션 Worker, PostgreSQL, Redis, Judge0 CE 1.13.1, Caddy를 Ubuntu 서버 한 대에서 Docker Compose로 실행한다. API와 Judge0는 호스트 포트로 공개하지 않고 Caddy만 80/443 포트를 사용한다.

```bash
cp .env.production.example .env.production
cp deploy/judge0.conf.example deploy/judge0.conf
# 두 파일의 replace_* 값과 도메인을 모두 변경한 뒤
./scripts/deploy.sh
```

최초 콘텐츠와 관리자 계정 생성, 백업, 업데이트, 방화벽 및 Judge0 호스트 설정은 [`docs/deployment.md`](docs/deployment.md)를 따른다. 운영 API는 컨테이너 내부에서 `0.0.0.0`에 바인딩되고, 로컬 개발 API는 기본값인 `127.0.0.1`에만 바인딩된다.
