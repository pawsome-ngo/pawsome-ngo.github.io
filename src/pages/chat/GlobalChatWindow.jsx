import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import useWebSocket from '../../hooks/useWebSocket.js';
import ReactionsModal from './components/ReactionsModal.jsx';
import ReactionPicker from './components/ReactionPicker.jsx';
// REMOVED: ChatIncidentDetailModal import
import Lightbox from '../../components/common/Lightbox.jsx';
import styles from './ChatWindow.module.css'; // *** CHANGED: Using ChatWindow.module.css ***
import {
    FaPaperPlane, /* FaInfoCircle removed */ FaCheck, FaCheckDouble, FaArrowLeft, FaChevronDown,
    FaPlus, FaCamera, FaImage, FaMicrophone, FaStop, FaSpinner, FaFileAudio, FaFileVideo, FaFileImage, FaFileAlt, FaClock, FaUsers, // Keep FaUsers
    FaPlay, FaPause
} from 'react-icons/fa';
import Avatar from '../../components/common/Avatar.jsx';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- Hardcoded Names List (from ChatWindow) ---
const TEAM_MEMBER_FIRST_NAMES = [
    "Debayan", "Indranil", "Rimjhim", "Samarpita", "Jayasree", "Nilotpal",
    "Shibojyoti", "Nunfeli", "Iman", "Paramita", "Amit", "Sampriti",
    "Rimi", "Liza", "Sandipan", "Tushar", "Udit", "Sagnik",
    "Anirudh", "Mrinal", "Avik", "Pikachu"
];
// --- End Hardcoded Names ---


// --- Helper Functions (from ChatWindow) ---
const getUserInfoFromToken = (token) => { try { const decodedToken = jwtDecode(token); return { id: Number(decodedToken.id), username: decodedToken.sub }; } catch (error) { console.error('Failed to decode token:', error); return { id: null, username: null }; } };
const formatDate = (dateString) => { if (!dateString) return ''; const date = new Date(dateString); return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const isSameDay = (d1, d2) => { if (!d1 || !d2) return false; const date1 = new Date(d1); const date2 = new Date(d2); return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate(); };
const formatDateSeparator = (dateString) => { if (!dateString) return ''; const date = new Date(dateString); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (isSameDay(date, today)) return 'Today'; if (isSameDay(date, yesterday)) return 'Yesterday'; return date.toLocaleDateString([], { month: 'long', day: 'numeric' }); };

// Emoji Detection Helper
const isEmojiOnly = (str) => {
    if (!str) return false;
    const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}]|\u{FE0F}|\u{200D})+$/u;
    return emojiRegex.test(str.trim().replace(/\s+/g, ''));
};
// --- End Helper Functions ---

// --- Audio Player Component (from ChatWindow) ---
const AudioPlayer = ({ src }) => {
    const audioRef = useRef(null); const [isPlaying, setIsPlaying] = useState(false); const [duration, setDuration] = useState(0); const [currentTime, setCurrentTime] = useState(0); const waveformBars = useMemo(() => Array.from({ length: 30 }, () => Math.random() * 80 + 20), []); const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); }; const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }; const togglePlayPause = (e) => { e.stopPropagation(); if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); } setIsPlaying(!isPlaying); }; const formatTime = (timeInSeconds) => { if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds === 0) { return '0:00'; } const minutes = Math.floor(timeInSeconds / 60); const seconds = Math.floor(timeInSeconds % 60); return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; };
    return ( <div className={styles.audioPlayerContainer}> <audio ref={audioRef} src={src} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} preload="metadata" /> <button onClick={togglePlayPause} className={styles.audioPlayButton}> {isPlaying ? <FaPause /> : <FaPlay />} </button> <div className={styles.waveformContainer}> {waveformBars.map((height, i) => (<div key={i} className={styles.waveformBar} style={{ height: `${height}%` }} />))} </div> <span className={styles.audioTimestamp}> {formatTime(duration)} </span> </div> );
};
// --- End Audio Player Component ---

const GlobalChatWindow = ({ token, onLogout }) => {
    // --- State and Refs (Copied from ChatWindow, removed chatId/chatGroup/incidentModal) ---
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [pickerPositionStyle, setPickerPositionStyle] = useState({});
    const [reactionsModalData, setReactionsModalData] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
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

    // Refs for mobile interactions
    const pressTimer = useRef(null);
    const dragStartCoords = useRef(null);
    const isDragHorizontal = useRef(false);
    const lastTap = useRef({ time: 0, messageId: null });
    const touchStarted = useRef(false);
    const DOUBLE_TAP_DELAY = 300;
    const DRAG_THRESHOLD = 50;

    // --- Hooks ---
    useEffect(() => { if (token) setLoggedInUser(getUserInfoFromToken(token)); }, [token]);

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (messageListRef.current) {
            requestAnimationFrame(() => {
                if (messageListRef.current) {
                    messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior });
                }
            });
        }
    }, []);

    // Robust onMessageReceived (from ChatWindow)
    const onMessageReceived = useCallback((message) => {
        const isAtBottom = userIsAtBottomRef.current;
        setMessages(prevMessages => {
            let updated = [...prevMessages]; let replaced = false;
            if (message.clientMessageId) {
                const optimisticIndex = updated.findIndex(m => m.clientMessageId && m.clientMessageId === message.clientMessageId);
                if (optimisticIndex !== -1) { updated[optimisticIndex] = message; replaced = true; }
            }
            if (!replaced && message.id && !message.id.startsWith('temp-')) {
                const existingMessageIndex = updated.findIndex(m => m.id === message.id);
                if (existingMessageIndex !== -1) {
                    const originalClientMsgId = updated[existingMessageIndex].clientMessageId;
                    updated[existingMessageIndex] = message;
                    if (originalClientMsgId && !message.clientMessageId) { updated[existingMessageIndex].clientMessageId = originalClientMsgId; }
                    replaced = true;
                }
            }
            if (!replaced && message.id && !updated.some(m => m.id === message.id)) { updated.push(message); }
            return updated;
        });
        if (!isAtBottom && message.id && !messages.some(m => m.id === message.id)) { setHasUnreadMessages(true); }
    }, [messages]);

    useEffect(() => { if (userIsAtBottomRef.current) { scrollToBottom('smooth'); } }, [messages, scrollToBottom]);

    // *** CHANGED: useWebSocket hook points to global topic ***
    const { sendMessage } = useWebSocket({
        onMessageReceived,
        token,
        topic: "/topic/gchat" // Global chat topic
    });

    // *** CHANGED: fetchChatData points to global chat API, scrolls instantly ***
    useEffect(() => {
        const fetchChatData = async () => {
            setLoading(true); setError(null);
            try {
                const msgRes = await fetch(`${API_BASE_URL}/api/gchat/messages`, { // <-- Endpoint changed
                    headers: { 'Authorization': `Bearer ${token}`}
                });
                if (!msgRes.ok) {
                    const errData = await msgRes.json().catch(() => ({}));
                    throw new Error(errData.message || `Failed to fetch messages (Status: ${msgRes.status})`);
                }
                const messagesData = await msgRes.json();
                setMessages(messagesData);
                scrollToBottom('auto'); // *** Scroll instantly ***
            } catch (err) {
                console.error("Error fetching global chat data:", err);
                setError(err.message || 'Could not load chat.');
            } finally { setLoading(false); }
        };
        if (token) { fetchChatData(); }
        else if (!token) { setError("Authentication token not found."); setLoading(false); }
    }, [token, scrollToBottom]); // Removed navigate

    // Cleanup Effect
    useEffect(() => {
        const handleScrollCheck = () => handleScroll(); if (messageListRef.current) { messageListRef.current.addEventListener('scroll', handleScrollCheck); }
        return () => { if (mediaRecorder.current && mediaRecorder.current.state === "recording") { if (mediaRecorder.current && mediaRecorder.current.state === "recording") { mediaRecorder.current.stop(); setIsRecording(false); } } if (messageListRef.current) { messageListRef.current.removeEventListener('scroll', handleScrollCheck); } clearTimeout(pressTimer.current); };
    }, []); // Empty dependency array, no chatId

    // *** CHANGED: handleMarkAsRead points to global chat API ***
    const handleMarkAsRead = useCallback((messageId) => {
        if (!messageId || !loggedInUser) return;
        const message = messages.find(m => m.id === messageId);
        if (!message || message.sender?.id === loggedInUser.id || message.seenBy?.some(user => user.id === loggedInUser.id)) { return; }
        sendMessage({ messageId }, `/app/gchat/read`); // <-- Endpoint changed
    }, [sendMessage, messages, loggedInUser]);

    // Intersection Observer Effect (from ChatWindow)
    useEffect(() => {
        if (readObserver.current) readObserver.current.disconnect();
        const observerCallback = (entries) => { entries.forEach(entry => { if (entry.isIntersecting && entry.intersectionRatio >= 0.7) { const messageId = entry.target.dataset.messageId; handleMarkAsRead(messageId); readObserver.current.unobserve(entry.target); } }); };
        readObserver.current = new IntersectionObserver(observerCallback, { root: messageListRef.current, threshold: 0.7 });
        messages.forEach(msg => {
            const element = messageRefs.current[msg.id];
            const isReadByMe = msg.seenBy?.some(user => user.id === loggedInUser?.id);
            if (element && msg.id && !msg.id.startsWith('temp-') && msg.sender?.id !== loggedInUser?.id && !isReadByMe) { try { readObserver.current.observe(element); } catch (e) { console.warn("Observer error:", e); } }
        });
        return () => { if (readObserver.current) readObserver.current.disconnect(); };
    }, [messages, loggedInUser, handleMarkAsRead]);

    const handleScroll = () => { if (messageListRef.current) { const { scrollHeight, scrollTop, clientHeight } = messageListRef.current; const isNearBottom = scrollHeight - scrollTop - clientHeight < 50; userIsAtBottomRef.current = isNearBottom; if (isNearBottom) { setHasUnreadMessages(false); } } };

    // *** CHANGED: handleMediaUpload points to global chat API ***
    const handleMediaUpload = async (file) => {
        if (!file || !token || !loggedInUser) return;
        setIsUploading(true); setUploadError('');
        let processedFile = file; let mediaTypeString = 'UNKNOWN';
        try {
            if (file.type.startsWith('image/')) {
                mediaTypeString = 'IMAGE';
                const compOptions = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/jpeg', quality: 0.7 };
                try { const compBlob = await imageCompression(file, compOptions); const fName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg'; processedFile = new File([compBlob], fName, { type: 'image/jpeg', lastModified: file.lastModified }); } catch (compErr) { console.warn("Img compression failed", compErr); processedFile = file; }
            } else if (file.type.startsWith('video/')) { mediaTypeString = 'VIDEO';
            } else if (file.type.startsWith('audio/')) { mediaTypeString = 'AUDIO';
            } else { throw new Error("Unsupported file type."); }

            const formData = new FormData(); formData.append('media', processedFile);
            const response = await fetch(`${API_BASE_URL}/api/gchat/media`, { // <-- Endpoint changed
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Media upload failed`);

            const clientMsgId = `temp-${Date.now()}`; const txtToSend = newMessage.trim();
            const optimisticMsg = {
                id: clientMsgId, clientMessageId: clientMsgId, text: txtToSend || null,
                sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
                timestamp: new Date().toISOString(), reactions: {}, seenBy: [], parentMessageId: replyingTo ? replyingTo.id : null,
                mediaUrl: result.mediaUrl, mediaType: result.mediaType,
            };
            setMessages(prev => [...prev, optimisticMsg]);
            sendMessage({ text: txtToSend || null, clientMessageId: clientMsgId, parentMessageId: replyingTo ? replyingTo.id : null, mediaUrl: result.mediaUrl, mediaType: result.mediaType, }, `/app/gchat/send`); // <-- Endpoint changed
            setNewMessage(''); setReplyingTo(null);
            if(textareaRef.current) textareaRef.current.style.height = 'auto';
            setTimeout(() => scrollToBottom('smooth'), 50);
        } catch (err) { console.error("Media error:", err); setUploadError(err.message); setTimeout(() => setUploadError(''), 5000);
        } finally { setIsUploading(false); if(imageInputRef.current) imageInputRef.current.value = null; }
    };
    const handleFileSelected = (event) => { const file = event.target.files?.[0]; if (file) { handleMediaUpload(file); } event.target.value = null; };

    // Audio Recording Functions (from ChatWindow)
    const startRecording = async () => { /* ... Unchanged ... */ if (isUploading || isRecording) return; try { if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { console.error("Media Devices API not supported."); setUploadError("Audio recording not supported."); setTimeout(() => setUploadError(''), 5000); return; } const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm'} : {}; mediaRecorder.current = new MediaRecorder(stream, options); const mimeType = mediaRecorder.current.mimeType || 'audio/webm'; const fileExtension = mimeType.includes('opus') ? 'opus' : (mimeType.split('/')[1]?.split(';')[0] || 'webm'); audioChunks.current = []; mediaRecorder.current.ondataavailable = event => { if (event.data.size > 0) audioChunks.current.push(event.data); }; mediaRecorder.current.onstop = () => { const audioBlob = new Blob(audioChunks.current, { type: mimeType }); const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${fileExtension}`, { type: mimeType }); handleMediaUpload(audioFile); stream.getTracks().forEach(track => track.stop()); }; mediaRecorder.current.start(); setIsRecording(true); } catch (err) { console.error("Mic error:", err); if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') { setUploadError("Mic permission denied."); } else { setUploadError("Could not access mic."); } setTimeout(() => setUploadError(''), 5000); } };
    const stopRecording = () => { /* ... Unchanged ... */ if (mediaRecorder.current && mediaRecorder.current.state === "recording") { mediaRecorder.current.stop(); setIsRecording(false); } };

    // *** CHANGED: handleSendMessage points to global chat API ***
    const handleSendMessage = (event) => {
        event?.preventDefault(); let txtToSend = newMessage.trim();
        if ((txtToSend === '' && !isUploading) || !loggedInUser || isRecording) return;
        if (isUploading) return;

        if (txtToSend) txtToSend = txtToSend.replace(/\b(L?lll)\b/gi, '@Everyone');
        txtToSend = txtToSend.replace(/@([?!.]*)(?=\s|$)/g, (match, punctuation) => `@Everyone${punctuation}`);
        const mentionRegex = /@([a-zA-Z][a-zA-Z0-9]{2,})([^\w\s]*)(?=\s|$)/g;
        txtToSend = txtToSend.replace(mentionRegex, (match, typedPrefix, punctuation) => {
            if (typedPrefix.toLowerCase() === 'everyone') return match;
            const prefixLower = typedPrefix.toLowerCase();
            const potentialMatches = TEAM_MEMBER_FIRST_NAMES.filter(name => name.toLowerCase().startsWith(prefixLower));
            if (potentialMatches.length === 1) return `@${potentialMatches[0]}${punctuation}`;
            else return match;
        });

        const clientMsgId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: clientMsgId, clientMessageId: clientMsgId, text: txtToSend,
            sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
            timestamp: new Date().toISOString(), reactions: {}, seenBy: [],
            parentMessageId: replyingTo ? replyingTo.id : null,
        };
        setMessages(prev => [...prev, optimisticMsg]);
        sendMessage({ text: txtToSend, clientMessageId: clientMsgId, parentMessageId: replyingTo ? replyingTo.id : null }, `/app/gchat/send`); // <-- Endpoint changed
        setNewMessage(''); setReplyingTo(null);
        if(textareaRef.current) textareaRef.current.style.height = 'auto';
        setTimeout(() => scrollToBottom('smooth'), 50);
    };

    // renderMessageWithMentions (from ChatWindow)
    const renderMessageWithMentions = (text) => { /* ... Unchanged ... */ if (!text) return null; const mentionRegex = /@((?:everyone|[\w]+))([^\w\s]*?(?=\s|$))/gi; const parts = []; let lastIndex = 0; let match; while ((match = mentionRegex.exec(text)) !== null) { if (match.index > lastIndex) { parts.push(text.substring(lastIndex, match.index)); } const mentionName = match[1]; const punctuation = match[2] || ""; const nameLower = mentionName.toLowerCase(); const isKnownMention = TEAM_MEMBER_FIRST_NAMES.some( name => name.toLowerCase() === nameLower ); const isEveryone = nameLower === 'everyone'; if (isKnownMention || isEveryone) { const displayName = isEveryone ? "Everyone" : mentionName; parts.push( <span key={match.index} className={styles.mentionHighlight}> @{displayName}{punctuation} </span> ); } else { parts.push(`@${mentionName}${punctuation}`); } lastIndex = match.index + match[0].length; } if (lastIndex < text.length) { parts.push(text.substring(lastIndex)); } return parts; };

    // Input Handlers (from ChatWindow)
    const handleTextareaInput = (e) => { const text = e.target.value; setNewMessage(text); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; };
    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

    // *** CHANGED: handleReact points to global chat API ***
    const handleReact = (reaction) => {
        if (loggedInUser && activeEmojiPicker) {
            sendMessage({ messageId: activeEmojiPicker, reaction }, `/app/gchat/react`); // <-- Endpoint changed
        }
        setActiveEmojiPicker(null);
    };

    const handleScrollToMessage = (messageId) => { const element = messageRefs.current[messageId]; if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'center' }); element.classList.add(styles.highlight); setTimeout(() => { element.classList.remove(styles.highlight); }, 1500); } };

    // --- *** Mobile Interaction Handlers (Copied from ChatWindow) *** ---
    const handleInteractionStart = (e, message) => {
        if (e.type === 'mousedown' && touchStarted.current) return;
        if (e.type === 'touchstart') touchStarted.current = true;
        if (message.id.startsWith('temp-')) return;

        clearTimeout(pressTimer.current);
        const touch = e.touches ? e.touches[0] : e;
        dragStartCoords.current = { x: touch.clientX, y: touch.clientY };
        isDragHorizontal.current = false;

        pressTimer.current = setTimeout(() => {
            if (dragStartCoords.current) {
                const messageElement = messageRefs.current[message.id];
                if (messageElement) {
                    const rect = messageElement.getBoundingClientRect();
                    const pickerWidthEstimate = 220; const windowWidth = window.innerWidth; let style = {};
                    let desiredLeft = rect.left + rect.width / 2 - pickerWidthEstimate / 2;
                    let desiredRight = rect.left + rect.width / 2 + pickerWidthEstimate / 2;
                    style.top = `${rect.top}px`;
                    if (desiredLeft < 10) { style.left = '10px'; style.right = 'auto'; style.transform = 'translateY(-100%) translateY(-10px)'; }
                    else if (desiredRight > windowWidth - 10) { style.left = 'auto'; style.right = '10px'; style.transform = 'translateY(-100%) translateY(-10px)'; }
                    else { style.left = `${rect.left + rect.width / 2}px`; style.right = 'auto'; style.transform = 'translateX(-50%) translateY(-100%) translateY(-10px)'; }
                    setPickerPositionStyle(style);
                } else { setPickerPositionStyle({}); }
                setActiveEmojiPicker(message.id);
            }
        }, 350);
    };

    const handleInteractionMove = (e) => {
        if (!dragStartCoords.current) return;
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = Math.abs(touch.clientX - dragStartCoords.current.x);
        const deltaY = Math.abs(touch.clientY - dragStartCoords.current.y);
        if (pressTimer.current && (deltaX > 10 || deltaY > 10)) { clearTimeout(pressTimer.current); pressTimer.current = null; if (deltaX > deltaY) { isDragHorizontal.current = true; } }
        if (isDragHorizontal.current) e.preventDefault();
    };

    const handleInteractionEnd = (e, message) => {
        if (e.type === 'mouseup' && touchStarted.current) { touchStarted.current = false; return; }
        if (e.type === 'touchend' || (e.type === 'mouseup' && !touchStarted.current)) { touchStarted.current = false; }
        const tapTime = Date.now();
        clearTimeout(pressTimer.current); pressTimer.current = null;
        setTimeout(() => {
            const isOptimistic = message.id.startsWith('temp-');
            if (activeEmojiPicker || isOptimistic || !dragStartCoords.current) { dragStartCoords.current = null; isDragHorizontal.current = false; return; }
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const endX = touch.clientX; const endY = touch.clientY;
            const deltaX = endX - dragStartCoords.current.x;
            const deltaY = Math.abs(endY - dragStartCoords.current.y);
            const timeSinceLastTap = tapTime - lastTap.current.time;
            const isQuickSecondTap = (timeSinceLastTap < DOUBLE_TAP_DELAY) && lastTap.current.messageId === message.id;

            if (isQuickSecondTap) { // Double Tap
                if (loggedInUser && message.id) {
                    sendMessage({ messageId: message.id, reaction: '❤️' }, `/app/gchat/react`); // <-- Endpoint changed
                    setAnimatedHeart(message.id); setTimeout(() => setAnimatedHeart(null), 600);
                }
                lastTap.current = { time: 0, messageId: null };
            } else if (isDragHorizontal.current && deltaX > DRAG_THRESHOLD) { // Drag-to-Reply
                setReplyingTo(message); lastTap.current = { time: 0, messageId: null };
            } else if (Math.abs(deltaX) < 10 && deltaY < 10) { // Single Tap
                lastTap.current = { time: tapTime, messageId: message.id };
                if (message.mediaType === 'IMAGE') setLightboxSrc(`${API_BASE_URL}${message.mediaUrl}`);
                setTimeout(() => { if(lastTap.current.messageId === message.id && lastTap.current.time === tapTime) { lastTap.current = { time: 0, messageId: null }; } }, DOUBLE_TAP_DELAY + 50);
            } else { lastTap.current = { time: 0, messageId: null }; }
            dragStartCoords.current = null; isDragHorizontal.current = false;
        }, 50);
    };
    // --- End Mobile Interaction Handlers ---


    // --- Render Logic ---
    if (loading || !loggedInUser) { return <div className={styles.centeredMessage}>Loading...</div>; }
    if (error) { return (<div className={styles.chatWindow}> <header className={styles.chatHeader}> <Link to="/chat" className={styles.backButton}><FaArrowLeft /></Link> <div className={styles.headerTitleContainer}><h2>Error</h2></div> <div className={styles.headerActions}></div> </header> <div className={styles.centeredMessage}>{error}</div> </div>); }

    const renderMedia = (msg) => {
        if (!msg.mediaUrl || !msg.mediaType) return null;
        const mediaFullUrl = `${API_BASE_URL}${msg.mediaUrl}`;
        switch (msg.mediaType) {
            case 'IMAGE': return <img src={mediaFullUrl} alt="Chat media" className={styles.chatMediaImage} loading="lazy" />;
            case 'VIDEO': return <video src={mediaFullUrl} controls className={styles.chatMediaVideo} />;
            case 'AUDIO': return <AudioPlayer src={mediaFullUrl} />;
            default: return <a href={mediaFullUrl} target="_blank" rel="noopener noreferrer" className={styles.chatMediaLink}> <FaFileAlt/> Download File</a>;
        }
    };

    return (
        <div className={styles.chatWindow}>
            {/* *** CHANGED: Use Global Chat Header *** */}
            <header className={styles.chatHeader}>
                <Link to="/chat" className={styles.backButton} title="Go to Incident Chats"> <FaArrowLeft /> </Link>
                <div className={styles.headerTitleContainer} title="Global Chat for all members">
                    <h2><FaUsers /> Global Chat</h2>
                </div>
                <div className={styles.headerActions}> </div>
            </header>

            <main ref={messageListRef} className={styles.messageList} onScroll={handleScroll}>
                {messages.map((msg, index) => {
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
                    const messageNodeRef = (node) => { if(msg.id) messageRefs.current[msg.id] = node; };
                    const isReadByOthers = msg.seenBy?.some(user => user.id !== loggedInUser.id);
                    const emojiOnly = !msg.mediaUrl && msg.text && isEmojiOnly(msg.text); // Emoji check

                    return (
                        <React.Fragment key={msg.id || msg.clientMessageId}>
                            {showDateSeparator && <div className={styles.dateSeparator}><span>{formatDateSeparator(msg.timestamp)}</span></div>}
                            {/* *** CHANGED: Apply .grouped for margin logic only *** */}
                            <div
                                ref={messageNodeRef}
                                data-message-id={msg.id}
                                className={`${styles.messageWrapper} ${isSentByCurrentUser ? styles.sent : styles.received} ${isFirstInGroup ? '' : styles.grouped} ${emojiOnly ? styles.emojiOnlyWrapper : ''}`}
                            >
                                {/* Avatar */}
                                {!isSentByCurrentUser && (
                                    <div className={styles.avatarContainer}>
                                        {isFirstInGroup && msg.sender && ( <div className={styles.chatAvatarWrapper}> <Avatar userId={msg.sender.id} name={msg.sender.firstName} /> </div> )}
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    {/* Sender Name */}
                                    {!isSentByCurrentUser && isFirstInGroup && msg.sender && ( <span className={styles.senderName}>{msg.sender.firstName}</span> )}

                                    <div className={styles.bubbleContainer}>
                                        {/* Reply Snippet */}
                                        {parentMessage && (
                                            <div className={styles.repliedMessageSnippet} onClick={() => handleScrollToMessage(parentMessage.id)}>
                                                <p className={styles.replyHeader}>Replied to {parentMessage.sender?.firstName || '...'}</p>
                                                <p className={styles.replyText}>{parentMessage.text || (parentMessage.mediaType ? `[${parentMessage.mediaType.toLowerCase()}]` : '...')}</p>
                                            </div>
                                        )}
                                        {/* Reaction Picker */}
                                        {activeEmojiPicker === msg.id && (
                                            <ReactionPicker
                                                style={pickerPositionStyle}
                                                onReact={handleReact}
                                                onClose={() => setActiveEmojiPicker(null)}
                                                onReply={() => { setReplyingTo(msg); setActiveEmojiPicker(null); }}
                                            />
                                        )}

                                        {/* *** CONDITIONAL RENDER FOR EMOJI vs BUBBLE *** */}
                                        {emojiOnly ? (
                                            <div className={styles.emojiOnlyContainer}
                                                 onMouseDown={(e) => handleInteractionStart(e, msg)}
                                                 onMouseUp={(e) => handleInteractionEnd(e, msg)}
                                                 onMouseMove={handleInteractionMove}
                                                 onMouseLeave={() => { clearTimeout(pressTimer.current); dragStartCoords.current = null; isDragHorizontal.current = false;}}
                                                 onTouchStart={(e) => handleInteractionStart(e, msg)}
                                                 onTouchMove={handleInteractionMove}
                                                 onTouchEnd={(e) => handleInteractionEnd(e, msg)}>
                                                 <span className={styles.emojiOnlyMessage}>
                                                    {renderMessageWithMentions(msg.text)}
                                                 </span>
                                            </div>
                                        ) : (
                                            /* Existing Message Bubble div */
                                            <div
                                                className={`${styles.messageBubble} ${msg.mediaUrl ? styles.mediaBubble : ''} ${msg.mediaType === 'AUDIO' ? styles.audioBubble : ''}`}
                                                onMouseDown={(e) => handleInteractionStart(e, msg)}
                                                onMouseUp={(e) => handleInteractionEnd(e, msg)}
                                                onMouseMove={handleInteractionMove}
                                                onMouseLeave={() => { clearTimeout(pressTimer.current); dragStartCoords.current = null; isDragHorizontal.current = false;}}
                                                onTouchStart={(e) => handleInteractionStart(e, msg)}
                                                onTouchMove={handleInteractionMove}
                                                onTouchEnd={(e) => handleInteractionEnd(e, msg)}
                                            >
                                                {renderMedia(msg)}
                                                {(msg.text && msg.mediaType !== 'AUDIO') && <p className={styles.messageText}>{renderMessageWithMentions(msg.text)}</p>}
                                                {(msg.text && msg.mediaUrl && msg.mediaType !== 'AUDIO') && <p className={styles.messageText}>{renderMessageWithMentions(msg.text)}</p>}
                                                {/* Spinner removed from here */}
                                            </div>
                                        )}
                                        {/* *** END CONDITIONAL RENDER *** */}

                                        {/* Reactions */}
                                        {reactionsCount > 0 && (
                                            <div className={styles.reactionsContainer} onClick={() => setReactionsModalData(msg.reactions)}>
                                                {Object.entries(msg.reactions).slice(0, 3).map(([emoji]) => (<span className={styles.reactionEmoji} key={emoji}>{emoji}</span>))}
                                                <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Timestamp */}
                                    {showTimestamp && msg.timestamp && (
                                        <div className={styles.timestampContainer}>
                                            <span className={styles.timestamp}>{formatDate(msg.timestamp)}</span>
                                            {isSentByCurrentUser && msg.id.startsWith('temp-') && (<FaClock className={styles.optimisticIcon} />)}
                                            {isSentByCurrentUser && !msg.id.startsWith('temp-') && isReadByOthers && ( <FaCheckDouble className={`${styles.seenIcon} ${styles.read}`} /> )}
                                            {isSentByCurrentUser && !msg.id.startsWith('temp-') && !isReadByOthers && ( <FaCheck className={styles.seenIcon} /> )}
                                        </div>
                                    )}
                                </div>
                                {/* Animated Heart */}
                                {animatedHeart === msg.id && <div className={styles.animatedHeart}>❤️</div>}
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* --- Footer & Modals --- */}
            {hasUnreadMessages && ( <button className={`${styles.scrollToBottomIndicator} ${styles.visible}`} onClick={() => scrollToBottom('smooth')}> <FaChevronDown /> New Messages </button> )}
            {replyingTo && ( <div className={styles.replyingToContext}> <div className={styles.replyContextContent}> <p className={styles.replyingToTitle}>Replying to {replyingTo.sender?.firstName || '...'}</p> <p className={styles.replyingToText}>{replyingTo.text || (replyingTo.mediaType ? `[${replyingTo.mediaType.toLowerCase()}]` : '...')}</p> </div> <button onClick={() => setReplyingTo(null)} className={styles.cancelReplyButton}>&times;</button> </div> )}
            {uploadError && ( <div className={styles.uploadErrorBar}>{uploadError}</div> )}

            <footer className={`${styles.messageInputForm} ${newMessage.trim() ? styles.typingActive : ''}`}>
                <input type="file" accept="image/*,video/*" ref={imageInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />
                <div className={styles.actionButtonsContainer}> <button type="button" className={styles.chatActionButton} title="Send Image/Video" onClick={() => imageInputRef.current?.click()} disabled={isUploading || isRecording}> <FaImage /> </button> <button type="button" className={`${styles.chatActionButton} ${isRecording ? styles.recordingActive : ''}`} title={isRecording ? "Stop Recording" : "Record Voice Message"} onClick={isRecording ? stopRecording : startRecording} disabled={isUploading}> {isRecording ? <FaStop /> : <FaMicrophone />} </button> </div>
                <textarea ref={textareaRef} value={newMessage} onChange={handleTextareaInput} onKeyDown={handleKeyDown} placeholder={isRecording ? "Recording audio..." : (isUploading ? "Attaching media..." : "Message...")} rows="1" className={styles.messageInput} disabled={isRecording} />
                <button type="button" onClick={handleSendMessage} disabled={isRecording || (!newMessage.trim() && !isUploading)} className={styles.sendButton}> {isUploading ? <FaSpinner className={styles.spinner} /> : <FaPaperPlane />} </button>
            </footer>
            {/* Incident Modal removed */}
            <ReactionsModal reactions={reactionsModalData} onClose={() => setReactionsModalData(null)} />
            <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        </div>
    );
};

export default GlobalChatWindow;