import React, { useState, useEffect } from 'react';
import styles from './LeaderboardPage.module.css';
import { FaCrown } from 'react-icons/fa';

// Your own components - ensure paths are correct
import Avatar from '../../components/common/Avatar';
import LeaderboardDetailModal from './components/LeaderboardDetailModal'; // Ensure this component is imported

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LeaderboardPage = ({ token }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null); // State for the details modal

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!token) {
                setError("Token not found. Please log in.");
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/standings/leaderboard`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setLeaderboard(data);
                } else {
                    setError('Failed to fetch leaderboard data.');
                }
            } catch (err) {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [token]);

    const topThree = leaderboard.slice(0, 3);
    const restOfLeaderboard = leaderboard.slice(3);

    if (loading) return <div className={styles.centered}><div className={styles.spinner}></div></div>;
    if (error) return <div className={styles.centered}><p className={styles.error}>{error}</p></div>;

    return (
        <>
            <div className={styles.container}>
                <div className={styles.topSection}>
                    <div className={styles.header}>
                        {/*<h1>Leaderboard</h1>*/}
                    </div>

                    {topThree.length >= 3 && (
                        <div className={styles.podium}>
                            {[topThree[1], topThree[0], topThree[2]].map((user, index) => {
                                const place = index === 0 ? 'second' : index === 1 ? 'first' : 'third';
                                return (
                                    // ✨ OnClick handler added to the user's container
                                    <div key={user.id} className={`${styles.podiumUser} ${styles[`${place}Place`]}`} onClick={() => setSelectedUser(user)}>
                                        {place === 'first' && <FaCrown className={styles.crownIcon} />}
                                        <div className={styles.podiumAvatarWrapper}>
                                            <div className={styles.podiumRank}>{user.rank}</div>
                                            <Avatar userId={user.id} name={user.firstName} className={styles.podiumAvatar} />
                                        </div>
                                        <h3 className={styles.podiumName}>{user.firstName}</h3>
                                        <p className={styles.podiumPoints}>{user.points.toLocaleString()} pts</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.leaderboardList}>
                    {restOfLeaderboard.map((user) => (
                        // ✨ OnClick handler added to the user's row
                        <div key={user.rank} className={styles.userRow} onClick={() => setSelectedUser(user)}>
                            <div className={styles.rank}>{user.rank}</div>
                            <div className={styles.listAvatarWrapper}>
                                <Avatar userId={user.id} name={user.firstName} />
                            </div>
                            <div className={styles.userName}>{user.firstName}</div>
                            <div className={styles.points}>{user.points.toLocaleString()} pts</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ✨ Details Modal is rendered here instead of the Lightbox */}
            <LeaderboardDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        </>
    );
};

export default LeaderboardPage;