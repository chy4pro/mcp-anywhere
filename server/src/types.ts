// MCP协议类型定义 - 服务器端
// 遵循真实的JSON-RPC 2.0格式

export interface MCPRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

// MCP核心数据结构
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
}

// 初始化相关
export interface InitializeRequest extends MCPRequest {
  method: "initialize";
  params: {
    protocolVersion: string;
    capabilities: MCPCapabilities;
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

export interface InitializeResponse extends MCPResponse {
  result: {
    protocolVersion: string;
    capabilities: MCPCapabilities;
    serverInfo: MCPServerInfo;
  };
}

// 工具相关
export interface ListToolsRequest extends MCPRequest {
  method: "tools/list";
  params?: {
    cursor?: string;
  };
}

export interface ListToolsResponse extends MCPResponse {
  result: {
    tools: MCPTool[];
    nextCursor?: string;
  };
}

export interface CallToolRequest extends MCPRequest {
  method: "tools/call";
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

export interface CallToolResponse extends MCPResponse {
  result?: {
    content: MCPContent[];
    isError?: boolean;
  };
  error?: MCPError;
}

export interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  uri?: string;
  mimeType?: string;
}

// 客户端注册（服务器端扩展）
export interface ClientRegistration {
  clientId: string;
  clientInfo: {
    name: string;
    version: string;
  };
  capabilities: MCPCapabilities;
  tools: MCPTool[];
}

// 服务器内部类型
export interface RegisteredClient {
  clientId: string;
  clientInfo: { name: string; version: string };
  capabilities: MCPCapabilities;
  tools: MCPTool[];
  connection: any; // SSE连接对象
  lastSeen: string;
} 