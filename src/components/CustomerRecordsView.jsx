import React, { useState, useMemo } from 'react';

export default function CustomerRecordsView({
  customers,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onAddCustomerClick,
  onRefresh,
  onExport
}) {
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredCustomers = useMemo(() => {
    if (!filterText.trim()) return customers;
    const term = filterText.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.mobile?.toLowerCase().includes(term) ||
      c.billBook?.toLowerCase().includes(term) ||
      c.pageNo?.toLowerCase().includes(term) ||
      c.place?.toLowerCase().includes(term) ||
      c.id?.toLowerCase().includes(term) ||
      c.notes?.toLowerCase().includes(term)
    );
  }, [customers, filterText]);

  // Sort
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    const factor = sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      return valA.localeCompare(valB, undefined, { numeric: true }) * factor;
    });

    return list;
  }, [filteredCustomers, sortField, sortOrder]);

  // Pagination
  const total = sortedCustomers.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentSlice = sortedCustomers.slice(startIndex, startIndex + pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return 'fa-solid fa-sort';
    return sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
  };

  return (
    <div className="card">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Filter by Name, Phone, Bill Book, Place..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setCurrentPage(1);
              }}
            />
            {filterText && (
              <button
                className="btn-clear-filter"
                onClick={() => {
                  setFilterText('');
                  setCurrentPage(1);
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {filterText.trim() && (
            <span className="badge badge-accent">
              {filteredCustomers.length} of {customers.length} matches
            </span>
          )}
        </div>

        <div className="toolbar-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
            <label>Show:</label>
            <select
              className="form-control"
              style={{ height: '36px', width: '70px', padding: '0 8px', fontSize: '0.82rem' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRefresh} title="Refresh records from MySQL">
            <i className="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
          <button className="btn btn-success btn-sm" onClick={onExport} title="Download Excel export">
            <i className="fa-solid fa-file-excel"></i> Export Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={onAddCustomerClick}>
            <i className="fa-solid fa-plus"></i> Add Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-body no-padding">
        <div className="mobile-scroll-hint">
          <i className="fa-solid fa-arrows-left-right"></i> Swipe table left &amp; right to view all columns
        </div>
        {total === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-user-slash empty-icon"></i>
            <h4>No Customer Records Found</h4>
            <p>
              {filterText.trim()
                ? `No customer matches "${filterText}". Try clearing your filter.`
                : 'The MySQL customer database is currently empty.'}
            </p>
            {filterText.trim() ? (
              <button className="btn btn-outline btn-sm" onClick={() => setFilterText('')}>
                Clear Filter
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onAddCustomerClick}>
                <i className="fa-solid fa-user-plus"></i> Add New Customer
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>
                    Sr. No.
                  </th>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    Customer Name <i className={getSortIcon('name')}></i>
                  </th>
                  <th className="sortable" onClick={() => handleSort('mobile')}>
                    Mobile Number <i className={getSortIcon('mobile')}></i>
                  </th>
                  <th className="sortable" onClick={() => handleSort('place')}>
                    Place / Address <i className={getSortIcon('place')}></i>
                  </th>
                  <th className="sortable" onClick={() => handleSort('billBook')}>
                    Bill Book <i className={getSortIcon('billBook')}></i>
                  </th>
                  <th className="sortable" onClick={() => handleSort('pageNo')}>
                    Page No <i className={getSortIcon('pageNo')}></i>
                  </th>
                  <th className="sortable" onClick={() => handleSort('date')}>
                    Reg. Date <i className={getSortIcon('date')}></i>
                  </th>
                  <th style={{ textAlign: 'center' }}>Bill</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentSlice.map((c, index) => (
                  <tr key={c.id}>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sr-no-badge">{startIndex + index + 1}</span>
                    </td>
                    <td>
                      <div className="cust-name-cell">
                        <span className="cell-avatar">{(c.name || 'C')[0].toUpperCase()}</span>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td>{c.mobile}</td>
                    <td>{c.place}</td>
                    <td><span className="bill-pill">{c.billBook}</span></td>
                    <td><span className="page-pill">{c.pageNo}</span></td>
                    <td>{c.date}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onViewCustomer(c)}
                        title="View Customer Bill Slip"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fa-solid fa-file-invoice"></i>
                        <span>View Bill</span>
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button className="btn-action action-view" onClick={() => onViewCustomer(c)} title="View Slip">
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button className="btn-action action-edit" onClick={() => onEditCustomer(c)} title="Edit Customer">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button className="btn-action action-delete" onClick={() => onDeleteCustomer(c)} title="Delete Customer">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer / Pagination */}
      {total > 0 && (
        <div className="table-footer">
          <div style={{ fontSize: '0.82rem', color: '#475569' }}>
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, total)} of {total} entries
          </div>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <React.Fragment key={p}>
                    {prev && p - prev > 1 && <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>}
                    <button
                      className={`page-btn ${p === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
