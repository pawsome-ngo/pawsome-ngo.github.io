import React, { useState, useEffect, useRef } from 'react';
import styles from './CustomSelect.module.css';
import { FaChevronDown } from 'react-icons/fa';

const CustomSelect = ({ options, value, onChange, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    const handleSelectClick = () => {
        setIsOpen(!isOpen);
    };

    const handleOptionClick = (optionValue) => {
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Find the label for the current value (which is an ID) to display it
    const selectedOption = options.find(option => option.value == value);
    const displayValue = selectedOption ? selectedOption.label : 'Select...';

    return (
        <div className={styles.customSelect} ref={selectRef}>
            <button type="button" className={styles.selectButton} onClick={handleSelectClick}>
                <span>{displayValue}</span>
                <FaChevronDown className={`${styles.arrowIcon} ${isOpen ? styles.arrowIconOpen : ''}`} />
            </button>
            {isOpen && (
                <ul className={styles.optionsList}>
                    {options.map((option) => (
                        <li
                            key={option.value}
                            className={styles.optionItem}
                            onClick={() => handleOptionClick(option.value)}
                        >
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CustomSelect;