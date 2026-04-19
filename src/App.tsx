import React, { useState } from "react";
import "./index.css";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { KanbanBoard } from "./components/KanbanBoard";
import { MarketingHub } from "./components/MarketingHub";
import { BrokerRanking } from "./components/BrokerRanking";
import { WhatsAppConfig } from "./components/WhatsAppConfig";

type View = "dashboard" | "kanban" | "marketing" | "corretores" | "whatsapp";

export default function App() {
  const [activeView, setActiveView] = useState<View>("dashboard");

  const renderView = () => {
    switch (activeView) {
      case "dashboard":   return <Dashboard />;
      case "kanban":      return <KanbanBoard />;
      case "marketing":   return <MarketingHub />;
      case "corretores":  return <BrokerRanking />;
      case "whatsapp":    return <WhatsAppConfig />;
      default:            return <Dashboard />;
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView}>
      {renderView()}
    </Layout>
  );
}
