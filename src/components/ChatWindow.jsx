import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import WebSocketComponent from './WebSocketComponent';
import ReactionsModal from './ReactionsModal';
import ReactionPicker from './ReactionPicker';
import styles from './ChatWindow.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Helper Functions ---
const getUserInfoFromToken = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        return { id: Number(decodedToken.id), username: decodedToken.sub };
    } catch (error) {
        console.error('Failed to decode token:', error);
        return { id: null, username: null };
    }
};

const stringToHslColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 50%)`;
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const isSameDay = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
};

// --- Component ---
const ChatWindow = ({ token, onLogout }) => {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);

    const [chatGroup, setChatGroup] = useState(null);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [reactionsModalData, setReactionsModalData] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const pressTimer = useRef(null);
    const messageListRef = useRef(null);
    const messageRefs = useRef({});

    const dragStartXRef = useRef(null);
    const DRAG_THRESHOLD = 50;

    const userIsAtBottomRef = useRef(true);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [animatedHeart, setAnimatedHeart] = useState(null);

    useEffect(() => {
        if (token) setLoggedInUser(getUserInfoFromToken(token));
    }, [token]);

    // ** NEW, MORE RELIABLE SCROLLING LOGIC **
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]); // This effect runs whenever a new message is added

    const handleScroll = () => {
        if (messageListRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = messageListRef.current;
            // Check if the user is close to the bottom
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            userIsAtBottomRef.current = isAtBottom;
            if (isAtBottom) {
                setHasUnreadMessages(false);
            }
        }
    };

    const onMessageReceived = useCallback((message) => {
        // If the user is not at the bottom, show the "new message" indicator
        if (!userIsAtBottomRef.current) {
            setHasUnreadMessages(true);
        }

        setMessages(prevMessages => {
            const optimisticIndex = prevMessages.findIndex(m => m.id === message.clientMessageId);
            if (optimisticIndex !== -1) {
                const updated = [...prevMessages];
                updated[optimisticIndex] = message;
                return updated;
            }

            const existingMessageIndex = prevMessages.findIndex(m => m.id === message.id);
            if (existingMessageIndex !== -1) {
                const updated = [...prevMessages];
                updated[existingMessageIndex] = message;
                return updated;
            }

            return [...prevMessages, message];
        });
    }, []);

    const { sendMessage } = WebSocketComponent({ onMessageReceived, token, chatId });

    useEffect(() => {
        const fetchChatData = async () => {
            setLoading(true);
            try {
                const [msgRes, grpRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/chat/messages/${chatId}`, { headers: { 'Authorization': `Bearer ${token}`} }),
                    fetch(`${API_BASE_URL}/api/chat/groups`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!msgRes.ok || !grpRes.ok) throw new Error('Failed to fetch chat data.');
                const messagesData = await msgRes.json();
                const groupsData = await grpRes.json();
                const currentGroup = groupsData.find(p => p.chatGroup.id === chatId)?.chatGroup;
                if (currentGroup) {
                    setChatGroup(currentGroup);
                    setMessages(messagesData);
                    // Initial scroll to bottom on load
                    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 0);
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
        if (chatId && token) fetchChatData();
    }, [chatId, token, onLogout]);

    useEffect(() => {
        if (replyingTo) {
            inputRef.current?.focus();
        }
    }, [replyingTo]);

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
            parentMessageId: replyingTo ? replyingTo.id : null,
        };
        setMessages(prev => [...prev, optimisticMessage]);
        sendMessage({
            text: newMessage.trim(),
            clientMessageId,
            parentMessageId: replyingTo ? replyingTo.id : null,
        }, `/app/chat/${chatId}/send`);
        setNewMessage('');
        setReplyingTo(null);
    };

    const handleReact = (reaction) => {
        if (loggedInUser && activeEmojiPicker) {
            sendMessage({ messageId: activeEmojiPicker, reaction }, `/app/chat/${chatId}/react`);
        }
        setActiveEmojiPicker(null);
    };

    const handleDoubleClick = (message) => {
        if (!loggedInUser) return;

        const reactionType = '❤️';
        setMessages(prevMessages => prevMessages.map(m => {
            if (m.id === message.id) {
                const newReactions = JSON.parse(JSON.stringify(m.reactions || {}));
                if (!newReactions[reactionType]) {
                    newReactions[reactionType] = [];
                }
                const userReactedIndex = newReactions[reactionType].findIndex(user => user.id === loggedInUser.id);
                if (userReactedIndex === -1) {
                    newReactions[reactionType].push({
                        id: loggedInUser.id,
                        firstName: loggedInUser.username,
                    });
                }
                return { ...m, reactions: newReactions };
            }
            return m;
        }));

        sendMessage({ messageId: message.id, reaction: reactionType }, `/app/chat/${chatId}/react`);
        setAnimatedHeart(message.id);
        setTimeout(() => setAnimatedHeart(null), 500);
    };

    const handleInteractionStart = (e, message) => {
        pressTimer.current = setTimeout(() => setActiveEmojiPicker(message.id), 500);
        dragStartXRef.current = e.clientX || e.touches[0].clientX;
    };

    const handleInteractionEnd = (e, message) => {
        clearTimeout(pressTimer.current);
        if (activeEmojiPicker) {
            dragStartXRef.current = null;
            return;
        }
        const dragEndX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null);
        if (dragEndX && dragEndX - (dragStartXRef.current || 0) > DRAG_THRESHOLD) {
            setReplyingTo(message);
        }
        dragStartXRef.current = null;
    };

    const handleInteractionMove = (e) => {
        if (pressTimer.current && dragStartXRef.current !== null) {
            const currentX = e.clientX || e.touches[0].clientX;
            if (Math.abs(currentX - dragStartXRef.current) > 5) {
                clearTimeout(pressTimer.current);
            }
        }
    };

    const handleScrollToMessage = (messageId) => {
        const messageElement = messageRefs.current[messageId];
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add(styles.highlight);
            setTimeout(() => {
                messageElement.classList.remove(styles.highlight);
            }, 1500);
        }
    };

    if (loading || !loggedInUser || !chatGroup) return <div className={styles.centeredMessage}>Loading...</div>;

    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                <button onClick={() => navigate('/chat')} className={styles.backButton}>&larr;</button>
                <h2>{chatGroup.name}</h2>
            </header>
            <main ref={messageListRef} className={styles.messageList} onScroll={handleScroll}>
                {messages.map((msg, index) => {
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];
                    const isSentByCurrentUser = Number(msg.sender.id) === loggedInUser.id;
                    const isFirstInGroup = !prevMsg || prevMsg.sender.id !== msg.sender.id || !isSameDay(prevMsg.timestamp, msg.timestamp);
                    const showDateSeparator = !prevMsg || !isSameDay(prevMsg.timestamp, msg.timestamp);
                    const showTimestamp = !nextMsg || nextMsg.sender.id !== msg.sender.id || formatDate(nextMsg.timestamp) !== formatDate(msg.timestamp);

                    const parentMessage = msg.parentMessageId ? messages.find(m => m.id === msg.parentMessageId) : null;
                    const reactionsCount = msg.reactions ? Object.values(msg.reactions).flat().length : 0;
                    const senderInitials = msg.sender.firstName.charAt(0).toUpperCase() + (msg.sender.lastName ? msg.sender.lastName.charAt(0).toUpperCase() : '');
                    const avatarColor = stringToHslColor(msg.sender.id.toString());

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateSeparator && <div className={styles.dateSeparator}><span>{formatDateSeparator(msg.timestamp)}</span></div>}
                            <div
                                ref={el => messageRefs.current[msg.id] = el}
                                className={`${styles.messageWrapper} ${isSentByCurrentUser ? styles.sent : styles.received} ${isFirstInGroup ? '' : styles.grouped}`}
                            >
                                {!isSentByCurrentUser && (
                                    <div className={styles.avatarContainer}>
                                        {isFirstInGroup && <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>{senderInitials}</div>}
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    <div className={styles.bubbleContainer}>
                                        {parentMessage && (
                                            <div className={styles.repliedMessageSnippet} onClick={() => handleScrollToMessage(parentMessage.id)}>
                                                <p className={styles.replyHeader}>Replied to {parentMessage.sender.firstName}</p>
                                                <p className={styles.replyText}>{parentMessage.text}</p>
                                            </div>
                                        )}
                                        {activeEmojiPicker === msg.id && <ReactionPicker onReact={handleReact} onClose={() => setActiveEmojiPicker(null)} />}
                                        <div
                                            className={styles.messageBubble}
                                            onMouseDown={(e) => handleInteractionStart(e, msg)}
                                            onMouseUp={(e) => handleInteractionEnd(e, msg)}
                                            onMouseMove={handleInteractionMove}
                                            onMouseLeave={(e) => handleInteractionEnd(e, msg)}
                                            onTouchStart={(e) => handleInteractionStart(e, msg)}
                                            onTouchMove={handleInteractionMove}
                                            onTouchEnd={(e) => handleInteractionEnd(e, msg)}
                                            onDoubleClick={() => handleDoubleClick(msg)}
                                            onDragStart={(e) => e.preventDefault()}
                                        >
                                            <p className={styles.messageText}>{msg.text}</p>
                                        </div>
                                        {reactionsCount > 0 && (
                                            <div className={styles.reactionsContainer} onClick={() => setReactionsModalData(msg.reactions)}>
                                                {Object.entries(msg.reactions).map(([emoji]) => (<span className={styles.reactionEmoji} key={emoji}>{emoji}</span>))}
                                                <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                            </div>
                                        )}
                                    </div>
                                    {showTimestamp && <span className={styles.timestamp}>{formatDate(msg.timestamp)}</span>}
                                </div>
                                {animatedHeart === msg.id && <div className={styles.animatedHeart}>❤️</div>}
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>
            {hasUnreadMessages && <button className={styles.scrollToBottomIndicator} onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}>↓</button>}
            {replyingTo && (
                <div className={styles.replyingToContext}>
                    <div className={styles.replyContextContent}>
                        <p className={styles.replyingToTitle}>Replied to {replyingTo.sender.firstName}</p>
                        <p className={styles.replyingToText}>{replyingTo.text}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className={styles.cancelReplyButton}>&times;</button>
                </div>
            )}
            <footer className={styles.messageInputForm}>
                <form onSubmit={handleSendMessage}>
                    <input type="text" ref={inputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message..." />
                    <button type="submit">Send</button>
                </form>
            </footer>
            <ReactionsModal reactions={reactionsModalData} onClose={() => setReactionsModalData(null)} />
        </div>
    );
};

export default ChatWindow;