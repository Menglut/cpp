# 개발용 Fake Provider

## 목적

Judge0를 준비하기 전에 브라우저 → API → PostgreSQL Outbox → Redis/BullMQ → Worker → PostgreSQL → 브라우저 폴링 흐름을 검증한다. Fake Provider는 C++ 코드를 컴파일하거나 실행하지 않으며 운영 환경에서 사용하면 안 된다.

## 실행

인프라와 migration/seed를 준비한 뒤 세 터미널에서 실행한다.

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev:worker
```

```powershell
npm.cmd run dev:web
```

루트 `.env`에는 다음 값을 사용한다.

```dotenv
EXECUTION_PROVIDER=fake
WORKER_CONCURRENCY=2
```

## 시나리오

일반 코드는 성공 경로를 재현한다. 제출에서는 Fake Provider가 테스트의 기대 출력을 반환하므로 AC가 된다. 다음 주석을 소스에 넣으면 오류 흐름을 검증할 수 있다.

| 주석                   | 결과         |
| ---------------------- | ------------ |
| `// FAKE:WA`           | 출력 불일치  |
| `// FAKE:CE`           | 컴파일 오류  |
| `// FAKE:RE`           | 실행 중 오류 |
| `// FAKE:TLE`          | 시간 초과    |
| `// FAKE:MLE`          | 메모리 초과  |
| `// FAKE:OLE`          | 출력 초과    |
| `// FAKE:SYSTEM_ERROR` | 시스템 오류  |

결과의 `allowedDiagnostic`과 `compilerVersion`에는 Fake Provider임을 명시한다.

## Judge0 교체 지점

`apps/judge-worker/src/fake-execution-provider.ts`와 동일한 결과 계약을 구현하는 Judge0 Provider를 추가하고 `EXECUTION_PROVIDER=judge0`으로 선택한다. API와 프론트의 실행·제출 계약은 변경하지 않는다.
