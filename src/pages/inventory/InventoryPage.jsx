import React, { useState, useEffect, useCallback } from 'react';
import styles from './InventoryPage.module.css';
import { FaPlus, FaTags, FaSpinner, FaBoxOpen, FaClipboardList, FaTruck, FaExclamationTriangle, FaEdit, FaTrash } from 'react-icons/fa';
import AddItemModal from '../../components/common/AddItemModal.jsx';
import CategoryManager from '../../components/common/CategoryManager.jsx';
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx';
import ItemInUseModal from '../../components/common/ItemInUseModal.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const InventoryPage = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [pending, setPending] = useState([]);
    const [approved, setApproved] = useState([]);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemUsageInfo, setItemUsageInfo] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, pendingRes, approvedRes, itemsRes, categoriesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/inventory/dashboard-stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/inventory/requisitions?status=PENDING`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/inventory/requisitions?status=APPROVED`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/inventory/items`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/inventory/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!statsRes.ok || !pendingRes.ok || !approvedRes.ok || !itemsRes.ok || !categoriesRes.ok) {
                throw new Error('Failed to fetch all inventory data.');
            }

            setStats(await statsRes.json());
            setPending(await pendingRes.json());
            setApproved(await approvedRes.json());
            setItems(await itemsRes.json());
            setCategories(await categoriesRes.json());
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (requisitionId, action) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/requisitions/${requisitionId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to ${action} requisition.`);
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSaveItem = async (itemData) => {
        const isEditing = !!itemData.id;
        const url = isEditing
            ? `${API_BASE_URL}/api/inventory/items/${itemData.id}`
            : `${API_BASE_URL}/api/inventory/items`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            if (!response.ok) throw new Error('Failed to save item.');
            await fetchData();
            setIsItemModalOpen(false);
            setEditingItem(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    // --- ✨ Function to handle SAVING a category ---
    const handleSaveCategory = async (categoryData, isEditing) => {
        const url = isEditing
            ? `${API_BASE_URL}/api/inventory/categories/${categoryData.id}`
            : `${API_BASE_URL}/api/inventory/categories`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: categoryData.name }), // Send only the fields the DTO expects
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to save category.');
            }
            await fetchData(); // Refetch all data
            return true; // Signal success to CategoryManager
        } catch (err) {
            setError(err.message); // Set error for the page
            return false; // Signal failure to CategoryManager
        }
    };

    // --- ✨ Function to handle DELETING a category ---
    const handleDeleteCategory = async (categoryId) => {
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                // Check for a specific constraint violation message
                if (errData.message && errData.message.includes('constraint')) {
                    throw new Error('Cannot delete category. It is currently in use by inventory items.');
                }
                throw new Error(errData.message || 'Failed to delete category.');
            }
            await fetchData(); // Refetch all data
            return true; // Signal success
        } catch (err) {
            setError(err.message); // Set error for the page
            return false; // Signal failure
        }
    };
    // --- End Fix ---

    const handleAttemptDelete = async (item) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/items/${item.id}/usage`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not check item usage.');

            const usage = await response.json();
            if (usage.inUse) {
                setItemUsageInfo({ itemName: item.name, users: usage.userNames });
            } else {
                setItemToDelete(item);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/items/${itemToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete item.');
            await fetchData();
            setItemToDelete(null);
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className={styles.container}><div className={styles.centered}><FaSpinner className={styles.spinner} /></div></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Inventory Dashboard</h1>
                    <div className={styles.headerActions}>
                        <button className={styles.actionButton} onClick={() => setIsCategoryModalOpen(true)}><FaTags /> Categories</button>
                        <button className={styles.actionButton} onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}><FaPlus /> New Item</button>
                    </div>
                </header>

                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.pending}`}>
                        <FaClipboardList />
                        <div><span>{stats?.pendingRequisitions || 0}</span><p>Pending Requests</p></div>
                    </div>
                    <div className={`${styles.statCard} ${styles.approved}`}>
                        <FaTruck />
                        <div><span>{stats?.readyForPickup || 0}</span><p>Ready for Dispatch</p></div>
                    </div>
                    <div className={`${styles.statCard} ${styles.lowStock}`}>
                        <FaExclamationTriangle />
                        <div><span>{stats?.lowStockItems || 0}</span><p>Items Low on Stock</p></div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Pending Requests</h2>
                    {pending.length > 0 ? (
                        <div className={styles.requisitionList}>
                            {pending.map(req => (
                                <div key={req.id} className={styles.requisitionCard}>
                                    <div className={styles.cardHeader}>
                                        <strong>{req.userName}</strong>
                                        <span>{new Date(req.requestedAt).toLocaleDateString()}</span>
                                    </div>
                                    <ul className={styles.itemList}>
                                        {req.items.map(item => <li key={item.id}>{item.quantity} x {item.inventoryItemName}</li>)}
                                    </ul>
                                    <div className={styles.cardActions}>
                                        <button onClick={() => handleAction(req.id, 'deny')} className={styles.denyButton}>Deny</button>
                                        <button onClick={() => handleAction(req.id, 'approve')} className={styles.approveButton}>Approve</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className={styles.emptyMessage}>No pending requests.</p>}
                </div>

                <div className={styles.section}>
                    <h2>Ready for Dispatch</h2>
                    {approved.length > 0 ? (
                        <div className={styles.requisitionList}>
                            {approved.map(req => (
                                <div key={req.id} className={styles.requisitionCard}>
                                    <div className={styles.cardHeader}>
                                        <strong>{req.userName}</strong>
                                        <span>Approved: {new Date(req.approvedAt).toLocaleDateString()}</span>
                                    </div>
                                    <ul className={styles.itemList}>
                                        {req.items.map(item => <li key={item.id}>{item.quantity} x {item.inventoryItemName}</li>)}
                                    </ul>
                                    <div className={styles.cardActions}>
                                        <button onClick={() => handleAction(req.id, 'dispatch')} className={styles.dispatchButton}>Mark as Dispatched</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className={styles.emptyMessage}>No requisitions are awaiting dispatch.</p>}
                </div>

                <div className={styles.section}>
                    <h2>Master Inventory List</h2>
                    <div className={styles.inventoryGrid}>
                        {items.map(item => (
                            <div key={item.id} className={`${styles.itemCard} ${item.quantity <= item.lowStockThreshold ? styles.lowStockBorder : ''}`}>
                                <div className={styles.itemInfo}>
                                    <h3>{item.name}</h3>
                                    <p>{item.categoryName}</p>
                                </div>
                                <div className={styles.itemQuantity}>
                                    <span>{item.quantity}</span>
                                    <small>{item.unit}</small>
                                </div>
                                <div className={styles.itemActions}>
                                    <button className={styles.editButton} onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }}><FaEdit /></button>
                                    <button className={styles.deleteButton} onClick={() => handleAttemptDelete(item)}><FaTrash /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isItemModalOpen && (
                <AddItemModal
                    itemToEdit={editingItem}
                    categories={categories}
                    onClose={() => setIsItemModalOpen(false)}
                    onSave={handleSaveItem}
                />
            )}

            {isCategoryModalOpen && (
                <CategoryManager
                    categories={categories}
                    onClose={() => setIsCategoryModalOpen(false)}
                    // --- ✨ FIX: Pass both onSave and onDelete props ---
                    onSave={handleSaveCategory}
                    onDelete={handleDeleteCategory}
                />
            )}

            {itemToDelete && (
                <ConfirmationModal
                    message={`Are you sure you want to permanently delete "${itemToDelete.name}"?`}
                    onConfirm={confirmDeleteItem}
                    onCancel={() => setItemToDelete(null)}
                    confirmText="Delete"
                    confirmClass="delete"
                />
            )}

            {itemUsageInfo && (
                <ItemInUseModal
                    info={itemUsageInfo}
                    onClose={() => setItemUsageInfo(null)}
                />
            )}
        </>
    );
};

export default InventoryPage;