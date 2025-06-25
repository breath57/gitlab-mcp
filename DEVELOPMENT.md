# 本地开发指南

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp env.template .env

# 编辑 .env 文件，设置您的 GitLab 配置
```

### 3. 启动开发服务器
```bash
# 方法 1: 使用 npm 脚本
node ./dist/index.js

# 方法 2: 直接运行
node dev-run.mjs
```

## 📝 环境变量说明

### 必需配置
- `GITLAB_PERSONAL_ACCESS_TOKEN`: GitLab 个人访问令牌
- `GITLAB_API_URL`: GitLab API 地址

### 可选配置
- `GITLAB_PROJECT_ID`: 默认项目 ID
- `GITLAB_READ_ONLY_MODE`: 只读模式 (true/false)
- `USE_GITLAB_WIKI`: 启用 Wiki 功能 (true/false)
- `USE_MILESTONE`: 启用里程碑功能 (true/false)
- `USE_PIPELINE`: 启用流水线功能 (true/false)
- `SSE`: 启用 Server-Sent Events 模式 (true/false)
- `STREAMABLE_HTTP`: 启用 Streamable HTTP 模式 (true/false)
- `GITLAB_IS_OLD`: 旧版 GitLab 兼容模式 (true/false)

## 🌐 协议支持

项目支持三种运行模式：

### 1. Stdio 模式（默认）
最基本的模式，通过标准输入输出与 MCP 客户端通信。
```bash
# 设置环境
export STREAMABLE_HTTP=false
export SSE=false
npm run dev
```

### 2. SSE 模式
使用 Server-Sent Events 进行实时通信。
```bash
# 设置环境
export SSE=true
export STREAMABLE_HTTP=false
npm run dev
```

### 3. Streamable HTTP 模式（推荐）
使用最新的 Streamable HTTP 协议，支持会话恢复和更好的错误处理。
```bash
# 设置环境
export STREAMABLE_HTTP=true
export SSE=false
npm run dev
```

## 📡 Streamable HTTP API

当启用 Streamable HTTP 模式时，服务器会提供以下端点：

### POST /mcp
处理 MCP 请求，支持会话管理和恢复。

### GET /mcp
通过 Server-Sent Events 接收服务器推送的通知。

### DELETE /mcp
终止指定的会话。

### GET /health
检查服务器状态。

### 示例用法

```bash
# 初始化会话
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}, "id": 1}'

# 使用会话 ID 进行后续请求
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: your-session-id" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 2}'
```

## 🛠️ 开发命令

### 代码开发
```bash
# 启动 TypeScript watch 模式（代码修改时自动编译）
npm run watch

# 启动开发服务器
npm run dev

# 构建项目
npm run build
```

### 代码质量
```bash
# 代码检查
npm run lint

# 自动修复代码风格问题
npm run lint:fix

# 格式化代码
npm run format

# 检查代码格式
npm run format:check
```

### 测试
```bash
# 运行测试
npm test

# 运行集成测试
npm run test:integration
```

## 📂 项目结构

```
gitlab-mcp/
├── index.ts              # 主入口文件
├── schemas.ts            # API 接口定义
├── dev-run.mjs          # 开发运行脚本
├── env.template         # 环境变量模板
├── .env                 # 本地环境变量（不会提交到版本控制）
├── build/               # 编译输出目录
├── test/                # 测试文件
└── scripts/             # 构建脚本
```

## 🔧 调试技巧

### 1. 启用详细日志
在 `.env` 文件中设置：
```bash
DEBUG=*
```

### 2. 只读模式测试
设置 `GITLAB_READ_ONLY_MODE=true` 来安全地测试功能。

### 3. 单独测试功能
通过环境变量控制启用的功能：
```bash
USE_GITLAB_WIKI=true
USE_MILESTONE=true
USE_PIPELINE=true
```

## 🌐 服务器模式

### SSE 模式
```bash
# 在 .env 中设置
SSE=true
```
服务器将在端口 3002 运行 SSE 服务。

### STDIO 模式（默认）
标准的 MCP 通信模式，适用于大多数客户端。

## 📖 客户端配置示例

### Claude Desktop
```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["path/to/build/index.js"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "your_token",
        "GITLAB_API_URL": "https://git.n.xiaomi.com/api/v4"
      }
    }
  }
}
```

### Cursor/VSCode
```json
{
  "servers": {
    "gitlab": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/build/index.js"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "your_token",
        "GITLAB_API_URL": "https://git.n.xiaomi.com/api/v4"
      }
    }
  }
}
```

## 🐛 常见问题

### Q: 服务器启动失败？
A: 检查环境变量是否正确设置，特别是 `GITLAB_PERSONAL_ACCESS_TOKEN`。

### Q: API 调用失败？
A: 检查 `GITLAB_API_URL` 是否正确，以及 token 是否有相应权限。

### Q: 功能不可用？
A: 检查相应的功能开关是否启用（如 `USE_GITLAB_WIKI`）。 