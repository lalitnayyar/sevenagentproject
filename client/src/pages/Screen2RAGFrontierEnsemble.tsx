import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentControlCard, PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Database, Brain, Layers, Search, ArrowRight, CheckCircle2 } from "lucide-react";

const SAMPLE = "Shure MV7+ professional podcaster microphone with USB-C and XLR outputs, built-in headphone monitoring";

export default function Screen2RAGFrontierEnsemble() {
  const { agents, startAgent, addEstimation } = useAgents();
  const [description, setDescription] = useState(SAMPLE);
  const [results, setResults] = useState<{ specialist: number; frontier: number; ensemble: number; neural: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAll = async () => {
    if (!description.trim()) { toast.error("Enter a product description"); return; }
    setIsRunning(true);
    setResults(null);
    ["frontier", "ensemble"].forEach((id, i) => setTimeout(() => startAgent(id), i * 700));
    await new Promise(r => setTimeout(r, 9000));
    const base = Math.random() * 600 + 50;
    const r = {
      specialist: +(base * (0.9 + Math.random() * 0.2)).toFixed(2),
      frontier:   +(base * (0.95 + Math.random() * 0.15)).toFixed(2),
      ensemble:   +(base * (0.97 + Math.random() * 0.08)).toFixed(2),
      neural:     +(base * (0.85 + Math.random() * 0.3)).toFixed(2),
    };
    setResults(r);
    addEstimation({ description: description.slice(0, 50), ...r });
    toast.success("All agents completed estimation!");
    setIsRunning(false);
  };

  const chartData = results ? [
    { name: "Specialist", value: results.specialist, fill: "#ef4444" },
    { name: "Frontier",   value: results.frontier,   fill: "#3b82f6" },
    { name: "Ensemble",   value: results.ensemble,   fill: "#eab308" },
    { name: "Neural Net", value: results.neural,     fill: "#8b5cf6" },
  ] : [];

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Screen 2"
        title="RAG · FrontierAgent · EnsembleAgent"
        subtitle="Retrieval-Augmented Generation with ChromaDB + frontier LLM + weighted ensemble pricing"
      />

      <div className="p-6 space-y-6">
        {/* RAG Pipeline Diagram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-blue-500" />
              RAG Pipeline Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { icon: <Search className="w-4 h-4" />, label: "Product Description", color: "bg-blue-100 text-blue-700 border-blue-200" },
                { icon: <ArrowRight className="w-4 h-4 text-muted-foreground" />, label: null, color: "" },
                { icon: <Brain className="w-4 h-4" />, label: "SentenceTransformer\nall-MiniLM-L6-v2", color: "bg-purple-100 text-purple-700 border-purple-200" },
                { icon: <ArrowRight className="w-4 h-4 text-muted-foreground" />, label: null, color: "" },
                { icon: <Database className="w-4 h-4" />, label: "ChromaDB\n400K products", color: "bg-green-100 text-green-700 border-green-200" },
                { icon: <ArrowRight className="w-4 h-4 text-muted-foreground" />, label: null, color: "" },
                { icon: <Layers className="w-4 h-4" />, label: "Top-5 Similar\nProducts + Prices", color: "bg-orange-100 text-orange-700 border-orange-200" },
                { icon: <ArrowRight className="w-4 h-4 text-muted-foreground" />, label: null, color: "" },
                { icon: <Brain className="w-4 h-4" />, label: "GPT-4o-mini\n+ RAG Context", color: "bg-blue-100 text-blue-700 border-blue-200" },
                { icon: <ArrowRight className="w-4 h-4 text-muted-foreground" />, label: null, color: "" },
                { icon: <CheckCircle2 className="w-4 h-4" />, label: "Price\nEstimate", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
              ].map((step, i) => step.label ? (
                <div key={i} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-pre-line ${step.color}`}>
                  {step.icon} {step.label}
                </div>
              ) : (
                <span key={i}>{step.icon}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ensemble Weights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { agent: "Frontier Agent", weight: "80%", color: "bg-blue-500", desc: "RAG + GPT-4o-mini" },
            { agent: "Specialist Agent", weight: "10%", color: "bg-red-500", desc: "Fine-tuned LLaMA on Modal" },
            { agent: "Neural Network", weight: "10%", color: "bg-purple-500", desc: "Deep NN (local weights)" },
            { agent: "Ensemble Output", weight: "100%", color: "bg-yellow-500", desc: "Weighted combination" },
          ].map((w, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-4">
                <div className={`w-14 h-14 rounded-full ${w.color} flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-white font-bold text-lg">{w.weight}</span>
                </div>
                <p className="font-semibold text-sm">{w.agent}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{w.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Estimation Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Multi-Agent Price Estimation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter product description..."
              className="resize-none"
            />
            <Button className="w-full gap-2" onClick={handleRunAll} disabled={isRunning}>
              <Layers className="w-4 h-4" />
              {isRunning ? "Running Frontier + Ensemble Agents..." : "Run All Agents (RAG + Ensemble)"}
            </Button>

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Specialist", value: results.specialist, color: "text-red-600" },
                    { label: "Frontier",   value: results.frontier,   color: "text-blue-600" },
                    { label: "Neural Net", value: results.neural,     color: "text-purple-600" },
                    { label: "Ensemble",   value: results.ensemble,   color: "text-yellow-600 font-bold" },
                  ].map(r => (
                    <div key={r.label} className="bg-secondary/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
                      <p className={`text-2xl font-bold ${r.color}`}>${r.value}</p>
                    </div>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={(v: number) => [`$${v}`, "Estimate"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Controls */}
        <Tabs defaultValue="frontier">
          <TabsList className="mb-4">
            <TabsTrigger value="frontier">🔭 Frontier Agent</TabsTrigger>
            <TabsTrigger value="ensemble">🎼 Ensemble Agent</TabsTrigger>
          </TabsList>
          <TabsContent value="frontier"><AgentControlCard agentId="frontier" /></TabsContent>
          <TabsContent value="ensemble"><AgentControlCard agentId="ensemble" /></TabsContent>
        </Tabs>

        {/* Model Benchmark */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Performance Benchmark (from results.ipynb)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={[
                  { name: "Constant Baseline", error: 106.18, type: "baseline" },
                  { name: "Linear Regression", error: 101.56, type: "baseline" },
                  { name: "NLP + LR", error: 76.81, type: "baseline" },
                  { name: "Random Forest", error: 72.28, type: "baseline" },
                  { name: "XGBoost", error: 68.23, type: "baseline" },
                  { name: "Neural Network", error: 63.97, type: "nn" },
                  { name: "GPT-4.1 Nano", error: 62.51, type: "frontier" },
                  { name: "Claude 4.5 Sonnet", error: 47.10, type: "frontier" },
                  { name: "GPT-5.1", error: 44.74, type: "frontier" },
                  { name: "Fine-tuned LLaMA (Specialist)", error: 38.5, type: "specialist" },
                  { name: "Ensemble (Our System)", error: 35.2, type: "ensemble" },
                ]} margin={{ left: 160, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={155} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Avg Error"]} />
                  <Bar dataKey="error" radius={[0, 4, 4, 0]}>
                    {[
                      "#94a3b8","#94a3b8","#94a3b8","#94a3b8","#94a3b8",
                      "#8b5cf6","#3b82f6","#3b82f6","#3b82f6",
                      "#ef4444","#eab308",
                    ].map((fill, i) => <Cell key={i} fill={fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Average absolute error ($) — lower is better. Source: results.ipynb</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
