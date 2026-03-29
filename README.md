# Coin - 암호화폐 자동매매 플랫폼

암호화폐 시세 모니터링과 자동매매 봇을 제공하는 풀스택 트레이딩 플랫폼입니다.

## 주요 기능

- **멀티 거래소 지원** - Upbit, Binance, Bybit
- **실시간 시세** - WebSocket 기반 실시간 가격 피드 + Redis 캐시
- **자동매매 전략** - RSI, MACD, Bollinger Band 기술적 지표 기반
- **페이퍼 트레이딩** - 실거래 없이 전략 테스트
- **OAuth 로그인** - Google, Kakao, Naver + 이메일 로그인
- **알림** - 텔레그램 봇 + 웹 푸시
- **API 키 암호화** - AES-256-GCM으로 거래소 키 안전 저장

## 스크린샷

### 마켓

![마켓](docs/images/markets.png)

### 로그인

![로그인](docs/images/login.png)

### 전략 관리

![전략](docs/images/strategies.png)

### 주문

![주문](docs/images/orders.png)

### 포트폴리오

![포트폴리오](docs/images/portfolio.png)

### 활동

![활동](docs/images/activity.png)

### 설정

![설정](docs/images/settings.png)

## 아키텍처

```mermaid
graph TB
    Client[브라우저] --> Nginx[Nginx :80/:443]
    Nginx --> Web[Next.js :3001]
    Nginx --> API[NestJS API :3000]
    API --> PG[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> Kafka[Kafka]
    Kafka --> Worker[Worker Service]
    Worker --> PG
    Worker --> Redis
    Worker --> Exchange[거래소 API<br/>Upbit / Binance / Bybit]

    style Client fill:#e1f5fe
    style Nginx fill:#fff3e0
    style Web fill:#e8f5e9
    style API fill:#e8f5e9
    style Worker fill:#e8f5e9
    style PG fill:#fce4ec
    style Redis fill:#fce4ec
    style Kafka fill:#fce4ec
    style Exchange fill:#f3e5f5
```

## 기술 스택

| 분류              | 기술                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| **Frontend**      | Next.js 15, React 19, TailwindCSS, TanStack Query, Zustand, lightweight-charts |
| **Backend**       | NestJS 11, Prisma 6, Passport (JWT + OAuth), Socket.IO                         |
| **Worker**        | NestJS + Kafka Consumer, technicalindicators                                   |
| **Database**      | PostgreSQL 16, Redis 7                                                         |
| **Message Queue** | Apache Kafka (Confluent 7.6)                                                   |
| **Infra**         | Docker Compose, Nginx, GitHub Actions, GHCR                                    |
| **Monorepo**      | Turborepo, pnpm 9                                                              |

## 프로젝트 구조

```
coin/
├── apps/
│   ├── api-server/          # NestJS REST API + WebSocket
│   ├── web/                 # Next.js 프론트엔드
│   └── worker-service/      # Kafka 컨슈머 + 전략 실행
├── packages/
│   ├── database/            # Prisma 스키마 + 마이그레이션
│   ├── exchange-adapters/   # 거래소 API 어댑터
│   ├── kafka-contracts/     # Kafka 이벤트 타입
│   ├── types/               # 공유 TypeScript 타입
│   ├── utils/               # 유틸리티 함수
│   ├── tsconfig/            # 공유 TypeScript 설정
│   └── eslint-config/       # 공유 ESLint 설정
├── infra/                   # PostgreSQL, Redis, Kafka, Nginx
├── cicd/                    # 배포 스크립트 + 가이드
├── Dockerfile.base          # 개발용 공유 베이스 이미지
├── Makefile                 # CLI 명령 표준화
└── docker-compose*.yml      # dev / prod 환경
```

## 빠른 시작

### 요구사항

- Node.js >= 20
- pnpm 9
- Docker & Docker Compose

### 설치 및 실행

```bash
# 1. 클론
git clone https://github.com/fray-cloud/coin.git
cd coin

# 2. 초기 세팅 (env 파일 생성 + SSL 인증서 + 베이스 이미지 빌드)
make setup

# 3. .env.dev 수정 (Docker 내부 호스트명 사용)
# DATABASE_URL=postgresql://coin:coin_dev@postgres:5432/coin
# REDIS_HOST=redis
# KAFKA_BROKERS=kafka:29092

# 4. 개발 환경 시작
make dev

# 5. 접속
# https://localhost        (웹)
# https://localhost/api    (API)
# https://localhost/scalar (API 문서)
```

## 환경변수

`.env.example`을 `.env`(운영) 또는 `.env.dev`(개발)로 복사 후 수정합니다.

| 변수                    | 설명                                 | 기본값                                           |
| ----------------------- | ------------------------------------ | ------------------------------------------------ |
| `DATABASE_URL`          | PostgreSQL 연결 URL                  | `postgresql://coin:coin_dev@localhost:5432/coin` |
| `REDIS_HOST`            | Redis 호스트                         | `localhost`                                      |
| `KAFKA_BROKERS`         | Kafka 브로커                         | `localhost:9092`                                 |
| `JWT_ACCESS_SECRET`     | JWT 액세스 토큰 시크릿               | -                                                |
| `JWT_REFRESH_SECRET`    | JWT 리프레시 토큰 시크릿             | -                                                |
| `ENCRYPTION_MASTER_KEY` | 거래소 키 암호화 마스터키 (64자 hex) | -                                                |
| `DATA_DIR`              | 데이터 볼륨 경로                     | `/opt/coin/data`                                 |
| `LOG_DIR`               | 로그 볼륨 경로                       | `/opt/coin/logs`                                 |

전체 목록은 [.env.example](.env.example)을 참고하세요.

## Makefile 명령어

```bash
# 초기 세팅
make setup          # env + cert + base image
make cert           # SSL 인증서 생성
make env            # .env 파일 생성

# 개발
make dev            # 개발 환경 시작 (hot-reload)
make dev-down       # 개발 환경 중지
make dev-logs       # 전체 로그
make dev-logs-api   # api-server 로그

# 운영
make prod           # 운영 환경 시작 (이미지 빌드)
make prod-down      # 운영 환경 중지

# 빌드
make build          # 전체 이미지 빌드
make build-api      # api-server만
make build-web      # web만

# 데이터베이스
make db-generate    # Prisma 클라이언트 생성
make db-migrate     # 마이그레이션 실행
make backup-db      # PostgreSQL 백업

# CI/CD
make lint           # 린터 실행
make test           # 테스트 실행
make push           # GHCR 이미지 푸시

# 유틸리티
make ps             # 컨테이너 상태
make clean          # 전체 정리
make help           # 명령어 목록
```

## 배포

### GHCR 이미지 사용 (권장)

```bash
docker compose pull
docker compose up -d
```

### 로컬 빌드

```bash
make prod
```

자세한 배포 가이드는 [cicd/README.md](cicd/README.md)를 참고하세요.

## CI/CD

| 워크플로우           | 트리거            | 동작                 |
| -------------------- | ----------------- | -------------------- |
| `ci.yml`             | PR / push → `dev` | test + build         |
| `build-and-push.yml` | push → `main`     | Docker 이미지 → GHCR |

이미지: `ghcr.io/fray-cloud/coin-{api-server,web,worker-service}:latest`

## API 문서

개발 환경에서 API 문서를 확인할 수 있습니다:

- **Scalar**: `https://localhost/api/scalar`
- **Swagger JSON**: `https://localhost/api/docs-json`

## 라이선스

Private
