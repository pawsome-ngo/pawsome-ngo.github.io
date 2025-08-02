import React, { useState, useEffect, useRef } from 'react';
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

    const userInfo = getUserInfoFromToken(token);
    const loggedInUserId = userInfo.id;
    const loggedInUsername = userInfo.username;

    const onMessageReceived = (newMessage) => {
        setMessages((prevMessages) => {
            const existingMessageIndex = prevMessages.findIndex(
                (msg) => msg.id === newMessage.id
            );

            if (existingMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[existingMessageIndex] = newMessage;
                return updatedMessages;
            } else {
                return [...prevMessages, newMessage];
            }
        });
    };

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
        if (messageInput) {
            const optimisticMessage = {
                id: `temp-${Date.now()}`,
                text: messageInput,
                sender: { id: loggedInUserId, firstName: loggedInUsername, lastName: '' },
                timestamp: new Date().toISOString(),
            };

            setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

            sendMessage({ text: messageInput });
            setMessageInput('');
        }
    };

    if (loading) return <div className={styles.container}>Loading chat...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.messagesList}>
                {messages.map(msg => (
                    <div key={msg.id} className={`${styles.message} ${msg.sender.firstName?.toLowerCase() === loggedInUsername ? styles.sent : styles.received}`}>
                        <strong>{msg.sender.firstName?.toLowerCase() === loggedInUsername ? 'You' : msg.sender.firstName}:</strong> {msg.text}
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