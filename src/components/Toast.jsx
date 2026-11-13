import React from 'react';

export default function ToastContainer({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        let iconClass = 'fa-circle-check';
        if (toast.type === 'error') iconClass = 'fa-circle-xmark';
        if (toast.type === 'warning') iconClass = 'fa-triangle-exclamation';
        if (toast.type === 'info') iconClass = 'fa-circle-info';

        return (
          <div key={toast.id} className={`toast toast-${toast.type || 'success'}`}>
            <div className="toast-content">
              <div className="toast-icon">
                <i className={`fa-solid ${iconClass}`}></i>
              </div>
              <div className="toast-text">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
              </div>
              <button
                className="toast-close"
                onClick={() => onCloseToast(toast.id)}
                title="Dismiss"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
