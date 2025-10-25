// File: pawsome-client-react/src/components/layout/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
// --- 1. IMPORT ICONS ---
import {
    FaPaw, FaSignOutAlt, FaFirstAid, FaUsers, FaBroadcastTower, FaBriefcase,
    FaBell, FaExclamationTriangle, FaTrophy, FaUserFriends, FaUserCheck,
    FaBoxes, FaUser, FaCalendarAlt, FaHandsHelping, FaCog, FaUserShield
} from 'react-icons/fa'; // Added many icons
// --- END IMPORTS ---

const Navbar = ({ user, fullUserProfile, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMenuOpen]);

    const closeMenu = () => setIsMenuOpen(false);

    // Role checks
    const isAdmin = user && user.roles.includes('ROLE_ADMIN');
    const isSuperAdmin = user && user.roles.includes('ROLE_SUPER_ADMIN');
    const isInventoryManager = user && (user.roles.includes('ROLE_INVENTORY_MANAGER') || user.roles.includes('ROLE_SUPER_ADMIN'));
    const hasKit = fullUserProfile?.hasMedicineBox;
    const profileUserId = fullUserProfile?.id || user?.id;

    const getNavLinkClass = ({ isActive }) => {
        return isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink;
    };

    return (
        <header className={`${styles.header} ${isMenuOpen ? styles.headerOpen : ''}`}>
            <div className={styles.logoContainer}>
                <NavLink to="/chat" className={styles.logoLink} onClick={closeMenu}>
                    <FaPaw className={styles.logoIcon} />
                    <span className={styles.logoText}>Pawsome</span>
                </NavLink>
            </div>

            <div
                className={`${styles.navBackdrop} ${isMenuOpen ? styles.navBackdropOpen : ''}`}
                onClick={closeMenu}
            ></div>

            <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
                {/* --- 2. ADD ICONS TO NavLinks --- */}

                <NavLink to="/live" className={getNavLinkClass} onClick={closeMenu}>
                    <FaBroadcastTower />
                    <span>Live Incidents</span>
                </NavLink>
                <NavLink to="/my-cases" className={getNavLinkClass} onClick={closeMenu}>
                    <FaBriefcase />
                    <span>My Cases</span>
                </NavLink>
                <NavLink to="/notifications" className={getNavLinkClass} onClick={closeMenu}>
                    <FaBell />
                    <span>Notifications</span>
                </NavLink>
                <NavLink to="/report" className={getNavLinkClass} onClick={closeMenu}>
                    <FaExclamationTriangle />
                    <span>Report Incident</span>
                </NavLink>
                <NavLink to="/leaderboard" className={getNavLinkClass} onClick={closeMenu}>
                    <FaTrophy />
                    <span>Leaderboard</span>
                </NavLink>
                <NavLink to="/volunteers" className={getNavLinkClass} onClick={closeMenu}>
                    <FaUserFriends />
                    <span>Volunteers</span>
                </NavLink>

                {hasKit && (
                    <NavLink
                        to={`/profile/first-aid-kit/${profileUserId}`}
                        className={getNavLinkClass}
                        onClick={closeMenu}
                        title="My First-Aid Kit"
                    >
                        <FaFirstAid />
                        <span>My Kit</span>
                    </NavLink>
                )}

                <NavLink to="/gchat" className={getNavLinkClass} onClick={closeMenu}>
                    <FaUsers />
                    <span>Global Chat</span>
                </NavLink>

                {(isAdmin || isSuperAdmin) && (
                    <NavLink to="/approvals" className={getNavLinkClass} onClick={closeMenu}>
                        <FaUserCheck />
                        <span>Approvals</span>
                    </NavLink>
                )}
                {isInventoryManager && (
                    <NavLink to="/inventory" className={getNavLinkClass} onClick={closeMenu}>
                        <FaBoxes />
                        <span>Inventory</span>
                    </NavLink>
                )}
                {isSuperAdmin && (
                    <NavLink to="/superadmin" className={getNavLinkClass} onClick={closeMenu}>
                        <FaUserShield />
                        <span>Super Admin</span>
                    </NavLink>
                )}

                <NavLink to="/chat" className={getNavLinkClass} onClick={closeMenu}>
                    {/* Reuse FaUsers or choose another like FaComments */}
                    <FaUsers />
                    <span>Incident Chats</span>
                </NavLink>
                <NavLink to="/profile" className={getNavLinkClass} onClick={closeMenu}>
                    <FaUser />
                    <span>Profile</span>
                </NavLink>
                {/* Static Pages (Optional Icons) */}
                {/*
                 <NavLink to="/adoptions" className={getNavLinkClass} onClick={closeMenu}>
                     <FaHandsHelping />
                     <span>Adoptions</span>
                 </NavLink>
                 <NavLink to="/events" className={getNavLinkClass} onClick={closeMenu}>
                     <FaCalendarAlt />
                     <span>Events</span>
                 </NavLink>
                 */}

                <button
                    onClick={() => {
                        closeMenu();
                        onLogout();
                    }}
                    className={styles.logoutButton}
                >
                    <FaSignOutAlt />
                    <span>Log Out</span>
                </button>
                {/* --- END ICON ADDITIONS --- */}
            </nav>

            <button
                className={`${styles.menuToggle} ${isMenuOpen ? styles.menuToggleOpen : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
            >
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
            </button>
        </header>
    );
};

export default Navbar;