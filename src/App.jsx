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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// This component acts as a layout for all protected pages
// --- ✨ 1. Accept fullUserProfile and setFullUserProfile ---
const ProtectedLayout = ({ user, fullUserProfile, onLogout, setFullUserProfile }) => {
    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <div className={styles.protectedLayout}>
            {/* --- ✨ 2. Pass fullUserProfile to Navbar --- */}
            <Navbar user={user} fullUserProfile={fullUserProfile} onLogout={onLogout} />
            <main className={styles.contentArea}>
                {/* --- ✨ 3. Pass the *setter* down to all child routes --- */}
                <Outlet context={{ setFullUserProfile }} />
            </main>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null); // Basic user info from JWT
    const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
    // --- ✨ 4. Add state for the full, detailed profile ---
    const [fullUserProfile, setFullUserProfile] = useState(null);
    const navigate = useNavigate();

    // --- ✨ 5. Create a function to fetch the full profile ---
    const fetchProfile = async (currentToken) => {
        if (!currentToken) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setFullUserProfile(data); // Store the full profile
            } else {
                throw new Error('Failed to fetch full profile');
            }
        } catch (e) {
            console.error("Failed to fetch full profile:", e.message);
            // Don't log out, just means navbar link might not show
        }
    };

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
                // --- ✨ 6. Fetch full profile on initial load ---
                fetchProfile(token);
            } catch (e) {
                console.error("Token validation failed:", e.message);
                setUser(null);
                setToken(null);
                setFullUserProfile(null); // Clear profile on error
                localStorage.removeItem('jwtToken');
            }
        }
    }, []);

    const handleLoginSuccess = (newToken) => {
        localStorage.setItem('jwtToken', newToken);
        setToken(newToken);
        try {
            const decodedUser = jwtDecode(newToken);
            setUser(decodedUser);
            // --- ✨ 7. Fetch full profile on new login ---
            fetchProfile(newToken);
            navigate('/chat');
        } catch (e) {
            console.error("Failed to decode token on login:", e);
            handleLogout();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        setToken(null);
        setUser(null);
        setFullUserProfile(null); // --- ✨ 8. Clear full profile on logout ---
        navigate('/login');
    };

    return (
        <div className={styles.app}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={token ? <Navigate to="/chat" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={token ? <Navigate to="/chat" /> : <SignUpPage />} />

                {/* --- ✨ 9. Pass new state and setter to ProtectedLayout --- */}
                <Route element={<ProtectedLayout user={user} fullUserProfile={fullUserProfile} onLogout={handleLogout} setFullUserProfile={setFullUserProfile} />}>
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                    <Route path="/chat" element={<ChatGroupsPage token={token} onLogout={handleLogout} />} />
                    <Route path="/chat/:chatId" element={<ChatWindow token={token} onLogout={handleLogout} />} />
                    <Route path="/my-cases" element={<MyCasesPage token={token} />} />
                    <Route path="/live" element={<LivePage token={token} />} />
                    <Route path="/incident/:incidentId" element={<IncidentDetailPage token={token} />} />
                    <Route path="/incident/:incidentId/media" element={<IncidentMediaPage />} />
                    <Route path="/incident/:incidentId/assign" element={<TeamAssignmentPage token={token} currentUser={user} />} />
                    <Route path="/report" element={<ReportIncidentPage />} />
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
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
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