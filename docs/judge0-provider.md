# Judge0 Provider

## 서버 기준

- Judge0 CE `1.13.1`
- Ubuntu 22.04 x64, cgroup v1
- 제출 코드의 네트워크 비활성화
- Judge0 API 토큰 인증 활성화
- Azure NSG는 SSH 22만 관리자 IP에 허용

## 로컬 연결

Judge0의 2358 포트를 인터넷에 공개하지 않는다. 로컬 개발에서는 MobaXterm SSH 터널을 사용한다.

```text
로컬 주소: 127.0.0.1:2358
SSH 서버: Azure VM 공용 IP:22
SSH 사용자: azureuser
원격 주소: 127.0.0.1:2358
```

터널이 열린 상태에서 다음 요청이 Judge0까지 전달되어야 한다.

```powershell
curl.exe -H "X-Judge0-Token: <AUTHN_TOKEN>" http://127.0.0.1:2358/about
```

## 애플리케이션 설정

루트 `.env`에 실제 값을 저장한다. 이 파일과 토큰은 커밋하지 않는다.

```dotenv
EXECUTION_PROVIDER=judge0
WORKER_CONCURRENCY=2
JUDGE0_URL=http://127.0.0.1:2358
JUDGE0_AUTH_HEADER=X-Judge0-Token
JUDGE0_AUTH_TOKEN=<서버 judge0.conf의 AUTHN_TOKEN>
JUDGE0_C11_LANGUAGE_ID=50
JUDGE0_C11_COMPILER_VERSION=C (GCC 9.2.0) via Judge0 CE 1.13.1
JUDGE0_CPP17_LANGUAGE_ID=54
JUDGE0_CPP17_COMPILER_VERSION=C++ (GCC 9.2.0) via Judge0 CE 1.13.1
JUDGE0_REQUEST_TIMEOUT_MS=10000
JUDGE0_EXECUTION_TIMEOUT_MS=30000
JUDGE0_POLL_INTERVAL_MS=500
```

Worker는 비동기 제출로 토큰을 받은 뒤 완료 상태까지 폴링한다. 문제 버전의 시간 및 메모리 제한을 Judge0에 전달하고, 기대 출력 비교는 신뢰할 수 있는 CppStudy Worker에서 수행한다.

관리자 기준 코드를 검증할 때는 `problem-version.validate` Outbox 이벤트가 전용 BullMQ Queue로 전달된다. Worker가 공개 예제와 숨김 테스트를 모두 실행하고 출력 비교까지 통과한 버전에만 `validatedAt`을 기록한다. 관리자 통합 시험은 API와 Worker 실행 후 다음 명령으로 반복한다.

```powershell
npm.cmd run test:admin-integration
```
