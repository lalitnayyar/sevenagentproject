import { useAgents } from "@/contexts/AgentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/AgentCard";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Zap, ZapOff, TrendingDown, Activity, CheckCircle2, BarChart2,
  ArrowRight, DollarSign, Bell, Brain, Clock
} from "lucide-react";

const COLORS = ["#3b82f6", "#8b5cf6", "#eab308", "#22c55e", "#64748b", "#f97316", "#ef4444"];

const agentPerformanceData = [
  { name: "Specialist", accuracy: 91.2, runs: 142, avgMs: 2340 },
  { name: "Frontier",   accuracy: 88.5, runs: 98,  avgMs: 1820 },
  { name: "Ensemble",   accuracy: 94.1, runs: 87,  avgMs: 4200 },
  { name: "Scanner",    accuracy: 99.5, runs: 312, avgMs: 3100 },
  { name: "Messenger",  accuracy: 100,  runs: 45,  avgMs: 890  },
  { name: "Planner",    accuracy: 92.8, runs: 28,  avgMs: 8700 },
  { name: "Framework",  accuracy: 95.2, runs: 62,  avgMs: 12400 },
];

const priceAccuracyData = [
  { product: "MacBook Pro",    specialist: 1850, frontier: 1920, ensemble: 1890, actual: 1899 },
  { product: "Sony WH-1000XM5", specialist: 320, frontier: 349, ensemble: 338, actual: 349 },
  { product: "Samsung 65\" TV", specialist: 720, frontier: 790, ensemble: 773, actual: 750 },
  { product: "Dyson V15",       specialist: 580, frontier: 620, ensemble: 599, actual: 599 },
  { product: "LEGO Technic",    specialist: 340, frontier: 380, ensemble: 369, actual: 379 },
];

const dealDiscountData = [
  { range: "$0-50",   count: 8 },
  { range: "$50-100", count: 14 },
  { range: "$100-200", count: 22 },
  { range: "$200-400", count: 18 },
  { range: "$400+",   count: 6 },
];

const activityTimeline = [
  { time: "00:00", scans: 2, estimates: 8, notifications: 1 },
  { time: "04:00", scans: 3, estimates: 12, notifications: 2 },
  { time: "08:00", scans: 5, estimates: 20, notifications: 3 },
  { time: "12:00", scans: 8, estimates: 32, notifications: 5 },
  { time: "16:00", scans: 6, estimates: 24, notifications: 4 },
  { time: "20:00", scans: 4, estimates: 16, notifications: 2 },
  { time: "Now",   scans: 3, estimates: 11, notifications: 1 },
];

const modelComparisonData = [
  { model: "Ensemble",          error: 35.2,  color: "#eab308" },
  { model: "Fine-tuned LLaMA",  error: 38.5,  color: "#ef4444" },
  { model: "GPT-5.1",           error: 44.74, color: "#3b82f6" },
  { model: "Claude 4.5",        error: 47.10, color: "#8b5cf6" },
  { model: "Neural Network",    error: 63.97, color: "#f97316" },
  { model: "GPT-4.1 Nano",      error: 62.51, color: "#06b6d4" },
  { model: "XGBoost",           error: 68.23, color: "#94a3b8" },
];

const radarData = [
  { subject: "Accuracy",  Specialist: 91, Frontier: 88, Ensemble: 94 },
  { subject: "Speed",     Specialist: 60, Frontier: 75, Ensemble: 45 },
  { subject: "Coverage",  Specialist: 70, Frontier: 95, Ensemble: 90 },
  { subject: "Cost",      Specialist: 50, Frontier: 80, Ensemble: 55 },
  { subject: "Reliability", Specialist: 97, Frontier: 95, Ensemble: 98 },
];

export default function DashboardPage() {
  const { agents, deals, estimations, globalLogs, isAllRunning, startAllAgents, stopAllAgents } = useAgents();

  const totalRuns = agents.reduce((s, a) => s + a.metrics.totalRuns, 0);
  const avgAccuracy = (agents.reduce((s, a) => s + a.metrics.successRate, 0) / agents.length).toFixed(1);
  const totalDeals = deals.length;
  const totalDiscount = deals.reduce((s, d) => s + d.discount, 0).toFixed(0);
  const runningCount = agents.filter(a => a.status === "running" || a.status === "active").length;

  const pieData = agents.map((a, i) => ({ name: a.shortName, value: a.metrics.totalRuns, color: COLORS[i] }));

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="gradient-header px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-2">Mission Control</span>
            <h1 className="text-2xl font-bold">7-Agent Price Intelligence Command Centre</h1>
            <p className="text-blue-100 text-sm mt-1">Real-time overview of all agents, metrics, and deal activity</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={isAllRunning ? stopAllAgents : startAllAgents}
              className={isAllRunning
                ? "bg-red-500 hover:bg-red-600 text-white gap-2"
                : "bg-green-500 hover:bg-green-600 text-white gap-2"
              }
            >
              {isAllRunning ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {isAllRunning ? "Stop All" : "Start All Agents"}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Agent Runs", value: totalRuns.toLocaleString(), icon: <Activity className="w-5 h-5 text-blue-500" />, sub: `${runningCount} active now` },
            { label: "Avg Success Rate", value: `${avgAccuracy}%`, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, sub: "across all agents" },
            { label: "Deals Found", value: totalDeals.toString(), icon: <TrendingDown className="w-5 h-5 text-orange-500" />, sub: "total opportunities" },
            { label: "Total Savings", value: `$${Number(totalDiscount).toLocaleString()}`, icon: <DollarSign className="w-5 h-5 text-emerald-500" />, sub: "cumulative discount" },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">{kpi.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent Status Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Brain className="w-5 h-5 text-blue-500" /> All 7 Agents</span>
              <Badge variant="secondary">{runningCount} running</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {agents.map(agent => (
                <Link key={agent.id} href={`/screen${agent.screen}`}>
                  <div className={`p-3 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all ${agent.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{agent.icon}</span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <p className="font-semibold text-sm text-foreground">{agent.shortName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{agent.description.slice(0, 45)}...</p>
                    <div className="flex gap-3 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Runs</p>
                        <p className="text-sm font-bold text-primary">{agent.metrics.totalRuns}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Success</p>
                        <p className="text-sm font-bold text-green-600">{agent.metrics.successRate.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Avg</p>
                        <p className="text-sm font-bold text-blue-600">{(agent.metrics.avgResponseMs / 1000).toFixed(1)}s</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-600">
                      <span>View Module</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </Link>
              ))}
              {/* Placeholder for 8th slot */}
              <div className="p-3 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">+ Add Agent<br/>(extensible)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Accuracy Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                Price Prediction Accuracy vs Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 224 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceAccuracyData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="product" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v: number) => `$${v}`} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="actual"     fill="#1e293b" name="Actual"     radius={[3,3,0,0]} />
                    <Bar dataKey="ensemble"   fill="#eab308" name="Ensemble"   radius={[3,3,0,0]} />
                    <Bar dataKey="frontier"   fill="#3b82f6" name="Frontier"   radius={[3,3,0,0]} />
                    <Bar dataKey="specialist" fill="#ef4444" name="Specialist" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Agent Run Distribution Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Agent Run Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 224 }} className="flex items-center">
                <ResponsiveContainer width="50%" height={224}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground flex-1">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                24h Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 208 }}>
                <ResponsiveContainer width="100%" height={208}>
                  <AreaChart data={activityTimeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="scans"         stroke="#3b82f6" fill="#bfdbfe" name="Scans" />
                    <Area type="monotone" dataKey="estimates"     stroke="#8b5cf6" fill="#ddd6fe" name="Estimates" />
                    <Area type="monotone" dataKey="notifications" stroke="#22c55e" fill="#bbf7d0" name="Notifications" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Deal Discount Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-500" />
                Deal Discount Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 208 }}>
                <ResponsiveContainer width="100%" height={208}>
                  <BarChart data={dealDiscountData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [v, "Deals"]} />
                    <Bar dataKey="count" name="Deals" radius={[4,4,0,0]}>
                      {dealDiscountData.map((_, i) => (
                        <Cell key={i} fill={`hsl(${210 + i * 15}, 70%, ${55 - i * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Error Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Model Avg Error Comparison (lower = better)</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 208 }}>
                <ResponsiveContainer width="100%" height={208}>
                  <BarChart layout="vertical" data={modelComparisonData} margin={{ left: 110, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={105} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Avg Error"]} />
                    <Bar dataKey="error" radius={[0,4,4,0]}>
                      {modelComparisonData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Capability Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 208 }}>
                <ResponsiveContainer width="100%" height={208}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Specialist" dataKey="Specialist" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    <Radar name="Frontier"   dataKey="Frontier"   stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Radar name="Ensemble"   dataKey="Ensemble"   stroke="#eab308" fill="#eab308" fillOpacity={0.2} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Agent", "Screen", "Status", "Total Runs", "Success Rate", "Avg Response", "Last Run"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => (
                    <tr key={agent.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span>{agent.icon}</span>
                          <span className="font-medium text-sm">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Link href={`/screen${agent.screen}`}>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px]">
                            {agent.screen === 1 ? "GPU Engine" : agent.screen === 2 ? "RAG · Frontier" : agent.screen === 3 ? "Radar · Alerts" : "Orchestrator"}
                          </Badge>
                        </Link>
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={agent.status} /></td>
                      <td className="py-2.5 px-3 font-mono text-sm">{agent.metrics.totalRuns}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${agent.metrics.successRate >= 95 ? "text-green-600" : agent.metrics.successRate >= 85 ? "text-yellow-600" : "text-red-600"}`}>
                          {agent.metrics.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-sm">{(agent.metrics.avgResponseMs / 1000).toFixed(1)}s</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {agent.metrics.lastRunAt ? new Date(agent.metrics.lastRunAt).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Global Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4 text-blue-500" />
              Global Activity Feed
              <Badge variant="secondary">{globalLogs.length} events</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="log-terminal h-48">
              {globalLogs.length === 0 ? (
                <span className="text-slate-500 italic">No activity yet. Start agents to see live logs.</span>
              ) : (
                globalLogs.slice(0, 100).map(log => (
                  <div key={log.id} className="mb-0.5">
                    <span className="text-slate-500">[{log.timestamp}] </span>
                    <span className={`text-xs font-medium mr-1 ${
                      log.level === "success" ? "text-green-400" :
                      log.level === "error" ? "text-red-400" :
                      log.level === "warn" ? "text-yellow-400" :
                      log.level === "agent" ? "text-cyan-400" : "text-slate-300"
                    }`}>{log.message}</span>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
