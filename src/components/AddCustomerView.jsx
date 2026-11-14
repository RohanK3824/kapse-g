import React, { useState } from 'react';

export default function AddCustomerView({ onAddCustomer, isLaptopOnline = true }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const initialForm = {
    name: '',
    mobile: '',
    place: '',
    billBook: '',
    pageNo: '',
    date: getTodayDate(),
    notes: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter the customer's full name.";
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (!formData.mobile.trim() || cleanMobile.length < 7 || cleanMobile.length > 15) {
      newErrors.mobile = 'Please enter a valid mobile number (7-15 digits).';
    }

    if (!formData.place.trim()) {
      newErrors.place = 'Please enter customer place or town.';
    }

    if (!formData.billBook.trim()) {
      newErrors.billBook = 'Please enter the bill book number.';
    }

    if (!formData.pageNo.trim()) {
      newErrors.pageNo = 'Please enter the page number in the bill book.';
    }

    if (!formData.date.trim()) {
      newErrors.date = 'Please select a registration date.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onAddCustomer(formData);
      // Reset form on success
      setFormData({ ...initialForm, date: getTodayDate() });
      setErrors({});
    } catch {
      // Handled by parent toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...initialForm, date: getTodayDate() });
    setErrors({});
  };

  return (
    <div className="form-card-container">
      <div className="card form-card">
        <div className="card-header border-bottom">
          <div className="card-title-group">
            <div className="title-icon">
              <i className="fa-solid fa-user-plus"></i>
            </div>
            <div>
              <h3>Customer Registration Form</h3>
              <p className="card-subtitle">
                {isLaptopOnline 
                  ? 'Fill in all required customer details. Information is stored directly in MySQL.' 
                  : 'Laptop is offline. Details will be saved in the Temporary Cloud Queue and synced automatically when laptop is turned on.'}
              </p>
            </div>
          </div>
          <div className="form-header-badge">
            {isLaptopOnline ? (
              <span className="badge badge-mysql">
                <i className="fa-solid fa-database"></i> MySQL DB
              </span>
            ) : (
              <span className="badge badge-warning">
                <i className="fa-solid fa-cloud-arrow-up"></i> Cloud Queue
              </span>
            )}
          </div>
        </div>

        {!isLaptopOnline && (
          <div style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#b45309',
            fontSize: '0.85rem'
          }}>
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.1rem' }}></i>
            <div>
              <strong>Remote Data Entry Active:</strong> Customer records added on this device will be queued securely in temporary cloud storage and automatically inserted into your laptop's MySQL database as soon as the laptop is switched ON.
            </div>
          </div>
        )}

        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              {/* 1. Customer Name */}
              <div className="form-group">
                <label className="form-label required">Customer Name</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-user"></i></span>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>

              {/* 2. Mobile Number */}
              <div className="form-group">
                <label className="form-label required">Mobile Number</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-phone"></i></span>
                  <input
                    type="tel"
                    name="mobile"
                    className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
                    placeholder="e.g. 9876543210"
                    value={formData.mobile}
                    onChange={handleChange}
                  />
                </div>
                {errors.mobile && <div className="field-error">{errors.mobile}</div>}
              </div>

              {/* 3. Place / Address */}
              <div className="form-group full-width">
                <label className="form-label required">Place / Address</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-location-dot"></i></span>
                  <input
                    type="text"
                    name="place"
                    className={`form-control ${errors.place ? 'is-invalid' : ''}`}
                    placeholder="e.g. Gandhi Chowk, Shop No. 12, Main Road"
                    value={formData.place}
                    onChange={handleChange}
                  />
                </div>
                {errors.place && <div className="field-error">{errors.place}</div>}
              </div>

              {/* 4. Bill Book Number */}
              <div className="form-group">
                <label className="form-label required">Bill Book Number</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-book"></i></span>
                  <input
                    type="text"
                    name="billBook"
                    className={`form-control ${errors.billBook ? 'is-invalid' : ''}`}
                    placeholder="e.g. B-04 or 2026-A"
                    value={formData.billBook}
                    onChange={handleChange}
                  />
                </div>
                {errors.billBook && <div className="field-error">{errors.billBook}</div>}
              </div>

              {/* 5. Page Number */}
              <div className="form-group">
                <label className="form-label required">Page Number</label>
                <div className="input-group">
                  <span className="input-icon"><i className="fa-solid fa-file-lines"></i></span>
                  <input
                    type="text"
                    name="pageNo"
                    className={`form-control ${errors.pageNo ? 'is-invalid' : ''}`}
                    placeholder="e.g. 84"
                    value={formData.pageNo}
                    onChange={handleChange}
                  />
                </div>
                {errors.pageNo && <div className="field-error">{errors.pageNo}</div>}
              </div>

              {/* 6. Registration Date */}
              <div className="form-group">
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
                <small className="field-hint">Automatically defaults to today's date.</small>
              </div>

              {/* 7. Additional Notes */}
              <div className="form-group full-width">
                <label className="form-label">
                  Additional Notes <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div className="input-group textarea-group">
                  <span className="input-icon"><i className="fa-solid fa-clipboard"></i></span>
                  <textarea
                    name="notes"
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Measurements: Chest 38, Waist 32, Length 30. Fabric: Italian Wool. Urgent delivery by Saturday."
                    value={formData.notes}
                    onChange={handleChange}
                  ></textarea>
                </div>
                <small className="field-hint">
                  Optional tailor notes, fabric preferences, special measurements, or fitting remarks.
                </small>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                <i className="fa-solid fa-rotate-left"></i> Reset Form
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Saving to MySQL...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> Save Customer to MySQL
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="tips-card">
        <h4><i className="fa-solid fa-lightbulb"></i> Tailor Shop Workflow Notes</h4>
        <ul>
          <li><strong>Bill Book &amp; Page Registry:</strong> Keeping physical references allows instant physical lookups when customers return for trials or alterations.</li>
          <li><strong>MySQL Persistence:</strong> All data is permanently stored in MySQL tables, fully indexed for high performance.</li>
          <li><strong>Unique IDs:</strong> Each customer receives an auto-generated unique identifier (e.g. <code>CUST-1001</code>).</li>
        </ul>
      </div>
    </div>
  );
}
