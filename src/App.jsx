import { useState, useCallback } from 'react';
import './App.css';
import WebSocketComponent from './components/WebSocketComponent';
import SocketLoginPage from './components/SocketLoginPage'; // Import the new component

function App() {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);

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

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        setToken(null);
        setMessages([]);
    };

    const renderWebSocketUI = () => (
        <>
            <div className="header-container">
                <h1>React WebSocket Demo</h1>
                <button onClick={handleLogout}>Log Out</button>
            </div>
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
        </>
    );

    return (
        <div className="App">
            <header className="App-header">
                {token ? renderWebSocketUI() : <SocketLoginPage onLoginSuccess={setToken} />}
            </header>
        </div>
    );
}

export default App;