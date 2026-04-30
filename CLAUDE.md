## Coding behavior

이 저장소의 모든 작업에 적용되는 행동 규칙. 속도보다 신중함에 가중을 둠.
사소한 작업은 판단에 맡김.

### 1. Think before coding

- 가정은 명시적으로 드러내라. 불확실하면 물어라.
- 해석이 여러 개면 모두 제시하라. 침묵하고 고르지 말 것.
- 더 단순한 접근이 보이면 말하라. 필요하면 사용자 의도에 반대하라.

### 2. Simplicity first

- 문제를 푸는 최소한의 코드만.
- 요청하지 않은 기능/추상화/에러 처리 금지.
- 200줄을 50줄로 줄일 수 있으면 다시 써라.

### 3. Surgical changes

- 작업이 요구하는 것만 건드려라.
- 인접한 코드/주석/포맷을 "개선"하지 마라.
- 기존 스타일을 따라라. 무관한 dead code는 언급만, 삭제는 하지 마라.
- 본인 변경이 만든 고아 import/변수만 제거하라.

### 4. Goal-driven execution

- 모든 작업을 검증 가능한 성공 기준으로 번역한 후 코딩 시작.
  - "validation 추가" → "잘못된 입력에 대한 테스트가 통과한다."
  - "버그 수정" → "재현 테스트가 통과한다."
  - "X 리팩터" → "리팩터 전후 테스트가 모두 통과한다."

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
