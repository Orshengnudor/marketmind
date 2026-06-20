import { Switch, Route } from "wouter";
import Layout from "./components/Layout";
import DashboardPage from "./pages/dashboard";
import StrategyPage from "./pages/strategy";
import SkillSpecPage from "./pages/skill-spec";
import AboutPage from "./pages/about";
import ScannerPage from "./pages/scanner";
import PortfolioPage from "./pages/portfolio";
import WatchlistPage from "./pages/watchlist";
import HeatmapPage from "./pages/heatmap";
import AlertsPage from "./pages/alerts";
import StrategyExplainPage from "./pages/strategy-explain";
import { useTheme } from "./hooks/useTheme";
import { ThemeContext } from "./lib/theme";

function App() {
  const { theme, toggle } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/strategy" component={StrategyPage} />
          <Route path="/scanner" component={ScannerPage} />
          <Route path="/portfolio" component={PortfolioPage} />
          <Route path="/watchlist" component={WatchlistPage} />
          <Route path="/heatmap" component={HeatmapPage} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/strategy/explain" component={StrategyExplainPage} />
          <Route path="/skill-spec" component={SkillSpecPage} />
          <Route path="/about" component={AboutPage} />
        </Switch>
      </Layout>
    </ThemeContext.Provider>
  );
}

export default App;
