// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/App.jsx

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './App.module.css';

// Import all components
import LoginPage from './pages/auth/LoginPage.jsx';
import SignUpPage from './pages/auth/SignUpPage.jsx';
import ChatGroupsPage from './pages/chat/ChatGroupsPage.jsx';
import ChatWindow from './pages/chat/ChatWindow.jsx';
import Navbar from './components/layout/Navbar.jsx';
import LivePage from './pages/incident/LivePage.jsx';
import ReportIncidentPage from './pages/incident/ReportIncidentPage.jsx';
import LeaderboardPage from './pages/user/LeaderboardPage.jsx';
import IncidentDetailPage from './pages/incident/IncidentDetailPage.jsx';
import IncidentMediaPage from './pages/incident/IncidentMediaPage.jsx';
import TeamAssignmentPage from './pages/incident/components/TeamAssignmentPage.jsx';
import MyCasesPage from './pages/user/MyCasesPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import AdoptionsPage from './pages/static/AdoptionsPage.jsx';
import EventsPage from './pages/static/EventsPage.jsx';
import ApprovalsPage from './pages/admin/ApprovalsPage.jsx';
import VolunteersPage from "./pages/user/VolunteersPage.jsx";
import VolunteerProfilePage from "./pages/user/VolunteerProfilePage.jsx";
import InventoryPage from "./pages/inventory/InventoryPage.jsx";
import FirstAidKitPage from "./pages/inventory/FirstAidKitPage.jsx";
import NotificationsPage from './pages/notification/NotificationsPage.jsx';
import SuperAdminPage from './pages/admin/SuperAdminPage.jsx';

// This component acts as a layout for all protected pages
const ProtectedLayout = ({ user, onLogout }) => {
    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <div className={styles.protectedLayout}>
            <Navbar user={user} onLogout={onLogout} />
            <main className={styles.contentArea}>
                <Outlet />
            </main>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                if (decodedUser.exp * 1000 < Date.now()) {
                    throw new Error("Token expired");
                }
                setUser(decodedUser);
                setToken(token);

                // --- ✨ Removed subscribeToPushNotifications(token) call ---

            } catch (e) {
                console.error("Token validation failed:", e.message);
                setUser(null);
                setToken(null);
                localStorage.removeItem('jwtToken');
            }
        }
    }, []); // Run only once on initial load

    const handleLoginSuccess = (newToken) => {
        localStorage.setItem('jwtToken', newToken);
        setToken(newToken);
        try {
            const decodedUser = jwtDecode(newToken);
            setUser(decodedUser);
            navigate('/chat');

            // --- ✨ Removed subscribeToPushNotifications(newToken) call ---

        } catch (e) {
            console.error("Failed to decode token on login:", e);
            handleLogout();
        }
    };

    const handleLogout = () => {
        // Here you might also want to unsubscribe the user,
        // but it's complex as you need the endpoint.
        // The backend will handle failed pushes.
        localStorage.removeItem('jwtToken');
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    return (
        <div className={styles.app}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={token ? <Navigate to="/chat" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={token ? <Navigate to="/chat" /> : <SignUpPage />} />

                {/* Protected Routes nested inside the layout */}
                <Route element={<ProtectedLayout user={user} onLogout={handleLogout} />}>
                    {/* Redirect base path */}
                    <Route path="/" element={<Navigate to="/chat" replace />} />

                    {/* Core Features */}
                    <Route path="/chat" element={<ChatGroupsPage token={token} onLogout={handleLogout} />} />
                    <Route path="/chat/:chatId" element={<ChatWindow token={token} onLogout={handleLogout} />} />
                    <Route path="/live" element={<LivePage token={token} />} />
                    <Route path="/incident/:incidentId" element={<IncidentDetailPage token={token} />} />
                    <Route path="/incident/:incidentId/media" element={<IncidentMediaPage />} />
                    <Route path="/incident/:incidentId/assign" element={<TeamAssignmentPage token={token} currentUser={user} />} />
                    <Route path="/report" element={<ReportIncidentPage />} />

                    {/* User Specific */}
                    <Route path="/my-cases" element={<MyCasesPage token={token} />} />
                    <Route path="/leaderboard" element={<LeaderboardPage token={token} />} />
                    <Route path="/volunteers" element={<VolunteersPage token={token} currentUser={user} />} />
                    <Route path="/volunteer/:volunteerId" element={<VolunteerProfilePage token={token} currentUser={user} />} />
                    <Route path="/profile" element={<ProfilePage token={token} />} />
                    <Route path="/profile/first-aid-kit/:userId" element={<FirstAidKitPage token={token} />} />

                    {/* Notifications */}
                    <Route path="/notifications" element={<NotificationsPage token={token} />} />

                    {/* Admin/Manager Specific */}
                    <Route path="/approvals" element={<ApprovalsPage token={token} />} />
                    <Route path="/inventory" element={<InventoryPage token={token} />} />
                    <Route path="/superadmin" element={<SuperAdminPage token={token} currentUser={user} />} />

                    {/* Fallback for unknown protected routes */}
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                </Route>
                {/* Fallback for unknown public routes */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </div>
    );
};

// Wrap App with Router if Router is not already wrapping it higher up
const AppWithRouter = () => (
    <Router>
        <App />
    </Router>
);

export default AppWithRouter;