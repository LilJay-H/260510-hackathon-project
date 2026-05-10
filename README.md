---
title: 学科知识整合智能体
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: apache-2.0
---

# 学科知识整合智能体

AI 全栈极速黑客松参赛项目。对 7 本医学教材进行知识整合：自动解析、构建知识图谱、跨教材去重提纯、RAG 精准问答、支持对话修改整合方案。

## 快速开始

### 环境要求
- Python 3.11+
- Node.js 20+

### 安装
```bash
pip install -r requirements.txt
cd src/frontend && npm install
```

### 配置
复制 `.env.example` 为 `.env`，填入 MiMo API key。

### 运行
```bash
# 后端
cd src && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 前端（开发模式）
cd src/frontend && npm run dev
```

### Docker
```bash
docker-compose up --build
```

## 架构
多 Agent 共享内存架构，5 个 Agent：Parser、Extractor、Integrator、RAG、Chat。
详见 `docs/Agent架构说明.md`。

## 项目结构
```
├── src/backend/          # FastAPI 后端 + 5 Agent
├── src/frontend/         # React + ECharts 前端
├── docs/                 # 设计文档
├── report/               # 整合报告
├── Dockerfile            # 容器化配置
└── docker-compose.yml    # 编排配置
```
