import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgentProvider } from "./contexts/AgentContext";
import AppLayout from "./components/AppLayout";

// Pages
import DashboardPage from "./pages/DashboardPage";
import Screen1ModalSpecialist from "./pages/Screen1ModalSpecialist";
import Screen2RAGFrontierEnsemble from "./pages/Screen2RAGFrontierEnsemble";
import Screen3ScannerMessenger from "./pages/Screen3ScannerMessenger";
import Screen4PlannerFramework from "./pages/Screen4PlannerFramework";
import Screen5PriceIsRight from "./pages/Screen5PriceIsRight";
import Screen7TestScripts from "./pages/Screen7TestScripts";
import Screen8Settings from "./pages/Screen8Settings";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/screen1" component={Screen1ModalSpecialist} />
        <Route path="/screen2" component={Screen2RAGFrontierEnsemble} />
        <Route path="/screen3" component={Screen3ScannerMessenger} />
        <Route path="/screen4" component={Screen4PlannerFramework} />
        <Route path="/screen5" component={Screen5PriceIsRight} />
        <Route path="/test-scripts" component={Screen7TestScripts} />
        <Route path="/settings" component={Screen8Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <AgentProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </AgentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
