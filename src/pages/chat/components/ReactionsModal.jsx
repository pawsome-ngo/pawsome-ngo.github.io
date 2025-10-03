import React from 'react';
import styles from '../ChatWindow.module.css';

const ReactionsModal = ({ reactions, onClose }) => {
    if (!reactions) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.reactionsModal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.modalHeader}>
                    <h3 style={{ margin: 0 }}>Reactions</h3>
                    <button onClick={onClose} className={styles.modalCloseButton}>&times;</button>
                </header>
                <div className={styles.modalContent}>
                    {Object.entries(reactions).map(([emoji, users]) => (
                        <div key={emoji} className={styles.modalReactionItem}>
                            <span className={styles.modalReactionEmoji}>{emoji}</span>
                            <span>{users.map(user => user.firstName).join(', ')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReactionsModal;