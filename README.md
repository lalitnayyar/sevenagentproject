# 7-Agent Price Intelligence Dashboard

> **A production-ready React dashboard for orchestrating, monitoring, and interacting with 7 AI agents that scan, evaluate, and notify you about the best deals on Amazon — powered by LLaMA 3.2, GPT-4o, Claude Sonnet, ChromaDB, and Modal.com GPU inference.**

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [The 7 Agents](#the-7-agents)
4. [Module Screenshots](#module-screenshots)
5. [API Keys & Credentials](#api-keys--credentials)
6. [Quick Start](#quick-start)
7. [Docker Deployment](#docker-deployment)
8. [Interactive Management Scripts](#interactive-management-scripts)
9. [Log Collection & Diagnostics](#log-collection--diagnostics)
10. [Project Structure](#project-structure)
11. [User Guide](#user-guide)
12. [Development](#development)

---

## Overview

The **7-Agent Price Intelligence Dashboard** is a full-featured React web application that provides a unified control plane for a multi-agent AI system originally built across 5 Jupyter notebook days. Each agent has a dedicated module screen with live activity logs, configuration controls, and notebook-derived processing messages that show exactly what each agent is doing step by step.

**Key capabilities:**

| Capability | Detail |
|---|---|
| **8 dedicated screens** | One per agent group + dashboard + test lab + settings |
| **Live agent simulation** | Notebook-derived processing messages stream in real time |
| **Interactive API verification** | Test buttons make real HTTP calls to OpenAI, Anthropic, DeepSeek, HuggingFace, Pushover |
| **Recharts visualizations** | 5 charts: price accuracy, agent distribution, deal discounts, model error comparison, capability radar |
| **Docker-ready** | Multi-stage Dockerfile, docker-compose with 5 profiles, nginx reverse proxy |
| **One-command deployment** | Interactive PowerShell + Bash scripts with 11 menu options |
| **Log collection** | Full app + Docker logs zipped into timestamped archives |
| **GitHub Actions ready** | `.env.template` and `.gitignore` pre-configured |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    7-Agent Price Intelligence System                         │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    React Dashboard (Port 3000)                        │   │
│  │  Mission Control │ GPU Inference │ Knowledge Retrieval │ Deal Radar  │   │
│  │  Autonomous Ops  │ Grand Finale  │ Lab & Diagnostics   │ Command Vault│  │
│  └──────────────────────────────────────────────────────────────────────┘   │
│           │                │               │                │                │
│           ▼                ▼               ▼                ▼                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Modal.com   │  │  ChromaDB    │  │ OpenAI   │  │    Pushover      │    │
│  │ T4 GPU      │  │  Vector DB   │  │ Anthropic│  │  Push Alerts     │    │
│  │ LLaMA 3.2   │  │  400K items  │  │ DeepSeek │  │  MessengerAgent  │    │
│  └─────────────┘  └──────────────┘  └──────────┘  └──────────────────┘    │
│           │                │               │                                 │
│           ▼                ▼               ▼                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Python Agent Layer                                │    │
│  │                                                                       │    │
│  │  SpecialistAgent → FrontierAgent → EnsembleAgent → ScannerAgent     │    │
│  │       ↓                                                  ↓           │    │
│  │  AutonomousPlannerAgent ← DealAgentFramework ← MessengerAgent       │    │
│  │                              ↓                                       │    │
│  │                    price_is_right.py (Orchestrator)                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Data Flow

```
Amazon RSS Feeds
      │
      ▼
ScannerAgent ──── scans deals, summarizes with GPT-4o-mini
      │
      ▼
DealAgentFramework ─── orchestrates pricing for each deal
      │
      ├──► SpecialistAgent  ── LLaMA 3.2-3B on Modal GPU (fine-tuned)
      ├──► FrontierAgent    ── GPT-4o-mini + ChromaDB RAG
      └──► EnsembleAgent    ── weighted average of all estimates
                │
                ▼
      AutonomousPlannerAgent ── ReAct loop, tool-calling GPT-4o
                │
                ▼
      MessengerAgent ── Claude crafts message → Pushover notification
                │
                ▼
         Your Phone 📱
```

---

## The 7 Agents

| # | Agent | Module | Model | Role |
|---|---|---|---|---|
| 1 | **SpecialistAgent** | GPU Inference Engine | LLaMA 3.2-3B (fine-tuned, Modal GPU) | Estimates product prices using a fine-tuned LLM on T4 GPU via Modal.com |
| 2 | **FrontierAgent** | Knowledge Retrieval Hub | GPT-4o-mini + ChromaDB RAG | Uses vector similarity search over 400K products to price items |
| 3 | **EnsembleAgent** | Knowledge Retrieval Hub | Weighted average | Combines SpecialistAgent + FrontierAgent estimates with configurable weights |
| 4 | **ScannerAgent** | Deal Radar & Alerts | GPT-4o-mini | Scans Amazon RSS feeds, extracts deals, summarizes with LLM |
| 5 | **MessengerAgent** | Deal Radar & Alerts | Claude Sonnet 4.5 | Crafts exciting push notification messages and sends via Pushover |
| 6 | **AutonomousPlannerAgent** | Autonomous Operations | GPT-4o (tool calling) | ReAct loop planner that uses tools to investigate and evaluate deals |
| 7 | **DealAgentFramework** | Autonomous Operations | Orchestrator | Coordinates all agents, manages the deal evaluation pipeline |

---

## Module Screenshots

### Mission Control — Dashboard

> The central command center showing all 7 agents' live status, KPI metrics, and 5 Recharts visualizations including price accuracy, deal distribution, and model comparison.

![Mission Control Dashboard](docs/screenshots/screen6_dashboard.png)

**Features:**
- 4 KPI cards: Total Deals Scanned, Notifications Sent, Avg Price Accuracy, Active Agents
- Agent status grid with live activity indicators
- **Price Estimation Accuracy** — bar chart comparing SpecialistAgent vs FrontierAgent vs EnsembleAgent
- **Agent Activity Distribution** — pie chart of processing load per agent
- **Deal Discount Distribution** — histogram of discount ranges ($10–$200+)
- **Model Error Comparison** — horizontal bar chart (MAE by model)
- **System Capability Radar** — radar chart of agent capabilities
- 24-hour activity timeline with area chart
- "Start All Agents" button with animated status

---

### GPU Inference Engine — SpecialistAgent + Modal.com

> Deploy and run fine-tuned LLaMA 3.2-3B on Modal.com GPU infrastructure. Configure GPU type, monitor deployment status, and run live price estimations.

![GPU Inference Engine](docs/screenshots/screen1_gpu_inference.png)

**Features:**
- Modal.com deployment status panel
- GPU configuration (T4 / A10G / A100)
- Live price estimation with product description input
- Notebook-derived processing log terminal
- Source code preview for `pricer_service2.py`
- Quantization config display (BitsAndBytes 4-bit NF4)

---

### Knowledge Retrieval Hub — RAG + FrontierAgent + EnsembleAgent

> Visualize the RAG pipeline, query the ChromaDB vector store, and configure ensemble weights for combining multiple agent estimates.

![Knowledge Retrieval Hub](docs/screenshots/screen2_knowledge_retrieval.png)

**Features:**
- RAG pipeline flow diagram (Query → Embed → ChromaDB → Retrieve → Prompt → GPT-4o-mini)
- ChromaDB vector store stats (400K+ products, SentenceTransformer embeddings)
- FrontierAgent live query interface
- EnsembleAgent weight sliders (Specialist / Frontier / balance)
- Ensemble result comparison table

---

### Deal Radar & Alerts — ScannerAgent + MessengerAgent

> Monitor Amazon RSS feed scanning, view discovered deals in a live table, and configure Pushover notification delivery.

![Deal Radar & Alerts](docs/screenshots/screen3_deal_radar.png)

**Features:**
- RSS feed list with scan status indicators
- Live deals table with product name, listed price, estimated price, discount, and alert status
- MessengerAgent notification preview
- Pushover delivery configuration
- Claude message crafting log

---

### Autonomous Operations — AutonomousPlannerAgent + DealAgentFramework

> Visualize the ReAct reasoning loop, monitor tool calls, and see the full deal evaluation orchestration graph.

![Autonomous Operations](docs/screenshots/screen4_autonomous_ops.png)

**Features:**
- ReAct loop visualizer (Think → Act → Observe → Repeat)
- Tool call log (get_price, search_web, compare_deals)
- DealAgentFramework orchestration graph
- Agent coordination timeline
- Planning trace with GPT-4o tool-calling steps

---

### Grand Finale Arena — Price Is Right

> The full end-to-end pipeline in action. See all agents collaborate to evaluate deals and produce a ranked leaderboard of the best finds.

![Grand Finale Arena](docs/screenshots/screen5_grand_finale.png)

**Features:**
- Full pipeline execution panel
- Deal leaderboard with rankings, discounts, and confidence scores
- Scatter chart: Listed Price vs Estimated Price
- Agent contribution breakdown per deal
- Export results button

---

### Lab & Diagnostics — Test Scripts

> Run all 13 test scripts extracted from the original day1–day5 Jupyter notebooks directly from the browser.

![Lab & Diagnostics](docs/screenshots/screen7_test_lab.png)

**Features:**
- 13 test scripts grouped by notebook day (Day 1–5)
- Each test shows expected output and description
- Run individual tests or all tests in sequence
- Live output terminal with pass/fail indicators
- Copy script button for running in Python locally

---

### Command Vault — Settings & Configuration

> Central configuration hub for all API keys and parameters. Every key has a **live Test button** that makes a real API call and shows the response.

![Command Vault Settings](docs/screenshots/screen8_command_vault.png)

**Features:**
- 6 configuration tabs: LLM APIs, Modal.com, HuggingFace, Pushover, Vector DB, Model Config
- **Live API verification** for every key (see table below)
- Show/hide password toggle on all secret fields
- Export `.env` file button
- Save to localStorage with discard option

---

## API Keys & Credentials

All keys are configured in the **Command Vault** (Settings screen). Each has a dedicated **Test button** that makes a real verification request.

| Key | Where to Get | Used By | Test Button Behaviour |
|---|---|---|---|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | FrontierAgent (gpt-4o-mini), AutonomousPlannerAgent (gpt-4o), ScannerAgent (gpt-4o-mini) | Calls `GET /v1/models` — shows available model list + latency |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | MessengerAgent (claude-sonnet-4-5) | Sends a 5-token message to claude-haiku-4-5 — shows response text + latency |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | FrontierAgent (optional alternative) | Calls `GET /models` — shows available DeepSeek models + latency |
| `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` | [modal.com → Settings → Tokens](https://modal.com/settings/tokens) | SpecialistAgent (LLaMA on GPU) | Validates format (ak-... / as-...) — full CLI validation: `modal token set ...` |
| `HF_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | SpecialistAgent (model loading), RAG (SentenceTransformer) | Calls `GET /api/whoami-v2` — shows your HF username + account type |
| `PUSHOVER_USER` + `PUSHOVER_TOKEN` | [pushover.net](https://pushover.net) | MessengerAgent (push notifications) | Validates credentials AND sends a real test notification to your phone |

### Setting Up Keys

1. Open the app and navigate to **Command Vault** (gear icon in sidebar)
2. Enter your keys in the appropriate tab
3. Click **Verify [Key Name]** to test each key
4. Click **Save Settings** to persist to localStorage
5. Click **Export .env** to download a `.env` file for the Python agents

---

## Quick Start

### Prerequisites

- Node.js 22+ and pnpm
- Python 3.11+ (for running Python agents)
- Docker + Docker Compose (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/lalitnayyar/sevenagentproject.git
cd sevenagentproject

# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Open http://localhost:3000
```

### Python Agents Setup

```bash
# Navigate to the Python agents directory
cd python-agents

# Install dependencies
pip install -r requirements.txt
# or with uv:
uv sync

# Copy and fill in your .env
cp ../.env.template .env
# Edit .env with your API keys

# Run the main pipeline
python price_is_right.py
```

---

## Docker Deployment

### Build and Run (Production)

```bash
# Build the production image
docker build -t 7agent-dashboard:latest .

# Run with docker-compose (production profile)
docker-compose --profile prod up -d

# Access at http://localhost:80
```

### Development with Hot Reload

```bash
# Run with development profile (hot reload, port 3000)
docker-compose --profile dev up

# Access at http://localhost:3000
```

### Available Docker Compose Profiles

| Profile | Command | Port | Description |
|---|---|---|---|
| `prod` | `docker-compose --profile prod up -d` | 80 | Production nginx build |
| `dev` | `docker-compose --profile dev up` | 3000 | Hot-reload development |
| `staging` | `docker-compose --profile staging up -d` | 8080 | Staging environment |

### Environment Variables for Docker

```bash
# Copy the template
cp .env.template .env

# Edit with your keys
nano .env

# Start with env file
docker-compose --env-file .env --profile prod up -d
```

---

## Interactive Management Scripts

Two fully interactive management scripts are provided — one for **Windows PowerShell** and one for **Linux/macOS Bash**. Both have identical functionality.

### Linux / macOS

```bash
# Make executable (first time only)
chmod +x scripts/manage.sh

# Launch interactive menu
./scripts/manage.sh
```

### Windows PowerShell

```powershell
# Allow script execution (first time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Launch interactive menu
.\scripts\manage.ps1
```

### Menu Options

Both scripts present an interactive numbered menu:

```
╔══════════════════════════════════════════════════════╗
║     7-Agent Price Intelligence Dashboard             ║
║     Interactive Management Console                   ║
╚══════════════════════════════════════════════════════╝

  [1]  Deploy (Build + Start)
  [2]  Start containers
  [3]  Stop containers
  [4]  Restart containers
  [5]  Pull latest code + Rebuild
  [6]  Apply patch / hotfix
  [7]  Run diagnostics & auto-fix
  [8]  Collect logs + ZIP archive
  [9]  View live logs (tail -f)
  [10] Open app in browser
  [11] Full cleanup (containers + images)
  [0]  Exit
```

### Option Details

| Option | What it does |
|---|---|
| **Deploy** | `docker-compose build` → `docker-compose up -d` → health check → open browser |
| **Start** | `docker-compose start` — starts stopped containers without rebuilding |
| **Stop** | `docker-compose stop` — graceful shutdown |
| **Restart** | `docker-compose restart` — rolling restart |
| **Pull + Rebuild** | `git pull origin main` → `docker-compose build --no-cache` → `docker-compose up -d` |
| **Patch / Hotfix** | Prompts for patch description → `git stash` → `git pull` → rebuild → deploy |
| **Diagnostics** | Checks Docker status, port conflicts, disk space, container health, auto-restarts unhealthy containers |
| **Collect Logs + ZIP** | Collects all Docker logs, app logs, system info → zips into `logs_YYYYMMDD_HHMMSS.zip` |
| **Live Logs** | `docker-compose logs -f` — streaming log tail |
| **Open Browser** | Opens `http://localhost:80` in default browser |
| **Full Cleanup** | Stops containers, removes images, prunes volumes (with confirmation prompt) |

---

## Log Collection & Diagnostics

### Automated Log Collection

The **Collect Logs + ZIP** option (menu option 8) gathers:

```
logs_20260706_143022.zip
├── docker/
│   ├── agent-dashboard-prod.log      # Container stdout/stderr
│   ├── docker-compose-ps.txt         # Container status
│   └── docker-inspect.json           # Full container metadata
├── app/
│   ├── nginx-access.log              # HTTP access log
│   ├── nginx-error.log               # HTTP error log
│   └── build-output.txt              # Last build output
├── system/
│   ├── system-info.txt               # OS, CPU, memory, disk
│   ├── docker-version.txt            # Docker + compose versions
│   └── network-ports.txt             # Open ports snapshot
└── manifest.txt                      # Collection timestamp + summary
```

### Manual Log Commands

```bash
# View live container logs
docker-compose logs -f agent-dashboard

# Export logs to file
docker-compose logs --no-color > app_logs_$(date +%Y%m%d).txt

# Check container health
docker inspect --format='{{.State.Health.Status}}' agent-dashboard-prod

# View nginx access log inside container
docker exec agent-dashboard-prod cat /var/log/nginx/access.log
```

---

## Project Structure

```
sevenagentproject/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx    # Screen 6: Mission Control
│   │   │   ├── Screen1ModalSpecialist.tsx   # GPU Inference Engine
│   │   │   ├── Screen2RAGFrontierEnsemble.tsx  # Knowledge Retrieval Hub
│   │   │   ├── Screen3ScannerMessenger.tsx  # Deal Radar & Alerts
│   │   │   ├── Screen4PlannerFramework.tsx  # Autonomous Operations
│   │   │   ├── Screen5PriceIsRight.tsx      # Grand Finale Arena
│   │   │   ├── Screen7TestScripts.tsx       # Lab & Diagnostics
│   │   │   └── Screen8Settings.tsx          # Command Vault
│   │   ├── components/
│   │   │   ├── AppLayout.tsx        # Sidebar + navigation
│   │   │   └── AgentCard.tsx        # Shared: PageHeader, LogTerminal, AgentStatusCard
│   │   ├── contexts/
│   │   │   └── AgentContext.tsx     # Global agent state + notebook messages
│   │   └── index.css                # Blue-shades theme
├── python-agents/                   # Original Python agent source
│   ├── agents/
│   │   ├── specialist_agent.py
│   │   ├── frontier_agent.py
│   │   ├── ensemble_agent.py
│   │   ├── scanner_agent.py
│   │   ├── messaging_agent.py
│   │   ├── autonomous_planning_agent.py
│   │   └── deal_agent_framework.py
│   ├── pricer_service2.py           # Modal.com GPU service
│   ├── price_is_right.py            # Main orchestrator
│   └── notebooks/                   # day1.ipynb → day5.ipynb
├── scripts/
│   ├── manage.sh                    # Linux/macOS interactive management
│   └── manage.ps1                   # Windows PowerShell management
├── docs/
│   ├── screenshots/                 # Module screenshots for README
│   └── architecture_flow.png        # System architecture diagram
├── Dockerfile                       # Multi-stage production build
├── Dockerfile.dev                   # Development with hot reload
├── docker-compose.yml               # Multi-profile compose config
├── nginx.conf                       # Nginx reverse proxy config
├── .env.template                    # Environment variable template
├── prompt.md                        # All prompts used to build this app
└── README.md                        # This file
```

---

## User Guide

### Navigating the Dashboard

The sidebar on the left provides access to all 8 modules. The top-right corner shows the count of active agents and a global **Start All Agents** button at the bottom of the sidebar.

### Running Agents

1. Navigate to **Command Vault** and enter your API keys
2. Click **Verify** on each key to confirm it works
3. Return to **Mission Control** and click **Start All Agents**
4. Watch the activity logs stream in each agent's module
5. Monitor results in the **Grand Finale Arena**

### Viewing Test Scripts

1. Navigate to **Lab & Diagnostics**
2. Browse tests grouped by notebook day
3. Click **Run** on any test to see simulated output
4. Use **Copy** to get the Python code for local execution

### Configuring Ensemble Weights

1. Navigate to **Knowledge Retrieval Hub**
2. Scroll to the EnsembleAgent section
3. Adjust the weight sliders for SpecialistAgent vs FrontierAgent
4. The combined estimate updates in real time

### Exporting Configuration

1. Navigate to **Command Vault**
2. Fill in all your keys
3. Click **Export .env** to download a `.env` file
4. Place this file in the `python-agents/` directory

---

## Development

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 5.6 |
| Routing | Wouter 3 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Charts | Recharts 2 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| Build | Vite 7 |
| Container | Docker + Nginx 1.27 |

### Available Scripts

```bash
pnpm dev          # Start development server (port 3000)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm check        # TypeScript type check
pnpm format       # Prettier formatting
```

### Adding a New Agent Screen

1. Create `client/src/pages/ScreenNewAgent.tsx`
2. Add the route in `client/src/App.tsx`
3. Add the nav item in `client/src/components/AppLayout.tsx`
4. Add agent state in `client/src/contexts/AgentContext.tsx`

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

Built on top of the [7-Agent Price Intelligence prototype](https://github.com/lalitnayyar/sevenagentproject) — a multi-agent AI system for automated deal discovery and price estimation using fine-tuned LLMs, RAG, and autonomous planning.

**Original agent architecture by:** Ed Donner (LLM Engineering course)
**Dashboard UI by:** Lalit Nayyar

---

*Generated with the 7-Agent Dashboard prompt session — see [prompt.md](prompt.md) for the full build conversation.*
