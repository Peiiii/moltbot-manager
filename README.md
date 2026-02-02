# OpenClaw Manager

[![npm version](https://img.shields.io/npm/v/openclaw-manager.svg)](https://www.npmjs.com/package/openclaw-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> OpenClaw (formerly Clawdbot) installation and configuration tool. Complete installation, configuration, and pairing locally in one place.

![OpenClaw Manager Screenshot](images/screenshots/openclaw-manager-en.png)

[中文文档](README.zh-CN.md)

---

## Quick Start

### NPM (Recommended)

```bash
npm i -g openclaw-manager
openclaw-manager start
```

Common commands:

- `openclaw-manager stop` - Stop the service
- `openclaw-manager stop-all` - Stop all instances
- `openclaw-manager reset` - Reset configuration

Specify admin credentials on first start:

```bash
openclaw-manager start --user admin --pass pass
```

### Script Installation

**Mac / Linux**

```bash
curl -fsSL https://openclaw-manager.com/install.sh | bash
```

The installation process will prompt you to set an admin username and password.

**Windows** (Not yet verified, use with caution)

```powershell
irm https://openclaw-manager.com/install.ps1 | iex
```

**Docker**

```bash
curl -fsSL https://openclaw-manager.com/docker.sh | bash
```

For more Docker parameters and instructions:
- [docs/get-started-docker.md](docs/get-started-docker.md)
- [docs/docker.md](docs/docker.md)

---

## Usage

1. Run the installation command → Manager service starts automatically
2. Open browser and visit `http://localhost:17321`
3. Log in with the username and password set during installation
4. Follow the guide to install OpenClaw CLI (npm package `clawdbot`)
5. Configure Discord Bot Token
6. Configure AI model (API Key)
7. Pair with your Bot
8. Done! Start using

---

## Features

- 🚀 **One-click deployment** - Get your AI assistant running in minutes
- 🖥️ **Web UI** - Intuitive configuration interface
- 🔒 **Local-first** - Your data stays on your device
- 🤖 **Multi-platform** - Discord, WhatsApp, Telegram support
- 🧠 **AI models** - OpenAI, Claude, and more

---

## Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Docker Deployment](docs/docker.md)
- [Configuration Reference](docs/configuration.md)

---

## Community

- GitHub: [https://github.com/Peiiii/openclaw-manager](https://github.com/Peiiii/openclaw-manager)
- Issues: [Report bugs or request features](https://github.com/Peiiii/openclaw-manager/issues)

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Related Projects

- [OpenClaw](https://github.com/Peiiii/openclaw) - The AI assistant framework
