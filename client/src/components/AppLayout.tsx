import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAgents } from "@/contexts/AgentContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Cpu, Brain, Radio, Bot, Trophy,
  FlaskConical, Settings, ChevronLeft, ChevronRight,
  Moon, Sun, Zap, ZapOff, Activity, Menu, X
} from "lucide-react";

const navItems = [
  {
    path: "/dashboard",
    label: "Mission Control",
    icon: LayoutDashboard,
    screen: "Overview",
    description: "Live metrics, charts & all-agent command centre",
  },
  {
    path: "/screen1",
    label: "GPU Inference Engine",
    icon: Cpu,
    screen: "Specialist",
    description: "Fine-tuned LLaMA 3.2-3B on Modal.com serverless GPU",
  },
  {
    path: "/screen2",
    label: "Knowledge Retrieval Hub",
    icon: Brain,
    screen: "RAG · Frontier",
    description: "ChromaDB RAG pipeline + Frontier LLM + Ensemble weighting",
  },
  {
    path: "/screen3",
    label: "Deal Radar & Alerts",
    icon: Radio,
    screen: "Scanner · Alerts",
    description: "RSS deal scraping + Claude-powered Pushover notifications",
  },
  {
    path: "/screen4",
    label: "Autonomous Orchestrator",
    icon: Bot,
    screen: "Planner · Framework",
    description: "ReAct planning loop + multi-agent deal orchestration",
  },
  {
    path: "/screen5",
    label: "Grand Finale Arena",
    icon: Trophy,
    screen: "Finale",
    description: "Full pipeline reveal — best deal, best price, all agents united",
  },
  {
    path: "/test-scripts",
    label: "Lab & Diagnostics",
    icon: FlaskConical,
    screen: "Test Lab",
    description: "Run notebook-derived test scripts from Day 1–5",
  },
  {
    path: "/settings",
    label: "Command Vault",
    icon: Settings,
    screen: "Config",
    description: "API keys, credentials & agent parameters",
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { agents, isAllRunning, startAllAgents, stopAllAgents } = useAgents();

  const runningCount = agents.filter(a => a.status === "running" || a.status === "active").length;
  const activeLocation = location === "/" ? "/dashboard" : location;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-xl gradient-header flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-sm">7A</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-bold text-sm leading-tight truncate">7-Agent Dashboard</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">Price Intelligence</p>
          </div>
        )}
      </div>

      {/* Agent status summary */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sidebar-foreground/60 text-xs font-medium uppercase tracking-wider">Agents</span>
            <Badge variant="secondary" className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
              {runningCount}/{agents.length} active
            </Badge>
          </div>
          <div className="flex gap-1 flex-wrap">
            {agents.map(a => (
              <Tooltip key={a.id}>
                <TooltipTrigger>
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    a.status === "running" && "bg-cyan-400 animate-pulse",
                    a.status === "active" && "bg-green-400",
                    a.status === "error" && "bg-red-400",
                    a.status === "stopped" && "bg-orange-400",
                    a.status === "idle" && "bg-slate-500",
                  )} />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs capitalize">{a.status}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeLocation === item.path ||
            (item.path !== "/dashboard" && activeLocation.startsWith(item.path));
          return (
            <Tooltip key={item.path} delayDuration={collapsed ? 100 : 9999}>
              <TooltipTrigger asChild>
                <Link href={item.path} onClick={() => setMobileOpen(false)}>
                  <div className={cn(
                    "nav-item",
                    isActive && "active",
                    collapsed && "justify-center px-2"
                  )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.label}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}>
                            {item.screen}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className={cn(
        "px-3 py-4 border-t border-sidebar-border space-y-2",
        collapsed && "px-2"
      )}>
        {/* Start/Stop All */}
        <Button
          size="sm"
          onClick={isAllRunning ? stopAllAgents : startAllAgents}
          className={cn(
            "w-full gap-2 text-xs font-semibold transition-all",
            isAllRunning
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white",
            collapsed && "px-2"
          )}
        >
          {isAllRunning ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          {!collapsed && (isAllRunning ? "Stop All Agents" : "Start All Agents")}
        </Button>

        {/* Theme + Collapse */}
        <div className={cn("flex gap-2", collapsed && "flex-col")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="flex-1 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span className="ml-2 text-xs">{theme === "dark" ? "Light" : "Dark"}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Footer */}
        {!collapsed && (
          <p className="text-sidebar-foreground/30 text-[10px] text-center pt-1">
            Lalit Nayyar · lalitnayyar@gmail.com
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0">
            {(() => {
              const current = navItems.find(n =>
                activeLocation === n.path ||
                (n.path !== "/dashboard" && activeLocation.startsWith(n.path))
              );
              return current ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">{current.label}</span>
                  <span className="text-muted-foreground text-xs hidden sm:inline">— {current.description}</span>
                </div>
              ) : null;
            })()}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              <span className="hidden sm:inline">{runningCount} agent{runningCount !== 1 ? "s" : ""} active</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
