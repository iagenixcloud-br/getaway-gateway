import React from "react";
import "./index.css";
import { Layout } from "./components/Layout";
import { KanbanBoard } from "./components/KanbanBoard";

export default function App() {
  return (
    <Layout>
      <KanbanBoard />
    </Layout>
  );
}
