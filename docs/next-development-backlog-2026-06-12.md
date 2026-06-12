# 下一阶段开发任务清单（可直接交给 AI 执行）

更新时间：2026-06-12

## 1. 适用说明

这份清单不是产品 brainstorming，而是面向“可以直接开始开发”的执行型 backlog。

每个任务尽量包含：

- 目标
- 当前上下文
- 主要改动范围
- 具体开发要求
- 验收标准
- 最低验证命令

默认前提：

- 当前仓库已经具备完整的信息工作台雏形
- 前端为 `Vue 3`
- API 为 `Node.js`
- 抓取 / 调度为 `Python`
- demo / preview / fallback / mock 已经存在，但仍需要继续收口

推荐执行顺序：

1. `P0`
2. `P1`
3. `P2`

---

## 2. P0 任务

### P0-1 统一 demo 场景定义，减少前后端双份维护

目标：

- 让前端 fallback、API mock、seed 脚本三处 demo 数据尽量共享同一份“场景定义”，至少共享同一套字段和命名。

当前上下文：

- 前端已有 `apps/frontend/src/lib/demo-fixtures.ts`
- 后端已有 `apps/api/src/lib/mock-fixtures.ts`
- seed 脚本已经引入 `scripts/lib/db-seed-helpers.mjs`
- 但三套 demo 数据仍然是并行维护的

主要改动范围：

- `apps/frontend/src/lib/demo-fixtures.ts`
- `apps/api/src/lib/mock-fixtures.ts`
- `scripts/lib/db-seed-helpers.mjs`
- `scripts/db-seed-*.mjs`
- 如有必要，可新增 `docs/` 说明文档

开发要求：

1. 为 demo 场景建立统一的命名约定：
   - theme id
   - source id
   - event id
   - record id
   - run id
2. 统一价格主题、金融事件主题、官方发布主题、内容更新主题的最小字段集。
3. 尽量让前端 fallback 和后端 mock 的主题数量、主题名称、来源名称、最近事件语义一致。
4. 如果无法做真正的跨工程共享，也要做到“结构一致 + 注释说明映射关系”。

验收标准：

- 新增一个 demo 场景时，不需要分别在三套完全不同的数据结构里理解一遍。
- README / scripts/README 中对 demo 数据入口的说明不再歧义。

最低验证命令：

```bash
npm run typecheck
npm run build
node --check scripts/db-seed-demo.mjs
node --check scripts/db-seed-pbc-open-market-demo.mjs
```

---

### P0-2 让 preview 环境支持“真正一键可演示”

目标：

- `npm run preview` 之后，首页、主题中心、事件中心都能看到完整且相互关联的演示数据，不需要手动补脚本。

当前上下文：

- `scripts/preview.sh` 已支持 `db:seed:workbench-demo`
- 但 preview 的真实体验仍可能受到 worker 执行、来源失败、状态残留等影响

主要改动范围：

- `scripts/preview.sh`
- `package.json`
- `scripts/db-seed-*.mjs`
- 必要时补充 `scripts/db-reset-demo.mjs` 或类似 helper

开发要求：

1. 确保 preview 过程中 demo seed 的顺序和 enqueue 顺序稳定。
2. 考虑 preview 反复执行时的数据幂等性。
3. 如果某些 demo 来源不稳定，要保证至少有 fallback 记录 / 事件可展示。
4. 尽量避免 preview 成功启动但页面为空的情况。

验收标准：

- 执行 `npm run preview:prepare` 后，数据库中存在完整 demo 工作台状态。
- 首页中至少能看到：
  - 价格分区
  - 官方发布分区
  - 金融事件分区
  - 最近更新主题

最低验证命令：

```bash
npm run preview:prepare
```

---

### P0-3 统一事件操作后的反馈策略

目标：

- 无论在哪个页面处理事件，操作结果、下一步动作、回首页入口都遵守同一套规则。

当前上下文：

- 事件详情、事件工作台、主题详情已经开始共用 `event-operation-feedback.ts`
- 但还有可能存在个别页面使用旧风格的提示语或旧入口

主要改动范围：

- `apps/frontend/src/views/events/components/event-operation-feedback.ts`
- `apps/frontend/src/views/events/[eventId]/components/*`
- `apps/frontend/src/views/events/components/*`
- `apps/frontend/src/views/themes/[themeId]/components/*`

开发要求：

1. 梳理 `open / tracking / ignored / read / unread / bookmark / unbookmark` 七种动作的统一反馈。
2. 保证每种反馈都至少有：
   - 一句结果说明
   - 一个下一步建议入口
   - 一个返回首页或工作台的入口
3. 清掉仍然保留旧写法的分支。

验收标准：

- 三个页面中，相同动作的结果语义一致。
- 不再出现“某页只有状态变了，没有反馈卡”的情况。

最低验证命令：

```bash
npm --workspace @info-monitor/frontend test -- 'src/views/events/components/event-operation-feedback.test.ts'
npm run typecheck
```

---

## 3. P1 任务

### P1-1 价格主题增加“连续快照对比面板”

目标：

- 在现有跨来源快照之上，增加“最近几轮每个来源价格如何变化”的更集中展示，而不只是卡片里的迷你轨迹。

当前上下文：

- 价格主题详情已经有：
  - 跨来源快照
  - 快照判断
  - 连续快照判断
  - 来源级迷你轨迹

主要改动范围：

- `apps/frontend/src/views/themes/[themeId]/components/`
- `apps/frontend/src/lib/api.ts`
- 相关 model/test 文件

开发要求：

1. 在价格主题详情页增加一个独立板块：
   - 同屏展示多个来源最近几轮价格轨迹
   - 突出最低来源
   - 突出价差扩大 / 收敛
2. 该板块不替代现有快照卡，而是作为更深入的“比较视角”。

验收标准：

- 用户能在主题详情中一眼判断：
  - 哪个来源最近持续更低
  - 哪个来源正在回升
  - 当前价差是扩大还是收敛

最低验证命令：

```bash
npm run typecheck
npm run build
```

---

### P1-2 金融事件主题增加“最近几轮方向节奏板”

目标：

- 把金融事件的方向强化、切换、反复，从卡片文案再提升一层为清晰的节奏板展示。

当前上下文：

- 金融事件主题详情已经有：
  - 快照判断
  - 连续快照判断
  - 最近几轮方向强化 / 切换判断

主要改动范围：

- `apps/frontend/src/views/themes/[themeId]/components/`
- `apps/frontend/src/lib/api.ts`
- 相关 tests

开发要求：

1. 增加一块最近几轮方向板：
   - 最近 3-5 轮方向
   - 金额变化
   - 当前判断（强化 / 切换 / 中性）
2. 文案上保持“轻量辅助判断”，不要越界成投资建议。

验收标准：

- 用户不用读每条记录，也能知道最近几轮流动性方向是不是在连续强化。

最低验证命令：

```bash
npm run typecheck
npm run build
```

---

### P1-3 首页分区支持“查看该主题最近变化链”

目标：

- 从首页分区直接进入某个主题的关键变化链，而不只是跳事件详情或主题详情默认区块。

当前上下文：

- 首页分区已有：
  - 查看本分区事件
  - 查看优先主题
  - 事件卡里的多个跳转

主要改动范围：

- `apps/frontend/src/views/inbox/components/`
- `apps/frontend/src/views/themes/[themeId]/components/`

开发要求：

1. 对价格主题优先跳 `trend` / `compare`
2. 对金融事件主题优先跳 `analysis` / 新节奏板
3. 对官方发布主题优先跳 `timeline` / `analysis`

验收标准：

- 首页分区不只是“看事件”，而是能更直接进入“看变化链”。

最低验证命令：

```bash
npm run typecheck
npm run build
```

---

## 4. P2 任务

### P2-1 统一“来源健康”解释层

目标：

- 让来源状态不只是 `healthy / warning / pending`，而能解释“为什么异常”“会影响什么”。

主要改动范围：

- 来源状态页
- 来源详情页
- 首页来源分区
- 主题详情来源区

开发要求：

1. 针对最近失败、长时间无更新、手动暂停、待运行积压做统一解释层。
2. 给出“影响主题判断的程度”。

---

### P2-2 主题级复盘记录

目标：

- 用户可以在主题详情里留下自己的复盘结论，而不只是看系统摘要。

主要改动范围：

- 主题详情页
- API
- 如需要，新增 DB migration

开发要求：

1. 最小版本支持：
   - 记录一段复盘文本
   - 标记更新时间
2. 后续可扩展：
   - 复盘标签
   - 阶段状态

---

### P2-3 事件有效性反馈

目标：

- 给未来规则优化积累反馈数据，让系统知道哪些提醒对你真有用。

主要改动范围：

- 事件详情
- 事件工作台
- API
- DB（可能需要 migration）

开发要求：

1. 最小版本支持：
   - 有价值
   - 噪音
   - 待观察
2. 不要求立即形成自动学习闭环，但要先把反馈记录住。

---

## 5. 当前不建议继续扩的方向

以下方向当前不建议优先继续开发：

- 多用户
- 权限体系
- 通用规则 DSL
- 复杂图表平台
- 完整通知中心产品化
- 大规模无代码配置
- 复杂舆情分析
- 自动交易 / 自动执行

原因：

- 当前最关键的是把“你自己真的会长期使用”的工作台做稳
- 当前最有价值的沉淀仍然是：
  - 真实数据链路
  - 历史与变化
  - 少量但可信的判断

---

## 6. AI 执行建议

如果把这份清单交给 AI，推荐按下面顺序执行：

1. `P0-1`
2. `P0-2`
3. `P0-3`
4. `P1-1`
5. `P1-2`
6. `P1-3`

每个任务都应要求 AI：

- 先读相关文件
- 实际改代码，不只给方案
- 跑最小必要验证
- 汇报未验证风险

如果当前目标是“尽快继续开发而不回头反复改文档”，这份 backlog 已经可以直接作为下一阶段开发输入。
