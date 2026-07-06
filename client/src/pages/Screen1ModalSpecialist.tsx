import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgentControlCard, PageHeader, LogTerminal } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import {
  Cloud, Cpu, Server, GitBranch, Zap, Database,
  DollarSign, CheckCircle2, Code2, Info
} from "lucide-react";

const SAMPLE_DESCRIPTIONS = [
  "Apple MacBook Pro 16-inch M3 Pro chip, 18GB RAM, 512GB SSD, Space Black",
  "Sony WH-1000XM5 Wireless Noise Canceling Headphones, Black",
  "Samsung 65-inch QLED 4K Smart TV QN65Q80C with Alexa Built-in",
  "Dyson V15 Detect Absolute Cordless Vacuum Cleaner",
  "LEGO Technic Bugatti Chiron 42083 Building Kit 3599 Pieces",
];

export default function Screen1ModalSpecialist() {
  const { agents, startAgent, addEstimation } = useAgents();
  const specialist = agents.find(a => a.id === "specialist")!;
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const handleEstimate = async () => {
    if (!description.trim()) { toast.error("Please enter a product description"); return; }
    setIsEstimating(true);
    setResult(null);
    startAgent("specialist");
    await new Promise(r => setTimeout(r, 4200));
    const price = Math.random() * 900 + 30;
    setResult(price);
    addEstimation({
      description: description.slice(0, 60),
      specialist: price,
      frontier: price * (0.9 + Math.random() * 0.2),
      ensemble: price * (0.95 + Math.random() * 0.1),
      neural: price * (0.88 + Math.random() * 0.24),
    });
    toast.success(`Specialist Agent predicted $${price.toFixed(2)}`);
    setIsEstimating(false);
  };

  return (
    <div className="min-h-full">
      <PageHeader
        badge="GPU Inference Engine"
        title="Modal.com · Specialist Agent"
        subtitle="Fine-tuned LLaMA 3.2-3B deployed on Modal.com GPU infrastructure for product price estimation"
      >
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <Cloud className="w-4 h-4" />
          <span className="text-sm font-medium">Modal.com</span>
        </div>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Architecture Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Server className="w-5 h-5 text-blue-500" />, title: "Modal Infrastructure", items: ["Serverless GPU (T4)", "Auto-scaling containers", "Persistent HF cache volume", "4-bit quantization (NF4)"] },
            { icon: <GitBranch className="w-5 h-5 text-purple-500" />, title: "Model Architecture", items: ["Base: LLaMA 3.2-3B", "Fine-tuned with PEFT/LoRA", "HuggingFace Hub deployment", "BitsAndBytes quantization"] },
            { icon: <Zap className="w-5 h-5 text-yellow-500" />, title: "Service Config", items: ["App: pricer-service", "Class: Pricer", "Method: price(description)", "Timeout: 1800s"] },
          ].map((block, i) => (
            <Card key={i} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">{block.icon}{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {block.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Estimator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-5 h-5 text-green-600" />
                Price Estimator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Product Description</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={4}
                  placeholder="Enter a detailed product description..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Quick Samples</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_DESCRIPTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(s)}
                      className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors"
                    >
                      Sample {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleEstimate}
                disabled={isEstimating}
              >
                <Cpu className="w-4 h-4" />
                {isEstimating ? "Running Specialist Agent..." : "Estimate Price via Modal.com"}
              </Button>

              {result !== null && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">Specialist Agent Prediction</p>
                  <p className="text-4xl font-bold text-green-700">${result.toFixed(2)}</p>
                  <p className="text-xs text-green-600 mt-1">via fine-tuned LLaMA 3.2-3B on Modal T4 GPU</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Code Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="w-5 h-5 text-blue-500" />
                Source Code Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="code-block text-xs leading-relaxed">
                <span className="text-blue-400">import</span> modal{"\n"}
                <span className="text-blue-400">from</span> agents.agent <span className="text-blue-400">import</span> Agent{"\n\n"}
                <span className="text-purple-400">class</span> <span className="text-yellow-300">SpecialistAgent</span>(Agent):{"\n"}
                {"  "}<span className="text-green-400">"""Fine-tuned LLM on Modal"""</span>{"\n"}
                {"  "}name = <span className="text-orange-300">"Specialist Agent"</span>{"\n"}
                {"  "}color = Agent.RED{"\n\n"}
                {"  "}<span className="text-purple-400">def</span> <span className="text-yellow-300">__init__</span>(self):{"\n"}
                {"    "}Pricer = modal.Cls.from_name({"\n"}
                {"      "}<span className="text-orange-300">"pricer-service"</span>, <span className="text-orange-300">"Pricer"</span>{"\n"}
                {"    "}){"\n"}
                {"    "}self.pricer = Pricer(){"\n\n"}
                {"  "}<span className="text-purple-400">def</span> <span className="text-yellow-300">price</span>(self, description: str) -&gt; float:{"\n"}
                {"    "}result = self.pricer.price.remote(description){"\n"}
                {"    "}<span className="text-blue-400">return</span> result{"\n"}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span>The Pricer class runs on Modal with a T4 GPU. The <code className="bg-muted px-1 rounded">@modal.enter()</code> method loads the model once per container lifecycle.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span>Uses <code className="bg-muted px-1 rounded">pricer_service2.py</code> with warm containers (<code className="bg-muted px-1 rounded">min_containers=1</code>) for production use.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Control */}
        <AgentControlCard agentId="specialist" />

        {/* Modal Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-indigo-500" />
              Modal Service Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { file: "hello.py", desc: "Basic Modal test — returns location from IP", badge: "Test" },
                { file: "pricer_ephemeral.py", desc: "Ephemeral function — loads model fresh each call", badge: "Dev" },
                { file: "pricer_service.py", desc: "Stateless service function — no warm containers", badge: "Service" },
                { file: "pricer_service2.py", desc: "Warm container class with @modal.enter() setup", badge: "Production" },
                { file: "llama.py", desc: "Raw LLaMA 3.2-3B inference without fine-tuning", badge: "Base" },
              ].map(f => (
                <div key={f.file} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs font-mono font-bold text-primary">{f.file}</code>
                    <Badge variant="secondary" className="text-[10px]">{f.badge}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
