import React, { useState } from 'react';
import { openWhatsAppSlip, buildWhatsAppSlipText } from '../utils/whatsappHelper';

export default function ViewSlipModal({ customer, onClose, onEdit }) {
  const [copied, setCopied] = useState(false);

  if (!customer) return null;

  const handleCopyText = async () => {
    try {
      const text = buildWhatsAppSlipText(customer);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

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
          {/* Digital WhatsApp Slip Banner */}
          <div className="digital-slip-bar no-print" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.6rem',
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.6rem', color: '#16a34a' }}></i>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#14532d' }}>
                  डिजिटल पावती (WhatsApp Digital Slip)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                  कागदी पावती न देता थेट ग्राहकाच्या व्हॉट्सॲपवर पाठवा
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleCopyText}
                title="Copy Bill Slip Text"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'}></i> {copied ? 'Copied!' : 'Copy Text'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-whatsapp"
                onClick={() => openWhatsAppSlip(customer)}
                title="Send directly on Customer WhatsApp"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
              >
                <i className="fa-brands fa-whatsapp"></i> WhatsApp वर पाठवा
              </button>
            </div>
          </div>

          <div className="tailor-receipt-slip">
            <div className="slip-header">
              <h2>✂️ KAPSE - G 🔰 TAILORS</h2>
              <p>Customer Measurement &amp; Bill Book Record</p>
            </div>

            <div className="slip-grid">
              {/* 1. Customer ID */}
              <div className="slip-field">
                <span className="slip-label">Customer ID</span>
                <span className="slip-value highlight">{customer.id}</span>
              </div>

              {/* 2. Customer Name */}
              <div className="slip-field">
                <span className="slip-label">Customer Name</span>
                <span className="slip-value">{customer.name}</span>
              </div>

              {/* 3. Mobile Number */}
              <div className="slip-field">
                <span className="slip-label">Mobile Number</span>
                <span className="slip-value">{customer.mobile}</span>
              </div>

              {/* 4. Place / Address */}
              <div className="slip-field">
                <span className="slip-label">Place / Address</span>
                <span className="slip-value">{customer.place}</span>
              </div>

              {/* 5. Registration Date */}
              <div className="slip-field">
                <span className="slip-label">Registration Date</span>
                <span className="slip-value">{customer.date}</span>
              </div>

              {/* 6. Delivery Date */}
              <div className="slip-field">
                <span className="slip-label">Delivery Date</span>
                <span className="slip-value" style={{ color: '#0369a1', fontWeight: 700 }}>
                  {customer.deliveryDate ? (
                    <><i className="fa-regular fa-calendar-check" style={{ marginRight: '5px' }}></i>{customer.deliveryDate}</>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>Not set</span>
                  )}
                </span>
              </div>

              {/* Physical Bill Book & Page Number */}
              <div className="slip-field">
                <span className="slip-label">Physical Bill Book Number</span>
                <span className="slip-value"><span className="book-tag-badge">{customer.billBook}</span></span>
              </div>
              <div className="slip-field">
                <span className="slip-label">Book Page Number</span>
                <span className="slip-value"><span className="page-tag-badge">Page {customer.pageNo}</span></span>
              </div>

              {/* Bill & Payment */}
              <div className="slip-field full" style={{
                backgroundColor: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                margin: '0.25rem 0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.65rem',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '0.4rem'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f2942', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-receipt" style={{ color: '#0284c7' }}></i>
                    <span>Bill &amp; Payment Details</span>
                  </span>
                  {Number(customer.balanceDue || 0) > 0 ? (
                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 9px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                      Pending Due
                    </span>
                  ) : Number(customer.totalBill || 0) > 0 ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                      ✓ Fully Paid
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '3px 9px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      ₹0
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.55rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Bill</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f2942', marginTop: '2px' }}>
                      ₹{Number(customer.totalBill || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '0.55rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Advance Paid</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                      ₹{Number(customer.advancePaid || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '0.55rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Balance Due</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                      ₹{Number(customer.balanceDue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {customer.deliveryDate && (
                  <div style={{
                    marginTop: '0.65rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.86rem',
                    color: '#0369a1',
                    fontWeight: 700
                  }}>
                    <i className="fa-regular fa-calendar-check"></i>
                    <span>Promised Delivery Date: {customer.deliveryDate}</span>
                  </div>
                )}
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
          <button
            type="button"
            className="btn btn-whatsapp"
            onClick={() => openWhatsAppSlip(customer)}
            title="Send Digital Slip on WhatsApp"
          >
            <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.15rem' }}></i> Send WhatsApp Slip
          </button>
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
