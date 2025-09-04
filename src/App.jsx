import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Outlet, Navigate } from 'react-router-dom';
import './App.css';

import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ChatGroupsPage from './components/ChatGroupsPage';
import ChatWindow from './components/ChatWindow';
import Navbar from './components/Navbar';
import LivePage from './components/LivePage';
import ReportPage from './components/ReportPage';
import StandingsPage from './components/StandingsPage';

// This new component will act as a layout for all protected pages
const ProtectedLayout = ({ token, onLogout }) => {
    if (!token) {
        // If no token, redirect to the login page
        return <Navigate to="/login" />;
    }

    return (
        <>
            <Navbar onLogout={onLogout} />
            <main>
                {/* The Outlet component renders the matched child route */}
                <Outlet />
            </main>
        </>
    );
};

const App = () => {
    const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
    const navigate = useNavigate();

    const handleLoginSuccess = (newToken) => {
        localStorage.setItem('jwtToken', newToken);
        setToken(newToken);
        navigate('/chat');
    };

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        setToken(null);
        navigate('/login');
    };

    return (
        <div className="App">
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<SignUpPage />} />

                {/* Protected Routes nested inside the layout */}
                <Route element={<ProtectedLayout token={token} onLogout={handleLogout} />}>
                    <Route path="/" element={<Navigate to="/chat" />} />
                    <Route path="/chat" element={<ChatGroupsPage token={token} onLogout={handleLogout} />} />
                    <Route path="/chat/:chatId" element={<ChatWindow token={token} onLogout={handleLogout} />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/report" element={<ReportPage />} />
                    <Route path="/standings" element={<StandingsPage />} />
                </Route>
            </Routes>
        </div>
    );
};

const AppWithRouter = () => (
    <Router>
        <App />
    </Router>
);

export default AppWithRouter;