# MCP-Anywhere 🌐

**Distributed MCP Server Architecture - Share MCP tools across multiple remote machines**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 📖 **[中文文档 (Chinese Documentation)](docs/README_zh.md)**

## 🚀 Revolutionary Distributed MCP Platform

MCP-Anywhere enables a groundbreaking distributed architecture where **MCP tools can be shared across multiple remote machines**. Any machine in your network can use MCP tools from other machines, creating a truly distributed AI agent ecosystem.

## ✨ Core Features

### 🌐 **Cross-Machine Tool Sharing**
- Deploy MCP clients on multiple machines
- Each machine can access tools from all other connected machines
- True distributed MCP architecture

### 🔄 **Real-Time Tool Aggregation**
- Automatic discovery and aggregation of MCP tools via SSE (Server-Sent Events)
- Dynamic tool registration and deregistration
- Live updates when new machines join or leave the network

### 🎯 **Intelligent Routing & Forwarding**
- Smart routing of AI tool calls to the correct machine
- Automatic load balancing and failover
- Seamless execution across the distributed network

### 📱 **Auto Service Discovery**
- Automatically reads Claude Desktop configuration
- Discovers and starts local MCP services
- Zero-configuration setup for existing MCP setups

### 🛠️ **Dual Protocol Support**
- **stdio protocol**: For local MCP servers
- **HTTP protocol**: For remote and web-based MCP servers
- Seamless protocol bridging and translation

## 🏗️ Architecture

```
Machine A (Beijing)     Machine B (Shanghai)     Machine C (Shenzhen)
   ↓                       ↓                       ↓
📱 MCP Client          📱 MCP Client           📱 MCP Client
   ↘                       ↓                       ↙
      🌐 Central Relay Server (Cloud)
   ↙                       ↑                       ↘
Use B+C tools         Route & Forward         Use A+B tools
```

## 🚀 Quick Start

### Server Setup

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Start the relay server**:
   ```bash
   npm start
   ```

### Client Setup

1. **Install dependencies**:
   ```bash
   cd client
   npm install
   ```

2. **Configure connection**:
   Update `src/client.ts` with your server URL

3. **Start the client**:
   ```bash
   npm start
   ```

## 📁 Project Structure

```
MCP-Anywhere/
├── server/                 # Central relay server
│   ├── src/
│   │   ├── server.ts      # Main server implementation
│   │   └── types.ts       # TypeScript type definitions
│   └── package.json
├── client/                 # Distributed MCP client
│   ├── src/
│   │   ├── client.ts      # Client implementation
│   │   └── types.ts       # TypeScript type definitions
│   └── package.json
├── examples/               # Configuration examples
│   ├── README.md          # Examples documentation
│   ├── basic_config_example.json      # Basic setup
│   ├── simple_config_example.json     # Minimal setup
│   └── claude_desktop_config_example.json  # Full features
├── docs/                   # Documentation
│   └── README_zh.md       # Chinese documentation
├── DEPLOYMENT.md           # Deployment guide
└── README.md              # This file
```

## 🌟 Use Cases

### 🏢 **Enterprise Distributed AI**
- Share specialized tools across different departments
- Centralized AI capabilities with distributed execution
- Cross-team collaboration through shared MCP tools

### 🔬 **Research & Development**
- Access computational resources from different machines
- Share research tools and datasets across the team
- Distributed AI experimentation platform

### 🏠 **Home Lab & Personal Use**
- Access your home server tools from anywhere
- Share resources between your different machines
- Personal distributed AI assistant network

## 🛡️ Security Features

- **Secure WebSocket connections** with authentication
- **Network isolation** options for sensitive environments
- **Access control** and permission management
- **Audit logging** for all tool executions

## 🚀 Deployment Options

### ☁️ **Cloud Deployment**
- Deploy the relay server on AWS, Azure, or GCP
- Global distribution with edge locations
- Auto-scaling based on demand

### 🏠 **Self-Hosted**
- Run on your own infrastructure
- Complete control over data and privacy
- Local network deployment for sensitive workloads

### 🐳 **Docker Support**
- Containerized deployment
- Easy scaling and management
- Kubernetes compatibility

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Why MCP-Anywhere?

Traditional MCP setups are limited to single machines. MCP-Anywhere breaks these boundaries by creating a **distributed MCP ecosystem** where:

- 🌐 **Any machine can use tools from any other machine**
- 🔄 **Real-time synchronization** of available tools
- 🎯 **Intelligent routing** ensures optimal performance
- 📱 **Zero-configuration** setup for existing MCP users
- 🛠️ **Protocol-agnostic** - works with any MCP implementation

**Transform your AI workflow from isolated islands to a connected archipelago of intelligence.**

---

**Built with ❤️ for the MCP community** 