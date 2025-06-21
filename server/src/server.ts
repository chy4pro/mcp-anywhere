import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import * as types from './types';

const app = express();

// 可配置的端口，默认5555，可通过环境变量或命令行参数覆盖
const PORT = process.env.PORT || process.argv[2] || 5555;

// CORS和中间件配置
app.use(cors());
app.use(express.json());
app.use(express.text());

// 存储已注册的客户端
const registeredClients: Map<string, types.RegisteredClient> = new Map();

// 存储AI会话的SSE连接
const aiConnections: Map<string, express.Response> = new Map();

// 存储待处理的工具调用请求
const pendingToolCalls: Map<string, {
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}> = new Map();

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

console.log(`🚀 Starting Bidirectional MCP Relay Server on port ${PORT}`);

// ===================
// AI接口 - MCP协议端点
// ===================

app.post('/mcp', async (req, res) => {
  const request: types.MCPRequest = req.body;
  console.log(`🤖 AI Request: ${request.method}`, request.id);

  try {
    switch (request.method) {
      case 'initialize':
        const initResult = handleInitialize(request as types.InitializeRequest);
        res.json(initResult);
        break;

      case 'tools/list':
        const toolsResult = handleListTools(request as types.ListToolsRequest);
        res.json(toolsResult);
        break;

      case 'tools/call':
        const callResult = await handleCallTool(request as types.CallToolRequest);
        res.json(callResult);
        break;

      default:
        res.status(400).json({
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        });
    }
  } catch (error) {
    console.error('❌ MCP request handling failed:', error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error'
      }
    });
  }
});

// AI的SSE连接端点
app.get('/sse', (req, res) => {
  console.log('🤖 AI SSE Connection established');
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sessionId = uuidv4();
  aiConnections.set(sessionId, res);

  // 发送连接确认
  res.write(`data: ${JSON.stringify({
    jsonrpc: "2.0",
    method: "connection/established", 
    params: { sessionId }
  })}\n\n`);

  req.on('close', () => {
    console.log('🤖 AI SSE Connection closed');
    aiConnections.delete(sessionId);
  });
});

// ===================
// 客户端接口 - 注册和通信
// ===================

// 客户端注册
app.post('/client/register', (req, res) => {
  const registration: types.ClientRegistration = req.body;
  
  console.log(`📝 Client registration: ${registration.clientId}`);
  console.log(`   Name: ${registration.clientInfo.name}`);
  console.log(`   Tools: ${registration.tools.length}`);

  const client: types.RegisteredClient = {
    clientId: registration.clientId,
    clientInfo: registration.clientInfo,
    capabilities: registration.capabilities,
    tools: registration.tools,
    lastSeen: new Date().toISOString(),
    connection: null
  };

  registeredClients.set(registration.clientId, client);

  res.json({
    success: true,
    message: `Client ${registration.clientId} registered successfully`,
    toolCount: registration.tools.length
  });
});

// 客户端SSE连接
app.get('/client/:clientId/sse', (req, res) => {
  const clientId = req.params.clientId;
  const client = registeredClients.get(clientId);

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  console.log(`📡 SSE connection from client: ${clientId}`);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 存储连接引用
  client.connection = res;
  client.lastSeen = new Date().toISOString();

  // 发送连接确认
  const welcomeMessage: types.MCPNotification = {
    jsonrpc: "2.0",
    method: "connection/established",
    params: {
      clientId: clientId,
      timestamp: new Date().toISOString()
    }
  };
  
  res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);

  // 处理连接断开
  req.on('close', () => {
    console.log(`📡 SSE connection closed: ${clientId}`);
    if (client) {
      client.connection = null;
    }
  });

  // 保持连接活跃 - 心跳机制
  const heartbeat = setInterval(() => {
    if (client.connection) {
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      };
      res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
});

// 处理客户端工具调用响应
app.post('/client/:clientId/response', (req, res) => {
  const clientId = req.params.clientId;
  const response = req.body as types.CallToolResponse;
  
  console.log(`📥 Received tool response from ${clientId}:`, JSON.stringify(response, null, 2));
  
  const requestId = response.id as string;
  const pending = pendingToolCalls.get(requestId);
  
  if (pending) {
    clearTimeout(pending.timeout);
    pendingToolCalls.delete(requestId);
    
    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }
  
  res.json({ success: true });
});

// ===================
// 状态和监控接口
// ===================

app.get('/status', (req, res) => {
  const serverUptime = process.uptime();
  const clientList = Array.from(registeredClients.values()).map(client => ({
    clientId: client.clientId,
    name: client.clientInfo.name,
    toolCount: client.tools.length,
    connected: client.connection !== null,
    lastSeen: client.lastSeen
  }));

  res.json({
    relayServer: {
      uptime: serverUptime,
      timestamp: new Date().toISOString(),
      port: PORT
    },
    clients: clientList,
    aiConnections: aiConnections.size
  });
});

app.get('/clients', (req, res) => {
  const clientList = Array.from(registeredClients.values()).map(client => ({
    clientId: client.clientId,
    name: client.clientInfo.name,
    tools: client.tools,
    connected: client.connection !== null,
    lastSeen: client.lastSeen
  }));
  
  res.json({ clients: clientList });
});

app.get('/tools', (req, res) => {
  const allTools: types.MCPTool[] = [];
  for (const client of registeredClients.values()) {
    for (const tool of client.tools) {
      allTools.push({
        ...tool,
        name: `${client.clientId}.${tool.name}`,
        description: `[${client.clientInfo.name}] ${tool.description}`
      });
    }
  }
  
  res.json({ tools: allTools });
});

// 工具调用HTTP端点
app.post('/call-tool', async (req, res) => {
  try {
    const { toolName, arguments: toolArguments } = req.body;
    
    if (!toolName) {
      res.status(400).json({ error: 'toolName is required' });
      return;
    }
    
    console.log(`🔧 HTTP Tool call: ${toolName}`);
    
    const request: types.CallToolRequest = {
      jsonrpc: "2.0",
      id: uuidv4(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: toolArguments || {}
      }
    };
    
    const response = await handleCallTool(request);
    
    if (response.error) {
      res.status(500).json(response.error);
    } else {
      res.json(response.result);
    }
  } catch (error) {
    console.error('❌ HTTP Tool call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================
// MCP协议处理器
// ===================

function handleInitialize(request: types.InitializeRequest): types.InitializeResponse {
  console.log('🤝 Initialize request from AI');
  
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: true },
        resources: {},
        prompts: {}
      },
      serverInfo: {
        name: "Bidirectional MCP Relay",
        version: "1.0.0",
        capabilities: {
          tools: { listChanged: true }
        }
      }
    }
  };
}

function handleListTools(request: types.ListToolsRequest): types.ListToolsResponse {
  console.log('🔧 Tools list request from AI');
  
  // 聚合所有客户端的工具
  const allTools: types.MCPTool[] = [];
  for (const client of registeredClients.values()) {
    for (const tool of client.tools) {
      allTools.push({
        ...tool,
        name: `${client.clientId}.${tool.name}`, // 添加客户端前缀
        description: `[${client.clientInfo.name}] ${tool.description}`
      });
    }
  }

  console.log(`📋 Returning ${allTools.length} tools from ${registeredClients.size} clients`);

  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      tools: allTools
    }
  };
}

async function handleCallTool(request: types.CallToolRequest): Promise<types.CallToolResponse> {
  const toolName = request.params.name;
  const dotIndex = toolName.indexOf('.');
  if (dotIndex === -1) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32602,
        message: `Invalid tool name format: ${toolName}`
      }
    };
  }
  
  const clientId = toolName.substring(0, dotIndex);
  const originalToolName = toolName.substring(dotIndex + 1);
  
  console.log(`🔧 Tool call: ${toolName} -> client: ${clientId}, tool: ${originalToolName}`);
  
  const targetClient = registeredClients.get(clientId);
  if (!targetClient) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32602,
        message: `Client ${clientId} not found`
      }
    };
  }

  if (!targetClient.connection) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: `Client ${clientId} is not connected`
      }
    };
  }

  try {
    // 转发工具调用到目标客户端
    const result = await forwardToolCallToClient(targetClient, {
      jsonrpc: "2.0",
      id: uuidv4(),
      method: "tools/call",
      params: {
        name: originalToolName,
        arguments: request.params.arguments
      }
    });
    
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: result
    };
  } catch (error) {
    console.error(`❌ Tool call failed: ${error}`);
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: `Tool execution failed: ${error}`
      }
    };
  }
}

async function forwardToolCallToClient(client: types.RegisteredClient, request: types.CallToolRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = request.id as string;
    const timeout = setTimeout(() => {
      pendingToolCalls.delete(requestId);
      reject(new Error('Tool call timeout'));
    }, 30000); // 30秒超时

    pendingToolCalls.set(requestId, { resolve, reject, timeout });

    // 通过SSE发送工具调用请求到客户端
    if (client.connection) {
      const message = JSON.stringify(request);
      client.connection.write(`data: ${message}\n\n`);
      console.log(`📤 Forwarded tool call to client ${client.clientId}`);
    } else {
      pendingToolCalls.delete(requestId);
      clearTimeout(timeout);
      reject(new Error('Client not connected'));
    }
  });
}

// ===================
// 启动服务器
// ===================

app.listen(PORT, () => {
  console.log(`✅ Bidirectional MCP Relay Server is running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/status`);
  console.log(`🔧 Tools endpoint: http://localhost:${PORT}/tools`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // 关闭所有客户端连接
  for (const client of registeredClients.values()) {
    if (client.connection) {
      client.connection.end();
    }
  }
  
  // 关闭所有AI连接
  for (const connection of aiConnections.values()) {
    connection.end();
  }
  
  console.log('👋 Server shutdown complete');
  process.exit(0);
}); 