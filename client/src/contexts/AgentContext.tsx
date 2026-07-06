import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AgentStatus = "idle" | "running" | "active" | "error" | "stopped";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error" | "agent";
  agent: string;
  message: string;
}

export interface AgentMetrics {
  totalRuns: number;
  successRate: number;
  avgResponseMs: number;
  lastRunAt: string | null;
  estimatedPrice?: number;
  dealsFound?: number;
  notificationsSent?: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  status: AgentStatus;
  color: string;
  bgColor: string;
  icon: string;
  screen: number;
  metrics: AgentMetrics;
  logs: LogEntry[];
  config: Record<string, string>;
}

export interface Deal {
  id: string;
  product: string;
  price: number;
  estimate: number;
  discount: number;
  url: string;
  timestamp: string;
}

export interface PriceEstimation {
  description: string;
  specialist: number;
  frontier: number;
  ensemble: number;
  neural: number;
  actual?: number;
  timestamp: string;
}

export interface AppSettings {
  openaiApiKey: string;
  anthropicApiKey: string;
  modalToken: string;
  modalTokenId: string;
  modalTokenSecret: string;
  modalGpuType: string;
  hfToken: string;
  hfUser: string;
  pushoverUser: string;
  pushoverToken: string;
  chromaDbPath: string;
  chromaCollection: string;
  chromaPath: string;
  ollamaBaseUrl: string;
  preprocessorModel: string;
  dealThreshold: string;
  maxDatapoints: string;
  baseModel: string;
  finetunedModel: string;
  runName: string;
  revision: string;
  gpu: string;
  deepseekApiKey: string;
  scannerSubreddits: string;
  scannerMinDiscount: string;
  ensembleSpecialistWeight: string;
  ensembleFrontierWeight: string;
  ensembleRagWeight: string;
  plannerMaxIterations: string;
}

interface AgentContextType {
  agents: AgentInfo[];
  deals: Deal[];
  estimations: PriceEstimation[];
  settings: AppSettings;
  globalLogs: LogEntry[];
  isAllRunning: boolean;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  addLog: (agentId: string, level: LogEntry["level"], message: string) => void;
  startAgent: (id: string) => void;
  stopAgent: (id: string) => void;
  startAllAgents: () => void;
  stopAllAgents: () => void;
  addDeal: (deal: Omit<Deal, "id" | "timestamp">) => void;
  addEstimation: (est: Omit<PriceEstimation, "timestamp">) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  clearLogs: (agentId?: string) => void;
}

const defaultSettings: AppSettings = {
  openaiApiKey: "",
  anthropicApiKey: "",
  modalToken: "",
  modalTokenId: "",
  modalTokenSecret: "",
  modalGpuType: "T4",
  hfToken: "",
  hfUser: "ed-donner",
  pushoverUser: "",
  pushoverToken: "",
  chromaDbPath: "products_vectorstore",
  chromaCollection: "products",
  chromaPath: "./products_vectorstore",
  ollamaBaseUrl: "http://localhost:11434",
  preprocessorModel: "ollama/llama3.2",
  dealThreshold: "50",
  maxDatapoints: "2000",
  baseModel: "meta-llama/Llama-3.2-3B",
  finetunedModel: "ed-donner/price-2025-11-28_18.47.07",
  runName: "2025-11-28_18.47.07",
  revision: "b19c8bfea3b6ff62237fbb0a8da9779fc12cefbd",
  gpu: "T4",
  deepseekApiKey: "",
  scannerSubreddits: "deals,buildapc,frugalmalefashion",
  scannerMinDiscount: "20",
  ensembleSpecialistWeight: "0.4",
  ensembleFrontierWeight: "0.3",
  ensembleRagWeight: "0.3",
  plannerMaxIterations: "10",
};

const initialAgents: AgentInfo[] = [
  {
    id: "specialist",
    name: "Specialist Agent",
    shortName: "Specialist",
    description: "Fine-tuned LLaMA 3.2-3B model deployed on Modal.com for price estimation",
    status: "idle",
    color: "text-red-500",
    bgColor: "bg-red-50 border-red-200",
    icon: "🎯",
    screen: 1,
    metrics: { totalRuns: 142, successRate: 97.2, avgResponseMs: 2340, lastRunAt: null },
    logs: [],
    config: { model: "meta-llama/Llama-3.2-3B", gpu: "T4", service: "pricer-service", quantization: "4-bit NF4" },
  },
  {
    id: "frontier",
    name: "Frontier Agent",
    shortName: "Frontier",
    description: "RAG-enhanced GPT-4o / DeepSeek frontier model with ChromaDB vector search",
    status: "idle",
    color: "text-blue-500",
    bgColor: "bg-blue-50 border-blue-200",
    icon: "🔭",
    screen: 2,
    metrics: { totalRuns: 98, successRate: 94.8, avgResponseMs: 1820, lastRunAt: null },
    logs: [],
    config: { model: "gpt-4o-mini", vectorDb: "ChromaDB", encoder: "all-MiniLM-L6-v2", similarItems: "5" },
  },
  {
    id: "ensemble",
    name: "Ensemble Agent",
    shortName: "Ensemble",
    description: "Weighted combination of Specialist + Frontier + Neural Network agents",
    status: "idle",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    icon: "🎼",
    screen: 2,
    metrics: { totalRuns: 87, successRate: 98.1, avgResponseMs: 4200, lastRunAt: null },
    logs: [],
    config: { weights: "Frontier×0.8 + Specialist×0.1 + NN×0.1", preprocessor: "ollama/llama3.2" },
  },
  {
    id: "scanner",
    name: "Scanner Agent",
    shortName: "Scanner",
    description: "RSS feed scraper that finds deals from DealNews and similar bargain sites",
    status: "idle",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    icon: "📡",
    screen: 3,
    metrics: { totalRuns: 312, successRate: 99.5, avgResponseMs: 3100, lastRunAt: null, dealsFound: 0 },
    logs: [],
    config: { feeds: "dealnews.com/c142, c39", itemsPerFeed: "10", model: "gpt-4o-mini" },
  },
  {
    id: "messenger",
    name: "Messaging Agent",
    shortName: "Messenger",
    description: "Claude-powered push notification agent via Pushover API",
    status: "idle",
    color: "text-slate-600",
    bgColor: "bg-slate-100 border-slate-300",
    icon: "📬",
    screen: 3,
    metrics: { totalRuns: 45, successRate: 100, avgResponseMs: 890, lastRunAt: null, notificationsSent: 0 },
    logs: [],
    config: { model: "claude-sonnet-4-5", service: "Pushover", sound: "cashregister" },
  },
  {
    id: "planner",
    name: "Autonomous Planner",
    shortName: "Planner",
    description: "LLM-driven autonomous agent with tool-calling: scan → estimate → notify",
    status: "idle",
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    icon: "🧠",
    screen: 4,
    metrics: { totalRuns: 28, successRate: 92.8, avgResponseMs: 8700, lastRunAt: null, dealsFound: 0 },
    logs: [],
    config: { model: "gpt-4o", tools: "scan, estimate, notify", dealThreshold: "$50" },
  },
  {
    id: "framework",
    name: "Deal Agent Framework",
    shortName: "Framework",
    description: "Orchestration layer: PlanningAgent + memory persistence + ChromaDB t-SNE visualization",
    status: "idle",
    color: "text-orange-500",
    bgColor: "bg-orange-50 border-orange-200",
    icon: "⚙️",
    screen: 4,
    metrics: { totalRuns: 62, successRate: 95.2, avgResponseMs: 12400, lastRunAt: null, dealsFound: 0 },
    logs: [],
    config: { db: "products_vectorstore", memory: "memory.json", timer: "300s" },
  },
];

// ─── Notebook-derived processing messages per agent ───────────────────────────
// Extracted from day1.ipynb → day5.ipynb actual cell processing steps
const NOTEBOOK_MESSAGES: Record<string, Array<{ level: LogEntry["level"]; msg: string }>> = {
  // day1.ipynb — Modal.com + SpecialistAgent steps
  specialist: [
    { level: "agent",   msg: "[SpecialistAgent] Initializing — connecting to Modal.com" },
    { level: "info",    msg: "Loading environment variables from .env (MODAL_TOKEN, HF_TOKEN)" },
    { level: "info",    msg: "Verifying Modal.com secret: huggingface-secret → HF_TOKEN" },
    { level: "info",    msg: "Resolving Modal app: pricer-service → Pricer class" },
    { level: "info",    msg: "modal.Cls.from_name('pricer-service', 'Pricer') — fetching remote class handle" },
    { level: "info",    msg: "Container status: checking if warm container is available (MIN_CONTAINERS=1)" },
    { level: "info",    msg: "Preprocessor: running ollama/llama3.2 to rewrite product description" },
    { level: "info",    msg: "Preprocessor output: Title / Category / Brand / Description / Details" },
    { level: "info",    msg: "Calling pricer.price.remote(description) — dispatching to T4 GPU" },
    { level: "info",    msg: "Modal container: loading base model meta-llama/Llama-3.2-3B from HF Hub cache" },
    { level: "info",    msg: "Applying PEFT/LoRA fine-tuned weights from HuggingFace: ed-donner/price-2025-11-28_18.47.07" },
    { level: "info",    msg: "BitsAndBytesConfig: load_in_4bit=True, bnb_4bit_quant_type='nf4', compute_dtype=float16" },
    { level: "info",    msg: "Tokenizing prompt: 'What does this cost to the nearest dollar?\\n\\n{description}\\n\\nPrice is $'" },
    { level: "info",    msg: "set_seed(42) — ensuring reproducible generation" },
    { level: "info",    msg: "model.generate(inputs, max_new_tokens=5) — running inference on T4 GPU" },
    { level: "info",    msg: "Decoding output tokens → extracting float after 'Price is $'" },
    { level: "success", msg: "[SpecialistAgent] Completed — price prediction returned from Modal.com" },
  ],

  // day2.ipynb — RAG + FrontierAgent + EnsembleAgent steps
  frontier: [
    { level: "agent",   msg: "[FrontierAgent] Initializing with ChromaDB collection" },
    { level: "info",    msg: "Loading environment: OPENAI_API_KEY / DEEPSEEK_API_KEY" },
    { level: "info",    msg: "Connecting to ChromaDB PersistentClient at products_vectorstore/" },
    { level: "info",    msg: "Collection 'products' loaded — 400,000+ product embeddings available" },
    { level: "info",    msg: "Loading SentenceTransformer: sentence-transformers/all-MiniLM-L6-v2" },
    { level: "info",    msg: "Encoder maps sentences to 384-dimensional vectors (ideal for semantic search)" },
    { level: "info",    msg: "Encoding product description → 384-dim vector" },
    { level: "info",    msg: "collection.query(query_embeddings=vector, n_results=5) — RAG lookup" },
    { level: "info",    msg: "Found 5 similar products from ChromaDB with prices ranging $30–$920" },
    { level: "info",    msg: "Building RAG context: 'For context, here are some other items that might be similar...'" },
    { level: "info",    msg: "Constructing messages_for(): system prompt + user prompt + RAG context" },
    { level: "info",    msg: "Calling openai.chat.completions.create(model='gpt-4o-mini', seed=42, reasoning_effort='none')" },
    { level: "info",    msg: "Parsing response — extracting float price with regex: r'[-+]?\\d*\\.\\d+|\\d+'" },
    { level: "success", msg: "[FrontierAgent] Completed — RAG-enhanced price estimate returned" },
  ],

  ensemble: [
    { level: "agent",   msg: "[EnsembleAgent] Initializing all sub-agents" },
    { level: "info",    msg: "Creating SpecialistAgent (Modal.com fine-tuned LLaMA)" },
    { level: "info",    msg: "Creating FrontierAgent (RAG + ChromaDB + GPT-4o-mini)" },
    { level: "info",    msg: "Creating NeuralNetworkAgent (deep_neural_network.pth weights)" },
    { level: "info",    msg: "Loading Preprocessor with model: ollama/llama3.2 (base_url: localhost:11434)" },
    { level: "info",    msg: "Preprocessor rewriting description → Title / Category / Brand / Description / Details" },
    { level: "info",    msg: "Running SpecialistAgent.price(rewrite) — Modal.com T4 GPU inference" },
    { level: "info",    msg: "Running FrontierAgent.price(rewrite) — RAG + GPT-4o-mini" },
    { level: "info",    msg: "Running NeuralNetworkAgent.price(rewrite) — local deep neural network" },
    { level: "info",    msg: "Applying ensemble weights: combined = frontier*0.8 + specialist*0.1 + neural_network*0.1" },
    { level: "info",    msg: "Evaluating ensemble on test set — tracking cumulative avg error with 95% CI" },
    { level: "success", msg: "[EnsembleAgent] Completed — weighted ensemble prediction returned" },
  ],

  // day3.ipynb — ScannerAgent + MessagingAgent steps
  scanner: [
    { level: "agent",   msg: "[ScannerAgent] Initializing RSS feed scraper" },
    { level: "info",    msg: "Loading feedparser — parsing RSS feeds from dealnews.com" },
    { level: "info",    msg: "Fetching feed: https://www.dealnews.com/c142/Electronics/?format=rss" },
    { level: "info",    msg: "Fetching feed: https://www.dealnews.com/c39/Computers/?format=rss" },
    { level: "info",    msg: "ScrapedDeal.fetch(show_progress=True) — iterating entries[:10] per feed" },
    { level: "info",    msg: "Sleeping 0.05s between entries to avoid rate limiting" },
    { level: "info",    msg: "Collected raw deals — building SYSTEM_PROMPT for GPT-4o-mini summarization" },
    { level: "info",    msg: "SYSTEM_PROMPT: 'You identify and summarize the 5 most detailed deals...'" },
    { level: "info",    msg: "Calling openai.chat.completions.parse(model='gpt-4o-mini', response_format=DealSelection)" },
    { level: "info",    msg: "Parsing structured output: DealSelection with 5 Deal objects (description, price, url)" },
    { level: "info",    msg: "Filtering deals not in memory (already seen URLs excluded)" },
    { level: "success", msg: "[ScannerAgent] Completed — DealSelection with top 5 deals returned" },
  ],

  messenger: [
    { level: "agent",   msg: "[MessagingAgent] Initializing Pushover + Claude client" },
    { level: "info",    msg: "Loading PUSHOVER_USER and PUSHOVER_TOKEN from environment" },
    { level: "info",    msg: "Validating Pushover credentials — checking token starts with expected prefix" },
    { level: "info",    msg: "Pushover URL: https://api.pushover.net/1/messages.json" },
    { level: "info",    msg: "Crafting push notification message using Claude claude-sonnet-4-5" },
    { level: "info",    msg: "User prompt: 'Please summarize this great deal in 2-3 sentences to be sent as an exciting push notification...'" },
    { level: "info",    msg: "litellm.completion(model='claude-sonnet-4-5', messages=[...]) — calling Anthropic API" },
    { level: "info",    msg: "Message crafted — truncating to 200 chars + deal URL" },
    { level: "info",    msg: "POST https://api.pushover.net/1/messages.json — payload: {user, token, message, sound='cashregister'}" },
    { level: "success", msg: "[MessagingAgent] Push notification delivered! 🔔 Sound: cashregister" },
  ],

  // day4.ipynb — AutonomousPlannerAgent steps
  planner: [
    { level: "agent",   msg: "[AutonomousPlannerAgent] Kicking off autonomous planning run" },
    { level: "info",    msg: "Loading OpenAI client with model: gpt-4o" },
    { level: "info",    msg: "System message: 'You find great deals on bargain products using your tools, and notify the user of the best bargain.'" },
    { level: "info",    msg: "User message: 'First, use your tool to scan the internet for bargain deals...'" },
    { level: "info",    msg: "Registering tools: scan_the_internet_for_bargains, estimate_true_value, notify_user_of_deal" },
    { level: "info",    msg: "openai.chat.completions.create(model='gpt-4o', tools=[...]) — starting tool-calling loop" },
    { level: "info",    msg: "LLM response: finish_reason='tool_calls' → calling scan_the_internet_for_bargains" },
    { level: "info",    msg: "Tool: scan_the_internet_for_bargains() → ScannerAgent.scan() → DealSelection returned" },
    { level: "info",    msg: "LLM response: finish_reason='tool_calls' → calling estimate_true_value for each deal" },
    { level: "info",    msg: "Tool: estimate_true_value(description) → EnsembleAgent.price() → float returned" },
    { level: "info",    msg: "Computing discount = estimate - deal.price for all deals" },
    { level: "info",    msg: "LLM selects most compelling deal (highest discount > $50 threshold)" },
    { level: "info",    msg: "LLM response: finish_reason='tool_calls' → calling notify_user_of_deal" },
    { level: "info",    msg: "Tool: notify_user_of_deal(description, deal_price, estimated_true_value, url) → MessagingAgent.notify()" },
    { level: "info",    msg: "LLM response: finish_reason='stop' → reply: 'OK'" },
    { level: "success", msg: "[AutonomousPlannerAgent] Completed — opportunity surfaced and user notified" },
  ],

  // day5.ipynb — DealAgentFramework steps
  framework: [
    { level: "agent",   msg: "[DealAgentFramework] Initializing agent framework" },
    { level: "info",    msg: "init_logging() — setting up [Agents] formatter with timestamp" },
    { level: "info",    msg: "chromadb.PersistentClient(path='products_vectorstore') — loading vector DB" },
    { level: "info",    msg: "Reading memory from memory.json — loading past Opportunity objects" },
    { level: "info",    msg: "Memory contains previously surfaced deals (URLs excluded from next scan)" },
    { level: "info",    msg: "DealAgentFramework.reset_memory() — truncating memory to last 2 opportunities" },
    { level: "info",    msg: "Initializing PlanningAgent with ChromaDB collection" },
    { level: "info",    msg: "PlanningAgent creating: ScannerAgent + EnsembleAgent + MessagingAgent" },
    { level: "info",    msg: "Running planner.plan(memory=self.memory) — full pipeline execution" },
    { level: "info",    msg: "ScannerAgent scanning RSS feeds → DealSelection(5 deals)" },
    { level: "info",    msg: "EnsembleAgent pricing each deal → sorting by discount descending" },
    { level: "info",    msg: "Best deal discount > $50 threshold → MessagingAgent.alert(opportunity)" },
    { level: "info",    msg: "Appending new Opportunity to memory list" },
    { level: "info",    msg: "write_memory() — persisting updated memory.json" },
    { level: "info",    msg: "get_plot_data() — running t-SNE(n_components=3) on ChromaDB embeddings for 3D visualization" },
    { level: "success", msg: "[DealAgentFramework] Run complete — memory updated, plot data ready" },
  ],
};

const sampleDeals: Deal[] = [
  { id: "d1", product: "Samsung Galaxy Watch Ultra 47mm LTE Titanium Smartwatch", price: 350, estimate: 773.81, discount: 423.81, url: "https://www.dealnews.com/Samsung-Galaxy-Watch-Ultra", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "d2", product: "Refurbished Unlocked Apple iPhone 14 Pro Max 256GB", price: 705, estimate: 930.88, discount: 225.88, url: "https://www.dealnews.com/Apple-iPhone-14-Pro-Max", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "d3", product: "Poly Studio P21 21.5\" 1080p LED Personal Meeting Display", price: 30, estimate: 189.5, discount: 159.5, url: "https://www.dealnews.com/Poly-Studio-P21", timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: "d4", product: "Lenovo IdeaPad Slim 5 Ryzen 5 16\" Touch Laptop 16GB/512GB", price: 446, estimate: 699.0, discount: 253.0, url: "https://www.dealnews.com/Lenovo-IdeaPad-Slim-5", timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: "d5", product: "Dell G15 Ryzen 5 Gaming Laptop RTX 3050 16GB/1TB", price: 650, estimate: 899.99, discount: 249.99, url: "https://www.dealnews.com/Dell-G15-Gaming", timestamp: new Date(Date.now() - 18000000).toISOString() },
];

const sampleEstimations: PriceEstimation[] = [
  { description: "Samsung Galaxy Watch Ultra", specialist: 720, frontier: 790, ensemble: 773, neural: 698, actual: 700, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { description: "Apple iPhone 14 Pro Max", specialist: 880, frontier: 950, ensemble: 930, neural: 910, actual: 900, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { description: "Poly Studio P21 Display", specialist: 175, frontier: 195, ensemble: 189, neural: 180, actual: 199, timestamp: new Date(Date.now() - 10800000).toISOString() },
  { description: "Lenovo IdeaPad Slim 5", specialist: 650, frontier: 720, ensemble: 699, neural: 670, actual: 680, timestamp: new Date(Date.now() - 14400000).toISOString() },
  { description: "Dell G15 Gaming Laptop", specialist: 850, frontier: 920, ensemble: 899, neural: 870, actual: 880, timestamp: new Date(Date.now() - 18000000).toISOString() },
];

const AgentContext = createContext<AgentContextType | null>(null);
let logIdCounter = 0;
const makeLogId = () => `log-${++logIdCounter}-${Date.now()}`;

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<AgentInfo[]>(initialAgents);
  const [deals, setDeals] = useState<Deal[]>(sampleDeals);
  const [estimations, setEstimations] = useState<PriceEstimation[]>(sampleEstimations);
  const [globalLogs, setGlobalLogs] = useState<LogEntry[]>([]);
  const [isAllRunning, setIsAllRunning] = useState(false);

  // Refs to latest state — avoids stale closures inside setInterval callbacks
  const settingsRef = useRef<AppSettings>(defaultSettings);
  const dealsRef = useRef<Deal[]>(sampleDeals);

  // tRPC mutation for real Pushover delivery
  const pushoverMutation = trpc.agents.sendPushoverNotification.useMutation();
  // Keep settingsRef in sync with state so simulateAgentRun always reads fresh creds
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("agentSettings");
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch { return defaultSettings; }
  });

  // Sync refs whenever state changes
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { dealsRef.current = deals; }, [deals]);

  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const addLog = useCallback((agentId: string, level: LogEntry["level"], message: string) => {
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      agent: agentId,
      message,
    };
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, logs: [entry, ...a.logs].slice(0, 300) } : a
    ));
    setGlobalLogs(prev => [entry, ...prev].slice(0, 600));
  }, []);

  const updateAgentStatus = useCallback((id: string, status: AgentStatus) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const simulateAgentRun = useCallback((id: string) => {
    const messages = NOTEBOOK_MESSAGES[id] ?? [
      { level: "agent" as const, msg: "Agent starting..." },
      { level: "success" as const, msg: "Agent completed" },
    ];

    // Index of the "Push notification delivered" line in the messenger script
    const PUSHOVER_DELIVER_MSG = "[MessagingAgent] Push notification delivered! 🔔 Sound: cashregister";

    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        const entry = messages[i];
        addLog(id, entry.level, entry.msg);

        // When messenger reaches the delivery log line, fire the real Pushover API
        if (id === "messenger" && entry.msg === PUSHOVER_DELIVER_MSG) {
          const creds = settingsRef.current;
          const userKey = creds.pushoverUser?.trim();
          const token   = creds.pushoverToken?.trim();
          if (userKey && token) {
            // Pick the highest-discount deal from current deals list
            const allDeals = dealsRef.current;
            const best = allDeals.length > 0
              ? [...allDeals].sort((a, b) => b.discount - a.discount)[0]
              : null;
            const dealMsg = best
              ? `🔥 Deal Alert! ${best.product} is now only $${best.price.toFixed(2)} — estimated value $${best.estimate.toFixed(2)}. Save $${best.discount.toFixed(2)}!`
              : "🔥 7-Agent Price Intelligence found a great deal — check your dashboard!";
            pushoverMutation.mutate({
              userKey,
              token,
              title: "7-Agent Price Intelligence",
              message: dealMsg.slice(0, 512),
              sound: "cashregister",
              url: best?.url,
            }, {
              onSuccess: (result) => {
                if (result.success) {
                  addLog("messenger", "success", `[MessagingAgent] ✅ Real Pushover delivery confirmed — latency ${result.latency}ms`);
                } else {
                  addLog("messenger", "warn", `[MessagingAgent] ⚠️ Pushover returned error: ${result.message}`);
                }
              },
              onError: (err) => {
                addLog("messenger", "warn", `[MessagingAgent] ⚠️ Pushover request failed: ${err.message}`);
              },
            });
          } else {
            addLog("messenger", "warn", "[MessagingAgent] ⚠️ Pushover credentials not configured — skipping real delivery. Add them in Command Vault → Pushover tab.");
          }
        }

        i++;
      } else {
        clearInterval(interval);
        timersRef.current.delete(id);
        setAgents(prev => prev.map(a =>
          a.id === id
            ? {
                ...a,
                status: "active",
                metrics: {
                  ...a.metrics,
                  totalRuns: a.metrics.totalRuns + 1,
                  lastRunAt: new Date().toISOString(),
                  successRate: Math.min(100, a.metrics.successRate + (Math.random() * 0.2 - 0.05)),
                  avgResponseMs: Math.max(200, a.metrics.avgResponseMs + (Math.random() * 200 - 100)),
                },
              }
            : a
        ));
      }
    }, 550);
    timersRef.current.set(id, interval);
  }, [addLog, pushoverMutation]);

  const startAgent = useCallback((id: string) => {
    const existing = timersRef.current.get(id);
    if (existing) { clearInterval(existing); timersRef.current.delete(id); }
    updateAgentStatus(id, "running");
    simulateAgentRun(id);
  }, [updateAgentStatus, simulateAgentRun]);

  const stopAgent = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearInterval(timer); timersRef.current.delete(id); }
    updateAgentStatus(id, "stopped");
    addLog(id, "warn", `[${id.toUpperCase()}] Agent stopped by user`);
  }, [updateAgentStatus, addLog]);

  const startAllAgents = useCallback(() => {
    setIsAllRunning(true);
    initialAgents.forEach((a, i) => {
      setTimeout(() => startAgent(a.id), i * 900);
    });
  }, [startAgent]);

  const stopAllAgents = useCallback(() => {
    setIsAllRunning(false);
    initialAgents.forEach(a => stopAgent(a.id));
  }, [stopAgent]);

  const addDeal = useCallback((deal: Omit<Deal, "id" | "timestamp">) => {
    setDeals(prev => [{ ...deal, id: `d${Date.now()}`, timestamp: new Date().toISOString() }, ...prev]);
  }, []);

  const addEstimation = useCallback((est: Omit<PriceEstimation, "timestamp">) => {
    setEstimations(prev => [{ ...est, timestamp: new Date().toISOString() }, ...prev]);
  }, []);

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...s };
      localStorage.setItem("agentSettings", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearLogs = useCallback((agentId?: string) => {
    if (agentId) {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, logs: [] } : a));
    } else {
      setAgents(prev => prev.map(a => ({ ...a, logs: [] })));
      setGlobalLogs([]);
    }
  }, []);

  useEffect(() => {
    return () => { timersRef.current.forEach(t => clearInterval(t)); };
  }, []);

  return (
    <AgentContext.Provider value={{
      agents, deals, estimations, settings, globalLogs, isAllRunning,
      updateAgentStatus, addLog, startAgent, stopAgent,
      startAllAgents, stopAllAgents, addDeal, addEstimation,
      updateSettings, clearLogs,
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgents must be used within AgentProvider");
  return ctx;
}
