// EventSource will be imported dynamically
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import * as types from './types';
import fetch from 'node-fetch';

interface ClaudeDesktopConfig {
  mcpServers: {
    [serverName: string]: {
      // Stdio配置
      command?: string;
      args?: string[];
      env?: { [key: string]: string };
      
      // HTTP配置
      url?: string;
      headers?: { [key: string]: string };
      timeout?: number;
      
      // 传输类型
      type?: 'stdio' | 'http' | 'streamable-http';
    };
  };
}

interface MCPServerProcess {
  name: string;
  type: 'stdio' | 'http';
  
  // Stdio字段
  process?: ChildProcess;
  
  // HTTP字段
  url?: string;
  headers?: { [key: string]: string };
  timeout?: number;
  
  // 共同字段
  tools: types.MCPTool[];
  connected: boolean;
  requestId: number;
  pendingRequests: Map<string, {
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }>;
}

class StandaloneMCPClient {
  private clientId: string;
  private relayServerUrl: string;
  private eventSource: EventSource | null = null;
  private mcpServers: Map<string, MCPServerProcess> = new Map();
  private allTools: types.MCPTool[] = [];
  private port: number;

  constructor(clientId: string, relayServerUrl: string, port: number = 8088) {
    this.clientId = clientId;
    this.relayServerUrl = relayServerUrl;
    this.port = port;
  }

  async start(configPath?: string) {
    console.log(`🚀 Starting Standalone MCP Client: ${this.clientId}`);
    console.log(`📡 Relay Server: ${this.relayServerUrl}`);
    
    // 1. 读取Claude Desktop配置文件
    const config = await this.loadClaudeDesktopConfig(configPath);
    
    // 2. 启动所有MCP服务器
    await this.startMCPServers(config);
    
    // 3. 收集所有工具
    await this.collectAllTools();
    
    // 4. 注册到Relay Server
    await this.registerToRelay();
    
    // 5. 连接到Relay Server
    await this.connectToRelay();
    
    console.log(`✅ Client ${this.clientId} started successfully!`);
    console.log(`🔧 Total tools available: ${this.allTools.length}`);
  }

  private async loadClaudeDesktopConfig(configPath?: string): Promise<ClaudeDesktopConfig> {
    // 默认Claude Desktop配置文件路径
    const defaultPaths = [
      configPath,
      path.join(process.cwd(), 'claude_desktop_config.json'),
      path.join(os.homedir(), '.config', 'claude-desktop', 'claude_desktop_config.json'),
      path.join(os.homedir(), 'Library', 'Application Support', 'claude-desktop', 'claude_desktop_config.json')
    ].filter((p): p is string => p !== undefined);

    for (const configFile of defaultPaths) {
      try {
        console.log(`📋 Trying to load config: ${configFile}`);
        const content = await fs.readFile(configFile, 'utf-8');
        const config = JSON.parse(content) as ClaudeDesktopConfig;
        
        if (config.mcpServers) {
          console.log(`✅ Loaded config from: ${configFile}`);
          console.log(`📦 Found ${Object.keys(config.mcpServers).length} MCP servers`);
          return config;
        }
      } catch (error) {
        // 继续尝试下一个路径
      }
    }

    // 如果没有找到配置文件，使用默认配置
    console.log('⚠️ No Claude Desktop config found, using default config');
    return {
      mcpServers: {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
        },
        "brave-search": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-brave-search"],
          "env": {
            "BRAVE_API_KEY": "YOUR_BRAVE_API_KEY_HERE"
          }
        }
      }
    };
  }

  private async startMCPServers(config: ClaudeDesktopConfig) {
    console.log('🔧 Starting MCP servers...');
    
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        console.log(`📦 Starting MCP server: ${serverName}`);
        
        // 确定传输类型
        const transportType = this.detectTransportType(serverConfig);
        console.log(`   Transport: ${transportType}`);
        
        if (transportType === 'stdio') {
          await this.startStdioMCPServer(serverName, serverConfig);
        } else if (transportType === 'http') {
          await this.startHttpMCPServer(serverName, serverConfig);
        }
        
        console.log(`✅ MCP server ${serverName} started successfully`);
        
      } catch (error) {
        console.error(`❌ Failed to start MCP server ${serverName}:`, error);
      }
    }
  }

  private detectTransportType(serverConfig: any): 'stdio' | 'http' {
    // 明确指定类型
    if (serverConfig.type === 'http' || serverConfig.type === 'streamable-http') {
      return 'http';
    }
    if (serverConfig.type === 'stdio') {
      return 'stdio';
    }
    
    // 根据配置自动检测
    if (serverConfig.url) {
      return 'http';
    }
    if (serverConfig.command) {
      return 'stdio';
    }
    
    // 默认为stdio
    return 'stdio';
  }

  private async startStdioMCPServer(serverName: string, serverConfig: any) {
    // 获取平台兼容的命令
    const command = getCommandForPlatform(serverConfig.command);
    console.log(`   Command: ${command} ${(serverConfig.args || []).join(' ')}`);
    
    const childProcess = spawn(command, serverConfig.args || [], getSpawnOptions(serverConfig.env));

    const mcpServer: MCPServerProcess = {
      name: serverName,
      type: 'stdio',
      process: childProcess,
      tools: [],
      connected: false,
      requestId: 1,
      pendingRequests: new Map()
    };

    this.mcpServers.set(serverName, mcpServer);

    // 设置进程输出处理
    this.setupStdioMCPServerCommunication(mcpServer);

    // 初始化MCP服务器
    await this.initializeMCPServer(mcpServer);
  }

  private async startHttpMCPServer(serverName: string, serverConfig: any) {
    if (!serverConfig.url) {
      throw new Error(`HTTP MCP server ${serverName} requires url field`);
    }

    console.log(`   URL: ${serverConfig.url}`);
    
    const mcpServer: MCPServerProcess = {
      name: serverName,
      type: 'http',
      url: serverConfig.url,
      headers: serverConfig.headers || {},
      timeout: serverConfig.timeout || 10000,
      tools: [],
      connected: false,
      requestId: 1,
      pendingRequests: new Map()
    };

    this.mcpServers.set(serverName, mcpServer);

    // 初始化HTTP MCP服务器
    await this.initializeMCPServer(mcpServer);
  }

  private setupStdioMCPServerCommunication(mcpServer: MCPServerProcess) {
    if (!mcpServer.process) {
      throw new Error('No process available for stdio communication');
    }
    
    let buffer = '';
    
    mcpServer.process.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMCPServerMessage(mcpServer, message);
          } catch (error) {
            console.error(`❌ Failed to parse MCP message from ${mcpServer.name}:`, error);
          }
        }
      }
    });

    mcpServer.process.stderr?.on('data', (chunk: Buffer) => {
      console.error(`🔴 MCP server ${mcpServer.name} stderr:`, chunk.toString());
    });

    mcpServer.process.on('exit', (code) => {
      console.log(`🔴 MCP server ${mcpServer.name} exited with code ${code}`);
      mcpServer.connected = false;
    });
  }

  private handleMCPServerMessage(mcpServer: MCPServerProcess, message: any) {
    if (message.id && mcpServer.pendingRequests.has(message.id)) {
      const pending = mcpServer.pendingRequests.get(message.id)!;
      mcpServer.pendingRequests.delete(message.id);
      
      if (message.error) {
        pending.reject(new Error(message.error.message || 'MCP server error'));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private async sendMCPRequest(mcpServer: MCPServerProcess, method: string, params?: any): Promise<any> {
    if (mcpServer.type === 'stdio') {
      return this.sendStdioMCPRequest(mcpServer, method, params);
    } else if (mcpServer.type === 'http') {
      return this.sendHttpMCPRequest(mcpServer, method, params);
    } else {
      throw new Error(`Unsupported transport type: ${mcpServer.type}`);
    }
  }

  private async sendStdioMCPRequest(mcpServer: MCPServerProcess, method: string, params?: any): Promise<any> {
    if (!mcpServer.process) {
      throw new Error('No process available for stdio communication');
    }

    return new Promise((resolve, reject) => {
      const requestId = (mcpServer.requestId++).toString();
      
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method: method,
        params: params || {}
      };

      mcpServer.pendingRequests.set(requestId, { resolve, reject });

      const message = JSON.stringify(request) + '\n';
      mcpServer.process!.stdin?.write(message);

      // 设置超时
      setTimeout(() => {
        if (mcpServer.pendingRequests.has(requestId)) {
          mcpServer.pendingRequests.delete(requestId);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 10000);
    });
  }

  private async sendHttpMCPRequest(mcpServer: MCPServerProcess, method: string, params?: any): Promise<any> {
    if (!mcpServer.url) {
      throw new Error('No URL available for HTTP communication');
    }

    const requestId = (mcpServer.requestId++).toString();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: method,
      params: params || {}
    };

    try {
      const response = await fetch(mcpServer.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...mcpServer.headers
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(mcpServer.timeout || 10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'MCP server error');
      }

      return result.result;
    } catch (error) {
      console.error(`❌ HTTP MCP request failed for ${mcpServer.name}:`, error);
      throw error;
    }
  }

  private async initializeMCPServer(mcpServer: MCPServerProcess): Promise<void> {
    try {
      // 发送初始化请求
      const initResult = await this.sendMCPRequest(mcpServer, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'Standalone MCP Client',
          version: '1.0.0'
        }
      });

      console.log(`🤝 MCP server ${mcpServer.name} initialized:`, initResult);
      
      // 对于stdio服务器，发送initialized通知
      if (mcpServer.type === 'stdio' && mcpServer.process) {
        const notification = {
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        };
        mcpServer.process.stdin?.write(JSON.stringify(notification) + '\n');
      }
      // HTTP服务器通常不需要initialized通知，因为它们是无状态的

      mcpServer.connected = true;
    } catch (error) {
      console.error(`❌ Failed to initialize MCP server ${mcpServer.name}:`, error);
      throw error;
    }
  }

  private async collectAllTools() {
    console.log('🔍 Collecting tools from all MCP servers...');
    
    for (const [serverName, mcpServer] of this.mcpServers) {
      try {
        if (mcpServer.connected) {
          const tools = await this.getMCPServerTools(mcpServer);
          mcpServer.tools = tools;
          
          // 添加服务器前缀
          const prefixedTools = tools.map(tool => ({
            ...tool,
            name: `${serverName}.${tool.name}`,
            description: `[${serverName}] ${tool.description}`
          }));
          
          this.allTools.push(...prefixedTools);
          
          console.log(`📋 Server ${serverName}: ${tools.length} tools`);
        }
      } catch (error) {
        console.error(`❌ Failed to get tools from ${serverName}:`, error);
      }
    }
  }

  private async getMCPServerTools(mcpServer: MCPServerProcess): Promise<types.MCPTool[]> {
    try {
      const result = await this.sendMCPRequest(mcpServer, 'tools/list');
      return result.tools || [];
    } catch (error) {
      console.error(`❌ Failed to get tools from MCP server ${mcpServer.name}:`, error);
      // Fallback to default tool
      return [
        {
          name: "default_tool",
          description: `Default tool for ${mcpServer.name}`,
          inputSchema: {
            type: "object",
            properties: {},
            required: []
          }
        }
      ];
    }
  }

  private async registerToRelay() {
    const registration: types.ClientRegistration = {
      clientId: this.clientId,
      clientInfo: {
        name: `Standalone MCP Client (${this.clientId})`,
        version: '1.0.0'
      },
      capabilities: {
        tools: { listChanged: true }
      },
      tools: this.allTools
    };

    try {
      console.log('📤 Registering to Relay Server...');
      const response = await fetch(`${this.relayServerUrl}/client/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration)
      });

      const result = await response.json();
      console.log('✅ Registration successful:', result);
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  private async connectToRelay() {
    const sseUrl = `${this.relayServerUrl}/client/${this.clientId}/sse`;
    console.log('📡 Attempting to connect to Relay Server SSE:', sseUrl);
    
    try {
      const { EventSource: EventSourceClass } = require('eventsource');
      this.eventSource = new EventSourceClass(sseUrl);

      if (this.eventSource) {
        this.eventSource.onopen = () => {
          console.log('✅ SSE connection established');
        };

        this.eventSource.onmessage = (event: any) => {
          try {
            const data = JSON.parse(event.data);
            this.handleRelayMessage(data);
          } catch (error) {
            console.error('❌ Failed to parse SSE message:', error);
          }
        };

        this.eventSource.onerror = (error: any) => {
          console.error('❌ SSE connection error:', error);
          setTimeout(() => this.reconnect(), 5000);
        };
        
        console.log('✅ SSE connection attempt completed');
      }
    } catch (error) {
      console.error('⚠️ SSE connection failed, but client is still operational:', error);
      console.log('🔧 Client will continue running and can receive tool calls via HTTP endpoints');
    }
  }

  private async handleRelayMessage(message: types.MCPRequest | types.MCPNotification) {
    switch (message.method) {
      case 'connection/established':
        console.log('🔗 Connection established with Relay Server');
        break;

      case 'tools/call':
        await this.handleToolCall(message as types.CallToolRequest);
        break;

      default:
        console.log('❓ Unknown message method:', message.method);
    }
  }

  private async handleToolCall(request: types.CallToolRequest) {
    const toolName = request.params.name;
    console.log(`🛠️ Executing tool: ${toolName}`, request.params.arguments);

    try {
      // 工具名称格式: serverName.toolName (relay server已经去掉了clientId前缀)
      const parts = toolName.split('.');
      if (parts.length < 2) {
        throw new Error(`Invalid tool name format: ${toolName}`);
      }
      
      const serverName = parts[0];
      const actualToolName = parts.slice(1).join('.');
      
      const mcpServer = this.mcpServers.get(serverName);

      if (!mcpServer) {
        throw new Error(`Unknown MCP server: ${serverName}`);
      }

      const result = await this.executeMCPTool(serverName, actualToolName, request.params.arguments || {});

      const response: types.CallToolResponse = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{
            type: "text",
            text: result
          }]
        }
      };

      await this.sendToolResponse(response);

    } catch (error) {
      console.error('❌ Tool execution failed:', error);
      
      const errorResponse: types.CallToolResponse = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        }
      };

      await this.sendToolResponse(errorResponse);
    }
  }

  private async executeMCPTool(serverName: string, toolName: string, args: any): Promise<string> {
    const mcpServer = this.mcpServers.get(serverName);
    
    if (!mcpServer || !mcpServer.connected) {
      return `Error: MCP server ${serverName} is not connected`;
    }

    try {
      console.log(`🔧 Executing ${serverName}.${toolName} with args:`, args);
      
      const result = await this.sendMCPRequest(mcpServer, 'tools/call', {
        name: toolName,
        arguments: args
      });

      if (result.content && Array.isArray(result.content)) {
        return result.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
      }

      return JSON.stringify(result);
    } catch (error) {
      console.error(`❌ MCP tool execution failed:`, error);
      return `Error executing ${serverName}.${toolName}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async sendToolResponse(response: types.CallToolResponse) {
    try {
      await fetch(`${this.relayServerUrl}/client/${this.clientId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
      console.log('📤 Tool response sent to Relay Server');
    } catch (error) {
      console.error('❌ Failed to send tool response:', error);
    }
  }

  private async reconnect() {
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.connectToRelay();
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
    }
  }

  async stop() {
    console.log(`🔴 Stopping Standalone MCP Client: ${this.clientId}`);
    
    // 关闭SSE连接
    if (this.eventSource) {
      this.eventSource.close();
    }

    // 关闭所有MCP服务器进程
    for (const [serverName, mcpServer] of this.mcpServers) {
      console.log(`🛑 Stopping MCP server: ${serverName}`);
      mcpServer.process?.kill();
    }
  }
}

// Windows兼容性工具函数
function getCommandForPlatform(command: string): string {
  if (process.platform === 'win32') {
    // 在Windows上，npx需要加.cmd扩展名
    if (command === 'npx') {
      return 'npx.cmd';
    }
    // 其他常见命令也可能需要.cmd扩展名
    if (command === 'npm') {
      return 'npm.cmd';
    }
    if (command === 'node') {
      return 'node.exe';
    }
  }
  return command;
}

function getSpawnOptions(env?: { [key: string]: string }) {
  return {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'],
    // 在Windows上需要shell: true来正确处理命令
    shell: process.platform === 'win32'
  };
}

// 命令行启动
async function main() {
  const args = process.argv.slice(2);
  const clientId = args[0] || `client-${os.hostname()}`;
  const relayServerUrl = args[1] || 'http://localhost:5555';
  const configPath = args[2];

  console.log('🚀 Standalone MCP Client Starting...');
  console.log(`📝 Client ID: ${clientId}`);
  console.log(`🔗 Relay Server: ${relayServerUrl}`);
  if (configPath) {
    console.log(`⚙️ Config file: ${configPath}`);
  }

  const client = new StandaloneMCPClient(clientId, relayServerUrl);

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    await client.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    await client.stop();
    process.exit(0);
  });

  try {
    await client.start(configPath);
    
    console.log('\n✅ Standalone MCP Client is running!');
    console.log('   Press Ctrl+C to stop');
    
    // 保持运行
    setInterval(() => {
      console.log(`💓 Client ${clientId} heartbeat - ${new Date().toISOString()}`);
    }, 30000);
    
  } catch (error) {
    console.error('💥 Failed to start client:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { StandaloneMCPClient }; 