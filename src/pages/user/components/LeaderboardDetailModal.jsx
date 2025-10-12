import React from 'react';
import styles from './LeaderboardDetailModal.module.css';
import { FaTimes, FaHeart, FaRoad, FaCheckCircle, FaTrophy } from 'react-icons/fa';
import Avatar from '../../../components/common/Avatar';

const LeaderboardDetailModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>

                <div className={styles.header}>
                    <div className={styles.avatarWrapper}>
                        <Avatar userId={user.id} name={user.firstName} className={styles.avatar} />
                    </div>
                </div>

                <div className={styles.userInfo}>
                    <h2>{user.firstName}</h2>
                    <p>Rank #{user.rank}</p>
                </div>

                <div className={styles.mainStat}>
                    <FaTrophy className={styles.mainStatIcon} />
                    <span className={styles.statValue}>{(user.points ?? 0).toLocaleString()}</span>
                    <span className={styles.statLabel}>Points</span>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <FaHeart className={styles.statIcon} />
                        <span className={styles.statValue}>{user.hearts ?? 0}</span>
                        <span className={styles.statLabel}>Hearts</span>
                    </div>
                    <div className={styles.statItem}>
                        <FaRoad className={styles.statIcon} />
                        <span className={styles.statValue}>{(user.distanceTraveled ?? 0).toFixed(1)} km</span>
                        <span className={styles.statLabel}>Distance</span>
                    </div>
                    <div className={styles.statItem}>
                        <FaCheckCircle className={styles.statIcon} />
                        <span className={styles.statValue}>{user.casesCompleted ?? 0}</span>
                        <span className={styles.statLabel}>Cases</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardDetailModal;