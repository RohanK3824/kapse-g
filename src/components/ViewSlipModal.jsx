import React from 'react';

export default function ViewSlipModal({ customer, onClose, onEdit }) {
  if (!customer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon">
              <i className="fa-solid fa-address-card"></i>
            </div>
            <div>
              <h3>Customer Measurement &amp; Bill Details</h3>
              <span className="card-subtitle">{customer.name} ({customer.id})</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="tailor-receipt-slip">
            <div className="slip-header">
              <h2>✂️ KAPSE - G 🔰 TAILORS</h2>
              <p>Customer Measurement &amp; Bill Book Record</p>
            </div>

            <div className="slip-grid">
              <div className="slip-field">
                <span className="slip-label">Customer ID</span>
                <span className="slip-value highlight">{customer.id}</span>
              </div>
              <div className="slip-field">
                <span className="slip-label">Registration Date</span>
                <span className="slip-value">{customer.date}</span>
              </div>

              <div className="slip-field">
                <span className="slip-label">Customer Name</span>
                <span className="slip-value">{customer.name}</span>
              </div>
              <div className="slip-field">
                <span className="slip-label">Mobile Number</span>
                <span className="slip-value">{customer.mobile}</span>
              </div>

              <div className="slip-field full">
                <span className="slip-label">Place / Address</span>
                <span className="slip-value">{customer.place}</span>
              </div>

              <div className="slip-field">
                <span className="slip-label">Physical Bill Book Number</span>
                <span className="slip-value"><span className="book-tag-badge">{customer.billBook}</span></span>
              </div>
              <div className="slip-field">
                <span className="slip-label">Book Page Number</span>
                <span className="slip-value"><span className="page-tag-badge">Page {customer.pageNo}</span></span>
              </div>

              <div className="slip-field full">
                <span className="slip-label">Tailor Notes &amp; Measurements</span>
                <div className="slip-notes-box">
                  <p>{customer.notes || 'No additional notes recorded.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => window.print()}>
            <i className="fa-solid fa-print"></i> Print Slip
          </button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(customer); }}>
            <i className="fa-solid fa-pen-to-square"></i> Edit Customer
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
