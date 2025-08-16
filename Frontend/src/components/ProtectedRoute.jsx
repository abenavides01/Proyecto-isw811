import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = !!sessionStorage.getItem("userId"); // Verifica si el usuario está autenticado

    return isAuthenticated ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
