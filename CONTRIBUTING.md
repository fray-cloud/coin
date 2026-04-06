# Contributing Guide

이 문서는 coin 프로젝트의 Git 브랜치 전략, PR 정책, 그리고 협업 규칙을 정의합니다.

---

## 브랜치 구조

| 브랜치             | 목적                    | 보호 여부 |
| ------------------ | ----------------------- | --------- |
| `main`             | 프로덕션 코드           | 보호됨    |
| `dev`              | 통합 개발 브랜치        | 보호됨    |
| `feat/#<이슈번호>` | 기능 개발               | -         |
| `fix/#<이슈번호>`  | 버그 수정               | -         |
| `hotfix/<설명>`    | 긴급 프로덕션 버그 수정 | -         |
| `release/<버전>`   | 릴리스 준비 (선택적)    | -         |

---

## 브랜치 네이밍 규칙

- **기능 개발**: `feat/#<이슈번호>` (예: `feat/#56`)
- **버그 수정**: `fix/#<이슈번호>` (예: `fix/#43`)
- **핫픽스**: `hotfix/<짧은설명>` (예: `hotfix/order-fill-crash`)
- **릴리스**: `release/<semver>` (예: `release/1.2.0`)
- 소문자, 하이픈 사용, 공백 없음

---

## 머지 정책

### feat/fix → dev

- PR 필수
- **최소 1명 리뷰어 승인** 필요
- CI (`ci.yml`) 통과 필수
- **Squash merge** 사용 (커밋 히스토리 정리)

### dev → main

- PR 필수
- **PM 승인 + 관련 팀 리드 최소 1명 승인** 필요
- 모든 CI 파이프라인 (`ci.yml`, `e2e.yml`) 통과 필수
- **Merge commit** 사용 (배포 이력 추적 목적)
- 배포 전 QA Lead 최종 확인

### hotfix → main + dev

- 빠른 리뷰 트랙: 팀 리드 1명 승인으로 진행 가능
- `main`과 `dev` 양쪽에 머지
- 긴급도에 따라 PM이 승인 프로세스 단축 가능

---

## PR 전략

### PR 작성자 규칙

- **feat → dev PR**: 각 기능 **담당 개발자**가 직접 PR 생성 → **팀 리더**가 리뷰 후 승인 또는 반려
  - ❌ 팀 리더가 직접 PR을 만드는 것은 금지
- **dev → main (릴리즈) PR**: PM이 새 릴리즈 이슈 생성 → 릴리즈 실행 → 각 팀 리더 + PM 승인 (Paperclip Approval 흐름) → 머지

### dev → main 릴리즈 프로세스 (Paperclip Approval)

1. PM이 `dev → main` 릴리즈 이슈 생성
2. 릴리즈 실행 (QA 최종 확인 포함)
3. Paperclip Approval 요청: 각 팀 리더 + PM 전체 승인 필요
4. 모든 CI (`ci.yml`, `e2e.yml`) 통과 확인
5. 승인 완료 후 Merge commit으로 `main`에 머지

### PR 제목 형식

```
[feat|fix|hotfix|chore|docs|test] #<이슈번호> 짧은설명
```

예시:

- `[feat] #56 Git 전략 문서화`
- `[fix] #43 주문 처리 버그 수정`
- `[test] #71 MACD 전략 유닛 테스트 추가`
- `[hotfix] 포지션 계산 오류 긴급 수정`

### PR 설명 필수 항목

```markdown
## 변경 사항

- 주요 변경 내용 요약

## 관련 이슈

Closes #<이슈번호>

## 테스트 방법

- 테스트 실행 방법 또는 확인 절차

## 스크린샷 (UI 변경 시)
```

### Draft PR 정책

- 작업 중인 경우 **Draft PR**로 열고, 리뷰 준비 완료 시 "Ready for Review"로 전환
- Draft 상태에서는 리뷰 요청 금지

---

## GitHub Issue / Milestone 동기화 규칙

### 기능 이슈 → GitHub Issue 동기화

- **기능/소스 변경과 관련된 Paperclip 이슈 생성 시** GitHub Issue를 동시에 생성합니다
  - Paperclip `PRO-N` 이슈 생성 → 대응하는 GitHub `#N` Issue 함께 생성
  - 브랜치명은 해당 GitHub Issue 번호를 기준으로: `feat/#N`
- **내부 운영/관리 이슈** (조직 관리, 전략 논의, 회고 등)는 GitHub 동기화 불필요

### Phase 이슈 → GitHub Milestone 동기화

- **새 Phase 시작 시** GitHub 마일스톤 생성 (PM 주도)
- 마일스톤 이름 형식: `Phase <N>: <설명>` (예: `Phase 2: Trading Engine`)
- Phase 하위 이슈들은 해당 Milestone에 포함된 GitHub Issue로 생성
- 모든 하위 이슈 완료 및 `main` 머지 후 마일스톤 닫음

---

## 브랜치 정리 (Branch Cleanup)

### PR 머지 후 브랜치 삭제 원칙

- **feat/fix 브랜치는 PR 머지(승인) 즉시 삭제합니다.**
  - `feat/#N` 또는 `fix/#N` 브랜치가 `dev`에 머지되면 해당 브랜치를 원격 및 로컬에서 삭제합니다.
  - GitHub PR 머지 버튼 하단 "Delete branch" 옵션을 반드시 클릭합니다.
- `main`, `dev` 브랜치는 영구 보호 브랜치로 절대 삭제하지 않습니다.
- `hotfix/*`, `release/*` 브랜치도 `main` 머지 후 즉시 삭제합니다.

### 로컬 브랜치 정리 명령어

```bash
# 원격에 삭제된 브랜치 정리 (origin 동기화)
git fetch --prune

# main 또는 dev에 머지된 로컬 브랜치 목록 확인
git branch --merged origin/main
git branch --merged origin/dev

# 불필요한 로컬 브랜치 삭제
git branch -d feat/#N
```

---

## CI/CD 파이프라인

| 워크플로우           | 트리거            | 목적                       |
| -------------------- | ----------------- | -------------------------- |
| `ci.yml`             | feat/fix → dev PR | 단위/통합 테스트           |
| `e2e.yml`            | dev → main PR     | E2E 테스트                 |
| `build-and-push.yml` | main 머지         | Docker 이미지 빌드 및 푸시 |

**모든 머지는 관련 CI 통과 후에만 진행합니다.**

---

## 커밋 메시지 규칙

```
<type>: <short summary>

[optional body]
```

타입:

- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정, 패키지 업데이트 등
- `refactor`: 리팩토링

---

## 코드 리뷰 가이드라인

- 리뷰어는 **24시간 이내** 응답 목표
- 기능 리뷰 포인트: 로직 정확성, 보안, 성능, 테스트 커버리지
- 승인(Approve) = 머지 가능 상태 동의
- 변경 요청(Request changes) = 재검토 필요
- 코멘트만 = 비차단 피드백

---

## 문의

Git 전략 관련 문의는 PM에게 Paperclip 이슈로 등록해 주세요.
