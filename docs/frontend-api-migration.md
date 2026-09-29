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

## 다음 작업에서 진행

1. Fake Provider를 실제 Judge0 Provider로 교체
2. 관리자 화면을 `/admin` API로 교체
3. 코드 초안의 서버 저장 여부 확정
4. 인증 만료 공통 처리와 DB/Redis 통합·E2E 테스트 추가

## 실행 전제

- 웹: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001/api/v1`
- 다른 주소를 쓸 때는 `apps/web/.env.local`의 `NEXT_PUBLIC_API_URL`과 루트 `.env`의 `WEB_ORIGIN`을 함께 변경한다.

## 로컬 DB 적용 상태

코드와 seed 정비는 완료했지만 2026-09-29 최종 검증 시 로컬 PostgreSQL(`127.0.0.1:5432`)이 중지되어 변경된 문제 seed의 DB 반영은 보류되었다. Docker Desktop을 실행한 뒤 아래 명령을 순서대로 한 번 실행한다.

```powershell
npm.cmd run infra:up
npm.cmd run prisma:seed
```

적용 후 `GET /api/v1/problems?limit=100`의 `items`가 7개인지 확인한다.

현재 강의, 문제, 실행·제출 요청, 제출 기록과 강의 완료 상태는 서버 API와 PostgreSQL을 사용한다. 실행 결과는 개발용 Fake Provider가 만들며 실제 C++ 컴파일은 Judge0 연결 후 제공한다. 관리자 화면과 코드 초안은 아직 프론트엔드 로컬 데이터를 사용한다.
