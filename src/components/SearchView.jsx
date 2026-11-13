import React, { useState, useMemo } from 'react';

export default function SearchView({
  customers,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onAddNewCustomer,
  onExport
}) {
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState('all');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return customers.filter(c => {
      if (searchField === 'name') return c.name?.toLowerCase().includes(q);
      if (searchField === 'mobile') return c.mobile?.toLowerCase().includes(q);
      if (searchField === 'billBook') return c.billBook?.toLowerCase().includes(q);
      if (searchField === 'pageNo') return c.pageNo?.toLowerCase().includes(q);

      return (
        c.name?.toLowerCase().includes(q) ||
        c.mobile?.toLowerCase().includes(q) ||
        c.billBook?.toLowerCase().includes(q) ||
        c.pageNo?.toLowerCase().includes(q) ||
        c.place?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    });
  }, [customers, query, searchField]);

  return (
    <div className="search-page-container">
      {/* Hero Search Box */}
      <div className="card search-hero-card">
        <div className="search-hero-content">
          <div className="search-badge">
            <i className="fa-solid fa-bolt"></i> Instant Lookup
          </div>
          <h2>Search Customer Records</h2>
          <p>
            Search across <strong>Customer Name</strong>, <strong>Mobile Number</strong>, <strong>Bill Book Number</strong>, or <strong>Page Number</strong>. Results appear immediately as you type.
          </p>

          <div className="search-bar-large">
            <div className="search-input-field">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Type customer name, phone number, bill book (e.g. B-01), or page number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  className="btn-clear-search"
                  onClick={() => setQuery('')}
                  title="Clear Search"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <div className="search-filters">
              <span style={{ fontWeight: 700, color: '#0f2942' }}>Search In:</span>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="searchField"
                  value="all"
                  checked={searchField === 'all'}
                  onChange={() => setSearchField('all')}
                /> All Fields
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="searchField"
                  value="name"
                  checked={searchField === 'name'}
                  onChange={() => setSearchField('name')}
                /> Name
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="searchField"
                  value="mobile"
                  checked={searchField === 'mobile'}
                  onChange={() => setSearchField('mobile')}
                /> Mobile
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="searchField"
                  value="billBook"
                  checked={searchField === 'billBook'}
                  onChange={() => setSearchField('billBook')}
                /> Bill Book
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="searchField"
                  value="pageNo"
                  checked={searchField === 'pageNo'}
                  onChange={() => setSearchField('pageNo')}
                /> Page No
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f2942' }}>
          Search Results <span className="badge badge-navy">{matches.length} result{matches.length === 1 ? '' : 's'}</span>
        </h3>
        {matches.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={onExport}>
            <i className="fa-solid fa-file-excel"></i> Export All
          </button>
        )}
      </div>

      {/* Results Section */}
      {!query.trim() ? (
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#f0f9ff',
            color: '#0284c7',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            marginBottom: '1.25rem'
          }}>
            <i className="fa-solid fa-magnifying-glass-location"></i>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f2942', marginBottom: '0.35rem' }}>
            Start Typing to Search Customers
          </h3>
          <p>Enter any keyword in the box above to find matching records instantly.</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-person-circle-question empty-icon"></i>
          <h4>No Matching Customers Found</h4>
          <p>We couldn't find any customer matching "{query}".</p>
          <button className="btn btn-primary btn-sm" onClick={onAddNewCustomer}>
            <i className="fa-solid fa-user-plus"></i> Add New Customer
          </button>
        </div>
      ) : (
        <div className="search-cards-grid">
          {matches.map(c => (
            <div key={c.id} className="customer-search-card">
              <div className="card-top">
                <div className="card-top-left">
                  <span className="cell-avatar">{(c.name || 'C')[0].toUpperCase()}</span>
                  <div>
                    <div className="search-card-name">{c.name}</div>
                    <div className="search-card-id">{c.id}</div>
                  </div>
                </div>
                <span className="dropdown-bill-badge">Book {c.billBook} / P.{c.pageNo}</span>
              </div>

              <div className="card-info-list">
                <div className="info-item">
                  <i className="fa-solid fa-phone"></i>
                  <strong>Mobile Number:</strong>
                  <span>{c.mobile}</span>
                </div>
                <div className="info-item">
                  <i className="fa-solid fa-location-dot"></i>
                  <strong>Place / Area:</strong>
                  <span>{c.place}</span>
                </div>
                <div className="info-item">
                  <i className="fa-solid fa-book"></i>
                  <strong>Bill Book No:</strong>
                  <span><span className="book-tag-badge">{c.billBook}</span></span>
                </div>
                <div className="info-item">
                  <i className="fa-solid fa-file-lines"></i>
                  <strong>Page Number:</strong>
                  <span><span className="page-tag-badge">Page {c.pageNo}</span></span>
                </div>
                <div className="info-item">
                  <i className="fa-solid fa-calendar"></i>
                  <strong>Reg. Date:</strong>
                  <span>{c.date}</span>
                </div>
                {c.notes && (
                  <div className="info-item">
                    <i className="fa-solid fa-clipboard"></i>
                    <strong>Notes:</strong>
                    <span>{c.notes}</span>
                  </div>
                )}
              </div>

              <div className="card-bottom-actions">
                <button className="btn btn-outline btn-sm" onClick={() => onViewCustomer(c)}>
                  <i className="fa-solid fa-eye"></i> View Slip
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => onEditCustomer(c)}>
                  <i className="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => onDeleteCustomer(c)}>
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
