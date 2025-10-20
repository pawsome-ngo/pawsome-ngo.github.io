import React, { useState } from 'react';
import styles from './ArchiveConfirmationModal.module.css'; // We will create this CSS file
import { FaTrash, FaArchive, FaExclamationTriangle } from 'react-icons/fa';

const ArchiveConfirmationModal = ({
                                      message,
                                      onConfirm,
                                      onCancel,
                                      confirmText = "Yes, Delete",
                                      cancelText = "No, Keep It",
                                      isProcessing = false
                                  }) => {
    // Default to archiving
    const [shouldArchive, setShouldArchive] = useState(true);

    const handleConfirm = () => {
        onConfirm(shouldArchive); // Pass the checkbox state up
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <FaExclamationTriangle className={styles.warningIcon} />
                <h3>Are you sure?</h3>
                <p>{message}</p>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={shouldArchive}
                        onChange={(e) => setShouldArchive(e.target.checked)}
                        disabled={isProcessing}
                    />
                    <FaArchive />
                    Archive incident details before deleting?
                </label>

                <div className={styles.modalActions}>
                    <button onClick={onCancel} className={styles.cancelButton} disabled={isProcessing}>
                        {cancelText}
                    </button>
                    <button onClick={handleConfirm} className={styles.confirmButton} disabled={isProcessing}>
                        {isProcessing ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArchiveConfirmationModal;