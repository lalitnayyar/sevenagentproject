import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentControlCard, PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Bot, Wrench, ArrowRight, Brain, CheckCircle2, Clock, Zap } from "lucide-react";

const TOOL_CALLS = [
  { step: 1, tool: "scan_the_internet_for_bargains", input: "{}",                                     output: "DealSelection(5 deals found)",         status: "done" },
  { step: 2, tool: "estimate_true_value",             input: '{"description": "Samsung 65\" QLED..."}', output: "773.81",                              status: "done" },
  { step: 3, tool: "estimate_true_value",             input: '{"description": "Apple iPhone 14..."}',   output: "930.88",                              status: "done" },
  { step: 4, tool: "estimate_true_value",             input: '{"description": "Poly Studio P21..."}',   output: "189.50",                              status: "done" },
  { step: 5, tool: "notify_user_of_deal",             input: '{"description": "Samsung 65\\" QLED TV", "deal_price": 350, "estimated_true_value": 773.81, "url": "..."}', output: "OK", status: "done" },
];

const memoryData = [
  { run: "Run 1", deals: 2, discount: 120 },
  { run: "Run 2", deals: 3, discount: 185 },
  { run: "Run 3", deals: 2, discount: 95 },
  { run: "Run 4", deals: 5, discount: 310 },
  { run: "Run 5", deals: 4, discount: 250 },
  { run: "Run 6", deals: 3, discount: 175 },
];

export default function Screen4PlannerFramework() {
  const { agents, startAgent, deals } = useAgents();
  const [plannerRunning, setPlannerRunning] = useState(false);
  const [frameworkRunning, setFrameworkRunning] = useState(false);
  const [toolCallStep, setToolCallStep] = useState(0);

  const handleRunPlanner = async () => {
    setPlannerRunning(true);
    setToolCallStep(0);
    startAgent("planner");
    for (let i = 1; i <= TOOL_CALLS.length; i++) {
      await new Promise(r => setTimeout(r, 2200));
      setToolCallStep(i);
    }
    toast.success("AutonomousPlannerAgent completed — deal found and user notified!");
    setPlannerRunning(false);
  };

  const handleRunFramework = async () => {
    setFrameworkRunning(true);
    startAgent("framework");
    await new Promise(r => setTimeout(r, 12000));
    toast.success("DealAgentFramework run complete — memory updated!");
    setFrameworkRunning(false);
  };

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Autonomous Orchestrator"
        title="Autonomous Planner · Deal Agent Framework"
        subtitle="LLM tool-calling autonomous agent + orchestration framework with memory persistence and t-SNE visualization"
      />

      <div className="p-6 space-y-6">
        {/* Tool-Calling Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-5 h-5 text-purple-500" />
              Autonomous Planning — Tool-Calling Loop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
              {["GPT-4o receives task", "→", "scan_the_internet_for_bargains()", "→", "estimate_true_value() × N", "→", "notify_user_of_deal()", "→", "finish_reason: stop"].map((s, i) => (
                s === "→" ? (
                  <ArrowRight key={i} className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <span key={i} className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded-md font-mono">{s}</span>
                )
              ))}
            </div>

            <div className="space-y-2">
              {TOOL_CALLS.map(tc => (
                <div key={tc.step} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  toolCallStep >= tc.step ? "bg-green-50 border-green-200" : "bg-secondary/30 border-border"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    toolCallStep >= tc.step ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {toolCallStep >= tc.step ? <CheckCircle2 className="w-3.5 h-3.5" /> : tc.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono font-bold text-purple-700">{tc.tool}</code>
                      {toolCallStep >= tc.step && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">✓ done</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">Input: {tc.input}</p>
                    {toolCallStep >= tc.step && (
                      <p className="text-[10px] text-green-700 font-mono mt-0.5">→ {tc.output}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-4 gap-2 w-full" onClick={handleRunPlanner} disabled={plannerRunning}>
              <Brain className="w-4 h-4" />
              {plannerRunning ? "Autonomous Planner Running..." : "Run AutonomousPlannerAgent"}
            </Button>
          </CardContent>
        </Card>

        {/* Framework Architecture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-5 h-5 text-orange-500" />
              DealAgentFramework Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {[
                  { label: "init_agents_as_needed()", desc: "Lazy-loads ScannerAgent, EnsembleAgent, MessagingAgent only when first needed", icon: <Zap className="w-4 h-4 text-yellow-500" /> },
                  { label: "read_memory() / write_memory()", desc: "Persists Opportunity objects to memory.json — prevents re-alerting same deals", icon: <Clock className="w-4 h-4 text-blue-500" /> },
                  { label: "planner.plan(memory)", desc: "PlanningAgent runs full scan→estimate→notify pipeline with memory context", icon: <Bot className="w-4 h-4 text-purple-500" /> },
                  { label: "get_plot_data()", desc: "Runs t-SNE(n_components=3) on ChromaDB embeddings for 3D scatter visualization", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                    {item.icon}
                    <div>
                      <code className="text-xs font-mono font-bold text-orange-700">{item.label}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Framework Run History</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={memoryData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="run" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="discount" stroke="#f97316" fill="#fed7aa" name="Total Discount ($)" />
                      <Area type="monotone" dataKey="deals" stroke="#8b5cf6" fill="#ddd6fe" name="Deals Found" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <Button className="mt-4 gap-2 w-full" variant="outline" onClick={handleRunFramework} disabled={frameworkRunning}>
              <Wrench className="w-4 h-4" />
              {frameworkRunning ? "Framework Running Full Pipeline..." : "Run DealAgentFramework"}
            </Button>
          </CardContent>
        </Card>

        {/* Memory View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Memory Store (memory.json)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="code-block text-xs">
              <span className="text-blue-400">{"["}</span>{"\n"}
              {deals.slice(0, 3).map((d, i) => (
                <span key={d.id}>
                  {"  {"}{"\n"}
                  {"    "}<span className="text-green-400">"deal"</span>: {"{"}<span className="text-orange-300">"product_description"</span>: <span className="text-yellow-300">"{d.product.slice(0, 50)}..."</span>, <span className="text-orange-300">"price"</span>: <span className="text-cyan-300">{d.price}</span>, <span className="text-orange-300">"url"</span>: <span className="text-yellow-300">"{d.url}"</span>{"}"},{"\n"}
                  {"    "}<span className="text-green-400">"estimate"</span>: <span className="text-cyan-300">{d.estimate}</span>,{"\n"}
                  {"    "}<span className="text-green-400">"discount"</span>: <span className="text-cyan-300">{d.discount.toFixed(2)}</span>{"\n"}
                  {"  }"}{i < 2 ? "," : ""}{"\n"}
                </span>
              ))}
              <span className="text-blue-400">{"]"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Agent Controls */}
        <Tabs defaultValue="planner">
          <TabsList className="mb-4">
            <TabsTrigger value="planner">🧠 Autonomous Planner</TabsTrigger>
            <TabsTrigger value="framework">⚙️ Deal Framework</TabsTrigger>
          </TabsList>
          <TabsContent value="planner"><AgentControlCard agentId="planner" /></TabsContent>
          <TabsContent value="framework"><AgentControlCard agentId="framework" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
