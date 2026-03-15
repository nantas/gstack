# gstack 增加 Codex 支持 Handoff（方案 B）

- 日期: 2026-03-15
- 当前状态: 仅完成现状审计与替代能力收集，未开始实现代码改造
- 目标方案: B（双轨）
- 目标仓库: `/Volumes/Shuttle/projects/agentic/gstack`
- 参考对照仓库: `/Volumes/Shuttle/projects/agentic/codex`

## TL;DR

本次迁移建议采用双轨：

1. 交互轨: 保留/适配交互式提问能力（从 `AskUserQuestion` 迁移为 Codex 语义下的 `request_user_input`）。
2. 自动化轨: E2E/CI 一律走 `codex exec --json --ephemeral`，不依赖交互审批或提问。

核心原因：

- `codex exec` 在非交互模式下会拒绝交互审批与 `request_user_input`。
- gstack 现有工作流高度依赖 `AskUserQuestion` 与 Claude CLI `claude -p --output-format stream-json --verbose` 协议。

## 已确认的关键事实

## gstack 现状绑定点（Claude 专属）

- 工作流模板广泛绑定 `AskUserQuestion` 与 Claude 风格 `allowed-tools`。
  - 证据: `plan-ceo-review/SKILL.md.tmpl`, `plan-eng-review/SKILL.md.tmpl`, `review/SKILL.md.tmpl`, `ship/SKILL.md.tmpl`
- 统一前置逻辑硬编码 `.claude/skills/gstack` 路径。
  - 证据: `scripts/gen-skill-docs.ts` 中 `generateUpdateCheck()` 与 `generateBrowseSetup()`
- 评测执行强耦合 `claude -p` 协议与参数。
  - 证据: `test/helpers/session-runner.ts`, `test/skill-e2e.test.ts`
- LLM judge 强耦合 Anthropic SDK 与 `ANTHROPIC_API_KEY`。
  - 证据: `test/helpers/llm-judge.ts`, `package.json`
- 安装流程仅对 `.claude/skills` 生态做注册。
  - 证据: `setup`

## Codex 可替代能力（对照 codex 仓库）

- 非交互执行入口：`codex exec`（支持参数 prompt 或 stdin）。
  - 证据: `codex-rs/README.md`, `codex-rs/exec/src/cli.rs`, `codex-rs/exec/src/lib.rs`
- 机器可读输出：`--json` 为 JSONL 事件流（`thread.started`, `turn.*`, `item.*`）。
  - 证据: `codex-rs/exec/src/lib.rs`, `codex-rs/exec/src/exec_events.rs`, `codex-rs/exec/src/event_processor_with_jsonl_output.rs`
- 沙箱与权限：`--sandbox`、`--full-auto`、`--dangerously-bypass-approvals-and-sandbox`。
  - 证据: `codex-rs/exec/src/cli.rs`, `codex-rs/exec/src/lib.rs`
- 会话恢复与持久化：支持 resume；`--ephemeral` 关闭 rollout 落盘。
  - 证据: `codex-rs/exec/src/lib.rs`, `codex-rs/core/src/codex.rs`, `codex-rs/exec/tests/suite/ephemeral.rs`
- 关键限制：`exec` 模式明确拒绝交互审批与 `request_user_input`。
  - 证据: `codex-rs/exec/src/lib.rs` 的 `handle_server_request` 分支

## 目标架构（方案 B）

## 设计原则

- 提供统一 Runner 抽象，隔离 provider 协议差异。
- 交互逻辑与自动化逻辑分离，避免在 CI 中出现“等待用户输入”。
- 先确保 E2E 可跑通，再做模板与文档语义全面替换。
- 迁移期间保留 Claude fallback 开关，支持快速回滚。

## 双轨定义

- 轨道 1（交互）:
  - 面向日常对话使用。
  - 问题决策可用 `request_user_input`（非 exec 路径）。
- 轨道 2（自动化）:
  - 面向测试和批处理。
  - 固定使用 `codex exec --json --ephemeral`。
  - 所有流程必须在“不可提问”条件下收敛。

## 分阶段执行清单

## Phase 0: 预备与保护

- [ ] 新增 provider 开关（建议环境变量 `GSTACK_AGENT_PROVIDER=claude|codex`）。
- [ ] 为现有 `claude` 路径保留不变行为，确保可对比回归。
- [ ] 为迁移分支准备最小 smoke case（`/review` 与 `/qa quick`）。

## Phase 1: Runner 抽象层

- [ ] 抽象出统一 `AgentRunner` 接口（输入 prompt、输出标准化事件与最终结果）。
- [ ] 将现有 `test/helpers/session-runner.ts` 拆成：
  - `claude-runner.ts`
  - `codex-runner.ts`
  - `runner-types.ts`（统一中间模型）
- [ ] 在不改测试语义前提下让 `skill-e2e.test.ts` 通过接口调用。

建议优先改动文件：

- `test/helpers/session-runner.ts`
- `test/skill-e2e.test.ts`
- `ARCHITECTURE.md`（runner 层说明）

## Phase 2: Codex JSONL 适配

- [ ] 新增 `codex-runner`，执行命令模板：

```bash
codex exec \
  -C "<repo>" \
  -s danger-full-access \
  --ephemeral \
  --json \
  -c "projects.\"<repo>\".trust_level=\"trusted\"" \
  "<prompt>"
```

- [ ] 解析 `ThreadEvent` JSONL，映射到 gstack 当前统计字段：
  - `toolCalls`
  - `exitReason`
  - `transcript`
  - `duration`
  - `output`
- [ ] 明确 `turn.failed` / `error` 与进程退出码的优先级。

建议新增文件：

- `test/helpers/codex-jsonl-parser.ts`
- `test/helpers/codex-runner.ts`

## Phase 3: 工作流模板 provider 化

- [ ] 把模板中的 Claude 特有词汇最小化参数化：
  - `AskUserQuestion` -> 语义占位（交互轨可映射为 `request_user_input`，自动化轨改默认决策）
  - `.claude/skills/...` -> provider/path 占位
- [ ] 生成器新增 provider-aware 占位注入（先兼容，不一次性大改所有文案）。
- [ ] 先改高影响模板：
  - `review/SKILL.md.tmpl`
  - `ship/SKILL.md.tmpl`
  - `qa/SKILL.md.tmpl`

建议改动文件：

- `scripts/gen-skill-docs.ts`
- `SKILL.md.tmpl`
- `review/SKILL.md.tmpl`
- `ship/SKILL.md.tmpl`
- `qa/SKILL.md.tmpl`

## Phase 4: 安装与路径生命周期

- [ ] `setup` 增加 `.codex/skills` 生态支持（并保留 `.claude/skills`）。
- [ ] README/BROWSER 文档新增 Codex 安装与故障排查段落。
- [ ] 升级检查逻辑去除单一路径假设。

建议改动文件：

- `setup`
- `README.md`
- `BROWSER.md`
- `scripts/gen-skill-docs.ts`

## Phase 5: 评测层解耦

- [ ] 将 LLM judge provider 解耦（不再默认 Anthropic）。
- [ ] 至少确保 Codex E2E 先可跑（judge 可暂时维持原 provider 并标注兼容策略）。
- [ ] 新增脚本：
  - `test:e2e:codex`
  - 可选 `test:evals:codex`

建议改动文件：

- `test/helpers/llm-judge.ts`
- `package.json`
- `AGENTS.md`

## Phase 6: 发布与回滚

- [ ] 先灰度：默认 `claude`，显式开启 `codex`。
- [ ] 连续通过 N 次 E2E 后再切默认 provider。
- [ ] 保留快速回滚开关至稳定版本后。

## 验收标准

- [ ] `test:e2e:codex` 可在无人工交互下稳定通过核心场景。
- [ ] `/review` 与 `/qa quick` 在 codex 轨道可输出结构化结果。
- [ ] 关键模板不再写死 `.claude/skills/...`。
- [ ] 自动化轨道中不出现等待 `AskUserQuestion` 或等价交互阻塞。
- [ ] 失败时可通过统一事件模型定位到最后一步工具调用。

## 风险与应对

- 风险: `exec` 禁止交互审批/提问导致流程中断。
  - 应对: 自动化轨禁用提问路径，使用确定性默认策略。
- 风险: JSON 事件模型差异导致统计字段失真。
  - 应对: 建立中间事件模型并补 parser 单测。
- 风险: 文档模板大面积改动引入漂移。
  - 应对: 先高影响模板，逐步替换，保留 dry-run 校验。

## 新 Session 建议起手动作

1. 新建分支并实现 Phase 1（Runner 抽象，不改业务语义）。
2. 落地 `codex-runner` + JSONL parser，并让一条最小 E2E 跑通。
3. 再进入模板 provider 化（Phase 3）。

建议开场命令：

```bash
git checkout -b feat/codex-support-dual-track
bun test test/helpers/ --watch
```

## 说明

- 本 handoff 文档聚焦“新 session 可继续执行”的最小充分上下文。
- 目前尚未提交任何功能代码改动；仅新增本计划文档。
