const API_URL = import.meta.env.VITE_API_URL;

/**
 * Custom fetch client that injects authorization headers.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthenticated
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin');
    // Redirect only if not already on the login page to avoid loops
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Authentication
export async function authLogin(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Orders
export async function fetchOrders({ payment_status, order_status, date } = {}) {
  const params = new URLSearchParams();
  if (payment_status) params.append('payment_status', payment_status);
  if (order_status) params.append('order_status', order_status);
  if (date) params.append('date', date);

  const queryStr = params.toString();
  return request(`/orders${queryStr ? `?${queryStr}` : ''}`);
}

export async function updateOrderStatus(orderId, orderStatus) {
  return request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ order_status: orderStatus }),
  });
}

export async function fetchSummaryToday() {
  return request('/orders/summary/today');
}

// Menu Items
export async function fetchMenu() {
  return request('/menu');
}

export async function createMenuItem(itemData) {
  return request('/menu', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
}

export async function updateMenuItem(itemId, itemData) {
  return request(`/menu/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(itemData),
  });
}

export async function deleteMenuItem(itemId) {
  return request(`/menu/${itemId}`, {
    method: 'DELETE',
  });
}

export async function uploadMenuItemImage(name, base64Image) {
  return request('/menu/upload', {
    method: 'POST',
    body: JSON.stringify({ name, image: base64Image }),
  });
}
