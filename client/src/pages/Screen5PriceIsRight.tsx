import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LogTerminal } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from "recharts";
import { Trophy, Play, RefreshCw, ExternalLink, Zap } from "lucide-react";

const CATEGORIES = ["Electronics", "Computers", "Appliances", "Automotive", "Musical_Instruments", "Cell_Phones", "Sports", "Home_Garden"];
const CATEGORY_COLORS: Record<string, string> = {
  Electronics: "#3b82f6", Computers: "#8b5cf6", Appliances: "#f97316",
  Automotive: "#ef4444", Musical_Instruments: "#eab308", Cell_Phones: "#06b6d4",
  Sports: "#22c55e", Home_Garden: "#ec4899",
};

function generateScatterData() {
  return CATEGORIES.flatMap(cat =>
    Array.from({ length: 18 }, () => ({
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      category: cat,
      price: Math.round(Math.random() * 900 + 10),
    }))
  );
}

const scatterData = generateScatterData();

const priceHistory = [
  { time: "10:00", specialist: 320, frontier: 340, ensemble: 335, actual: 330 },
  { time: "10:05", specialist: 155, frontier: 162, ensemble: 159, actual: 160 },
  { time: "10:10", specialist: 89, frontier: 94, ensemble: 91, actual: 90 },
  { time: "10:15", specialist: 445, frontier: 460, ensemble: 452, actual: 449 },
  { time: "10:20", specialist: 210, frontier: 225, ensemble: 218, actual: 215 },
  { time: "10:25", specialist: 670, frontier: 695, ensemble: 682, actual: 680 },
];

export default function Screen5PriceIsRight() {
  const { agents, startAgent, stopAgent, deals, estimations, startAllAgents, stopAllAgents, isAllRunning } = useAgents();
  const [isLaunching, setIsLaunching] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setIsRunning(true);
    startAllAgents();
    toast.success("🎉 The Price Is Right — All agents launched!");
    await new Promise(r => setTimeout(r, 3000));
    setIsLaunching(false);
  };

  const handleStop = () => {
    stopAllAgents();
    setIsRunning(false);
    toast.info("All agents stopped.");
  };

  const handleReset = async () => {
    stopAllAgents();
    setIsRunning(false);
    setResetCount(c => c + 1);
    toast.success("Memory reset — ready for fresh run");
  };

  const topDeals = [...deals].sort((a, b) => b.discount - a.discount).slice(0, 5);

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Screen 5"
        title="The Price Is Right — Finale"
        subtitle="Full autonomous deal-hunting pipeline: scan → estimate → notify. All 7 agents working together."
      >
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-400 text-yellow-900 text-sm px-3 py-1">
            🏆 Grand Finale
          </Badge>
        </div>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Launch Controls */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-blue-900">Launch Full Pipeline</h3>
                <p className="text-sm text-blue-700 mt-0.5">
                  Equivalent to running <code className="bg-blue-100 px-1 rounded">uv run price_is_right.py</code> — initializes all agents and starts the deal-hunting loop
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleLaunch}
                  disabled={isLaunching || isRunning}
                >
                  <Play className="w-5 h-5" />
                  {isLaunching ? "Launching..." : "Start All Agents"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleStop}
                  disabled={!isRunning}
                >
                  <Zap className="w-5 h-5" />
                  Stop
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={handleReset}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Memory
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Deals Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top Deals Found (Sorted by Discount)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topDeals.map((deal, i) => (
                <div key={deal.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-slate-300 text-slate-700" :
                    i === 2 ? "bg-orange-300 text-orange-800" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deal.product}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">Listed: <strong>${deal.price}</strong></span>
                      <span className="text-xs text-blue-600">Estimated: <strong>${deal.estimate.toFixed(0)}</strong></span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-green-600">-${deal.discount.toFixed(0)}</p>
                    <a href={deal.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 flex items-center gap-0.5 justify-end">
                      View <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Prediction Accuracy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Price Prediction vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v: number) => `$${v}`} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="actual"    stroke="#1e293b" strokeWidth={2} dot={false} name="Actual" />
                    <Line type="monotone" dataKey="ensemble"  stroke="#eab308" strokeWidth={2} dot={false} name="Ensemble" strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="frontier"  stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Frontier" strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="specialist" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Specialist" strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Vector Store Scatter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ChromaDB Vector Store — t-SNE 2D Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="x" type="number" tick={{ fontSize: 9 }} name="t-SNE 1" />
                    <YAxis dataKey="y" type="number" tick={{ fontSize: 9 }} name="t-SNE 2" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-border rounded-lg p-2 text-xs shadow-lg">
                          <p className="font-semibold">{d.category}</p>
                          <p className="text-muted-foreground">${d.price}</p>
                        </div>
                      );
                    }} />
                    <Scatter data={scatterData} isAnimationActive={false}>
                      {scatterData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.category] || "#94a3b8"} opacity={0.7} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CATEGORIES.map(cat => (
                  <span key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: CATEGORY_COLORS[cat] }} />
                    {cat.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <LogTerminal agentId="framework" height="h-56" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
