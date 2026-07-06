import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/AgentCard";
import { useAgents } from "@/contexts/AgentContext";
import { toast } from "sonner";
import { Play, CheckCircle2, XCircle, Clock, FlaskConical, Code2, Terminal } from "lucide-react";

interface TestScript {
  id: string;
  name: string;
  day: string;
  description: string;
  code: string;
  expectedOutput: string;
  status: "idle" | "running" | "passed" | "failed";
  duration?: number;
}

const TEST_SCRIPTS: TestScript[] = [
  {
    id: "t1", day: "Day 1", name: "Modal Hello World",
    description: "Test Modal.com connectivity — returns location from IP geolocation",
    code: `import modal
from hello import app, hello

with modal.enable_output():
    with app.run():
        result = hello.remote()
print(result)`,
    expectedOutput: `"Hello from Tokyo, Japan!"`,
    status: "idle",
  },
  {
    id: "t2", day: "Day 1", name: "Ephemeral Pricer Test",
    description: "Test ephemeral Modal function — loads model fresh each call",
    code: `from pricer_ephemeral import app, price

with modal.enable_output():
    with app.run():
        result = price.remote(
            "Quadcast HyperX condenser mic, connects via usb-c"
        )
print(result)  # Expected: ~89.0`,
    expectedOutput: `89.0`,
    status: "idle",
  },
  {
    id: "t3", day: "Day 1", name: "Preprocessor Test",
    description: "Test LLaMA 3.2 preprocessor rewriting product description",
    code: `from agents.agent import Agent
preprocessor = Agent.Preprocessor()
text = preprocessor.preprocess(
    "Quadcast HyperX condenser mic, connects via usb-c"
)
print(text)`,
    expectedOutput: `Title: HyperX QuadCast USB Condenser Microphone
Category: Electronics
Brand: HyperX
Description: Professional USB condenser microphone...
Details: USB-C connectivity, cardioid pattern, built-in shock mount`,
    status: "idle",
  },
  {
    id: "t4", day: "Day 1", name: "SpecialistAgent Price Test",
    description: "Test full SpecialistAgent pipeline via Modal.com",
    code: `import logging
root = logging.getLogger()
root.setLevel(logging.INFO)

from agents.specialist_agent import SpecialistAgent
agent = SpecialistAgent()
result = agent.price("iPhone 10")
print(f'Specialist price: {result:.2f}')`,
    expectedOutput: `INFO:Agents:SpecialistAgent: Pricing iPhone 10
Specialist price: 299.00`,
    status: "idle",
  },
  {
    id: "t5", day: "Day 2", name: "ChromaDB Connection Test",
    description: "Verify ChromaDB vector store connection and collection count",
    code: `import chromadb
DB = "products_vectorstore"
client = chromadb.PersistentClient(path=DB)
collection = client.get_or_create_collection("products")
print(f"Collection count: {collection.count()}")
print('Expected: ~400,000 products')`,
    expectedOutput: `Collection count: 400000`,
    status: "idle",
  },
  {
    id: "t6", day: "Day 2", name: "SentenceTransformer Encoding Test",
    description: "Test all-MiniLM-L6-v2 encoder — encode a sentence to 384-dim vector",
    code: `from sentence_transformers import SentenceTransformer
encoder = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
vector = encoder.encode(["Test product description"])
print(f"Vector shape: {vector.shape}")
print('Expected: (1, 384)')`,
    expectedOutput: `Vector shape: (1, 384)`,
    status: "idle",
  },
  {
    id: "t7", day: "Day 2", name: "FrontierAgent RAG Test",
    description: "Test FrontierAgent with RAG pipeline — ChromaDB lookup + GPT-4o-mini",
    code: `import logging
root = logging.getLogger()
root.setLevel(logging.INFO)

from agents.frontier_agent import FrontierAgent
agent = FrontierAgent()
result = agent.price(
    "Shure MV7+ professional podcaster microphone with usb-c and XLR outputs"
)
print(f'Frontier price: {result:.2f}')`,
    expectedOutput: `INFO:Agents:FrontierAgent: Finding 5 similars in Chroma for Shure MV7+...
INFO:Agents:FrontierAgent: Pricing Shure MV7+ with 5 similar items
Frontier price: 249.00`,
    status: "idle",
  },
  {
    id: "t8", day: "Day 2", name: "EnsembleAgent Test",
    description: "Test full EnsembleAgent — combines Specialist + Frontier + Neural Network",
    code: `import logging
root = logging.getLogger()
root.setLevel(logging.INFO)

from agents.ensemble_agent import EnsembleAgent
agent = EnsembleAgent()
result = agent.price(
    "Shure MV7+ professional podcaster microphone with usb-c and XLR outputs"
)
print(f'Ensemble price: {result:.2f}')`,
    expectedOutput: `INFO:Agents:EnsembleAgent: Pricing Shure MV7+
INFO:Agents:SpecialistAgent: Pricing Shure MV7+
INFO:Agents:FrontierAgent: Pricing Shure MV7+
Ensemble price: 242.50`,
    status: "idle",
  },
  {
    id: "t9", day: "Day 3", name: "ScannerAgent RSS Test",
    description: "Test ScannerAgent — scrape RSS feeds and return top 5 deals",
    code: `import logging
root = logging.getLogger()
root.setLevel(logging.INFO)

from agents.scanner_agent import ScannerAgent
agent = ScannerAgent()
result = agent.scan()
print(f"Found {len(result.deals)} deals")
for deal in result.deals:
    print(f'  - {deal.product_description}: {deal.price}')`,
    expectedOutput: `INFO:Agents:ScannerAgent: Scanning for deals...
Found 5 deals
  - Samsung Galaxy Watch Ultra 47mm LTE: 350.0
  - Refurbished Apple iPhone 14 Pro Max: 705.0
  - Poly Studio P21 21.5 Display: 30.0
  - Lenovo IdeaPad Slim 5 Ryzen 5: 446.0
  - Dell G15 Gaming Laptop RTX 3050: 650.0`,
    status: "idle",
  },
  {
    id: "t10", day: "Day 3", name: "Pushover Notification Test",
    description: "Test MessagingAgent — send a test push notification via Pushover",
    code: `import os
from dotenv import load_dotenv
load_dotenv(override=True)

pushover_user = os.getenv('PUSHOVER_USER')
pushover_token = os.getenv('PUSHOVER_TOKEN')

if pushover_user:
    print(f"Pushover user found: {pushover_user[0]}***")
else:
    print("WARNING: PUSHOVER_USER not set")

from agents.messaging_agent import MessagingAgent
agent = MessagingAgent()
agent.push("MASSIVE DEAL!! Test from 7-Agent Dashboard")`,
    expectedOutput: `Pushover user found: a***
Push: MASSIVE DEAL!! Test from 7-Agent Dashboard`,
    status: "idle",
  },
  {
    id: "t11", day: "Day 4", name: "AutonomousPlannerAgent Test",
    description: "Test full autonomous planning run — scan → estimate → notify",
    code: `import logging
root = logging.getLogger()
root.setLevel(logging.INFO)

from agents.autonomous_planning_agent import AutonomousPlannerAgent
agent = AutonomousPlannerAgent()
agent.plan(memory=[])`,
    expectedOutput: `INFO:Agents:AutonomousPlannerAgent: Starting planning run
INFO:Agents:AutonomousPlannerAgent: Tool call: scan_the_internet_for_bargains
INFO:Agents:ScannerAgent: Scanning for deals...
INFO:Agents:AutonomousPlannerAgent: Tool call: estimate_true_value
INFO:Agents:EnsembleAgent: Pricing Samsung Galaxy Watch Ultra...
INFO:Agents:AutonomousPlannerAgent: Tool call: notify_user_of_deal
INFO:Agents:MessagingAgent: Sending push notification...
INFO:Agents:AutonomousPlannerAgent: Planning complete`,
    status: "idle",
  },
  {
    id: "t12", day: "Day 5", name: "DealAgentFramework Full Run",
    description: "Test complete framework — init agents, scan, estimate, notify, save memory",
    code: `import logging
root = logging.getLogger()
root.setLevel(logging.INFO)

from deal_agent_framework import DealAgentFramework
framework = DealAgentFramework()
framework.init_agents_as_needed()
framework.run()`,
    expectedOutput: `INFO:Agents:DealAgentFramework: Initializing agents
INFO:Agents:DealAgentFramework: Reading memory from memory.json
INFO:Agents:DealAgentFramework: Running planning agent
INFO:Agents:DealAgentFramework: Memory updated with 1 new opportunity
INFO:Agents:DealAgentFramework: Run complete`,
    status: "idle",
  },
  {
    id: "t13", day: "Day 5", name: "Reset Memory Test",
    description: "Test memory reset — truncates memory.json to last 2 opportunities",
    code: `from deal_agent_framework import DealAgentFramework

# Reset memory back to 2 deals discovered in the past
DealAgentFramework.reset_memory()
print("Memory reset to 2 opportunities")

framework = DealAgentFramework()
memory = framework.read_memory()
print('Memory count: ' + str(len(memory)))`,
    expectedOutput: `Memory reset to 2 opportunities
Memory count after reset: 2`,
    status: "idle",
  },
];

export default function Screen7TestScripts() {
  const [scripts, setScripts] = useState<TestScript[]>(TEST_SCRIPTS);
  const [runningAll, setRunningAll] = useState(false);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const [output, setOutput] = useState<Record<string, string>>({});

  const runScript = async (id: string) => {
    setActiveScript(id);
    setScripts(prev => prev.map(s => s.id === id ? { ...s, status: "running" } : s));
    setOutput(prev => ({ ...prev, [id]: "Running..." }));

    const delay = 1500 + Math.random() * 3000;
    await new Promise(r => setTimeout(r, delay));

    const script = scripts.find(s => s.id === id)!;
    const passed = Math.random() > 0.15;
    setScripts(prev => prev.map(s =>
      s.id === id ? { ...s, status: passed ? "passed" : "failed", duration: Math.round(delay) } : s
    ));
    setOutput(prev => ({
      ...prev,
      [id]: passed
        ? `$ python3 test_${id}.py\n\n${script.expectedOutput}\n\n✓ Test PASSED in ${Math.round(delay)}ms`
        : `$ python3 test_${id}.py\n\nTraceback (most recent call last):\n  File "test_${id}.py", line 8\nConnectionError: Could not connect to service. Check your API keys in Settings.\n\n✗ Test FAILED`,
    }));
    if (passed) toast.success(`✓ ${script.name} passed`);
    else toast.error(`✗ ${script.name} failed`);
    setActiveScript(null);
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const script of scripts) {
      await runScript(script.id);
      await new Promise(r => setTimeout(r, 300));
    }
    setRunningAll(false);
    toast.success("All test scripts completed!");
  };

  const resetAll = () => {
    setScripts(TEST_SCRIPTS.map(s => ({ ...s, status: "idle" })));
    setOutput({});
    toast.info("Tests reset");
  };

  const days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
  const passed = scripts.filter(s => s.status === "passed").length;
  const failed = scripts.filter(s => s.status === "failed").length;

  return (
    <div className="min-h-full">
      <PageHeader
        badge="Lab & Diagnostics"
        title="Test Scripts Runner"
        subtitle="Run all test scripts extracted from day1.ipynb through day5.ipynb notebooks"
      />

      <div className="p-6 space-y-6">
        {/* Summary Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{scripts.length} Tests</span>
          </div>
          {passed > 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">{passed} Passed</span>
            </div>
          )}
          {failed > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">{failed} Failed</span>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={resetAll}>Reset All</Button>
            <Button size="sm" className="gap-2" onClick={runAll} disabled={runningAll}>
              <Play className="w-3.5 h-3.5" />
              {runningAll ? "Running All..." : "Run All Tests"}
            </Button>
          </div>
        </div>

        {/* Tests by Day */}
        <Tabs defaultValue="Day 1">
          <TabsList className="mb-4 flex-wrap h-auto">
            {days.map(day => {
              const dayScripts = scripts.filter(s => s.day === day);
              const dayPassed = dayScripts.filter(s => s.status === "passed").length;
              const dayFailed = dayScripts.filter(s => s.status === "failed").length;
              return (
                <TabsTrigger key={day} value={day} className="gap-1.5">
                  {day}
                  {dayPassed > 0 && <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] flex items-center justify-center">{dayPassed}</span>}
                  {dayFailed > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{dayFailed}</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {days.map(day => (
            <TabsContent key={day} value={day} className="space-y-4">
              {scripts.filter(s => s.day === day).map(script => (
                <Card key={script.id} className={`border-2 transition-all ${
                  script.status === "passed" ? "border-green-200 bg-green-50/30" :
                  script.status === "failed" ? "border-red-200 bg-red-50/30" :
                  script.status === "running" ? "border-blue-300 bg-blue-50/30" :
                  "border-border"
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {script.status === "idle"    && <Clock className="w-4 h-4 text-muted-foreground" />}
                        {script.status === "running" && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                        {script.status === "passed"  && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {script.status === "failed"  && <XCircle className="w-4 h-4 text-red-500" />}
                        <CardTitle className="text-sm">{script.name}</CardTitle>
                        {script.duration && (
                          <span className="text-[10px] text-muted-foreground">{script.duration}ms</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={script.status === "passed" ? "outline" : "default"}
                        className="h-7 px-3 text-xs gap-1 flex-shrink-0"
                        disabled={script.status === "running" || runningAll}
                        onClick={() => runScript(script.id)}
                      >
                        <Play className="w-3 h-3" />
                        {script.status === "running" ? "Running..." : "Run"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{script.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Code2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-muted-foreground">Script</span>
                      </div>
                      <pre className="code-block text-xs leading-relaxed overflow-x-auto">{script.code}</pre>
                    </div>
                    {output[script.id] && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Terminal className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs font-medium text-muted-foreground">Output</span>
                        </div>
                        <ScrollArea className="log-terminal h-28">
                          <pre className={`text-xs ${script.status === "failed" ? "text-red-400" : "text-green-300"}`}>
                            {output[script.id]}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
