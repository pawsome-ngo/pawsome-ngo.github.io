import React from 'react';
import styles from './ConfirmationModal.module.css';
import { FaExclamationTriangle } from 'react-icons/fa';

const ItemInUseModal = ({ info, onClose }) => {
    if (!info) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <FaExclamationTriangle className={styles.warningIcon} />
                    <h3>Cannot Delete Item</h3>
                </div>
                <p>The item "<strong>{info.itemName}</strong>" cannot be deleted because it is currently in the first-aid kits of the following volunteers:</p>
                <ul className={styles.userList}>
                    {info.users.map(name => <li key={name}>{name}</li>)}
                </ul>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.confirmButton}>OK</button>
                </div>
            </div>
        </div>
    );
};

export default ItemInUseModal;