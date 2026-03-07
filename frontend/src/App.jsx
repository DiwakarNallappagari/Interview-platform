import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateRoom from "./pages/CreateRoom";
import InterviewRoom from "./pages/InterviewRoom";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/create-room"
            element={
              <PrivateRoute>
                <CreateRoom />
              </PrivateRoute>
            }
          />

          {/* Interview room */}
          <Route path="/room/:roomId" element={<InterviewRoom />} />

          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" />} />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;