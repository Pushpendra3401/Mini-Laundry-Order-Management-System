const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';
let token = localStorage.getItem('token');

// Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const ordersTableBody = document.getElementById('ordersTableBody');
const orderForm = document.getElementById('orderForm');
const addGarmentBtn = document.getElementById('addGarment');
const filterForm = document.getElementById('filterForm');

// Auth logic
const checkAuth = () => {
    if (token) {
        loginSection.classList.add('d-none');
        dashboardSection.classList.remove('d-none');
        logoutBtn.classList.remove('d-none');
        fetchDashboard();
        fetchOrders();
    } else {
        loginSection.classList.remove('d-none');
        dashboardSection.classList.add('d-none');
        logoutBtn.classList.add('d-none');
    }
};

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        if (res.ok && data.token) {
            token = data.token;
            localStorage.setItem('token', token);
            checkAuth();
        } else {
            console.error('Login error:', data);
            alert(data.message || 'Login failed. Please check credentials.');
        }
    } catch (err) {
        console.error('Network error during login:', err);
        alert('Network error: Could not reach the server. Please check your connection or redeploy.');
    }
});

logoutBtn.addEventListener('click', () => {
    token = null;
    localStorage.removeItem('token');
    checkAuth();
});

// Orders logic
const fetchOrders = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    try {
        const res = await fetch(`${API_URL}/orders?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await res.json();
        renderOrders(orders);
    } catch (err) {
        console.error(err);
    }
};

const renderOrders = (orders) => {
    if (!Array.isArray(orders)) {
        console.error('Orders is not an array:', orders);
        ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found or error loading orders.</td></tr>';
        return;
    }
    ordersTableBody.innerHTML = orders.map(order => {
        const deliveryDate = order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : 'TBD';
        const garmentsHtml = order.garments.map(g => `${g.quantity}x ${g.garmentType}`).join(', ');
        return `
            <tr>
                <td>${order.orderId}</td>
                <td>${order.customerName}<br><small class="text-muted">${order.phoneNumber}</small></td>
                <td><small>${garmentsHtml}</small></td>
                <td>$${order.totalAmount}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td><small class="text-primary fw-bold">${deliveryDate}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="updateStatus('${order._id}', '${getNextStatus(order.status)}')">
                        Next Status
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

const getNextStatus = (current) => {
    const flow = {
        'RECEIVED': 'PROCESSING',
        'PROCESSING': 'READY',
        'READY': 'DELIVERED',
        'DELIVERED': 'DELIVERED'
    };
    return flow[current];
};

window.updateStatus = async (id, status) => {
    try {
        const res = await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            fetchOrders();
            fetchDashboard();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
};

// Dashboard logic
const fetchDashboard = async () => {
    try {
        const res = await fetch(`${API_URL}/orders/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            if (res.status === 401) {
                // Token might be invalid, but we don't logout immediately to avoid loop
                console.error('Dashboard: Unauthorized');
            }
            return;
        }
        const stats = await res.json();
        document.getElementById('totalOrders').innerText = stats.totalOrders !== undefined ? stats.totalOrders : '0';
        document.getElementById('totalRevenue').innerText = `$${stats.totalRevenue !== undefined ? stats.totalRevenue : '0'}`;
        document.getElementById('avgTime').innerText = `${stats.avgProcessingTimeDays || '0'} days`;
        
        const breakdownContainer = document.getElementById('statusBreakdown');
        if (breakdownContainer && stats.ordersByStatus) {
            breakdownContainer.innerHTML = stats.ordersByStatus.map(s => `
                <span class="status-badge status-${s._id}">${s._id}: ${s.count}</span>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
};

// New Order logic
addGarmentBtn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'garment-item row mb-2';
    div.innerHTML = `
        <div class="col-8">
            <select class="form-select garment-type" required>
                <option value="Shirt">Shirt ($10)</option>
                <option value="Pants">Pants ($15)</option>
                <option value="Saree">Saree ($50)</option>
                <option value="Suit">Suit ($100)</option>
            </select>
        </div>
        <div class="col-4">
            <input type="number" class="form-control garment-qty" placeholder="Qty" value="1" min="1" required>
        </div>
    `;
    document.getElementById('garmentsList').appendChild(div);
});

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customerName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const garments = Array.from(document.querySelectorAll('.garment-item')).map(item => ({
        garmentType: item.querySelector('.garment-type').value,
        quantity: parseInt(item.querySelector('.garment-qty').value) || 0
    })).filter(item => item.quantity > 0);

    if (garments.length === 0) {
        alert('Please add at least one item');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ customerName, phoneNumber, garments })
        });
        if (res.ok) {
            const modalElement = document.getElementById('orderModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modalInstance.hide();
            orderForm.reset();
            // Reset garments list to just one item
            document.getElementById('garmentsList').innerHTML = `
                <div class="garment-item row mb-2">
                    <div class="col-8">
                        <select class="form-select garment-type" required>
                            <option value="Shirt">Shirt ($10)</option>
                            <option value="Pants">Pants ($15)</option>
                            <option value="Saree">Saree ($50)</option>
                            <option value="Suit">Suit ($100)</option>
                        </select>
                    </div>
                    <div class="col-4">
                        <input type="number" class="form-control garment-qty" placeholder="Qty" value="1" min="1" required>
                    </div>
                </div>
            `;
            fetchOrders();
            fetchDashboard();
            alert('Order created successfully!');
        } else {
            const data = await res.json();
            alert('Error: ' + (data.message || 'Failed to create order'));
        }
    } catch (err) {
        console.error(err);
        alert('Error: Could not connect to the server');
    }
});

filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const filters = {
        customerName: document.getElementById('filterName').value,
        phoneNumber: document.getElementById('filterPhone').value,
        garmentType: document.getElementById('filterGarment').value,
        status: document.getElementById('filterStatus').value
    };
    fetchOrders(filters);
});

// Init
checkAuth();
