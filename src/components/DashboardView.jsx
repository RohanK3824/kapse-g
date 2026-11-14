import React from 'react';

export default function DashboardView({
  stats,
  customers,
  onNavigate,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  dbStatus,
  syncStatus,
  onSyncNow,
  syncing = false
}) {
  // Show latest 8-10 customers across the full-width dashboard
  const recentCustomers = customers.slice(0, 10);
  const pendingCount = syncStatus?.totalPendingRecords || customers.filter(c => c.isPendingSync || c.syncStatus === 'pending').length;

  return (
    <div className="view-dashboard">
      {/* Database Warning if MySQL is disconnected */}
      {dbStatus && !dbStatus.connected && (
        <div className="db-alert-banner">
          <div>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
            <strong>MySQL Connection Notice:</strong> {dbStatus.error || 'Could not connect to MySQL server.'}
            <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '2px' }}>
              Please ensure MySQL service is running and verify <code>DB_PASSWORD</code> in your <code>.env</code> file.
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

      {/* Sync Status Overview Widget */}
      <div className="dashboard-sync-widget" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: pendingCount > 0 ? '#fffbeb' : '#f0f9ff',
            color: pendingCount > 0 ? '#d97706' : '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            border: `1px solid ${pendingCount > 0 ? '#fde68a' : '#bae6fd'}`
          }}>
            <i className={`fa-solid ${syncing ? 'fa-arrows-rotate fa-spin' : pendingCount > 0 ? 'fa-hourglass-half' : 'fa-cloud-check'}`}></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <strong style={{ color: '#0f2942', fontSize: '0.95rem' }}>Automatic Data Synchronization</strong>
              <span className={`badge ${pendingCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                {pendingCount > 0 ? `${pendingCount} Pending Sync` : 'All Synced'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Main Database: <strong>Laptop MySQL</strong> &bull; Temporary Queue: <strong>{pendingCount > 0 ? `${pendingCount} records waiting` : 'Clear'}</strong>
              {syncStatus?.lastSyncTime && ` &bull; Last Sync: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={onSyncNow}
            disabled={syncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`}></i>
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onNavigate('sync')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <i className="fa-solid fa-gauge"></i>
            <span>Sync Dashboard</span>
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
                    <th>ID</th>
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
                  {recentCustomers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="cust-id-badge">{c.id}</span>
                          {(c.isPendingSync || c.syncStatus === 'pending') && (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>
                              <i className="fa-solid fa-clock"></i> Pending Sync
                            </span>
                          )}
                        </div>
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
