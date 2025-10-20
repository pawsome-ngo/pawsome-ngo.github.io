import React from 'react';
import styles from './ConfirmationModal.module.css';

const ConfirmationModal = ({ message, onConfirm, onCancel, confirmText = "Confirm", confirmClass = '', confirmDisabled = false, cancelDisabled = false }) => {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                {/* Render message - could be string or JSX */}
                {typeof message === 'string' ? <p>{message}</p> : message}
                <div className={styles.modalActions}>
                    <button onClick={onCancel} className={styles.cancelButton} disabled={cancelDisabled}>Cancel</button>
                    <button
                        onClick={onConfirm}
                        className={`${styles.confirmButton} ${styles[confirmClass]}`}
                        disabled={confirmDisabled} // Use the prop here
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ConfirmationModal;