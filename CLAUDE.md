# NestJS TDD Workflow

Use strict Test-Driven Development for all NestJS tasks.

## Required flow
- Never begin with implementation.
- First, briefly list the test cases you plan to add.
- Then write the tests first.
- Then write the smallest implementation needed to make them pass.
- Do not refactor unrelated code.
- Do not add speculative abstractions.

## Testing rules
- Keep tests concise and high-signal.
- Prefer a small number of meaningful tests over broad noisy coverage.
- Every test should validate one real behavior.
- Always cover:
  - happy path
  - invalid input or failure case
  - important edge case
  - dependency failure / exception path when relevant
- Do not test framework internals.
- Do not test private methods directly.
- Avoid snapshot tests unless explicitly requested.
- Avoid over-mocking.

## NestJS-specific preferences
- Prefer service tests over controller tests unless controller behavior is the requirement.
- Mock only true boundaries:
  - repositories / database
  - external APIs
  - queues
  - caches
  - third-party services
- Do not mock simple business logic.
- Use Nest `TestingModule` only when necessary.
- Assert exact NestJS exception types where relevant.
- Use proper async assertions with `rejects` and `resolves`.

## Minimal test count
Default target per feature:
1. one happy path
2. one invalid input or guard/failure case
3. one important edge case
4. one dependency failure / exception case if relevant

Do not generate excessive repetitive tests.

## Implementation rules
- After tests, write only the minimum code needed to pass.
- Keep implementation simple, explicit, and aligned with existing codebase patterns.
- Do not change unrelated interfaces or structure.

## Response format
For coding tasks:
1. briefly list test cases
2. write tests
3. write implementation

Keep tests and implementation minimal.