import React, { useState, useEffect, useRef } from 'react';

export default function Topbar({
  currentView,
  onToggleSidebar,
  customers,
  onViewCustomer,
  onAddCustomer,
  onExport
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const viewTitles = {
    dashboard: {
      title: 'Dashboard Overview',
      sub: 'Customer statistics, bill registry overview & quick lookups'
    },
    'add-customer': {
      title: 'Register New Customer',
      sub: 'Save customer measurements reference to MySQL database'
    },
    records: {
      title: 'Customer Records Directory',
      sub: 'Complete database stored directly in MySQL (tailor_shop_db)'
    },
    search: {
      title: 'Instant Customer Search',
      sub: 'Quickly find customers by Name, Mobile, Bill Book, or Page No'
    }
  };

  const currentMeta = viewTitles[currentView] || viewTitles.dashboard;

  const matches = searchTerm.trim()
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.billBook?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.pageNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.place?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-toggle-sidebar" onClick={onToggleSidebar} title="Toggle Navigation">
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="page-title-box">
          <h1 className="page-title">{currentMeta.title}</h1>
          <p className="page-subtitle">{currentMeta.sub}</p>
        </div>
      </div>

      <div className="topbar-search" ref={searchContainerRef}>
        <div className="search-input-wrapper">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder="Quick search by Name, Mobile, Bill No... (Ctrl + K)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setDropdownOpen(true);
            }}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchTerm('');
                setDropdownOpen(false);
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {dropdownOpen && searchTerm.trim() && (
          <div className="global-search-dropdown">
            <div className="dropdown-header">
              <span>Matching Customers</span>
              <span className="results-count">{matches.length} found</span>
            </div>
            <div className="dropdown-body">
              {matches.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No customer matching "<strong>{searchTerm}</strong>"
                </div>
              ) : (
                matches.map(c => (
                  <div
                    key={c.id}
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      onViewCustomer(c);
                    }}
                  >
                    <div className="dropdown-item-left">
                      <span className="customer-avatar">
                        {(c.name || 'C')[0].toUpperCase()}
                      </span>
                      <div className="dropdown-item-info">
                        <h4>{c.name} <small style={{ color: '#64748b' }}>({c.id})</small></h4>
                        <p>
                          <span><i className="fa-solid fa-phone"></i> {c.mobile}</span>
                          <span>&bull;</span>
                          <span><i className="fa-solid fa-location-dot"></i> {c.place}</span>
                        </p>
                      </div>
                    </div>
                    <div className="dropdown-item-right">
                      <span className="dropdown-bill-badge">Book {c.billBook} / P.{c.pageNo}</span>
                      <span className="dropdown-date">{c.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button className="btn btn-outline btn-top-action" onClick={onExport} title="Download Excel Export">
          <i className="fa-solid fa-file-arrow-down"></i>
          <span className="btn-label">Export Excel</span>
        </button>
        <button className="btn btn-primary btn-top-action" onClick={onAddCustomer} title="Register New Customer">
          <i className="fa-solid fa-plus"></i>
          <span className="btn-label">Add Customer</span>
        </button>
        <div className="tailor-badge" title="Master Tailor Desk">
          <i className="fa-solid fa-vest-patches"></i>
        </div>
      </div>
    </header>
  );
}
