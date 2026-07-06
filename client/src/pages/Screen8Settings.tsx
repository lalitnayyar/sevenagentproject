import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import { Eye, EyeOff, Save, RotateCcw, CheckCircle2, ExternalLink, Info } from "lucide-react";

function SecretInput({ label, field, value, onChange, placeholder, helpUrl, helpText }: {
  label: string;
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helpUrl?: string;
  helpText?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
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
      {value && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Configured
        </p>
      )}
    </div>
  );
}

function PlainInput({ label, field, value, onChange, placeholder, helpText }: {
  label: string;
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      {helpText && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
          {helpText}
        </p>
      )}
    </div>
  );
}

export default function Screen8Settings() {
  const { settings, updateSettings } = useAgents();
  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

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
      "# Generated from Settings screen",
      "",
      "# OpenAI",
      `OPENAI_API_KEY=${local.openaiApiKey}`,
      "",
      "# Anthropic",
      `ANTHROPIC_API_KEY=${local.anthropicApiKey}`,
      "",
      "# Modal.com",
      `MODAL_TOKEN_ID=${local.modalToken}`,
      "",
      "# HuggingFace",
      `HF_TOKEN=${local.hfToken}`,
      `HF_USER=${local.hfUser}`,
      "",
      "# Pushover",
      `PUSHOVER_USER=${local.pushoverUser}`,
      `PUSHOVER_TOKEN=${local.pushoverToken}`,
      "",
      "# ChromaDB",
      `CHROMA_DB_PATH=${local.chromaDbPath}`,
      "",
      "# Ollama",
      `OLLAMA_BASE_URL=${local.ollamaBaseUrl}`,
      `PRICER_PREPROCESSOR_MODEL=${local.preprocessorModel}`,
      "",
      "# Deal Settings",
      `DEAL_THRESHOLD=${local.dealThreshold}`,
      `MAX_DATAPOINTS=${local.maxDatapoints}`,
      "",
      "# Model Config",
      `BASE_MODEL=${local.baseModel}`,
      `FINETUNED_MODEL=${local.finetunedModel}`,
      `RUN_NAME=${local.runName}`,
      `REVISION=${local.revision}`,
      `GPU=${local.gpu}`,
      "",
      "# DeepSeek (optional)",
      `DEEPSEEK_API_KEY=${local.deepseekApiKey}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(".env file downloaded");
  };

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Screen 8"
        title="Settings & Configuration"
        subtitle="API keys, credentials, and parameters used by all 7 agents across all screens"
      />

      <div className="p-6 space-y-6">
        {/* Save/Reset Bar */}
        <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Settings are stored in browser localStorage. Export as <code className="bg-muted px-1 rounded">.env</code> for Python agents.
          </p>
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

          {/* LLM APIs */}
          <TabsContent value="llm">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LLM API Keys</CardTitle>
                <p className="text-sm text-muted-foreground">Used by FrontierAgent (GPT-4o-mini), AutonomousPlannerAgent (GPT-4o), MessagingAgent (Claude), ScannerAgent (GPT-4o-mini)</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SecretInput
                  label="OpenAI API Key"
                  field="openaiApiKey"
                  value={local.openaiApiKey}
                  onChange={set("openaiApiKey")}
                  placeholder="sk-..."
                  helpUrl="https://platform.openai.com/api-keys"
                  helpText="Used by: FrontierAgent (gpt-4o-mini), AutonomousPlannerAgent (gpt-4o), ScannerAgent (gpt-4o-mini)"
                />
                <SecretInput
                  label="Anthropic API Key"
                  field="anthropicApiKey"
                  value={local.anthropicApiKey}
                  onChange={set("anthropicApiKey")}
                  placeholder="sk-ant-..."
                  helpUrl="https://console.anthropic.com/keys"
                  helpText="Used by: MessagingAgent (claude-sonnet-4-5) for crafting push notification messages"
                />
                <SecretInput
                  label="DeepSeek API Key (Optional)"
                  field="deepseekApiKey"
                  value={local.deepseekApiKey}
                  onChange={set("deepseekApiKey")}
                  placeholder="sk-..."
                  helpUrl="https://platform.deepseek.com/api_keys"
                  helpText="Optional alternative to OpenAI for FrontierAgent. Set OPENAI_API_KEY to DeepSeek key with base_url override."
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Agent → Model Mapping</p>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p>• <strong>ScannerAgent</strong> → gpt-4o-mini (deal summarization)</p>
                    <p>• <strong>FrontierAgent</strong> → gpt-4o-mini (RAG pricing)</p>
                    <p>• <strong>AutonomousPlannerAgent</strong> → gpt-4o (tool calling)</p>
                    <p>• <strong>MessagingAgent</strong> → claude-sonnet-4-5 (notifications)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modal.com */}
          <TabsContent value="modal">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modal.com Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">Used by SpecialistAgent to run fine-tuned LLaMA on GPU</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SecretInput
                  label="Modal Token"
                  field="modalToken"
                  value={local.modalToken}
                  onChange={set("modalToken")}
                  placeholder="ak-..."
                  helpUrl="https://modal.com/settings/tokens"
                  helpText="Run: modal token new — or set via MODAL_TOKEN_ID + MODAL_TOKEN_SECRET env vars"
                />
                <div className="space-y-3">
                  <PlainInput label="GPU Type" field="gpu" value={local.gpu} onChange={set("gpu")} placeholder="T4" helpText="Modal GPU: T4 (default), A10G, A100. T4 is cheapest." />
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">Setup Steps:</p>
                    <p>1. modal.com → Secrets → huggingface-secret → HF_TOKEN</p>
                    <p>2. uv run modal deploy -m pricer_service2</p>
                    <p>3. MIN_CONTAINERS=1 for warm container (uses credits)</p>
                    <p>4. Service: pricer-service | Class: Pricer | Method: price()</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HuggingFace */}
          <TabsContent value="huggingface">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">HuggingFace Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">Used for model loading, fine-tuned weights, and SentenceTransformer encoder</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SecretInput
                  label="HuggingFace Token"
                  field="hfToken"
                  value={local.hfToken}
                  onChange={set("hfToken")}
                  placeholder="hf_..."
                  helpUrl="https://huggingface.co/settings/tokens"
                  helpText="Required for loading gated models (LLaMA 3.2). Must accept Meta's license first."
                />
                <PlainInput
                  label="HuggingFace Username"
                  field="hfUser"
                  value={local.hfUser}
                  onChange={set("hfUser")}
                  placeholder="your-username"
                  helpText="Your HF username — used for logging in via huggingface_hub.login()"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pushover */}
          <TabsContent value="pushover">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pushover Push Notifications</CardTitle>
                <p className="text-sm text-muted-foreground">Used by MessagingAgent to send deal alerts to your phone</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SecretInput
                  label="Pushover User Key"
                  field="pushoverUser"
                  value={local.pushoverUser}
                  onChange={set("pushoverUser")}
                  placeholder="u..."
                  helpUrl="https://pushover.net"
                  helpText="Your Pushover account user key — found on pushover.net dashboard"
                />
                <SecretInput
                  label="Pushover App Token"
                  field="pushoverToken"
                  value={local.pushoverToken}
                  onChange={set("pushoverToken")}
                  placeholder="a..."
                  helpUrl="https://pushover.net/apps/build"
                  helpText="Create an app at pushover.net/apps/build — get the API Token/Key"
                />
                <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4 text-xs text-green-800 space-y-1">
                  <p className="font-semibold">Notification Flow:</p>
                  <p>1. MessagingAgent calls Claude claude-sonnet-4-5 to craft exciting message</p>
                  <p>2. POST https://api.pushover.net/1/messages.json with user, token, message, sound=cashregister</p>
                  <p>3. Push notification appears on your phone instantly</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vector DB */}
          <TabsContent value="vectordb">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vector Database & Local Services</CardTitle>
                <p className="text-sm text-muted-foreground">ChromaDB path, Ollama endpoint, and deal filtering parameters</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PlainInput
                  label="ChromaDB Path"
                  field="chromaDbPath"
                  value={local.chromaDbPath}
                  onChange={set("chromaDbPath")}
                  placeholder="products_vectorstore"
                  helpText="Local directory for ChromaDB persistent storage. Contains 400K+ product embeddings."
                />
                <PlainInput
                  label="Ollama Base URL"
                  field="ollamaBaseUrl"
                  value={local.ollamaBaseUrl}
                  onChange={set("ollamaBaseUrl")}
                  placeholder="http://localhost:11434"
                  helpText="Local Ollama server URL. Run: ollama serve && ollama pull llama3.2"
                />
                <PlainInput
                  label="Preprocessor Model"
                  field="preprocessorModel"
                  value={local.preprocessorModel}
                  onChange={set("preprocessorModel")}
                  placeholder="ollama/llama3.2"
                  helpText="Model for rewriting product descriptions. Options: ollama/llama3.2, groq/openai/gpt-oss-20b"
                />
                <PlainInput
                  label="Deal Discount Threshold ($)"
                  field="dealThreshold"
                  value={local.dealThreshold}
                  onChange={set("dealThreshold")}
                  placeholder="50"
                  helpText="Minimum discount in USD to trigger a push notification. Default: $50"
                />
                <PlainInput
                  label="Max Datapoints (t-SNE)"
                  field="maxDatapoints"
                  value={local.maxDatapoints}
                  onChange={set("maxDatapoints")}
                  placeholder="2000"
                  helpText="Number of ChromaDB embeddings to use for t-SNE visualization. Higher = slower."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Model Config */}
          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fine-tuned Model Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">SpecialistAgent model parameters — LLaMA 3.2-3B fine-tuned on Amazon product prices</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PlainInput
                  label="Base Model"
                  field="baseModel"
                  value={local.baseModel}
                  onChange={set("baseModel")}
                  placeholder="meta-llama/Llama-3.2-3B"
                  helpText="Base LLaMA model from HuggingFace. Requires HF_TOKEN and Meta license acceptance."
                />
                <PlainInput
                  label="Fine-tuned Model (HF Hub)"
                  field="finetunedModel"
                  value={local.finetunedModel}
                  onChange={set("finetunedModel")}
                  placeholder="ed-donner/price-2025-11-28_18.47.07"
                  helpText="PEFT/LoRA adapter weights on HuggingFace Hub. Loaded on top of base model."
                />
                <PlainInput
                  label="Run Name"
                  field="runName"
                  value={local.runName}
                  onChange={set("runName")}
                  placeholder="2025-11-28_18.47.07"
                  helpText="Training run identifier — used to construct model path and revision"
                />
                <PlainInput
                  label="Revision (Git Commit Hash)"
                  field="revision"
                  value={local.revision}
                  onChange={set("revision")}
                  placeholder="b19c8bfea3b6ff62..."
                  helpText="Specific HF Hub commit hash for reproducible model loading"
                />
                <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-800 space-y-1">
                  <p className="font-semibold">Quantization Config (BitsAndBytes):</p>
                  <p>• load_in_4bit=True</p>
                  <p>• bnb_4bit_quant_type="nf4"</p>
                  <p>• bnb_4bit_compute_dtype=torch.float16</p>
                  <p>• bnb_4bit_use_double_quant=True</p>
                  <p className="mt-2 font-semibold">Inference Prompt Template:</p>
                  <p className="font-mono bg-indigo-100 p-2 rounded">How much does this cost to the nearest dollar?</p>
                  <p className="font-mono bg-indigo-100 p-2 rounded mt-1">[description]\n\nPrice is $</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* .env Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complete .env Reference</CardTitle>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
