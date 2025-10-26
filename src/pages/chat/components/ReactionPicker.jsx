import React from 'react';
import styles from '../ChatWindow.module.css';
import { FaReply } from 'react-icons/fa'; // 1. Import the Reply icon

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// 2. Accept 'onReply' as a prop
const ReactionPicker = ({ onReact, onReply, onClose }) => {

    const handleReplyClick = (e) => {
        e.stopPropagation();
        onReply(); // 3. Call the onReply function
    };

    return (
        <div className={styles.emojiPicker} onClick={(e) => e.stopPropagation()}>
            {/* 4. Add the Reply button */}
            <span
                className={styles.replyButton}
                onClick={handleReplyClick}
                title="Reply"
            >
                <FaReply />
            </span>

            {/* Existing emoji options */}
            {EMOJI_OPTIONS.map(emoji => (
                <span key={emoji} onClick={() => onReact(emoji)}>{emoji}</span>
            ))}
        </div>
    );
};

export default ReactionPicker;