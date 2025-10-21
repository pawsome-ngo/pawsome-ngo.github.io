// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/components/layout/Navbar.jsx

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
// --- ✨ Import FaFirstAid ---
import { FaPaw, FaSignOutAlt, FaFirstAid } from 'react-icons/fa';

// --- ✨ Accept fullUserProfile as a prop ---
const Navbar = ({ user, fullUserProfile, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Effect to lock body scroll when the menu is open on mobile
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Cleanup function to reset scroll when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);


    const closeMenu = () => setIsMenuOpen(false);

    // Role checks
    const isAdmin = user && user.roles.includes('ROLE_ADMIN');
    const isSuperAdmin = user && user.roles.includes('ROLE_SUPER_ADMIN');
    const isInventoryManager = user && (user.roles.includes('ROLE_INVENTORY_MANAGER') || user.roles.includes('ROLE_SUPER_ADMIN'));

    // --- ✨ Check if user has a kit from the full profile ---
    const hasKit = fullUserProfile?.hasMedicineBox;
    // Get the user ID from the full profile or fall back to the JWT
    const profileUserId = fullUserProfile?.id || user?.id;
    // --- End Check ---

    // Function to apply active styles to NavLink
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

            {/* Backdrop for mobile menu */}
            <div
                className={`${styles.navBackdrop} ${isMenuOpen ? styles.navBackdropOpen : ''}`}
                onClick={closeMenu}
            ></div>

            <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
                <NavLink to="/live" className={getNavLinkClass} onClick={closeMenu}>Live</NavLink>
                <NavLink to="/my-cases" className={getNavLinkClass} onClick={closeMenu}>My Cases</NavLink>
                <NavLink to="/notifications" className={getNavLinkClass} onClick={closeMenu}>Notifications</NavLink>
                <NavLink to="/report" className={getNavLinkClass} onClick={closeMenu}>Report</NavLink>
                <NavLink to="/leaderboard" className={getNavLinkClass} onClick={closeMenu}>Leaderboard</NavLink>
                <NavLink to="/volunteers" className={getNavLinkClass} onClick={closeMenu}>Volunteers</NavLink>

                {/* --- ✨ 3. Conditionally render "My Kit" link (Simplified) --- */}
                {hasKit && (
                    <NavLink
                        to={`/profile/first-aid-kit/${profileUserId}`}
                        className={getNavLinkClass}
                        onClick={closeMenu}
                        title="My First-Aid Kit"
                    >
                        <span>My Kit </span>
                        <FaFirstAid />

                    </NavLink>
                )}
                {/* --- End Link --- */}

                <NavLink to="/adoptions" className={getNavLinkClass} onClick={closeMenu}>Adoptions</NavLink>
                <NavLink to="/events" className={getNavLinkClass} onClick={closeMenu}>Events</NavLink>

                {/* Role-Specific Links */}
                {(isAdmin || isSuperAdmin) && (
                    <NavLink to="/approvals" className={getNavLinkClass} onClick={closeMenu}>Approvals</NavLink>
                )}
                {isInventoryManager && (
                    <NavLink to="/inventory" className={getNavLinkClass} onClick={closeMenu}>Inventory</NavLink>
                )}
                {isSuperAdmin && (
                    <NavLink to="/superadmin" className={getNavLinkClass} onClick={closeMenu}>Super Admin</NavLink>
                )}

                <NavLink to="/profile" className={getNavLinkClass} onClick={closeMenu}>Profile</NavLink>

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
            </nav>

            {/* Animated Hamburger Menu Button */}
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