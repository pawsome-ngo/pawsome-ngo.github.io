import React from 'react';
import styles from '../ChatWindow.module.css';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ReactionPicker = ({ onReact, onClose }) => {
    return (
        <div className={styles.emojiPicker} onClick={(e) => e.stopPropagation()}>
            {EMOJI_OPTIONS.map(emoji => (
                <span key={emoji} onClick={() => onReact(emoji)}>{emoji}</span>
            ))}
        </div>
    );
};

export default ReactionPicker;