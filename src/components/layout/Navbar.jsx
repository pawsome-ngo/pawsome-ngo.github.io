// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/components/layout/Navbar.jsx

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
import { FaPaw, FaSignOutAlt } from 'react-icons/fa';

const Navbar = ({ user, onLogout }) => {
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

    // Role checks (assuming roles are available in the user object from JWT)
    const isAdmin = user && user.roles && user.roles.includes('ROLE_ADMIN');
    const isSuperAdmin = user && user.roles && user.roles.includes('ROLE_SUPER_ADMIN');
    const isInventoryManager = user && user.roles && (user.roles.includes('ROLE_INVENTORY_MANAGER') || user.roles.includes('ROLE_SUPER_ADMIN'));

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
                {/* Core User Links */}
                <NavLink to="/live" className={getNavLinkClass} onClick={closeMenu}>Live</NavLink>
                <NavLink to="/my-cases" className={getNavLinkClass} onClick={closeMenu}>My Cases</NavLink>
                <NavLink to="/notifications" className={getNavLinkClass} onClick={closeMenu}>Notifications</NavLink>
                <NavLink to="/report" className={getNavLinkClass} onClick={closeMenu}>Report Incident</NavLink>
                <NavLink to="/leaderboard" className={getNavLinkClass} onClick={closeMenu}>Leaderboard</NavLink>
                <NavLink to="/volunteers" className={getNavLinkClass} onClick={closeMenu}>Volunteers</NavLink>

                {/* Static/Info Links */}
                <NavLink to="/adoptions" className={getNavLinkClass} onClick={closeMenu}>Adoptions</NavLink>
                <NavLink to="/events" className={getNavLinkClass} onClick={closeMenu}>Events</NavLink>

                {/* Role-Specific Links */}
                {(isAdmin || isSuperAdmin) && (
                    <NavLink to="/approvals" className={getNavLinkClass} onClick={closeMenu}>Approvals</NavLink>
                )}
                {isInventoryManager && (
                    <NavLink to="/inventory" className={getNavLinkClass} onClick={closeMenu}>Inventory</NavLink>
                )}
                {/* --- ✨ Add Super Admin Link --- */}
                {isSuperAdmin && (
                    <NavLink to="/superadmin" className={getNavLinkClass} onClick={closeMenu}>Super Admin</NavLink>
                )}
                {/* --- End Link --- */}

                {/* Profile Link */}
                <NavLink to="/profile" className={getNavLinkClass} onClick={closeMenu}>Profile</NavLink>

                {/* Logout Button */}
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