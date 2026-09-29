# CppStudy 단일 서버 배포 안내

이 문서는 Web, API, 애플리케이션 Worker, PostgreSQL, Redis, Judge0, Caddy를 Ubuntu 서버 한 대에서 Docker Compose로 운영하는 절차다. 외부에는 SSH(22), HTTP(80), HTTPS(443)만 공개한다. PostgreSQL, Redis, API, Judge0 포트는 Docker 내부 네트워크에서만 접근할 수 있다.

## 1. 권장 서버와 사전 조건

- Ubuntu 22.04 LTS
- 최소 4 vCPU, RAM 8GB, SSD 80GB
- Docker Engine과 Docker Compose v2
- 서버 공인 IP를 가리키는 도메인 A/AAAA 레코드
- 방화벽 허용 포트: 22, 80, 443

Judge0 CE 1.13.1은 공식 배포 안내상 Ubuntu 22.04에서 cgroup v1 설정이 필요하다. `/etc/default/grub`의 `GRUB_CMDLINE_LINUX`에 `systemd.unified_cgroup_hierarchy=0`을 추가한 뒤 `sudo update-grub`과 재부팅을 수행한다. 이 설정은 서버에 접속할 수 있는 복구 방법을 확인한 뒤 적용한다.

Judge0는 신뢰할 수 없는 코드를 실행하며 `privileged` 컨테이너가 필요하다. `judge-internal` 네트워크로 분리했고 호스트에 2358 포트를 공개하지 않았지만, 서버 전체를 다른 중요한 서비스와 함께 사용하지 않는 것을 권장한다.

## 2. 운영 비밀값 준비

저장소 루트에서 예제 파일을 복사한다.

```bash
cp .env.production.example .env.production
cp deploy/judge0.conf.example deploy/judge0.conf
chmod 600 .env.production deploy/judge0.conf
```

강한 난수는 다음처럼 만들 수 있다.

```bash
openssl rand -base64 36
openssl rand -hex 64
```

두 파일에서 `replace_`로 시작하는 값을 모두 교체한다. 특히 다음 값은 반드시 일치해야 한다.

```text
.env.production의 JUDGE0_AUTH_TOKEN
deploy/judge0.conf의 AUTHN_TOKEN
```

`DATABASE_URL`과 `REDIS_URL`에 비밀번호를 직접 넣으므로 `@`, `:`, `/`, `#`, `%` 같은 예약 문자는 URL 인코딩해야 한다. 이를 피하려면 영문자와 숫자로 구성된 긴 난수를 사용한다. 두 실제 설정 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋하지 않는다.

## 3. 첫 배포

DNS가 서버를 가리키고 80/443 포트가 열린 상태에서 실행한다.

```bash
chmod +x scripts/deploy.sh scripts/backup.sh
./scripts/deploy.sh
```

배포 스크립트는 다음 순서로 동작한다.

1. Compose 설정과 필수 파일을 검증한다.
2. Web, API, Worker 이미지를 빌드한다.
3. 애플리케이션 DB/Redis와 Judge0 DB/Redis를 시작한다.
4. Judge0 준비 상태를 확인한다.
5. Prisma 운영 마이그레이션을 적용한다.
6. API, Worker, Web, Caddy를 시작하고 상태를 확인한다.

초기 샘플 콘텐츠가 필요한 최초 1회에만 seed를 실행한다. 기존 운영 DB에 반복 실행하지 않는다.

```bash
docker compose --env-file .env.production -f compose.prod.yaml run --rm seed
```

관리자 계정도 최초 1회 생성한다. 비밀번호는 명령 실행 후 터미널에서 입력하며 설정 파일에 저장되지 않는다.

```bash
docker compose --env-file .env.production -f compose.prod.yaml run --rm admin
```

## 4. 배포 확인

```bash
docker compose --env-file .env.production -f compose.prod.yaml ps
docker compose --env-file .env.production -f compose.prod.yaml logs --tail=100 api app-worker judge0-server judge0-workers caddy
curl -fsS https://YOUR_DOMAIN/api/v1/health/live
curl -fsS https://YOUR_DOMAIN/api/v1/health/ready
```

브라우저에서는 다음 항목을 확인한다.

- HTTPS 인증서가 정상인지 확인
- 회원가입, 로그인, 로그아웃
- 강의 목록과 이미지 표시
- C++ 실행 및 제출 후 최종 판정
- 관리자 로그인, 강의 초안 저장, 이미지 업로드

Judge0의 `/docs`와 2358 포트는 외부에 공개되지 않는 것이 정상이다.

## 5. 업데이트

배포할 Git 커밋을 서버에서 체크아웃한 뒤 다시 실행한다.

```bash
git pull --ff-only
./scripts/deploy.sh
```

스크립트는 `prisma migrate deploy`를 실행한 다음 서비스를 갱신한다. `prisma db seed`는 자동 실행하지 않는다.

## 6. 백업

```bash
./scripts/backup.sh
```

`backups/<UTC 시각>/`에 애플리케이션 PostgreSQL 덤프와 업로드 이미지 압축 파일이 생성된다. 이 디렉터리를 서버 밖의 암호화된 저장소로 복사한다. Judge0 DB는 임시 실행 상태만 가지므로 기본 백업에서 제외한다.

복구 전에는 새 서버의 동일 버전 Compose 환경에서 빈 애플리케이션 DB와 업로드 볼륨을 준비한다. 서비스 중단 후 SQL을 `psql`로 복원하고 `uploads.tar.gz`를 `/app/uploads`에 풀어 넣는다. 실제 장애 복구 전에 별도 환경에서 복원 시험을 수행한다.

## 7. 운영 명령

```bash
# 상태
docker compose --env-file .env.production -f compose.prod.yaml ps

# 로그
docker compose --env-file .env.production -f compose.prod.yaml logs -f --tail=200

# 재시작
docker compose --env-file .env.production -f compose.prod.yaml restart api app-worker web

# 설정 검증
docker compose --env-file .env.production -f compose.prod.yaml config --quiet
```

named volume을 삭제하는 `docker compose down -v`는 DB와 업로드 파일을 제거하므로 운영 서버에서 사용하지 않는다.

## 8. 구성 파일

| 파일 | 역할 |
| --- | --- |
| `compose.prod.yaml` | 단일 서버의 모든 운영 서비스와 내부 네트워크 |
| `apps/web/Dockerfile` | Next.js standalone 운영 이미지 |
| `apps/api/Dockerfile` | NestJS API 및 마이그레이션 이미지 |
| `apps/judge-worker/Dockerfile` | Queue/Outbox/Judge0 연동 Worker 이미지 |
| `deploy/Caddyfile` | 자동 HTTPS와 `/api/*` 역방향 프록시 |
| `.env.production.example` | 애플리케이션 운영 설정 양식 |
| `deploy/judge0.conf.example` | Judge0 1.13.1 보안·리소스 설정 양식 |
| `scripts/deploy.sh` | 검증, 빌드, 마이그레이션, 기동 자동화 |
| `scripts/backup.sh` | 애플리케이션 DB와 업로드 파일 백업 |

운영 Web은 동일 도메인의 `/api/v1`을 호출한다. API는 컨테이너에서 `0.0.0.0:3001`에 바인딩되지만 호스트 포트로 publish되지 않고 Caddy만 접근한다. 로컬 개발은 기본값 `127.0.0.1:3001`을 계속 사용한다.

## 참고

- [Judge0 CE v1.13.1 배포 및 보안 수정](https://github.com/judge0/judge0/releases/tag/v1.13.1)
- [Judge0 공식 Docker Compose](https://github.com/judge0/judge0/blob/v1.13.1/docker-compose.yml)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Prisma 운영 마이그레이션](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
