# MCP-Anywhere 🌐

**分布式MCP服务器架构 - 跨多台远程机器共享MCP工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 革命性的分布式MCP平台

MCP-Anywhere 实现了一个突破性的分布式架构，让 **MCP工具可以在多台远程机器之间共享**。网络中的任何一台机器都可以使用其他机器上的MCP工具，创建了一个真正的分布式AI代理生态系统。

## ✨ 核心特性

### 🌐 **跨机器工具共享**
- 在多台机器上部署MCP客户端
- 每台机器都可以访问其他所有连接机器上的工具
- 真正的分布式MCP架构

### 🔄 **实时工具聚合**
- 通过SSE（Server-Sent Events）自动发现和聚合MCP工具
- 动态工具注册和注销
- 当新机器加入或离开网络时实时更新

### 🎯 **智能路由与转发**
- 智能路由AI工具调用到正确的机器
- 自动负载均衡和故障转移
- 跨分布式网络的无缝执行

### 📱 **自动服务发现**
- 自动读取Claude Desktop配置
- 发现并启动本地MCP服务
- 为现有MCP设置提供零配置支持

### 🛠️ **双协议支持**
- **stdio协议**：用于本地MCP服务器
- **HTTP协议**：用于远程和基于Web的MCP服务器
- 无缝协议桥接和转换

## 🏗️ 系统架构

```
机器A (北京)        机器B (上海)        机器C (深圳)
   ↓                 ↓                 ↓
📱 MCP客户端      📱 MCP客户端      📱 MCP客户端
   ↘                 ↓                 ↙
      🌐 中央中继服务器 (云端)
   ↙                 ↑                 ↘
使用B+C工具        路由转发         使用A+B工具
```

## 🚀 快速开始

### 服务器端设置

1. **安装依赖**：
   ```bash
   cd server
   npm install
   ```

2. **启动中继服务器**：
   ```bash
   npm start
   ```

### 客户端设置

1. **安装依赖**：
   ```bash
   cd client
   npm install
   ```

2. **配置连接**：
   更新 `src/client.ts` 中的服务器URL

3. **启动客户端**：
   ```bash
   npm start
   ```

## 📁 项目结构

```
MCP-Anywhere/
├── server/                 # 中央中继服务器
│   ├── src/
│   │   ├── server.ts      # 服务器主要实现
│   │   └── types.ts       # TypeScript类型定义
│   └── package.json
├── client/                 # 分布式MCP客户端
│   ├── src/
│   │   ├── client.ts      # 客户端实现
│   │   └── types.ts       # TypeScript类型定义
│   └── package.json
├── docs/                   # 文档
│   └── README_zh.md       # 中文文档
├── DEPLOYMENT.md           # 部署指南
└── README.md              # 主文档（英文）
```

## 🌟 使用场景

### 🏢 **企业分布式AI**
- 跨不同部门共享专业工具
- 集中式AI能力与分布式执行
- 通过共享MCP工具实现跨团队协作

### 🔬 **研究与开发**
- 从不同机器访问计算资源
- 在团队间共享研究工具和数据集
- 分布式AI实验平台

### 🏠 **家庭实验室和个人使用**
- 从任何地方访问你的家庭服务器工具
- 在不同机器之间共享资源
- 个人分布式AI助手网络

## 🛡️ 安全特性

- **安全的WebSocket连接**，带有身份验证
- **网络隔离**选项，适用于敏感环境
- **访问控制**和权限管理
- **审计日志**记录所有工具执行

## 🚀 部署选项

### ☁️ **云部署**
- 在AWS、Azure或GCP上部署中继服务器
- 全球分布与边缘位置
- 基于需求的自动扩展

### 🏠 **自托管**
- 在你自己的基础设施上运行
- 完全控制数据和隐私
- 本地网络部署，适用于敏感工作负载

### 🐳 **Docker支持**
- 容器化部署
- 易于扩展和管理
- Kubernetes兼容性

## 💡 实际应用示例

### 🖥️ **开发团队协作**
```
开发机器A: 提供代码分析工具
测试机器B: 提供自动化测试工具
部署机器C: 提供部署和监控工具
→ 任何开发者都可以从一个地方使用所有工具
```

### 🏭 **企业IT基础设施**
```
数据中心A: 数据库管理工具
数据中心B: 网络监控工具
云环境C: 资源管理工具
→ 运维团队可以统一管理所有基础设施
```

### 🏠 **个人智能家居**
```
家庭服务器: 文件管理、媒体服务
办公电脑: 文档处理、开发工具
移动设备: 远程控制、监控工具
→ 创建个人分布式AI助手生态系统
```

## 🔧 高级配置

### 服务器配置选项
```typescript
// server/src/server.ts
const config = {
  port: 5555,                    // 服务器端口
  corsOrigin: "*",               // CORS设置
  maxClients: 100,               // 最大客户端数量
  heartbeatInterval: 30000,      // 心跳间隔
  toolCacheTimeout: 300000       // 工具缓存超时
};
```

### 客户端配置选项
```typescript
// client/src/client.ts
const config = {
  serverUrl: "http://localhost:5555",  // 服务器地址
  clientId: "auto-generated",          // 客户端ID
  reconnectInterval: 5000,             // 重连间隔
  maxReconnectAttempts: 10             // 最大重连次数
};
```

## 📊 监控和管理

### 实时监控
- 连接状态监控
- 工具调用统计
- 性能指标跟踪
- 错误日志分析

### 管理接口
```bash
# 查看服务器状态
curl http://your-server:5555/status

# 查看连接的客户端
curl http://your-server:5555/clients

# 查看可用工具
curl http://your-server:5555/tools
```

## 🛠️ 开发指南

### 添加新的MCP工具
1. 在客户端配置Claude Desktop配置文件
2. 客户端会自动发现并注册新工具
3. 服务器自动聚合新工具到工具列表

### 自定义客户端
```typescript
// 继承基础客户端类
class CustomMCPClient extends MCPClient {
  // 实现自定义工具逻辑
  async handleCustomTool(params: any) {
    // 自定义工具实现
  }
}
```

### 扩展服务器功能
```typescript
// 添加新的API端点
app.get('/custom-endpoint', (req, res) => {
  // 自定义功能实现
});
```

## 🔒 安全最佳实践

### 网络安全
- 使用HTTPS/WSS加密连接
- 配置防火墙规则
- 使用VPN进行内网通信
- 定期更新依赖包

### 访问控制
```typescript
// 实现客户端认证
const authenticateClient = (clientId: string, token: string) => {
  // 验证客户端身份
  return validateToken(clientId, token);
};
```

### 数据保护
- 敏感数据加密传输
- 工具执行结果过滤
- 审计日志记录
- 定期安全扫描

## 🐛 故障排除

### 常见问题

#### 1. 连接失败
```bash
# 检查网络连接
ping your-server-address

# 检查端口是否开放
telnet your-server-address 5555

# 查看防火墙设置
sudo ufw status
```

#### 2. 工具调用失败
```bash
# 检查MCP服务状态
ps aux | grep mcp

# 查看客户端日志
tail -f client/logs/client.log

# 检查服务器日志
tail -f server/logs/server.log
```

#### 3. 性能问题
```bash
# 监控资源使用
htop

# 检查网络延迟
ping -c 10 your-server-address

# 分析工具调用延迟
curl -w "@curl-format.txt" http://your-server:5555/tools
```

### 日志分析
- **服务器日志**：连接状态、工具调用记录、错误信息
- **客户端日志**：MCP服务状态、工具注册、网络连接
- **性能日志**：响应时间、资源使用、并发连接数

## 📈 路线图

### v1.1 计划功能
- [ ] Web管理界面
- [ ] 工具使用统计仪表板
- [ ] 客户端分组管理
- [ ] 更细粒度的权限控制

### v1.2 计划功能
- [ ] 负载均衡和高可用性
- [ ] 工具版本管理
- [ ] 自动故障转移
- [ ] 集群模式支持

### v2.0 计划功能
- [ ] 图形化配置界面
- [ ] 工具市场和共享
- [ ] 机器学习驱动的智能路由
- [ ] 跨云平台支持

## 🤝 贡献指南

我们欢迎各种形式的贡献！

### 如何贡献
1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 贡献类型
- 🐛 Bug修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX改进
- 🔧 性能优化
- 🧪 测试用例

### 开发环境设置
```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/MCP-Anywhere.git

# 安装依赖
cd MCP-Anywhere
npm install

# 启动开发环境
npm run dev
```

## 📄 许可证

本项目基于MIT许可证 - 详见 [LICENSE](../LICENSE) 文件

## 🌟 为什么选择MCP-Anywhere？

传统的MCP设置局限于单台机器。MCP-Anywhere打破了这些界限，创建了一个**分布式MCP生态系统**，其中：

- 🌐 **任何机器都可以使用其他任何机器的工具**
- 🔄 **实时同步**可用工具
- 🎯 **智能路由**确保最佳性能
- 📱 **零配置**设置，适用于现有MCP用户
- 🛠️ **协议无关** - 与任何MCP实现兼容

**将你的AI工作流程从孤立的岛屿转变为连接的智能群岛。**

---

**用 ❤️ 为MCP社区构建**

## 🔗 相关链接

- [English Documentation](../README.md)
- [部署指南](../DEPLOYMENT.md)
- [GitHub仓库](https://github.com/YOUR_USERNAME/MCP-Anywhere)
- [问题报告](https://github.com/YOUR_USERNAME/MCP-Anywhere/issues)
- [讨论区](https://github.com/YOUR_USERNAME/MCP-Anywhere/discussions) 