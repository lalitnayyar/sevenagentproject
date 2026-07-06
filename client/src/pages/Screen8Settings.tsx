import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Eye, EyeOff, Save, RotateCcw, CheckCircle2, ExternalLink,
  Info, FlaskConical, Loader2, XCircle, Bell, Server
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TestStatus = "idle" | "testing" | "success" | "error";

interface TestResult {
  status: TestStatus;
  message: string;
  detail?: string;
  latency?: number;
}

// ─── TestResultPanel ──────────────────────────────────────────────────────────
function TestResultPanel({ result }: { result: TestResult }) {
  if (result.status === "idle") return null;

  const colorMap: Record<TestStatus, string> = {
    idle: "",
    testing: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };

  const iconMap: Record<TestStatus, React.ReactNode> = {
    idle: null,
    testing: <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />,
    success: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    error: <XCircle className="w-3.5 h-3.5 shrink-0" />,
  };

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-xs ${colorMap[result.status]} space-y-1`}>
      <p className="font-semibold flex items-center gap-1.5">
        {iconMap[result.status]}
        {result.message}
        {result.latency !== undefined && result.status === "success" && (
          <span className="ml-auto font-normal opacity-70">{result.latency}ms</span>
        )}
      </p>
      {result.detail && <p className="opacity-80 leading-relaxed">{result.detail}</p>}
    </div>
  );
}

// ─── SecretInput with tRPC Test Button ───────────────────────────────────────
function SecretInput({
  label, value, onChange, placeholder, helpUrl, helpText, onTest, testLabel,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; helpUrl?: string; helpText?: string;
  onTest?: () => Promise<TestResult>; testLabel?: string;
}) {
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<TestResult>({ status: "idle", message: "" });

  const run = useCallback(async () => {
    if (!onTest) return;
    setResult({ status: "testing", message: "Verifying via server..." });
    const r = await onTest();
    setResult(r);
    if (r.status === "success") toast.success(r.message, { description: r.detail });
    else if (r.status === "error") toast.error(r.message, { description: r.detail });
  }, [onTest]);

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
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={run}
            disabled={result.status === "testing" || !value.trim()}
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
            {result.status === "testing" ? "Verifying..." : (testLabel || "Verify Key")}
          </Button>
          <TestResultPanel result={result} />
        </div>
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
  const [modalSecret, setModalSecret] = useState(settings.modalTokenSecret || "");

  // ── tRPC mutations (server-side proxy — no CORS) ───────────────────────────
  const verifyOpenAI       = trpc.agents.verifyOpenAI.useMutation();
  const verifyAnthropic    = trpc.agents.verifyAnthropic.useMutation();
  const verifyDeepSeek     = trpc.agents.verifyDeepSeek.useMutation();
  const verifyHuggingFace  = trpc.agents.verifyHuggingFace.useMutation();
  const sendPushover       = trpc.agents.sendPushoverNotification.useMutation();

  const set = (field: string) => (v: string) => setLocal(prev => ({ ...prev, [field]: v }));

  const handleSave = () => {
    updateSettings({ ...local, modalTokenSecret: modalSecret });
    setSaved(true);
    toast.success("Settings saved to localStorage");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setLocal({ ...settings });
    setModalSecret(settings.modalTokenSecret || "");
    toast.info("Changes discarded");
  };

  const handleExportEnv = () => {
    const lines = [
      "# 7-Agent Price Intelligence Dashboard — .env file",
      "# Generated from Command Vault (Settings)",
      "",
      "# ── LLM APIs ─────────────────────────────────────────────────────",
      `OPENAI_API_KEY=${local.openaiApiKey || ""}`,
      `ANTHROPIC_API_KEY=${local.anthropicApiKey || ""}`,
      `DEEPSEEK_API_KEY=${local.deepseekApiKey || ""}`,
      "",
      "# ── Modal.com ─────────────────────────────────────────────────────",
      `MODAL_TOKEN_ID=${local.modalTokenId || ""}`,
      `MODAL_TOKEN_SECRET=${modalSecret}`,
      `MODAL_GPU_TYPE=${local.modalGpuType || "T4"}`,
      "",
      "# ── HuggingFace ───────────────────────────────────────────────────",
      `HF_TOKEN=${local.hfToken || ""}`,
      "",
      "# ── Pushover ──────────────────────────────────────────────────────",
      `PUSHOVER_USER=${local.pushoverUser || ""}`,
      `PUSHOVER_TOKEN=${local.pushoverToken || ""}`,
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

  // ── tRPC-backed test helpers ───────────────────────────────────────────────
  const makeTestOpenAI = useCallback(async (): Promise<TestResult> => {
    const key = local.openaiApiKey?.trim();
    if (!key) return { status: "error", message: "No API key entered" };
    if (!key.startsWith("sk-")) return { status: "error", message: "Invalid format", detail: "OpenAI keys start with 'sk-'" };
    try {
      const r = await verifyOpenAI.mutateAsync({ apiKey: key });
      return r.success
        ? { status: "success", message: r.message, latency: r.latency }
        : { status: "error", message: r.message };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }, [local.openaiApiKey, verifyOpenAI]);

  const makeTestAnthropic = useCallback(async (): Promise<TestResult> => {
    const key = local.anthropicApiKey?.trim();
    if (!key) return { status: "error", message: "No API key entered" };
    if (!key.startsWith("sk-ant-")) return { status: "error", message: "Invalid format", detail: "Anthropic keys start with 'sk-ant-'" };
    try {
      const r = await verifyAnthropic.mutateAsync({ apiKey: key });
      return r.success
        ? { status: "success", message: r.message, latency: r.latency }
        : { status: "error", message: r.message };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }, [local.anthropicApiKey, verifyAnthropic]);

  const makeTestDeepSeek = useCallback(async (): Promise<TestResult> => {
    const key = local.deepseekApiKey?.trim();
    if (!key) return { status: "error", message: "No API key entered" };
    if (!key.startsWith("sk-")) return { status: "error", message: "Invalid format", detail: "DeepSeek keys start with 'sk-'" };
    try {
      const r = await verifyDeepSeek.mutateAsync({ apiKey: key });
      return r.success
        ? { status: "success", message: r.message, latency: r.latency }
        : { status: "error", message: r.message };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }, [local.deepseekApiKey, verifyDeepSeek]);

  const makeTestHuggingFace = useCallback(async (): Promise<TestResult> => {
    const token = local.hfToken?.trim();
    if (!token) return { status: "error", message: "No token entered" };
    if (!token.startsWith("hf_")) return { status: "error", message: "Invalid format", detail: "HuggingFace tokens start with 'hf_'" };
    try {
      const r = await verifyHuggingFace.mutateAsync({ token });
      return r.success
        ? { status: "success", message: r.message, latency: r.latency }
        : { status: "error", message: r.message };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }, [local.hfToken, verifyHuggingFace]);

  const makeTestPushover = useCallback(async (): Promise<TestResult> => {
    const userKey = local.pushoverUser?.trim();
    const token   = local.pushoverToken?.trim();
    if (!userKey || !token) return { status: "error", message: "Both User Key and App Token are required" };
    try {
      const r = await sendPushover.mutateAsync({
        userKey,
        token,
        title: "7-Agent Dashboard — Test",
        message: "✅ Pushover credentials verified! MessengerAgent is ready to send deal alerts.",
        sound: "cashregister",
        priority: 0,
      });
      return r.success
        ? { status: "success", message: "Test notification sent to your phone! 🔔", detail: `Latency: ${r.latency}ms`, latency: r.latency }
        : { status: "error", message: r.message };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }, [local.pushoverUser, local.pushoverToken, sendPushover]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <PageHeader
        badge="Command Vault"
        title="Command Vault — Settings"
        subtitle="Configure all API keys, credentials, and agent parameters. All test buttons use a server-side proxy — no CORS restrictions."
      />

      {/* Backend Proxy Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <Server className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800">
          <p className="font-semibold mb-0.5">All Test Buttons Use Server-Side Proxy</p>
          <p>API verification calls are routed through the Express backend (tRPC) — not the browser. This means <strong>no CORS restrictions</strong> for any provider including Anthropic and Pushover. Enter your credentials and click Test to get a real response.</p>
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
                onTest={makeTestOpenAI}
                testLabel="Verify OpenAI Key"
              />
              <SecretInput
                label="Anthropic API Key"
                value={local.anthropicApiKey || ""}
                onChange={set("anthropicApiKey")}
                placeholder="sk-ant-..."
                helpUrl="https://console.anthropic.com/settings/keys"
                helpText="Used by: MessengerAgent (claude-sonnet-4-5) for crafting push notification messages"
                onTest={makeTestAnthropic}
                testLabel="Verify Anthropic Key"
              />
              <SecretInput
                label="DeepSeek API Key (Optional)"
                value={local.deepseekApiKey || ""}
                onChange={set("deepseekApiKey")}
                placeholder="sk-..."
                helpUrl="https://platform.deepseek.com"
                helpText="Optional alternative to OpenAI for FrontierAgent. Set OPENAI_API_KEY to DeepSeek key with base_url override."
                onTest={makeTestDeepSeek}
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
                <p className="font-semibold mt-2">How Test Works:</p>
                <p>Each Test button calls the backend server which makes a real API call server-side. You get the actual HTTP status, model list or response text, and round-trip latency in ms.</p>
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
                />
                <SecretInput
                  label="Modal Token Secret"
                  value={modalSecret}
                  onChange={setModalSecret}
                  placeholder="as-..."
                  helpText="Token Secret paired with Token ID above"
                />
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <p className="font-semibold mb-1">Note on Modal Verification</p>
                  <p>Modal does not expose a public REST API for token validation. Credentials are validated when you deploy or run a function via the Modal CLI. The format check above confirms your Token ID starts with <code className="bg-amber-100 px-1 rounded font-mono">ak-</code>.</p>
                </div>
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
                onTest={makeTestHuggingFace}
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
                />
                <SecretInput
                  label="Pushover App Token"
                  value={local.pushoverToken || ""}
                  onChange={set("pushoverToken")}
                  placeholder="a..."
                  helpUrl="https://pushover.net/apps/build"
                  helpText="Create an app at pushover.net/apps/build — copy the API Token/Key"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const r = await makeTestPushover();
                    if (r.status === "success") toast.success(r.message, { description: r.detail });
                    else toast.error(r.message, { description: r.detail });
                  }}
                  disabled={sendPushover.isPending || !local.pushoverUser?.trim() || !local.pushoverToken?.trim()}
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50 font-medium"
                >
                  {sendPushover.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                    : <><Bell className="w-3.5 h-3.5" /> Send Test Notification</>
                  }
                </Button>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-xs text-green-800 space-y-2">
                <p className="font-semibold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> How it works:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>ScannerAgent finds a deal above discount threshold</li>
                  <li>MessengerAgent crafts a message using Claude</li>
                  <li>POST to <code className="bg-green-100 px-1 rounded font-mono">api.pushover.net/1/messages.json</code></li>
                  <li>Notification appears on your phone instantly</li>
                </ol>
                <p className="mt-2 text-green-700 font-medium">The "Send Test Notification" button sends a real push notification to your phone via the server-side proxy — no CORS restrictions.</p>
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
