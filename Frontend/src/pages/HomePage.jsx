import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/LoginPage";
import Register from "./pages/RegisterPage";
import OTPVerification from "./components/OTPVerification";
import Home from "./pages/HomePage";
import AccountConfig from "./pages/AccountConfigPage";
import Dashboard from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import CreatePostPage from "./pages/CreatePostPage";
import MastodonAuth from "./components/MastodonAuth";
import ProtectedRoute from "./components/ProtectedRoute"; // Importa el componente de protección

const AppRoutes = () => {
    return (
        <Router>
            <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<OTPVerification />} />

                {/* Rutas protegidas */}
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/account-config"
                    element={
                        <ProtectedRoute>
                            <AccountConfig />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/create-post"
                    element={
                        <ProtectedRoute>
                            <CreatePostPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/schedule"
                    element={
                        <ProtectedRoute>
                            <SchedulePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/mastodon-auth"
                    element={
                        <ProtectedRoute>
                            <MastodonAuth />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default AppRoutes;
