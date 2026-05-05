import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Layout } from "./components/Layout";
import { KanbanBoard } from "./components/KanbanBoard";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Corretores } from "./pages/Corretores";
import { Desempenho } from "./pages/Desempenho";
import { Roleta } from "./pages/Roleta";

import { Integracao } from "./pages/Integracao";
import { Dashboard } from "./pages/Dashboard";
import { Leads } from "./pages/Leads";
import { WebhookLogs } from "./pages/WebhookLogs";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <KanbanBoard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/corretores"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Corretores />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/desempenho"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Desempenho />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/roleta"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Roleta />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integracao"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Integracao />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <Layout>
                  <Leads />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/webhook-logs"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <WebhookLogs />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
