import React, { useState, useEffect } from 'react';

export default function EditCustomerModal({ customer, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    place: '',
    billBook: '',
    pageNo: '',
    date: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        mobile: customer.mobile || '',
        place: customer.place || '',
        billBook: customer.billBook || '',
        pageNo: customer.pageNo || '',
        date: customer.date || '',
        notes: customer.notes || ''
      });
      setErrors({});
    }
  }, [customer]);

  if (!customer) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Please enter customer name.';
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (!formData.mobile.trim() || cleanMobile.length < 7 || cleanMobile.length > 15) {
      errs.mobile = 'Please enter a valid mobile number.';
    }
    if (!formData.place.trim()) errs.place = 'Please enter place/address.';
    if (!formData.billBook.trim()) errs.billBook = 'Please enter bill book number.';
    if (!formData.pageNo.trim()) errs.pageNo = 'Please enter page number.';
    if (!formData.date.trim()) errs.date = 'Please select a date.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onUpdate(customer.id, formData);
      onClose();
    } catch {
      // handled by parent
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
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
