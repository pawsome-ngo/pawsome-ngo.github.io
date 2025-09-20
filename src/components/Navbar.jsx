import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
import { FaPaw, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = ({ user, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);

    // Check if the user has the ADMIN role
    const isAdmin = user && user.roles.includes('ADMIN');

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <NavLink to="/chat" className={styles.logoLink} onClick={closeMenu}>
                    <FaPaw className={styles.logoIcon} />
                    <span className={styles.logoText}>Pawsome</span>
                </NavLink>
            </div>

            <div className={`${styles.navBackdrop} ${isMenuOpen ? styles.navBackdropOpen : ''}`} onClick={closeMenu}></div>

            <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
                <NavLink to="/live" className={styles.navLink} onClick={closeMenu}>Live</NavLink>
                <NavLink to="/my-cases" className={styles.navLink} onClick={closeMenu}>My Cases</NavLink>
                <NavLink to="/report" className={styles.navLink} onClick={closeMenu}>Report</NavLink>
                <NavLink to="/standings" className={styles.navLink} onClick={closeMenu}>Standings</NavLink>
                <NavLink to="/adoptions" className={styles.navLink} onClick={closeMenu}>Adoptions</NavLink>
                <NavLink to="/events" className={styles.navLink} onClick={closeMenu}>Events</NavLink>

                {/* Conditionally render the Admin tab */}
                {isAdmin && (
                    <NavLink to="/admin" className={styles.navLink} onClick={closeMenu}>Admin</NavLink>
                )}

                <NavLink to="/profile" className={styles.navLink} onClick={closeMenu}>Profile</NavLink>
                <button onClick={() => { closeMenu(); onLogout(); }} className={styles.logoutButton}>
                    <FaSignOutAlt />
                    <span>Log Out</span>
                </button>
            </nav>

            <button
                className={styles.menuToggle}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
            >
                {isMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
        </header>
    );
};

export default Navbar;