import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import AddCustomerView from './components/AddCustomerView';
import CustomerRecordsView from './components/CustomerRecordsView';
import SearchView from './components/SearchView';

import ViewSlipModal from './components/ViewSlipModal';
import EditCustomerModal from './components/EditCustomerModal';
import DeleteModal from './components/DeleteModal';
import ToastContainer from './components/Toast';
import MobileBottomNav from './components/MobileBottomNav';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayCustomers: 0,
    totalBillBooks: 0,
    totalPlaces: 0,
    todayDate: ''
  });
  const [dbStatus, setDbStatus] = useState(null);

  // Modals state
  const [viewCustomer, setViewCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch all data from MySQL
  const refreshData = useCallback(async () => {
    try {
      const [statusRes, statsRes, custRes] = await Promise.all([
        api.getStatus().catch(() => ({ data: { connected: false } })),
        api.getStats().catch(() => ({ success: false, data: {} })),
        api.getCustomers().catch(() => ({ success: false, data: [] }))
      ]);

      if (statusRes.data) {
        setDbStatus(statusRes.data);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (custRes.success && Array.isArray(custRes.data)) {
        setCustomers(custRes.data);
      }
    } catch (err) {
      console.error('Error refreshing MySQL data:', err);
      addToast('Connection Error', 'Could not communicate with the backend.', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setViewCustomer(null);
        setEditCustomer(null);
        setDeleteCustomer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // CRUD Handlers
  const handleAddCustomer = async (formData) => {
    try {
      const res = await api.createCustomer(formData);
      if (res.success) {
        addToast('Customer Registered', `Saved ${res.data.name} (${res.data.id}) successfully.`, 'success');
        await refreshData();
      }
    } catch (err) {
      addToast('Registration Failed', err.message || 'Could not save customer record.', 'error');
      throw err;
    }
  };

  const handleUpdateCustomer = async (id, formData) => {
    try {
      const res = await api.updateCustomer(id, formData);
      if (res.success) {
        addToast('Updated', `Customer ${res.data.name} updated successfully.`, 'success');
        await refreshData();
      }
    } catch (err) {
      addToast('Update Failed', err.message || 'Failed to update customer record.', 'error');
      throw err;
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      const res = await api.deleteCustomer(id);
      if (res.success) {
        addToast('Deleted', `Customer ${res.data.name} removed successfully.`, 'info');
        await refreshData();
      }
    } catch (err) {
      addToast('Delete Failed', err.message || 'Could not delete customer.', 'error');
      throw err;
    }
  };

  const handleExport = () => {
    api.exportExcel();
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        totalCustomers={stats.totalCustomers || customers.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dbStatus={dbStatus}
        onExport={handleExport}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Topbar */}
        <Topbar
          currentView={currentView}
          onToggleSidebar={() => setSidebarOpen(true)}
          customers={customers}
          onViewCustomer={setViewCustomer}
          onAddCustomer={() => setCurrentView('add-customer')}
          onExport={handleExport}
        />

        {/* Content Views */}
        <main className="content-container">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              customers={customers}
              onNavigate={setCurrentView}
              onViewCustomer={setViewCustomer}
              onEditCustomer={setEditCustomer}
              onDeleteCustomer={setDeleteCustomer}
              dbStatus={dbStatus}
            />
          )}

          {currentView === 'add-customer' && (
            <AddCustomerView
              onAddCustomer={handleAddCustomer}
            />
          )}

          {currentView === 'records' && (
            <CustomerRecordsView
              customers={customers}
              onViewCustomer={setViewCustomer}
              onEditCustomer={setEditCustomer}
              onDeleteCustomer={setDeleteCustomer}
              onAddCustomerClick={() => setCurrentView('add-customer')}
              onRefresh={refreshData}
              onExport={handleExport}
            />
          )}

          {currentView === 'search' && (
            <SearchView
              customers={customers}
              onViewCustomer={setViewCustomer}
              onEditCustomer={setEditCustomer}
              onDeleteCustomer={setDeleteCustomer}
              onAddNewCustomer={() => setCurrentView('add-customer')}
              onExport={handleExport}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>Kapse - G 🔰 Tailor Shop Customer Management System &copy; 2026</span>
          </div>
          <div>
            <span style={{ color: '#0f2942', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-indicator ${dbStatus?.connected ? 'online' : 'offline'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dbStatus?.connected ? '#16a34a' : '#dc2626', display: 'inline-block' }}></span>
              System: {dbStatus?.connected ? 'Online & Secured' : 'Offline'}
            </span>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <ViewSlipModal
        customer={viewCustomer}
        onClose={() => setViewCustomer(null)}
        onEdit={(c) => {
          setViewCustomer(null);
          setEditCustomer(c);
        }}
        onDelete={(c) => {
          setViewCustomer(null);
          setDeleteCustomer(c);
        }}
      />

      <EditCustomerModal
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSave={handleUpdateCustomer}
        onUpdate={handleUpdateCustomer}
      />

      <DeleteModal
        customer={deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={handleDeleteCustomer}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        customerCount={stats.totalCustomers || customers.length}
      />
    </div>
  );
}
