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

// ========== REQUEST CACHE ==========
const requestCache = new Map();
const inflightRequests = new Map();
const CACHE_TTL_MS = 15000; // 15s keeps navigation snappy without stale data for long
const MAX_CACHE_ENTRIES = 100;
const cacheVersions = {
  '/api/inventory': 0,
  '/api/parties': 0,
  '/api/transactions': 0,
};

function cacheKey(url) {
  const user = safeGet(KEYS.USER);
  return `${user?.id || 'anon'}:${url}`;
}

function setCacheEntry(key, data, ttlMs, version) {
  if (requestCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = requestCache.keys().next().value;
    if (oldestKey) requestCache.delete(oldestKey);
  }
  requestCache.set(key, { data, expiresAt: Date.now() + ttlMs, version });
}

function getVersion(url) {
  return cacheVersions[url] || 0;
}

async function cachedGet(url, ttlMs = CACHE_TTL_MS, options = {}) {
  const { forceFresh = false } = options;
  const key = cacheKey(url);
  const now = Date.now();
  const currentVersion = getVersion(url);
  const cached = requestCache.get(key);
  if (!forceFresh && cached && cached.expiresAt > now && cached.version === currentVersion) {
    return cached.data;
  }

  const inflightKey = `${key}|v${currentVersion}|fresh:${forceFresh ? 1 : 0}`;
  if (inflightRequests.has(inflightKey)) {
    return inflightRequests.get(inflightKey);
  }

  const requestPromise = (async () => {
    try {
      const res = await authFetch(url);
      const data = res.ok ? await res.json() : (url.includes('/api/') ? [] : null);
      setCacheEntry(key, data, ttlMs, currentVersion);
      return data;
    } finally {
      inflightRequests.delete(inflightKey);
    }
  })();

  inflightRequests.set(inflightKey, requestPromise);
  return requestPromise;
}

function invalidateCache(urlPrefix) {
  if (cacheVersions[urlPrefix] !== undefined) {
    cacheVersions[urlPrefix] += 1;
  }
  const keyPrefix = `${safeGet(KEYS.USER)?.id || 'anon'}:${urlPrefix}`;
  for (const key of requestCache.keys()) {
    if (key.startsWith(keyPrefix)) requestCache.delete(key);
  }
  for (const key of inflightRequests.keys()) {
    if (key.startsWith(keyPrefix)) inflightRequests.delete(key);
  }
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
      username: userData.username || '',
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
    requestCache.clear();
    inflightRequests.clear();
  },

  async updateProfile(profileData) {
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const data = await res.json();
        return this.save(data.user);
      }
      return null;
    } catch (e) {
      console.error('Update profile error:', e);
      return null;
    }
  }
};

// ========== PRODUCTS / INVENTORY ==========
export const ProductStore = {
  async getAll() {
    try {
      return await cachedGet('/api/inventory');
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || 'Could not save product', status: res.status };
      }
      const created = await res.json();
      invalidateCache('/api/inventory');
      return { success: true, data: created };
    } catch {
      return { success: false, error: 'Network error while saving product' };
    }
  },

  async addBulk(productsArray) {
    try {
      const res = await authFetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productsArray)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || 'Could not save bulk products', status: res.status };
      }
      const result = await res.json();
      invalidateCache('/api/inventory');
      return { success: true, data: result };
    } catch {
      return { success: false, error: 'Network error while saving bulk products' };
    }
  },

  async update(id, updates) {
    try {
      const res = await authFetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) return null;
      const updated = await res.json();
      invalidateCache('/api/inventory');
      return updated;
    } catch {
      return null;
    }
  },

  async delete(id) {
    try {
      await authFetch(`/api/inventory/${id}`, { method: 'DELETE' });
      invalidateCache('/api/inventory');
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
      return await cachedGet('/api/parties');
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
      if (!res.ok) return null;
      const created = await res.json();
      invalidateCache('/api/parties');
      return created;
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
      if (!res.ok) return null;
      const updated = await res.json();
      invalidateCache('/api/parties');
      return updated;
    } catch {
      return null;
    }
  },

  async delete(id) {
    try {
      await authFetch(`/api/parties/${id}`, { method: 'DELETE' });
      invalidateCache('/api/parties');
    } catch (e) {
      console.error(e);
    }
  }
};

// ========== TRANSACTIONS ==========
export const TransactionStore = {
  async getAll() {
    try {
      // Transactions drive balances/ledger; always read fresh for strict consistency.
      return await cachedGet('/api/transactions', CACHE_TTL_MS, { forceFresh: true });
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
      invalidateCache('/api/transactions');
      invalidateCache('/api/inventory');
      invalidateCache('/api/parties');
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
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 29);
    const all = await this.getAll();
    return all
      .filter((t) => {
        const d = new Date(t.date);
        return d >= start;
      })
      .reduce((sum, t) => {
        if (t.type === 'sale') return sum + t.amount;
        if (t.type === 'return') return sum - t.amount;
        return sum;
      }, 0);
  },

  async getDailyStats(days = 7, endDate = new Date()) {
    const all = await this.getAll();
    const stats = [];
    const today = new Date(endDate);
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      
      const dayTxns = all.filter(t => new Date(t.date).toDateString() === dateStr && t.type === 'sale');
      
      let totalSale = 0;
      let totalProfit = 0;
      let itemsSold = 0;

      dayTxns.forEach(t => {
        totalSale += t.amount;
        if (t.items) {
          t.items.forEach(item => {
            itemsSold += item.quantity;
            const buyPrice = item.buyPrice || (item.product ? item.product.buyPrice : 0);
            totalProfit += (item.price - buyPrice) * item.quantity;
          });
        }
      });

      stats.push({
        dateStr: dateStr,
        label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        totalSale,
        totalProfit,
        itemsSold
      });
    }
    return stats;
  },

  async getMonthStats(targetYear, targetMonth) {
    const all = await this.getAll();
    const now = new Date();
    const year = targetYear !== undefined ? targetYear : now.getFullYear();
    const month = targetMonth !== undefined ? targetMonth : now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const stats = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      dateStr: new Date(year, month, i + 1).toDateString(),
      totalSale: 0,
      totalProfit: 0,
      itemsSold: 0,
    }));

    all.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const idx = d.getDate() - 1;
        if (t.type === 'sale') {
          stats[idx].totalSale += t.amount;
          (t.items || []).forEach(item => {
            stats[idx].itemsSold += item.quantity;
            const buyPrice = item.buyPrice || (item.product ? item.product.buyPrice : 0);
            stats[idx].totalProfit += (item.price - buyPrice) * item.quantity;
          });
        }
      }
    });

    return stats;
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
