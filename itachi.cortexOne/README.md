# CortexOne

> A powerful AI desktop application with advanced MCP integration and multi-provider support

[![Status](https://img.shields.io/badge/Status-Production-brightgreen?style=flat-square)](https://github.com/Itachi-1824/CortexOne)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)](https://github.com/Itachi-1824/CortexOne/releases)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](https://github.com/Itachi-1824/CortexOne/pulls)

## Overview

CortexOne is a modern desktop AI chat application built with Electron, React, and TypeScript. It provides seamless integration with multiple AI providers and implements the Model Context Protocol (MCP) for advanced tool capabilities, offering a Claude Desktop-inspired experience with enhanced flexibility.

### Key Features

- **🤖 Multi-Provider Support** - Connect to 15+ AI providers including OpenAI, Anthropic Claude, Google Gemini, and local Ollama instances
- **🔧 MCP Integration** - Full Model Context Protocol support with auto-discovery and tool integration
- **💬 Real-time Streaming** - Live response streaming with typing indicators for natural conversation flow
- **🧠 Smart Memory System** - Context-aware memory with session summarization and project organization
- **📁 Project Management** - Hierarchical organization with sessions grouped under projects
- **⚡ High Performance** - Optimized Electron architecture with React 19 and TypeScript
- **🎨 Modern UI** - Clean, responsive interface with dark theme and intuitive navigation

## Technology Stack

- **Frontend**: React 19.2.0, TypeScript 5.8.2
- **Desktop Framework**: Electron 38.2.1
- **Build Tool**: Vite 6.2.0
- **AI Integration**: OpenAI API, Google Generative AI, MCP Protocol
- **State Management**: Electron Store 11.0.2, Custom React Hooks
- **Speech Recognition**: Web Speech API (built-in browser support)

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Itachi-1824/CortexOne.git
cd CortexOne

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Package for distribution (coming soon)
npm run package
```

## Configuration

### Setting Up AI Providers

1. Open **Settings** from the sidebar
2. Navigate to **Provider Management**
3. Add your provider configuration:

```json
{
  "id": "openai-gpt4",
  "name": "OpenAI GPT-4",
  "baseURL": "https://api.openai.com/v1",
  "apiKey": "your-api-key-here",
  "models": ["gpt-4o", "gpt-4-turbo", "gpt-4"]
}
```

### Configuring MCP Servers

CortexOne supports MCP servers similar to Claude Desktop. Configure servers in the settings:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "alwaysAllowTools": ["*"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

**Built-in MCP Support:**
- Filesystem access
- Sequential thinking capabilities
- Custom tool integration
- Dynamic plugin loading

## Usage

### Basic Conversation

1. Create a new session from the sidebar
2. Select your preferred AI provider and model
3. Start chatting - responses stream in real-time
4. Sessions auto-save with generated titles

### Using MCP Tools

When MCP servers are configured, tools are automatically available to the AI:

- The AI can suggest using available tools
- Tool calls are executed automatically
- Results are seamlessly integrated into the conversation
- View tool activity in the message thread

### Project Organization

- Group related conversations under **Projects**
- Create projects from the sidebar
- Move sessions between projects
- Organize by topic, client, or workflow

### Memory System

CortexOne maintains context across conversations:

- **Session Memory**: Automatically summarizes long conversations
- **Cross-Session Context**: Retrieves relevant information from past chats
- **Project-Level Memory**: Shares context within project boundaries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Chat View   │  │   Sidebar    │  │   Settings   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              MCP Server Manager                        │ │
│  │  • Auto-discovery  • Tool Integration  • Lifecycle    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Multi-Provider Manager                       │ │
│  │  • OpenAI  • Anthropic  • Google  • Ollama           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Storage & Memory Service                     │ │
│  │  • Session Persistence  • Memory Compression          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Project Structure

```
cortexone/
├── src/
│   ├── components/          # React components
│   │   ├── ChatView.tsx    # Main chat interface
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── SettingsView.tsx # Settings management
│   │   └── modals/         # Modal dialogs
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic
│   │   ├── memoryService.ts
│   │   ├── mcpService.ts
│   │   └── providerService.ts
│   ├── types/              # TypeScript definitions
│   └── electron/           # Electron main process
├── public/                 # Static assets
└── package.json
```

### Available Scripts

```bash
npm run dev          # Start development environment
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Development Guidelines

- **Code Style**: Follow TypeScript and React best practices
- **Type Safety**: Maintain strict TypeScript compliance
- **Performance**: Keep response times under 100ms where possible
- **Testing**: Add tests for new features (test suite in development)

## Roadmap

We're actively developing the following features:

- [ ] **Voice Input & Commands** - Hands-free interaction with continuous speech recognition
- [ ] **Live Mode** - Real-time collaborative sessions with streaming awareness
- [ ] **Plugin Marketplace** - Community-driven MCP server and tool discovery
- [ ] **Image Generation** - Integrated image creation and editing capabilities
- [ ] **Mobile Companion App** - iOS/Android sync with desktop sessions
- [ ] **Custom Themes** - User-created color schemes and UI customization
- [ ] **Offline Mode** - Local-only operation with cached models
- [ ] **Enhanced Analytics** - Usage statistics and conversation insights

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas We Need Help

- Additional AI provider integrations (Mistral, Cohere, etc.)
- MCP server implementations
- UI/UX improvements
- Documentation and tutorials
- Bug reports and fixes

## Troubleshooting

### Common Issues

**MCP Servers Not Loading**
- Verify Node.js and npx are in your PATH
- Check server command syntax in settings
- Review console logs for error messages

**API Connection Errors**
- Confirm API keys are valid and active
- Check base URLs for custom providers
- Verify network connectivity

**Performance Issues**
- Clear old sessions to reduce memory usage
- Limit concurrent MCP servers
- Check for resource-heavy background processes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [Claude Desktop](https://claude.ai/download) and the MCP protocol
- Built with [Electron](https://www.electronjs.org/), [React](https://react.dev/), and [Vite](https://vitejs.dev/)
- AI integration powered by OpenAI, Anthropic, and Google APIs
- Community contributors and beta testers

## Support

- **Issues**: [GitHub Issues](https://github.com/Itachi-1824/CortexOne/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Itachi-1824/CortexOne/discussions)
- **Documentation**: [Wiki](https://github.com/Itachi-1824/CortexOne/wiki)

---

<div align="center">

**Built with ❤️ for the AI community**

⭐ Star this repository if you find CortexOne useful!

[Download](https://github.com/Itachi-1824/CortexOne/releases) • [Documentation](https://github.com/Itachi-1824/CortexOne/wiki) • [Report Bug](https://github.com/Itachi-1824/CortexOne/issues)

</div>
