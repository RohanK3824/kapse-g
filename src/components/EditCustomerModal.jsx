import React, { useState, useEffect } from 'react';

export default function EditCustomerModal({ customer, onClose, onSave, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    place: '',
    billBook: '',
    pageNo: '',
    date: '',
    notes: '',
    totalBill: '',
    advancePaid: '',
    balanceDue: '0.00',
    deliveryDate: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      // Ensure date is properly formatted as YYYY-MM-DD for HTML5 date input
      let cleanDate = '';
      if (customer.date) {
        if (typeof customer.date === 'string') {
          if (customer.date.includes('T')) {
            cleanDate = customer.date.split('T')[0];
          } else if (customer.date.includes('-')) {
            const parts = customer.date.split('-');
            if (parts[0].length === 4) {
              cleanDate = customer.date;
            } else if (parts[2].length === 4) {
              cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            cleanDate = customer.date;
          }
        } else if (customer.date instanceof Date) {
          cleanDate = customer.date.toISOString().split('T')[0];
        }
      }

      let cleanDeliveryDate = '';
      if (customer.deliveryDate) {
        if (typeof customer.deliveryDate === 'string') {
          if (customer.deliveryDate.includes('T')) {
            cleanDeliveryDate = customer.deliveryDate.split('T')[0];
          } else if (customer.deliveryDate.includes('-')) {
            const parts = customer.deliveryDate.split('-');
            if (parts[0].length === 4) {
              cleanDeliveryDate = customer.deliveryDate;
            } else if (parts[2].length === 4) {
              cleanDeliveryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            cleanDeliveryDate = customer.deliveryDate;
          }
        } else if (customer.deliveryDate instanceof Date) {
          cleanDeliveryDate = customer.deliveryDate.toISOString().split('T')[0];
        }
      }

      const tot = customer.totalBill !== undefined && customer.totalBill !== null ? customer.totalBill : '';
      const adv = customer.advancePaid !== undefined && customer.advancePaid !== null ? customer.advancePaid : '';
      const bal = customer.balanceDue !== undefined && customer.balanceDue !== null 
        ? customer.balanceDue 
        : Math.max(0, (parseFloat(tot) || 0) - (parseFloat(adv) || 0)).toFixed(2);

      setFormData({
        name: customer.name || '',
        mobile: customer.mobile !== undefined ? String(customer.mobile) : '',
        place: customer.place || '',
        billBook: customer.billBook !== undefined ? String(customer.billBook) : '',
        pageNo: customer.pageNo !== undefined ? String(customer.pageNo) : '',
        date: cleanDate || new Date().toISOString().split('T')[0],
        notes: customer.notes || '',
        totalBill: tot,
        advancePaid: adv,
        balanceDue: bal,
        deliveryDate: cleanDeliveryDate
      });
      setErrors({});
    }
  }, [customer]);

  if (!customer) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name || !String(formData.name).trim()) {
      errs.name = 'Please enter customer name.';
    }

    const cleanMobile = String(formData.mobile || '').replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 7 || cleanMobile.length > 15) {
      errs.mobile = 'Please enter a valid mobile number (7-15 digits).';
    }

    if (!formData.place || !String(formData.place).trim()) {
      errs.place = 'Please enter place/address.';
    }

    if (!formData.billBook || !String(formData.billBook).trim()) {
      errs.billBook = 'Please enter bill book number.';
    }

    if (!formData.pageNo || !String(formData.pageNo).trim()) {
      errs.pageNo = 'Please enter page number.';
    }

    if (!formData.date || !String(formData.date).trim()) {
      errs.date = 'Please select a date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'totalBill' || name === 'advancePaid') {
        const tot = parseFloat(name === 'totalBill' ? value : prev.totalBill) || 0;
        const adv = parseFloat(name === 'advancePaid' ? value : prev.advancePaid) || 0;
        next.balanceDue = Math.max(0, tot - adv).toFixed(2);
      }
      return next;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const saveFn = onSave || onUpdate;
      if (saveFn) {
        await saveFn(customer.id, formData);
      }
      onClose();
    } catch (err) {
      console.error('Update customer error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon icon-navy">
              <i className="fa-solid fa-user-pen"></i>
            </div>
            <div>
              <h3>Edit Customer Information</h3>
              <span className="card-subtitle">Updating record in MySQL</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className="form-grid">
              {/* ID Read-only */}
              <div className="form-group full-width">
                <label className="form-label">Customer ID (Auto-Assigned)</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-fingerprint"></i></span>
                  <input type="text" className="form-control" value={customer.id} disabled readOnly />
                </div>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label required">Customer Name</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-user"></i></span>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>

              {/* Mobile */}
              <div className="form-group">
                <label className="form-label required">Mobile Number</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-phone"></i></span>
                  <input
                    type="tel"
                    name="mobile"
                    className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
                    value={formData.mobile}
                    onChange={handleChange}
                  />
                </div>
                {errors.mobile && <div className="field-error">{errors.mobile}</div>}
              </div>

              {/* Place */}
              <div className="form-group full-width">
                <label className="form-label required">Place / Address</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-location-dot"></i></span>
                  <input
                    type="text"
                    name="place"
                    className={`form-control ${errors.place ? 'is-invalid' : ''}`}
                    value={formData.place}
                    onChange={handleChange}
                  />
                </div>
                {errors.place && <div className="field-error">{errors.place}</div>}
              </div>

              {/* Bill Book */}
              <div className="form-group">
                <label className="form-label required">Bill Book Number</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-book"></i></span>
                  <input
                    type="text"
                    name="billBook"
                    className={`form-control ${errors.billBook ? 'is-invalid' : ''}`}
                    value={formData.billBook}
                    onChange={handleChange}
                  />
                </div>
                {errors.billBook && <div className="field-error">{errors.billBook}</div>}
              </div>

              {/* Page Number */}
              <div className="form-group">
                <label className="form-label required">Page Number</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-file-lines"></i></span>
                  <input
                    type="text"
                    name="pageNo"
                    className={`form-control ${errors.pageNo ? 'is-invalid' : ''}`}
                    value={formData.pageNo}
                    onChange={handleChange}
                  />
                </div>
                {errors.pageNo && <div className="field-error">{errors.pageNo}</div>}
              </div>

              {/* Date */}
              <div className="form-group full-width">
                <label className="form-label required">Registration Date</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-calendar"></i></span>
                  <input
                    type="date"
                    name="date"
                    className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
                {errors.date && <div className="field-error">{errors.date}</div>}
              </div>

              {/* Billing & Payment Details */}
              <div className="form-group full-width">
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#0f2942', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                      <i className="fa-solid fa-calculator" style={{ color: '#0284c7' }}></i>
                      <span>Billing &amp; Payment Details</span>
                    </label>
                    {parseFloat(formData.totalBill || 0) > 0 && (
                      parseFloat(formData.balanceDue || 0) > 0 ? (
                        <span style={{ fontSize: '0.82rem', padding: '3px 10px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                          Balance Due: ₹{parseFloat(formData.balanceDue || 0).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.82rem', padding: '3px 10px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                          ✓ Fully Paid
                        </span>
                      )
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                    {/* Total Bill */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                        Total Bill (₹)
                      </label>
                      <div className="input-group">
                        <span className="input-icon" style={{ fontWeight: 700, color: '#0f2942' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          name="totalBill"
                          className="form-control"
                          placeholder="e.g. 500"
                          value={formData.totalBill}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Advance Paid */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, color: '#16a34a' }}>
                        Advance / Paid (₹)
                      </label>
                      <div className="input-group">
                        <span className="input-icon" style={{ fontWeight: 700, color: '#16a34a' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          name="advancePaid"
                          className="form-control"
                          placeholder="e.g. 200"
                          value={formData.advancePaid}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Balance Due */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, color: '#dc2626' }}>
                        Balance Due (₹)
                      </label>
                      <div className="input-group">
                        <span className="input-icon" style={{ fontWeight: 700, color: '#dc2626' }}>₹</span>
                        <input
                          type="text"
                          name="balanceDue"
                          className="form-control"
                          placeholder="0.00"
                          value={formData.balanceDue !== '' ? formData.balanceDue : '0.00'}
                          readOnly
                          style={{ backgroundColor: '#f1f5f9', fontWeight: 700, color: '#dc2626' }}
                        />
                      </div>
                    </div>

                    {/* Delivery Date */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, color: '#0369a1' }}>
                        Delivery Date
                      </label>
                      <div className="input-group">
                        <span className="input-icon" style={{ color: '#0369a1' }}>
                          <i className="fa-regular fa-calendar-check"></i>
                        </span>
                        <input
                          type="date"
                          name="deliveryDate"
                          className="form-control"
                          value={formData.deliveryDate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group full-width">
                <label className="form-label">Additional Notes</label>
                <div className="input-group textarea-group">
                  <span className="input-icon"><i className="fa-solid fa-clipboard"></i></span>
                  <textarea
                    name="notes"
                    className="form-control"
                    rows="3"
                    value={formData.notes}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving Changes...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Save Changes to MySQL
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
