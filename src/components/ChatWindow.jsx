import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import WebSocketComponent from './WebSocketComponent';
import ReactionsModal from './ReactionsModal';
import ReactionPicker from './ReactionPicker';
import styles from './ChatWindow.module.css';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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

const stringToHslColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 50%)`;
};

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

    const dragStartXRef = useRef(null);
    const DRAG_THRESHOLD = 50;

    const userIsAtBottomRef = useRef(true);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [animatedHeart, setAnimatedHeart] = useState(null);


    useEffect(() => {
        if (token) {
            const userInfo = getUserInfoFromToken(token);
            setLoggedInUser(userInfo);
        }
    }, [token]);

    const handleScroll = () => {
        if (messageListRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = messageListRef.current;
            const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
            userIsAtBottomRef.current = isAtBottom;
            if (isAtBottom) {
                setHasUnreadMessages(false);
            }
        }
    };

    const onMessageReceived = useCallback((message) => {
        setMessages(prevMessages => {
            const isSentByMe = message.sender.id === loggedInUser?.id;

            const optimisticMessageIndex = prevMessages.findIndex(m => m.id === message.clientMessageId);
            if (optimisticMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[optimisticMessageIndex] = message;
                if (isSentByMe) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
                return updatedMessages;
            }

            const existingMessageIndex = prevMessages.findIndex(m => m.id === message.id);
            if (existingMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[existingMessageIndex] = message;
                return updatedMessages;
            }

            const newMessages = [...prevMessages, message];

            setTimeout(() => {
                if (messageListRef.current) {
                    if (userIsAtBottomRef.current) {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        setHasUnreadMessages(true);
                    }
                }
            }, 0);

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
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        if (replyingTo) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const handleReact = (reaction) => {
        if (loggedInUser && activeEmojiPicker) {
            const payload = { messageId: activeEmojiPicker, reaction: reaction };
            sendMessage(payload, `/app/chat/${chatId}/react`);
        }
        setActiveEmojiPicker(null);
    };

    const handleOpenReactionsModal = (reactions) => setReactionsModalData(reactions);
    const handleCloseModal = () => setReactionsModalData(null);
    const handleCancelReply = () => {
        setReplyingTo(null);
        inputRef.current?.focus();
    };
    const handleBackClick = () => navigate('/chat');
    const handleClosePopups = () => setActiveEmojiPicker(null);

    const handleInteractionStart = (e, message) => {
        pressTimer.current = setTimeout(() => {
            setActiveEmojiPicker(message.id);
        }, 500);
        const clientX = e.clientX || e.touches[0].clientX;
        dragStartXRef.current = clientX;
    };
    const handleDoubleClick = (message) => {
        if (!loggedInUser) return;
        const payload = { messageId: message.id, reaction: '❤️' };
        sendMessage(payload, `/app/chat/${chatId}/react`);
        // Trigger the animation
        setAnimatedHeart(message.id);
        setTimeout(() => setAnimatedHeart(null), 500); // Animation duration
    };

    const handleInteractionEnd = (e, message) => {
        clearTimeout(pressTimer.current);

        if (activeEmojiPicker) {
            dragStartXRef.current = null;
            return;
        }

        const dragEndX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null);
        if (dragEndX && dragEndX - dragStartXRef.current > DRAG_THRESHOLD) {
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasUnreadMessages(false);
    };

    if (loading || !loggedInUser || !chatGroup) return <div className={styles.centeredMessage}>Loading messages...</div>;
    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                <button onClick={handleBackClick} className={styles.backButton}>&larr;</button>
                <h2>{chatGroup.name}</h2>
                <div className={styles.headerPlaceholder}></div>
            </header>
            <main ref={messageListRef} className={styles.messageList} onScroll={handleScroll} onClick={handleClosePopups}>
                {messages.map((msg) => {
                    const isSentByCurrentUser = Number(msg.sender.id) === loggedInUser.id;
                    const reactionsCount = msg.reactions ? Object.values(msg.reactions).flat().length : 0;
                    const parentMessage = msg.parentMessageId ? messages.find(m => m.id === msg.parentMessageId) : null;
                    const replyHeaderName = isSentByCurrentUser ? 'You replied to' : `Replied to`;

                    const senderInitials = msg.sender.firstName.charAt(0).toUpperCase() +
                        (msg.sender.lastName ? msg.sender.lastName.charAt(0).toUpperCase() : '');
                    const avatarColor = stringToHslColor(msg.sender.id.toString());

                    return (
                        <div key={msg.id} className={`${styles.message} ${isSentByCurrentUser ? styles.sent : styles.received}`}>
                            {!isSentByCurrentUser && (
                                <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
                                    {senderInitials}
                                </div>
                            )}
                            <div className={styles.messageContent}>
                                {parentMessage && (
                                    <div className={styles.repliedMessageSnippet}>
                                        <p className={styles.replyHeader}>
                                            <span className={styles.replyIcon}>&larr;</span>
                                            {replyHeaderName} {parentMessage.sender.firstName}:
                                        </p>
                                        <p>{parentMessage.text}</p>
                                    </div>
                                )}
                                {activeEmojiPicker === msg.id && (
                                    <ReactionPicker onReact={handleReact} onClose={() => setActiveEmojiPicker(null)} />
                                )}
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
                                    <div className={styles.reactionsContainer} onClick={(e) => { e.stopPropagation(); handleOpenReactionsModal(msg.reactions); }}>
                                        {Object.entries(msg.reactions).map(([emoji]) => (
                                            <span key={emoji} className={styles.reactionEmoji}>{emoji}</span>
                                        ))}
                                        <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                    </div>
                                )}
                            </div>
                            {/* Animated heart overlay */}
                            {animatedHeart === msg.id && (
                                <div className={`${styles.animatedHeart}`}>❤️</div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>
            {hasUnreadMessages && (
                <button className={styles.scrollToBottomIndicator} onClick={scrollToBottom}>
                    ↓
                </button>
            )}
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
                    <input type="text" ref={inputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className={styles.input} />
                    <button type="submit" className={styles.sendButton}>Send</button>
                </form>
            </footer>
            <ReactionsModal reactions={reactionsModalData} onClose={handleCloseModal} />
        </div>
    );
};

export default ChatWindow;