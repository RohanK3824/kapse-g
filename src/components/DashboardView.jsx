import React from 'react';

export default function DashboardView({
  stats,
  customers,
  onNavigate,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  dbStatus
}) {
  // Show latest 10 customers across the full-width dashboard
  const recentCustomers = customers.slice(0, 10);

  return (
    <div className="view-dashboard">
      {/* Database Warning if MySQL is disconnected */}
      {dbStatus && !dbStatus.connected && (
        <div className="db-alert-banner">
          <div>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
            <strong>MySQL Connection Notice:</strong> {dbStatus.error || 'Could not connect to MySQL server.'}
            <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '2px' }}>
              Please ensure database is active and verify connection credentials in environment variables.
            </span>
          </div>
        </div>
      )}

      {/* Quick Action Banner */}
      <div className="dashboard-banner">
        <div className="banner-content">
          <div className="banner-icon">
            <i className="fa-solid fa-tape"></i>
          </div>
          <div className="banner-text">
            <h3>Kapse - G 🔰 Fitting &amp; Bill Book Registry</h3>
            <p>
              Register Kapse - G tailor shop customers with exact physical Bill Book numbers and Page Numbers stored securely in MySQL.
            </p>
          </div>
        </div>
        <div className="banner-actions">
          <button className="btn btn-light" onClick={() => onNavigate('add-customer')}>
            <i className="fa-solid fa-user-plus"></i> New Customer
          </button>
          <button className="btn btn-navy-outline" onClick={() => onNavigate('search')}>
            <i className="fa-solid fa-magnifying-glass"></i> Search Records
          </button>
        </div>
      </div>

      {/* Full-Width Recently Added Customers Card */}
      <div className="card full-width-card" style={{ width: '100%', marginBottom: '2rem' }}>
        <div className="card-header">
          <div className="card-title-group">
            <i className="fa-solid fa-clock-rotate-left"></i>
            <div>
              <h3>Recently Added Customers</h3>
              <p className="card-subtitle" style={{ margin: 0 }}>
                Latest customer registrations &amp; physical book page records
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-accent">
              Showing {recentCustomers.length} latest of {stats.totalCustomers || customers.length}
            </span>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('records')}>
              View All Records <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>

        <div className="card-body no-padding">
          <div className="mobile-scroll-hint">
            <i className="fa-solid fa-arrows-left-right"></i> Swipe table left &amp; right to view all columns
          </div>
          {recentCustomers.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-clipboard-user empty-icon"></i>
              <h4>No Customers Registered Yet</h4>
              <p>Get started by adding your first tailor shop customer.</p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('add-customer')}>
                <i className="fa-solid fa-user-plus"></i> Add Customer Now
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Sr. No.</th>
                    <th>Customer Name</th>
                    <th>Mobile Number</th>
                    <th>Place / Address</th>
                    <th>Bill Book</th>
                    <th>Page No</th>
                    <th>Reg. Date</th>
                    <th>Measurements &amp; Notes</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCustomers.map((c, index) => (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center' }}>
                        <span className="sr-no-badge">#{index + 1}</span>
                      </td>
                      <td>
                        <div className="cust-name-cell">
                          <span className="cell-avatar">{(c.name || 'C')[0].toUpperCase()}</span>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-phone" style={{ fontSize: '0.75rem', color: '#0284c7' }}></i>
                          {c.mobile}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-location-dot" style={{ fontSize: '0.75rem', color: '#64748b' }}></i>
                          {c.place}
                        </span>
                      </td>
                      <td><span className="bill-pill">{c.billBook}</span></td>
                      <td><span className="page-pill">Page {c.pageNo}</span></td>
                      <td>{c.date}</td>
                      <td style={{ maxWidth: '280px', color: '#475569', fontSize: '0.82rem' }}>
                        {c.notes ? (
                          <span title={c.notes} style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {c.notes}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
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
      </div>
    </div>
  );
}
