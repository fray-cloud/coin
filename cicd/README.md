# 배포 가이드

## VPS 초기 세팅

### 1. Docker 설치

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. 프로젝트 클론

```bash
git clone https://github.com/fray-cloud/coin.git /opt/coin
cd /opt/coin
```

### 3. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 운영 환경에 맞게 수정
```

### 4. SSL 인증서 생성

```bash
make cert
```

### 5. 디렉토리 생성

```bash
make init-dirs
```

## 배포 방법

### 방법 1: 수동 배포 (VPS에서 직접)

```bash
cd /opt/coin
docker compose pull
docker compose up -d --remove-orphans
```

### 방법 2: 로컬에서 SSH 배포

```bash
make deploy
# 또는
bash cicd/deploy.sh <VPS_HOST> <VPS_USER>
```

### 방법 3: GitHub Actions (VPS 구매 후)

1. `cicd/deploy.yml`을 `.github/workflows/deploy.yml`로 이동
2. GitHub Settings → Secrets에 추가:
   - `VPS_HOST`: VPS IP 또는 호스트명
   - `VPS_USER`: SSH 사용자명
   - `VPS_SSH_KEY`: SSH 개인키
3. GitHub Settings → Environments에 `production` 생성 (승인 게이트 설정)

## 롤백

```bash
# 특정 버전으로 롤백
docker compose pull ghcr.io/fray-cloud/coin-api-server:<sha>
docker compose up -d
```

## GitHub Secrets 목록

| Secret        | 용도                | 시점         |
| ------------- | ------------------- | ------------ |
| `TURBO_TOKEN` | Vercel Remote Cache | CI 즉시 필요 |
| `TURBO_TEAM`  | Vercel Remote Cache | CI 즉시 필요 |
| `VPS_HOST`    | VPS IP/호스트       | VPS 구매 후  |
| `VPS_USER`    | SSH 사용자          | VPS 구매 후  |
| `VPS_SSH_KEY` | SSH 개인키          | VPS 구매 후  |
