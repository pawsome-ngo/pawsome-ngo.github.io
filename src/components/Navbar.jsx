import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = ({ onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <NavLink to="/chat" className={styles.logoLink} onClick={closeMenu}>
                    <span role="img" aria-label="paw print" className={styles.logoIcon}>🐾</span>
                    <span className={styles.logoText}>Pawsome</span>
                </NavLink>
            </div>

            <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
                <NavLink to="/live" className={styles.navLink} onClick={closeMenu}>Live</NavLink>
                <NavLink to="/report" className={styles.navLink} onClick={closeMenu}>Report</NavLink>
                <NavLink to="/standings" className={styles.navLink} onClick={closeMenu}>Standings</NavLink>
                <button onClick={() => { closeMenu(); onLogout(); }} className={`${styles.navLink} ${styles.logoutButton}`}>
                    Log Out
                </button>
            </nav>

            <button
                className={`${styles.menuToggle} ${isMenuOpen ? styles.menuToggleOpen : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
            >
                <span className={styles.hamburgerBar}></span>
                <span className={styles.hamburgerBar}></span>
                <span className={styles.hamburgerBar}></span>
            </button>
        </header>
    );
};

export default Navbar;