# 프론트엔드 API 전환 현황

## 이번 작업에서 완료

- [x] 공통 API 클라이언트와 오류 처리
- [x] 쿠키 기반 세션 요청(`credentials: include`)
- [x] CSRF 쿠키 발급 및 변경 요청 헤더 처리
- [x] 실제 회원가입·로그인·로그아웃 연결
- [x] 앱 시작 시 `/users/me`로 로그인 상태 복원
- [x] 인증용 `localStorage` 데모 프로필 제거
- [x] 강의 목록·상세 `/lessons` API 연결
- [x] 문제 목록·상세 `/problems` API 연결
- [x] 초기 문제 7개를 공개 가능한 seed 데이터로 정비
- [x] 실행 생성·상태 조회 `/runs` API 연결
- [x] 제출 생성·상태 조회 `/submissions` API 연결
- [x] 내 제출 목록·상세 `/users/me/submissions` API 연결
- [x] 강의 완료 및 학습 요약 `/users/me/progress` API 연결
- [x] 제출·강의 완료용 `localStorage` 제거
- [x] 개발용 Fake Provider 폴링 흐름 연결
- [x] Judge0 Provider 선택 및 실제 C++ 기준 코드 검증 연결
- [x] 관리자 콘텐츠 목록·상세·저장 API 연결
- [x] 관리자 문제 테스트·카테고리·강의 연결 저장
- [x] 관리자 기준 코드 검증·공개·보관·복원 연결
- [x] 관리자 콘텐츠용 `localStorage` 제거
- [x] 관리자 강의·문제·미디어 화면 분리와 검색·상태 필터
- [x] 관리자 이미지 업로드·목록·삭제 API 연결
- [x] 공개 강의의 새 버전 작성·게시 흐름 연결
- [x] 표·이미지·코드 강조·콜아웃·자동 목차 Markdown 렌더러
- [x] 학습 카테고리와 세부 강의 계층형 목록·목차
- [x] 관리자 학습 카테고리 생성·수정·공개·보관과 강의 소속 변경

## 다음 작업에서 진행

1. 코드 초안의 서버 저장 여부 확정
2. 인증 만료 공통 처리와 브라우저 E2E 테스트 추가
3. Redis 장애 후 Outbox 재전달과 다중 Worker 경쟁 검증
4. Judge0 판정 fixture와 자원 격리 검증 확대

## 실행 전제

- 웹: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001/api/v1`
- 다른 주소를 쓸 때는 `apps/web/.env.local`의 `NEXT_PUBLIC_API_URL`과 루트 `.env`의 `WEB_ORIGIN`을 함께 변경한다.

## 로컬 DB 적용 상태

2026-09-29 기준 PostgreSQL과 Redis가 healthy이며 migration 6개와 초기 seed가 적용되어 있다. 새 환경에서는 아래 명령을 순서대로 실행한다.

```powershell
npm.cmd run infra:up
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

적용 후 `GET /api/v1/problems?limit=100`의 `items`가 7개인지 확인한다.

현재 강의, 문제, 관리자 콘텐츠, 실행·제출 요청, 제출 기록과 강의 완료 상태는 서버 API와 PostgreSQL을 사용한다. 실행 Provider는 `.env`의 `EXECUTION_PROVIDER`로 Fake 또는 Judge0를 선택한다. 문제 풀이 코드 초안만 브라우저 `localStorage`를 사용한다.
