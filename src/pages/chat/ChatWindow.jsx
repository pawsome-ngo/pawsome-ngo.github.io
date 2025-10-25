// File: pawsome-client-react/src/pages/chat/ChatWindow.jsx
// Updated: Removed setTimeout from handleInteractionEnd
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import useWebSocket from '../../hooks/useWebSocket.js';
import ReactionsModal from './components/ReactionsModal.jsx';
import ReactionPicker from './components/ReactionPicker.jsx';
import ChatIncidentDetailModal from './components/ChatIncidentDetailModal.jsx';
import styles from './ChatWindow.module.css';
import {
    FaPaperPlane, FaInfoCircle, FaCheck, FaCheckDouble, FaArrowLeft, FaChevronDown,
    FaPlus, FaCamera, FaImage, FaMicrophone, FaStop, FaSpinner, FaFileAudio, FaFileVideo, FaFileImage, FaFileAlt, FaClock, FaUsers,
    FaPlay, FaPause // Added Play/Pause
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

// --- Audio Player Component (unchanged) ---
const AudioPlayer = ({ src }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

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
        e.stopPropagation();
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds) || timeInSeconds === 0) return '0:00';
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className={styles.audioPlayerContainer}>
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
        </div>
    );
};
// --- END AUDIO PLAYER COMPONENT ---

const ChatWindow = ({ token, onLogout }) => {
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
    const pressTimer = useRef(null);
    const messageListRef = useRef(null);
    const messageRefs = useRef({});
    const dragStartXRef = useRef(null);
    const DRAG_THRESHOLD = 50; // Pixels threshold for swipe
    const userIsAtBottomRef = useRef(true);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [animatedHeart, setAnimatedHeart] = useState(null);
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
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

    // Callback when a new message is received via WebSocket
    const onMessageReceived = useCallback((message) => {
        const isAtBottom = userIsAtBottomRef.current;
        setMessages(prevMessages => {
            // Update optimistic message if ID matches
            const optimisticIndex = prevMessages.findIndex(m => m.clientMessageId && m.clientMessageId === message.clientMessageId);
            if (optimisticIndex !== -1) {
                const updated = [...prevMessages];
                updated[optimisticIndex] = message;
                return updated;
            }
            // Update existing message (e.g., reactions, read receipts)
            const existingMessageIndex = prevMessages.findIndex(m => m.id === message.id);
            if (existingMessageIndex !== -1) {
                const updated = [...prevMessages];
                updated[existingMessageIndex] = message;
                return updated;
            }
            // Add new message if it doesn't exist
            if (prevMessages.some(m => m.id === message.id)) {
                console.warn("Attempted to add duplicate message ID:", message.id);
                return prevMessages; // Avoid adding duplicates
            }
            return [...prevMessages, message];
        });
        // Show unread indicator if user is not at the bottom
        if (!isAtBottom && !messages.some(m => m.id === message.id || (m.clientMessageId && m.clientMessageId === message.clientMessageId))) {
            setHasUnreadMessages(true);
        }
    }, [messages]); // Dependency on messages is needed here for the duplicate check

    // Scroll to bottom when messages change if user was already at the bottom
    useEffect(() => {
        if (userIsAtBottomRef.current) {
            scrollToBottom('smooth');
        }
    }, [messages]);

    // Setup WebSocket connection
    const { sendMessage } = useWebSocket({
        onMessageReceived,
        token,
        chatId // Pass chatId to hook
    });

    // Fetch initial chat data
    useEffect(() => {
        const fetchChatData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [msgRes, grpRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/chat/messages/${chatId}`, { headers: { 'Authorization': `Bearer ${token}`} }),
                    fetch(`${API_BASE_URL}/api/chat/groups`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (!msgRes.ok) throw new Error(`Failed to fetch messages (Status: ${msgRes.status})`);
                if (!grpRes.ok) throw new Error(`Failed to fetch chat groups (Status: ${grpRes.status})`);

                const messagesData = await msgRes.json();
                const groupsData = await grpRes.json();

                const currentGroupParticipant = groupsData.find(p => p.chatGroup.id === chatId);
                if (currentGroupParticipant) {
                    setChatGroup(currentGroupParticipant.chatGroup);
                    setMessages(messagesData);
                    setTimeout(() => scrollToBottom('auto'), 0); // Scroll after render
                } else {
                    throw new Error('Chat group not found or you are not a participant.');
                }
            } catch (err) {
                console.error("Error fetching chat data:", err);
                setError(err.message || 'Could not load chat.');
            } finally {
                setLoading(false);
            }
        };
        if (chatId && token) { fetchChatData(); }
        else if (!token) { setError("Authentication token not found."); setLoading(false); }
    }, [chatId, token]); // Removed navigate dependency

    // Send read receipt
    const handleMarkAsRead = useCallback((messageId) => {
        if (!messageId || !loggedInUser) return;
        const message = messages.find(m => m.id === messageId);
        // Don't mark own messages or already read messages as read
        if (!message || message.sender?.id === loggedInUser.id || message.seenBy?.some(user => user.id === loggedInUser.id)) {
            return;
        }
        sendMessage({ messageId }, `/app/chat/${chatId}/read`);
    }, [sendMessage, chatId, messages, loggedInUser]);

    // IntersectionObserver setup for read receipts
    useEffect(() => {
        if (readObserver.current) readObserver.current.disconnect();
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.7) { // Trigger when mostly visible
                    const messageId = entry.target.dataset.messageId;
                    if (messageId) {
                        handleMarkAsRead(messageId);
                        readObserver.current.unobserve(entry.target); // Stop observing once read
                    }
                }
            });
        };
        readObserver.current = new IntersectionObserver(observerCallback, { root: messageListRef.current, threshold: 0.7 });

        messages.forEach(msg => {
            const element = messageRefs.current[msg.id];
            const isReadByMe = msg.seenBy?.some(user => user.id === loggedInUser?.id);
            // Observe only unread messages from others that have a valid ID and element ref
            if (element && msg.id && !msg.clientMessageId && msg.sender?.id !== loggedInUser?.id && !isReadByMe) {
                try {
                    readObserver.current.observe(element);
                } catch (e) {
                    console.warn("Observer error:", e, "Element:", element);
                }
            }
        });

        // Cleanup observer on unmount or when messages/user change
        return () => { if (readObserver.current) readObserver.current.disconnect(); };
    }, [messages, loggedInUser, handleMarkAsRead]);

    // Handle scroll events to track if user is at the bottom
    const handleScroll = () => {
        if (messageListRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = messageListRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50; // Threshold
            userIsAtBottomRef.current = isNearBottom;
            if (isNearBottom) {
                setHasUnreadMessages(false); // Clear indicator when user scrolls down
            }
        }
    };

    // Handle media file selection and upload
    const handleMediaUpload = async (file) => {
        if (!file || !chatId || !token || !loggedInUser) return;

        setIsUploading(true);
        setUploadError('');
        let processedFile = file;
        let mediaTypeString = 'UNKNOWN'; // Determine type for optimistic message

        try {
            // Determine type and compress images if applicable
            if (file.type.startsWith('image/')) {
                mediaTypeString = 'IMAGE';
                const compressionOptions = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/jpeg', quality: 0.7 };
                try {
                    console.log(`Original image size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                    const compressedBlob = await imageCompression(file, compressionOptions);
                    console.log(`Compressed image size: ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
                    const newFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg';
                    processedFile = new File([compressedBlob], newFileName, { type: 'image/jpeg', lastModified: file.lastModified });
                } catch (compressionError) {
                    console.warn("Image compression failed, uploading original:", compressionError);
                    processedFile = file; // Fallback to original
                }
            } else if (file.type.startsWith('video/')) {
                mediaTypeString = 'VIDEO';
            } else if (file.type.startsWith('audio/')) {
                mediaTypeString = 'AUDIO';
            } else {
                throw new Error("Unsupported file type selected.");
            }

            // Upload the file (original or compressed)
            const formData = new FormData();
            formData.append('media', processedFile);

            const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Media upload failed (Status: ${response.status})`);

            // Send message via WebSocket with media details
            const clientMessageId = `temp-${Date.now()}`;
            const textToSend = newMessage.trim(); // Include text if any

            // Optimistic UI update
            const optimisticMessage = {
                id: clientMessageId, clientMessageId, text: textToSend || null, // Include text
                sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
                timestamp: new Date().toISOString(), reactions: {}, seenBy: [], parentMessageId: replyingTo ? replyingTo.id : null,
                mediaUrl: result.mediaUrl, mediaType: result.mediaType, // Use type from server response
            };
            setMessages(prev => [...prev, optimisticMessage]);

            // Send actual message via WebSocket
            sendMessage({
                text: textToSend || null, // Send text along with media
                clientMessageId,
                parentMessageId: replyingTo ? replyingTo.id : null,
                mediaUrl: result.mediaUrl,
                mediaType: result.mediaType,
            }, `/app/chat/${chatId}/send`);

            // Reset input state
            setNewMessage('');
            setReplyingTo(null);
            if(textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset textarea height
            setTimeout(() => scrollToBottom('smooth'), 50); // Scroll down

        } catch (err) {
            console.error("Media handling/upload error:", err);
            setUploadError(err.message || 'Failed to process or upload media.');
            setTimeout(() => setUploadError(''), 5000); // Clear error after 5s
        } finally {
            setIsUploading(false);
            // Clear the file input value
            if(imageInputRef.current) imageInputRef.current.value = null;
        }
    };


    const handleFileSelected = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleMediaUpload(file);
        }
        // No need to clear event.target.value here if handleMediaUpload does it
    };

    // --- Audio Recording Handlers (unchanged) ---
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

            audioChunks.current = []; // Clear previous chunks
            mediaRecorder.current.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.current.push(event.data);
            };
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${fileExtension}`, { type: mimeType });
                handleMediaUpload(audioFile); // Upload the recorded audio
                stream.getTracks().forEach(track => track.stop()); // Stop microphone access
                audioChunks.current = []; // Clear chunks after processing
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
            mediaRecorder.current.stop(); // This triggers the onstop handler
            setIsRecording(false);
        }
    };
    // --- End Audio Recording ---

    // Send text message
    const handleSendMessage = (event) => {
        event?.preventDefault(); // Prevent form submission if called from keydown
        const textToSend = newMessage.trim();
        // Prevent sending empty messages or while recording/uploading
        if ((!textToSend && !isUploading) || !loggedInUser || isRecording) {
            return;
        }
        if (isUploading && textToSend === '') { // Allow sending text while media uploads, but not empty text
            return;
        }

        const clientMessageId = `temp-${Date.now()}`; // Unique ID for optimistic update

        // Optimistic UI update
        const optimisticMessage = {
            id: clientMessageId, clientMessageId, text: textToSend,
            sender: { id: loggedInUser.id, firstName: 'You', lastName: '' },
            timestamp: new Date().toISOString(), reactions: {}, seenBy: [], parentMessageId: replyingTo ? replyingTo.id : null,
            // mediaUrl: null, mediaType: null // No media for text-only
        };
        setMessages(prev => [...prev, optimisticMessage]);

        // Send actual message via WebSocket
        sendMessage({
            text: textToSend,
            clientMessageId,
            parentMessageId: replyingTo ? replyingTo.id : null
            // No mediaUrl/mediaType needed for text-only
        }, `/app/chat/${chatId}/send`);

        // Reset input state
        setNewMessage('');
        setReplyingTo(null);
        if(textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset textarea height
        setTimeout(() => scrollToBottom('smooth'), 50); // Scroll down
    };

    // Adjust textarea height dynamically
    const handleTextareaInput = (e) => {
        setNewMessage(e.target.value);
        e.target.style.height = 'auto'; // Reset height
        e.target.style.height = `${e.target.scrollHeight}px`; // Set to scroll height
    };

    // Handle Enter key press (send message)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Handle sending a reaction
    const handleReact = (reaction) => {
        if (loggedInUser && activeEmojiPicker) {
            sendMessage({ messageId: activeEmojiPicker, reaction }, `/app/chat/${chatId}/react`);
        }
        setActiveEmojiPicker(null); // Close picker
    };

    // Handle double-click to send a heart reaction
    const handleDoubleClick = (message) => {
        if (!loggedInUser || !message?.id || message?.clientMessageId) return; // Ignore optimistic/invalid
        const reactionType = '❤️';
        sendMessage({ messageId: message.id, reaction: reactionType }, `/app/chat/${chatId}/react`);
        // Trigger heart animation
        setAnimatedHeart(message.id);
        setTimeout(() => setAnimatedHeart(null), 500); // Animation duration
    };

    // --- Interaction Handlers (Long Press & Swipe) ---
    const handleInteractionStart = (e, message) => {
        if (message?.clientMessageId) return; // Don't interact with optimistic messages
        clearTimeout(pressTimer.current); // Clear any existing long-press timer
        // Start a timer for long press (to open reaction picker)
        pressTimer.current = setTimeout(() => {
            if (dragStartXRef.current === null) { // Only trigger if not dragging
                setActiveEmojiPicker(message.id);
            }
        }, 350); // Long press duration
        // Record the starting X position for swipe detection
        dragStartXRef.current = e.clientX || e.touches?.[0]?.clientX;
    };

    const handleInteractionEnd = (e, message) => {
        clearTimeout(pressTimer.current); // Clear long-press timer on release

        // --- FIX: Removed setTimeout wrapper ---
        // Directly check swipe logic
        if (activeEmojiPicker || message?.clientMessageId) {
            // If reaction picker is open or it's an optimistic message, reset drag and do nothing else
            dragStartXRef.current = null;
            return;
        }

        const dragEndX = e.clientX || e.changedTouches?.[0]?.clientX;
        // Check if a drag started, ended, and exceeded the threshold for reply
        if (dragStartXRef.current !== null && dragEndX && dragEndX - dragStartXRef.current > DRAG_THRESHOLD) {
            setReplyingTo(message); // Set the message to reply to
        }
        dragStartXRef.current = null; // Reset drag start position
        // --- END FIX ---
    };


    const handleInteractionMove = (e) => {
        // If a long-press timer is active and drag has started
        if (pressTimer.current && dragStartXRef.current !== null) {
            const currentX = e.clientX || e.touches?.[0]?.clientX;
            // If moved horizontally more than a small amount, cancel the long press timer
            if (currentX && Math.abs(currentX - dragStartXRef.current) > 10) { // Small movement threshold
                clearTimeout(pressTimer.current);
            }
        }
    };
    // --- End Interaction Handlers ---

    // Scroll to the parent message when a reply snippet is clicked
    const handleScrollToMessage = (messageId) => {
        const messageElement = messageRefs.current[messageId];
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the message briefly
            messageElement.classList.add(styles.highlight);
            setTimeout(() => {
                messageElement.classList.remove(styles.highlight);
            }, 1500); // Highlight duration
        }
    };

    // Render loading/error/no data states
    if (loading || !loggedInUser || !chatGroup) {
        return <div className={styles.centeredMessage}>Loading chat...</div>;
    }
    if (error) {
        // Show error within chat window structure for consistency
        return (
            <div className={styles.chatWindow}>
                <header className={styles.chatHeader}>
                    <button onClick={() => navigate('/chat')} className={styles.backButton}><FaArrowLeft /></button>
                    <div className={styles.headerTitleContainer}><h2>Error</h2></div>
                    <div className={styles.headerActions}></div>
                </header>
                <div className={styles.centeredMessage}>{error}</div>
            </div>
        );
    }

    // --- Render Media Function (unchanged) ---
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
    // --- End Render Media ---


    // --- Main JSX Render ---
    return (
        <div className={styles.chatWindow}>
            {/* Header */}
            <header className={styles.chatHeader}>
                <button onClick={() => navigate('/chat')} className={styles.backButton} title="Back to Chat List"> <FaArrowLeft /> </button>
                {/* Clickable header title to open incident details modal */}
                <button onClick={() => setIsIncidentModalOpen(true)} className={styles.headerTitleContainer}>
                    <h2>{chatGroup.name}</h2>
                    <FaInfoCircle className={styles.headerIcon} />
                </button>
                <div className={styles.headerActions}> {/* Placeholder for potential future actions */} </div>
            </header>

            {/* Message List */}
            <main ref={messageListRef} className={styles.messageList} onScroll={handleScroll}>
                {messages.map((msg, index) => {
                    // Logic to determine message grouping, timestamps, date separators etc.
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
                    const showTimestamp = !isFollowedByGrouped || isSentByCurrentUser; // Show timestamp for last in group OR own messages
                    const parentMessage = msg.parentMessageId ? messages.find(m => m.id === msg.parentMessageId) : null;
                    const reactionsCount = msg.reactions ? Object.values(msg.reactions).flat().length : 0;
                    const messageNodeRef = (node) => { if (msg.id) messageRefs.current[msg.id] = node; }; // Ref only for messages with real ID
                    const isReadByOthers = msg.seenBy?.some(user => user.id !== loggedInUser.id);

                    return (
                        <React.Fragment key={msg.id || msg.clientMessageId}>
                            {/* Date Separator */}
                            {showDateSeparator && <div className={styles.dateSeparator}><span>{formatDateSeparator(msg.timestamp)}</span></div>}

                            {/* Message Wrapper */}
                            <div
                                ref={messageNodeRef}
                                data-message-id={msg.id} // Used by IntersectionObserver
                                className={`${styles.messageWrapper} ${isSentByCurrentUser ? styles.sent : styles.received} ${isFirstInGroup ? '' : styles.grouped} ${isFollowedByGrouped ? styles.followedByGrouped : ''}`}
                            >
                                {/* Avatar for received messages */}
                                {!isSentByCurrentUser && (
                                    <div className={styles.avatarContainer}>
                                        {isFirstInGroup && msg.sender && (
                                            <div className={styles.chatAvatarWrapper}> <Avatar userId={msg.sender.id} name={msg.sender.firstName} /> </div>
                                        )}
                                    </div>
                                )}

                                {/* Message Content Area */}
                                <div className={styles.messageContent}>
                                    {/* Sender Name for received messages (first in group) */}
                                    {!isSentByCurrentUser && isFirstInGroup && msg.sender && (
                                        <span className={styles.senderName}>{msg.sender.firstName}</span>
                                    )}

                                    {/* Bubble Container (for bubble, reactions, picker) */}
                                    <div className={styles.bubbleContainer}>
                                        {/* Reply Snippet */}
                                        {parentMessage && (
                                            <div className={styles.repliedMessageSnippet} onClick={() => handleScrollToMessage(parentMessage.id)}>
                                                <p className={styles.replyHeader}>Replied to {parentMessage.sender?.firstName || '...'}</p>
                                                <p className={styles.replyText}>{parentMessage.text || (parentMessage.mediaType ? `[${parentMessage.mediaType.toLowerCase()}]` : '...')}</p>
                                            </div>
                                        )}

                                        {/* Reaction Picker (shown on long press) */}
                                        {activeEmojiPicker === msg.id && <ReactionPicker onReact={handleReact} onClose={() => setActiveEmojiPicker(null)} />}

                                        {/* The actual message bubble */}
                                        <div
                                            className={`${styles.messageBubble} ${msg.mediaUrl ? styles.mediaBubble : ''} ${msg.mediaType === 'AUDIO' ? styles.audioBubble : ''}`}
                                            onMouseDown={(e) => handleInteractionStart(e, msg)}
                                            onMouseUp={(e) => handleInteractionEnd(e, msg)}
                                            onMouseMove={handleInteractionMove}
                                            onMouseLeave={() => { clearTimeout(pressTimer.current); dragStartXRef.current = null; }} // Clear timer/drag on leave
                                            onTouchStart={(e) => handleInteractionStart(e, msg)}
                                            onTouchMove={handleInteractionMove}
                                            onTouchEnd={(e) => handleInteractionEnd(e, msg)}
                                            onDoubleClick={() => handleDoubleClick(msg)}
                                        >
                                            {/* Render Media (Image, Video, Audio Player) */}
                                            {renderMedia(msg)}
                                            {/* Render Text (unless it's only an audio message) */}
                                            {msg.text && msg.mediaType !== 'AUDIO' && <p className={styles.messageText}>{msg.text}</p>}
                                            {/* Render Text if present alongside non-audio media */}
                                            {msg.text && msg.mediaUrl && msg.mediaType !== 'AUDIO' && <p className={styles.messageText}>{msg.text}</p>}

                                            {/* Spinner for optimistic messages */}
                                            {msg.clientMessageId && (isUploading || !msg.id) && <FaSpinner className={styles.optimisticSpinner} />}
                                        </div>

                                        {/* Reactions Display */}
                                        {reactionsCount > 0 && (
                                            <div className={styles.reactionsContainer} onClick={() => setReactionsModalData(msg.reactions)}>
                                                {Object.entries(msg.reactions).slice(0, 3).map(([emoji]) => (<span className={styles.reactionEmoji} key={emoji}>{emoji}</span>))}
                                                <span className={styles.totalReactionCount}>{reactionsCount}</span>
                                            </div>
                                        )}
                                    </div> {/* End bubbleContainer */}

                                    {/* Timestamp and Read Receipt */}
                                    {showTimestamp && msg.timestamp && (
                                        <div className={styles.timestampContainer}>
                                            <span className={styles.timestamp}>{formatDate(msg.timestamp)}</span>
                                            {/* Sent Message Status Icons */}
                                            {isSentByCurrentUser && isReadByOthers && ( <FaCheckDouble className={`${styles.seenIcon} ${styles.read}`} title="Seen by others"/> )}
                                            {isSentByCurrentUser && !isReadByOthers && msg.id && !msg.clientMessageId && ( <FaCheck className={styles.seenIcon} title="Sent"/> )}
                                            {isSentByCurrentUser && msg.clientMessageId && (!isUploading || !msg.id) && (<FaClock className={styles.optimisticIcon} title="Sending..."/>)}
                                        </div>
                                    )}
                                </div> {/* End messageContent */}

                                {/* Animated Heart (on double-click) */}
                                {animatedHeart === msg.id && <div className={styles.animatedHeart}>❤️</div>}

                            </div> {/* End messageWrapper */}
                        </React.Fragment>
                    );
                })}
                {/* Reference for scrolling to bottom */}
                <div ref={messagesEndRef} />
            </main>

            {/* "New Messages" indicator */}
            {hasUnreadMessages &&
                <button className={`${styles.scrollToBottomIndicator} ${styles.visible}`} onClick={() => scrollToBottom('smooth')}>
                    <FaChevronDown /> New Messages
                </button>
            }

            {/* Reply Context Bar */}
            {replyingTo && (
                <div className={styles.replyingToContext}>
                    <div className={styles.replyContextContent}>
                        <p className={styles.replyingToTitle}>Replying to {replyingTo.sender?.firstName || '...'}</p>
                        <p className={styles.replyingToText}>{replyingTo.text || (replyingTo.mediaType ? `[${replyingTo.mediaType.toLowerCase()}]` : '...')}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className={styles.cancelReplyButton} aria-label="Cancel reply">&times;</button>
                </div>
            )}

            {/* Upload Error Bar */}
            {uploadError && <div className={styles.uploadErrorBar}>{uploadError}</div>}

            {/* Footer Input Form */}
            <footer className={`${styles.messageInputForm} ${newMessage.trim() ? styles.typingActive : ''}`}>
                {/* Hidden file input */}
                <input type="file" accept="image/*,video/*" ref={imageInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />

                {/* Action Buttons (Image/Video, Mic) */}
                <div className={styles.actionButtonsContainer}>
                    <button type="button" className={styles.chatActionButton} title="Send Image/Video" onClick={() => imageInputRef.current?.click()} disabled={isUploading || isRecording}>
                        <FaImage />
                    </button>
                    <button type="button" className={`${styles.chatActionButton} ${isRecording ? styles.recordingActive : ''}`} title={isRecording ? "Stop Recording" : "Record Voice Message"} onClick={isRecording ? stopRecording : startRecording} disabled={isUploading}>
                        {isRecording ? <FaStop /> : <FaMicrophone />}
                    </button>
                </div>

                {/* Text Input Area */}
                <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown} // Handle Enter key
                    placeholder={isRecording ? "Recording audio..." : (isUploading ? "Attaching media..." : "Message...")}
                    rows="1"
                    className={styles.messageInput}
                    disabled={isRecording} // Disable text input while recording
                />

                {/* Send Button */}
                <button
                    type="button"
                    onClick={handleSendMessage}
                    // Disable if recording, or if no text and not uploading
                    disabled={isRecording || (!newMessage.trim() && !isUploading)}
                    className={styles.sendButton}
                    aria-label="Send message"
                >
                    {/* Show spinner if uploading media, otherwise paper plane */}
                    {isUploading ? <FaSpinner className={styles.spinner} /> : <FaPaperPlane />}
                </button>
            </footer>

            {/* Modals */}
            {isIncidentModalOpen && chatGroup?.purposeId && (
                <ChatIncidentDetailModal
                    incidentId={chatGroup.purposeId}
                    token={token}
                    onClose={() => setIsIncidentModalOpen(false)}
                />
            )}
            <ReactionsModal reactions={reactionsModalData} onClose={() => setReactionsModalData(null)} />
        </div> // End chatWindow
    );
};

export default ChatWindow;