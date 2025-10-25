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
import UpdateIncidentModal from './pages/incident/components/UpdateIncidentModal.jsx'; // Keep this import
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
import GlobalChatWindow from './pages/chat/GlobalChatWindow.jsx'; // Keep this import

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ProtectedLayout component remains the same
const ProtectedLayout = ({ user, fullUserProfile, onLogout, setFullUserProfile }) => {
    if (!user) {
        return <Navigate to="/login" />;
    }
    return (
        <div className={styles.protectedLayout}>
            <Navbar user={user} fullUserProfile={fullUserProfile} onLogout={onLogout} />
            <main className={styles.contentArea}>
                <Outlet context={{ setFullUserProfile }} />
            </main>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
    const [fullUserProfile, setFullUserProfile] = useState(null);
    const navigate = useNavigate();

    const fetchProfile = async (currentToken) => {
        if (!currentToken) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setFullUserProfile(data);
            } else {
                console.error('Failed to fetch full profile'); // Log error but don't stop app
            }
        } catch (e) {
            console.error("Failed to fetch full profile:", e.message);
        }
    };

    useEffect(() => {
        const storedToken = localStorage.getItem('jwtToken');
        if (storedToken) {
            try {
                const decodedUser = jwtDecode(storedToken);
                if (decodedUser.exp * 1000 < Date.now()) {
                    throw new Error("Token expired");
                }
                setUser(decodedUser);
                setToken(storedToken);
                fetchProfile(storedToken);
            } catch (e) {
                console.error("Token validation failed:", e.message);
                handleLogout();
            }
        }
    }, []);

    const handleLoginSuccess = (newToken) => {
        localStorage.setItem('jwtToken', newToken);
        setToken(newToken);
        try {
            const decodedUser = jwtDecode(newToken);
            setUser(decodedUser);
            fetchProfile(newToken);
            // --- 1. UPDATE LOGIN REDIRECT ---
            navigate('/chat'); // Navigate to Incident Chat List on login
        } catch (e) {
            console.error("Failed to decode token on login:", e);
            handleLogout();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        setToken(null);
        setUser(null);
        setFullUserProfile(null);
        navigate('/login');
    };

    return (
        <div className={styles.app}>
            <Routes>
                {/* Public Routes - Redirect logged-in users to /chat */}
                <Route path="/login" element={token ? <Navigate to="/chat" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={token ? <Navigate to="/chat" /> : <SignUpPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedLayout user={user} fullUserProfile={fullUserProfile} onLogout={handleLogout} setFullUserProfile={setFullUserProfile} />}>
                    {/* --- 2. UPDATE DEFAULT ROUTE --- */}
                    <Route path="/" element={<Navigate to="/chat" replace />} />

                    {/* Keep Global Chat Route */}
                    <Route path="/gchat" element={<GlobalChatWindow token={token} onLogout={handleLogout} />} />

                    {/* Incident Chat Routes */}
                    <Route path="/chat" element={<ChatGroupsPage token={token} onLogout={handleLogout} />} />
                    <Route path="/chat/:chatId" element={<ChatWindow token={token} onLogout={handleLogout} />} />

                    {/* Other App Routes */}
                    <Route path="/my-cases" element={<MyCasesPage token={token} />} />
                    <Route path="/live" element={<LivePage token={token} />} />
                    <Route path="/incident/:incidentId/update" element={<UpdateIncidentModal token={token} currentUser={user} />} />
                    <Route path="/incident/:incidentId" element={<IncidentDetailPage token={token} currentUser={user} />} />
                    <Route path="/incident/:incidentId/media" element={<IncidentMediaPage token={token} currentUser={user} />} />
                    <Route path="/incident/:incidentId/assign" element={<TeamAssignmentPage token={token} currentUser={user} />} />
                    <Route path="/report" element={<ReportIncidentPage token={token} />} />
                    <Route path="/leaderboard" element={<LeaderboardPage token={token} />} />
                    <Route path="/adoptions" element={<AdoptionsPage />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/volunteers" element={<VolunteersPage token={token} currentUser={user} />} />
                    <Route path="/volunteer/:volunteerId" element={<VolunteerProfilePage token={token} currentUser={user} />} />
                    <Route path="/approvals" element={<ApprovalsPage token={token} />} />
                    <Route path="/profile" element={<ProfilePage token={token} />} />
                    <Route path="/inventory" element={<InventoryPage token={token} />} />
                    <Route path="/profile/first-aid-kit/:userId" element={<FirstAidKitPage token={token} />} />
                    <Route path="/notifications" element={<NotificationsPage token={token} />} />
                    <Route path="/superadmin" element={<SuperAdminPage token={token} currentUser={user} />} />

                    {/* --- 3. UPDATE FALLBACK ROUTE --- */}
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </div>
    );
};

// Keep AppWithRouter wrapper
const AppWithRouter = () => (
    <Router>
        <App />
    </Router>
);

export default AppWithRouter;