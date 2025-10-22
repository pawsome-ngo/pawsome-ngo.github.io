// File: pawsome-client-react/src/pages/chat/ChatGroupsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { FaComments, FaInbox, FaUsers, FaPaw } from 'react-icons/fa';
import styles from './ChatGroupsPage.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getColorForChatGroup = (chatGroupId) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#4F88C9', '#FFC659', '#A0D8B3', '#9C88FF'
    ];
    const hash = chatGroupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

// --- NEW HELPER FUNCTION ---
const truncateMessage = (message, maxLength = 30) => {
    if (!message) return '';
    if (message.length <= maxLength) {
        return message;
    }
    return message.substring(0, maxLength) + '...';
};
// --- END HELPER FUNCTION ---

const ChatGroupsPage = ({ token, onLogout }) => {
    const [chatGroups, setChatGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [firstName, setFirstName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChatGroups = async () => {
            if (!token) return;

            try {
                const decodedToken = jwtDecode(token);
                setFirstName(decodedToken.firstName);

                const response = await fetch(`${API_BASE_URL}/api/chat/groups`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setChatGroups(data);
                } else if (response.status === 403) {
                    setError('You are not authorized to view this page. Logging out.');
                    onLogout();
                } else {
                    setError('Failed to fetch chat groups.');
                }
            } catch (err) {
                setError('Could not connect to server.');
            } finally {
                setLoading(false);
            }
        };

        fetchChatGroups();
    }, [token, onLogout]);

    const handleGroupClick = (chatId) => {
        navigate(`/chat/${chatId}`);
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.pawSpinner}>
                    <FaPaw className={styles.pawIcon} />
                </div>
                <p>Loading Your Chats...</p>
            </div>
        );
    }

    if (error) return <div className={styles.container}><div className={styles.errorMessage}>{error}</div></div>;

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1>Hello, {firstName}!</h1>
                <p>Your active case conversations are listed below.</p>
            </header>

            {chatGroups.length === 0 ? (
                <div className={styles.emptyState}>
                    <FaInbox className={styles.emptyIcon} />
                    <h2>No Active Conversations</h2>
                    <p>It looks like you haven't been assigned to any rescue cases yet. When you are, your chat groups will magically appear here!</p>
                    <div className={styles.actionArea}>
                        <Link to="/live" className={styles.actionButton}>
                            <FaUsers /> View Live Incidents
                        </Link>
                    </div>
                </div>
            ) : (
                <div className={styles.groupGrid}>
                    {chatGroups.map(participant => (
                        <div
                            key={participant.chatGroup.id}
                            onClick={() => handleGroupClick(participant.chatGroup.id)}
                            className={styles.groupCard}
                            style={{ backgroundColor: getColorForChatGroup(participant.chatGroup.id) }}
                        >
                            {participant.hasUnreadMessages && <div className={styles.unreadIndicator}></div>}
                            <FaComments className={styles.cardIcon} />
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{participant.chatGroup.name}</h3>
                                {participant.lastMessage && (
                                    // --- APPLY TRUNCATION HERE ---
                                    <p className={styles.lastMessage} title={participant.lastMessage}> {/* Added title attribute to show full message on hover */}
                                        {truncateMessage(participant.lastMessage)}
                                    </p>
                                    // --- END TRUNCATION ---
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatGroupsPage;