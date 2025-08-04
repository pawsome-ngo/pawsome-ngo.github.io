import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import WebSocketComponent from './WebSocketComponent';
import ReactionsModal from './ReactionsModal';
import ReactionPicker from './ReactionPicker';
import styles from './ChatWindow.module.css';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// A utility function to extract user ID and username from the JWT token
const getUserInfoFromToken = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        return {
            id: Number(decodedToken.id),
            username: decodedToken.sub
        };
    } catch (error) {
        console.error('Failed to decode token:', error);
        return { id: null, username: null };
    }
};

const ChatWindow = ({ token, onLogout }) => {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);

    const [chatGroup, setChatGroup] = useState(null);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [reactionsModalData, setReactionsModalData] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const pressTimer = useRef(null);
    const initialLoadRef = useRef(true);
    const messageListRef = useRef(null);

    useEffect(() => {
        if (token) {
            const userInfo = getUserInfoFromToken(token);
            setLoggedInUser(userInfo);
        }
    }, [token]);

    const onMessageReceived = useCallback((message) => {
        setMessages(prevMessages => {
            const optimisticMessageIndex = prevMessages.findIndex(m => m.id === message.clientMessageId);
            if (optimisticMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[optimisticMessageIndex] = message;
                return updatedMessages;
            }

            const existingMessageIndex = prevMessages.findIndex(m => m.id === message.id);
            if (existingMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[existingMessageIndex] = message;
                return updatedMessages;
            }

            const newMessages = [...prevMessages, message];

            if (messageListRef.current) {
                const { scrollHeight, scrollTop, clientHeight } = messageListRef.current;
                if (scrollHeight - scrollTop <= clientHeight + 100) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }

            return newMessages;
        });
    }, [loggedInUser]);

    const { sendMessage, isConnected } = WebSocketComponent({ onMessageReceived, token, chatId });

    useEffect(() => {
        const fetchChatData = async () => {
            setLoading(true);
            try {
                const [messagesResponse, chatGroupsResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/chat/messages/${chatId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/api/chat/groups`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (!messagesResponse.ok || !chatGroupsResponse.ok) {
                    throw new Error('Failed to fetch chat data.');
                }

                const messagesData = await messagesResponse.json();
                const groupsData = await chatGroupsResponse.json();

                const currentGroup = groupsData.find(p => p.chatGroup.id === chatId)?.chatGroup;
                if (currentGroup) {
                    setChatGroup(currentGroup);
                    setMessages(messagesData);
                } else {
                    throw new Error('Chat group not found.');
                }

            } catch (err) {
                console.error(err);
                onLogout();
            } finally {
                setLoading(false);
            }
        };

        if (chatId && token) {
            fetchChatData();
        }
    }, [chatId, token, onLogout]);

    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = (event) => {
        event.preventDefault();
        if (newMessage.trim() === '' || !loggedInUser) return;

        const clientMessageId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: clientMessageId,
            text: newMessage.trim(),
            sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
            timestamp: new Date().toISOString(),
            reactions: {},
            seenBy: [],
            parentMessageId: replyingTo ? replyingTo.id : null,
        };

        setMessages(prevMessages => [...prevMessages, optimisticMessage]);

        const payload = {
            text: newMessage.trim(),
            clientMessageId: clientMessageId,
            parentMessageId: replyingTo ? replyingTo.id : null,
        };
        sendMessage(payload, `/app/chat/${chatId}/send`);

        setNewMessage('');
        setReplyingTo(null);
    };

    const handleLongPressStart = (messageId) => {
        pressTimer.current = setTimeout(() => {
            setActiveEmojiPicker(messageId);
        }, 500);
    };

    const handleLongPressEnd = () => {
        clearTimeout(pressTimer.current);
    };

    const handleReact = (reaction) => {
        if (loggedInUser && activeEmojiPicker) {
            const payload = { messageId: activeEmojiPicker, reaction: reaction };
            sendMessage(payload, `/app/chat/${chatId}/react`);
        }
        setActiveEmojiPicker(null);
    };

    const handleOpenReactionsModal = (reactions) => setReactionsModalData(reactions);

    const handleCloseModal = () => setReactionsModalData(null);

    const handleCancelReply = () => setReplyingTo(null);

    const handleBackClick = () => {
        navigate('/chat');
    };

    const handleClosePopups = () => {
        setActiveEmojiPicker(null);
    };

    if (loading || !loggedInUser || !chatGroup) return <div className={styles.centeredMessage}>Loading messages...</div>;
    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                <button onClick={handleBackClick} className={styles.backButton}>&larr;</button>
                <h2>{chatGroup.name}</h2>
                <div className={styles.headerPlaceholder}></div>
            </header>
            <main ref={messageListRef} className={styles.messageList} onClick={handleClosePopups}>
                {messages.map((msg) => {
                    const isSentByCurrentUser = Number(msg.sender.id) === loggedInUser.id;
                    const reactionsCount = msg.reactions ? Object.values(msg.reactions).flat().length : 0;
                    const senderName = isSentByCurrentUser ? 'You' : msg.sender.firstName;

                    return (
                        <div key={msg.id} className={`${styles.message} ${isSentByCurrentUser ? styles.sent : styles.received}`}>
                            <div className={styles.messageContent}>
                                {activeEmojiPicker === msg.id && (
                                    <ReactionPicker onReact={handleReact} onClose={() => setActiveEmojiPicker(null)} />
                                )}
                                <div
                                    className={styles.messageBubble}
                                    onMouseDown={() => handleLongPressStart(msg.id)}
                                    onMouseUp={handleLongPressEnd}
                                    onMouseLeave={handleLongPressEnd}
                                    onTouchStart={() => handleLongPressStart(msg.id)}
                                    onTouchEnd={handleLongPressEnd}
                                >
                                    <p className={styles.messageText}>{senderName}: {msg.text}</p>
                                </div>
                                {reactionsCount > 0 && (
                                    <div className={styles.reactionsContainer} onClick={(e) => { e.stopPropagation(); handleOpenReactionsModal(msg.reactions); }}>
                                        {Object.entries(msg.reactions).map(([emoji]) => (
                                            <span key={emoji} className={styles.reactionEmoji}>{emoji}</span>
                                        ))}
                                        <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>
            {replyingTo && (
                <div className={styles.replyingToContext}>
                    <div className={styles.replyingToInfo}>
                        <p className={styles.replyingToTitle}>Replying to {replyingTo.sender.firstName}</p>
                        <p className={styles.replyingToText}>{replyingTo.text}</p>
                    </div>
                    <button onClick={handleCancelReply} className={styles.cancelReplyButton}>&times;</button>
                </div>
            )}
            <footer className={styles.messageInputForm}>
                <form onSubmit={handleSendMessage}>
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className={styles.input} />
                    <button type="submit" className={styles.sendButton}>Send</button>
                </form>
            </footer>
            <ReactionsModal reactions={reactionsModalData} onClose={handleCloseModal} />
        </div>
    );
};

export default ChatWindow;