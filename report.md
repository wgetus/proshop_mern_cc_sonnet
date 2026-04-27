# M2 — Report

## IDE
- Primary: Claude Code → rules в `CLAUDE.md`
- Secondary: Codex with GPT-5.5

## Rules diff (что добавил руками поверх auto-generated)
- `NODE_ENV` должен быть реальной env-переменной, не только `.env` — runtime quirk ([abe4baf](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/abe4baf)).
- Не переносить JWT в httpOnly cookies — учебный scope, нужен auth-рефакторинг ([339b8e4](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/339b8e4)).
- Backend tests держать в `backend/__tests__/` — Jest-конвенция ([5618c41](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/5618c41)).

## 3 вопроса
- **Сколько заняло бы вручную:** 5–7 часов: env/README/Docker ([00ebd7c](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/00ebd7c), [1099eee](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/1099eee), [3713615](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/3713615)), bug-hunt/docs/tests.
- **Самая магическая функция IDE:** structured bug-hunt: `FINDINGS.md` с 5 рисками; фикс `addOrderItems` ([c0c9394](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/c0c9394)).
- **Где AI сломал и как пофиксил:** char-test падал: CRA preflight нашёл `babel-jest@30.3.0`, root Jest не парсил ESM constants. Пофиксил `SKIP_PREFLIGHT_CHECK=true` и self-contained constants ([5f01a87](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/5f01a87)).

## Nice-to-have (если делал)
- [x] NH-1 `docs/architecture.md` — Mermaid C4 ([cc5d136](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/cc5d136))
- [x] NH-2 ADR × 3 — `docs/adr/0001-*`, `0002-*`, `0003-*` ([c525402](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/c525402))
- [x] NH-3 Characterization tests для `orderDetailsReducer` — reflection ([5f01a87](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/5f01a87))
- [x] NH-4 IDE autogen comparison — секции `Rules diff` и `3 вопроса`

Rules base: [f17b4ad](https://github.com/wgetus/proshop_mern_cc_sonnet/commit/f17b4ad).
