import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import useWebSocket from '../../hooks/useWebSocket.js'; // Adjust path if needed
import styles from './GlobalChatWindow.module.css'; // Use Global Chat CSS
import {
    FaPaperPlane, FaArrowLeft, FaChevronDown,
    FaImage, FaMicrophone, FaStop, FaSpinner, FaClock, // Keep relevant icons
    FaPlay, FaPause // Keep if audio is planned
} from 'react-icons/fa';
import Avatar from '../../components/common/Avatar.jsx';
// Removed imageCompression if not uploading images here

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- Hardcoded Names List (Updated with your list) ---
const ALL_USER_FIRST_NAMES = [
    "Debayan", "Indranil", "Rimjhim", "Samarpita", "Jayasree", "Nilotpal",
    "Shibojyoti", "Nunfeli", "Iman", "Paramita", "Amit", "Sampriti",
    "Rimi", "Liza", "Sandipan", "Tushar", "Udit", "Sagnik",
    "Anirudh", "Mrinal", "Avik", "Pikachu"
];
// --- End Hardcoded Names ---

// --- Helper Functions (Keep relevant ones) ---
const getUserInfoFromToken = (token) => { try { const decodedToken = jwtDecode(token); return { id: Number(decodedToken.id), username: decodedToken.sub, firstName: decodedToken.firstName, lastName: decodedToken.lastName }; } catch (error) { console.error('Failed to decode token:', error); return { id: null, username: null, firstName: null, lastName: null }; } };
const formatDate = (dateString) => { if (!dateString) return ''; const date = new Date(dateString); return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const isSameDay = (d1, d2) => { if (!d1 || !d2) return false; const date1 = new Date(d1); const date2 = new Date(d2); return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate(); };
const formatDateSeparator = (dateString) => { if (!dateString) return ''; const date = new Date(dateString); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (isSameDay(date, today)) return 'Today'; if (isSameDay(date, yesterday)) return 'Yesterday'; return date.toLocaleDateString([], { month: 'long', day: 'numeric' }); };
// --- End Helper Functions ---

// --- Audio Player Component (Optional: Keep if audio messages are planned) ---
// const AudioPlayer = ({ src }) => { ... };
// ---

const GlobalChatWindow = ({ token, onLogout }) => {
    // --- State and Refs ---
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const messageListRef = useRef(null);
    const messageRefs = useRef({}); // Keep if using scroll-to or read receipts
    const userIsAtBottomRef = useRef(true);

    // --- Hooks ---
    useEffect(() => { if (token) setLoggedInUser(getUserInfoFromToken(token)); }, [token]);
    const scrollToBottom = useCallback((behavior = 'smooth') => { if (messageListRef.current) { requestAnimationFrame(() => { if (messageListRef.current) { messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior }); } }); } }, []);

    const onMessageReceived = useCallback((message) => {
        const isAtBottom = userIsAtBottomRef.current;
        setMessages(prevMessages => {
            const optimisticIndex = prevMessages.findIndex(m => m.clientMessageId && m.clientMessageId === message.clientMessageId);
            if (optimisticIndex !== -1) {
                const updated = [...prevMessages];
                updated[optimisticIndex] = message;
                return updated;
            }
            if (prevMessages.some(m => m.id === message.id)) {
                return prevMessages;
            }
            return [...prevMessages, message];
        });
        if (!isAtBottom && !messages.some(m => m.id === message.id || m.clientMessageId === message.clientMessageId)) {
            setHasUnreadMessages(true);
        }
    }, [messages]);

    useEffect(() => { if (userIsAtBottomRef.current) { scrollToBottom('smooth'); } }, [messages, scrollToBottom]);

    const { sendMessage } = useWebSocket({
        onMessageReceived,
        token,
        chatId: 'global', // Identifier for global topic
        isGlobal: true   // Flag if hook needs it
    });

    useEffect(() => {
        const fetchGlobalMessages = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/api/global-chat/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch global messages (Status: ${response.status})`);
                }
                const messagesData = await response.json();
                setMessages(messagesData);
                setTimeout(() => scrollToBottom('auto'), 0);
            } catch (err) {
                console.error("Error fetching global chat data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchGlobalMessages();
        } else {
            setError("Authentication token not found.");
            setLoading(false);
        }
    }, [token, scrollToBottom]);

    const handleScroll = () => { if (messageListRef.current) { const { scrollHeight, scrollTop, clientHeight } = messageListRef.current; const isNearBottom = scrollHeight - scrollTop - clientHeight < 50; userIsAtBottomRef.current = isNearBottom; if (isNearBottom) { setHasUnreadMessages(false); } } };

    // --- Message Sending ---
    const handleSendMessage = (event) => {
        event?.preventDefault();
        let txtToSend = newMessage.trim(); // Start with the original trimmed message
        if (txtToSend === '' || !loggedInUser) {
            return;
        }

        // --- Autocomplete @mention Logic (REFINED for @Everyone Punctuation) ---
        // 1. Handle @Everyone equivalent first, preserving punctuation
        txtToSend = txtToSend.replace(/@([?!.]*)(?=\s|$)/g, (match, punctuation) => {
            return `@Everyone${punctuation}`;
        });

        // 2. Handle specific user mentions, capturing trailing punctuation
        const mentionRegex = /@([a-zA-Z][a-zA-Z0-9]{2,})([^\w\s]*)(?=\s|$)/g;

        txtToSend = txtToSend.replace(mentionRegex, (match, typedPrefix, punctuation) => {
            if (typedPrefix.toLowerCase() === 'everyone') {
                return match; // Already handled
            }

            const prefixLower = typedPrefix.toLowerCase();
            const potentialMatches = ALL_USER_FIRST_NAMES.filter(name =>
                name.toLowerCase().startsWith(prefixLower)
            );

            if (potentialMatches.length === 1) {
                const correctName = potentialMatches[0];
                return `@${correctName}${punctuation}`;
            } else {
                return match;
            }
        });
        // --- End Autocomplete Logic ---

        const clientMsgId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: clientMsgId,
            clientMessageId: clientMsgId,
            text: txtToSend,
            sender: { id: loggedInUser.id, firstName: loggedInUser.firstName || 'User', lastName: loggedInUser.lastName || '' },
            timestamp: new Date().toISOString(),
            reactions: {},
            seenBy: [],
        };
        setMessages(prev => [...prev, optimisticMsg]);

        sendMessage({ text: txtToSend, clientMessageId: clientMsgId });

        setNewMessage('');
        if(textareaRef.current) textareaRef.current.style.height = 'auto';
        setTimeout(() => scrollToBottom('smooth'), 50);
    };

    const handleTextareaInput = (e) => {
        const text = e.target.value;
        setNewMessage(text);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // --- Function to render mentions with bold style (Handles Punctuation) ---
    const renderMessageWithMentions = (text) => {
        if (!text) return null;
        // Regex: Find @, capture name part (word chars or "everyone" case-insensitive), capture trailing punctuation
        const mentionRegex = /@((?:everyone|[\w]+))([^\w\s]*?(?=\s|$))/gi;

        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            const mentionName = match[1];
            const punctuation = match[2] || "";
            const nameLower = mentionName.toLowerCase();
            const isKnownMention = ALL_USER_FIRST_NAMES.some(name => name.toLowerCase() === nameLower);
            const isEveryone = nameLower === 'everyone';

            if (isKnownMention || isEveryone) {
                const displayName = isEveryone ? "Everyone" : mentionName; // Use correct case for Everyone
                parts.push(
                    <span key={match.index} className={styles.mentionHighlight}>
                        @{displayName}{punctuation}
                    </span>
                );
            } else {
                parts.push(`@${mentionName}${punctuation}`); // Render unknown as plain text
            }
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }
        return parts;
    };


    // --- Render Logic ---
    if (loading || !loggedInUser) { return <div className={styles.centeredMessage}>Loading...</div>; }
    if (error) { return (<div className={styles.globalChatWindow}> <header className={styles.chatHeader}> <button onClick={() => navigate('/chat')} className={styles.backButton}><FaArrowLeft /></button> <h2>Error</h2> <div className={styles.headerActions}></div> </header> <div className={styles.centeredMessage}>{error}</div> </div>); }

    return (
        <div className={styles.globalChatWindow}>
            <header className={styles.chatHeader}>
                <button onClick={() => navigate('/chat')} className={styles.backButton} title="Back to Chat List"> <FaArrowLeft /> </button>
                <div className={styles.headerTitleContainer}>
                    <h2>Global Chat</h2>
                </div>
                <div className={styles.headerActions}> </div>
            </header>

            <main ref={messageListRef} className={styles.messageList} onScroll={handleScroll}>
                {messages.map((msg, index) => {
                    const prevMsg = messages[index - 1];
                    const isSentByCurrentUser = Number(msg.sender?.id) === loggedInUser?.id;
                    const isSameSenderAsPrevious = prevMsg && prevMsg.sender?.id === msg.sender?.id;
                    const isTimestampClose = prevMsg && msg.timestamp && prevMsg.timestamp && (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000);
                    const isFirstInGroup = !isSameSenderAsPrevious || !isTimestampClose || !isSameDay(prevMsg?.timestamp, msg.timestamp);
                    const showDateSeparator = !prevMsg || !isSameDay(prevMsg?.timestamp, msg.timestamp);
                    const showTimestamp = true;
                    const messageNodeRef = (node) => { messageRefs.current[msg.id] = node; };

                    return (
                        <React.Fragment key={msg.id || msg.clientMessageId}>
                            {showDateSeparator && <div className={styles.dateSeparator}><span>{formatDateSeparator(msg.timestamp)}</span></div>}
                            <div
                                ref={messageNodeRef}
                                data-message-id={msg.id}
                                className={`${styles.messageWrapper} ${isSentByCurrentUser ? styles.sent : styles.received} ${isFirstInGroup ? '' : styles.grouped}`}
                            >
                                {!isSentByCurrentUser && (
                                    <div className={styles.avatarContainer}>
                                        {isFirstInGroup && msg.sender && (
                                            <div className={styles.chatAvatarWrapper}>
                                                <Avatar userId={msg.sender.id} name={msg.sender.firstName} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    {!isSentByCurrentUser && isFirstInGroup && msg.sender && (
                                        <div className={styles.senderName}>{msg.sender.firstName} {msg.sender.lastName}</div>
                                    )}
                                    <div className={styles.bubbleContainer}>
                                        <div className={styles.messageBubble} >
                                            {msg.text && <p className={styles.messageText}>{renderMessageWithMentions(msg.text)}</p>}
                                            {msg.clientMessageId && !msg.id && (<FaClock className={styles.optimisticIcon} />)}
                                        </div>
                                    </div>
                                    {showTimestamp && msg.timestamp && (
                                        <div className={styles.timestampContainer}>
                                            <span className={styles.timestamp}>{formatDate(msg.timestamp)}</span>
                                            {isSentByCurrentUser && msg.clientMessageId && !msg.id && (<FaClock className={styles.optimisticIcon} style={{marginLeft: '4px'}}/>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {hasUnreadMessages &&
                <button className={`${styles.scrollToBottomIndicator} ${styles.visible}`} onClick={() => scrollToBottom('smooth')}>
                    <FaChevronDown /> New Messages
                </button>
            }

            <footer className={`${styles.messageInputForm}`}>
                <div className={styles.actionButtonsContainer} style={{maxWidth: '0', opacity: 0, visibility: 'hidden'}}>
                </div>
                <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder={"Message Global Chat..."}
                    rows="1"
                    className={styles.messageInput}
                />
                <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className={styles.sendButton}
                >
                    <FaPaperPlane />
                </button>
            </footer>
        </div>
    );
};

export default GlobalChatWindow;