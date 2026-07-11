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

// ── Rotating pool of simulated deals — each scan picks a new one ─────────────
const SCAN_DEALS = [
  { product: "Sony WH-1000XM5 Wireless Noise Canceling Headphones",  price: 199,  estimate: 349.99, discount: 150.99 },
  { product: "Apple AirPods Pro 2nd Gen USB-C MagSafe",              price: 159,  estimate: 249.00, discount:  90.00 },
  { product: "Samsung 65\" QLED 4K Smart TV QN65Q80D",               price: 799,  estimate: 1299.99,discount: 500.99 },
  { product: "Dyson V15 Detect Absolute Cordless Vacuum",            price: 449,  estimate: 749.99, discount: 300.99 },
  { product: "LG 27\" 4K UHD IPS Monitor 27UP850N-W",               price: 249,  estimate: 449.99, discount: 200.99 },
  { product: "Bose QuietComfort 45 Bluetooth Headphones",            price: 179,  estimate: 329.00, discount: 150.00 },
  { product: "iPad Air 11\" M2 WiFi 256GB",                          price: 599,  estimate: 749.00, discount: 150.00 },
  { product: "Ninja Foodi 14-in-1 8-qt XL Pressure Cooker",         price:  99,  estimate: 229.99, discount: 130.99 },
];

let scanRunCount = 0; // increments each scan so URL is always unique

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

    // Start scanner agent simulation
    startAgent("scanner");
    await new Promise(r => setTimeout(r, 8000));

    // ── Pick a new deal from the rotating pool — unique URL per scan run ──────
    scanRunCount++;
    const poolIdx = (scanRunCount - 1) % SCAN_DEALS.length;
    const picked = SCAN_DEALS[poolIdx];
    const newDeal = {
      ...picked,
      // Unique URL per scan so dedup never blocks the same session run
      url: `https://www.dealnews.com/deal-${Date.now()}-run${scanRunCount}`,
    };
    addDeal(newDeal);
    setScanning(false);

    // Start messenger agent simulation in parallel
    startAgent("messenger");

    // ── Build snapshot: new deal + all existing deals ─────────────────────────
    const allDeals: Deal[] = [
      { ...newDeal, id: `scan-${Date.now()}`, timestamp: new Date().toISOString() },
      ...deals,
    ];
    const medals = ["🥇 Deal #1", "🥈 Deal #2", "🥉 Deal #3"];
    const top3 = [...allDeals].sort((a, b) => b.discount - a.discount).slice(0, 3);

    toast.success(`🔍 Scanner found ${allDeals.length} deals! Sending top-3 Pushover alerts...`);
    setAutoNotifying(true);
    let sent = 0;

    for (let idx = 0; idx < top3.length; idx++) {
      const deal = top3[idx];
      if (idx > 0) await new Promise(r => setTimeout(r, 1200)); // stagger 1.2 s

      const msg = `${deal.product} — now $${deal.price.toFixed(2)} (save $${deal.discount.toFixed(2)})`;
      const startTs = Date.now();
      try {
        const result = await autoNotify.mutateAsync({
          title: `7-Agent ${medals[idx]}`,
          message: msg.slice(0, 512),
          sound: "cashregister",
          url: deal.url,
          // Server env vars take priority; these are fallback only
          userKey: settings.pushoverUser?.trim() || undefined,
          token:   settings.pushoverToken?.trim() || undefined,
        });

        const latency = Date.now() - startTs;

        if (result.success) {
          sent++;
          setNotifiedCount(sent);
          appendHistory({
            id: `${Date.now()}-${idx}`,
            ts: new Date().toLocaleTimeString(),
            medal: medals[idx],
            product: deal.product,
            discount: deal.discount,
            latency: result.latency ?? latency,
            success: true,
          });
          setHistory(loadHistory());
          toast.success(`${medals[idx]} sent to Pushover! 🔔`, {
            description: `${deal.product.slice(0, 40)}... • ${result.latency ?? latency}ms`,
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
    if (sent > 0) {
      toast.success(`✅ ${sent} of 3 top deals sent to Pushover!`, { duration: 5000 });
    }
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

            {/* ── Workflow info banner ─────────────────────────────────────── */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
              <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>Auto-notification workflow:</strong> Clicking "Run Scanner Agent" simulates the full
                Scanner → Messenger pipeline and automatically sends the <strong>top 3 deals by discount</strong> to
                Pushover via the server-side <code>autoNotify</code> tRPC procedure.
                Credentials are read from server env vars (<code>PUSHOVER_USER</code> / <code>PUSHOVER_TOKEN</code>) — no
                Command Vault setup required.
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button className="gap-2" onClick={handleScan} disabled={scanning || autoNotifying}>
                <Rss className="w-4 h-4" />
                {scanning ? "Scanning RSS Feeds..." : autoNotifying ? "Sending Pushover alerts..." : "Run Scanner Agent"}
              </Button>
              {autoNotifying && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending top-3 deal alerts to Pushover...</span>
                </div>
              )}
              {!autoNotifying && notifiedCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{notifiedCount} of 3 top deals notified via Pushover ✅</span>
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
                      <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal, i) => (
                      <tr key={deal.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="text-base">🥇</span>}
                            {i === 1 && <span className="text-base">🥈</span>}
                            {i === 2 && <span className="text-base">🥉</span>}
                            <div>
                              <p className="font-medium text-xs leading-tight">{deal.product}</p>
                              <a href={deal.url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5">
                                <ExternalLink className="w-2.5 h-2.5" /> View deal
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs">${deal.price.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground">${deal.estimate.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs font-mono">
                            -${deal.discount.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2"
                            onClick={() => openNotifyDialog(deal)}>
                            <Bell className="w-3 h-3" /> Notify
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

        {/* Notification History Panel */}
        <Card>
          <CardHeader className="cursor-pointer select-none" onClick={() => setHistoryOpen(o => !o)}>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-500" />
                Notification History
                <Badge variant="secondary">{history.length}</Badge>
              </span>
              {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          {historyOpen && (
            <CardContent>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No notifications sent yet. Run the Scanner Agent to start.
                </p>
              ) : (
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
                        <tr key={h.id} className="border-b border-border/40 hover:bg-secondary/20">
                          <td className="py-1.5 px-2 font-mono text-muted-foreground">{h.ts}</td>
                          <td className="py-1.5 px-2">{h.medal}</td>
                          <td className="py-1.5 px-2 max-w-[180px] truncate">{h.product}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-green-700">-${h.discount.toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">
                            {h.latency > 0 ? `${h.latency}ms` : "—"}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {h.skipped ? (
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-[10px]">Skipped</Badge>
                            ) : h.success ? (
                              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-[10px]">Sent ✓</Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-[10px]">Failed</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Agent Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgentControlCard agentId="scanner" />
          <AgentControlCard agentId="messenger" />
        </div>

        {/* Messenger Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              MessengerAgent Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pushover">
              <TabsList>
                <TabsTrigger value="pushover">Pushover</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>
              <TabsContent value="pushover" className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className={`w-4 h-4 ${hasCredentials ? "text-green-500" : "text-amber-500"}`} />
                  <span className={hasCredentials ? "text-green-700" : "text-amber-700"}>
                    {hasCredentials
                      ? "Command Vault credentials loaded — will be used as fallback"
                      : "No Command Vault credentials — server env vars (PUSHOVER_USER/TOKEN) will be used automatically"}
                  </span>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                  <p>• Pushover API endpoint: <code>https://api.pushover.net/1/messages.json</code></p>
                  <p>• Credentials priority: <strong>Server env vars</strong> → Command Vault (localStorage)</p>
                  <p>• Auto-notify fires top-3 deals by discount on every "Run Scanner Agent" click</p>
                  <p>• Manual "Notify" button on each deal row requires Command Vault credentials</p>
                </div>
              </TabsContent>
              <TabsContent value="claude" className="mt-4">
                <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                  <p>• Model: <code>claude-sonnet-4-5</code> via litellm</p>
                  <p>• Prompt: "Please summarize this great deal in 2-3 sentences to be sent as an exciting push notification..."</p>
                  <p>• Output truncated to 200 chars + deal URL</p>
                  <p>• Sound: <code>cashregister</code> (configurable)</p>
                </div>
              </TabsContent>
              <TabsContent value="config" className="mt-4">
                <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1 font-mono text-muted-foreground">
                  <p>PUSHOVER_URL = https://api.pushover.net/1/messages.json</p>
                  <p>SOUND       = cashregister</p>
                  <p>PRIORITY    = 0 (normal)</p>
                  <p>MAX_MSG_LEN = 512 chars</p>
                  <p>STAGGER_MS  = 1200 (between notifications)</p>
                  <p>TOP_N       = 3 (deals per scan)</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ── Manual Notify Dialog ─────────────────────────────────────────────── */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Send Pushover Notification
            </DialogTitle>
            <DialogDescription>
              {notifyDeal?.product}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Credentials status */}
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              hasCredentials
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {hasCredentials
                ? `Credentials loaded from Command Vault (${settings.pushoverUser?.slice(0, 8)}...)`
                : "No credentials in Command Vault. Go to Command Vault → Pushover tab to add them."}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={3}
                className="text-xs resize-none"
                maxLength={512}
              />
              <p className="text-[10px] text-muted-foreground text-right">{customMessage.length}/512</p>
            </div>

            {/* Sound */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notification Sound</Label>
              <Select value={sound} onValueChange={setSound}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUNDS.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Result */}
            {notifyResult && (
              <div className={`rounded-lg px-3 py-2.5 text-xs ${
                notifyResult.success
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <div className="flex items-center gap-1.5 font-medium mb-1">
                  {notifyResult.success
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Delivered successfully</>
                    : <><XCircle className="w-3.5 h-3.5" /> Failed</>}
                </div>
                <p className="opacity-80">{notifyResult.message}</p>
                {notifyResult.latency > 0 && (
                  <p className="opacity-60 mt-0.5">Latency: {notifyResult.latency}ms</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSendNotification}
              disabled={sendNotification.isPending || !hasCredentials}
            >
              {sendNotification.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                : <><Send className="w-3.5 h-3.5" /> Send Notification</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
