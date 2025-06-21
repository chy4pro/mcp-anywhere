# Configuration Examples

This directory contains example configuration files for MCP-Anywhere.

## 📁 Available Examples

### 🔧 `basic_config_example.json`
A minimal configuration with basic MCP servers:
- **filesystem**: File system operations
- **commands**: System command execution

**Use case**: Getting started with MCP-Anywhere

### 🌐 `claude_desktop_config_example.json`
A comprehensive configuration showing all supported features:
- **stdio servers**: Traditional MCP servers
- **HTTP servers**: Remote MCP servers
- **streamable-http**: Advanced HTTP streaming
- **Environment variables**: API key configuration
- **Headers**: Custom authentication

**Use case**: Production deployment with multiple server types

### 🚀 `simple_config_example.json`
The simplest possible configuration:
- **filesystem only**: Single MCP server setup

**Use case**: Testing and development

## 🛠️ How to Use

1. **Copy** any example file to your desired location
2. **Rename** it to `claude_desktop_config.json` or your preferred name
3. **Replace** placeholder values (`YOUR_*_HERE`) with real values
4. **Update** paths and URLs to match your environment
5. **Start** the MCP-Anywhere client with your configuration

## 🔑 Important Notes

- **Never commit real API keys** to version control
- **Replace all placeholder values** before use
- **Test configurations** in a safe environment first
- **Keep sensitive data** in environment variables when possible

## 📖 More Information

See the main [README.md](../README.md) for detailed setup instructions. 