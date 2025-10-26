import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Added useMemo
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import useWebSocket from '../../hooks/useWebSocket.js';
import ReactionsModal from './components/ReactionsModal.jsx';
import ReactionPicker from './components/ReactionPicker.jsx';
import styles from './GlobalChatWindow.module.css';
import {
    FaPaperPlane, FaInfoCircle, FaCheck, FaCheckDouble, FaArrowLeft, FaChevronDown,
    FaPlus, FaCamera, FaImage, FaMicrophone, FaStop, FaSpinner, FaFileAudio, FaFileVideo, FaFileImage, FaFileAlt, FaClock, FaUsers,
    FaPlay, FaPause // Added Play/Pause icons
} from 'react-icons/fa';
import Avatar from '../../components/common/Avatar.jsx';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- Helper Functions (unchanged) ---
const getUserInfoFromToken = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        return { id: Number(decodedToken.id), username: decodedToken.sub };
    } catch (error) {
        console.error('Failed to decode token:', error);
        return { id: null, username: null };
    }
};
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};
const formatDateSeparator = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
};
// --- End Helper Functions ---

// --- NEW AUDIO PLAYER COMPONENT ---
const AudioPlayer = ({ src }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Create a static, random waveform once
    const waveformBars = useMemo(() =>
            Array.from({ length: 30 }, () => Math.random() * 80 + 20),
        []);

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const togglePlayPause = (e) => {
        e.stopPropagation(); // Don't trigger long press on bubble
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (timeInSeconds) => {
        // Check for NaN, Infinity, or 0
        if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds === 0) {
            return '0:00';
        }
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className={styles.audioPlayerContainer}>
            {/* Hidden audio element to control playback */}
            <audio
                ref={audioRef}
                src={src}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
            />
            <button onClick={togglePlayPause} className={styles.audioPlayButton}>
                {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className={styles.waveformContainer}>
                {waveformBars.map((height, i) => (
                    <div
                        key={i}
                        className={styles.waveformBar}
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
            <span className={styles.audioTimestamp}>
                {formatTime(duration)}
            </span>
            {/* Optional: Add mic icon like Messenger */}
            {/* <FaMicrophone className={styles.audioMicIcon} /> */}
        </div>
    );
};
// --- END AUDIO PLAYER COMPONENT ---


const GlobalChatWindow = ({ token, onLogout }) => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [chatGroup, setChatGroup] = useState({ name: "Global Chat" });
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
    const readObserver = useRef(null);
    const imageInputRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        if (token) setLoggedInUser(getUserInfoFromToken(token));
    }, [token]);

    const scrollToBottom = (behavior = 'smooth') => {
        if (messageListRef.current) {
            requestAnimationFrame(() => {
                if (messageListRef.current) {
                    messageListRef.current.scrollTo({
                        top: messageListRef.current.scrollHeight,
                        behavior
                    });
                }
            });
        }
    };

    const onMessageReceived = useCallback((message) => {
        const isAtBottom = userIsAtBottomRef.current;
        setMessages(prevMessages => {
            const optimisticIndex = prevMessages.findIndex(m => m.clientMessageId && m.clientMessageId === message.clientMessageId);
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
            if (prevMessages.some(m => m.id === message.id)) {
                console.warn("Attempted to add duplicate message ID:", message.id);
                return prevMessages;
            }
            return [...prevMessages, message];
        });
        if (!isAtBottom && !messages.some(m => m.id === message.id || m.clientMessageId === message.clientMessageId)) {
            setHasUnreadMessages(true);
        }
    }, [messages]);

    useEffect(() => {
        if (userIsAtBottomRef.current) {
            scrollToBottom('smooth');
        }
    }, [messages]);

    const { sendMessage } = useWebSocket({
        onMessageReceived,
        token,
        topic: "/topic/gchat"
    });

    useEffect(() => {
        const fetchChatData = async () => {
            setLoading(true);
            setError(null);
            try {
                const msgRes = await fetch(`${API_BASE_URL}/api/gchat/messages`, {
                    headers: { 'Authorization': `Bearer ${token}`}
                });

                if (!msgRes.ok) {
                    const errData = await msgRes.json().catch(() => ({}));
                    throw new Error(errData.message || `Failed to fetch messages (Status: ${msgRes.status})`);
                }
                const messagesData = await msgRes.json();
                setMessages(messagesData);
                setChatGroup({ name: "Global Chat" });
                setTimeout(() => scrollToBottom('auto'), 0);
            } catch (err) {
                console.error("Error fetching global chat data:", err);
                setError(err.message || 'Could not load chat.');
                if (err.message && err.message.includes("participant")) {
                    setError("You are not yet a participant of the global chat. Please wait a moment and refresh, or contact an admin.");
                }
            } finally {
                setLoading(false);
            }
        };
        if (token) { fetchChatData(); }
        else if (!token) { setError("Authentication token not found."); setLoading(false); }
    }, [token]);

    const handleMarkAsRead = useCallback((messageId) => {
        if (!messageId || !loggedInUser) return;
        const message = messages.find(m => m.id === messageId);
        if (!message || message.sender?.id === loggedInUser.id || message.seenBy?.some(user => user.id === loggedInUser.id)) {
            return;
        }
        sendMessage({ messageId }, `/app/gchat/read`);
    }, [sendMessage, messages, loggedInUser]);

    useEffect(() => {
        if (readObserver.current) readObserver.current.disconnect();
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
                    const messageId = entry.target.dataset.messageId;
                    handleMarkAsRead(messageId);
                    readObserver.current.unobserve(entry.target);
                }
            });
        };
        readObserver.current = new IntersectionObserver(observerCallback, { root: messageListRef.current, threshold: 0.7 });
        messages.forEach(msg => {
            const element = messageRefs.current[msg.id];
            const isReadByMe = msg.seenBy?.some(user => user.id === loggedInUser?.id);
            if (element && msg.id && !msg.clientMessageId && msg.sender?.id !== loggedInUser?.id && !isReadByMe) {
                try { readObserver.current.observe(element); }
                catch (e) { console.warn("Observer error:", e, "Element:", element); }
            }
        });
        return () => { if (readObserver.current) readObserver.current.disconnect(); };
    }, [messages, loggedInUser, handleMarkAsRead]);

    const handleScroll = () => {
        if (messageListRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = messageListRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            userIsAtBottomRef.current = isNearBottom;
            if (isNearBottom) { setHasUnreadMessages(false); }
        }
    };

    const handleMediaUpload = async (file) => {
        if (!file || !token || !loggedInUser) return;

        setIsUploading(true);
        setUploadError('');
        let processedFile = file;
        let mediaTypeString = 'UNKNOWN';

        try {
            if (file.type.startsWith('image/')) {
                mediaTypeString = 'IMAGE';
                const compressionOptions = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/jpeg', quality: 0.7 };
                try {
                    const compressedBlob = await imageCompression(file, compressionOptions);
                    const newFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg';
                    processedFile = new File([compressedBlob], newFileName, { type: 'image/jpeg', lastModified: file.lastModified });
                } catch (compressionError) {
                    console.warn("Image compression failed, uploading original:", compressionError);
                    processedFile = file;
                }
            } else if (file.type.startsWith('video/')) {
                mediaTypeString = 'VIDEO';
            } else if (file.type.startsWith('audio/')) {
                mediaTypeString = 'AUDIO';
            } else {
                throw new Error("Unsupported file type selected.");
            }

            const formData = new FormData();
            formData.append('media', processedFile);

            const response = await fetch(`${API_BASE_URL}/api/gchat/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Media upload failed (Status: ${response.status})`);

            const clientMessageId = `temp-${Date.now()}`;
            const textToSend = newMessage.trim();

            const optimisticMessage = {
                id: clientMessageId, clientMessageId, text: textToSend || null,
                sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
                timestamp: new Date().toISOString(), reactions: {}, seenBy: [], parentMessageId: replyingTo ? replyingTo.id : null,
                mediaUrl: result.mediaUrl, mediaType: result.mediaType,
            };
            setMessages(prev => [...prev, optimisticMessage]);

            sendMessage({
                text: textToSend || null, clientMessageId, parentMessageId: replyingTo ? replyingTo.id : null,
                mediaUrl: result.mediaUrl, mediaType: result.mediaType,
            }, `/app/gchat/send`);

            setNewMessage(''); setReplyingTo(null);
            if(textareaRef.current) textareaRef.current.style.height = 'auto';
            setTimeout(() => scrollToBottom('smooth'), 50);

        } catch (err) {
            console.error("Media handling/upload error:", err);
            setUploadError(err.message || 'Failed to process or upload media.');
            setTimeout(() => setUploadError(''), 5000);
        } finally {
            setIsUploading(false);
            if(imageInputRef.current) imageInputRef.current.value = null;
        }
    };

    const handleFileSelected = (event) => {
        const file = event.target.files?.[0];
        if (file) { handleMediaUpload(file); }
        event.target.value = null;
    };

    const startRecording = async () => {
        if (isUploading || isRecording) return;
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("Media Devices API or getUserMedia not supported.");
                setUploadError("Audio recording is not supported on this browser/connection.");
                setTimeout(() => setUploadError(''), 5000);
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm'} : {};
            mediaRecorder.current = new MediaRecorder(stream, options);
            const mimeType = mediaRecorder.current.mimeType || 'audio/webm';
            const fileExtension = mimeType.includes('opus') ? 'opus' : (mimeType.split('/')[1]?.split(';')[0] || 'webm');
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = event => { if (event.data.size > 0) audioChunks.current.push(event.data); };
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${fileExtension}`, { type: mimeType });
                handleMediaUpload(audioFile);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setUploadError("Microphone permission denied.");
            } else {
                setUploadError("Could not access microphone.");
            }
            setTimeout(() => setUploadError(''), 5000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    };

    const handleSendMessage = (event) => {
        event?.preventDefault();
        const textToSend = newMessage.trim();
        if ((textToSend === '' && !isUploading) || !loggedInUser || isRecording) {
            return;
        }
        if (isUploading) {
            return;
        }

        const clientMessageId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: clientMessageId, clientMessageId, text: textToSend,
            sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
            timestamp: new Date().toISOString(), reactions: {}, seenBy: [], parentMessageId: replyingTo ? replyingTo.id : null,
        };
        setMessages(prev => [...prev, optimisticMessage]);

        sendMessage({ text: textToSend, clientMessageId, parentMessageId: replyingTo ? replyingTo.id : null }, `/app/gchat/send`);

        setNewMessage(''); setReplyingTo(null);
        if(textareaRef.current) textareaRef.current.style.height = 'auto';
        setTimeout(() => scrollToBottom('smooth'), 50);
    };

    const handleTextareaInput = (e) => {
        setNewMessage(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleReact = (reaction) => {
        if (loggedInUser && activeEmojiPicker) {
            sendMessage({ messageId: activeEmojiPicker, reaction }, `/app/gchat/react`);
        }
        setActiveEmojiPicker(null);
    };

    const handleDoubleClick = (message) => {
        if (!loggedInUser || !message?.id || message?.clientMessageId) return;
        const reactionType = '❤️';
        sendMessage({ messageId: message.id, reaction: reactionType }, `/app/gchat/react`);
        setAnimatedHeart(message.id);
        setTimeout(() => setAnimatedHeart(null), 500);
    };

    const handleInteractionStart = (e, message) => {
        if (message?.clientMessageId) return;
        clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => {
            if (dragStartXRef.current === null) {
                setActiveEmojiPicker(message.id);
            }
        }, 350);
        dragStartXRef.current = e.clientX || e.touches?.[0]?.clientX;
    };

    const handleInteractionEnd = (e, message) => {
        clearTimeout(pressTimer.current);
        const interactionEnded = () => {
            if (activeEmojiPicker || message?.clientMessageId) {
                dragStartXRef.current = null;
                return;
            }
            const dragEndX = e.clientX || e.changedTouches?.[0]?.clientX;
            if (dragStartXRef.current !== null && dragEndX && dragEndX - dragStartXRef.current > DRAG_THRESHOLD) {
                setReplyingTo(message);
            }
            dragStartXRef.current = null;
        };
        setTimeout(interactionEnded, 50);
    };

    const handleInteractionMove = (e) => {
        if (pressTimer.current && dragStartXRef.current !== null) {
            const currentX = e.clientX || e.touches?.[0]?.clientX;
            if (currentX && Math.abs(currentX - dragStartXRef.current) > 10) {
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

    if (loading || !loggedInUser) {
        return <div className={styles.centeredMessage}>Loading global chat...</div>;
    }
    if (error) {
        return (
            <div className={styles.chatWindow}>
                <header className={styles.chatHeader}>
                    <Link to="/chat" className={styles.backButton}><FaArrowLeft /></Link>
                    <div className={styles.headerTitleContainer}><h2>Error</h2></div>
                    <div className={styles.headerActions}></div>
                </header>
                <div className={styles.centeredMessage}>{error}</div>
            </div>
        );
    }

    // --- UPDATED Render Media Function ---
    const renderMedia = (msg) => {
        if (!msg.mediaUrl || !msg.mediaType) return null;
        const mediaFullUrl = `${API_BASE_URL}${msg.mediaUrl}`;

        switch (msg.mediaType) {
            case 'IMAGE':
                return <img src={mediaFullUrl} alt="Chat media" className={styles.chatMediaImage} loading="lazy" />;
            case 'VIDEO':
                return <video src={mediaFullUrl} controls className={styles.chatMediaVideo} />;
            case 'AUDIO':
                // Use the new custom audio player
                return <AudioPlayer src={mediaFullUrl} />;
            default:
                return <a href={mediaFullUrl} target="_blank" rel="noopener noreferrer" className={styles.chatMediaLink}> <FaFileAlt/> Download File</a>;
        }
    };
    // --- END UPDATE ---

    return (
        <div className={styles.chatWindow}>
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
                                {!isSentByCurrentUser && (
                                    <div className={styles.avatarContainer}>
                                        {isFirstInGroup && msg.sender && (
                                            <div className={styles.chatAvatarWrapper}> <Avatar userId={msg.sender.id} name={msg.sender.firstName} /> </div>
                                        )}
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    {!isSentByCurrentUser && isFirstInGroup && msg.sender && (
                                        <span className={styles.senderName}>{msg.sender.firstName}</span>
                                    )}
                                    <div className={styles.bubbleContainer}>
                                        {parentMessage && (
                                            <div className={styles.repliedMessageSnippet} onClick={() => handleScrollToMessage(parentMessage.id)}>
                                                <p className={styles.replyHeader}>Replied to {parentMessage.sender?.firstName || '...'}</p>
                                                <p className={styles.replyText}>{parentMessage.text || (parentMessage.mediaType ? `[${parentMessage.mediaType.toLowerCase()}]` : '...')}</p>
                                            </div>
                                        )}
                                        {activeEmojiPicker === msg.id && <ReactionPicker onReact={handleReact} onClose={() => setActiveEmojiPicker(null)} />}

                                        {/* --- UPDATED Message Bubble Div --- */}
                                        <div
                                            className={`${styles.messageBubble} ${msg.mediaUrl ? styles.mediaBubble : ''} ${msg.mediaType === 'AUDIO' ? styles.audioBubble : ''}`}
                                            onMouseDown={(e) => handleInteractionStart(e, msg)}
                                            onMouseUp={(e) => handleInteractionEnd(e, msg)}
                                            onMouseMove={handleInteractionMove}
                                            onMouseLeave={() => { clearTimeout(pressTimer.current); dragStartXRef.current = null; }}
                                            onTouchStart={(e) => handleInteractionStart(e, msg)}
                                            onTouchMove={handleInteractionMove}
                                            onTouchEnd={(e) => handleInteractionEnd(e, msg)}
                                            onDoubleClick={() => handleDoubleClick(msg)}
                                        >
                                            {renderMedia(msg)}
                                            {/* Only render text if it's NOT an audio message (or if it has text AND is not audio) */}
                                            {msg.text && msg.mediaType !== 'AUDIO' && <p className={styles.messageText}>{msg.text}</p>}
                                            {/* Text *with* media (but not audio) */}
                                            {msg.text && msg.mediaUrl && msg.mediaType !== 'AUDIO' && <p className={styles.messageText}>{msg.text}</p>}

                                            {msg.clientMessageId && (isUploading || !msg.id) && <FaSpinner className={styles.optimisticSpinner} />}
                                        </div>
                                        {/* --- END UPDATE --- */}

                                        {reactionsCount > 0 && (
                                            <div className={styles.reactionsContainer} onClick={() => setReactionsModalData(msg.reactions)}>
                                                {Object.entries(msg.reactions).slice(0, 3).map(([emoji]) => (<span className={styles.reactionEmoji} key={emoji}>{emoji}</span>))}
                                                <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                            </div>
                                        )}
                                    </div>
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

            <ReactionsModal reactions={reactionsModalData} onClose={() => setReactionsModalData(null)} />
        </div>
    );
};

export default GlobalChatWindow;