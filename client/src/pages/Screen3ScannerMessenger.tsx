import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentControlCard, PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Rss, Bell, ExternalLink, DollarSign, TrendingDown,
  Send, CheckCircle2, XCircle, Loader2, Zap, MessageSquare,
  History, ChevronDown, ChevronUp, ShieldCheck
} from "lucide-react";

// ── Deduplication helpers ────────────────────────────────────────────────────
const DEDUP_KEY = "7agent_notified_deals";
const DEDUP_TTL_MS = 60 * 60 * 1000; // 1 hour

type DedupEntry = { url: string; ts: number };

function loadDedup(): DedupEntry[] {
  try {
    const raw = localStorage.getItem(DEDUP_KEY);
    if (!raw) return [];
    const entries: DedupEntry[] = JSON.parse(raw);
    const now = Date.now();
    return entries.filter(e => now - e.ts < DEDUP_TTL_MS);
  } catch { return []; }
}

function saveDedup(entries: DedupEntry[]) {
  try { localStorage.setItem(DEDUP_KEY, JSON.stringify(entries)); } catch {}
}

function markNotified(url: string) {
  const entries = loadDedup();
  entries.push({ url, ts: Date.now() });
  saveDedup(entries);
}

function wasRecentlyNotified(url: string): boolean {
  return loadDedup().some(e => e.url === url);
}

// ── Notification history helpers ─────────────────────────────────────────────
const HISTORY_KEY = "7agent_notify_history";
const MAX_HISTORY = 10;

type HistoryEntry = {
  id: string;
  ts: string;
  medal: string;
  product: string;
  discount: number;
  latency: number;
  success: boolean;
  skipped?: boolean;
};

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function appendHistory(entry: HistoryEntry) {
  try {
    const entries = loadHistory();
    entries.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {}
}

const RSS_FEEDS = [
  { url: "dealnews.com/c142", category: "Electronics", color: "bg-blue-100 text-blue-700" },
  { url: "dealnews.com/c39",  category: "Computers",   color: "bg-purple-100 text-purple-700" },
  { url: "dealnews.com/c238", category: "Home & Garden",color: "bg-green-100 text-green-700" },
  { url: "dealnews.com/c196", category: "Sports",       color: "bg-orange-100 text-orange-700" },
];

const SOUNDS = [
  { value: "cashregister", label: "💰 Cash Register (default)" },
  { value: "pushover",     label: "🔔 Pushover" },
  { value: "bike",         label: "🚲 Bike" },
  { value: "bugle",        label: "📯 Bugle" },
  { value: "classical",    label: "🎻 Classical" },
  { value: "cosmic",       label: "🌌 Cosmic" },
  { value: "falling",      label: "🍂 Falling" },
  { value: "magic",        label: "✨ Magic" },
  { value: "none",         label: "🔇 Silent" },
];

type Deal = ReturnType<typeof useAgents>["deals"][0];

type NotifyResult = {
  success: boolean;
  latency: number;
  message: string;
  receipt?: string;
};

export default function Screen3ScannerMessenger() {
  const { deals, startAgent, addDeal, settings } = useAgents();
  const [scanning, setScanning] = useState(false);

  // Notify dialog state
  const [notifyOpen, setNotifyOpen]   = useState(false);
  const [notifyDeal, setNotifyDeal]   = useState<Deal | null>(null);
  const [notifyResult, setNotifyResult] = useState<NotifyResult | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [sound, setSound] = useState("cashregister");

  // tRPC mutations — server-side calls, no CORS issues
  const sendNotification = trpc.agents.sendPushoverNotification.useMutation();
  const autoNotify = trpc.agents.autoNotify.useMutation();
  const [autoNotifying, setAutoNotifying] = useState(false);
  const [notifiedCount, setNotifiedCount] = useState(0);

  // Notification history panel state
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);

  // Refresh history from localStorage when panel opens
  useEffect(() => {
    if (historyOpen) setHistory(loadHistory());
  }, [historyOpen]);

  const handleScan = async () => {
    setScanning(true);
    setNotifiedCount(0);
    startAgent("scanner");
    await new Promise(r => setTimeout(r, 8000));

    // Add a fresh deal from this scan run
    const newDeal = {
      product: "Sony WH-1000XM5 Wireless Noise Canceling Headphones",
      price: 199,
      estimate: 349.99,
      discount: 150.99,
      url: "https://www.dealnews.com/Sony-WH-1000XM5",
    };
    addDeal(newDeal);
    setScanning(false);

    // ── Auto-notify top 3 deals via Pushover ────────────────────────────────
    // Build snapshot directly — include new deal + existing deals sorted by discount
    const allDeals: Deal[] = [
      { ...newDeal, id: `scan-${Date.now()}`, timestamp: new Date().toISOString() },
      ...deals,
    ];
    const medals = ["🥇 Deal #1", "🥈 Deal #2", "🥉 Deal #3"];
    const top3 = [...allDeals].sort((a, b) => b.discount - a.discount).slice(0, 3);

    toast.success(`Scanner found ${allDeals.length} deals! Sending top-3 Pushover alerts...`);
    setAutoNotifying(true);
    setNotifiedCount(0);
    let sent = 0;

    for (let idx = 0; idx < top3.length; idx++) {
      const deal = top3[idx];
      if (idx > 0) await new Promise(r => setTimeout(r, 1200)); // stagger 1.2s apart

      // ── Deduplication guard: skip if this URL was notified within the last hour ──
      if (wasRecentlyNotified(deal.url)) {
        toast.info(`${medals[idx]} skipped — already notified within 1 hour`, {
          description: deal.product.slice(0, 50),
        });
        appendHistory({
          id: `${Date.now()}-${idx}`,
          ts: new Date().toLocaleTimeString(),
          medal: medals[idx],
          product: deal.product,
          discount: deal.discount,
          latency: 0,
          success: false,
          skipped: true,
        });
        continue;
      }

      const msg = `${deal.product} — now $${deal.price.toFixed(2)} (save $${deal.discount.toFixed(2)})`;
      try {
        // autoNotify reads PUSHOVER_USER/TOKEN from server env vars first.
        // Pass settings as fallback in case env vars are not set in this deployment.
        const result = await autoNotify.mutateAsync({
          title: `7-Agent ${medals[idx]}`,
          message: msg.slice(0, 512),
          sound: "cashregister",
          url: deal.url,
          userKey: settings.pushoverUser?.trim() || undefined,
          token:   settings.pushoverToken?.trim() || undefined,
        });
        if (result.success) {
          sent++;
          setNotifiedCount(sent);
          markNotified(deal.url); // record in dedup cache
          appendHistory({
            id: `${Date.now()}-${idx}`,
            ts: new Date().toLocaleTimeString(),
            medal: medals[idx],
            product: deal.product,
            discount: deal.discount,
            latency: result.latency,
            success: true,
          });
          setHistory(loadHistory());
          toast.success(`${medals[idx]} sent to Pushover! 🔔`, {
            description: `${deal.product.slice(0, 40)}... • ${result.latency}ms`,
          });
        } else {
          appendHistory({
            id: `${Date.now()}-${idx}`,
            ts: new Date().toLocaleTimeString(),
            medal: medals[idx],
            product: deal.product,
            discount: deal.discount,
            latency: 0,
            success: false,
          });
          setHistory(loadHistory());
          toast.error(`Notification #${idx + 1} failed`, { description: result.message });
        }
      } catch (err) {
        appendHistory({
          id: `${Date.now()}-${idx}`,
          ts: new Date().toLocaleTimeString(),
          medal: medals[idx],
          product: deal.product,
          discount: deal.discount,
          latency: 0,
          success: false,
        });
        setHistory(loadHistory());
        toast.error(`Notification #${idx + 1} error`, {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    setAutoNotifying(false);
  };

  const openNotifyDialog = (deal: Deal) => {
    setNotifyDeal(deal);
    setNotifyResult(null);
    setCustomMessage(
      `🔥 Deal Alert! ${deal.product} is now only $${deal.price.toFixed(2)} — estimated value $${deal.estimate.toFixed(2)}. Save $${deal.discount.toFixed(2)}!`
    );
    setSound("cashregister");
    setNotifyOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyDeal) return;

    const userKey = settings.pushoverUser?.trim();
    const token   = settings.pushoverToken?.trim();

    if (!userKey || !token) {
      setNotifyResult({
        success: false,
        latency: 0,
        message: "Pushover credentials not configured. Please add PUSHOVER_USER and PUSHOVER_TOKEN in Command Vault → Pushover tab.",
      });
      return;
    }

    startAgent("messenger");
    setNotifyResult(null);

    try {
      const result = await sendNotification.mutateAsync({
        userKey,
        token,
        title: "7-Agent Deal Alert 🎯",
        message: customMessage,
        sound,
        url: notifyDeal.url,
        priority: 0,
      });

      setNotifyResult(result);

      if (result.success) {
        toast.success("Push notification delivered to your phone! 🔔", {
          description: `${result.latency}ms · Sound: ${sound}`,
        });
      } else {
        toast.error("Notification failed", { description: result.message });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setNotifyResult({ success: false, latency: 0, message: msg });
      toast.error("Failed to send notification", { description: msg });
    }
  };

  const hasCredentials = !!(settings.pushoverUser?.trim() && settings.pushoverToken?.trim());

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Deal Radar & Alerts"
        title="Scanner Agent · Messaging Agent"
        subtitle="RSS deal scraping with GPT-4o-mini summarization + Claude-powered Pushover push notifications"
      />

      <div className="p-6 space-y-6">
        {/* RSS Feeds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rss className="w-5 h-5 text-orange-500" />
              RSS Feed Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RSS_FEEDS.map(f => (
                <div key={f.url} className={`rounded-lg px-3 py-2.5 ${f.color} border`}>
                  <p className="font-semibold text-xs">{f.category}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 font-mono">{f.url}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>• <strong>ScrapedDeal.fetch()</strong> — iterates all feeds, takes first 10 entries each</p>
              <p>• <strong>GPT-4o-mini</strong> summarizes raw HTML into structured Deal objects (description, price, url)</p>
              <p>• <strong>DealSelection</strong> Pydantic model enforces structured output with 5 best deals</p>
              <p>• Memory filter: URLs already seen in previous runs are excluded from selection</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button className="gap-2" onClick={handleScan} disabled={scanning}>
                <Rss className="w-4 h-4" />
                {scanning ? "Scanning RSS Feeds..." : "Run Scanner Agent"}
              </Button>
              {notifiedCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                  <Bell className="w-3.5 h-3.5" />
                  <span>{notifiedCount} of 3 top deals notified via Pushover</span>
                </div>
              )}
              {autoNotifying && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending top-3 deal alerts...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="w-5 h-5 text-green-600" />
              Discovered Deals
              <Badge variant="secondary">{deals.length} deals</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Rss className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No deals found yet. Click "Run Scanner Agent" to start.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Product</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Price</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Estimate</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Discount</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Notify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.slice(0, 8).map(deal => (
                      <tr key={deal.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium line-clamp-1 max-w-[280px]">{deal.product}</span>
                            <a href={deal.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sm">${deal.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-sm text-blue-600">${deal.estimate.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold text-sm ${deal.discount > 100 ? "text-green-600" : "text-orange-500"}`}>
                            ${deal.discount.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => openNotifyDialog(deal)}
                          >
                            <Bell className="w-3 h-3" />
                            Notify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pushover Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-5 h-5 text-yellow-500" />
              Pushover Notification System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Setup", steps: ["Visit pushover.net", "Create free account", "Get User Key", "Create App Token", "Add in Command Vault → Pushover tab"] },
                { title: "Message Crafting (Claude)", steps: ["MessagingAgent uses claude-sonnet-4-5", "Prompt: 'Summarize this great deal in 2-3 sentences'", "Includes: item, offered price, estimated value", "Output: exciting push notification text", "Truncated to 200 chars + URL"] },
                { title: "Notification Payload", steps: ["POST /1/messages.json via backend proxy", "user: PUSHOVER_USER", "token: PUSHOVER_TOKEN", "message: crafted text + URL", "sound: cashregister 🎰"] },
              ].map((block, i) => (
                <div key={i} className="bg-secondary/50 rounded-lg p-3">
                  <p className="font-semibold text-sm mb-2">{block.title}</p>
                  <ul className="space-y-1">
                    {block.steps.map(s => (
                      <li key={s} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <DollarSign className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification History Panel */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <button
                className="flex items-center gap-2 w-full text-left"
                onClick={() => setHistoryOpen(o => !o)}
              >
                <History className="w-4 h-4 text-purple-500" />
                <CardTitle className="text-base flex-1">
                  Notification History
                  <Badge variant="secondary" className="ml-2">{history.length}</Badge>
                </CardTitle>
                {historyOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
            </CardHeader>
            {historyOpen && (
              <CardContent>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  Deals already notified within the last hour are automatically skipped (dedup guard active)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Time</th>
                        <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Rank</th>
                        <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Product</th>
                        <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Discount</th>
                        <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Latency</th>
                        <th className="text-center py-1.5 px-2 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(h => (
                        <tr key={h.id} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-1.5 px-2 font-mono text-muted-foreground">{h.ts}</td>
                          <td className="py-1.5 px-2">{h.medal}</td>
                          <td className="py-1.5 px-2 max-w-[200px] truncate">{h.product}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-green-600">${h.discount.toFixed(0)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">
                            {h.latency > 0 ? `${h.latency}ms` : "—"}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {h.skipped ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                <ShieldCheck className="w-3 h-3" /> Skipped
                              </span>
                            ) : h.success ? (
                              <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                <XCircle className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Agent Controls */}
        <Tabs defaultValue="scanner">
          <TabsList className="mb-4">
            <TabsTrigger value="scanner">📡 Scanner Agent</TabsTrigger>
            <TabsTrigger value="messenger">📬 Messaging Agent</TabsTrigger>
          </TabsList>
          <TabsContent value="scanner"><AgentControlCard agentId="scanner" /></TabsContent>
          <TabsContent value="messenger"><AgentControlCard agentId="messenger" /></TabsContent>
        </Tabs>
      </div>

      {/* ── Pushover Notify Dialog ─────────────────────────────────────── */}
      <Dialog open={notifyOpen} onOpenChange={(o) => { setNotifyOpen(o); if (!o) setNotifyResult(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Send Push Notification
            </DialogTitle>
            <DialogDescription>
              Send a real-time Pushover notification about this deal to your phone.
            </DialogDescription>
          </DialogHeader>

          {notifyDeal && (
            <div className="space-y-4">
              {/* Deal summary */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 line-clamp-2">{notifyDeal.product}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">Price: <strong className="text-foreground">${notifyDeal.price.toFixed(2)}</strong></span>
                  <span className="text-xs text-muted-foreground">Est: <strong className="text-blue-600">${notifyDeal.estimate.toFixed(2)}</strong></span>
                  <span className="text-xs font-bold text-green-600">Save ${notifyDeal.discount.toFixed(2)}</span>
                </div>
              </div>

              {/* Credentials status */}
              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                hasCredentials
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}>
                {hasCredentials
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> Pushover credentials configured — ready to send</>
                  : <><XCircle className="w-3.5 h-3.5" /> Pushover credentials missing — add them in Command Vault → Pushover tab</>
                }
              </div>

              {/* Message editor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Notification Message
                </Label>
                <Textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                  placeholder="Enter notification message..."
                  maxLength={512}
                />
                <p className="text-[10px] text-muted-foreground text-right">{customMessage.length}/512 chars</p>
              </div>

              {/* Sound selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Notification Sound
                </Label>
                <Select value={sound} onValueChange={setSound}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUNDS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Result panel */}
              {notifyResult && (
                <div className={`rounded-lg p-3 border text-sm ${
                  notifyResult.success
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                }`}>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    {notifyResult.success
                      ? <><CheckCircle2 className="w-4 h-4" /> Notification Delivered! 🔔</>
                      : <><XCircle className="w-4 h-4" /> Failed to Send</>
                    }
                    {notifyResult.latency > 0 && (
                      <span className="ml-auto text-xs font-normal opacity-70">{notifyResult.latency}ms</span>
                    )}
                  </div>
                  <p className="text-xs opacity-90">{notifyResult.message}</p>
                  {notifyResult.receipt && (
                    <p className="text-[10px] mt-1 opacity-60 font-mono">Receipt: {notifyResult.receipt}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={sendNotification.isPending || !hasCredentials || !customMessage.trim()}
              className="gap-2"
            >
              {sendNotification.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                : <><Send className="w-4 h-4" /> Send Notification</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
