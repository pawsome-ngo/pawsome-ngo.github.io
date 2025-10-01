import React, { useState } from 'react';
import styles from './CategoryManager.module.css';
import { FaTimes, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const CategoryManager = ({ categories, onClose, onSave, onDelete }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(null); // For delete confirmation

    const handleAddOrUpdate = async () => {
        if (!newCategoryName.trim()) return;

        setIsSubmitting(true);
        const success = await onSave({
            id: editingCategory ? editingCategory.id : undefined,
            name: newCategoryName
        }, !!editingCategory);

        if (success) {
            setNewCategoryName('');
            setEditingCategory(null);
        }
        setIsSubmitting(false);
    };

    const handleEditClick = (category) => {
        setEditingCategory(category);
        setNewCategoryName(category.name);
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setNewCategoryName('');
    };

    const handleDelete = async (categoryId) => {
        setShowConfirm(null); // Close confirmation modal
        await onDelete(categoryId);
    };

    return (
        <>
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
                    <h2>Manage Categories</h2>

                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder={editingCategory ? "Edit category name..." : "Add new category..."}
                        />
                        <button onClick={handleAddOrUpdate} disabled={isSubmitting || !newCategoryName.trim()}>
                            {editingCategory ? <FaEdit /> : <FaPlus />}
                        </button>
                        {editingCategory && <button className={styles.cancelButton} onClick={handleCancelEdit}><FaTimes /></button>}
                    </div>

                    <ul className={styles.categoryList}>
                        {categories.map(cat => (
                            <li key={cat.id}>
                                <span>{cat.name}</span>
                                <div>
                                    <button className={styles.editButton} onClick={() => handleEditClick(cat)}><FaEdit /></button>
                                    <button className={styles.deleteButton} onClick={() => setShowConfirm(cat.id)}><FaTrash /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {showConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.confirmationModal}>
                        <p>Are you sure you want to delete this category? This might affect existing inventory items.</p>
                        <div className={styles.confirmationActions}>
                            <button onClick={() => setShowConfirm(null)}>Cancel</button>
                            <button onClick={() => handleDelete(showConfirm)} className={styles.confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CategoryManager;