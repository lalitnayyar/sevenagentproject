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
  Info, FlaskConical, Loader2, XCircle, Bell, Zap
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TestStatus = "idle" | "testing" | "success" | "error";

interface TestResult {
  status: TestStatus;
  message: string;
  detail?: string;
  latency?: number;
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
      const err = await res.json();
      return { status: "error", message: `HTTP ${res.status}`, detail: err.error?.message || "Authentication failed", latency };
    }
  } catch {
    return { status: "error", message: "Network error", detail: "Could not reach api.openai.com — check CORS or network" };
  }
}

async function testAnthropic(apiKey: string): Promise<TestResult> {
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return { status: "error", message: "Invalid key format", detail: "Anthropic keys start with 'sk-ant-'" };
  }
  const start = Date.now();
  try {
    // Anthropic doesn't have a lightweight ping endpoint; use a minimal message
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 5,
        messages: [{ role: "user", content: "Reply with: OK" }],
      }),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Response received";
      return { status: "success", message: "Anthropic API key is valid", detail: `Model: claude-haiku-4-5 · Response: "${reply}"`, latency };
    } else {
      const err = await res.json();
      return { status: "error", message: `HTTP ${res.status}`, detail: err.error?.message || "Authentication failed", latency };
    }
  } catch {
    return { status: "error", message: "Network error", detail: "Could not reach api.anthropic.com" };
  }
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
    return { status: "error", message: "Network error", detail: "Could not reach api.deepseek.com" };
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
    return { status: "error", message: "Network error", detail: "Could not reach huggingface.co" };
  }
}

async function testModal(tokenId: string, tokenSecret: string): Promise<TestResult> {
  if (!tokenId && !tokenSecret) {
    return { status: "error", message: "Missing credentials", detail: "Enter both MODAL_TOKEN_ID and MODAL_TOKEN_SECRET" };
  }
  if (!tokenId.startsWith("ak-") && tokenId.length > 0) {
    return { status: "error", message: "Invalid Token ID format", detail: "Modal Token IDs start with 'ak-'" };
  }
  // Modal doesn't have a public REST API for token validation — simulate with format check
  const start = Date.now();
  await new Promise(r => setTimeout(r, 600));
  const latency = Date.now() - start;
  if (tokenId.length > 10 && tokenSecret.length > 10) {
    return {
      status: "success",
      message: "Modal credentials format valid",
      detail: `Token ID: ${tokenId.slice(0, 8)}... · Secret: ${tokenSecret.slice(0, 4)}... · To fully verify: run 'modal token set --token-id ... --token-secret ...'`,
      latency,
    };
  }
  return { status: "error", message: "Credentials too short", detail: "Both Token ID and Token Secret must be provided" };
}

async function testPushover(userKey: string, appToken: string): Promise<TestResult> {
  if (!userKey || !appToken) {
    return { status: "error", message: "Missing credentials", detail: "Both Pushover User Key and App Token are required" };
  }
  const start = Date.now();
  try {
    // Validate credentials first
    const validateRes = await fetch("https://api.pushover.net/1/users/validate.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: appToken, user: userKey }),
    });
    const latency = Date.now() - start;
    if (validateRes.ok) {
      const data = await validateRes.json();
      if (data.status === 1) {
        // Now send a test notification
        const msgRes = await fetch("https://api.pushover.net/1/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: appToken,
            user: userKey,
            title: "7-Agent Dashboard — Test Notification",
            message: "✅ Your Pushover credentials are working! The MessengerAgent will use this to send deal alerts.",
            sound: "cashregister",
          }),
        });
        const msgData = await msgRes.json();
        if (msgData.status === 1) {
          return {
            status: "success",
            message: "Test notification sent!",
            detail: `Pushover credentials valid · Notification delivered · Request ID: ${msgData.request}`,
            latency,
          };
        }
      }
      return { status: "error", message: "Invalid credentials", detail: data.errors?.join(", ") || "Pushover rejected the credentials", latency };
    } else {
      return { status: "error", message: `HTTP ${validateRes.status}`, detail: "Could not reach Pushover API", latency };
    }
  } catch {
    return { status: "error", message: "Network error", detail: "Could not reach api.pushover.net" };
  }
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
    }
  }, [onTest]);

  const statusColor = {
    idle: "bg-slate-100 text-slate-600 border-slate-200",
    testing: "bg-blue-50 text-blue-600 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200",
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
        ) : (
          <FlaskConical className="w-3.5 h-3.5" />
        )}
        {result.status === "testing" ? "Testing..." : label}
        {result.latency && result.status === "success" && (
          <span className="text-xs text-green-600 font-normal">{result.latency}ms</span>
        )}
      </Button>
      {result.status !== "idle" && result.message && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${statusColor}`}>
          <p className="font-semibold">{result.message}</p>
          {result.detail && <p className="mt-0.5 opacity-80">{result.detail}</p>}
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
      "# ── LLM APIs ──────────────────────────────────────────",
      `OPENAI_API_KEY=${local.openaiApiKey}`,
      `ANTHROPIC_API_KEY=${local.anthropicApiKey}`,
      `DEEPSEEK_API_KEY=${local.deepseekApiKey}`,
      "",
      "# ── Modal.com ─────────────────────────────────────────",
      `MODAL_TOKEN_ID=${local.modalToken}`,
      `MODAL_TOKEN_SECRET=${modalSecret}`,
      "",
      "# ── HuggingFace ───────────────────────────────────────",
      `HF_TOKEN=${local.hfToken}`,
      `HF_USER=${local.hfUser}`,
      "",
      "# ── Pushover ──────────────────────────────────────────",
      `PUSHOVER_USER=${local.pushoverUser}`,
      `PUSHOVER_TOKEN=${local.pushoverToken}`,
      "",
      "# ── ChromaDB / Local ──────────────────────────────────",
      `CHROMA_DB_PATH=${local.chromaDbPath}`,
      `OLLAMA_BASE_URL=${local.ollamaBaseUrl}`,
      `PRICER_PREPROCESSOR_MODEL=${local.preprocessorModel}`,
      "",
      "# ── Deal Settings ─────────────────────────────────────",
      `DEAL_THRESHOLD=${local.dealThreshold}`,
      `MAX_DATAPOINTS=${local.maxDatapoints}`,
      "",
      "# ── Model Config ──────────────────────────────────────",
      `BASE_MODEL=${local.baseModel}`,
      `FINETUNED_MODEL=${local.finetunedModel}`,
      `RUN_NAME=${local.runName}`,
      `REVISION=${local.revision}`,
      `GPU=${local.gpu}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = ".env"; a.click();
    URL.revokeObjectURL(url);
    toast.success(".env file downloaded");
  };

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Command Vault"
        title="Settings & Configuration"
        subtitle="API keys, credentials, and parameters used by all 7 agents — with live verification for each key"
      />

      <div className="p-6 space-y-6">
        {/* Save/Reset Bar */}
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              Settings saved to <code className="bg-blue-100 px-1 rounded">localStorage</code> · Export as{" "}
              <code className="bg-blue-100 px-1 rounded">.env</code> for Python agents · Each key has a{" "}
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Test</Badge> button
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Discard
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportEnv} className="gap-2">
              Export .env
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? "Saved!" : "Save Settings"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="llm">
          <TabsList className="flex-wrap h-auto mb-6">
            <TabsTrigger value="llm">LLM APIs</TabsTrigger>
            <TabsTrigger value="modal">Modal.com</TabsTrigger>
            <TabsTrigger value="huggingface">HuggingFace</TabsTrigger>
            <TabsTrigger value="pushover">Pushover</TabsTrigger>
            <TabsTrigger value="vectordb">Vector DB</TabsTrigger>
            <TabsTrigger value="model">Model Config</TabsTrigger>
          </TabsList>

          {/* ── LLM APIs ─────────────────────────────────────────────────── */}
          <TabsContent value="llm">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  LLM API Keys
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">3 providers</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Used by FrontierAgent (GPT-4o-mini), AutonomousPlannerAgent (GPT-4o), MessengerAgent (Claude), ScannerAgent (GPT-4o-mini)
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SecretInput
                  label="OpenAI API Key"
                  value={local.openaiApiKey}
                  onChange={set("openaiApiKey")}
                  placeholder="sk-..."
                  helpUrl="https://platform.openai.com/api-keys"
                  helpText="Used by: FrontierAgent (gpt-4o-mini), AutonomousPlannerAgent (gpt-4o), ScannerAgent (gpt-4o-mini)"
                  onTest={() => testOpenAI(local.openaiApiKey)}
                  testLabel="Verify OpenAI Key"
                />
                <SecretInput
                  label="Anthropic API Key"
                  value={local.anthropicApiKey}
                  onChange={set("anthropicApiKey")}
                  placeholder="sk-ant-..."
                  helpUrl="https://console.anthropic.com/settings/keys"
                  helpText="Used by: MessengerAgent (claude-sonnet-4-5) for crafting push notification messages"
                  onTest={() => testAnthropic(local.anthropicApiKey)}
                  testLabel="Verify Anthropic Key"
                />
                <SecretInput
                  label="DeepSeek API Key (Optional)"
                  value={local.deepseekApiKey}
                  onChange={set("deepseekApiKey")}
                  placeholder="sk-..."
                  helpUrl="https://platform.deepseek.com/api_keys"
                  helpText="Optional alternative to OpenAI for FrontierAgent. Set OPENAI_API_KEY to DeepSeek key with base_url override."
                  onTest={() => testDeepSeek(local.deepseekApiKey)}
                  testLabel="Verify DeepSeek Key"
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Agent → Model Mapping</p>
                  <div className="space-y-1.5 text-xs text-blue-700">
                    <p>• <strong>ScannerAgent</strong> → gpt-4o-mini (deal summarization)</p>
                    <p>• <strong>FrontierAgent</strong> → gpt-4o-mini (RAG pricing)</p>
                    <p>• <strong>AutonomousPlannerAgent</strong> → gpt-4o (tool calling)</p>
                    <p>• <strong>MessengerAgent</strong> → claude-sonnet-4-5 (notifications)</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-600">
                    <p className="font-semibold mb-1">Test Response Format:</p>
                    <p>Each Test button makes a real API call and shows the HTTP status, model list or response text, and latency in ms.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Modal.com ─────────────────────────────────────────────────── */}
          <TabsContent value="modal">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Modal.com Configuration
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">GPU Inference</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Used by SpecialistAgent to run fine-tuned LLaMA 3.2-3B on T4 GPU</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <SecretInput
                    label="Modal Token ID"
                    value={local.modalToken}
                    onChange={set("modalToken")}
                    placeholder="ak-..."
                    helpUrl="https://modal.com/settings/tokens"
                    helpText="Run: modal token new — or copy from modal.com → Settings → Tokens"
                  />
                  <SecretInput
                    label="Modal Token Secret"
                    value={modalSecret}
                    onChange={setModalSecret}
                    placeholder="as-..."
                    helpText="Token Secret paired with Token ID above"
                  />
                  <TestButton
                    onTest={() => testModal(local.modalToken, modalSecret)}
                    label="Verify Modal Credentials"
                  />
                </div>
                <div className="space-y-3">
                  <PlainInput
                    label="GPU Type"
                   
                    value={local.gpu}
                    onChange={set("gpu")}
                    placeholder="T4"
                    helpText="Modal GPU: T4 (default, cheapest), A10G (faster), A100 (fastest)"
                  />
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1.5">
                    <p className="font-semibold">Setup Steps:</p>
                    <p>1. modal.com → Secrets → huggingface-secret → set HF_TOKEN</p>
                    <p>2. <code className="bg-amber-100 px-1 rounded">uv run modal deploy -m pricer_service2</code></p>
                    <p>3. MIN_CONTAINERS=1 for warm container (uses credits)</p>
                    <p>4. Service: <strong>pricer-service</strong> · Class: <strong>Pricer</strong> · Method: <strong>price()</strong></p>
                    <p className="mt-2 text-amber-700">Note: Modal token validation requires CLI — the Test button checks format only.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── HuggingFace ───────────────────────────────────────────────── */}
          <TabsContent value="huggingface">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  HuggingFace Configuration
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Model Hub</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Used for loading LLaMA 3.2-3B, PEFT/LoRA adapters, and SentenceTransformer encoder</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <SecretInput
                    label="HuggingFace Token"
                    value={local.hfToken}
                    onChange={set("hfToken")}
                    placeholder="hf_..."
                    helpUrl="https://huggingface.co/settings/tokens"
                    helpText="Required for loading gated models (LLaMA 3.2). Must accept Meta's license first at huggingface.co/meta-llama"
                    onTest={() => testHuggingFace(local.hfToken)}
                    testLabel="Verify HF Token"
                  />
                </div>
                <div className="space-y-4">
                  <PlainInput
                    label="HuggingFace Username"
                   
                    value={local.hfUser}
                    onChange={set("hfUser")}
                    placeholder="your-username"
                    helpText="Your HF username — used for huggingface_hub.login() and model upload"
                  />
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-1">
                    <p className="font-semibold">Token Permissions Required:</p>
                    <p>• Read access to gated models (LLaMA 3.2)</p>
                    <p>• Write access (if uploading fine-tuned adapters)</p>
                    <p>• The Test button calls <code className="bg-yellow-100 px-1 rounded">/api/whoami-v2</code> and returns your account name</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pushover ──────────────────────────────────────────────────── */}
          <TabsContent value="pushover">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Pushover Push Notifications
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Real-time Alerts</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Used by MessengerAgent to send deal alerts to your phone via Pushover</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <SecretInput
                    label="Pushover User Key"
                    value={local.pushoverUser}
                    onChange={set("pushoverUser")}
                    placeholder="u..."
                    helpUrl="https://pushover.net"
                    helpText="Your Pushover account user key — found on pushover.net dashboard after login"
                  />
                  <SecretInput
                    label="Pushover App Token"
                    value={local.pushoverToken}
                    onChange={set("pushoverToken")}
                    placeholder="a..."
                    helpUrl="https://pushover.net/apps/build"
                    helpText="Create an app at pushover.net/apps/build — copy the API Token/Key"
                  />
                  <TestButton
                    onTest={() => testPushover(local.pushoverUser, local.pushoverToken)}
                    label="Send Test Notification"
                  />
                </div>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs text-green-800 space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Notification Flow:
                    </p>
                    <p>1. MessengerAgent calls Claude claude-sonnet-4-5 to craft an exciting message</p>
                    <p>2. POST to <code className="bg-green-100 px-1 rounded">api.pushover.net/1/messages.json</code></p>
                    <p>3. Parameters: user, token, message, title, sound=cashregister</p>
                    <p>4. Push notification appears on your phone instantly</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <p className="font-semibold mb-1">Test Button Behaviour:</p>
                    <p>Clicking <strong>Send Test Notification</strong> will:</p>
                    <p>1. Validate credentials via <code className="bg-blue-100 px-1 rounded">/users/validate.json</code></p>
                    <p>2. Send a real push notification to your device</p>
                    <p>3. Show the Pushover request ID on success</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Vector DB ─────────────────────────────────────────────────── */}
          <TabsContent value="vectordb">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vector Database &amp; Local Services</CardTitle>
                <p className="text-sm text-muted-foreground">ChromaDB path, Ollama endpoint, and deal filtering parameters</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PlainInput label="ChromaDB Path" value={local.chromaDbPath} onChange={set("chromaDbPath")} placeholder="products_vectorstore" helpText="Local directory for ChromaDB persistent storage. Contains 400K+ product embeddings." />
                <PlainInput label="Ollama Base URL" value={local.ollamaBaseUrl} onChange={set("ollamaBaseUrl")} placeholder="http://localhost:11434" helpText="Local Ollama server URL. Run: ollama serve && ollama pull llama3.2" />
                <PlainInput label="Preprocessor Model" value={local.preprocessorModel} onChange={set("preprocessorModel")} placeholder="ollama/llama3.2" helpText="Model for rewriting product descriptions. Options: ollama/llama3.2, groq/openai/gpt-oss-20b" />
                <PlainInput label="Deal Discount Threshold ($)" value={local.dealThreshold} onChange={set("dealThreshold")} placeholder="50" helpText="Minimum discount in USD to trigger a push notification. Default: $50" />
                <PlainInput label="Max Datapoints (t-SNE)" value={local.maxDatapoints} onChange={set("maxDatapoints")} placeholder="2000" helpText="Number of ChromaDB embeddings to use for t-SNE visualization. Higher = slower." />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Model Config ──────────────────────────────────────────────── */}
          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fine-tuned Model Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">SpecialistAgent model parameters — LLaMA 3.2-3B fine-tuned on Amazon product prices</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PlainInput label="Base Model" value={local.baseModel} onChange={set("baseModel")} placeholder="meta-llama/Llama-3.2-3B" helpText="Base LLaMA model from HuggingFace. Requires HF_TOKEN and Meta license acceptance." />
                <PlainInput label="Fine-tuned Model (HF Hub)" value={local.finetunedModel} onChange={set("finetunedModel")} placeholder="ed-donner/price-2025-11-28_18.47.07" helpText="PEFT/LoRA adapter weights on HuggingFace Hub. Loaded on top of base model." />
                <PlainInput label="Run Name" value={local.runName} onChange={set("runName")} placeholder="2025-11-28_18.47.07" helpText="Training run identifier — used to construct model path and revision" />
                <PlainInput label="Revision (Git Commit Hash)" value={local.revision} onChange={set("revision")} placeholder="b19c8bfea3b6ff62..." helpText="Specific HF Hub commit hash for reproducible model loading" />
                <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-800 space-y-1">
                  <p className="font-semibold">Quantization Config (BitsAndBytes):</p>
                  <p>• load_in_4bit=True · bnb_4bit_quant_type="nf4" · bnb_4bit_compute_dtype=torch.float16 · bnb_4bit_use_double_quant=True</p>
                  <p className="mt-2 font-semibold">Inference Prompt Template:</p>
                  <p className="font-mono bg-indigo-100 p-2 rounded mt-1">How much does this cost to the nearest dollar?{"\n"}[description]{"\n\n"}Price is $</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* .env Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complete .env Reference</CardTitle>
            <p className="text-sm text-muted-foreground">All environment variables used by the Python agents</p>
          </CardHeader>
          <CardContent>
            <div className="code-block text-xs leading-relaxed">
              <span className="text-slate-400"># LLM APIs</span>{"\n"}
              <span className="text-green-400">OPENAI_API_KEY</span>=sk-...{"\n"}
              <span className="text-green-400">ANTHROPIC_API_KEY</span>=sk-ant-...{"\n"}
              <span className="text-green-400">DEEPSEEK_API_KEY</span>=sk-... <span className="text-slate-400"># optional</span>{"\n\n"}
              <span className="text-slate-400"># Modal.com</span>{"\n"}
              <span className="text-green-400">MODAL_TOKEN_ID</span>=ak-...{"\n"}
              <span className="text-green-400">MODAL_TOKEN_SECRET</span>=as-...{"\n\n"}
              <span className="text-slate-400"># HuggingFace</span>{"\n"}
              <span className="text-green-400">HF_TOKEN</span>=hf_...{"\n"}
              <span className="text-green-400">HF_USER</span>=your-username{"\n\n"}
              <span className="text-slate-400"># Pushover</span>{"\n"}
              <span className="text-green-400">PUSHOVER_USER</span>=u...{"\n"}
              <span className="text-green-400">PUSHOVER_TOKEN</span>=a...{"\n\n"}
              <span className="text-slate-400"># Optional overrides</span>{"\n"}
              <span className="text-green-400">PRICER_PREPROCESSOR_MODEL</span>=ollama/llama3.2{"\n"}
              <span className="text-green-400">CHROMA_DB_PATH</span>=products_vectorstore{"\n"}
              <span className="text-green-400">DEAL_THRESHOLD</span>=50{"\n"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
