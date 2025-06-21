# 分布式MCP管理器 - 独立部署指南

## 📋 概述

分布式MCP管理器现在支持完全独立部署。Server和Client各自包含所需的所有代码和类型定义，无需共享依赖，可以分别部署在不同的机器上。

## 🏗️ 架构特点

- **🔄 完全解耦**：Server和Client完全独立，无共享依赖
- **📦 独立打包**：每个组件都可以单独编译和部署
- **🌐 跨机器部署**：支持在不同机器、不同网络环境中部署
- **🔧 简化维护**：独立的代码库，便于维护和升级

## 📁 项目结构

```
bidirectional-mcp/
├── server/                    # 独立的服务器组件
│   ├── src/
│   │   ├── server.ts          # 服务器主程序
│   │   └── types.ts           # 服务器类型定义
│   ├── package.json           # 服务器依赖
│   ├── tsconfig.json          # 服务器编译配置
│   └── dist/                  # 编译输出
├── client/                    # 独立的客户端组件
│   ├── src/
│   │   ├── client.ts          # 客户端主程序
│   │   └── types.ts           # 客户端类型定义
│   ├── package.json           # 客户端依赖
│   ├── tsconfig.json          # 客户端编译配置
│   └── dist/                  # 编译输出
├── deploy-packages/           # 预编译部署包
└── README.md                  # 项目文档
```

## 🚀 Server独立部署

### 1. 环境要求
- Node.js 18+
- npm 或 yarn

### 2. 部署步骤

```bash
# 1. 复制server目录到目标机器
scp -r bidirectional-mcp/server/ user@server-host:/opt/mcp-server/

# 2. 在服务器上安装依赖
cd /opt/mcp-server/
npm install

# 3. 编译项目
npm run build

# 4. 启动服务器
npm run start

# 或指定端口
PORT=8088 npm run start
```

### 3. 服务器配置

#### 环境变量
- `PORT`: 服务器端口（默认5555）

#### 启动选项
```bash
# 开发模式
npm run dev

# 生产模式
npm run start

# 指定端口
npm run start:8088
```

### 4. 服务验证

```bash
# 检查服务状态
curl http://localhost:5555/status

# 查看API文档
curl http://localhost:5555/tools
```

## 🔗 Client独立部署

### 1. 环境要求
- Node.js 18+
- npm 或 yarn
- 可访问MCP服务器（如filesystem、brave-search等）

### 2. 部署步骤

```bash
# 1. 复制client目录到目标机器
scp -r bidirectional-mcp/client/ user@client-host:/opt/mcp-client/

# 2. 在客户端机器上安装依赖
cd /opt/mcp-client/
npm install

# 3. 编译项目
npm run build

# 4. 配置MCP服务器（可选）
# 创建配置文件或使用默认配置

# 5. 启动客户端
npm run start <client-id> <server-url> [config-file]
```

### 3. 客户端配置

#### 启动参数
- `client-id`: 客户端唯一标识符
- `server-url`: 中继服务器地址
- `config-file`: MCP配置文件路径（可选）

#### 示例启动命令
```bash
# 使用默认配置
npm run start my-client http://server-host:5555

# 使用自定义配置
npm run start my-client http://server-host:5555 /path/to/config.json

# 开发模式
npm run dev
```

#### 配置文件格式
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 🌐 分布式部署示例

### 场景1: 单服务器多客户端

```bash
# 服务器 (server.example.com)
cd /opt/mcp-server/
PORT=5555 npm run start

# 客户端A (client-a.example.com)
cd /opt/mcp-client/
npm run start client-a http://server.example.com:5555

# 客户端B (client-b.example.com)  
cd /opt/mcp-client/
npm run start client-b http://server.example.com:5555
```

### 场景2: 多环境部署

```bash
# 开发环境服务器
PORT=5555 npm run start

# 测试环境服务器
PORT=5556 npm run start

# 生产环境服务器
PORT=5557 npm run start

# 客户端连接到不同环境
npm run start dev-client http://dev-server:5555
npm run start test-client http://test-server:5556
npm run start prod-client http://prod-server:5557
```

## 🐳 Docker部署（推荐）

### Server Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production

COPY server/src ./src
COPY server/tsconfig.json ./
RUN npm run build

EXPOSE 5555
CMD ["npm", "run", "start"]
```

### Client Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY client/package*.json ./
RUN npm ci --only=production

COPY client/src ./src
COPY client/tsconfig.json ./
RUN npm run build

CMD ["npm", "run", "start"]
```

### Docker Compose示例
```yaml
version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "5555:5555"
    environment:
      - PORT=5555

  mcp-client-a:
    build:
      context: .
      dockerfile: client/Dockerfile
    command: ["npm", "run", "start", "client-a", "http://mcp-server:5555"]
    depends_on:
      - mcp-server

  mcp-client-b:
    build:
      context: .
      dockerfile: client/Dockerfile
    command: ["npm", "run", "start", "client-b", "http://mcp-server:5555"]
    depends_on:
      - mcp-server
```

## 🔧 维护和监控

### 日志管理
```bash
# 服务器日志
npm run start > server.log 2>&1 &

# 客户端日志
npm run start client-id server-url > client.log 2>&1 &
```

### 健康检查
```bash
# 服务器健康检查
curl -f http://localhost:5555/status || exit 1

# 客户端连接检查
curl -s http://server:5555/clients | grep "client-id"
```

### 自动重启（systemd）

#### Server服务配置
```ini
[Unit]
Description=MCP Relay Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Client服务配置
```ini
[Unit]
Description=MCP Client
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-client
ExecStart=/usr/bin/npm run start client-id http://server:5555
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 🔒 安全考虑

### 网络安全
- 使用HTTPS和WSS协议
- 配置防火墙规则
- 使用VPN或私有网络

### 访问控制
- 实现客户端认证机制
- 配置API密钥验证
- 设置工具访问权限

### 数据保护
- 敏感数据加密传输
- 日志脱敏处理
- 定期安全审计

## 📊 性能优化

### 服务器优化
- 调整Node.js内存限制
- 配置连接池大小
- 启用gzip压缩

### 客户端优化
- 配置重连策略
- 优化MCP服务器启动
- 实现工具缓存机制

## 🆘 故障排除

### 常见问题

1. **连接失败**
   - 检查网络连通性
   - 验证端口是否开放
   - 确认服务器状态

2. **工具调用失败**
   - 检查MCP服务器状态
   - 验证工具参数格式
   - 查看错误日志

3. **性能问题**
   - 监控资源使用情况
   - 检查网络延迟
   - 优化工具执行逻辑

### 调试模式
```bash
# 启用详细日志
DEBUG=* npm run start

# 开发模式调试
npm run dev
```

## 🎯 最佳实践

1. **部署策略**
   - 使用容器化部署
   - 实现蓝绿部署
   - 配置负载均衡

2. **监控告警**
   - 设置服务监控
   - 配置错误告警
   - 实现性能监控

3. **备份恢复**
   - 定期备份配置
   - 测试恢复流程
   - 文档化部署过程

---

通过以上独立部署指南，您可以轻松地在不同环境中部署分布式MCP管理器，实现真正的分布式工具共享和协作。 