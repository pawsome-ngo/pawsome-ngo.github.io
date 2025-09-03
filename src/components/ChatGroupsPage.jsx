import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatGroupsPage.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ChatGroupsPage = ({ token, onLogout }) => {
    const [chatGroups, setChatGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChatGroups = async () => {
            if (!token) return;

            try {
                const response = await fetch(`${API_BASE_URL}/api/chat/groups`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        // 'ngrok-skip-browser-warning': 'true'
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

    if (loading) return <div className={styles.container}>Loading groups...</div>;
    if (error) return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;
    if (chatGroups.length === 0) return <div className={styles.container}>No chat groups found.</div>;

    return (
        <div className={styles.container}>
            <ul className={styles.groupList}>
                {chatGroups.map(participant => (
                    <li key={participant.chatGroup.id} onClick={() => handleGroupClick(participant.chatGroup.id)} className={styles.groupItem}>
                        {participant.chatGroup.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ChatGroupsPage;