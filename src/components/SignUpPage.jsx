import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import SignUpModal from './SignUpModal';
import CustomSelect from './CustomSelect'; // Assuming this component exists
import styles from './SignUpPage.module.css';
import appStyles from '../App.module.css'; // Assuming this file exists for button styles

const SignUpPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        username: '',
        password: '',
        hasVehicle: 'No',
        hasMedicineBox: 'No',
        experienceLevel: 'Beginner',
    });
    const [modalContent, setModalContent] = useState({ isOpen: false, message: '', isError: false });
    const [apiError, setApiError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(''); // Clear previous errors

        const payload = {
            ...formData,
            hasVehicle: formData.hasVehicle === 'Yes',
            hasMedicineBox: formData.hasMedicineBox === 'Yes',
        };

        try {
            const response = await fetch('http://localhost:8080/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setModalContent({
                    isOpen: true,
                    message: 'Thank you for signing up! Your account is pending approval from an administrator.',
                    isError: false
                });
            } else {
                const errorData = await response.json();
                setApiError(errorData.message || 'An unknown error occurred. Please try again.');
            }
        } catch (error) {
            setApiError('Could not connect to the server. Please check your connection and try again.');
        }
    };

    const closeModal = () => {
        setModalContent({ isOpen: false, message: '', isError: false });
        if (!modalContent.isError) {
            navigate('/'); // Navigate home on successful signup
        }
    };

    const yesNoOptions = [{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }];
    const experienceOptions = [
        { value: 'Beginner', label: 'Beginner' },
        { value: 'Intermediate', label: 'Intermediate' },
        { value: 'Advanced', label: 'Advanced' },
        { value: 'Expert', label: 'Expert' }
    ];

    return (
        <>
            <div className={styles.formContainer}>
                <Link to="/" className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Home</span>
                </Link>

                <div className={styles.formHeader}>
                    <h1>Join Our Team</h1>
                    <p>Become a Pawsome volunteer and make a difference.</p>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="firstName" className={styles.formLabel}>First Name</label>
                            <input type="text" id="firstName" name="firstName" className={styles.formInput} value={formData.firstName} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="lastName" className={styles.formLabel}>Last Name</label>
                            <input type="text" id="lastName" name="lastName" className={styles.formInput} value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="phoneNumber" className={styles.formLabel}>Phone Number</label>
                            <input type="tel" id="phoneNumber" name="phoneNumber" className={styles.formInput} value={formData.phoneNumber} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="username" className={styles.formLabel}>Username</label>
                            <input type="text" id="username" name="username" className={styles.formInput} value={formData.username} onChange={handleChange} required />
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label htmlFor="password" className={styles.formLabel}>Create a Password</label>
                            <input type="password" id="password" name="password" className={styles.formInput} value={formData.password} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="experienceLevel" className={styles.formLabel}>Experience Level</label>
                            <CustomSelect name="experienceLevel" options={experienceOptions} value={formData.experienceLevel} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="hasVehicle" className={styles.formLabel}>Do you have a vehicle?</label>
                            <CustomSelect name="hasVehicle" options={yesNoOptions} value={formData.hasVehicle} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="hasMedicineBox" className={styles.formLabel}>Do you have a First-Aid Kit?</label>
                            <CustomSelect name="hasMedicineBox" options={yesNoOptions} value={formData.hasMedicineBox} onChange={handleChange} />
                        </div>
                    </div>
                    {apiError && <p className={styles.apiError}>{apiError}</p>}
                    <button type="submit" className={`${appStyles.btn} ${appStyles.btnPrimary} ${appStyles.btnFullWidth}`}>Sign Up</button>
                </form>
            </div>

            <SignUpModal isOpen={modalContent.isOpen} onClose={closeModal}>
                <div className={appStyles.successModal}>
                    <div className={appStyles.successModalIcon}>{modalContent.isError ? '❌' : '✔'}</div>
                    <h2 className={appStyles.successModalTitle}>{modalContent.isError ? 'Error' : 'Thank You!'}</h2>
                    <p className={appStyles.successModalMessage}>
                        {modalContent.message}
                    </p>
                    <button onClick={closeModal} className={`${appStyles.btn} ${appStyles.btnPrimary}`}>
                        Got it!
                    </button>
                </div>
            </SignUpModal>
        </>
    );
};

export default SignUpPage;
