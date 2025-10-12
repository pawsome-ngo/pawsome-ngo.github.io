import React, { useState, useEffect } from 'react';
import styles from './Avatar.module.css';

// This Vite feature finds all images in the avatars folder at build time
const avatarModules = import.meta.glob('/src/assets/avatars/*');

const Avatar = ({ userId, name, className, onClick }) => {
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        let found = false;
        // Search for an image that matches the user ID (e.g., /src/assets/avatars/1.jpg)
        for (const path in avatarModules) {
            if (path.includes(`/avatars/${userId}.`)) {
                avatarModules[path]().then(mod => {
                    setImageSrc(mod.default);
                });
                found = true;
                break;
            }
        }
        if (!found) {
            setImageSrc(null); // Reset if user ID changes and no image is found
        }
    }, [userId]);

    const initials = name ? name.charAt(0).toUpperCase() : '?';
    const colorHash = name ? [...name].reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0) : 0;
    const color = `hsl(${colorHash % 360}, 70%, 50%)`;

    return (
        <div className={`${styles.avatar} ${className}`} style={{ backgroundColor: color }} onClick={onClick}>
            {imageSrc ? (
                <img src={imageSrc} alt={name} />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
};

export default Avatar;