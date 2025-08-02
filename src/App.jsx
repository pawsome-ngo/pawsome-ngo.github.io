import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './App.css';
import WebSocketComponent from './components/WebSocketComponent';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';

const getRolesFromToken = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        return decodedToken.roles || [];
    } catch (error) {
        console.error('Failed to decode token:', error);
        return [];
    }
};

const ProtectedContent = ({ token, onLogout }) => {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const roles = getRolesFromToken(token);
    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    const onMessageReceived = useCallback((message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    }, []);

    const { sendMessage, isConnected } = WebSocketComponent({ onMessageReceived, token });

    const handleSendMessage = () => {
        if (messageInput) {
            sendMessage(messageInput);
            setMessageInput('');
        }
    };

    return (
        <div className="App-header">
            <div className="header-container">
                <h1>React WebSocket Demo</h1>
                <button onClick={onLogout}>Log Out</button>
            </div>
            {isAdmin && <h2>Admin Panel Access</h2>}
            <div>
                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Enter your message..."
                />
                <button onClick={handleSendMessage} disabled={!isConnected}>
                    Send
                </button>
            </div>
            <div>
                <h2>Messages:</h2>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
            </div>
        </div>
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

    const ProtectedWrapper = () => {
        useEffect(() => {
            if (!token) {
                navigate('/login');
            }
        }, [token, navigate]);

        if (!token) {
            return null;
        }

        return <ProtectedContent token={token} onLogout={handleLogout} />;
    };

    return (
        <div className="App">
            <Routes>
                <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/chat" element={<ProtectedWrapper />} />
                <Route path="/" element={<ProtectedWrapper />} />
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