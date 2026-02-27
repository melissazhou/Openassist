// Global state
const state = {
    user: null,
    currentTab: 'dashboard',
    requests: [],
    dictionary: [],
    currentEditDict: null
};

// Quick login
function quickLogin(u, p) {
    document.getElementById('username').value = u;
    document.getElementById('password').value = p;
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

// Role label mapping
const ROLE_LABELS = {
    'superadmin': '🔑 Super Admin',
    'operator': '👷 Operator',
    'user': '👤 User',
    'viewer': '👁 Viewer'
};

// API base URL
const API_BASE = '';

// Utility functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function showError(message) {
    showToast(message, 'error');
}

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================================
// Auth
// ============================================================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        document.getElementById('loginError').textContent = 'Please enter username and password';
        document.getElementById('loginError').style.display = 'block';
        return;
    }

    showLoading();
    try {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (result.success) {
            state.user = result.user;
            showMainApp();
            showToast('Login successful');
            loadDashboard();
        } else {
            document.getElementById('loginError').textContent = result.message;
            document.getElementById('loginError').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('loginError').textContent = error.message;
        document.getElementById('loginError').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        await apiRequest('/auth/logout');
        state.user = null;
        showLoginPage();
        showToast('Logged out');
    } catch (error) {
        showError(error.message);
    }
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userInfo').textContent = `${state.user.name || state.user.username}`;
    const roleBadge = document.getElementById('userRole');
    if (roleBadge) {
        roleBadge.textContent = ROLE_LABELS[state.user.role] || state.user.role;
        roleBadge.className = 'role-badge role-' + (state.user.role || 'user');
    }
}

// ============================================================
// Tab switching
// ============================================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) btn.classList.add('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    state.currentTab = tabName;

    switch (tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'requests':  populateFilterDropdowns().then(() => loadRequests());  break;
        case 'dictionary': loadDictionary(); break;
    }
}

// ============================================================
// Dashboard
// ============================================================
async function loadDashboard() {
    try {
        const result = await apiRequest('/api/mdm/stats');
        if (result.success) {
            const s = result.by_status || {};
            document.getElementById('statActive').textContent    = result.active_count || 0;
            document.getElementById('statPending').textContent   = s['Pending'] || 0;
            document.getElementById('statApproved').textContent  = s['Approved'] || 0;
            document.getElementById('statCompleted').textContent = result.completed_count || 0;
            document.getElementById('statTotal').textContent     = result.total || 0;

            // Active by category chart
            renderCategoryChart('activeByCategoryChart', result.active_by_category || {}, '📌');
            // Completed by category chart
            renderCategoryChart('completedByCategoryChart', result.completed_by_category || {}, '✅');

            // Recent active requests
            document.getElementById('recentRequests').innerHTML = renderRequestsTable(result.recent_active || [], false);

            // Cache filter options
            window._requestors = result.requestors || [];
            window._assignedTos = result.assigned_tos || [];
            window._categories = Object.keys(result.by_category || {}).sort();
        }
    } catch (error) {
        showError('Failed to load dashboard');
    }
}

function renderCategoryChart(elementId, data, icon) {
    const el = document.getElementById(elementId);
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        el.innerHTML = '<p style="color:#999;text-align:center;">No data</p>';
        return;
    }
    const max = Math.max(...entries.map(e => e[1]));
    el.innerHTML = entries.map(([cat, count]) => {
        const pct = Math.round(count / max * 100);
        return `<div class="cat-bar-row">
            <span class="cat-label">${cat}</span>
            <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%"></div></div>
            <span class="cat-count">${count}</span>
        </div>`;
    }).join('');
}

// ============================================================
// Change Requests
// ============================================================
function getRequestFilters() {
    const params = new URLSearchParams();
    const status = document.getElementById('statusFilter').value;
    if (status) params.set('status', status);
    const requestor = document.getElementById('requestorFilter').value;
    if (requestor) params.set('requestor', requestor);
    const assignedTo = document.getElementById('assignedToFilter').value;
    if (assignedTo) params.set('assigned_to', assignedTo);
    const category = document.getElementById('categoryFilter').value;
    if (category) params.set('category', category);
    const dateFrom = document.getElementById('dateFromFilter').value;
    if (dateFrom) params.set('date_from', dateFrom);
    const dateTo = document.getElementById('dateToFilter').value;
    if (dateTo) params.set('date_to', dateTo);
    const search = document.getElementById('searchFilter').value.trim();
    if (search) params.set('search', search);
    return params.toString();
}

async function loadRequests() {
    showLoading();
    try {
        const qs = getRequestFilters();
        const url = qs ? `/api/mdm/requests?${qs}` : '/api/mdm/requests';
        const result = await apiRequest(url);
        if (result.success) {
            state.requests = result.data;
            document.getElementById('requestsCount').textContent = `Showing ${result.data.length} of ${result.total} results`;
            document.getElementById('requestsTable').innerHTML = renderRequestsTable(result.data, true);
        }
    } catch (error) {
        showError('Failed to load requests');
    } finally {
        hideLoading();
    }
}

async function populateFilterDropdowns() {
    // Use cached data from dashboard stats, or fetch
    try {
        if (!window._requestors) {
            const stats = await apiRequest('/api/mdm/stats');
            if (stats.success) {
                window._requestors = stats.requestors || [];
                window._assignedTos = stats.assigned_tos || [];
                window._categories = Object.keys(stats.by_category || {});
            }
        }
        const rSel = document.getElementById('requestorFilter');
        const aSel = document.getElementById('assignedToFilter');
        const cSel = document.getElementById('categoryFilter');

        // Populate requestor
        (window._requestors || []).forEach(name => {
            if (!rSel.querySelector(`option[value="${name}"]`)) {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                rSel.appendChild(opt);
            }
        });
        // Populate assigned_to
        (window._assignedTos || []).forEach(name => {
            if (!aSel.querySelector(`option[value="${name}"]`)) {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                aSel.appendChild(opt);
            }
        });
        // Populate categories
        (window._categories || []).forEach(name => {
            if (!cSel.querySelector(`option[value="${name}"]`)) {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                cSel.appendChild(opt);
            }
        });
    } catch(e) { console.error('Failed to populate filters', e); }
}

function renderRequestsTable(requests, withActions = true) {
    if (!requests || requests.length === 0) {
        return '<p style="text-align:center;color:#999;padding:20px;">No data</p>';
    }

    let html = `<table><thead><tr>
        <th>Title</th><th>Category</th><th>Field</th><th>Items</th><th>Old→New</th>
        <th>System</th><th>Requestor</th><th>Priority</th><th>Src Status</th><th>Status</th>
        ${withActions ? '<th>Actions</th>' : ''}
    </tr></thead><tbody>`;

    requests.forEach(req => {
        const title = req.source_title || req.item || '-';
        const displayTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
        const category = req.category || req.change_type || '-';
        const field = req.field || '-';
        const items = req.item || '-';
        const oldNew = (req.old_value || req.new_value) ? `${req.old_value || ''}→${req.new_value || ''}` : '-';
        const system = req.system || '-';
        const requestor = req.requestor || req.created_by || '-';
        const urgency = req.priority || 'Medium';
        const srcStatus = req.source_status || '-';

        html += `<tr>
            <td title="${title.replace(/"/g, '&quot;')}"><small>${displayTitle}</small></td>
            <td><span class="badge badge-category">${category}</span></td>
            <td><code>${field}</code></td>
            <td><small>${items}</small></td>
            <td><small>${oldNew}</small></td>
            <td><small>${system}</small></td>
            <td><small>${requestor}</small></td>
            <td><span class="badge badge-${urgency.toLowerCase()}">${urgency}</span></td>
            <td><small>${srcStatus}</small></td>
            <td><span class="badge badge-${req.status.toLowerCase()}">${req.status}</span></td>
            ${withActions ? `<td class="actions-cell">
                <button class="btn btn-sm btn-primary" onclick="viewRequest('${req.request_id}')">View</button>
                ${req.status === 'Pending' ? `<button class="btn btn-sm btn-danger" onclick="deleteRequest('${req.request_id}')">Del</button>` : ''}
            </td>` : ''}
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
}

async function viewRequest(requestId) {
    showLoading();
    try {
        const result = await apiRequest(`/api/mdm/request/${requestId}`);
        if (result.success) {
            const req = result.data;
            const fields = [
                ['Request ID', req.request_id],
                ['Title', req.source_title || req.item || '-'],
                ['Type', req.change_type || '-'],
                ['Requestor', req.requestor || req.created_by || '-'],
                ['Date Requested', req.date_requested || '-'],
                ['Requested Completion', req.requested_completion || '-'],
                ['Source Status', req.source_status || '-'],
                ['Assigned To', req.assigned_to || '-'],
                ['Priority', `<span class="badge badge-${(req.priority||'medium').toLowerCase()}">${req.priority||'-'}</span>`],
                ['Status', `<span class="badge badge-${req.status.toLowerCase()}">${req.status}</span>`],
                ['Instructions', `<div style="white-space:pre-wrap;max-width:400px">${req.instructions || req.field || '-'}</div>`],
                ['Created', req.created_at],
                ['Created By', req.created_by],
            ];
            if (req.item && req.item !== req.source_title?.split(' ')[0]) fields.push(['Item', req.item]);
            if (req.org) fields.push(['Org', req.org]);
            if (req.old_value) fields.push(['Old Value', req.old_value]);
            if (req.new_value) fields.push(['New Value', req.new_value]);
            if (req.approved_by) fields.push(['Approved By', req.approved_by]);
            if (req.approved_at) fields.push(['Approved At', req.approved_at]);
            if (req.comment) fields.push(['Comment', req.comment]);
            if (req.update_result) fields.push(['Update Result', req.update_result]);

            document.getElementById('requestDetail').innerHTML = '<div class="data-content">' +
                fields.map(([k, v]) => `<div class="data-row"><div class="data-label">${k}:</div><div class="data-value">${v}</div></div>`).join('') +
                '</div>';

            document.getElementById('requestActions').innerHTML = req.status === 'Pending' ? `
                <button class="btn btn-success" onclick="approveRequest('${req.request_id}')">✓ Approve</button>
                <button class="btn btn-danger" onclick="rejectRequest('${req.request_id}')">✗ Reject</button>
            ` : '';
            showModal('requestModal');
        }
    } catch (error) {
        showError('Failed to load request detail');
    } finally {
        hideLoading();
    }
}

async function approveRequest(requestId) {
    const comment = prompt('Enter approval comment (optional):', '');
    showLoading();
    try {
        const result = await apiRequest(`/api/approval/approve/${requestId}`, {
            method: 'POST', body: JSON.stringify({ comment })
        });
        if (result.success) { showToast('Approved'); closeModal('requestModal'); loadRequests(); }
    } catch (error) { showError('Approval failed: ' + error.message); }
    finally { hideLoading(); }
}

async function rejectRequest(requestId) {
    const comment = prompt('Enter rejection reason:', '');
    if (!comment) { showError('Rejection reason is required'); return; }
    showLoading();
    try {
        const result = await apiRequest(`/api/approval/reject/${requestId}`, {
            method: 'POST', body: JSON.stringify({ comment })
        });
        if (result.success) { showToast('Rejected'); closeModal('requestModal'); loadRequests(); }
    } catch (error) { showError('Operation failed: ' + error.message); }
    finally { hideLoading(); }
}

async function deleteRequest(requestId) {
    if (!confirm('Are you sure you want to delete this request?')) return;
    showLoading();
    try {
        const result = await apiRequest(`/api/mdm/request/${requestId}`, { method: 'DELETE' });
        if (result.success) { showToast('Deleted'); loadRequests(); }
    } catch (error) { showError('Delete failed: ' + error.message); }
    finally { hideLoading(); }
}

// ============================================================
// Item Query
// ============================================================
async function searchItem() {
    const itemNumber = document.getElementById('itemSearchInput').value.trim();
    if (!itemNumber) { showError('Please enter an item number'); return; }

    showLoading();
    try {
        const result = await apiRequest(`/api/item/${itemNumber}`);
        if (result.success) {
            const renderData = (data, el) => {
                if (data && Object.keys(data).length > 0) {
                    el.innerHTML = Object.entries(data).map(([k, v]) =>
                        `<div class="data-row"><div class="data-label">${k}:</div><div class="data-value">${v || '-'}</div></div>`
                    ).join('');
                } else {
                    el.innerHTML = '<p style="color:#999;">No data</p>';
                }
            };
            renderData(result.ebs_data, document.getElementById('ebsData'));
            renderData(result.plm_data, document.getElementById('plmData'));
            document.getElementById('itemResult').style.display = 'block';
        }
    } catch (error) { showError('Query failed: ' + error.message); }
    finally { hideLoading(); }
}

// ============================================================
// Dictionary
// ============================================================
async function loadDictionary() {
    showLoading();
    try {
        const result = await apiRequest('/api/dictionary/');
        if (result.success) { state.dictionary = result.data; renderDictionary(result.data); }
    } catch (error) { showError('Failed to load dictionary'); }
    finally { hideLoading(); }
}

function renderDictionary(items) {
    if (!items || items.length === 0) {
        document.getElementById('dictionaryTable').innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No data</p>';
        return;
    }
    let html = `<table><thead><tr>
        <th>Business Desc</th><th>Field Name</th><th>System</th><th>Description</th><th>Created</th><th>Actions</th>
    </tr></thead><tbody>`;

    items.forEach(item => {
        html += `<tr>
            <td>${item.business_desc}</td><td>${item.field_name}</td><td>${item.system}</td>
            <td>${item.description || '-'}</td><td>${item.created_at}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editDict(${item.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteDict(${item.id})">Delete</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('dictionaryTable').innerHTML = html;
}

function showAddDict() {
    state.currentEditDict = null;
    document.getElementById('dictModalTitle').textContent = 'Add Dictionary Entry';
    document.getElementById('dictBusinessDesc').value = '';
    document.getElementById('dictFieldName').value = '';
    document.getElementById('dictSystem').value = '';
    document.getElementById('dictDescription').value = '';
    showModal('dictModal');
}

function editDict(id) {
    const item = state.dictionary.find(d => d.id === id);
    if (!item) return;
    state.currentEditDict = item;
    document.getElementById('dictModalTitle').textContent = 'Edit Dictionary Entry';
    document.getElementById('dictBusinessDesc').value = item.business_desc;
    document.getElementById('dictFieldName').value = item.field_name;
    document.getElementById('dictSystem').value = item.system;
    document.getElementById('dictDescription').value = item.description || '';
    showModal('dictModal');
}

async function saveDictForm(e) {
    e.preventDefault();
    const data = {
        business_desc: document.getElementById('dictBusinessDesc').value.trim(),
        field_name: document.getElementById('dictFieldName').value.trim(),
        system: document.getElementById('dictSystem').value.trim(),
        description: document.getElementById('dictDescription').value.trim()
    };
    showLoading();
    try {
        let result;
        if (state.currentEditDict) {
            result = await apiRequest(`/api/dictionary/${state.currentEditDict.id}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            result = await apiRequest('/api/dictionary/', { method: 'POST', body: JSON.stringify(data) });
        }
        if (result.success) { showToast('Saved'); closeModal('dictModal'); loadDictionary(); }
    } catch (error) { showError('Save failed: ' + error.message); }
    finally { hideLoading(); }
}

async function deleteDict(id) {
    if (!confirm('Delete this dictionary entry?')) return;
    showLoading();
    try {
        const result = await apiRequest(`/api/dictionary/${id}`, { method: 'DELETE' });
        if (result.success) { showToast('Deleted'); loadDictionary(); }
    } catch (error) { showError('Delete failed: ' + error.message); }
    finally { hideLoading(); }
}

// ============================================================
// Modal helpers
// ============================================================
function showModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Auth
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Requests — all filter controls trigger reload
    ['statusFilter', 'requestorFilter', 'assignedToFilter', 'categoryFilter', 'dateFromFilter', 'dateToFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => loadRequests());
    });
    let searchTimeout;
    document.getElementById('searchFilter').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadRequests(), 400);
    });
    document.getElementById('refreshRequestsBtn').addEventListener('click', () => loadRequests());

    // Item Query
    document.getElementById('searchItemBtn').addEventListener('click', searchItem);
    document.getElementById('itemSearchInput').addEventListener('keypress', e => { if (e.key === 'Enter') searchItem(); });

    // Dictionary
    document.getElementById('addDictBtn').addEventListener('click', showAddDict);
    document.getElementById('dictForm').addEventListener('submit', saveDictForm);
    document.getElementById('cancelDictBtn').addEventListener('click', () => closeModal('dictModal'));

    // Modals
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', e => { const m = e.target.closest('.modal'); if (m) closeModal(m.id); });
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
    });

    // Check session
    try {
        const result = await apiRequest('/auth/check');
        if (result.logged_in) { state.user = result.user; showMainApp(); loadDashboard(); }
        else { showLoginPage(); }
    } catch (error) { showLoginPage(); }
});
