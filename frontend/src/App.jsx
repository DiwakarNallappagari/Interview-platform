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
    <AuthProvider>

      <Router>

        <Routes>

          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/create"
            element={
              <PrivateRoute>
                <CreateRoom />
              </PrivateRoute>
            }
          />

          <Route
            path="/room/:roomId"
            element={
              <PrivateRoute>
                <InterviewRoom />
              </PrivateRoute>
            }
          />

        </Routes>

      </Router>

    </AuthProvider>
  );
}

export default App;