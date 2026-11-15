/**
 * TailorPro - Main Application Controller
 * Handles UI interactions, rendering, navigation, validation, modals, and toasts
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentView: 'dashboard',
    allCustomers: [],
    filteredCustomers: [],
    currentPage: 1,
    pageSize: 25,
    sortField: 'id',
    sortOrder: 'desc',
    tableFilterText: '',
    customerToDelete: null,
    customerToEdit: null,
    globalSearchResults: []
  };

  // DOM Elements
  const elements = {
    // Navigation
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    navLinks: document.querySelectorAll('.sidebar-nav .nav-link[data-view]'),
    navExportBtn: document.getElementById('navExportBtn'),
    topExportBtn: document.getElementById('topExportBtn'),
    topAddBtn: document.getElementById('topAddBtn'),
    navCustomerCount: document.getElementById('navCustomerCount'),
    pageTitle: document.getElementById('pageTitle'),
    pageSubtitle: document.getElementById('pageSubtitle'),

    // Views
    views: {
      dashboard: document.getElementById('view-dashboard'),
      'add-customer': document.getElementById('view-add-customer'),
      records: document.getElementById('view-records'),
      search: document.getElementById('view-search')
    },

    // Stats
    statTotalCustomers: document.getElementById('statTotalCustomers'),
    statTodayCustomers: document.getElementById('statTodayCustomers'),
    statTodayDate: document.getElementById('statTodayDate'),
    statTotalBillBooks: document.getElementById('statTotalBillBooks'),
    statTotalPlaces: document.getElementById('statTotalPlaces'),

    // Dashboard Actions
    bannerAddBtn: document.getElementById('bannerAddBtn'),
    bannerSearchBtn: document.getElementById('bannerSearchBtn'),
    viewAllRecordsBtn: document.getElementById('viewAllRecordsBtn'),
    recentTableBody: document.getElementById('recentTableBody'),
    recentEmptyState: document.getElementById('recentEmptyState'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    dashboardQuickSearch: document.getElementById('dashboardQuickSearch'),
    quickResultsPreview: document.getElementById('quickResultsPreview'),

    // Form
    customerForm: document.getElementById('customerForm'),
    custName: document.getElementById('custName'),
    custMobile: document.getElementById('custMobile'),
    custPlace: document.getElementById('custPlace'),
    custBillBook: document.getElementById('custBillBook'),
    custPageNo: document.getElementById('custPageNo'),
    custDate: document.getElementById('custDate'),
    custNotes: document.getElementById('custNotes'),
    formResetBtn: document.getElementById('formResetBtn'),
    formSubmitBtn: document.getElementById('formSubmitBtn'),

    // Form Errors
    nameError: document.getElementById('nameError'),
    mobileError: document.getElementById('mobileError'),
    placeError: document.getElementById('placeError'),
    billBookError: document.getElementById('billBookError'),
    pageNoError: document.getElementById('pageNoError'),
    dateError: document.getElementById('dateError'),

    // Customer Records Table
    customersTable: document.getElementById('customersTable'),
    recordsTableBody: document.getElementById('recordsTableBody'),
    tableFilterInput: document.getElementById('tableFilterInput'),
    clearTableFilter: document.getElementById('clearTableFilter'),
    filterCountBadge: document.getElementById('filterCountBadge'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    tableRefreshBtn: document.getElementById('tableRefreshBtn'),
    tableExportBtn: document.getElementById('tableExportBtn'),
    tableAddCustomerBtn: document.getElementById('tableAddCustomerBtn'),
    tableEmptyState: document.getElementById('tableEmptyState'),
    emptyStateTitle: document.getElementById('emptyStateTitle'),
    emptyStateDesc: document.getElementById('emptyStateDesc'),
    emptyStateActionBtn: document.getElementById('emptyStateActionBtn'),
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),

    // Search Page
    advancedSearchInput: document.getElementById('advancedSearchInput'),
    clearAdvancedSearch: document.getElementById('clearAdvancedSearch'),
    searchCardsGrid: document.getElementById('searchCardsGrid'),
    searchResultsCount: document.getElementById('searchResultsCount'),
    searchActionButtons: document.getElementById('searchActionButtons'),
    searchInitialState: document.getElementById('searchInitialState'),
    searchNoResultsState: document.getElementById('searchNoResultsState'),
    searchAddNewBtn: document.getElementById('searchAddNewBtn'),
    searchExportBtn: document.getElementById('searchExportBtn'),

    // Global Search in Topbar
    globalSearchInput: document.getElementById('globalSearchInput'),
    clearGlobalSearch: document.getElementById('clearGlobalSearch'),
    globalSearchDropdown: document.getElementById('globalSearchDropdown'),
    dropdownResults: document.getElementById('dropdownResults'),
    dropdownCount: document.getElementById('dropdownCount'),

    // Modals
    viewModal: document.getElementById('viewModal'),
    viewModalContent: document.getElementById('viewModalContent'),
    viewCustomerSubtitle: document.getElementById('viewCustomerSubtitle'),
    viewEditBtn: document.getElementById('viewEditBtn'),
    printSlipBtn: document.getElementById('printSlipBtn'),

    editModal: document.getElementById('editModal'),
    editCustomerForm: document.getElementById('editCustomerForm'),
    editCustId: document.getElementById('editCustId'),
    editCustIdDisplay: document.getElementById('editCustIdDisplay'),
    editCustName: document.getElementById('editCustName'),
    editCustMobile: document.getElementById('editCustMobile'),
    editCustPlace: document.getElementById('editCustPlace'),
    editCustBillBook: document.getElementById('editCustBillBook'),
    editCustPageNo: document.getElementById('editCustPageNo'),
    editCustDate: document.getElementById('editCustDate'),
    editCustNotes: document.getElementById('editCustNotes'),

    editNameError: document.getElementById('editNameError'),
    editMobileError: document.getElementById('editMobileError'),
    editPlaceError: document.getElementById('editPlaceError'),
    editBillBookError: document.getElementById('editBillBookError'),
    editPageNoError: document.getElementById('editPageNoError'),
    editDateError: document.getElementById('editDateError'),

    deleteModal: document.getElementById('deleteModal'),
    deleteCustName: document.getElementById('deleteCustName'),
    deleteCustId: document.getElementById('deleteCustId'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // Helper Functions
  // =========================================================================

  /**
   * Return today's date formatted as YYYY-MM-DD in local time
   */
  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Format display date (e.g. 13 Nov 2026 or DD/MM/YYYY)
   */
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Debounce helper
   */
  function debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // =========================================================================
  // Toast Notifications
  // =========================================================================

  function showToast(title, message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    if (type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="toast-text">
          <div class="toast-title">${escapeHtml(title)}</div>
          <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" title="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="toast-progress">
        <div class="toast-progress-bar"></div>
      </div>
    `;

    elements.toastContainer.appendChild(toast);

    // Close button event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Progress bar animation trigger
    const progressBar = toast.querySelector('.toast-progress-bar');
    setTimeout(() => {
      progressBar.style.width = '0%';
    }, 10);

    // Auto-remove after duration
    const timer = setTimeout(() => {
      removeToast(toast);
    }, duration);

    function removeToast(el) {
      clearTimeout(timer);
      el.classList.add('toast-hiding');
      setTimeout(() => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 300);
    }
  }

  // =========================================================================
  // Navigation & View Switching
  // =========================================================================

  function switchView(viewName) {
    if (!elements.views[viewName]) return;

    state.currentView = viewName;

    // Update nav links active state
    elements.navLinks.forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update visible view section
    Object.keys(elements.views).forEach(key => {
      if (key === viewName) {
        elements.views[key].classList.add('active');
      } else {
        elements.views[key].classList.remove('active');
      }
    });

    // Update page title & subtitle
    const viewTitles = {
      dashboard: {
        title: 'Dashboard Overview',
        sub: 'Customer statistics, bill registry overview & quick lookups'
      },
      'add-customer': {
        title: 'Register New Customer',
        sub: 'Save customer measurements reference to customers.xlsx'
      },
      records: {
        title: 'Customer Records Directory',
        sub: 'Complete database stored directly in customers.xlsx'
      },
      search: {
        title: 'Instant Customer Search',
        sub: 'Quickly find customers by Name, Mobile, Bill Book, or Page No'
      }
    };

    if (viewTitles[viewName]) {
      elements.pageTitle.textContent = viewTitles[viewName].title;
      elements.pageSubtitle.textContent = viewTitles[viewName].sub;
    }

    // Close mobile sidebar if open
    closeMobileSidebar();

    // Specific view setup
    if (viewName === 'add-customer') {
      elements.custDate.value = getTodayDateString();
      elements.custName.focus();
    } else if (viewName === 'records') {
      renderRecordsTable();
    } else if (viewName === 'search') {
      elements.advancedSearchInput.focus();
    }
  }

  function openMobileSidebar() {
    elements.sidebar.classList.add('show');
    elements.sidebarOverlay.classList.add('show');
  }

  function closeMobileSidebar() {
    elements.sidebar.classList.remove('show');
    elements.sidebarOverlay.classList.remove('show');
  }

  // =========================================================================
  // Data Loading & Statistics
  // =========================================================================

  async function loadInitialData() {
    try {
      await refreshAllData();
    } catch (err) {
      console.error('Failed to load initial data:', err);
      showToast('Connection Error', 'Could not connect to the backend server. Make sure the Node server is running.', 'error');
    }
  }

  async function refreshAllData() {
    await Promise.all([
      fetchCustomers(),
      fetchStatistics()
    ]);
  }

  async function fetchStatistics() {
    try {
      const res = await API.getStats();
      if (res.success && res.data) {
        const stats = res.data;
        elements.statTotalCustomers.textContent = stats.totalCustomers || 0;
        elements.statTodayCustomers.textContent = stats.todayCustomers || 0;
        elements.statTotalBillBooks.textContent = stats.totalBillBooks || 0;
        elements.statTotalPlaces.textContent = stats.totalPlaces || 0;
        elements.navCustomerCount.textContent = stats.totalCustomers || 0;

        if (stats.todayDate) {
          elements.statTodayDate.textContent = formatDisplayDate(stats.todayDate);
        }
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }

  async function fetchCustomers() {
    try {
      const res = await API.getCustomers();
      if (res.success && Array.isArray(res.data)) {
        state.allCustomers = res.data;
        applyTableFilter();
        renderRecentCustomers();
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      showToast('Error Reading Excel', 'Failed to read records from customers.xlsx', 'error');
    }
  }

  // =========================================================================
  // Recent Customers in Dashboard
  // =========================================================================

  function renderRecentCustomers() {
    const recent = state.allCustomers.slice(0, 5);
    elements.recentTableBody.innerHTML = '';

    if (recent.length === 0) {
      elements.recentEmptyState.style.display = 'flex';
      elements.recentTableBody.closest('.table-responsive').style.display = 'none';
      return;
    }

    elements.recentEmptyState.style.display = 'none';
    elements.recentTableBody.closest('.table-responsive').style.display = 'block';

    recent.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="cust-id-badge">${escapeHtml(c.id)}</span></td>
        <td>
          <div class="cust-name-cell">
            <span class="cell-avatar">${escapeHtml((c.name || 'C')[0].toUpperCase())}</span>
            <span>${escapeHtml(c.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(c.mobile)}</td>
        <td>${escapeHtml(c.place)}</td>
        <td><span class="bill-pill">${escapeHtml(c.billBook)}</span></td>
        <td><span class="page-pill">${escapeHtml(c.pageNo)}</span></td>
        <td>${formatDisplayDate(c.date)}</td>
        <td>
          <div class="action-buttons-group">
            <button class="btn-action action-view" data-id="${escapeHtml(c.id)}" title="View Customer Details">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-action action-edit" data-id="${escapeHtml(c.id)}" title="Edit Customer">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action action-delete" data-id="${escapeHtml(c.id)}" title="Delete Customer">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      elements.recentTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // Customer Records Table & Filtering & Pagination
  // =========================================================================

  function applyTableFilter() {
    const term = state.tableFilterText.trim().toLowerCase();
    
    if (!term) {
      state.filteredCustomers = [...state.allCustomers];
      elements.filterCountBadge.style.display = 'none';
      elements.clearTableFilter.style.display = 'none';
    } else {
      state.filteredCustomers = state.allCustomers.filter(c => {
        return (
          (c.name && c.name.toLowerCase().includes(term)) ||
          (c.mobile && c.mobile.toLowerCase().includes(term)) ||
          (c.billBook && c.billBook.toLowerCase().includes(term)) ||
          (c.pageNo && c.pageNo.toLowerCase().includes(term)) ||
          (c.place && c.place.toLowerCase().includes(term)) ||
          (c.id && c.id.toLowerCase().includes(term)) ||
          (c.notes && c.notes.toLowerCase().includes(term))
        );
      });
      elements.filterCountBadge.style.display = 'inline-block';
      elements.filterCountBadge.textContent = `${state.filteredCustomers.length} of ${state.allCustomers.length} matches`;
      elements.clearTableFilter.style.display = 'block';
    }

    // Apply sorting
    sortCustomerList(state.filteredCustomers, state.sortField, state.sortOrder);

    // Reset to page 1
    state.currentPage = 1;
    renderRecordsTable();
  }

  function sortCustomerList(list, field, order) {
    const factor = order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const valA = (a[field] || '').toString().toLowerCase();
      const valB = (b[field] || '').toString().toLowerCase();
      return valA.localeCompare(valB, undefined, { numeric: true }) * factor;
    });
  }

  function renderRecordsTable() {
    const total = state.filteredCustomers.length;
    elements.recordsTableBody.innerHTML = '';

    // Update header sort indicator
    const ths = elements.customersTable.querySelectorAll('thead th.sortable');
    ths.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      const icon = th.querySelector('i');
      if (th.dataset.sort === state.sortField) {
        th.classList.add(state.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        icon.className = state.sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
      } else {
        icon.className = 'fa-solid fa-sort';
      }
    });

    if (total === 0) {
      elements.recordsTableBody.closest('.table-responsive').style.display = 'none';
      elements.tableEmptyState.style.display = 'flex';
      
      if (state.tableFilterText.trim()) {
        elements.emptyStateTitle.textContent = 'No Matching Records Found';
        elements.emptyStateDesc.textContent = `No customers matched "${state.tableFilterText}". Try clearing your search filter.`;
        elements.emptyStateActionBtn.textContent = 'Clear Filter';
        elements.emptyStateActionBtn.onclick = () => {
          elements.tableFilterInput.value = '';
          state.tableFilterText = '';
          applyTableFilter();
        };
      } else {
        elements.emptyStateTitle.textContent = 'No Customers in Excel Database';
        elements.emptyStateDesc.textContent = 'The customer database is currently empty. Add your first customer record.';
        elements.emptyStateActionBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add New Customer';
        elements.emptyStateActionBtn.onclick = () => switchView('add-customer');
      }

      elements.paginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
      elements.paginationControls.innerHTML = '';
      return;
    }

    elements.recordsTableBody.closest('.table-responsive').style.display = 'block';
    elements.tableEmptyState.style.display = 'none';

    // Calculate pagination slices
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, total);
    const pageCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    pageCustomers.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="cust-id-badge">${escapeHtml(c.id)}</span></td>
        <td>
          <div class="cust-name-cell">
            <span class="cell-avatar">${escapeHtml((c.name || 'C')[0].toUpperCase())}</span>
            <span>${escapeHtml(c.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(c.mobile)}</td>
        <td>${escapeHtml(c.place)}</td>
        <td><span class="bill-pill">${escapeHtml(c.billBook)}</span></td>
        <td><span class="page-pill">${escapeHtml(c.pageNo)}</span></td>
        <td>${formatDisplayDate(c.date)}</td>
        <td class="text-center">
          <div class="action-buttons-group">
            <button class="btn-action action-view" data-id="${escapeHtml(c.id)}" title="View Customer Slip">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-action action-edit" data-id="${escapeHtml(c.id)}" title="Edit Customer">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action action-delete" data-id="${escapeHtml(c.id)}" title="Delete Customer">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      elements.recordsTableBody.appendChild(tr);
    });

    // Pagination Info & Buttons
    elements.paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${total} entries`;
    renderPaginationControls(total);
  }

  function renderPaginationControls(total) {
    const totalPages = Math.ceil(total / state.pageSize) || 1;
    elements.paginationControls.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderRecordsTable();
      }
    });
    elements.paginationControls.appendChild(prevBtn);

    // Page number buttons
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    if (startPage > 1) {
      elements.paginationControls.appendChild(createPageBtn(1));
      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.className = 'page-dots';
        dots.textContent = '...';
        dots.style.padding = '0 4px';
        elements.paginationControls.appendChild(dots);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      elements.paginationControls.appendChild(createPageBtn(i));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'page-dots';
        dots.textContent = '...';
        dots.style.padding = '0 4px';
        elements.paginationControls.appendChild(dots);
      }
      elements.paginationControls.appendChild(createPageBtn(totalPages));
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderRecordsTable();
      }
    });
    elements.paginationControls.appendChild(nextBtn);
  }

  function createPageBtn(pageNumber) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${pageNumber === state.currentPage ? 'active' : ''}`;
    btn.textContent = pageNumber;
    btn.addEventListener('click', () => {
      state.currentPage = pageNumber;
      renderRecordsTable();
    });
    return btn;
  }

  // =========================================================================
  // Form Validation & Add Customer
  // =========================================================================

  function validateAddForm() {
    let isValid = true;

    // Reset error messages and invalid classes
    [elements.custName, elements.custMobile, elements.custPlace, elements.custBillBook, elements.custPageNo, elements.custDate]
      .forEach(inp => inp.classList.remove('is-invalid'));
    [elements.nameError, elements.mobileError, elements.placeError, elements.billBookError, elements.pageNoError, elements.dateError]
      .forEach(err => err.style.display = 'none');

    // 1. Customer Name
    const name = elements.custName.value.trim();
    if (!name) {
      elements.custName.classList.add('is-invalid');
      elements.nameError.style.display = 'block';
      isValid = false;
    }

    // 2. Mobile Number
    const mobile = elements.custMobile.value.trim();
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!mobile || cleanMobile.length < 7 || cleanMobile.length > 15) {
      elements.custMobile.classList.add('is-invalid');
      elements.mobileError.style.display = 'block';
      isValid = false;
    }

    // 3. Place / Address
    const place = elements.custPlace.value.trim();
    if (!place) {
      elements.custPlace.classList.add('is-invalid');
      elements.placeError.style.display = 'block';
      isValid = false;
    }

    // 4. Bill Book Number
    const billBook = elements.custBillBook.value.trim();
    if (!billBook) {
      elements.custBillBook.classList.add('is-invalid');
      elements.billBookError.style.display = 'block';
      isValid = false;
    }

    // 5. Page Number
    const pageNo = elements.custPageNo.value.trim();
    if (!pageNo) {
      elements.custPageNo.classList.add('is-invalid');
      elements.pageNoError.style.display = 'block';
      isValid = false;
    }

    // 6. Registration Date
    const date = elements.custDate.value.trim();
    if (!date) {
      elements.custDate.classList.add('is-invalid');
      elements.dateError.style.display = 'block';
      isValid = false;
    }

    return isValid;
  }

  async function handleAddCustomerSubmit(e) {
    e.preventDefault();

    if (!validateAddForm()) {
      showToast('Validation Error', 'Please fill in all required fields properly.', 'error');
      return;
    }

    const customerData = {
      name: elements.custName.value.trim(),
      mobile: elements.custMobile.value.trim(),
      place: elements.custPlace.value.trim(),
      billBook: elements.custBillBook.value.trim(),
      pageNo: elements.custPageNo.value.trim(),
      date: elements.custDate.value.trim() || getTodayDateString(),
      notes: elements.custNotes.value.trim()
    };

    // Disable submit button and show loading state
    elements.formSubmitBtn.disabled = true;
    elements.formSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Excel...';

    try {
      const res = await API.createCustomer(customerData);
      if (res.success) {
        showToast('Success!', `Customer ${res.data.name} saved to Excel with ID ${res.data.id}.`, 'success');

        // Clear form after successful submission
        elements.customerForm.reset();
        elements.custDate.value = getTodayDateString();

        // Refresh all records and statistics
        await refreshAllData();

        // Switch immediately to dashboard
        switchView('dashboard');
      } else {
        throw new Error(res.message || 'Failed to save customer');
      }
    } catch (err) {
      console.error('Error adding customer:', err);
      showToast('Save Failed', err.message || 'Could not save customer to Excel.', 'error');
    } finally {
      elements.formSubmitBtn.disabled = false;
      elements.formSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Save Customer to Excel</span>';
    }
  }

  // =========================================================================
  // Advanced Search Page System
  // =========================================================================

  function handleAdvancedSearch() {
    const query = elements.advancedSearchInput.value.trim().toLowerCase();
    const filterField = document.querySelector('input[name="searchField"]:checked')?.value || 'all';

    if (!query) {
      elements.searchInitialState.style.display = 'block';
      elements.searchCardsGrid.innerHTML = '';
      elements.searchNoResultsState.style.display = 'none';
      elements.searchResultsCount.textContent = '0 results';
      if (elements.searchActionButtons) elements.searchActionButtons.style.display = 'none';
      elements.clearAdvancedSearch.style.display = 'none';
      return;
    }

    elements.searchInitialState.style.display = 'none';
    elements.clearAdvancedSearch.style.display = 'block';

    const matches = state.allCustomers.filter(c => {
      if (filterField === 'name') {
        return c.name && c.name.toLowerCase().includes(query);
      }
      if (filterField === 'mobile') {
        return c.mobile && c.mobile.toLowerCase().includes(query);
      }
      if (filterField === 'billBook') {
        return c.billBook && c.billBook.toLowerCase().includes(query);
      }
      if (filterField === 'pageNo') {
        return c.pageNo && c.pageNo.toLowerCase().includes(query);
      }
      // 'all'
      return (
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.mobile && c.mobile.toLowerCase().includes(query)) ||
        (c.billBook && c.billBook.toLowerCase().includes(query)) ||
        (c.pageNo && c.pageNo.toLowerCase().includes(query)) ||
        (c.place && c.place.toLowerCase().includes(query)) ||
        (c.id && c.id.toLowerCase().includes(query)) ||
        (c.notes && c.notes.toLowerCase().includes(query))
      );
    });

    elements.searchResultsCount.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'}`;

    if (matches.length === 0) {
      elements.searchCardsGrid.innerHTML = '';
      elements.searchNoResultsState.style.display = 'flex';
      if (elements.searchActionButtons) elements.searchActionButtons.style.display = 'none';
      return;
    }

    elements.searchNoResultsState.style.display = 'none';
    if (elements.searchActionButtons) elements.searchActionButtons.style.display = 'block';
    elements.searchCardsGrid.innerHTML = '';

    matches.forEach(c => {
      const card = document.createElement('div');
      card.className = 'customer-search-card';
      card.innerHTML = `
        <div class="card-top">
          <div class="card-top-left">
            <span class="cell-avatar">${escapeHtml((c.name || 'C')[0].toUpperCase())}</span>
            <div>
              <div class="search-card-name">${escapeHtml(c.name)}</div>
              <div class="search-card-id">${escapeHtml(c.id)}</div>
            </div>
          </div>
          <span class="dropdown-bill-badge">Book ${escapeHtml(c.billBook)} / P.${escapeHtml(c.pageNo)}</span>
        </div>

        <div class="card-info-list">
          <div class="info-item">
            <i class="fa-solid fa-phone"></i>
            <strong>Mobile Number:</strong>
            <span class="info-val">${escapeHtml(c.mobile)}</span>
          </div>
          <div class="info-item">
            <i class="fa-solid fa-location-dot"></i>
            <strong>Place / Area:</strong>
            <span class="info-val">${escapeHtml(c.place)}</span>
          </div>
          <div class="info-item">
            <i class="fa-solid fa-book"></i>
            <strong>Bill Book No:</strong>
            <span class="info-val"><span class="book-tag-badge">${escapeHtml(c.billBook)}</span></span>
          </div>
          <div class="info-item">
            <i class="fa-solid fa-file-lines"></i>
            <strong>Page Number:</strong>
            <span class="info-val"><span class="page-tag-badge">Page ${escapeHtml(c.pageNo)}</span></span>
          </div>
          <div class="info-item">
            <i class="fa-solid fa-calendar"></i>
            <strong>Reg. Date:</strong>
            <span class="info-val">${formatDisplayDate(c.date)}</span>
          </div>
          ${c.notes ? `
          <div class="info-item">
            <i class="fa-solid fa-clipboard"></i>
            <strong>Notes:</strong>
            <span class="info-val">${escapeHtml(c.notes)}</span>
          </div>` : ''}
        </div>

        <div class="card-bottom-actions">
          <button class="btn btn-outline btn-sm action-view" data-id="${escapeHtml(c.id)}">
            <i class="fa-solid fa-eye"></i> View Slip
          </button>
          <button class="btn btn-outline btn-sm action-edit" data-id="${escapeHtml(c.id)}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-secondary btn-sm action-delete" data-id="${escapeHtml(c.id)}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
      elements.searchCardsGrid.appendChild(card);
    });
  }

  // =========================================================================
  // Global Search Dropdown (Topbar)
  // =========================================================================

  function handleGlobalSearch() {
    const query = elements.globalSearchInput.value.trim().toLowerCase();

    if (!query) {
      elements.globalSearchDropdown.classList.remove('show');
      elements.clearGlobalSearch.style.display = 'none';
      return;
    }

    elements.clearGlobalSearch.style.display = 'block';

    const matches = state.allCustomers.filter(c => {
      return (
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.mobile && c.mobile.toLowerCase().includes(query)) ||
        (c.billBook && c.billBook.toLowerCase().includes(query)) ||
        (c.pageNo && c.pageNo.toLowerCase().includes(query)) ||
        (c.place && c.place.toLowerCase().includes(query)) ||
        (c.id && c.id.toLowerCase().includes(query))
      );
    }).slice(0, 8); // Top 8 results for quick dropdown

    elements.dropdownCount.textContent = `${matches.length} found`;
    elements.dropdownResults.innerHTML = '';

    if (matches.length === 0) {
      elements.dropdownResults.innerHTML = `
        <div class="dropdown-empty">
          <i class="fa-solid fa-user-slash" style="margin-bottom: 0.5rem; font-size: 1.5rem; color: #94a3b8; display: block;"></i>
          No customers matching "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
    } else {
      matches.forEach(c => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `
          <div class="dropdown-item-left">
            <span class="customer-avatar">${escapeHtml((c.name || 'C')[0].toUpperCase())}</span>
            <div class="dropdown-item-info">
              <h4>${escapeHtml(c.name)} <small style="color:#64748b; font-weight:normal;">(${escapeHtml(c.id)})</small></h4>
              <p>
                <span><i class="fa-solid fa-phone"></i> ${escapeHtml(c.mobile)}</span>
                <span>&bull;</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.place)}</span>
              </p>
            </div>
          </div>
          <div class="dropdown-item-right">
            <span class="dropdown-bill-badge">Book ${escapeHtml(c.billBook)} / P.${escapeHtml(c.pageNo)}</span>
            <span class="dropdown-date">${formatDisplayDate(c.date)}</span>
          </div>
        `;
        item.addEventListener('click', () => {
          elements.globalSearchDropdown.classList.remove('show');
          openViewModal(c.id);
        });
        elements.dropdownResults.appendChild(item);
      });
    }

    elements.globalSearchDropdown.classList.add('show');
  }

  // =========================================================================
  // Dashboard Quick Lookup
  // =========================================================================

  function handleDashboardQuickSearch() {
    const query = elements.dashboardQuickSearch.value.trim().toLowerCase();

    if (!query) {
      elements.quickResultsPreview.innerHTML = `
        <div class="quick-results-placeholder">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Type above to view customer details immediately</span>
        </div>
      `;
      return;
    }

    const matches = state.allCustomers.filter(c => {
      return (
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.mobile && c.mobile.toLowerCase().includes(query)) ||
        (c.billBook && c.billBook.toLowerCase().includes(query)) ||
        (c.pageNo && c.pageNo.toLowerCase().includes(query))
      );
    }).slice(0, 3);

    if (matches.length === 0) {
      elements.quickResultsPreview.innerHTML = `
        <div class="quick-results-placeholder">
          <i class="fa-solid fa-user-slash"></i>
          <span>No customers matching "${escapeHtml(query)}"</span>
        </div>
      `;
      return;
    }

    elements.quickResultsPreview.innerHTML = '';
    matches.forEach(c => {
      const card = document.createElement('div');
      card.style.cssText = 'padding: 0.75rem; background: #ffffff; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;';
      card.innerHTML = `
        <div>
          <div style="font-weight: 700; color: #0f2942;">${escapeHtml(c.name)} <span style="font-size:0.75rem; color:#64748b;">(${escapeHtml(c.id)})</span></div>
          <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
            <i class="fa-solid fa-phone"></i> ${escapeHtml(c.mobile)} | <i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.place)}
          </div>
        </div>
        <div style="text-align: right;">
          <span class="page-pill" style="margin-bottom: 4px; display: inline-block;">Book ${escapeHtml(c.billBook)} / P.${escapeHtml(c.pageNo)}</span>
          <div>
            <button class="btn btn-outline btn-sm action-view" data-id="${escapeHtml(c.id)}" style="padding: 2px 8px; font-size: 0.75rem;">
              View
            </button>
          </div>
        </div>
      `;
      elements.quickResultsPreview.appendChild(card);
    });
  }

  // =========================================================================
  // Modals Management
  // =========================================================================

  function openModal(modalEl) {
    if (modalEl) {
      modalEl.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalEl) {
    if (modalEl) {
      modalEl.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  // Close modal when clicking close buttons or outside backdrop
  document.querySelectorAll('[data-modal]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalId = trigger.dataset.modal;
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });

  // --- View Details Modal ---
  async function openViewModal(customerId) {
    try {
      const res = await API.getCustomerById(customerId);
      if (!res.success || !res.data) {
        showToast('Error', 'Customer record could not be loaded.', 'error');
        return;
      }

      const c = res.data;
      elements.viewCustomerSubtitle.textContent = `${c.name} (${c.id})`;
      elements.viewEditBtn.dataset.id = c.id;

      elements.viewModalContent.innerHTML = `
        <div class="tailor-receipt-slip">
          <div class="slip-header">
            <h2>✂️ ROYAL TAILOR SHOP</h2>
            <p>Customer Measurement &amp; Bill Book Record</p>
          </div>

          <div class="slip-grid">
            <div class="slip-field">
              <span class="slip-label">Customer ID</span>
              <span class="slip-value highlight">${escapeHtml(c.id)}</span>
            </div>
            <div class="slip-field">
              <span class="slip-label">Registration Date</span>
              <span class="slip-value">${formatDisplayDate(c.date)}</span>
            </div>

            <div class="slip-field">
              <span class="slip-label">Customer Name</span>
              <span class="slip-value">${escapeHtml(c.name)}</span>
            </div>
            <div class="slip-field">
              <span class="slip-label">Mobile Number</span>
              <span class="slip-value">${escapeHtml(c.mobile)}</span>
            </div>

            <div class="slip-field full">
              <span class="slip-label">Place / Address</span>
              <span class="slip-value">${escapeHtml(c.place)}</span>
            </div>

            <div class="slip-field">
              <span class="slip-label">Physical Bill Book Number</span>
              <span class="slip-value"><span class="book-tag-badge">${escapeHtml(c.billBook)}</span></span>
            </div>
            <div class="slip-field">
              <span class="slip-label">Book Page Number</span>
              <span class="slip-value"><span class="page-tag-badge">Page ${escapeHtml(c.pageNo)}</span></span>
            </div>

            <div class="slip-field full">
              <span class="slip-label">Tailor Notes &amp; Measurements</span>
              <div class="slip-notes-box">
                <p>${c.notes ? escapeHtml(c.notes) : '<em>No additional notes recorded.</em>'}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      openModal(elements.viewModal);
    } catch (err) {
      console.error('Error opening view modal:', err);
      showToast('Error', 'Failed to retrieve customer details.', 'error');
    }
  }

  // --- Edit Customer Modal ---
  async function openEditModal(customerId) {
    try {
      const res = await API.getCustomerById(customerId);
      if (!res.success || !res.data) {
        showToast('Error', 'Customer record could not be loaded.', 'error');
        return;
      }

      const c = res.data;
      state.customerToEdit = c;

      // Populate edit fields
      elements.editCustId.value = c.id;
      elements.editCustIdDisplay.value = c.id;
      elements.editCustName.value = c.name;
      elements.editCustMobile.value = c.mobile;
      elements.editCustPlace.value = c.place;
      elements.editCustBillBook.value = c.billBook;
      elements.editCustPageNo.value = c.pageNo;
      elements.editCustDate.value = c.date;
      elements.editCustNotes.value = c.notes || '';

      // Clear edit errors
      [elements.editCustName, elements.editCustMobile, elements.editCustPlace, elements.editCustBillBook, elements.editCustPageNo, elements.editCustDate]
        .forEach(inp => inp.classList.remove('is-invalid'));
      [elements.editNameError, elements.editMobileError, elements.editPlaceError, elements.editBillBookError, elements.editPageNoError, elements.editDateError]
        .forEach(err => err.style.display = 'none');

      // Close view modal if it was open
      closeModal(elements.viewModal);

      openModal(elements.editModal);
    } catch (err) {
      console.error('Error opening edit modal:', err);
      showToast('Error', 'Failed to retrieve customer details for editing.', 'error');
    }
  }

  function validateEditForm() {
    let isValid = true;

    [elements.editCustName, elements.editCustMobile, elements.editCustPlace, elements.editCustBillBook, elements.editCustPageNo, elements.editCustDate]
      .forEach(inp => inp.classList.remove('is-invalid'));
    [elements.editNameError, elements.editMobileError, elements.editPlaceError, elements.editBillBookError, elements.editPageNoError, elements.editDateError]
      .forEach(err => err.style.display = 'none');

    if (!elements.editCustName.value.trim()) {
      elements.editCustName.classList.add('is-invalid');
      elements.editNameError.style.display = 'block';
      isValid = false;
    }

    const cleanMobile = elements.editCustMobile.value.trim().replace(/\D/g, '');
    if (!elements.editCustMobile.value.trim() || cleanMobile.length < 7 || cleanMobile.length > 15) {
      elements.editCustMobile.classList.add('is-invalid');
      elements.editMobileError.style.display = 'block';
      isValid = false;
    }

    if (!elements.editCustPlace.value.trim()) {
      elements.editCustPlace.classList.add('is-invalid');
      elements.editPlaceError.style.display = 'block';
      isValid = false;
    }

    if (!elements.editCustBillBook.value.trim()) {
      elements.editCustBillBook.classList.add('is-invalid');
      elements.editBillBookError.style.display = 'block';
      isValid = false;
    }

    if (!elements.editCustPageNo.value.trim()) {
      elements.editCustPageNo.classList.add('is-invalid');
      elements.editPageNoError.style.display = 'block';
      isValid = false;
    }

    if (!elements.editCustDate.value.trim()) {
      elements.editCustDate.classList.add('is-invalid');
      elements.editDateError.style.display = 'block';
      isValid = false;
    }

    return isValid;
  }

  async function handleEditCustomerSubmit(e) {
    e.preventDefault();

    if (!validateEditForm()) {
      showToast('Validation Error', 'Please complete all required fields.', 'error');
      return;
    }

    const id = elements.editCustId.value;
    const updateData = {
      name: elements.editCustName.value.trim(),
      mobile: elements.editCustMobile.value.trim(),
      place: elements.editCustPlace.value.trim(),
      billBook: elements.editCustBillBook.value.trim(),
      pageNo: elements.editCustPageNo.value.trim(),
      date: elements.editCustDate.value.trim(),
      notes: elements.editCustNotes.value.trim()
    };

    const submitBtn = document.getElementById('editSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating Excel...';

    try {
      const res = await API.updateCustomer(id, updateData);
      if (res.success) {
        showToast('Updated', `Customer ${res.data.name} updated successfully in customers.xlsx.`, 'success');
        closeModal(elements.editModal);
        await refreshAllData();

        // Refresh search view if active
        if (state.currentView === 'search') {
          handleAdvancedSearch();
        }
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      showToast('Update Failed', err.message || 'Failed to update customer in Excel.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes to Excel';
    }
  }

  // --- Delete Customer Modal ---
  function openDeleteModal(customerId) {
    const customer = state.allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    state.customerToDelete = customer;
    elements.deleteCustName.textContent = customer.name;
    elements.deleteCustId.textContent = customer.id;

    openModal(elements.deleteModal);
  }

  async function handleConfirmDelete() {
    if (!state.customerToDelete) return;

    const id = state.customerToDelete.id;
    const name = state.customerToDelete.name;

    elements.confirmDeleteBtn.disabled = true;
    elements.confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
      const res = await API.deleteCustomer(id);
      if (res.success) {
        showToast('Deleted', `Customer ${name} (${id}) has been removed from customers.xlsx.`, 'info');
        closeModal(elements.deleteModal);
        state.customerToDelete = null;

        await refreshAllData();

        // If search view is active, re-run search
        if (state.currentView === 'search') {
          handleAdvancedSearch();
        }
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Delete Failed', err.message || 'Failed to delete customer record.', 'error');
    } finally {
      elements.confirmDeleteBtn.disabled = false;
      elements.confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Yes, Delete Customer';
    }
  }

  // =========================================================================
  // Delegated Action Clicks (View, Edit, Delete)
  // =========================================================================

  document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.action-view');
    if (viewBtn) {
      const id = viewBtn.dataset.id;
      if (id) openViewModal(id);
      return;
    }

    const editBtn = e.target.closest('.action-edit');
    if (editBtn) {
      const id = editBtn.dataset.id;
      if (id) openEditModal(id);
      return;
    }

    const deleteBtn = e.target.closest('.action-delete');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (id) openDeleteModal(id);
      return;
    }
  });

  // =========================================================================
  // Event Listeners
  // =========================================================================

  // Sidebar toggle
  elements.toggleSidebarBtn.addEventListener('click', openMobileSidebar);
  elements.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Nav links
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      if (view) switchView(view);
    });
  });

  // Banner & Topbar navigation shortcuts
  elements.bannerAddBtn.addEventListener('click', () => switchView('add-customer'));
  elements.bannerSearchBtn.addEventListener('click', () => switchView('search'));
  elements.viewAllRecordsBtn.addEventListener('click', () => switchView('records'));
  elements.topAddBtn.addEventListener('click', () => switchView('add-customer'));
  elements.emptyAddBtn?.addEventListener('click', () => switchView('add-customer'));
  elements.tableAddCustomerBtn.addEventListener('click', () => switchView('add-customer'));
  elements.searchAddNewBtn.addEventListener('click', () => switchView('add-customer'));

  // Export buttons
  elements.navExportBtn.addEventListener('click', (e) => {
    e.preventDefault();
    API.exportExcel();
  });
  elements.topExportBtn.addEventListener('click', () => API.exportExcel());
  elements.tableExportBtn.addEventListener('click', () => API.exportExcel());
  elements.searchExportBtn.addEventListener('click', () => API.exportExcel());

  // Form Submissions
  elements.customerForm.addEventListener('submit', handleAddCustomerSubmit);
  elements.formResetBtn.addEventListener('click', () => {
    setTimeout(() => {
      elements.custDate.value = getTodayDateString();
      [elements.custName, elements.custMobile, elements.custPlace, elements.custBillBook, elements.custPageNo, elements.custDate]
        .forEach(inp => inp.classList.remove('is-invalid'));
      [elements.nameError, elements.mobileError, elements.placeError, elements.billBookError, elements.pageNoError, elements.dateError]
        .forEach(err => err.style.display = 'none');
    }, 10);
  });

  elements.editCustomerForm.addEventListener('submit', handleEditCustomerSubmit);
  elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // View modal internal actions
  elements.viewEditBtn.addEventListener('click', () => {
    const id = elements.viewEditBtn.dataset.id;
    if (id) openEditModal(id);
  });

  elements.printSlipBtn.addEventListener('click', () => {
    window.print();
  });

  // Table Search Filter
  elements.tableFilterInput.addEventListener('input', debounce((e) => {
    state.tableFilterText = e.target.value;
    applyTableFilter();
  }, 200));

  elements.clearTableFilter.addEventListener('click', () => {
    elements.tableFilterInput.value = '';
    state.tableFilterText = '';
    applyTableFilter();
  });

  // Table Page Size
  elements.pageSizeSelect.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.currentPage = 1;
    renderRecordsTable();
  });

  // Table Refresh Button
  elements.tableRefreshBtn.addEventListener('click', async () => {
    elements.tableRefreshBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Refreshing...';
    await refreshAllData();
    elements.tableRefreshBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh';
    showToast('Refreshed', 'Customer records reloaded from customers.xlsx', 'info', 2000);
  });

  // Table Column Sorting
  elements.customersTable.querySelectorAll('thead th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (state.sortField === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortOrder = 'asc';
      }
      sortCustomerList(state.filteredCustomers, state.sortField, state.sortOrder);
      renderRecordsTable();
    });
  });

  // Advanced Search Page Listeners
  elements.advancedSearchInput.addEventListener('input', debounce(handleAdvancedSearch, 200));
  document.querySelectorAll('input[name="searchField"]').forEach(radio => {
    radio.addEventListener('change', handleAdvancedSearch);
  });
  elements.clearAdvancedSearch.addEventListener('click', () => {
    elements.advancedSearchInput.value = '';
    handleAdvancedSearch();
    elements.advancedSearchInput.focus();
  });

  // Topbar Global Search Listeners
  elements.globalSearchInput.addEventListener('input', debounce(handleGlobalSearch, 200));
  elements.clearGlobalSearch.addEventListener('click', () => {
    elements.globalSearchInput.value = '';
    handleGlobalSearch();
  });

  // Close global search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.globalSearchDropdown.contains(e.target) && e.target !== elements.globalSearchInput) {
      elements.globalSearchDropdown.classList.remove('show');
    }
  });

  // Dashboard Quick Search
  elements.dashboardQuickSearch.addEventListener('input', debounce(handleDashboardQuickSearch, 200));

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl + K or / to focus search
    if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
      e.preventDefault();
      elements.globalSearchInput.focus();
      elements.globalSearchInput.select();
    }

    // Escape to close open modals or search dropdown
    if (e.key === 'Escape') {
      elements.globalSearchDropdown.classList.remove('show');
      document.querySelectorAll('.modal-overlay.show').forEach(m => closeModal(m));
    }
  });

  // Hash-based direct view routing (e.g. #add-customer, #records, #search)
  function handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (hash && elements.views[hash]) {
      switchView(hash);
    }
  }
  window.addEventListener('hashchange', handleHashChange);

  // Initialize
  elements.custDate.value = getTodayDateString();
  if (window.location.hash) {
    handleHashChange();
  }
  loadInitialData();
});
