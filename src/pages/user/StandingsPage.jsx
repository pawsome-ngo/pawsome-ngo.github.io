import React, { useState, useEffect } from 'react';
import styles from './StandingsPage.module.css';
import { FaHeart, FaRoad, FaCheckCircle } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const StandingsPage = ({ token }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    setError('Failed to fetch leaderboard.');
                }
            } catch (err) {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [token]);

    const getRankClass = (rank) => {
        if (rank === 1) return styles.gold;
        if (rank === 2) return styles.silver;
        if (rank === 3) return styles.bronze;
        return styles.green; // Changed from '' to styles.green
    };

    if (loading) return <div className={styles.container}>Loading leaderboard...</div>;
    if (error) return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;

    return (
        <div className={styles.container}>
            <h1>Volunteer Standings</h1>
            <div className={styles.leaderboard}>
                {leaderboard.map((user) => (
                    <div key={user.rank} className={`${styles.userRow} ${getRankClass(user.rank)}`}>
                        {/* Group rank and name together */}
                        <div className={styles.rankInfo}>
                            <div className={styles.rank}>
                                <span>{user.rank}</span>
                            </div>
                            <div className={styles.userName}>{user.firstName}</div>
                        </div>

                        {/* The stats will now align in the same row */}
                        <div className={styles.userStats}>
                            <div className={styles.statItem} title="Total Points">
                                <span>{user.points}</span>
                                <span className={styles.pointsLabel}>PTS</span>
                            </div>
                            <div className={styles.statItem} title="Hearts Earned">
                                <FaHeart /> <span>{user.hearts}</span>
                            </div>
                            <div className={styles.statItem} title="Distance Traveled">
                                <FaRoad /> <span>{user.distanceTraveled.toFixed(1)} km</span>
                            </div>
                            <div className={styles.statItem} title="Cases Completed">
                                <FaCheckCircle /> <span>{user.casesCompleted}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StandingsPage;