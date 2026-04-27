'use client';

// ========== LOCAL STORAGE HELPERS ==========
// Mock database using localStorage until Supabase integration

const KEYS = {
  USER: 'khata_user',
  PRODUCTS: 'khata_products',
  TRANSACTIONS: 'khata_transactions',
  PARTIES: 'khata_parties',
};

function safeGet(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function authFetch(url, options = {}) {
  const user = safeGet(KEYS.USER);
  const headers = { ...options.headers };
  if (user && user.id) {
    headers['x-user-id'] = user.id;
  }
  return fetch(url, { ...options, headers });
}

// ========== USER / AUTH ==========
export const UserStore = {
  get() {
    return safeGet(KEYS.USER);
  },

  save(userData) {
    if (!userData.id) {
      console.error('CRITICAL: Attempted to save user without a server ID!', userData);
    }
    const user = {
      id: userData.id, // STICK TO SERVER ID
      name: userData.name || 'New User',
      phone: userData.phone,
      email: userData.email || '',
      businessName: userData.businessName || '',
      createdAt: userData.createdAt || new Date().toISOString(),
    };
    console.log('SYNC SUCCESS: Saving Server ID to localStorage:', user.id);
    safeSet(KEYS.USER, user);
    return user;
  },

  isLoggedIn() {
    return !!safeGet(KEYS.USER);
  },

  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.USER);
  },
};

// ========== PRODUCTS / INVENTORY ==========
export const ProductStore = {
  async getAll() {
    try {
      const res = await authFetch('/api/inventory');
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },

  async getById(id) {
    try {
      const res = await authFetch(`/api/inventory/${id}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async add(product) {
    try {
      const res = await authFetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async addBulk(productsArray) {
    try {
      const res = await authFetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productsArray)
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async update(id, updates) {
    try {
      const res = await authFetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async delete(id) {
    try {
      await authFetch(`/api/inventory/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  },

  search(query) {
    return this.getAll().then(products => {
      const q = query.toLowerCase();
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    });
  },

  getByCategory(category) {
    return this.getAll().then(products => products.filter((p) => p.category === category));
  },

  getLowStock() {
    return this.getAll().then(products => products.filter((p) => p.quantity <= p.lowStockThreshold));
  },

  async getTotalValue() {
    const products = await this.getAll();
    return products.reduce((sum, p) => sum + p.quantity * p.buyPrice, 0);
  },

  async getTotalItems() {
    const products = await this.getAll();
    return products.length;
  },
};

// ========== PARTIES ==========
export const PartyStore = {
  async getAll() {
    try {
      const res = await authFetch('/api/parties');
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },

  async getById(id) {
    try {
      const res = await authFetch(`/api/parties/${id}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async add(party) {
    try {
      const res = await authFetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party)
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async update(id, updates) {
    try {
      const res = await authFetch(`/api/parties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async delete(id) {
    try {
      await authFetch(`/api/parties/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }
};

// ========== TRANSACTIONS ==========
export const TransactionStore = {
  async getAll() {
    try {
      const res = await authFetch('/api/transactions');
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },

  async add(transaction) {
    try {
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to add transaction');
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async getRecent(count = 10) {
    const all = await this.getAll();
    return all.slice(0, count);
  },

  async getTodayTotal() {
    const today = new Date().toDateString();
    const all = await this.getAll();
    return all
      .filter((t) => new Date(t.date).toDateString() === today)
      .reduce((sum, t) => {
        if (t.type === 'sale') return sum + t.amount;
        if (t.type === 'return') return sum - t.amount;
        return sum;
      }, 0);
  },

  async getMonthTotal() {
    const now = new Date();
    const all = await this.getAll();
    return all
      .filter((t) => {
        const d = new Date(t.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, t) => {
        if (t.type === 'sale') return sum + t.amount;
        if (t.type === 'return') return sum - t.amount;
        return sum;
      }, 0);
  },
};

// ========== CATEGORIES ==========
export const CATEGORIES = [
  'Grocery',
  'Dairy',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Cleaning',
  'Stationery',
  'Electronics',
  'Clothing',
  'Other',
];

export const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack', 'dozen', 'meter'];
