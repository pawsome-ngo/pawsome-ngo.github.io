import React from 'react';
import styles from './ConfirmationModal.module.css';

const ConfirmationModal = ({ message, onConfirm, onCancel, confirmText = "Confirm", confirmClass = '' }) => {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <p>{message}</p>
                <div className={styles.modalActions}>
                    <button onClick={onCancel} className={styles.cancelButton}>Cancel</button>
                    <button onClick={onConfirm} className={`${styles.confirmButton} ${styles[confirmClass]}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;