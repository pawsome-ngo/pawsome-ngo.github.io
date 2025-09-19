import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { FaComments, FaInbox, FaUsers } from 'react-icons/fa'; // Added FaUsers for card icon
import styles from './ChatGroupsPage.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Function to get a consistent color for a chat group based on its ID
const getColorForChatGroup = (chatGroupId) => {
    const colors = [
        '#FF6B6B', // Reddish
        '#4ECDC4', // Teal
        '#4F88C9', // Blue
        '#FFC659', // Yellow
        '#A0D8B3', // Greenish
        '#9C88FF'  // Purple
    ];
    const hash = chatGroupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

const ChatGroupsPage = ({ token, onLogout }) => {
    const [chatGroups, setChatGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChatGroups = async () => {
            if (!token) return;

            try {
                const decodedToken = jwtDecode(token);
                setUsername(decodedToken.sub);

                const response = await fetch(`${API_BASE_URL}/api/chat/groups`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
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

    if (loading) return <div className={styles.container}><div className={styles.loadingMessage}>Loading...</div></div>;
    if (error) return <div className={styles.container}><div className={styles.errorMessage}>{error}</div></div>;

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1>Hello, {username}!</h1>
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
                            <FaComments className={styles.cardIcon} />
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{participant.chatGroup.name}</h3>
                                {/* Add more details if available, e.g., latest message, members */}
                                {/* <p className={styles.cardDetail}>Incident #{participant.chatGroup.incidentId}</p> */}
                                {/* <p className={styles.cardDetail}>{participant.chatGroup.membersCount} members</p> */}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatGroupsPage;