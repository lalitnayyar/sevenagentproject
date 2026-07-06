import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgents, AgentInfo } from "@/contexts/AgentContext";
import { Play, Square, Trash2, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: AgentInfo["status"] }) {
  const map = {
    idle:    { label: "Idle",    cls: "agent-badge-idle",    icon: <Clock className="w-3 h-3" /> },
    running: { label: "Running", cls: "agent-badge-running", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    active:  { label: "Active",  cls: "agent-badge-active",  icon: <CheckCircle2 className="w-3 h-3" /> },
    error:   { label: "Error",   cls: "agent-badge-error",   icon: <XCircle className="w-3 h-3" /> },
    stopped: { label: "Stopped", cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", s.cls)}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Log Terminal ─────────────────────────────────────────────────────────────
export function LogTerminal({ agentId, height = "h-48" }: { agentId: string; height?: string }) {
  const { agents, clearLogs } = useAgents();
  const agent = agents.find(a => a.id === agentId);
  const logs = agent?.logs ?? [];

  const levelClass: Record<string, string> = {
    info:    "log-info",
    success: "log-success",
    warn:    "log-warn",
    error:   "log-error",
    agent:   "log-agent",
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity Log</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearLogs(agentId)}>
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>
      <ScrollArea className={cn("log-terminal", height)}>
        {logs.length === 0 ? (
          <span className="text-slate-500 italic">No activity yet. Start the agent to see logs.</span>
        ) : (
          logs.map(log => (
            <div key={log.id} className="mb-0.5">
              <span className="text-slate-500">[{log.timestamp}] </span>
              <span className={levelClass[log.level] || "text-slate-300"}>{log.message}</span>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Agent Control Card ───────────────────────────────────────────────────────
export function AgentControlCard({ agentId }: { agentId: string }) {
  const { agents, startAgent, stopAgent } = useAgents();
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;

  const isRunning = agent.status === "running";

  return (
    <Card className={cn("border-2 transition-all", agent.bgColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{agent.icon}</span>
            <div>
              <h3 className="font-bold text-base text-foreground">{agent.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(agent.config).map(([k, v]) => (
            <div key={k} className="bg-background/60 rounded-md px-2.5 py-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</p>
              <p className="text-xs font-medium text-foreground truncate">{v}</p>
            </div>
          ))}
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-background/60 rounded-md py-2">
            <p className="text-lg font-bold text-primary">{agent.metrics.totalRuns}</p>
            <p className="text-[10px] text-muted-foreground">Total Runs</p>
          </div>
          <div className="bg-background/60 rounded-md py-2">
            <p className="text-lg font-bold text-green-600">{agent.metrics.successRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Success Rate</p>
          </div>
          <div className="bg-background/60 rounded-md py-2">
            <p className="text-lg font-bold text-blue-600">{(agent.metrics.avgResponseMs / 1000).toFixed(1)}s</p>
            <p className="text-[10px] text-muted-foreground">Avg Response</p>
          </div>
        </div>

        {/* Log terminal */}
        <LogTerminal agentId={agentId} height="h-40" />

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-2"
            disabled={isRunning}
            onClick={() => startAgent(agentId)}
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Running..." : "Start Agent"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!isRunning}
            onClick={() => stopAgent(agentId)}
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, badge, children
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="gradient-header px-6 py-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          {badge && (
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
              {badge}
            </span>
          )}
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-blue-100 text-sm mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
