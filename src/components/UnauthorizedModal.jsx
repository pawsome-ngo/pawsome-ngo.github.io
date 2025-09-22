import React from 'react';
import styles from './UnauthorizedModal.module.css';
import { FaShieldAlt, FaTimes } from 'react-icons/fa';

const UnauthorizedModal = ({ isOpen, onClose, message }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <FaShieldAlt className={styles.icon} />
                    <h2>Unauthorized Action</h2>
                </div>
                <p className={styles.message}>{message}</p>
                <button onClick={onClose} className={styles.closeButton}>
                    OK
                </button>
            </div>
        </div>
    );
};

export default UnauthorizedModal;