import React from 'react';

export default function Sidebar({
  currentView,
  setCurrentView,
  totalCustomers,
  isOpen,
  onClose,
  dbStatus,
  onExport
}) {
  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`} 
        onClick={onClose} 
      />
      <aside className={`sidebar ${isOpen ? 'show' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="logo-icon">
              <i className="fa-solid fa-scissors"></i>
            </div>
            <div className="brand-text">
              <h2>Kapse - G 🔰</h2>
            </div>
          </div>
          <button className="btn-close-sidebar" onClick={onClose} title="Close Sidebar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN MENU</div>
          <ul className="nav-list">
            <li className="nav-item">
              <a
                className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setCurrentView('dashboard'); onClose(); }}
              >
                <i className="fa-solid fa-gauge-high"></i>
                <span>Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentView === 'add-customer' ? 'active' : ''}`}
                onClick={() => { setCurrentView('add-customer'); onClose(); }}
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>Add New Customer</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentView === 'records' ? 'active' : ''}`}
                onClick={() => { setCurrentView('records'); onClose(); }}
              >
                <i className="fa-solid fa-address-book"></i>
                <span>Customer Records</span>
                <span className="nav-badge">{totalCustomers}</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentView === 'search' ? 'active' : ''}`}
                onClick={() => { setCurrentView('search'); onClose(); }}
              >
                <i className="fa-solid fa-magnifying-glass"></i>
                <span>Search Customer</span>
              </a>
            </li>
          </ul>

          <div className="nav-section-label">DATA & EXPORT</div>
          <ul className="nav-list">
            <li className="nav-item">
              <a className="nav-link" onClick={() => { onExport(); onClose(); }}>
                <i className="fa-solid fa-file-excel"></i>
                <span>Export to Excel</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="db-status-card">
            <div className="db-status-header">
              <span className={`status-indicator ${dbStatus?.connected ? 'online' : 'offline'}`}></span>
              <span className="status-title">
                {dbStatus?.connected ? 'System Online' : 'System Offline'}
              </span>
            </div>
            <p className="db-file-name">
              <i className="fa-solid fa-shield-halved"></i> Live &amp; Secured
            </p>
            <small className="db-info">
              {dbStatus?.connected ? `Active Records: ${totalCustomers}` : 'Connection check required'}
            </small>
          </div>
        </div>
      </aside>
    </>
  );
}
