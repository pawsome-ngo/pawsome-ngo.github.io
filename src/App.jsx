import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './App.module.css';

// Import all components
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ChatGroupsPage from './components/ChatGroupsPage';
import ChatWindow from './components/ChatWindow';
import Navbar from './components/Navbar';
import LivePage from './components/LivePage';
import ReportIncidentPage from './components/ReportIncidentPage';
import StandingsPage from './components/StandingsPage';
import IncidentDetailPage from './components/IncidentDetailPage';
import IncidentMediaPage from './components/IncidentMediaPage';
import TeamAssignmentPage from './components/TeamAssignmentPage';
import MyCasesPage from './components/MyCasesPage';
import ProfilePage from './components/ProfilePage';
import AdoptionsPage from './components/AdoptionsPage';
import EventsPage from './components/EventsPage';
import AdminPage from './components/AdminPage';
import VolunteersPage from "./components/VolunteersPage.jsx";
import VolunteerProfilePage from "./components/VolunteerProfilePage.jsx";


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
                setUser(decodedUser);
                setToken(token);
            } catch (e) {
                // Handle invalid token
                setUser(null);
                setToken(null);
                localStorage.removeItem('jwtToken');
            }
        }
    }, []);

    const handleLoginSuccess = (newToken) => {
        localStorage.setItem('jwtToken', newToken);
        setToken(newToken);
        const decodedUser = jwtDecode(newToken);
        setUser(decodedUser);
        navigate('/chat');
    };

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    return (
        <div className={styles.app}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<SignUpPage />} />

                {/* Protected Routes nested inside the layout */}
                <Route element={<ProtectedLayout user={user} onLogout={handleLogout} />}>
                    <Route path="/" element={<Navigate to="/chat" />} />
                    <Route path="/chat" element={<ChatGroupsPage token={token} onLogout={handleLogout} />} />
                    <Route path="/chat/:chatId" element={<ChatWindow token={token} onLogout={handleLogout} />} />
                    <Route path="/my-cases" element={<MyCasesPage token={token} />} />
                    <Route path="/live" element={<LivePage token={token} />} />
                    <Route path="/incident/:incidentId" element={<IncidentDetailPage token={token} />} />
                    <Route path="/incident/:incidentId/media" element={<IncidentMediaPage />} />
                    <Route path="/incident/:incidentId/assign" element={<TeamAssignmentPage token={token} currentUser={user} />} />
                    <Route path="/report" element={<ReportIncidentPage />} />
                    <Route path="/standings" element={<StandingsPage token={token} />} />
                    <Route path="/adoptions" element={<AdoptionsPage />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/volunteers" element={<VolunteersPage token={token} currentUser={user} />} />
                    <Route path="/volunteer/:volunteerId" element={<VolunteerProfilePage token={token} currentUser={user} />} />
                    <Route path="/admin" element={<AdminPage token={token} />} />
                    <Route path="/profile" element={<ProfilePage token={token} />} />
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