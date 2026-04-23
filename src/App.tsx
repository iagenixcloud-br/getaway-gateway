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
import { Relatorios } from "./pages/Relatorios";

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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
