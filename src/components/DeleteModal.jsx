import React, { useState } from 'react';

export default function DeleteModal({ customer, onClose, onConfirmDelete }) {
  const [deleting, setDeleting] = useState(false);

  if (!customer) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirmDelete(customer.id);
      onClose();
    } catch {
      // handled by parent toast
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: 'none' }}>
          <div className="danger-icon-badge">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f2942', marginBottom: '0.5rem' }}>
            Delete Customer Record?
          </h3>
          <p style={{ fontSize: '0.95rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            Are you sure you want to delete customer <strong>{customer.name}</strong> ({customer.id})?
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            This customer will be permanently removed from the MySQL database (<code>tailor_shop_db</code>). This action cannot be undone.
          </p>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Deleting...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-can"></i> Yes, Delete Customer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
