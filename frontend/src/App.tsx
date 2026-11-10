import { Navigate, Route, Routes } from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

import Dashboard from "./pages/Dashboard";
import TaskHistory from "./pages/TaskHistory";
import Settings from "./pages/Settings";

import TaskExecution from "./pages/TaskExecution";

export default function App() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <Header />

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<TaskHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tasks/:taskId" element={<TaskExecution />} />

            {/* Redirect unknown routes to the dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}