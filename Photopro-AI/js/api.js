// PhotoPro AI – Centralized API Service
const API_BASE = 'http://localhost:5000/api';

const api = {
  // Token management
  getToken() {
    return localStorage.getItem('pp_token');
  },
  setToken(token) {
    localStorage.setItem('pp_token', token);
  },
  getUser() {
    const u = localStorage.getItem('pp_user');
    return u ? JSON.parse(u) : null;
  },
  setUser(user) {
    localStorage.setItem('pp_user', JSON.stringify(user));
  },
  clearAuth() {
    localStorage.removeItem('pp_token');
    localStorage.removeItem('pp_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },

  // Core fetch wrapper
  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, config);
      const data = await res.json();

      if (res.status === 401) {
        this.clearAuth();
        document.getElementById('app-shell')?.classList.add('hidden');
        document.getElementById('auth-screen')?.classList.remove('hidden');
        showToast('Session expired. Please sign in again.', 'alert-circle');
        throw new Error(data.message || 'Unauthorized');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running on port 5000.');
      }
      throw error;
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },

  // ── Auth ──
  async login(email, password) {
    const res = await this.post('/auth/login', { email, password });
    this.setToken(res.data.token);
    this.setUser(res.data.user);
    return res;
  },
  async register(name, email, password, role, phone, address) {
    const res = await this.post('/auth/register', { name, email, password, role, phone, address });
    this.setToken(res.data.token);
    this.setUser(res.data.user);
    return res;
  },
  async getMe() { return this.get('/auth/me'); },

  // ── Customers ──
  async getCustomers() { return this.get('/customers'); },
  async getCustomer(id) { return this.get(`/customers/${id}`); },
  async createCustomer(body) { return this.post('/customers', body); },
  async updateCustomer(id, body) { return this.put(`/customers/${id}`, body); },
  async deleteCustomer(id) { return this.delete(`/customers/${id}`); },

  // ── Users ──
  async getUsers() { return this.get('/users'); },
  async getUser(id) { return this.get(`/users/${id}`); },
  async createUser(body) { return this.post('/users', body); },
  async updateUser(id, body) { return this.put(`/users/${id}`, body); },
  async deleteUser(id) { return this.delete(`/users/${id}`); },

  // ── Equipment ──
  async getEquipment() { return this.get('/equipment'); },
  async getEquipmentById(id) { return this.get(`/equipment/${id}`); },
  async createEquipment(body) { return this.post('/equipment', body); },
  async updateEquipment(id, body) { return this.put(`/equipment/${id}`, body); },
  async deleteEquipment(id) { return this.delete(`/equipment/${id}`); },

  // ── Rentals ──
  async getRentals() { return this.get('/rentals'); },
  async getRental(id) { return this.get(`/rentals/${id}`); },
  async createRental(body) { return this.post('/rentals', body); },
  async updateRental(id, body) { return this.put(`/rentals/${id}`, body); },
  async deleteRental(id) { return this.delete(`/rentals/${id}`); },
};
