# Prompt-VCS

> Git 风格的 LLM Prompt 版本控制系统，内置 A/B 测试框架

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-139%2F139%20passing-brightgreen)](./tests)
[![Version](https://img.shields.io/badge/version-0.2.0-blue)](./package.json)
[![Coverage](https://img.shields.io/badge/coverage->80%25-brightgreen)](./coverage)

---

## 📖 背景与动机

### 问题场景

在使用 LLM 构建应用时，团队面临以下挑战：

- **Prompt 黑盒化**：不知道哪个版本的 prompt 效果最好
- **回归测试困难**：修改 prompt 后不知道性能是提升还是下降
- **协作混乱**：多人修改 prompt，冲突难以解决
- **缺乏数据驱动**：凭感觉优化，没有量化指标

### 解决方案

Prompt-VCS 将 **Git 的工作流** 引入 Prompt 工程：

```bash
# 版本控制
pvc init
pvc add prompt.txt
pvc commit -m "增加 empathy 语句"

# A/B 测试对比
pvc test HEAD~1 HEAD --dataset test.json

# 查看历史
pvc log --metrics
```

---

## 🚀 快速开始

### 安装

```bash
# 从源码安装
git clone https://github.com/your-org/prompt-vcs.git
cd prompt-vcs
npm install
npm run build
npm link

# 验证安装
pvc --version
```

### 环境要求

- Node.js >= 18
- OpenAI API key（用于 A/B 测试）：`export OPENAI_API_KEY=sk-xxx`

---

## 📚 使用指南

### 基础工作流

```bash
# 1. 初始化仓库
mkdir my-prompts && cd my-prompts
pvc init

# 2. 创建 prompt 文件
cat > greeting.txt << 'EOF'
You are a helpful assistant. Greet the user by name: {{name}}
EOF

# 3. 添加到暂存区
pvc add greeting.txt

# 4. 提交更改
pvc commit -m "Initial greeting prompt"

# 5. 查看历史
pvc log
```

### A/B 测试完整流程

```bash
# 1. 创建测试数据集
cat > dataset.json << 'EOF'
{
  "testCases": [
    { "name": "Greet Alice", "inputs": { "name": "Alice" } },
    { "name": "Greet Bob", "inputs": { "name": "Bob" } },
    { "name": "Greet 张", "inputs": { "name": "张" } }
  ]
}
EOF

# 2. 创建变体 A
cat > greeting.txt << 'EOF'
You are a helpful assistant. Greet the user by name: {{name}}
EOF
pvc add greeting.txt
pvc commit -m "Version A: Simple greeting"

# 3. 创建变体 B
cat > greeting.txt << 'EOF'
You are an enthusiastic assistant! Greet {{name}} with excitement!
EOF
pvc add greeting.txt
pvc commit -m "Version B: Enthusiastic greeting"

# 4. 运行 A/B 测试（对比最近两次提交）
pvc test HEAD~1 HEAD --dataset dataset.json --save

# 5. 查看测试结果
pvc test-log

# 6. 查看详细报告
pvc test-show <run-id>
```

---

## 📊 命令参考

### 版本控制命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `pvc init` | 初始化新仓库 | `pvc init` |
| `pvc add <path>` | 暂存文件或目录 | `pvc add prompt.txt` |
| `pvc commit -m "msg"` | 创建提交 | `pvc commit -m "Update prompt"` |
| `pvc diff [a] [b]` | 显示差异 | `pvc diff HEAD~1` |
| `pvc log` | 查看提交历史 | `pvc log -n 10` |
| `pvc status` | 查看工作区状态 | `pvc status` |

### A/B 测试命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `pvc test <a> <b>` | 对比两个版本 | `pvc test abc123 def456 -d data.json` |
| `pvc test-log` | 查看测试历史 | `pvc test-log --limit 5` |
| `pvc test-show <id>` | 查看详细结果 | `pvc test-show abc-def-ts` |

### test 命令选项

```bash
pvc test <commit-a> <commit-b> [options]

选项:
  -d, --dataset <path>     数据集文件路径 (JSON 或 CSV) [必需]
  -c, --concurrency <n>    并发请求数 (默认: 5)
  -m, --model <model>      OpenAI 模型 (默认: gpt-4)
  --save                   保存结果到 .pvc/test-runs/
  -h, --help              显示帮助
```

---

## 📁 数据集格式

### JSON 格式（推荐）

```json
{
  "testCases": [
    {
      "name": "友好问候",
      "inputs": {
        "name": "Alice",
        "tone": "friendly"
      },
      "expectedOutput": "包含问候语和名字"
    },
    {
      "name": "正式问候",
      "inputs": {
        "name": "Dr. Smith",
        "tone": "formal"
      }
    }
  ]
}
```

### CSV 格式

```csv
name,inputs,expected_output
"友好问候","{""name"": ""Alice"", ""tone"": ""friendly""}","包含问候语"
"正式问候","{""name"": ""Dr. Smith"", ""tone"": ""formal""}",
```

**注意**：`inputs` 列必须是 JSON 对象，字段名与 prompt 中的模板变量对应。

### 模板变量

Prompt 文件支持使用 `{{variable}}` 语法：

```
You are a {{role}}. Help the user with {{task}}.
Respond in {{language}}.
```

数据集需要提供对应的变量：

```json
{
  "inputs": {
    "role": "coding assistant",
    "task": "debugging Python",
    "language": "Chinese"
  }
}
```

---

## 🏗️ 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Prompt-VCS                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CLI Layer                                                  │
│   ├── init.ts        # 仓库初始化                            │
│   ├── add.ts         # 文件暂存                              │
│   ├── commit.ts      # 提交创建                              │
│   ├── diff.ts        # 差异对比                              │
│   ├── test.ts        # A/B 测试执行                          │
│   ├── test-log.ts    # 测试历史                              │
│   └── test-show.ts   # 结果详情                              │
│                                                              │
│   Core Layer                                                 │
│   ├── repository.ts   # Git 风格存储                         │
│   ├── storage.ts      # 文件系统抽象                         │
│   ├── hash.ts         # SHA-256 内容寻址                     │
│   ├── test-runner.ts  # 测试执行引擎                         │
│   ├── test-storage.ts # 测试结果存储                         │
│   ├── dataset-parser.ts   # JSON/CSV 解析                    │
│   ├── openai-client.ts    # OpenAI API 封装                  │
│   ├── metrics-collector.ts # 指标收集                        │
│   └── statistical-analyzer.ts # 统计分析                     │
│                                                              │
│   Storage                                                    │
│   └── .pvc/                                                  │
│       ├── index.json          # 暂存区                       │
│       ├── HEAD                # 当前提交指针                  │
│       ├── objects/            # 内容寻址存储                 │
│       └── test-runs/          # 测试结果                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 存储结构

```
.pvc/
├── index.json              # 暂存区索引
├── HEAD                    # 指向当前提交的指针
├── objects/                # 内容寻址对象存储
│   ├── ab/
│   │   └── cdef1234...    # 文件内容 (前2字符作为目录)
│   └── ef/
│       └── 567890ab...
└── test-runs/              # A/B 测试结果
    ├── abc123-def456-1700000000000.json
    └── ...
```

### 内容寻址

与 Git 类似，Prompt-VCS 使用 SHA-256 哈希作为文件标识：

```javascript
// 文件内容 → SHA-256 哈希 → 存储路径
const hash = sha256(fileContent);  // "abcdef1234567890..."
const path = `.pvc/objects/${hash.slice(0,2)}/${hash.slice(2)}`;
```

优势：
- **去重**：相同内容只存一份
- **不可变**：内容修改必然改变哈希
- **完整性**：哈希可验证内容是否损坏

---

## 📈 A/B 测试原理

### 测试流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Load       │────▶│  Render     │────▶│  Execute    │
│  Dataset    │     │  Prompts    │     │  OpenAI     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                        ┌──────────────────────┘
                        ▼
               ┌─────────────────┐
               │  Collect        │
               │  Metrics        │
               │  - Latency      │
               │  - Tokens       │
               │  - Cost         │
               │  - Success      │
               └────────┬────────┘
                        ▼
               ┌─────────────────┐
               │  Statistical    │
               │  Analysis       │
               │  (t-test)       │
               └────────┬────────┘
                        ▼
               ┌─────────────────┐
               │  Generate       │
               │  Report         │
               └─────────────────┘
```

### 统计显著性

使用 **Welch's t-test** 检验两个版本的差异是否显著：

```javascript
// p-value < 0.05 表示差异显著
if (pValue < 0.05) {
  return "差异显著";
} else {
  return "差异不显著（可能是随机波动）";
}
```

### 指标对比

| 指标 | 说明 | 用途 |
|------|------|------|
| Latency | 响应时间 | 评估速度 |
| Input Tokens | 输入 Token 数 | 评估输入长度 |
| Output Tokens | 输出 Token 数 | 评估输出长度 |
| Cost | 估算成本 | 评估经济性 |
| Success Rate | 成功率 | 评估稳定性 |

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 覆盖率报告
npm run test:coverage

# 监视模式
npm run test:watch

# 特定模块
npm test -- tests/unit/repository.test.ts
```

### 测试覆盖

| 模块 | 测试数 | 覆盖率 |
|------|--------|--------|
| Repository | 9 | 92% |
| Test Runner | 12 | 88% |
| Storage | 10 | 95% |
| Dataset Parser | 21 | 91% |
| Metrics | 12 | 89% |
| **总计** | **139** | **>80%** |

---

## 🗺️ 路线图

### ✅ v0.1.0 — 已发布
- [x] Git 风格版本控制（init/add/commit/diff/log）
- [x] 内容寻址存储
- [x] SHA-256 哈希
- [x] 基础 CLI
- [x] **43 个测试通过**

### ✅ v0.2.0 — 已发布
- [x] A/B 测试框架（pvc test）
- [x] 测试历史管理（test-log / test-show）
- [x] 统计分析（t-test）
- [x] 成本计算
- [x] JSON/CSV 数据集支持
- [x] 并发执行
- [x] **139 个测试通过**

### 🔄 v0.3.0 — 规划中
- [ ] Branch 分支管理
- [ ] Merge 冲突解决
- [ ] Remote 远程仓库
- [ ] GitHub 集成

### 📅 v0.4.0 — 规划中
- [ ] 多人协作支持
- [ ] Web 界面
- [ ] Prompt 模板市场
- [ ] 自动化测试 CI/CD

### 📅 v1.0.0 — 规划中
- [ ] 企业级功能
- [ ] 权限管理
- [ ] 审计日志
- [ ] 团队协作工作流

---

## 💡 使用场景

### 场景一：Prompt 迭代优化

```bash
# 记录每个版本的变化
pvc commit -m "增加 few-shot 示例"
# ... 测试发现效果不好 ...
pvc diff HEAD~1  # 对比上一个版本
pvc test HEAD~1 HEAD -d eval.json  # 量化对比
```

### 场景二：团队协作

```bash
# 成员 A
git clone <prompt-repo>
pvc add system-prompt.txt
pvc commit -m "Add safety guidelines"
git push

# 成员 B
git pull
pvc log  # 查看 A 的更改
pvc test HEAD~1 HEAD -d test.json  # 验证效果
```

### 场景三：生产环境回归测试

```bash
# 在 CI/CD 中运行
pvc test production-staging -d regression-tests.json
# 如果测试通过，才部署到生产环境
```

---

## 🤝 贡献

```bash
# 本地开发
git clone https://github.com/your-org/prompt-vcs.git
cd prompt-vcs
npm install

# 运行测试
npm test

# 构建
npm run build

# 提交 PR
```

---

## 📄 许可证

MIT © OSS AI Tools

---

## 🔗 相关项目

- [AI Cost Tracker](./ai-cost-tracker) — AI 成本追踪与优化
- [MCP Registry](./mcp-registry) — MCP 服务器注册表
