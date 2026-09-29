# CppStudy 검증 기록

최근 검증일: 2026-09-29. Windows / Node.js 24.12.0 환경에서 확인했습니다.

## 요구사항 요약과 적용

명세는 C++17 입문자용 한국어 교육 플랫폼을 정의하며, 공개 강의와 문제 탐색, 로그인 후 코드 작성·실행·제출, 개인 기록 및 관리자 콘텐츠 등록을 MVP로 삼습니다. 인증, 콘텐츠, 관리자 편집, 실행·제출 요청과 학습 기록은 API와 PostgreSQL에 연결되었고 실행 Provider는 Fake와 Judge0를 선택할 수 있습니다.

## 확인한 항목

- 전체 workspace TypeScript 검사 통과.
- API, Worker, Web 및 공용 패키지 프로덕션 빌드 통과.
- API 3개, Worker 7개, 출력 비교기 4개 단위 테스트 통과.
- migration `20260929201500_problem_version_metadata`까지 4개 적용 및 seed 완료.
- 공개 문제 7개 API 조회.
- 테스트 계정 회원가입과 쿠키 세션 인증.
- 실행 생성 → Outbox → Redis Queue → Worker → Fake Provider → `SUCCESS` 폴링 완료.
- 제출 생성 → 테스트 4개 비교 → `AC` 판정 및 4/4 통과 기록.
- 강의 완료 상태 저장 및 `/users/me/progress` 조회.
- 해결 문제와 제출 기록 집계 및 제출 상세 조회.
- 통합 검증 후 생성한 테스트 계정과 연관 기록 삭제.
- 관리자 API 통합 테스트로 임시 관리자 생성, 콘텐츠 조회, 강의 생성·공개를 확인.
- 문제·숨김 테스트·연결 관계 저장, 실제 Judge0 기준 코드 검증, 공개·보관·복원 확인.
- 관리자 통합 테스트가 만든 계정·강의·문제·검증 데이터를 자동 삭제하는 것을 확인.

## 검증하지 않은 범위

AC 외의 WA/CE/RE/TLE/MLE/OLE fixture 전체, Judge0 실행 격리 공격 시나리오, Outbox의 Redis 장애 후 재전달, 다중 Worker 경쟁 및 브라우저 E2E는 아직 검증하지 않았습니다. 관리자 API 통합 시험은 `npm.cmd run test:admin-integration`으로 반복할 수 있습니다.

## 원본 보존

원본 `D:\project\cpp\gptMaking.md`는 읽기만 했습니다. 대상 폴더 쓰기 권한이 부여되지 않아 프로젝트는 허용된 출력 폴더에서 생성했으며 압축 파일로 전달합니다.
