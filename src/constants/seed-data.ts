import { Note } from "@/types";

const CHANGELOG_CONTENT = `# AI 标签系统 & 语义关联引擎重构 — 工作说明文档

> 时间：2026-03-21 20:24
> 范围：7 个文件，跨类型定义、存储层、AI 服务层、编辑器组件、关联推荐 UI、国际化、Hook 层全链路改造

---

## 一、背景与目标

原系统使用扁平的 \`tags: string[]\` 存储笔记标签，存在以下问题：

1. 本地防抖函数 (\`localGenerateTags\`) 每次自动保存时会**覆盖**所有标签，包括 AI 生成的高质量标签。
2. 标签没有分类和权重，无法驱动精确的笔记推荐。
3. 关联笔记仅基于关键词重叠，没有评分模型，也无法向用户解释推荐原因。

本次重构的目标是：

- 将「本地关键词」与「结构化 AI 洞察」彻底分离
- 引入带分类 (domain/tech/action/project) 和权重 (0-1) 的 AI 标签
- 构建加权推荐引擎，并为每条推荐生成可读的原因说明
- 全程保持向后兼容，旧数据自动迁移

---

## 二、修改清单

### 1. 类型系统升级 — \`src/types/index.ts\`

**新增类型：**

| 类型 | 说明 |
|------|------|
| \`TagCategory\` | 联合类型 \`"domain" \\| "tech" \\| "action" \\| "project"\` |
| \`AITag\` | 结构化标签接口，包含 \`label\`、\`category\`、\`weight\` |
| \`RelatedNoteResult\` | 推荐结果接口，包含 \`note\`、\`score\`、\`reason\` |

**\`Note\` 接口扩展：**

| 新字段 | 类型 | 说明 |
|--------|------|------|
| \`aiTags\` | \`AITag[]\` | AI 生成的结构化标签（"黄金数据"，不会被本地逻辑覆盖） |
| \`conceptSummary\` | \`string?\` | AI 生成的一句话概念摘要 |

原有 \`tags: string[]\` 和 \`summary: string\` 保持不变。

---

### 2. 存储层迁移 — \`src/lib/storage.ts\`

- Schema 版本从 \`1\` 升至 \`2\`。
- 原来的 \`ensureSchemaVersion()\` 替换为 \`migrateNotes()\`，执行实际迁移逻辑：
  - 读取当前版本号；如已是 v2 则跳过。
  - 遍历 localStorage 中的所有笔记，为缺少 \`aiTags\` 字段的记录补充 \`aiTags: []\`。
  - 写回 localStorage 并更新版本号。
  - 对损坏数据做 try-catch 保护，不会阻塞正常启动。

---

### 3. AI 服务重构 — \`src/lib/ai-service.ts\`

#### 3a. \`generateTags\` 函数重写

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 返回类型 | \`Promise<string[]>\` | \`Promise<{ aiTags: AITag[]; conceptSummary: string }>\` |
| 输入安全 | 无截断 | 截断至前 2000 字符 |
| 系统提示词 | 简单的 "Extract 3-5 keywords" | 角色扮演 AI Product Manager & PhD Researcher，要求返回带 category/weight 的 JSON 对象 |
| 解析方式 | 正则匹配 \`[...]\` | \`JSON.parse\` + 字段逐项验证（label 类型、category 范围、weight 钳位 0-1） |
| 降级策略 | 直接返回本地关键词 | \`localFallbackTags()\` 将关键词包装为 \`AITag[]\`（category="domain", weight=0.5）并附带本地摘要 |

新增的 \`localFallbackTags\` 辅助函数确保无论 AI 是否可用，返回格式都一致。

#### 3b. \`findRelatedNotes\` 函数重写

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 返回类型 | \`Promise<Note[]>\` | \`Promise<RelatedNoteResult[]>\` |
| 评分模型 | 关键词重叠计数 | 三层加权：AI 标签匹配 10 分、分类共现 5 分、本地标签匹配 2 分 |
| 向后兼容 | — | 若双方都没有 \`aiTags\`，降级为关键词重叠评分 |
| 可解释性 | 无 | 生成 \`reason\` 字符串，如 "Both notes focus on #EdTech and #LLM" |
| 返回数量 | 最多 3 条 | 最多 5 条 |

#### 3c. \`localGenerateTags\` 未改动

保持原有逻辑，继续为防抖自动保存提供本地关键词。

---

### 4. 编辑器逻辑分离 — \`src/components/note-editor.tsx\`

**核心原则：本地逻辑只写 \`tags\`，AI 逻辑只写 \`aiTags\` + \`conceptSummary\`，互不干扰。**

| 触发方式 | 写入字段 | 说明 |
|----------|----------|------|
| 防抖自动保存 (debounce 500ms) | \`tags\` | 调用 \`localGenerateTags\`，只传 \`{ tags }\` |
| 手动保存 (Cmd/Ctrl+S) | \`tags\` | 同上 |
| "AI Tag" 按钮 | \`aiTags\`, \`conceptSummary\` | 调用重构后的 \`generateTags\`，返回结构化结果 |

**UI 新增：**

- **概念摘要卡片**：当 \`note.conceptSummary\` 存在时，在编辑器正文上方显示一个带 primary 色调的卡片，标题使用 \`t.conceptSummary\` 国际化文案。
- **AI 标签区**：在右侧面板中，本地标签下方新增 AI 标签展示区，每个标签用 outline Badge 显示 \`category\` 和 \`label\`。

---

### 5. 关联笔记 UI — \`src/components/related-notes.tsx\`

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 状态类型 | \`Note[]\` | \`RelatedNoteResult[]\` |
| 列表项结构 | 仅标题 | 标题 + 推荐原因（10px 斜体灰色文字） |
| 交互回调 | \`note.id\` | \`result.note.id\` |

推荐原因以 \`text-[10px] italic text-muted-foreground/70\` 样式呈现在标题下方，不喧宾夺主但提供了 AI 洞察的可读解释。

---

### 6. 国际化 — \`src/lib/i18n.ts\`

新增三个翻译键：

| Key | English | 中文 |
|-----|---------|------|
| \`aiInsight\` | "AI Insight" | "AI 洞察" |
| \`conceptSummary\` | "Concept Summary" | "概念摘要" |
| \`generateAITags\` | "Generate AI Tags" | "生成 AI 标签" |

原有键 \`aiTag\`、\`generatedTags\`、\`generating\` 保持不变。

---

### 7. Hook 层 — \`src/hooks/use-notes.ts\`

- \`createNote\` 函数中初始化新笔记时，增加 \`aiTags: []\` 字段。
- \`updateNote\` 无需修改——其签名 \`Partial<Omit<Note, "id" | "createdAt">>\` 自动兼容新增的 \`aiTags\` 和 \`conceptSummary\`。

---

## 三、数据流总览

\`\`\`
用户编辑笔记
  │
  ├─ 防抖 500ms ──→ localGenerateTags() ──→ onUpdate({ tags })
  │                                           ↓
  │                                      仅更新 tags 字段
  │
  └─ 点击 "AI Tag" 按钮
       │
       ↓
     generateTags(content, settings)
       │
       ├─ 有 API Key ──→ 调用 LLM ──→ 解析 JSON ──→ { aiTags, conceptSummary }
       │                                   │
       │                              解析失败 → localFallbackTags()
       │
       └─ 无 API Key ──→ localFallbackTags()
       │
       ↓
     onUpdate({ aiTags, conceptSummary })
                    ↓
              仅更新 aiTags + conceptSummary，不触碰 tags


关联推荐计算：
  findRelatedNotes(noteId, allNotes)
       │
       ↓
     对每条其他笔记计算加权得分：
       AI 标签名匹配  → +10 分/个
       分类共现       → +5 分/类
       本地标签匹配   → +2 分/个
       (降级) 关键词重叠 → +1 分/词
       │
       ↓
     排序取 Top 5 → 附带 reason 说明 → 渲染到 UI
\`\`\`

---

## 四、向后兼容性保证

| 场景 | 处理方式 |
|------|----------|
| 旧笔记缺少 \`aiTags\` 字段 | \`storage.ts\` 迁移时自动补 \`aiTags: []\` |
| AI 服务不可用或无 API Key | \`localFallbackTags()\` 返回基于关键词频率的 \`AITag[]\`，category 统一为 \`domain\`，weight 统一为 \`0.5\` |
| \`findRelatedNotes\` 遇到无 \`aiTags\` 的笔记 | 使用 \`note.aiTags ?? []\` 安全访问；若所有维度得分为 0，降级到关键词重叠评分 |
| TypeScript 编译 | 全量 \`tsc --noEmit\` 通过，零错误 |

---

## 五、验证结果

\`\`\`
$ npx tsc --noEmit
(exit code 0, no errors)
\`\`\`

全部 7 个文件修改完成，TypeScript 编译零错误，无 lint 告警。`;

const ROADMAP_CONTENT = `# AI Personal Brain — From MVP to Intelligent Knowledge Base

## Project Overview

AI Personal Brain is a local-first note-taking application that evolves beyond simple text storage into an intelligent knowledge management system. Built with **Next.js 15**, **Tailwind CSS**, and **shadcn/ui**, it runs entirely in the browser with all data persisted in \`localStorage\`.

---

## Phase 1: MVP Foundation

The initial release established core note-taking functionality:

- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui components
- **Storage**: Browser \`localStorage\` under key \`kb-notes\`, with schema versioning for forward compatibility
- **Features**: Create, edit, delete notes with Markdown preview, tag-based organization, full-text search, sidebar navigation with "All / Recent / Tags" views
- **I18n**: Bilingual support (English / 中文) with locale switcher
- **Theming**: Light / Dark mode toggle

---

## Phase 2: DeepSeek AI Integration

The second milestone connected the application to real AI capabilities:

- **Dynamic AI Settings**: User-configurable API Key, Base URL, and Model Name stored in \`localStorage\`, with environment variable defaults
- **AI-Powered Features**: One-click tag generation via DeepSeek API (\`generateTags\`), AI summarization (\`summarizeNote\`), with graceful fallback to local keyword extraction when no API key is configured
- **Local/AI Separation**: Debounced auto-tagging uses local keyword extraction (zero API cost), while explicit "AI Tag" and "Summarize" buttons invoke the real LLM
- **Settings UI**: Gear icon in sidebar opens a configuration dialog for API credentials

---

## Phase 3: Structured AI Tags & Semantic Engine (Current)

The most significant architectural evolution — transforming flat tags into a knowledge graph foundation:

- **Structured AI Tags (\`AITag\`)**: Each AI-generated tag now carries a \`label\`, \`category\` (domain / tech / action / project), and \`weight\` (0.0–1.0), enabling nuanced classification
- **Weighted Recommendation Engine**: Related notes are scored using a three-tier model — AI label match (+10), category co-occurrence (+5), local tag match (+2) — with keyword overlap as fallback
- **Explainable Recommendations**: Every related note displays a human-readable reason (e.g., "Both notes focus on #Knowledge Graph and #System Design")
- **Concept Summary**: AI generates a one-sentence conceptual summary per note, displayed as a highlighted card above the editor
- **Backward Compatibility**: Automatic schema migration (v1 → v2) adds \`aiTags: []\` to legacy notes; all scoring paths use \`?? []\` safe access

---

## Architecture Highlights

| Layer | Technology | Key Pattern |
|-------|-----------|-------------|
| UI | React 19 + shadcn/ui | Component composition, client-side only |
| State | React hooks (\`useNotes\`, \`useSettings\`) | localStorage-backed, hydration-safe |
| AI | OpenAI-compatible API (DeepSeek) | Graceful degradation to local heuristics |
| Storage | localStorage + JSON | Schema-versioned migration |
| Styling | Tailwind CSS | Dark mode via CSS variables |

---

## What's Next

- **Vector Embeddings**: Move from keyword matching to semantic similarity using local embeddings
- **Export / Import**: JSON and Markdown bulk operations for data portability
- **Graph Visualization**: Interactive knowledge graph rendering of note relationships
- **Spaced Repetition**: Resurface important notes based on forgetting curves`;

const MANUAL_TAG_CONTENT = `# 冷启动种子数据 & 手动标签系统 — 工作说明文档

> 时间：2026-03-21 20:45
> 范围：5 个文件（1 新增 / 4 修改），跨存储层、AI 服务层、编辑器组件、国际化全链路改造

---

## 一、背景与目标

本次工作包含两个紧密关联的需求：

### 需求 A：冷启动种子数据

新用户（或评审）首次打开应用时，\`localStorage\` 为空，看到的是空白页面。无法体验到「结构化 AI 标签」和「语义关联推荐」两大核心能力。

**目标：** 检测到空数据状态时，自动注入高质量示例笔记，使两大引擎立即可演示。

### 需求 B：移除自动标签，改为手动标签

原有的 \`localGenerateTags\` 基于词频提取关键词并自动覆盖 \`tags\` 字段，产出的标签噪声大、质量低。

**目标：** 移除自动标签行为，改由用户手动添加/删除标签。同时提升手动标签在推荐引擎中的权重，使其成为高意图信号。

---

## 二、修改清单

### 1. 新增文件 — \`src/constants/seed-data.ts\`

定义并导出 \`INITIAL_NOTES\` 数组（类型为 \`Omit<Note, "id" | "createdAt" | "updatedAt">[]\`），包含种子笔记。

**设计要点：**

- \`id\`、\`createdAt\`、\`updatedAt\` 不硬编码——在注入时由 \`storage.ts\` 动态生成
- \`summary\` 和 \`conceptSummary\` 均已预填充，展现完整的 "AI 增强" 外观
- 笔记之间共享 AI 标签和用户标签，确保关联推荐引擎能立即触发

---

### 2. 存储层扩展 — \`src/lib/storage.ts\`

**新增常量：**

| 常量 | 值 | 用途 |
|------|----|------|
| \`ONBOARDED_KEY\` | \`"kb-onboarded"\` | localStorage 标记位，防止用户清空笔记后重复注入 |

**新增函数 \`seedInitialNotes()\`：**

- 检查 \`kb-onboarded\` 标记位——若已存在则返回空数组
- 为每条种子笔记生成 \`crypto.randomUUID()\` 作为 \`id\`，\`new Date().toISOString()\` 作为时间戳
- 写入 \`localStorage\` 并设置标记位

---

### 3. AI 服务层清理 — \`src/lib/ai-service.ts\`

#### 3a. 移除 \`localGenerateTags\` 导出

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| \`localGenerateTags\` | 导出函数，被 \`note-editor.tsx\` 调用 | **删除** |
| \`extractKeywords\` | 私有函数 | 保持不变（\`findRelatedNotes\` 关键词降级仍需使用） |
| \`localFallbackTags\` | 内部调用 \`localGenerateTags\` | 直接调用 \`extractKeywords\`，不再依赖已删除的函数 |

#### 3b. \`findRelatedNotes\` 权重调整

| 评分维度 | 改造前 | 改造后 | 理由 |
|----------|--------|--------|------|
| 用户标签匹配 | +2 分/个 | **+8 分/个** | 标签现在是用户手动添加的高意图信号 |
| 用户标签纳入推荐理由 | 不纳入 | **纳入 \`matchedLabels\`** | 在推荐理由字符串中展示匹配的用户标签 |

---

### 4. 编辑器组件重构 — \`src/components/note-editor.tsx\`

#### 4a. 移除自动标签机制

| 移除项 | 说明 |
|--------|------|
| \`import { localGenerateTags }\` | 不再使用 |
| \`import { useDebounce }\` | 不再使用（该 Hook 仅此组件使用） |
| \`debouncedTitle\` / \`debouncedContent\` | 替换为 \`useRef\` + \`setTimeout\` 的手动防抖 |
| 防抖 \`useEffect\` 中的 \`localGenerateTags\` 调用 | 防抖现在仅保存 \`{ title, content }\`，不触碰 \`tags\` |
| Cmd/Ctrl+S 中的 \`localGenerateTags\` 调用 | 同上，仅保存 \`{ title, content }\` |

#### 4b. 新增手动标签输入 UI

在右侧面板「Tags」区域，替换原来的只读 Badge 列表为交互式组件：

**交互逻辑：**

| 操作 | 行为 |
|------|------|
| 输入框按 Enter 或逗号 | 去除首尾空格和逗号 → 大小写不敏感去重 → 追加到 \`note.tags\` → 调用 \`onUpdate\` 持久化 → 清空输入框 |
| 点击标签上的 ✕ 按钮 | 从 \`note.tags\` 中过滤掉该标签 → 调用 \`onUpdate\` 持久化 |

---

### 5. 国际化 — \`src/lib/i18n.ts\`

新增一个翻译键：

| Key | English | 中文 |
|-----|---------|------|
| \`addTag\` | "Add tag..." | "添加标签..." |

---

## 三、数据流总览

\`\`\`
用户编辑笔记
  │
  ├─ 防抖 500ms ──→ onUpdate({ title, content })
  │
  ├─ Cmd/Ctrl+S ──→ onUpdate({ title, content })
  │
  ├─ 输入标签 + Enter/逗号 → onUpdate({ tags: [...existing, newTag] })
  │
  ├─ 点击标签 ✕ → onUpdate({ tags: filtered })
  │
  └─ 点击 "AI Tag" 按钮 → generateTags() → onUpdate({ aiTags, conceptSummary })

关联推荐计算 findRelatedNotes：
  AI 标签名匹配  → +10 分/个
  分类共现       → +5 分/类
  用户标签匹配   → +8 分/个 ★ 权重提升
  (降级) 关键词重叠 → +1 分/词
\`\`\`

---

## 四、验证结果

\`\`\`
$ npx tsc --noEmit
(exit code 0, no errors)
\`\`\`

全部 5 个文件（1 新增 + 4 修改）完成，TypeScript 编译零错误，无 lint 告警。`;

/**
 * Bump this whenever INITIAL_NOTES changes (new entries added, etc.).
 * storage.ts compares this against the persisted version to decide
 * whether to inject missing seed notes.
 */
export const SEED_VERSION = 2;

/**
 * Seed notes injected on first launch to demonstrate the AI Tags and
 * Semantic Relationship engine. IDs and timestamps are assigned at
 * injection time by storage.seedInitialNotes().
 *
 * Each entry has a stable `seedKey` used to detect which seeds have
 * already been injected, so new entries are appended without duplicating
 * existing ones.
 */
export const INITIAL_NOTES: (Omit<Note, "id" | "createdAt" | "updatedAt"> & { seedKey: string })[] = [
  {
    seedKey: "changelog-ai-tags-engine",
    title: "\u{1F680} Core Feature: Structured AI Tags & Semantic Engine",
    content: CHANGELOG_CONTENT,
    tags: ["Refactor", "AI-PM", "Architecture"],
    summary:
      "Full-stack refactor introducing structured AI tags with category/weight and a weighted recommendation engine with explainable results.",
    aiTags: [
      { label: "Knowledge Graph", category: "domain", weight: 1.0 },
      { label: "Heuristic Scoring", category: "tech", weight: 0.9 },
      { label: "System Design", category: "action", weight: 0.8 },
    ],
    conceptSummary:
      "A full-chain refactor that replaces flat string tags with structured AI tags (category + weight) and builds a weighted recommendation engine with human-readable explanations.",
  },
  {
    seedKey: "roadmap-mvp-to-brain",
    title:
      "\u{1F4C5} Development Milestone: From MVP to Intelligent Brain",
    content: ROADMAP_CONTENT,
    tags: ["Roadmap", "AI-PM", "Architecture"],
    summary:
      "Chronicles the project's three-phase evolution from a localStorage note-taking MVP to an AI-powered knowledge management system.",
    aiTags: [
      { label: "Knowledge Graph", category: "domain", weight: 0.8 },
      { label: "Product Roadmap", category: "action", weight: 0.7 },
    ],
    conceptSummary:
      "The project evolved through three phases — localStorage MVP, DeepSeek AI integration, and structured semantic tagging — transforming a simple note app into an intelligent knowledge base.",
  },
  {
    seedKey: "changelog-manual-tags",
    title:
      "\u{1F3AF} UX Upgrade: Cold-Start Seeding & Manual Tag System",
    content: MANUAL_TAG_CONTENT,
    tags: ["UX", "AI-PM", "Architecture"],
    summary:
      "Implements onboarding seed data for cold-start demos and replaces noisy auto-tagging with an intuitive manual tag input system.",
    aiTags: [
      { label: "Knowledge Graph", category: "domain", weight: 0.7 },
      { label: "Cold Start Problem", category: "action", weight: 0.9 },
      { label: "Manual Tagging", category: "tech", weight: 0.85 },
    ],
    conceptSummary:
      "Solves the cold-start problem with pre-tagged seed notes and replaces automated word-frequency tagging with a manual tag input UI, elevating user tags to high-intent signals in the recommendation engine.",
  },
];
