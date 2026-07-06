import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentControlCard, PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import { Rss, Bell, ExternalLink, DollarSign, TrendingDown, Send } from "lucide-react";

const RSS_FEEDS = [
  { url: "dealnews.com/c142", category: "Electronics", color: "bg-blue-100 text-blue-700" },
  { url: "dealnews.com/c39", category: "Computers", color: "bg-purple-100 text-purple-700" },
  { url: "dealnews.com/c238", category: "Home & Garden", color: "bg-green-100 text-green-700" },
  { url: "dealnews.com/c196", category: "Sports", color: "bg-orange-100 text-orange-700" },
];

export default function Screen3ScannerMessenger() {
  const { agents, deals, startAgent, addDeal } = useAgents();
  const [scanning, setScanning] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    startAgent("scanner");
    await new Promise(r => setTimeout(r, 8000));
    addDeal({
      product: "Sony WH-1000XM5 Wireless Noise Canceling Headphones",
      price: 199,
      estimate: 349.99,
      discount: 150.99,
      url: "https://www.dealnews.com/Sony-WH-1000XM5",
    });
    toast.success("Scanner found new deals!");
    setScanning(false);
  };

  const handleNotify = async (dealId: string) => {
    setNotifying(true);
    setSelectedDeal(dealId);
    startAgent("messenger");
    await new Promise(r => setTimeout(r, 5500));
    toast.success("Push notification sent via Pushover! 🔔");
    setNotifying(false);
    setSelectedDeal(null);
  };

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
            <Button className="mt-4 gap-2 w-full md:w-auto" onClick={handleScan} disabled={scanning}>
              <Rss className="w-4 h-4" />
              {scanning ? "Scanning RSS Feeds..." : "Run Scanner Agent"}
            </Button>
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
                          disabled={notifying && selectedDeal === deal.id}
                          onClick={() => handleNotify(deal.id)}
                        >
                          <Send className="w-3 h-3" />
                          {notifying && selectedDeal === deal.id ? "Sending..." : "Notify"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                { title: "Setup", steps: ["Visit pushover.net", "Create free account", "Get User Key", "Create App Token", "Add to .env: PUSHOVER_USER, PUSHOVER_TOKEN"] },
                { title: "Message Crafting (Claude)", steps: ["MessagingAgent uses claude-sonnet-4-5", "Prompt: 'Summarize this great deal in 2-3 sentences'", "Includes: item, offered price, estimated value", "Output: exciting push notification text", "Truncated to 200 chars + URL"] },
                { title: "Notification Payload", steps: ["POST /1/messages.json", "user: PUSHOVER_USER", "token: PUSHOVER_TOKEN", "message: crafted text + URL", "sound: cashregister 🎰"] },
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
    </div>
  );
}
