import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import useWebSocket from '../../hooks/useWebSocket.js';
import ReactionsModal from './components/ReactionsModal.jsx';
import ReactionPicker from './components/ReactionPicker.jsx';
import ChatIncidentDetailModal from './components/ChatIncidentDetailModal.jsx';
import Lightbox from '../../components/common/Lightbox.jsx';
import styles from './ChatWindow.module.css';
import {
    FaPaperPlane, FaInfoCircle, FaCheck, FaCheckDouble, FaArrowLeft, FaChevronDown,
    FaPlus, FaCamera, FaImage, FaMicrophone, FaStop, FaSpinner, FaFileAudio, FaFileVideo, FaFileImage, FaFileAlt, FaClock, FaUsers,
    FaPlay, FaPause
} from 'react-icons/fa';
import Avatar from '../../components/common/Avatar.jsx';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- Hardcoded Names List (Updated with your list) ---
const TEAM_MEMBER_FIRST_NAMES = [
    "Debayan", "Indranil", "Rimjhim", "Samarpita", "Jayasree", "Nilotpal",
    "Shibojyoti", "Nunfeli", "Iman", "Paramita", "Amit", "Sampriti",
    "Rimi", "Liza", "Sandipan", "Tushar", "Udit", "Sagnik",
    "Anirudh", "Mrinal", "Avik", "Pikachu"
];
// --- End Hardcoded Names ---


// --- Helper Functions (Unchanged) ---
const getUserInfoFromToken = (token) => { try { const decodedToken = jwtDecode(token); return { id: Number(decodedToken.id), username: decodedToken.sub }; } catch (error) { console.error('Failed to decode token:', error); return { id: null, username: null }; } };
const formatDate = (dateString) => { if (!dateString) return ''; const date = new Date(dateString); return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const isSameDay = (d1, d2) => { if (!d1 || !d2) return false; const date1 = new Date(d1); const date2 = new Date(d2); return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate(); };
const formatDateSeparator = (dateString) => { if (!dateString) return ''; const date = new Date(dateString); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (isSameDay(date, today)) return 'Today'; if (isSameDay(date, yesterday)) return 'Yesterday'; return date.toLocaleDateString([], { month: 'long', day: 'numeric' }); };
// --- End Helper Functions ---

// --- Audio Player Component (Unchanged) ---
const AudioPlayer = ({ src }) => {
    const audioRef = useRef(null); const [isPlaying, setIsPlaying] = useState(false); const [duration, setDuration] = useState(0); const [currentTime, setCurrentTime] = useState(0); const waveformBars = useMemo(() => Array.from({ length: 30 }, () => Math.random() * 80 + 20), []); const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); }; const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }; const togglePlayPause = (e) => { e.stopPropagation(); if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); } setIsPlaying(!isPlaying); }; const formatTime = (timeInSeconds) => { if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds === 0) { return '0:00'; } const minutes = Math.floor(timeInSeconds / 60); const seconds = Math.floor(timeInSeconds % 60); return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; };
    return ( <div className={styles.audioPlayerContainer}> <audio ref={audioRef} src={src} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} preload="metadata" /> <button onClick={togglePlayPause} className={styles.audioPlayButton}> {isPlaying ? <FaPause /> : <FaPlay />} </button> <div className={styles.waveformContainer}> {waveformBars.map((height, i) => (<div key={i} className={styles.waveformBar} style={{ height: `${height}%` }} />))} </div> <span className={styles.audioTimestamp}> {formatTime(duration)} </span> </div> );
};
// --- End Audio Player Component ---

const ChatWindow = ({ token, onLogout }) => {
    // --- State and Refs ---
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [chatGroup, setChatGroup] = useState(null);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [reactionsModalData, setReactionsModalData] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [animatedHeart, setAnimatedHeart] = useState(null);
    const readObserver = useRef(null);
    const messageListRef = useRef(null);
    const messageRefs = useRef({});
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const imageInputRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const userIsAtBottomRef = useRef(true);

    // --- Removed suggestion state ---

    // --- Hooks (Unchanged) ---
    useEffect(() => { if (token) setLoggedInUser(getUserInfoFromToken(token)); }, [token]);
    const scrollToBottom = useCallback((behavior = 'smooth') => { if (messageListRef.current) { requestAnimationFrame(() => { if (messageListRef.current) { messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior }); } }); } }, []);
    const onMessageReceived = useCallback((message) => { const isAtBottom = userIsAtBottomRef.current; setMessages(prevMessages => { const optimisticIndex = prevMessages.findIndex(m => m.clientMessageId && m.clientMessageId === message.clientMessageId); if (optimisticIndex !== -1) { const updated = [...prevMessages]; updated[optimisticIndex] = message; return updated; } const existingMessageIndex = prevMessages.findIndex(m => m.id === message.id); if (existingMessageIndex !== -1) { const updated = [...prevMessages]; updated[existingMessageIndex] = message; return updated; } if (prevMessages.some(m => m.id === message.id)) { return prevMessages; } return [...prevMessages, message]; }); if (!isAtBottom && !messages.some(m => m.id === message.id || m.clientMessageId === message.clientMessageId)) { setHasUnreadMessages(true); } }, [messages]);
    useEffect(() => { if (userIsAtBottomRef.current) { scrollToBottom('smooth'); } }, [messages]);
    const { sendMessage } = useWebSocket({ onMessageReceived, token, chatId });
    useEffect(() => { const fetchChatData = async () => { setLoading(true); setError(null); try { const [msgRes, grpRes] = await Promise.all([ fetch(`${API_BASE_URL}/api/chat/messages/${chatId}`, { headers: { 'Authorization': `Bearer ${token}` } }), fetch(`${API_BASE_URL}/api/chat/groups`, { headers: { 'Authorization': `Bearer ${token}` } }) ]); if (!msgRes.ok) throw new Error(`Fetch messages failed (Status: ${msgRes.status})`); if (!grpRes.ok) throw new Error(`Fetch groups failed (Status: ${grpRes.status})`); const messagesData = await msgRes.json(); const groupsData = await grpRes.json(); const currentGroupParticipant = groupsData.find(p => p.chatGroup.id === chatId); if (currentGroupParticipant) { setChatGroup(currentGroupParticipant.chatGroup); setMessages(messagesData); setTimeout(() => scrollToBottom('auto'), 0); } else { throw new Error('Chat group not found or you are not a participant.'); } } catch (err) { console.error("Error fetching chat data:", err); setError(err.message); } finally { setLoading(false); } }; if (chatId && token) { fetchChatData(); } else if (!token) { setError("Authentication token not found."); setLoading(false); } }, [chatId, token, navigate]);
    const handleMarkAsRead = useCallback((messageId) => { if (!messageId || !loggedInUser) return; const message = messages.find(m => m.id === messageId); if (!message || message.sender?.id === loggedInUser.id || message.seenBy?.some(user => user.id === loggedInUser.id)) { return; } sendMessage({ messageId }, `/app/chat/${chatId}/read`); }, [sendMessage, chatId, messages, loggedInUser]);
    useEffect(() => { if (readObserver.current) readObserver.current.disconnect(); const observerCallback = (entries) => { entries.forEach(entry => { if (entry.isIntersecting && entry.intersectionRatio >= 0.7) { const messageId = entry.target.dataset.messageId; handleMarkAsRead(messageId); readObserver.current.unobserve(entry.target); } }); }; readObserver.current = new IntersectionObserver(observerCallback, { root: messageListRef.current, threshold: 0.7 }); messages.forEach(msg => { const element = messageRefs.current[msg.id]; const isReadByMe = msg.seenBy?.some(user => user.id === loggedInUser?.id); if (element && msg.id && !msg.clientMessageId && msg.sender?.id !== loggedInUser?.id && !isReadByMe) { try { readObserver.current.observe(element); } catch (e) { console.warn("Observer error:", e); } } }); return () => { if (readObserver.current) readObserver.current.disconnect(); }; }, [messages, loggedInUser, handleMarkAsRead]);
    const handleScroll = () => { if (messageListRef.current) { const { scrollHeight, scrollTop, clientHeight } = messageListRef.current; const isNearBottom = scrollHeight - scrollTop - clientHeight < 50; userIsAtBottomRef.current = isNearBottom; if (isNearBottom) { setHasUnreadMessages(false); } } };

    // --- Media Handling (Unchanged) ---
    const handleMediaUpload = async (file) => { if (!file || !chatId || !token || !loggedInUser) return; setIsUploading(true); setUploadError(''); let processedFile = file; let mediaTypeString = 'UNKNOWN'; try { if (file.type.startsWith('image/')) { mediaTypeString = 'IMAGE'; const compOptions = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/jpeg', quality: 0.7 }; try { const compBlob = await imageCompression(file, compOptions); const fName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg'; processedFile = new File([compBlob], fName, { type: 'image/jpeg', lastModified: file.lastModified }); } catch (compErr) { console.warn("Img compression failed", compErr); processedFile = file; } } else if (file.type.startsWith('video/')) { mediaTypeString = 'VIDEO'; } else if (file.type.startsWith('audio/')) { mediaTypeString = 'AUDIO'; } else { throw new Error("Unsupported file type."); } const formData = new FormData(); formData.append('media', processedFile); const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/media`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData }); const result = await response.json(); if (!response.ok) throw new Error(result.message || `Upload failed`); const clientMsgId = `temp-${Date.now()}`; const txtToSend = newMessage.trim(); const optimisticMsg = { id: clientMsgId, clientMessageId: clientMsgId, text: txtToSend || null, sender: { id: loggedInUser.id, firstName: 'You', lastName: '' }, timestamp: new Date().toISOString(), reactions: {}, seenBy: [], parentMessageId: replyingTo ? replyingTo.id : null, mediaUrl: result.mediaUrl, mediaType: result.mediaType }; setMessages(prev => [...prev, optimisticMsg]); sendMessage({ text: txtToSend || null, clientMessageId: clientMsgId, parentMessageId: replyingTo ? replyingTo.id : null, mediaUrl: result.mediaUrl, mediaType: result.mediaType }, `/app/chat/${chatId}/send`); setNewMessage(''); setReplyingTo(null); if(textareaRef.current) textareaRef.current.style.height = 'auto'; setTimeout(() => scrollToBottom('smooth'), 50); } catch (err) { console.error("Media error:", err); setUploadError(err.message); setTimeout(() => setUploadError(''), 5000); } finally { setIsUploading(false); if(imageInputRef.current) imageInputRef.current.value = null; } };
    const handleFileSelected = (event) => { const file = event.target.files?.[0]; if (file) { handleMediaUpload(file); } event.target.value = null; };
    const startRecording = async () => { /* ... Unchanged ... */ };
    const stopRecording = () => { /* ... Unchanged ... */ };

    // --- UPDATED handleSendMessage with punctuation handling for @Everyone ---
    const handleSendMessage = (event) => {
        event?.preventDefault();
        let txtToSend = newMessage.trim(); // Start with the original trimmed message
        if ((txtToSend === '' && !isUploading) || !loggedInUser || isRecording) {
            return;
        }
        if (isUploading) {
            return;
        }

        // --- Autocomplete @mention Logic (REFINED for @Everyone Punctuation) ---

        // 1. Handle @Everyone equivalent first, preserving punctuation
        // Regex: Find @, capture punctuation ([?!.]*) or nothing, followed by space or end.
        txtToSend = txtToSend.replace(/@([?!.]*)(?=\s|$)/g, (match, punctuation) => {
            return `@Everyone${punctuation}`; // Replace @ with @Everyone, keep punctuation
        });

        // 2. Handle specific user mentions, capturing trailing punctuation
        // Regex: Find @, capture 3+ letters, capture 0+ trailing non-letter/non-space chars,
        // followed by space or end of string.
        // Important: Ensure this regex doesn't overlap with the @Everyone replacement above if possible
        // Let's refine it to ensure the first char after @ is a letter for user mentions.
        const mentionRegex = /@([a-zA-Z][a-zA-Z0-9]{2,})([^\w\s]*)(?=\s|$)/g;

        txtToSend = txtToSend.replace(mentionRegex, (match, typedPrefix, punctuation) => {
            // Check if it's actually "Everyone" (case-insensitive) - already handled above, but as a safeguard
            if (typedPrefix.toLowerCase() === 'everyone') {
                return match; // Should have been replaced already
            }

            const prefixLower = typedPrefix.toLowerCase();
            const potentialMatches = TEAM_MEMBER_FIRST_NAMES.filter(name =>
                name.toLowerCase().startsWith(prefixLower)
            );

            if (potentialMatches.length === 1) {
                const correctName = potentialMatches[0];
                return `@${correctName}${punctuation}`; // Re-append punctuation
            } else {
                return match; // Keep original if no unique match or "Everyone"
            }
        });
        // --- End Autocomplete Logic ---

        const clientMsgId = `temp-${Date.now()}`;
        const optimisticMsg = { /* ... (rest of optimistic message setup is the same) ... */
            id: clientMsgId,
            clientMessageId: clientMsgId,
            text: txtToSend, // Use the fully processed text
            sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
            timestamp: new Date().toISOString(),
            reactions: {},
            seenBy: [],
            parentMessageId: replyingTo ? replyingTo.id : null,
        };
        setMessages(prev => [...prev, optimisticMsg]);

        sendMessage({ text: txtToSend, clientMessageId: clientMsgId, parentMessageId: replyingTo ? replyingTo.id : null }, `/app/chat/${chatId}/send`);

        setNewMessage('');
        setReplyingTo(null);
        if(textareaRef.current) textareaRef.current.style.height = 'auto';
        setTimeout(() => scrollToBottom('smooth'), 50);
    };

    // --- UPDATED renderMessageWithMentions with punctuation handling ---
    const renderMessageWithMentions = (text) => {
        if (!text) return null;
        // Regex: Find @, capture the name part (non-space, non-punctuation at end), capture trailing punctuation
        // Adjusted to better capture name vs punctuation.
        // Capture word characters (\w includes letters, numbers, _) OR capture "Everyone" case-insensitively
        // Then capture any trailing non-word/non-space characters.
        const mentionRegex = /@((?:everyone|[\w]+))([^\w\s]*?(?=\s|$))/gi; // Added 'i' for case-insensitive Everyone

        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            // Add text before the mention
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }

            const mentionName = match[1]; // Name part (e.g., "Demson", "Everyone")
            const punctuation = match[2] || ""; // Punctuation part (e.g., "??", "")

            // Check if the name part is a known mention or "Everyone"
            const nameLower = mentionName.toLowerCase();
            const isKnownMention = TEAM_MEMBER_FIRST_NAMES.some(
                name => name.toLowerCase() === nameLower
            );
            const isEveryone = nameLower === 'everyone';

            if (isKnownMention || isEveryone) {
                // Add the highlighted mention + punctuation
                // Use the original case for "Everyone" if matched that way for display
                const displayName = isEveryone ? "Everyone" : mentionName;
                parts.push(
                    <span key={match.index} className={styles.mentionHighlight}>
                        @{displayName}{punctuation}
                    </span>
                );
            } else {
                // Add the non-recognized mention as plain text
                parts.push(`@${mentionName}${punctuation}`);
            }

            lastIndex = match.index + match[0].length;
        }

        // Add any remaining text after the last mention
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts; // Return array of strings/elements
    };
    // --- handleTextareaInput (Unchanged from previous simplified version) ---
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
    const handleReact = (reaction) => { if (loggedInUser && activeEmojiPicker) { sendMessage({ messageId: activeEmojiPicker, reaction }, `/app/chat/${chatId}/react`); } setActiveEmojiPicker(null); };
    const handleScrollToMessage = (messageId) => { const element = messageRefs.current[messageId]; if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'center' }); element.classList.add(styles.highlight); setTimeout(() => { element.classList.remove(styles.highlight); }, 1500); } };

    // --- Simplified Interaction Handlers (Unchanged) ---
    const handleSingleClick = (e, message) => {
        e.stopPropagation();
        if (message.messageType === 'IMAGE') {
            setLightboxSrc(`${API_BASE_URL}${message.mediaUrl}`);
        }
    };
    const handleDoubleClick = (e, message) => {
        e.stopPropagation();
        if (!loggedInUser || !message?.id || message?.clientMessageId) return;
        const reactionType = '❤️';
        sendMessage({ messageId: message.id, reaction: reactionType }, `/app/chat/${chatId}/react`);
        setAnimatedHeart(message.id);
        setTimeout(() => setAnimatedHeart(null), 600);
    };
    const handleLongPress = (e, message) => {
        e.preventDefault();
        e.stopPropagation();
        if (message?.clientMessageId) return;
        setActiveEmojiPicker(message.id);
    };
    // --- End Simplified Handlers ---

    // --- Render Logic ---
    if (loading || !loggedInUser || !chatGroup) { return <div className={styles.centeredMessage}>Loading...</div>; }
    if (error) { return (<div className={styles.chatWindow}> <header className={styles.chatHeader}> <button onClick={() => navigate('/chat')} className={styles.backButton}><FaArrowLeft /></button> <div className={styles.headerTitleContainer}><h2>Error</h2></div> <div className={styles.headerActions}></div> </header> <div className={styles.centeredMessage}>{error}</div> </div>); }

    const renderMedia = (msg) => {
        if (!msg.mediaUrl || !msg.mediaType) return null;
        const mediaFullUrl = `${API_BASE_URL}${msg.mediaUrl}`;
        switch (msg.mediaType) {
            case 'IMAGE':
                return <img src={mediaFullUrl} alt="Chat media" className={styles.chatMediaImage} loading="lazy" />;
            case 'VIDEO':
                return <video src={mediaFullUrl} controls className={styles.chatMediaVideo} />;
            case 'AUDIO':
                return <AudioPlayer src={mediaFullUrl} />;
            default:
                return <a href={mediaFullUrl} target="_blank" rel="noopener noreferrer" className={styles.chatMediaLink}> <FaFileAlt/> Download File</a>;
        }
    };

    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                <button onClick={() => navigate('/chat')} className={styles.backButton} title="Back to Chat List"> <FaArrowLeft /> </button>
                <button onClick={() => setIsIncidentModalOpen(true)} className={styles.headerTitleContainer}>
                    <h2>{chatGroup.name}</h2>
                    <FaInfoCircle className={styles.headerIcon} />
                </button>
                <div className={styles.headerActions}> </div>
            </header>

            <main ref={messageListRef} className={styles.messageList} onScroll={handleScroll}>
                {messages.map((msg, index) => {
                    // ... (keep existing map logic setup) ...
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];
                    const isSentByCurrentUser = Number(msg.sender?.id) === loggedInUser?.id;
                    const isSameSenderAsPrevious = prevMsg && prevMsg.sender?.id === msg.sender?.id;
                    const isTimestampClose = prevMsg && msg.timestamp && prevMsg.timestamp && (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000);
                    const isFirstInGroup = !isSameSenderAsPrevious || !isTimestampClose || !isSameDay(prevMsg?.timestamp, msg.timestamp);
                    const showDateSeparator = !prevMsg || !isSameDay(prevMsg?.timestamp, msg.timestamp);
                    const isSameSenderAsNext = nextMsg && nextMsg.sender?.id === msg.sender?.id;
                    const isNextTimestampClose = nextMsg && msg.timestamp && nextMsg.timestamp && (new Date(nextMsg.timestamp).getTime() - new Date(msg.timestamp).getTime() < 5 * 60 * 1000);
                    const isFollowedByGrouped = isSameSenderAsNext && isNextTimestampClose && isSameDay(nextMsg?.timestamp, msg.timestamp);
                    const showTimestamp = !isFollowedByGrouped;
                    const parentMessage = msg.parentMessageId ? messages.find(m => m.id === msg.parentMessageId) : null;
                    const reactionsCount = msg.reactions ? Object.values(msg.reactions).flat().length : 0;
                    const messageNodeRef = (node) => { messageRefs.current[msg.id] = node; };
                    const isReadByOthers = msg.seenBy?.some(user => user.id !== loggedInUser.id);

                    return (
                        <React.Fragment key={msg.id || msg.clientMessageId}>
                            {showDateSeparator && <div className={styles.dateSeparator}><span>{formatDateSeparator(msg.timestamp)}</span></div>}
                            <div
                                ref={messageNodeRef}
                                data-message-id={msg.id}
                                className={`${styles.messageWrapper} ${isSentByCurrentUser ? styles.sent : styles.received} ${isFirstInGroup ? '' : styles.grouped} ${isFollowedByGrouped ? styles.followedByGrouped : ''}`}
                            >
                                {/* ... (keep avatar container) ... */}
                                {!isSentByCurrentUser && (
                                    <div className={styles.avatarContainer}>
                                        {isFirstInGroup && msg.sender && (
                                            <div className={styles.chatAvatarWrapper}> <Avatar userId={msg.sender.id} name={msg.sender.firstName} /> </div>
                                        )}
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    <div className={styles.bubbleContainer}>
                                        {/* ... (keep replied message snippet, reaction picker) ... */}
                                        {parentMessage && (
                                            <div className={styles.repliedMessageSnippet} onClick={() => handleScrollToMessage(parentMessage.id)}>
                                                <p className={styles.replyHeader}>Replied to {parentMessage.sender?.firstName || '...'}</p>
                                                <p className={styles.replyText}>{parentMessage.text || (parentMessage.mediaType ? `[${parentMessage.mediaType.toLowerCase()}]` : '...')}</p>
                                            </div>
                                        )}
                                        {activeEmojiPicker === msg.id && (
                                            <ReactionPicker
                                                onReact={handleReact}
                                                onClose={() => setActiveEmojiPicker(null)}
                                                onReply={() => {
                                                    setReplyingTo(msg);
                                                    setActiveEmojiPicker(null);
                                                }}
                                            />
                                        )}
                                        <div
                                            className={`${styles.messageBubble} ${msg.mediaUrl ? styles.mediaBubble : ''} ${msg.mediaType === 'AUDIO' ? styles.audioBubble : ''}`}
                                            onClick={(e) => handleSingleClick(e, msg)}
                                            onDoubleClick={(e) => handleDoubleClick(e, msg)}
                                            onContextMenu={(e) => handleLongPress(e, msg)}
                                        >
                                            {renderMedia(msg)}
                                            {/* *** Use renderMessageWithMentions *** */}
                                            {(msg.text && msg.mediaType !== 'AUDIO') && <p className={styles.messageText}>{renderMessageWithMentions(msg.text)}</p>}
                                            {(msg.text && msg.mediaUrl && msg.mediaType !== 'AUDIO') && <p className={styles.messageText}>{renderMessageWithMentions(msg.text)}</p>}
                                            {msg.clientMessageId && (isUploading || !msg.id) && <FaSpinner className={styles.optimisticSpinner} />}
                                        </div>
                                        {/* ... (keep reactions container) ... */}
                                        {reactionsCount > 0 && (
                                            <div className={styles.reactionsContainer} onClick={() => setReactionsModalData(msg.reactions)}>
                                                {Object.entries(msg.reactions).slice(0, 3).map(([emoji]) => (<span className={styles.reactionEmoji} key={emoji}>{emoji}</span>))}
                                                <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* ... (keep timestamp container) ... */}
                                    {showTimestamp && msg.timestamp && (
                                        <div className={styles.timestampContainer}>
                                            <span className={styles.timestamp}>{formatDate(msg.timestamp)}</span>
                                            {isSentByCurrentUser && isReadByOthers && ( <FaCheckDouble className={`${styles.seenIcon} ${styles.read}`} /> )}
                                            {isSentByCurrentUser && !isReadByOthers && msg.id && !msg.clientMessageId && ( <FaCheck className={styles.seenIcon} /> )}
                                            {isSentByCurrentUser && msg.clientMessageId && (!isUploading || !msg.id) && (<FaClock className={styles.optimisticIcon} />)}
                                        </div>
                                    )}
                                </div>
                                {animatedHeart === msg.id && <div className={styles.animatedHeart}>❤️</div>}
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* --- Footer & Modals --- */}
            {hasUnreadMessages &&
                <button className={`${styles.scrollToBottomIndicator} ${styles.visible}`} onClick={() => scrollToBottom('smooth')}>
                    <FaChevronDown /> New Messages
                </button>
            }
            {replyingTo && (
                <div className={styles.replyingToContext}>
                    <div className={styles.replyContextContent}>
                        <p className={styles.replyingToTitle}>Replying to {replyingTo.sender?.firstName || '...'}</p>
                        <p className={styles.replyingToText}>{replyingTo.text || (replyingTo.mediaType ? `[${replyingTo.mediaType.toLowerCase()}]` : '...')}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className={styles.cancelReplyButton}>&times;</button>
                </div>
            )}
            {uploadError && <div className={styles.uploadErrorBar}>{uploadError}</div>}

            {/* --- 3. Removed Suggestion Box JSX --- */}

            <footer className={`${styles.messageInputForm} ${newMessage.trim() ? styles.typingActive : ''}`}>
                <input type="file" accept="image/*,video/*" ref={imageInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />
                <div className={styles.actionButtonsContainer}>
                    <button type="button" className={styles.chatActionButton} title="Send Image/Video" onClick={() => imageInputRef.current?.click()} disabled={isUploading || isRecording}>
                        <FaImage />
                    </button>
                    <button type="button" className={`${styles.chatActionButton} ${isRecording ? styles.recordingActive : ''}`} title={isRecording ? "Stop Recording" : "Record Voice Message"} onClick={isRecording ? stopRecording : startRecording} disabled={isUploading}>
                        {isRecording ? <FaStop /> : <FaMicrophone />}
                    </button>
                </div>
                <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    // Removed onBlur related to suggestions
                    placeholder={isRecording ? "Recording audio..." : (isUploading ? "Attaching media..." : "Message...")}
                    rows="1"
                    className={styles.messageInput}
                    disabled={isRecording}
                />
                <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isRecording || (!newMessage.trim() && !isUploading)}
                    className={styles.sendButton}
                >
                    {isUploading ? <FaSpinner className={styles.spinner} /> : <FaPaperPlane />}
                </button>
            </footer>
            {isIncidentModalOpen && chatGroup?.purposeId && (
                <ChatIncidentDetailModal
                    incidentId={chatGroup.purposeId}
                    token={token}
                    onClose={() => setIsIncidentModalOpen(false)}
                />
            )}
            <ReactionsModal reactions={reactionsModalData} onClose={() => setReactionsModalData(null)} />
            <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        </div>
    );
};

export default ChatWindow;