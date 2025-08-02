import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './App.css';

import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ChatGroupsPage from './components/ChatGroupsPage';
import ChatWindow from './components/ChatWindow';


const getRolesFromToken = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        return decodedToken.roles || [];
    } catch (error) {
        console.error('Failed to decode token:', error);
        return [];
    }
};

const ProtectedContent = ({ token, onLogout, Component, ...rest }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    if (!token) {
        return null;
    }

    return <Component token={token} onLogout={onLogout} {...rest} />;
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
                <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<SignUpPage />} />
                {/* The root path now redirects to the chat group list */}
                <Route path="/" element={<ProtectedContent Component={ChatGroupsPage} token={token} onLogout={handleLogout} />} />
                <Route path="/chat" element={<ProtectedContent Component={ChatGroupsPage} token={token} onLogout={handleLogout} />} />
                <Route path="/chat/:chatId" element={<ProtectedContent Component={ChatWindow} token={token} onLogout={handleLogout} />} />
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