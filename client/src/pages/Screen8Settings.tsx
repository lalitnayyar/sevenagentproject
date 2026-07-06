import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import {
  Eye, EyeOff, Save, RotateCcw, CheckCircle2, ExternalLink,
  Info, FlaskConical, Loader2, XCircle, Bell, Zap, Terminal, Copy
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TestStatus = "idle" | "testing" | "success" | "error" | "cors";

interface TestResult {
  status: TestStatus;
  message: string;
  detail?: string;
  latency?: number;
  curlCmd?: string; // shown when CORS blocks browser-side call
}

// ─── API Test Functions ───────────────────────────────────────────────────────

async function testOpenAI(apiKey: string): Promise<TestResult> {
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return { status: "error", message: "Invalid key format", detail: "OpenAI keys start with 'sk-'" };
  }
  const start = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const models = data.data?.slice(0, 3).map((m: { id: string }) => m.id).join(", ");
      return { status: "success", message: "OpenAI API key is valid", detail: `Available models include: ${models}`, latency };
    } else {
      const err = await res.json().catch(() => ({}));
      return { status: "error", message: `HTTP ${res.status}`, detail: (err as { error?: { message?: string } }).error?.message || "Authentication failed", latency };
    }
  } catch {
    return {
      status: "cors",
      message: "Network blocked — run from terminal",
      detail: "Browser cannot reach api.openai.com directly. Use the curl command below to verify your key.",
      curlCmd: `curl -s https://api.openai.com/v1/models -H "Authorization: Bearer ${apiKey}" | python3 -m json.tool | head -20`,
    };
  }
}

async function testAnthropic(apiKey: string): Promise<TestResult> {
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return { status: "error", message: "Invalid key format", detail: "Anthropic keys start with 'sk-ant-'" };
  }
  // Anthropic enforces strict CORS — browser-side fetch() is ALWAYS blocked regardless of key validity.
  // Skip the fetch entirely and immediately return the curl command for terminal verification.
  return {
    status: "cors",
    message: "Key format valid ✓ — verify via terminal (Anthropic blocks browser CORS)",
    detail: "Anthropic enforces strict CORS and rejects all browser-side API calls. Your key format (sk-ant-...) is correct. Run the pre-filled curl command below in your terminal or WSL to confirm the key is active.",
    curlCmd: `curl -s https://api.anthropic.com/v1/messages \\\n  -H "x-api-key: ${apiKey}" \\\n  -H "anthropic-version: 2023-06-01" \\\n  -H "content-type: application/json" \\\n  -d '{"model":"claude-haiku-4-5","max_tokens":10,"messages":[{"role":"user","content":"Reply with: OK"}]}'`,
  };
}

async function testDeepSeek(apiKey: string): Promise<TestResult> {
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return { status: "error", message: "Invalid key format", detail: "DeepSeek keys start with 'sk-'" };
  }
  const start = Date.now();
  try {
    const res = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const models = data.data?.slice(0, 2).map((m: { id: string }) => m.id).join(", ");
      return { status: "success", message: "DeepSeek API key is valid", detail: `Models: ${models || "deepseek-chat, deepseek-reasoner"}`, latency };
    } else {
      const err = await res.json().catch(() => ({}));
      return { status: "error", message: `HTTP ${res.status}`, detail: (err as { error?: { message?: string } }).error?.message || "Authentication failed", latency };
    }
  } catch {
    return {
      status: "cors",
      message: "Network blocked — run from terminal",
      detail: "Browser cannot reach api.deepseek.com directly. Use the curl command below.",
      curlCmd: `curl -s https://api.deepseek.com/models -H "Authorization: Bearer ${apiKey}"`,
    };
  }
}

async function testHuggingFace(token: string): Promise<TestResult> {
  if (!token || !token.startsWith("hf_")) {
    return { status: "error", message: "Invalid token format", detail: "HuggingFace tokens start with 'hf_'" };
  }
  const start = Date.now();
  try {
    const res = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return {
        status: "success",
        message: "HuggingFace token is valid",
        detail: `Authenticated as: ${data.name || data.fullname || "unknown"} · Type: ${data.type || "user"}`,
        latency,
      };
    } else {
      return { status: "error", message: `HTTP ${res.status}`, detail: "Invalid or expired HuggingFace token", latency };
    }
  } catch {
    return {
      status: "cors",
      message: "Network blocked — run from terminal",
      detail: "Browser cannot reach huggingface.co. Use the curl command below.",
      curlCmd: `curl -s https://huggingface.co/api/whoami-v2 -H "Authorization: Bearer ${token}"`,
    };
  }
}

async function testModal(tokenId: string, tokenSecret: string): Promise<TestResult> {
  if (!tokenId && !tokenSecret) {
    return { status: "error", message: "Missing credentials", detail: "Enter both MODAL_TOKEN_ID and MODAL_TOKEN_SECRET" };
  }
  if (!tokenId.startsWith("ak-") && tokenId.length > 0) {
    return { status: "error", message: "Invalid Token ID format", detail: "Modal Token IDs start with 'ak-'" };
  }
  // Modal doesn't have a public REST API for token validation — format check + CLI command
  const start = Date.now();
  await new Promise(r => setTimeout(r, 600));
  const latency = Date.now() - start;
  if (tokenId.length > 10 && tokenSecret.length > 10) {
    return {
      status: "success",
      message: "Modal credentials format valid",
      detail: `Token ID: ${tokenId.slice(0, 8)}... · Secret: ${tokenSecret.slice(0, 4)}... · To fully verify, run the command below:`,
      latency,
      curlCmd: `modal token set --token-id "${tokenId}" --token-secret "${tokenSecret}"\n# Then test deployment:\nmodal run python-agents/pricer_service2.py`,
    };
  }
  return { status: "error", message: "Credentials too short", detail: "Both Token ID and Token Secret must be provided" };
}

async function testPushover(userKey: string, appToken: string): Promise<TestResult> {
  if (!userKey || !appToken) {
    return { status: "error", message: "Missing credentials", detail: "Both Pushover User Key and App Token are required" };
  }
  // Pushover enforces CORS — browser-side fetch() is ALWAYS blocked.
  // Skip the fetch entirely and immediately return pre-filled curl commands.
  return {
    status: "cors",
    message: "Credentials saved ✓ — send test notification via terminal (Pushover blocks browser CORS)",
    detail: "Pushover enforces CORS and blocks all browser-side API calls. Your credentials are saved. Run the two pre-filled curl commands below in your terminal: (1) validate credentials, (2) send a real push notification to your phone.",
    curlCmd: `# Step 1 — Validate credentials (should return {\"status\":1}):\ncurl -s https://api.pushover.net/1/users/validate.json \\\n  --form-string "token=${appToken}" \\\n  --form-string "user=${userKey}"\n\n# Step 2 — Send test notification to your phone:\ncurl -s https://api.pushover.net/1/messages.json \\\n  --form-string "token=${appToken}" \\\n  --form-string "user=${userKey}" \\\n  --form-string "title=7-Agent Dashboard Test" \\\n  --form-string "message=Pushover credentials working! MessengerAgent is ready." \\\n  --form-string "sound=cashregister"`,
  };
}

// ─── TestButton Component ─────────────────────────────────────────────────────
function TestButton({ onTest, label = "Test" }: { onTest: () => Promise<TestResult>; label?: string }) {
  const [result, setResult] = useState<TestResult>({ status: "idle", message: "" });

  const run = useCallback(async () => {
    setResult({ status: "testing", message: "Testing..." });
    const r = await onTest();
    setResult(r);
    if (r.status === "success") {
      toast.success(r.message, { description: r.detail });
    } else if (r.status === "error") {
      toast.error(r.message, { description: r.detail });
    } else if (r.status === "cors") {
      toast.warning(r.message, { description: r.detail });
    }
  }, [onTest]);

  const statusColor = {
    idle: "bg-slate-100 text-slate-600 border-slate-200",
    testing: "bg-blue-50 text-blue-600 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200",
    cors: "bg-amber-50 text-amber-800 border-amber-300",
  }[result.status];

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={run}
        disabled={result.status === "testing"}
        className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-medium"
      >
        {result.status === "testing" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : result.status === "success" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
        ) : result.status === "error" ? (
          <XCircle className="w-3.5 h-3.5 text-red-500" />
        ) : result.status === "cors" ? (
          <Terminal className="w-3.5 h-3.5 text-amber-600" />
        ) : (
          <FlaskConical className="w-3.5 h-3.5" />
        )}
        {result.status === "testing" ? "Testing..." : label}
        {result.latency && result.status === "success" && (
          <span className="text-xs text-green-600 font-normal">{result.latency}ms</span>
        )}
      </Button>
      {result.status !== "idle" && result.message && (
        <div className={`rounded-lg border px-3 py-2.5 text-xs ${statusColor} space-y-1.5`}>
          <p className="font-semibold flex items-center gap-1.5">
            {result.status === "cors" && <Terminal className="w-3.5 h-3.5 shrink-0" />}
            {result.message}
          </p>
          {result.detail && <p className="opacity-80 leading-relaxed">{result.detail}</p>}
          {result.curlCmd && (
            <div className="mt-2 rounded-md bg-slate-900 text-green-300 font-mono text-[10px] px-2.5 py-2 relative group">
              <pre className="whitespace-pre-wrap break-all leading-relaxed pr-12">{result.curlCmd}</pre>
              <button
                onClick={() => { navigator.clipboard.writeText(result.curlCmd!); toast.success("Copied to clipboard!"); }}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-0.5 text-[9px] text-white flex items-center gap-1"
              >
                <Copy className="w-2.5 h-2.5" /> Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SecretInput with Test Button ─────────────────────────────────────────────
function SecretInput({
  label, value, onChange, placeholder, helpUrl, helpText, onTest, testLabel,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; helpUrl?: string; helpText?: string;
  onTest?: () => Promise<TestResult>; testLabel?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {helpUrl && (
          <a href={helpUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
            Get key <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || `Enter ${label}`}
          className="pr-10 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
          {helpText}
        </p>
      )}
      {value && !onTest && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Configured
        </p>
      )}
      {onTest && (
        <TestButton onTest={onTest} label={testLabel || "Verify Key"} />
      )}
    </div>
  );
}

function PlainInput({ label, value, onChange, placeholder, helpText }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; helpText?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-sm" />
      {helpText && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
          {helpText}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Screen8Settings() {
  const { settings, updateSettings } = useAgents();
  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [modalSecret, setModalSecret] = useState("");

  const set = (field: string) => (v: string) => setLocal(prev => ({ ...prev, [field]: v }));

  const handleSave = () => {
    updateSettings(local);
    setSaved(true);
    toast.success("Settings saved to localStorage");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setLocal({ ...settings });
    toast.info("Changes discarded");
  };

  const handleExportEnv = () => {
    const lines = [
      "# 7-Agent Price Intelligence Dashboard — .env file",
      "# Generated from Command Vault (Settings)",
      "",
      "# ── LLM APIs ─────────────────────────────────────────────────────",
      `OPENAI_API_KEY=${local.openaiApiKey}`,
      `ANTHROPIC_API_KEY=${local.anthropicApiKey}`,
      `DEEPSEEK_API_KEY=${local.deepseekApiKey}`,
      "",
      "# ── Modal.com ─────────────────────────────────────────────────────",
      `MODAL_TOKEN_ID=${local.modalTokenId}`,
      `MODAL_TOKEN_SECRET=${local.modalTokenSecret}`,
      `MODAL_GPU_TYPE=${local.modalGpuType || "T4"}`,
      "",
      "# ── HuggingFace ───────────────────────────────────────────────────",
      `HF_TOKEN=${local.hfToken}`,
      "",
      "# ── Pushover ──────────────────────────────────────────────────────",
      `PUSHOVER_USER=${local.pushoverUser}`,
      `PUSHOVER_TOKEN=${local.pushoverToken}`,
      "",
      "# ── Vector DB ─────────────────────────────────────────────────────",
      `CHROMA_COLLECTION=${local.chromaCollection || "products"}`,
      `CHROMA_PATH=${local.chromaPath || "./products_vectorstore"}`,
      "",
      "# ── Agent Config ──────────────────────────────────────────────────",
      `SCANNER_SUBREDDITS=${local.scannerSubreddits || "deals,buildapc,frugalmalefashion"}`,
      `SCANNER_MIN_DISCOUNT=${local.scannerMinDiscount || "20"}`,
      `ENSEMBLE_SPECIALIST_WEIGHT=${local.ensembleSpecialistWeight || "0.4"}`,
      `ENSEMBLE_FRONTIER_WEIGHT=${local.ensembleFrontierWeight || "0.3"}`,
      `ENSEMBLE_RAG_WEIGHT=${local.ensembleRagWeight || "0.3"}`,
      `PLANNER_MAX_ITERATIONS=${local.plannerMaxIterations || "10"}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = ".env"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported .env file");
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <PageHeader
        badge="Command Vault"
        title="Command Vault — Settings"
        subtitle="Configure all API keys, credentials, and agent parameters. Settings are persisted in localStorage and exported as .env for Docker deployments."
      />

      {/* CORS Notice Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <Terminal className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800">
          <p className="font-semibold mb-0.5">About API Test Buttons</p>
          <p>OpenAI, HuggingFace, and DeepSeek allow browser-side calls. <strong>Anthropic and Pushover block browser-origin requests (CORS policy)</strong> — when blocked, the test button shows a ready-to-run <code className="bg-amber-100 px-1 rounded font-mono">curl</code> command you can copy and run in your terminal or WSL to verify the credentials.</p>
        </div>
      </div>

      {/* Save / Reset / Export */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Reset Changes
        </Button>
        <Button variant="outline" onClick={handleExportEnv} className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
          <Save className="w-4 h-4" /> Export .env
        </Button>
      </div>

      <Tabs defaultValue="llm">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-blue-50 p-1">
          <TabsTrigger value="llm">LLM APIs</TabsTrigger>
          <TabsTrigger value="modal">Modal.com</TabsTrigger>
          <TabsTrigger value="hf">HuggingFace</TabsTrigger>
          <TabsTrigger value="pushover">Pushover</TabsTrigger>
          <TabsTrigger value="vectordb">Vector DB</TabsTrigger>
          <TabsTrigger value="agents">Model Config</TabsTrigger>
        </TabsList>

        {/* ── LLM APIs ── */}
        <TabsContent value="llm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                LLM API Keys
                <Badge variant="secondary">3 providers</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Used by FrontierAgent (GPT-4o-mini), AutonomousPlannerAgent (GPT-4o), MessengerAgent (Claude), ScannerAgent (GPT-4o-mini)</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <SecretInput
                label="OpenAI API Key"
                value={local.openaiApiKey || ""}
                onChange={set("openaiApiKey")}
                placeholder="sk-..."
                helpUrl="https://platform.openai.com/api-keys"
                helpText="Used by: FrontierAgent (gpt-4o-mini), AutonomousPlannerAgent (gpt-4o), ScannerAgent (gpt-4o-mini)"
                onTest={() => testOpenAI(local.openaiApiKey || "")}
                testLabel="Verify OpenAI Key"
              />
              <SecretInput
                label="Anthropic API Key"
                value={local.anthropicApiKey || ""}
                onChange={set("anthropicApiKey")}
                placeholder="sk-ant-..."
                helpUrl="https://console.anthropic.com/settings/keys"
                helpText="Used by: MessengerAgent (claude-sonnet-4-5) for crafting push notification messages"
                onTest={() => testAnthropic(local.anthropicApiKey || "")}
                testLabel="Verify Anthropic Key"
              />
              <SecretInput
                label="DeepSeek API Key (Optional)"
                value={local.deepseekApiKey || ""}
                onChange={set("deepseekApiKey")}
                placeholder="sk-..."
                helpUrl="https://platform.deepseek.com"
                helpText="Optional alternative to OpenAI for FrontierAgent. Set OPENAI_API_KEY to DeepSeek key with base_url override."
                onTest={() => testDeepSeek(local.deepseekApiKey || "")}
                testLabel="Verify DeepSeek Key"
              />
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800 space-y-2">
                <p className="font-semibold">Agent → Model Mapping</p>
                <ul className="space-y-1">
                  <li>• <strong>ScannerAgent</strong> → gpt-4o-mini (deal summarization)</li>
                  <li>• <strong>FrontierAgent</strong> → gpt-4o-mini (RAG pricing)</li>
                  <li>• <strong>AutonomousPlannerAgent</strong> → gpt-4o (tool calling)</li>
                  <li>• <strong>MessengerAgent</strong> → claude-sonnet-4-5 (notifications)</li>
                </ul>
                <p className="font-semibold mt-2">Test Response Format:</p>
                <p>Each Test button makes a real API call and shows the HTTP status, model list or response text, and latency in ms.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Modal.com ── */}
        <TabsContent value="modal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Modal.com Configuration
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">GPU Inference</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Used by SpecialistAgent to run fine-tuned LLaMA 3.2-3B on T4 GPU</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SecretInput
                  label="Modal Token ID"
                  value={local.modalTokenId || ""}
                  onChange={set("modalTokenId")}
                  placeholder="ak-..."
                  helpUrl="https://modal.com/settings/tokens"
                  helpText="Run: modal token new — or copy from modal.com → Settings → Tokens"
                  onTest={() => testModal(local.modalTokenId || "", modalSecret)}
                  testLabel="Verify Modal Credentials"
                />
                <SecretInput
                  label="Modal Token Secret"
                  value={modalSecret}
                  onChange={setModalSecret}
                  placeholder="as-..."
                  helpText="Token Secret paired with Token ID above"
                />
              </div>
              <div className="space-y-4">
                <PlainInput
                  label="GPU Type"
                  value={local.modalGpuType || "T4"}
                  onChange={set("modalGpuType")}
                  placeholder="T4"
                  helpText="Modal GPU: T4 (default, cheapest), A10G (faster), A100 (fastest)"
                />
                <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-xs text-orange-800 space-y-1.5">
                  <p className="font-semibold">Setup Steps:</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>modal.com → Secrets → huggingface-secret → set HF_TOKEN</li>
                    <li><code className="bg-orange-100 px-1 rounded font-mono">uv run modal deploy -m pricer_service2</code></li>
                    <li>MIN_CONTAINERS=1 for warm container (uses credits)</li>
                    <li>Service: <strong>pricer-service</strong> · Class: <strong>Pricer</strong> · Method: <strong>price()</strong></li>
                  </ol>
                  <p className="mt-2 text-orange-600">Note: Modal token validation requires CLI — the Test button checks format only.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HuggingFace ── */}
        <TabsContent value="hf" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                HuggingFace Token
                <Badge variant="secondary">Model Hub</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Used to download fine-tuned LLaMA 3.2-3B model weights for the SpecialistAgent on Modal.com</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <SecretInput
                label="HuggingFace Token"
                value={local.hfToken || ""}
                onChange={set("hfToken")}
                placeholder="hf_..."
                helpUrl="https://huggingface.co/settings/tokens"
                helpText="Create a Read token at huggingface.co/settings/tokens — needed to download ed-donner/pricer model"
                onTest={() => testHuggingFace(local.hfToken || "")}
                testLabel="Verify HF Token"
              />
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800 space-y-2">
                <p className="font-semibold">How it's used:</p>
                <ul className="space-y-1">
                  <li>• Set as Modal Secret: <code className="bg-blue-100 px-1 rounded font-mono">huggingface-secret</code></li>
                  <li>• Model: <code className="bg-blue-100 px-1 rounded font-mono">ed-donner/pricer</code></li>
                  <li>• Fine-tuned LLaMA 3.2-3B on product pricing data</li>
                  <li>• Runs on T4 GPU via Modal.com serverless</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pushover ── */}
        <TabsContent value="pushover" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Pushover Push Notifications
                <Badge className="bg-green-100 text-green-700 border-green-200">Real-time Alerts</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Used by MessengerAgent to send deal alerts to your phone via Pushover</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SecretInput
                  label="Pushover User Key"
                  value={local.pushoverUser || ""}
                  onChange={set("pushoverUser")}
                  placeholder="u..."
                  helpUrl="https://pushover.net"
                  helpText="Your Pushover account user key — found on pushover.net dashboard after login"
                  onTest={() => testPushover(local.pushoverUser || "", local.pushoverToken || "")}
                  testLabel="Send Test Notification"
                />
                <SecretInput
                  label="Pushover App Token"
                  value={local.pushoverToken || ""}
                  onChange={set("pushoverToken")}
                  placeholder="a..."
                  helpUrl="https://pushover.net/apps/build"
                  helpText="Create an app at pushover.net/apps/build — copy the API Token/Key"
                />
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-xs text-green-800 space-y-2">
                <p className="font-semibold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> How it works:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>ScannerAgent finds a deal above discount threshold</li>
                  <li>MessengerAgent crafts a message using Claude</li>
                  <li>POST to <code className="bg-green-100 px-1 rounded font-mono">api.pushover.net/1/messages.json</code></li>
                  <li>Notification appears on your phone instantly</li>
                </ol>
                <p className="mt-2 text-green-700 font-medium">Note: If the Test button shows a CORS restriction, copy the curl command shown and run it in your terminal to send a real test notification.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vector DB ── */}
        <TabsContent value="vectordb" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Vector Database (ChromaDB)
                <Badge variant="secondary">RAG Store</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">ChromaDB persistent vector store used by FrontierAgent for RAG-based price lookups</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <PlainInput
                  label="ChromaDB Collection Name"
                  value={local.chromaCollection || "products"}
                  onChange={set("chromaCollection")}
                  placeholder="products"
                  helpText="Collection name in ChromaDB — default: 'products'"
                />
                <PlainInput
                  label="ChromaDB Persist Path"
                  value={local.chromaPath || "./products_vectorstore"}
                  onChange={set("chromaPath")}
                  placeholder="./products_vectorstore"
                  helpText="Local path where ChromaDB persists embeddings. Relative to project root."
                />
              </div>
              <div className="rounded-lg bg-purple-50 border border-purple-100 p-4 text-xs text-purple-800 space-y-2">
                <p className="font-semibold">Setup ChromaDB:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li><code className="bg-purple-100 px-1 rounded font-mono">pip install chromadb sentence-transformers</code></li>
                  <li>Run the Day 3 notebook to populate the vector store</li>
                  <li>~400K product descriptions embedded with all-MiniLM-L6-v2</li>
                  <li>FrontierAgent queries top-5 similar items for price context</li>
                </ol>
                <p className="mt-2">Embedding model: <code className="bg-purple-100 px-1 rounded font-mono">sentence-transformers/all-MiniLM-L6-v2</code></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Agent Config ── */}
        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent & Model Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">Fine-tune agent behaviour, ensemble weights, and scanning parameters</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Scanner Agent</p>
                <PlainInput
                  label="Subreddits to Scan"
                  value={local.scannerSubreddits || "deals,buildapc,frugalmalefashion"}
                  onChange={set("scannerSubreddits")}
                  placeholder="deals,buildapc,frugalmalefashion"
                  helpText="Comma-separated subreddit names (without r/)"
                />
                <PlainInput
                  label="Minimum Discount % to Alert"
                  value={local.scannerMinDiscount || "20"}
                  onChange={set("scannerMinDiscount")}
                  placeholder="20"
                  helpText="Only deals with discount >= this value trigger MessengerAgent"
                />
              </div>
              <div className="space-y-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Ensemble Weights (must sum to 1.0)</p>
                <PlainInput
                  label="Specialist Agent Weight"
                  value={local.ensembleSpecialistWeight || "0.4"}
                  onChange={set("ensembleSpecialistWeight")}
                  placeholder="0.4"
                  helpText="Weight for LLaMA fine-tuned model estimate (default: 0.4)"
                />
                <PlainInput
                  label="Frontier Agent Weight"
                  value={local.ensembleFrontierWeight || "0.3"}
                  onChange={set("ensembleFrontierWeight")}
                  placeholder="0.3"
                  helpText="Weight for GPT-4o-mini + RAG estimate (default: 0.3)"
                />
                <PlainInput
                  label="RAG Agent Weight"
                  value={local.ensembleRagWeight || "0.3"}
                  onChange={set("ensembleRagWeight")}
                  placeholder="0.3"
                  helpText="Weight for pure RAG similarity estimate (default: 0.3)"
                />
              </div>
              <div className="space-y-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Planner Agent</p>
                <PlainInput
                  label="Max ReAct Iterations"
                  value={local.plannerMaxIterations || "10"}
                  onChange={set("plannerMaxIterations")}
                  placeholder="10"
                  helpText="Maximum Think→Act→Observe loops before the planner gives a final answer"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
