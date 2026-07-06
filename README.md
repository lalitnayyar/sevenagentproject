# 7-Agent Price Intelligence Dashboard

**A comprehensive React-based control centre for monitoring, running, and visualising seven AI pricing agents — from fine-tuned LLaMA models on Modal.com to RAG-enhanced frontier LLMs, autonomous planners, and real-time deal scanners.**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Screen-by-Screen Feature Guide](#screen-by-screen-feature-guide)
4. [Agent Reference](#agent-reference)
5. [Technology Stack](#technology-stack)
6. [Quick Start](#quick-start)
7. [Docker Deployment](#docker-deployment)
8. [Interactive Management Scripts](#interactive-management-scripts)
9. [API Keys & Configuration](#api-keys--configuration)
10. [Dashboard Visualisations](#dashboard-visualisations)
11. [Test Scripts](#test-scripts)
12. [Troubleshooting & Diagnostics](#troubleshooting--diagnostics)
13. [Project Structure](#project-structure)
14. [Disclaimer](#disclaimer)

---

## Overview

The 7-Agent Price Intelligence Dashboard is a production-ready React 19 + Tailwind CSS 4 single-page application that provides a unified control plane for an ensemble of AI pricing agents originally developed in Jupyter notebooks across five days of experimentation. The application translates every notebook cell, processing step, and agent interaction into an interactive, real-time web interface — making the entire pipeline accessible without touching Python or a terminal.

The system covers the full lifecycle of AI-driven price estimation: from deploying a fine-tuned LLaMA model on Modal.com's serverless GPU infrastructure, through RAG-augmented frontier model queries, neural network ensemble weighting, autonomous deal scanning with push notifications, to a final "Price Is Right" game-show-style reveal of the best estimate.

| Capability | Detail |
|---|---|
| **Screens** | 8 (5 agent screens + Dashboard + Test Runner + Settings) |
| **Agents** | 7 (Specialist, Frontier, Ensemble, Scanner, Messenger, Planner, Framework) |
| **Charts** | 5 (Price Accuracy, Agent Distribution, Deal Discounts, Ensemble Comparison, Activity Timeline) |
| **Theme** | Blue shades, light background, professional data-engineering aesthetic |
| **Deployment** | Docker (multi-stage), docker-compose, PowerShell + Bash management scripts |

---

## Architecture

The application follows a clean three-layer architecture:

**Presentation Layer** — React 19 pages and components, Tailwind CSS 4 design tokens, shadcn/ui component library, Recharts for data visualisation, Framer Motion for animations, and Wouter for client-side routing.

**State Layer** — A single `AgentContext` (React Context + `useReducer`) acts as the central store. It holds all seven agent states, their activity logs (derived from actual notebook processing steps), deal records, price estimations, and user settings. Settings are persisted to `localStorage` so API keys survive page reloads.

**Simulation Layer** — Because the dashboard is a pure frontend application, agent "runs" are simulated using timed sequences of log messages extracted directly from the original Jupyter notebooks. Each message reflects a real processing step — model loading, ChromaDB querying, RSS feed scanning, push notification dispatch — giving an authentic representation of what the Python agents actually do.

```
client/src/
├── contexts/AgentContext.tsx   ← Central state store (all 7 agents)
├── components/
│   ├── AppLayout.tsx           ← Sidebar + top bar shell
│   └── AgentCard.tsx           ← Shared AgentControlCard + LogTerminal
├── pages/
│   ├── DashboardPage.tsx       ← Screen 6: Overview + 5 Recharts graphs
│   ├── Screen1ModalSpecialist.tsx
│   ├── Screen2RAGFrontierEnsemble.tsx
│   ├── Screen3ScannerMessenger.tsx
│   ├── Screen4PlannerFramework.tsx
│   ├── Screen5PriceIsRight.tsx
│   ├── Screen7TestScripts.tsx
│   └── Screen8Settings.tsx
└── index.css                   ← Blue-shades design tokens + custom classes
```

---

## Screen-by-Screen Feature Guide

### Screen 1 — Modal.com & Specialist Agent

This screen covers the infrastructure layer of the pricing pipeline. The left panel explains Modal.com's serverless GPU platform and shows the deployment configuration for the fine-tuned LLaMA 3.2-3B model (the `pricer-service`). Key parameters — GPU type (T4), quantisation (4-bit NF4), container timeout, and the Modal token — are displayed alongside a live status indicator.

The right panel controls the **Specialist Agent** itself. Users can enter a product description, click **Run Specialist**, and watch the log terminal replay the actual notebook processing steps: tokenising the prompt, calling the Modal endpoint, receiving the logit-based price estimate, and formatting the result. The agent's metrics (total runs, success rate, average response time) update in real time.

### Screen 2 — RAG, Frontier Agent & Ensemble Agent

This screen presents three tightly coupled agents that together form the core ensemble. The **RAG panel** shows the ChromaDB vector store configuration — the embedding model (`all-MiniLM-L6-v2`), the collection name, and the number of similar items retrieved per query. A visual representation of the retrieval pipeline (query → embed → search → context) is rendered as an animated flow diagram.

The **Frontier Agent** panel allows selection between GPT-4o-mini and DeepSeek-V3 as the underlying model. It shows the RAG-augmented prompt construction and the model's price estimate alongside confidence indicators.

The **Ensemble Agent** panel displays the weighted combination formula: `0.4 × Specialist + 0.35 × Frontier + 0.25 × Neural`. Users can adjust weights interactively and see how the final estimate changes. All three agents share a unified log terminal that streams their interleaved activity.

### Screen 3 — Scanner Agent & Messenger Agent

The **Scanner Agent** monitors RSS feeds from deal aggregator sites (Slickdeals, DealNews, TechBargains) and applies the pricing pipeline to each product found. This screen shows the feed configuration, the scanning interval, and a live deal table with product name, listed price, AI-estimated value, and computed discount.

The **Messenger Agent** (powered by Claude Sonnet) monitors the deal stream and dispatches Pushover push notifications when a deal exceeds the configured discount threshold (default $50). The screen shows the Pushover credentials panel, the notification template, and a log of all notifications sent in the current session.

### Screen 4 — Autonomous Planner Agent & Deal Agent Framework

The **Autonomous Planner Agent** uses GPT-4o as its reasoning backbone and implements a ReAct (Reason + Act) loop. This screen visualises the planning cycle: the agent receives a high-level objective (e.g., "find the best laptop deal under $800"), decomposes it into sub-tasks, calls the appropriate specialist tools, evaluates results, and iterates. The tool call log shows each function invocation with its arguments and return value.

The **Deal Agent Framework** panel explains the orchestration architecture: how the Planner delegates to the Scanner, Frontier, and Specialist agents; how results are aggregated; and how the final recommendation is produced. A dependency graph shows the agent call chain.

### Screen 5 — The Price Is Right Finale

This is the culmination screen — a game-show-inspired reveal of the ensemble's final price estimate. Users enter a product description and click **Estimate Price**. The screen animates through each agent's individual estimate (Specialist → Frontier → Neural → Ensemble) with a dramatic countdown, then reveals the final weighted estimate alongside the actual price (if provided) and the percentage error.

A leaderboard table shows historical estimates ranked by accuracy, and a scatter plot compares predicted vs actual prices across all past runs.

### Screen 6 — Dashboard

The dashboard provides a real-time overview of all seven agents simultaneously. Four KPI cards at the top show total agent runs, average success rate, deals found, and total savings discovered. Below, a grid of agent cards shows each agent's current status, key metrics, and a link to its dedicated screen.

Five Recharts visualisations occupy the lower half of the page:

- **Price Prediction Accuracy vs Actual** — grouped bar chart comparing each model's estimate against the actual price for the last five products
- **Agent Run Distribution** — pie/donut chart showing the proportion of total runs contributed by each agent
- **Deal Discount Distribution** — bar chart showing the frequency of deals by discount range ($0–25, $25–50, $50–100, $100+)
- **Ensemble Model Comparison** — radar chart comparing Specialist, Frontier, and Neural agents across accuracy, speed, cost, and reliability axes
- **Agent Activity Timeline** — area chart showing runs per hour over the last 24 hours, with each agent as a separate series

### Screen 7 — Test Scripts

This screen provides an in-browser test runner for the Python test scripts extracted from the original Jupyter notebooks. Each test is displayed as a card with its source file, description, and expected output. Users can click **Run** to simulate execution and see the output in a terminal-style panel. Tests are grouped by day (Day 1–5) and by agent.

### Screen 8 — Settings

A comprehensive settings panel organised into six sections: **LLM API Keys** (OpenAI, Anthropic, DeepSeek), **Modal.com** (token ID and secret), **HuggingFace** (token and username), **Pushover** (user key and app token), **Local Services** (ChromaDB path, Ollama URL, preprocessor model), and **Agent Parameters** (deal threshold, max datapoints, fine-tuned model revision). All sensitive fields use password-type inputs with a show/hide toggle. Settings are saved to `localStorage` and can be exported as a `.env` file.

---

## Agent Reference

| Agent | Screen | Model | Purpose |
|---|---|---|---|
| **Specialist Agent** | 1 | Fine-tuned LLaMA 3.2-3B (Modal.com T4 GPU) | Token-level price regression from product description |
| **Frontier Agent** | 2 | GPT-4o-mini / DeepSeek-V3 + ChromaDB RAG | LLM price estimation with similar-item context |
| **Ensemble Agent** | 2 | Weighted combination (0.4/0.35/0.25) | Combines Specialist + Frontier + Neural for best accuracy |
| **Scanner Agent** | 3 | GPT-4o-mini (deal evaluation) | RSS feed scraper + pricing pipeline for deal discovery |
| **Messenger Agent** | 3 | Claude Sonnet (notification drafting) | Push notification dispatch via Pushover when deal > threshold |
| **Autonomous Planner** | 4 | GPT-4o (ReAct loop) | High-level goal decomposition and agent orchestration |
| **Deal Agent Framework** | 4 | Orchestration layer | Coordinates all agents into a unified deal-finding pipeline |

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript 5.6 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Charts** | Recharts 2.15 |
| **Animation** | Framer Motion 12 |
| **Routing** | Wouter 3.3 |
| **Build Tool** | Vite 7 |
| **Package Manager** | pnpm 10 |
| **Container** | Docker (multi-stage: Node 22-alpine → Nginx 1.27-alpine) |
| **Web Server** | Nginx with gzip, security headers, SPA routing |

---

## Quick Start

### Prerequisites

- Node.js 22+ and pnpm 10+
- Docker Desktop (for containerised deployment)
- Git

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/lalitnayyar/sevenagentproject.git
cd sevenagentproject

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.template .env
# Edit .env and add your API keys

# 4. Start development server (hot reload)
pnpm run dev
# → http://localhost:5173
```

---

## Docker Deployment

### Single-Command Production Deploy

```bash
# Build and start
docker build -t agent-dashboard:latest .
docker run -d --name agent-dashboard --restart unless-stopped \
  -p 3000:80 --env-file .env agent-dashboard:latest

# → http://localhost:3000
```

### Docker Compose (Recommended)

```bash
# Production (dashboard only)
docker compose up -d

# Development (with HMR)
docker compose --profile dev up

# With Python agent backend
docker compose --profile agents up -d

# With log viewer (Dozzle at :9999)
docker compose --profile monitoring up -d
```

### Available Compose Profiles

| Profile | Services Started | Use Case |
|---|---|---|
| *(default)* | `dashboard` | Production frontend only |
| `dev` | `dashboard-dev` | Development with hot reload |
| `agents` | `dashboard` + `agent-backend` | Full stack with Python agents |
| `proxy` | `dashboard` + `proxy` | Behind Nginx reverse proxy |
| `monitoring` | `dashboard` + `log-viewer` | With Dozzle log UI |

---

## Interactive Management Scripts

Two fully interactive management scripts are provided — one for Windows PowerShell and one for Linux/macOS Bash. Both offer identical functionality through a numbered menu.

### Linux / macOS

```bash
chmod +x scripts/manage.sh
./scripts/manage.sh

# Or use direct commands (non-interactive):
./scripts/manage.sh deploy    # Full build + start
./scripts/manage.sh start     # Start existing container
./scripts/manage.sh stop      # Stop container
./scripts/manage.sh restart   # Restart container
./scripts/manage.sh pull      # Pull latest code + rebuild
./scripts/manage.sh patch     # Hot patch (rebuild only)
./scripts/manage.sh fix       # Diagnostics + auto-fix
./scripts/manage.sh logs      # Collect all logs + ZIP
./scripts/manage.sh live      # Follow live logs
./scripts/manage.sh cleanup   # Remove all containers/images
./scripts/manage.sh status    # Show current status
```

### Windows PowerShell

```powershell
# Run as Administrator recommended
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\manage.ps1
```

### Menu Options Reference

| Option | Action | Description |
|---|---|---|
| **1** | Deploy | Full Docker build + container start. Copies `.env.template` if `.env` missing. |
| **2** | Start | Start an existing stopped container, or `docker compose up -d`. |
| **3** | Stop | Stop (and optionally remove) the running container. |
| **4** | Restart | `docker restart` — fastest way to apply config changes. |
| **5** | Pull & Rebuild | `git pull origin main` → rebuild image → restart container. |
| **6** | Patch | Build a new image with a timestamped tag, then hot-swap the container. |
| **7** | Fix | Runs diagnostics (container status, port, image, .env, disk) then auto-fixes. |
| **8** | Collect Logs + ZIP | Gathers container logs, nginx logs, app logs, system info, env (redacted) → ZIP. |
| **9** | Live Logs | `docker logs -f --tail 50` — streams live container output. |
| **10** | Open Browser | Opens `http://localhost:3000` in the default browser. |
| **11** | Cleanup | Removes container, image, volumes, and prunes Docker system. |

### Log Collection ZIP Contents

When you select **Collect Logs + ZIP**, the archive contains:

| File | Contents |
|---|---|
| `container-stdout.log` | Full container stdout/stderr |
| `container-24h.log` | Last 24 hours of container logs |
| `container-inspect.json` | Full `docker inspect` output |
| `container-stats.txt` | CPU/memory snapshot |
| `docker-images.txt` | All local Docker images |
| `docker-ps.txt` | All containers (including stopped) |
| `docker-system-df.txt` | Docker disk usage |
| `nginx-access.log` | Nginx access log from container |
| `nginx-error.log` | Nginx error log from container |
| `app-logs/` | Contents of `.manus-logs/` directory |
| `system-info.txt` | OS, Docker, Node, Git versions + network + disk |
| `env-redacted.txt` | `.env` with all secrets replaced by `***REDACTED***` |

---

## API Keys & Configuration

All keys are configured in **Screen 8 (Settings)** of the dashboard and stored in `localStorage`. For Docker deployments, they are also read from the `.env` file.

| Key | Where to Get | Used By |
|---|---|---|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Frontier Agent, Scanner Agent, Planner Agent |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | Messenger Agent (Claude Sonnet) |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | Frontier Agent (optional alternative) |
| `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` | [modal.com](https://modal.com) → Settings → Tokens | Specialist Agent (LLaMA on GPU) |
| `HF_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | Downloading base model weights |
| `PUSHOVER_USER` + `PUSHOVER_TOKEN` | [pushover.net](https://pushover.net) | Messenger Agent notifications |

### Agent Parameters

| Parameter | Default | Description |
|---|---|---|
| `DEAL_THRESHOLD` | `50` | Minimum USD discount to trigger a push notification |
| `MAX_DATAPOINTS` | `2000` | ChromaDB embeddings used for t-SNE visualisation |
| `BASE_MODEL` | `meta-llama/Llama-3.2-3B` | HuggingFace base model for fine-tuning |
| `FINETUNED_MODEL` | `ed-donner/price-2025-11-28_18.47.07` | Fine-tuned model on HuggingFace Hub |
| `GPU` | `T4` | Modal.com GPU type (T4, A10G, A100) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama endpoint for preprocessor |
| `CHROMA_DB_PATH` | `products_vectorstore` | ChromaDB persistence directory |

---

## Dashboard Visualisations

The dashboard (Screen 6) contains five Recharts-powered charts, all driven by the live agent state:

**Price Prediction Accuracy vs Actual** — A grouped bar chart with one bar group per product (last five estimates). Each group shows three bars: Specialist estimate, Frontier estimate, and Ensemble estimate, with the actual price overlaid as a reference line. This chart directly answers the question "which model is closest to reality?"

**Agent Run Distribution** — A donut chart showing the share of total runs contributed by each of the seven agents. Hovering a segment shows the agent name, run count, and percentage.

**Deal Discount Distribution** — A vertical bar chart bucketing all discovered deals by discount range. The x-axis shows ranges ($0–25, $25–50, $50–100, $100–200, $200+) and the y-axis shows deal count. This reveals whether the scanner is finding genuinely significant deals.

**Ensemble Model Comparison** — A radar chart with five axes (Accuracy, Speed, Cost Efficiency, Reliability, Coverage). Each agent is plotted as a separate polygon, making it easy to see trade-offs at a glance.

**Agent Activity Timeline** — A stacked area chart showing runs per hour over the last 24 hours. Each agent is a separate coloured area, revealing usage patterns and peak activity periods.

---

## Test Scripts

Screen 7 provides an in-browser runner for tests derived from the original Jupyter notebooks:

| Test Suite | Source | Description |
|---|---|---|
| **Day 1 — Modal Setup** | `day1.ipynb` | Verifies Modal token, deploys pricer service, runs a test inference |
| **Day 2 — RAG Pipeline** | `day2.ipynb` | Tests ChromaDB connection, embedding generation, and similarity search |
| **Day 3 — Frontier Agent** | `day3.ipynb` | Validates OpenAI/DeepSeek API connectivity and RAG-augmented prompt |
| **Day 4 — Scanner & Messenger** | `day4.ipynb` | Tests RSS feed parsing, deal evaluation, and Pushover notification |
| **Day 5 — Ensemble & Planner** | `day5.ipynb` | End-to-end ensemble run and autonomous planner ReAct loop |

Each test card shows the test name, description, expected output, and a **Run** button that replays the notebook cell output in a terminal panel.

---

## Troubleshooting & Diagnostics

### Common Issues

**Dashboard shows blank page after Docker deploy**

The Nginx SPA routing may not be configured. Verify `nginx.conf` is correctly copied into the image and that `try_files $uri $uri/ /index.html` is present in the `location /` block. Run `docker logs agent-dashboard` to check for nginx errors.

**"Failed to resolve import ./pages/DashboardPage"**

This is a Vite dev-server cache issue. Run `pnpm run dev` fresh after a `rm -rf node_modules/.vite` cache clear, or use `./scripts/manage.sh fix` which runs `docker system prune -f`.

**API keys not persisting between sessions**

Settings are stored in `localStorage`. If you are running in a private/incognito browser window, `localStorage` is cleared on close. Use the **Export .env** button in Screen 8 to save keys to a file.

**Container exits immediately**

Check logs with `docker logs agent-dashboard`. The most common cause is a missing or malformed `nginx.conf`. Ensure the build completed successfully with `docker build` before running.

### Using the Fix Script

The **Fix** option (menu item 7) runs five automated checks and offers to resolve them:

1. Container status — restarts if stopped or missing
2. Port availability — reports if `3000` is occupied by another process
3. Image existence — triggers a rebuild if the image is missing
4. `.env` presence — warns if API keys are not configured
5. Disk space — reports free space on the project volume

After checks, it runs `docker system prune -f` to reclaim space from dangling images and stopped containers.

---

## Project Structure

```
sevenagentproject/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx                          ← Router with all 8 routes
│       ├── index.css                        ← Blue-shades theme + custom classes
│       ├── contexts/
│       │   └── AgentContext.tsx             ← Central state store
│       ├── components/
│       │   ├── AppLayout.tsx                ← Sidebar + top bar
│       │   └── AgentCard.tsx                ← Shared agent UI components
│       └── pages/
│           ├── DashboardPage.tsx            ← Screen 6
│           ├── Screen1ModalSpecialist.tsx   ← Screen 1
│           ├── Screen2RAGFrontierEnsemble.tsx ← Screen 2
│           ├── Screen3ScannerMessenger.tsx  ← Screen 3
│           ├── Screen4PlannerFramework.tsx  ← Screen 4
│           ├── Screen5PriceIsRight.tsx      ← Screen 5
│           ├── Screen7TestScripts.tsx       ← Screen 7
│           └── Screen8Settings.tsx         ← Screen 8
├── scripts/
│   ├── manage.sh                            ← Linux/macOS interactive script
│   └── manage.ps1                           ← Windows PowerShell interactive script
├── Dockerfile                               ← Multi-stage production build
├── Dockerfile.dev                           ← Development with HMR
├── docker-compose.yml                       ← Multi-profile compose file
├── nginx.conf                               ← Nginx SPA config with gzip + security
├── .env.template                            ← Environment variable template
├── prompt.md                                ← All user prompts from this session
└── README.md                                ← This file
```

---

## Disclaimer

**Author:** Lalit Nayyar
**Email:** [lalitnayyar@gmail.com](mailto:lalitnayyar@gmail.com)
**Phone:** +971508320336 | +919595353336
**GitHub:** [github.com/lalitnayyar](https://github.com/lalitnayyar)

This project is developed for educational and demonstration purposes, showcasing the integration of multiple AI agents in a unified React dashboard. All agent simulations in the frontend are representative of the actual Python agent behaviour documented in the accompanying Jupyter notebooks. API keys and credentials are never transmitted beyond your local browser's `localStorage`.

> **Note:** The fine-tuned model weights (`ed-donner/price-2025-11-28_18.47.07`) and the original training dataset are the intellectual property of their respective authors. This dashboard provides a UI layer only and does not redistribute model weights.
