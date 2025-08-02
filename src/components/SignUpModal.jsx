import React from 'react';
import styles from './SignUpModal.module.css';

const SignUpModal = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalCloseBtn} onClick={onClose}>
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
};

export default SignUpModal;
