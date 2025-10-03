import React, { useState } from 'react';
import styles from './CloseIncidentModal.module.css';

const CloseIncidentModal = ({ isOpen, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Close Incident</h2>
                <p>Please provide a reason for closing this incident.</p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Duplicate report, unable to locate, etc."
                    rows="4"
                />
                <div className={styles.actions}>
                    <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
                    <button onClick={handleSubmit} disabled={!reason.trim()} className={styles.submitButton}>
                        Confirm & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloseIncidentModal;