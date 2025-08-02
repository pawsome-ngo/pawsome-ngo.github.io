import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import WebSocketComponent from './WebSocketComponent';
import styles from './ChatWindow.module.css';

// A utility function to extract user ID and username from the JWT token
const getUserInfoFromToken = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        return {
            id: Number(decodedToken.id),
            username: decodedToken.sub // The 'sub' claim holds the username
        };
    } catch (error) {
        console.error('Failed to decode token:', error);
        return { id: null, username: null };
    }
};

const ChatWindow = ({ token }) => {
    const { chatId } = useParams();
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);

    // This useEffect hook runs only when the `token` changes.
    // It fetches and stores the user info in state, preventing redundant calls.
    useEffect(() => {
        if (token) {
            const userInfo = getUserInfoFromToken(token);
            setLoggedInUser(userInfo);
        }
    }, [token]);

    // Memoize the onMessageReceived function to prevent it from causing a re-render in WebSocketComponent
    const onMessageReceived = useCallback((newMessage) => {
        setMessages((prevMessages) => {
            // Check if the incoming message has a client-side ID
            const existingMessageIndex = prevMessages.findIndex(
                (msg) => msg.id === newMessage.clientMessageId
            );

            if (existingMessageIndex !== -1) {
                // If it's an update to an optimistic message, replace it
                const updatedMessages = [...prevMessages];
                updatedMessages[existingMessageIndex] = newMessage;
                return updatedMessages;
            } else {
                // Otherwise, it's a new message from another user, so add it
                return [...prevMessages, newMessage];
            }
        });
    }, []); // Empty dependency array ensures the function is created only once

    const { sendMessage, isConnected } = WebSocketComponent({ onMessageReceived, token, chatId });

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await fetch(`http://localhost:8080/api/chat/messages/${chatId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                } else {
                    console.error('Failed to fetch messages');
                }
            } catch (err) {
                console.error('API call failed', err);
            } finally {
                setLoading(false);
            }
        };

        if (chatId && token) {
            fetchMessages();
        }
    }, [chatId, token]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (messageInput && loggedInUser) {
            const clientMessageId = `temp-${Date.now()}`;
            const optimisticMessage = {
                id: clientMessageId,
                text: messageInput,
                sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
                timestamp: new Date().toISOString(),
            };

            setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

            sendMessage({ text: messageInput, clientMessageId: clientMessageId });
            setMessageInput('');
        }
    };

    if (loading || !loggedInUser) return <div className={styles.container}>Loading chat...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.messagesList}>
                {messages.map(msg => (
                    <div key={msg.id} className={`${styles.message} ${Number(msg.sender.id) === loggedInUser.id ? styles.sent : styles.received}`}>
                        <strong>{Number(msg.sender.id) === loggedInUser.id ? 'You' : msg.sender.firstName}:</strong> {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className={styles.messageForm}>
                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className={styles.messageInput}
                />
                <button type="submit" disabled={!isConnected} className={styles.sendButton}>Send</button>
            </form>
        </div>
    );
};

export default ChatWindow;