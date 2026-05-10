# 学科知识整合智能体 — 设计规格文档

> **项目**：AI 全栈极速黑客松 — 学科知识整合智能体
> **日期**：2026-05-10
> **状态**：设计完成，待实现

---

## 1. 项目概述

### 1.1 目标

开发一个 AI 智能体，对 7 本医学教材进行知识整合：自动解析多格式教材、构建可视化知识图谱、跨教材去重提纯、基于整合知识库的 RAG 精准问答，并支持教师通过多轮对话修改整合方案。

### 1.2 输入数据

7 本医学教材（PDF 格式），总计 ~843MB：

| 教材 | 页数 | 平均文字/页 | 平均图片/页 | 特征 |
|---|---|---|---|---|
| 01_局部解剖学 | 305 | 1000 字 | 1.4 张 | 大量解剖结构图 |
| 02_组织学与胚胎学 | 319 | 1265 字 | 2.4 张 | 显微镜切片图 |
| 03_生理学 | 450 | 1254 字 | 9.4 张 | 图表极多 |
| 04_医学微生物学 | 386 | 1687 字 | 0.4 张 | 几乎纯文字 |
| 05_病理学 | 418 | 1459 字 | 1.4 张 | 病理切片图 |
| 06_传染病学 | 398 | 1117 字 | 0.8 张 | 几乎纯文字 |
| 07_病理生理学 | 291 | 893 字 | 1.2 张 | 文字为主 |

**关键发现**：全部 7 本均为真正的文字 PDF（非扫描件），每页平均 900-1700 字文字内容。图片是嵌入的图表/解剖图，纯文本提取可覆盖大部分知识。

### 1.3 评分维度

| 维度 | 分值 | 优先级 |
|---|---|---|
| B. 功能实现完整度 | 25 分 | 最高 |
| D. Agent 架构设计 | 20 分 | 最高 |
| E. 代码质量与工程规范 | 17 分 | 高 |
| A. 文档完整性与可复现性 | 15 分 | 高 |
| C. 知识图谱可视化创新性 | 13 分 | 中 |
| F. 创新与自由发挥 | 10 分 | 低 |

---

## 2. 系统架构

### 2.1 架构选型：多 Agent 共享内存

选择多 Agent 架构而非单 Agent，理由：
1. 每个 Agent 职责单一，便于独立开发和调试
2. 模块化设计使代码结构清晰，提升代码质量分（E 维度）
3. 架构文档有更多设计决策可论证，提升架构分（D 维度）
4. Agent 间通过 Python 模块调用（共享内存），无需网络通信，保证 5 小时内的可靠性

### 2.2 五个 Agent

```
┌─────────────────────────────────────────────────┐
│              Gradio / React 前端                  │
└──────────────────────┬──────────────────────────┘
                       │ HTTP API
┌──────────────────────▼──────────────────────────┐
│                FastAPI 调度层                     │
│    接收请求 → 调度 Agent → 返回结果               │
└──┬──────┬──────┬──────┬──────┬──────────────────┘
   │      │      │      │      │
┌──▼───┐┌─▼────┐┌─▼────┐┌─▼───┐┌─▼────┐
│Parser││Extract││Integr││ RAG ││ Chat │
│Agent ││Agent  ││Agent ││Agent││Agent │
└──────┘└───────┘└──────┘└─────┘└──────┘
         共享内存（Python 模块调用）
```

### 2.3 Agent 职责定义

#### ParserAgent — 教材解析

**职责**：将多格式教材文件解析为统一的结构化数据

**输入**：文件路径（PDF/MD/TXT）

**输出**：`TextbookInfo`（章节列表 + 内容 + 元数据）

**核心逻辑**：
- PDF 解析：pymupdf4llm 输出 Markdown + 标题层级
- 章节检测：正则匹配"第X章"/"第X节" + 字体大小分析
- 页眉页脚过滤：统计每页首尾行，去除重复出现的页码/书名
- 图表处理：跳过图表内容，但**保留表格标题/表头描述**（如"表3-2 常见致病菌分类"）
- 字体大小过滤：图表内标注文字（坐标轴标签、图例说明等）通常字号 < 9pt，可通过 PyMuPDF 的 `font_size` 属性过滤掉
- 连续短文本过滤：图表内部文字常表现为多行连续短文本（每行 < 15 字），可通过行长度统计识别并跳过
- 大文件处理：逐页解析，不一次性加载全书

**输出结构**：
```json
{
  "textbook_id": "book_01",
  "filename": "局部解剖学.pdf",
  "title": "局部解剖学",
  "total_pages": 305,
  "total_chars": 305000,
  "chapters": [
    {
      "chapter_id": "ch_01",
      "title": "第一章 头颈部",
      "page_start": 1,
      "page_end": 45,
      "content": "...",
      "char_count": 12000,
      "tables": ["表1-1 头颈部主要血管", "表1-2 头颈部神经分布"]
    }
  ]
}
```

#### ExtractorAgent — 知识提取

**职责**：从教材章节中提取知识点和关系，构建知识图谱

**输入**：`TextbookInfo`

**输出**：`KnowledgeGraph`（节点列表 + 边列表）

**三级递进提取策略**：

```
Level 1: 逐节提取（每个小节独立调 LLM）
  → 粒度：每个小节 10-15 个知识点 + 节内关系
  → 上下文：当前小节内容（~2000字）
  → 产出：节点 + 节内边

Level 2: 跨节关系补充（滑动窗口，每 3 节一组）
  → 窗口：第 N-1 节 + 第 N 节 + 第 N+1 节 的节点名称列表
  → LLM 看 30-45 个节点名称，识别跨节关系

Level 3: 按章补充远距离关系（每章独立处理）
  → 每章提取节点名称列表（~50-80 个，~300-500 字）
  → LLM 对比本章节点与其他章节点名称，识别跨章远距离关系
  → 避免全书节点列表过长超出上下文窗口
```

**知识点输出结构**：
```json
{
  "id": "node_001",
  "name": "动作电位",
  "definition": "细胞受到刺激后，膜电位发生的一次快速而可逆的倒转...",
  "category": "核心概念",
  "chapter": "第二章 细胞的基本功能",
  "page": 35,
  "textbook_id": "book_03",
  "textbook_name": "生理学",
  "chunk_id": "book03_ch02_003"
}
```

**关系输出结构**：
```json
{
  "source": "node_001",
  "target": "node_002",
  "relation_type": "prerequisite",
  "description": "理解动作电位需要先掌握静息电位的概念"
}
```

**关系类型**（四种）：
- `prerequisite`：前置依赖（学习 B 之前必须先掌握 A）
- `parallel`：并列关系（同一层级的平行概念）
- `contains`：包含关系（上位概念与下位概念）
- `applies_to`：应用关系（某知识点是另一个的应用场景）

**医学领域优化**：
- Prompt 中注入医学学科偏好（解剖→生理→病理→临床的知识链）
- 知识点分类适配医学领域：核心概念、解剖结构、生理过程、病理变化、临床表现、诊断方法、治疗原则

#### IntegratorAgent — 跨教材整合

**职责**：将多本教材的知识图谱合并，识别重叠知识点，执行整合决策

**输入**：多个 `KnowledgeGraph`

**输出**：`MergedKnowledgeGraph` + 决策列表

**两阶段对齐算法**：

```
阶段 1：Embedding 粗筛（快，零成本）
  → 每个知识点的 "名称+定义" 向量化
  → 不做 category 预过滤（医学分类边界模糊，预过滤易漏匹配）
  → 计算余弦相似度，阈值 0.70（宁多勿漏）
  → 相似度 ≥ 0.70 的配对 → 候选合并对

阶段 2：LLM 精确判断（慢，但只处理候选对）
  → 每次给 LLM 5-10 个候选对（含教材来源信息）
  → LLM 判断：是同一概念？保留哪个版本？为什么？
  → 输出：merge / keep / remove 决策 + 理由 + 置信度
```

**整合决策结构**：
```json
{
  "decision_id": "merge_001",
  "action": "merge",
  "affected_nodes": ["book01_node_015", "book03_node_032"],
  "result_node": "merged_node_001",
  "reason": "三本教材都讲解了'炎症'的概念，保留《病理学》的版本因其描述最系统完整",
  "confidence": 0.92
}
```

**压缩比控制**：
- 目标：整合后总字数 ≤ 原始总字数的 30%
- 策略：merge 操作合并重复内容，remove 操作删除冗余节点
- 统计：前端展示 原始字数 → 整合后字数 → 压缩比
- 实现：`compression_ratio.py` 模块，维护 `OriginalStats`（每本教材原字数）和 `MergedStats`（整合后字数）两个计数器，每次 merge/remove 操作实时更新

**前置依赖链保护**：
- 每次 merge/remove 操作前，检查受影响节点是否参与 `prerequisite` 关系
- 若被合并/删除的节点是其他节点的前置依赖，需同步更新依赖链（将依赖关系转移到保留节点上）
- 若删除操作会打断依赖链，需提示用户确认

**RAG 索引同步**：
- IntegratorAgent 每次执行 merge/remove/keep 操作后，触发 RAGAgent 重建受影响教材的向量索引
- 增量更新策略：仅重建受影响 chunk 所在教材的索引，不重建全部

**决策日志**：所有决策记录到内存日志，供 ChatAgent 查询和解释。

#### RAGAgent — 精准问答

**职责**：基于整合后的知识库进行检索增强生成问答

**完整 Pipeline**：

```
第一步：文档分块（Chunking）
  → 每本教材正文拆分为 chunks，每块 ~600 字
  → 相邻块重叠 80 字（sliding window）
  → 每个 chunk 保留元数据：教材名、章节、页码、小节、关键词

第二步：向量嵌入（Embedding）
  → bge-small-zh-v1.5 本地运行
  → 每个 chunk → 512 维向量

第三步：向量存储与检索
  → ChromaDB 持久化存储
  → 用户提问 → 向量化 → 检索 top-5 最相关 chunks
  → 预过滤：按教材来源分组检索，确保跨教材覆盖

第四步：生成回答
  → top-5 chunks 作为上下文注入 LLM prompt
  → 约束：只基于上下文回答，每个回答附带来源引用
  → 引用格式：[教材名称, 第X章, 第X页]
  → 找不到答案时回复"当前知识库中未找到相关信息"
```

**元数据结构**：
```json
{
  "textbook_id": "book_05",
  "textbook_name": "病理学",
  "chapter_id": "ch_04",
  "chapter_title": "第四章 炎症",
  "section_title": "第二节 炎症的基本病理变化",
  "page": 78,
  "chunk_index": 3,
  "keywords": ["炎症", "变质", "渗出"]
}
```

**数据量估算**：
- 7 本 × 370 页 × 1200 字/页 ≈ 3,100,000 字
- 每 600 字一个 chunk → ~5,500 chunks
- 向量存储：5,500 × 512 维 × 4 字节 ≈ 11MB
- ChromaDB 查询 < 100ms，无性能问题

#### ChatAgent — 多轮对话

**职责**：作为用户意图→系统行为的翻译层，支持教师通过对话修改整合方案

**赛题要求映射**：

| 赛题要求 | ChatAgent 动作 | 调用目标 |
|---|---|---|
| 对每一项整合决策给出理由 | 查询决策日志，生成解释 | IntegratorAgent.get_decision_log() |
| "为什么把A和B合并了？" | 查找涉及 A 或 B 的决策 | IntegratorAgent.explain_merge() |
| "为什么删除了X？" | 查找 X 的删除决策 | IntegratorAgent.explain_remove() |
| "X不应该被删除，请保留" | 修改 X 的决策为 keep | IntegratorAgent.override_decision(X, "keep") |
| "把A和B分开" | 拆分已合并的 A+B | IntegratorAgent.split_merge(A, B) |
| 调整整合结果并实时更新 | 执行修改 + 重建图谱 | IntegratorAgent + 图谱刷新 |
| 对话历史持久化 | 存储对话记录 | 内存存储（会话级） |

**ChatAgent 完整动作清单**：

```python
# 解释类（只读）
explain_decision(decision_id)     # 返回决策理由
explain_merge(node_name)          # 解释合并原因
explain_remove(node_name)         # 解释删除原因
query_status()                    # 当前整合状态

# 修改类（写操作）
keep_node(node_name)              # 保留被删除/合并的节点
remove_node(node_name)            # 新增删除决策
split_nodes(node_a, node_b)       # 拆分已合并节点
merge_nodes(node_a, node_b)       # 手动合并节点
adjust_threshold(param, value)    # 调整整合参数

# 查询类（只读）
search_knowledge(keyword)         # 搜索知识点
show_graph_summary()              # 图谱摘要统计
compare_textbooks(book_a, book_b) # 对比两本教材
```

**意图识别实现**：

```
用户输入 → LLM 意图分类（或关键词匹配兜底）→ 参数解析 → 动作执行 → 结果返回
```

对于 5 小时内的实现，采用**关键词匹配 + LLM 兜底**的策略：
- 关键词匹配处理高频意图（"保留"、"删除"、"为什么"、"分开"）
- 复杂意图交给 LLM 分类

---

## 3. 前端设计

### 3.1 技术栈

```
React 19 + TypeScript + Vite
shadcn/ui + Tailwind CSS
ECharts（知识图谱可视化）
zustand（状态管理）
react-markdown（Markdown 渲染）
```

### 3.2 页面布局

三栏 SPA 布局，符合赛题建议：

```
┌──────────────────────────────────────────────────────────┐
│  顶部导航栏：Logo + 教材统计 + 索引状态 + 部署信息          │
├──────────┬────────────────────────┬──────────────────────┤
│ 左栏 240px│      中间 flex-1       │   右栏 380px          │
│          │                        │                      │
│ 📤 上传区  │  📊 知识图谱可视化       │  [Tab 切换]           │
│ 拖拽+选择  │                        │  整合│RAG│对话│报告    │
│          │  ECharts 力导向图       │                      │
│ 📚 教材列表│  节点点击→详情 Drawer   │  ┌────────────────┐  │
│ 状态+操作  │  搜索+筛选+频次映射     │  │ Tab 内容区      │  │
│          │  教材颜色区分            │  │                │  │
│ 📈 统计   │  缩放+拖拽              │  └────────────────┘  │
│ 节点/边/压缩比│                    │                      │
├──────────┴────────────────────────┴──────────────────────┤
│ 底部状态栏：解析进度 | 索引状态 | 对话历史                    │
└──────────────────────────────────────────────────────────┘
```

### 3.3 关键交互

| 功能 | 实现方式 |
|---|---|
| 文件上传 | shadcn Dropzone，支持拖拽+点击，批量上传 |
| 教材列表 | shadcn Card，显示名称+状态 badge（解析中/完成/失败） |
| 知识图谱 | ECharts graph 系列，力导向布局 |
| 节点点击 | ECharts click 事件 → 右侧 Drawer 显示详情 |
| 搜索高亮 | ECharts emphasis + 关键词匹配 |
| 频次可视化 | 节点大小映射 frequency，颜色映射 textbook |
| RAG 问答 | shadcn Input + Button + react-markdown 渲染回答 |
| 多轮对话 | shadcn Card + 消息气泡 + ScrollArea |
| 整合报告 | react-markdown 渲染 Markdown 报告 |

### 3.4 知识图谱可视化设计

**节点样式**：
- 大小：`symbolSize = 20 + frequency * 10`（频次越高越大）
- 颜色：按知识点分类（核心概念=蓝，定理定律=红，方法技术=绿，现象过程=黄，应用场景=紫）
- 教材来源：边框颜色区分不同教材

**边样式**：
- 颜色：按关系类型（prerequisite=红，parallel=灰，contains=蓝，applies_to=绿）
- 粗细：置信度映射

**交互**：
- 滚轮缩放
- 拖拽移动画布和单个节点
- 点击节点弹出详情（名称、定义、分类、章节、原文出处）
- 搜索框输入关键词，高亮匹配节点
- 筛选：按教材/分类/频次筛选显示

---

## 4. API 设计

### 4.1 教材管理

```
POST   /api/textbooks/upload          上传教材文件
GET    /api/textbooks/list             获取教材列表
GET    /api/textbooks/{id}             获取教材详情
POST   /api/textbooks/{id}/index       建立 RAG 向量索引
```

### 4.2 知识图谱

```
POST   /api/knowledge/extract/{id}     对指定教材执行知识提取
GET    /api/knowledge/graph/{id}       获取单本教材知识图谱
GET    /api/knowledge/all              获取所有已提取的图谱
```

### 4.3 跨教材整合

```
POST   /api/integration/merge          执行跨教材整合
GET    /api/integration/merged         获取整合后的图谱
GET    /api/integration/decisions      获取整合决策列表
POST   /api/integration/override       修改整合决策（ChatAgent 调用）
```

### 4.4 RAG 问答

```
POST   /api/rag/query                  输入问题，返回带引用的回答
GET    /api/rag/status                 查询索引状态
```

### 4.5 多轮对话

```
POST   /api/chat/send                  发送消息，返回回复
GET    /api/chat/history               获取对话历史
```

### 4.6 RAG 回答数据结构

```json
{
  "answer": "炎症是机体对致炎因子的损伤所发生的防御性反应...",
  "citations": [
    {
      "textbook": "病理学",
      "chapter": "第四章 炎症",
      "page": 78,
      "relevance_score": 0.92
    },
    {
      "textbook": "生理学",
      "chapter": "第九章 免疫",
      "page": 302,
      "relevance_score": 0.85
    }
  ],
  "source_chunks": [
    "炎症(inflammation)是具有血管系统的活体组织对各种损伤因子的刺激...",
    "机体免疫系统在炎症反应中发挥作用..."
  ]
}
```

---

## 5. 数据流

### 5.1 完整用户流程

```
用户上传教材 PDF
    │
    ▼
ParserAgent 解析
    ├── 章节检测（pymupdf4llm + 正则）
    ├── 页眉页脚过滤
    ├── 图表跳过 + 表格标题保留 + 字体大小过滤
    └── 输出 TextbookInfo
    │
    ▼
ExtractorAgent 提取（逐章 → 跨节 → 按章补充）
    ├── Level 1: 逐节提取知识点 + 节内关系
    ├── Level 2: 滑动窗口跨节关系（每 3 节一组）
    └── Level 3: 按章补充远距离关系（本章节点 vs 其他章节点）
    │
    ▼
RAGAgent 建索引
    ├── 分块（600字/块，80字重叠）
    ├── Embedding（bge-small-zh）
    └── 存入 ChromaDB
    │
    ▼
（重复以上流程处理所有教材）
    │
    ▼
IntegratorAgent 整合
    ├── Embedding 粗筛（阈值 0.70，无 category 预过滤）
    ├── LLM 精确判断（每批 5-10 个候选对）
    ├── 前置依赖链保护检查
    ├── 压缩比实时计算（目标 ≤ 30%）
    ├── 决策日志记录
    └── 输出 MergedKnowledgeGraph + 决策列表
    │
    ▼
前端展示
    ├── 知识图谱可视化（ECharts 力导向图）
    ├── 整合决策列表 + 压缩比统计
    ├── RAG 问答（带引用）
    └── 多轮对话
         ├── ChatAgent 意图识别 → IntegratorAgent 执行决策修改
         ├── 增量图谱更新（仅受影响节点/边）
         └── RAG 索引同步（仅受影响教材 chunk）
```

### 5.2 ChatAgent 控制流

```
用户输入："把抗原和免疫原分开，它们不是同一个概念"
    │
    ▼
意图识别（关键词匹配 + LLM 兜底）
    intent = "split_nodes"
    node_a = "抗原"
    node_b = "免疫原"
    │
    ▼
参数验证（在当前图谱中搜索节点）
    │
    ▼
IntegratorAgent.split_merge("抗原_id", "免疫原_id")
    │
    ▼
返回结果 + 刷新图谱数据
    "已将'抗原'和'免疫原'拆分为两个独立知识点。图谱已更新。"
```

---

## 6. 部署方案

### 6.1 目标平台

魔搭创空间（ModelScope Spaces），免费 CPU，支持 Docker。

### 6.2 Docker 配置

```dockerfile
# 后端
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ ./backend/
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]

# 前端（构建后静态文件由 FastAPI 托管）
FROM node:20 AS builder
WORKDIR /app
COPY frontend/ .
RUN npm install && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /app/dist ./static
COPY backend/ ./backend/
COPY requirements.txt .
RUN pip install -r requirements.txt
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### 6.3 仓库结构

```
你的项目/
├── .gitignore            # 排除教材 PDF
├── README.md             # 项目说明
├── requirements.txt      # Python 依赖
├── Dockerfile            # 容器化配置
├── docker-compose.yml    # 编排配置
├── docs/
│   ├── 需求分析.md
│   ├── 系统设计.md
│   ├── Agent架构说明.md
│   └── 开发时间线.md
├── src/                  # 源代码
│   ├── backend/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── services/
│   │   └── routers/
│   └── frontend/
│       ├── src/
│       ├── package.json
│       └── ...
└── report/
    └── 整合报告.md
```

---

## 7. 开发时间线

> 剩余时间：3 小时 40 分钟（220 分钟）

### Phase 1：搭骨架（0:00 - 0:15，15 分钟）

| 任务 | 时间 |
|---|---|
| 清理旧代码，重建项目结构 | 3 min |
| .env 配置（MiMo API key） | 2 min |
| 安装 Python 依赖 | 5 min |
| 初始化 React + shadcn/ui + Tailwind | 5 min |

### Phase 2：后端核心（0:15 - 1:00，45 分钟）

| 任务 | 时间 | 分值 |
|---|---|---|
| PDF 解析 + 章节检测 + 表格标题保留 | 10 min | 3 分 |
| LLM 知识点+关系提取（逐章 + 跨章 Level 1+2） | 10 min | 5 分 |
| Embedding + ChromaDB + RAG 检索+生成 | 15 min | 5 分 |
| 跨教材 Embedding 粗筛 + LLM 精确对齐 | 10 min | 6 分 |

### Phase 3：前端联调（1:00 - 2:00，60 分钟）

| 任务 | 时间 |
|---|---|
| 三栏布局 + 教材上传 | 10 min |
| ECharts 知识图谱（力导向+交互） | 20 min |
| 整合操作 Tab | 10 min |
| RAG 问答 Tab | 10 min |
| 多轮对话 Tab | 10 min |

### Phase 4：文档撰写（2:00 - 2:50，50 分钟）

| 任务 | 时间 | 分值 |
|---|---|---|
| Agent 架构说明 | 20 min | 20 分 |
| 需求分析 | 8 min | 3 分 |
| 系统设计 | 8 min | 3 分 |
| 整合报告 | 8 min | 2 分 |
| README | 6 min | 3 分 |

### Phase 5：部署（2:50 - 3:15，25 分钟）

| 任务 | 时间 |
|---|---|
| Dockerfile + docker-compose | 8 min |
| 推送 GitHub | 5 min |
| 部署魔搭创空间 | 12 min |

### Phase 6：收尾（3:15 - 3:40，25 分钟）

| 任务 | 时间 |
|---|---|
| 全流程走一遍 | 8 min |
| 检查仓库结构 | 5 min |
| 用 7 本教材跑一遍，填充报告数据 | 7 min |
| 最终 commit + push | 5 min |

---

## 8. 风险管理

| 风险 | 概率 | 影响 | 应对 |
|---|---|---|---|
| MiMo API 响应慢 | 高 | 知识提取耗时长 | 先用 1 本测试，全量提取放后台异步 |
| PDF 章节识别不准 | 中 | 图谱结构混乱 | pymupdf4llm + 正则"第X章"兜底 |
| 魔搭部署失败 | 中 | 没有在线链接 | 保证 GitHub 仓库完整可访问 |
| 图谱节点太多卡顿 | 中 | 前端渲染慢 | 限制 ≤200 节点显示，支持搜索筛选 |
| Embedding 对医学术语效果差 | 低 | 跨教材对齐不准 | 用"名称+定义"组合 embedding，调阈值 |
| 前端样式不够精美 | 低 | 可视化分偏低 | shadcn/ui 默认样式已足够专业 |

---

## 9. 加分项（有时间才做）

| 加分项 | 预估时间 | 价值 |
|---|---|---|
| MiMo Omni 多模态提取图表知识 | +20 min | 创新分 F |
| 自建 RAG Benchmark（15-20 测试题） | +30 min | 架构分 D 加成 |
| 混合检索（向量+BM25）+ Rerank | +15 min | 功能分 B 进阶 |
| Token 消耗统计与可视化 | +10 min | 加分项 P1 |
| 知识图谱多视图切换（力导向/树/桑基） | +15 min | 可视化创新分 C |

---

## 10. 弃用方案与已知限制

### 10.1 弃用方案

| 方案 | 弃用原因 |
|---|---|
| Gradio 前端 | 交互复杂度超出 Gradio 能力范围（ECharts 力导向图、三栏布局、实时交互），改用 React + shadcn/ui |
| Electron 桌面应用 | 赛题要求 Web 应用，Electron 与部署目标冲突 |
| 全书节点列表做 Level 3 提取 | 上下文窗口可能溢出（~500 节点名），改为按章分批处理 |
| Embedding 按 category 预过滤 | 医学分类边界模糊（如"炎症"既是病理过程又是生理现象），预过滤导致漏匹配 |
| 全量 RAG 索引重建 | 每次整合决策修改后重建全部索引太慢，改为增量更新受影响教材 |

### 10.2 已知限制

| 限制 | 影响 | 缓解措施 |
|---|---|---|
| MiMo API 速率限制 | 7 本教材知识提取可能需要排队等待 | 异步处理 + 进度条 |
| 图片内容无法提取 | 解剖图、切片图等视觉信息丢失 | 表格标题/图注文字尽量保留，多模态模型作为加分项 |
| Embedding 模型为通用模型 | bge-small-zh 对医学术语的语义理解有限 | 用"名称+定义"组合 embedding 提升准确度 |
| 5 小时时间约束 | 部分高级功能（混合检索、多视图）可能无法完成 | 优先保证核心功能，高级功能作为加分项 |
| CPU 部署环境 | ChromaDB + sentence-transformers 在 CPU 上推理较慢 | 向量规模可控（~5500 chunks），查询延迟可接受 |

---

## 11. 需求分析细化

### 11.1 知识点粒度定义

**原则**：每个知识点应当是一个独立的、可被查询和理解的知识单元。

**粒度标准**：
- 一个知识点对应一个可独立回答的问题，如"什么是动作电位？"、"炎症的基本病理变化有哪些？"
- 不将多个无关概念合并为一个节点（如"细胞膜的物质转运"应拆分为"被动运输"、"主动运输"等子节点）
- 不将过于细碎的信息单独建节点（如"某血管的直径为 X mm"归入该血管结构的节点）

**医学领域知识点分类**（7 类）：
1. **核心概念**：炎症、免疫、感染、肿瘤等基础概念
2. **解剖结构**：器官、组织、细胞结构
3. **生理过程**：动作电位、炎症反应、免疫应答
4. **病理变化**：变质、渗出、增生等病理过程
5. **临床表现**：症状、体征、综合征
6. **诊断方法**：实验室检查、影像学检查
7. **治疗原则**：药物治疗、手术治疗

### 11.2 重复判定标准

| 判定为重复 | 判定为不同知识点 |
|---|---|
| 同一概念在不同教材中以不同措辞描述（如"炎症"在病理学和生理学中均有定义） | 同一名称在不同学科语境下含义不同（如"分化"在组织学 vs 肿瘤学） |
| 上位概念与下位概念的重复定义（如"免疫应答"和"体液免疫"） | 描述角度不同但互补的知识点（如解剖学描述结构，生理学描述功能） |

**处理策略**：
- 重复节点：保留描述最完整、最系统的版本（通常来自专业教材）
- 保留理由：每个 merge 决策必须附带理由（如"保留《病理学》版本，因其包含病因、机制、分型完整描述"）

### 11.3 Chunking 策略依据

- **600 字/chunk**：bge-small-zh-v1.5 的有效上下文窗口约 512 token（中文约 300-400 字），600 字 chunk 在截断后仍保留完整语义段落
- **80 字重叠**：确保跨段落概念（如"炎症的三个基本病理变化是…"）不会因分块而丢失
- **元数据保留**：每个 chunk 绑定教材名、章节、页码，支持 RAG 回答的精确引用

---

## 12. 模型切换接口

所有 LLM 调用通过统一的 `llm_client.py` 模块，支持一键切换模型：

```python
# .env 配置
LLM_PROVIDER=mimo
LLM_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
LLM_TEXT_MODEL=mimo-v2.5-pro
LLM_MULTIMODAL_MODEL=mimo-v2-omni
LLM_API_KEY=your_key_here

# 切换到其他模型只需改 .env
# LLM_PROVIDER=deepseek
# LLM_BASE_URL=https://api.deepseek.com/v1
# LLM_TEXT_MODEL=deepseek-chat
```

所有 Agent 通过 `from backend.services.llm_client import chat_completion` 调用 LLM，不直接依赖特定模型 API。
