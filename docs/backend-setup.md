# CppStudy 백엔드 로컬 실행 안내

## 준비물

- Node.js 24 이상
- npm 11 이상
- Docker Desktop 또는 Docker Engine + Compose

Docker가 실행 중인지 확인한다.

```powershell
docker --version
docker compose version
docker info
```

## 최초 설정

저장소 루트에서 실행한다.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run infra:up
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

저장소에는 개발용 `.env`가 이미 생성될 수 있다. 이 경우 덮어쓰지 말고 값을 확인한다. `.env`의 로컬 기본 비밀번호는 개발 전용이며 운영 환경에서 사용하면 안 된다.

초기 seed는 학습 카테고리 4개, 강의 6개와 문제 7개를 공개 상태로 넣는다. 각 문제에는 기준 코드, 공개 예제 1개, 개발 검증용 숨김 테스트 3개가 포함된다.

관리자 이미지의 기본 저장 위치는 API 실행 디렉터리의 `uploads`이다. 다른 영속 경로를 사용하려면 `.env`의 `MEDIA_ROOT`를 지정한다. 업로드 파일은 Git에 포함되지 않는다.

## 개발 서버

터미널을 세 개 열어 각각 실행한다.

```powershell
npm.cmd run dev:web
```

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev:worker
```

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001/api/v1`
- Swagger: `http://127.0.0.1:3001/api/docs`
- 생존 확인: `GET /api/v1/health/live`
- DB/Redis 준비 확인: `GET /api/v1/health/ready`
- Worker: Outbox 전달, Redis Queue 소비, 개발용 Fake Provider 판정

## CSRF가 필요한 요청

브라우저 클라이언트는 먼저 `GET /api/v1/auth/csrf`를 credentials 포함으로 호출한다. 응답과 함께 받은 `cppstudy_csrf` 쿠키 값을 변경 요청의 `x-csrf-token` 헤더에 넣는다.

```text
Cookie: cppstudy_csrf=<token>
x-csrf-token: <token>
Origin: http://127.0.0.1:3000
```

세션 쿠키 `cppstudy_session`은 HttpOnly이므로 JavaScript에서 읽지 않는다.

## 관리자 계정

`.env`의 `ADMIN_EMAIL`, `ADMIN_NICKNAME`을 원하는 로컬 값으로 바꾼 다음 실행한다.

```powershell
npm.cmd run admin:create
```

비밀번호는 터미널에서 숨김 입력으로 받고 Argon2id 해시만 DB에 저장한다.

## 검증 명령

```powershell
npm.cmd run prisma:generate
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
```

## 인프라 관리

```powershell
npm.cmd run infra:status
npm.cmd run infra:logs
npm.cmd run infra:down
```

`infra:down`은 컨테이너를 내리지만 named volume은 보존한다. DB 데이터를 삭제하는 명령은 안전을 위해 npm script로 제공하지 않는다.

## 아직 연결되지 않은 범위

- 문제 풀이 코드 초안은 브라우저 localStorage를 사용한다. 관리자 편집 화면은 관리자 API와 PostgreSQL을 사용한다.
- 강의와 문제는 공개 버전을 보존하면서 별도 초안 버전을 작성해 교체 게시한다.
- 강의는 `LessonCategory`에 소속되며 공개 API는 카테고리 순서와 내부 강의 순서로 묶어 반환한다.
- 관리자 미디어 API는 이미지 메타데이터를 PostgreSQL에, 파일을 `MEDIA_ROOT`에 저장한다. 운영 배포에서는 공유 영속 볼륨 또는 객체 저장소 어댑터로 교체해야 한다.
- Outbox Dispatcher와 BullMQ 실행·제출·기준 코드 검증 소비자가 구현되어 있다.
- 실행 Provider는 `.env`에서 Fake 또는 Judge0를 선택한다. Judge0 모드는 SSH 터널과 토큰이 필요하다.
- Docker가 없는 환경에서는 DB migration, seed, API 통합 시험을 실행할 수 없다.

## 운영 배포

단일 Ubuntu 서버용 Dockerfile, Compose, Caddy, 배포 및 백업 스크립트는 `docs/deployment.md`에 정리되어 있다. 운영 컨테이너에서는 `API_HOST=0.0.0.0`을 사용하고 외부 접근은 Caddy를 통해서만 허용한다. 로컬 기본값은 계속 `127.0.0.1`이다.

관리자 API 통합 시험은 API와 Worker를 실행한 상태에서 다음 명령으로 수행한다. 임시 계정과 콘텐츠는 성공·실패 여부와 관계없이 정리된다.

```powershell
npm.cmd run test:admin-integration
```
