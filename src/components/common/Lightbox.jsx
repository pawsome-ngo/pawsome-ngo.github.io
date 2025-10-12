import React from 'react';
import styles from './Lightbox.module.css';
import { FaTimes } from 'react-icons/fa';

const Lightbox = ({ src, alt, onClose }) => {
    if (!src) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <img src={src} alt={alt} className={styles.image} />
                <button onClick={onClose} className={styles.closeButton}>
                    <FaTimes />
                </button>
            </div>
        </div>
    );
};

export default Lightbox;