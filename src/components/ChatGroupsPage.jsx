import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatGroupsPage.module.css';

const ChatGroupsPage = ({ token, onLogout }) => {
    const [chatGroups, setChatGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChatGroups = async () => {
            if (!token) return;

            try {
                const response = await fetch('http://localhost:8080/api/chat/groups', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setChatGroups(data);
                } else if (response.status === 403) {
                    // Handle forbidden access gracefully
                    setError('You are not authorized to view this page. Logging out.');
                    onLogout(); // Log out the user
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
            <div className={styles.header}>
                <h1>My Chat Groups</h1>
                <button onClick={onLogout} className={styles.logoutButton}>Log Out</button>
            </div>
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