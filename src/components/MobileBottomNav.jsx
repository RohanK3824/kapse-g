import React from 'react';

export default function MobileBottomNav({ currentView, setCurrentView, customerCount }) {
  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => setCurrentView('dashboard')}
      >
        <i className="fa-solid fa-gauge-high"></i>
        <span>Dashboard</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'add-customer' ? 'active' : ''}`}
        onClick={() => setCurrentView('add-customer')}
      >
        <i className="fa-solid fa-user-plus"></i>
        <span>Add</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'records' ? 'active' : ''}`}
        onClick={() => setCurrentView('records')}
      >
        <div className="mobile-nav-icon-wrap">
          <i className="fa-solid fa-address-book"></i>
          {customerCount > 0 && (
            <span className="mobile-nav-badge">{customerCount}</span>
          )}
        </div>
        <span>Records</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'search' ? 'active' : ''}`}
        onClick={() => setCurrentView('search')}
      >
        <i className="fa-solid fa-magnifying-glass"></i>
        <span>Search</span>
      </button>
    </nav>
  );
}
