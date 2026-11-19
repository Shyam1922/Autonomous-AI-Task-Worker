import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import TaskExecution from "./pages/TaskExecution";
import TaskHistory from "./pages/TaskHistory";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<TaskHistory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tasks/:taskId" element={<TaskExecution />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
