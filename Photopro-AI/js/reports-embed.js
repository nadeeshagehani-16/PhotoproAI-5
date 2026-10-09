// ── Reports & Analytics (embedded) ─────────────────────────────────────────
// Replaces the separate Reports & Analytics page: a live report section is
// auto-mounted at the bottom of every data page (KPIs + chart + PDF/CSV
// download), fed from that page's own module API. One shared component for
// all modules; the section only appears on pages listed in REGISTRY below.
(function () {
  'use strict';

  const GOLD = '#D4AF37';
  const PALETTE = ['#D4AF37', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

  // ── small helpers ──
  const kpi = (label, value, icon) => ({ label, value, icon });
  const doughnut = (label, labels, data) => ({ type: 'doughnut', label, labels, data });
  const bar = (label, labels, data, money, xTitle, yTitle) => ({ type: 'bar', label, labels, data, money: !!money, xTitle: xTitle, yTitle: yTitle });
  const line = (label, labels, data, money, xTitle, yTitle) => ({ type: 'line', label, labels, data, money: !!money, xTitle: xTitle, yTitle: yTitle });

  function todayStr() {
    const t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  function fmtMoney(n) { return 'Rs. ' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  // matches on status OR availability so it works for equipment/studios too
  function byStatus(list, status) { return list.filter(x => (x.status || x.availability || '') === status).length; }
  function sumBy(list, fn) { return list.reduce((s, x) => s + (Number(fn(x)) || 0), 0); }
  function countBy(list, fn) { const m = {}; list.forEach(x => { const k = fn(x) || 'Other'; m[k] = (m[k] || 0) + 1; }); return m; }
  function dstr(v) {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function _name(list, id) {
    if (!id) return '—';
    const x = (list || []).find(i => String(i._id) === String(id));
    return x ? x.name : '—';
  }
  // ADDED BY TEAM - Professional PDF Reports: shared aggregate helpers used by both the
  // on-page section and the PDF builder so every chart shows real database values.
  function _cid(b) {
    const c = b && b.customerId; // populated as { _id, name, email } by the API
    return c ? String(c._id || c) : '';
  }
  // per-customer booking aggregates (same rule as the Clients page: cancelled excluded,
  // ServiceBooking.amount + StudioBooking.totalCost); stored Customer fields are dead
  function clientStats(service, studio) {
    const stats = {};
    const bump = (b, cost) => {
      if (!b || b.status === 'Cancelled') return;
      const k = _cid(b);
      if (!k) return;
      const s = stats[k] || (stats[k] = { bookings: 0, spent: 0 });
      s.bookings += 1;
      s.spent += Number(cost) || 0;
    };
    (service || []).forEach(b => bump(b, b.amount));
    (studio || []).forEach(b => bump(b, b.totalCost));
    return stats;
  }
  // per-photographer assignment stats from service bookings (Photographer.projects
  // and .rating are never written, so bookings are the real performance source)
  function phStats(photographers, bookings) {
    const counts = {}, revenue = {};
    (bookings || []).forEach(b => {
      if (!b || b.status === 'Cancelled') return;
      const p = b.photographerId; // populated as { _id, name } in list responses
      const k = p ? String(typeof p === 'object' ? (p._id || '') : p) : '';
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
      revenue[k] = (revenue[k] || 0) + (Number(b.amount) || 0);
    });
    return { counts: counts, revenue: revenue };
  }
  const _MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function _monLabel(key) {
    const p = String(key).split('-');
    return _MON[(Number(p[1]) || 1) - 1] + ' ' + p[0];
  }
  // ascending month buckets from a real date field; optional valFn sums (e.g. revenue)
  function monthBuckets(items, dateFn, valFn) {
    const m = {};
    (items || []).forEach(x => {
      const d = new Date(dateFn(x));
      if (isNaN(d.getTime())) return;
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      m[k] = (m[k] || 0) + (valFn ? (Number(valFn(x)) || 0) : 1);
    });
    return Object.keys(m).sort().map(k => ({ label: _monLabel(k), value: m[k] }));
  }
  // collect the real dates a report covers (transaction pages only)
  async function fetchLists() {
    const results = await Promise.all(Array.prototype.slice.call(arguments).map(p => api.get(p)));
    return results.map(r => (r && r.data) || []);
  }

  // ── page registry: one config per data page ──
  const REGISTRY = {

    // Member 1 — Clients & Users
    clients: {
      title: 'Clients',
      reportTitle: 'Customer Analytics Report',
      // ADDED BY TEAM - Professional PDF Reports: fetch the booking collections alongside
      // the client list and derive per-client aggregates live (Customer.bookings/spent
      // are never written by any form — same rule as the Clients page stats).
      periodDates: d => (d.service || []).concat(d.studio || []).map(b => b.date),
      fetch: () => fetchLists('/customers', '/service-bookings', '/studio-bookings').then(([customers, service, studio]) => ({ customers: customers, service: service, studio: studio })),
      compute(d) {
        const list = d.customers || [];
        const stats = clientStats(d.service || [], d.studio || []);
        const stat = c => stats[String(c._id)] || { bookings: 0, spent: 0 };
        const active = byStatus(list, 'Active');
        return {
          kpis: [
            kpi('Total Clients', String(list.length), 'users'),
            kpi('Active Clients', String(active), 'user-check'),
            kpi('Total Bookings', String(sumBy(list, c => stat(c).bookings)), 'calendar-days'),
            kpi('Lifetime Value', fmtMoney(sumBy(list, c => stat(c).spent)), 'wallet'),
          ],
          chart: doughnut('Clients by status', ['Active', 'Inactive'], [active, list.length - active]),
          table: { head: ['Client', 'Email', 'Status', 'Bookings', 'Spent'], rows: list.slice().sort((a, b) => stat(b).spent - stat(a).spent).slice(0, 8).map(c => [c.name, c.email || '—', c.status || '—', String(stat(c).bookings), fmtMoney(stat(c).spent)]) },
        };
      },
      charts(d) {
        const list = d.customers || [];
        const stats = clientStats(d.service || [], d.studio || []);
        const stat = c => stats[String(c._id)] || { bookings: 0, spent: 0 };
        const active = byStatus(list, 'Active');
        const joined = monthBuckets(list, c => c.createdAt);
        const top = list.slice().sort((a, b) => stat(b).bookings - stat(a).bookings).filter(c => stat(c).bookings > 0).slice(0, 8);
        return [
          doughnut('Clients by status', ['Active', 'Inactive'], [active, list.length - active]),
          bar('New clients by month', joined.map(b => b.label), joined.map(b => b.value), false, 'Month', 'New clients'),
          bar('Top clients by bookings', top.map(c => c.name), top.map(c => stat(c).bookings), false, 'Client', 'Bookings'),
        ];
      },
      insights(d) {
        const list = d.customers || [];
        if (!list.length) return [];
        const stats = clientStats(d.service || [], d.studio || []);
        const booked = list.filter(c => stats[String(c._id)] && stats[String(c._id)].bookings > 0).length;
        return [booked + ' of ' + list.length + ' clients have at least one active booking; ' + (list.length - booked) + ' have none yet.'];
      },
    },
    users: {
      title: 'Users',
      reportTitle: 'User Analytics Report',
      fetch: () => fetchLists('/users').then(([users]) => users),
      compute(list) {
        const roles = countBy(list, u => u.role);
        const counts = ['Admin', 'Staff', 'Customer'].map(r => roles[r] || 0);
        return {
          kpis: [
            kpi('Total Users', String(list.length), 'users'),
            kpi('Admins', String(counts[0]), 'shield'),
            kpi('Staff', String(counts[1]), 'id-card'),
            kpi('Customers', String(counts[2]), 'user'),
          ],
          chart: doughnut('Users by role', ['Admin', 'Staff', 'Customer'], counts),
          table: { head: ['Name', 'Role', 'Email', 'Active'], rows: list.slice(0, 8).map(u => [u.name, u.role || '—', u.email || '—', u.isActive === false ? 'No' : 'Yes']) },
        };
      },
      charts(list) {
        const roles = countBy(list, u => u.role);
        const active = list.filter(u => u.isActive !== false).length;
        return [
          doughnut('Users by role', ['Admin', 'Staff', 'Customer'], ['Admin', 'Staff', 'Customer'].map(r => roles[r] || 0)),
          doughnut('Account status', ['Active', 'Inactive'], [active, list.length - active]),
        ];
      },
    },

    // Member 2 — Equipment & Rentals
    equipment: {
      title: 'Equipment',
      reportTitle: 'Equipment Analytics Report',
      fetch: () => fetchLists('/equipment').then(([eq]) => eq),
      compute(list) {
        const avail = byStatus(list, 'Available'), rented = byStatus(list, 'Rented'), maint = byStatus(list, 'Under Maintenance');
        const value = sumBy(list, e => (e.purchasePrice != null && e.purchasePrice !== '') ? e.purchasePrice : e.pricePerDay);
        return {
          kpis: [
            kpi('Total Items', String(list.length), 'camera'),
            kpi('Available', String(avail), 'check-circle'),
            kpi('Rented / Maintenance', String(rented + maint), 'wrench'),
            kpi('Fleet Value', fmtMoney(value), 'banknote'),
          ],
          chart: doughnut('Equipment availability', ['Available', 'Rented', 'Under Maintenance'], [avail, rented, maint]),
          table: { head: ['Equipment', 'Category', 'Condition', 'Per Day', 'Availability'], rows: list.slice(0, 8).map(e => [e.name, e.category || '—', e.condition || '—', fmtMoney(e.pricePerDay), e.availability || '—']) },
        };
      },
      charts(list) {
        const avail = byStatus(list, 'Available'), rented = byStatus(list, 'Rented'), maint = byStatus(list, 'Under Maintenance');
        const cat = countBy(list, e => e.category);
        const cats = Object.keys(cat);
        return [
          doughnut('Equipment availability', ['Available', 'Rented', 'Under Maintenance'], [avail, rented, maint]),
          bar('Items by category', cats, cats.map(c => cat[c])),
        ];
      },
    },
    rentals: {
      title: 'Rentals',
      reportTitle: 'Rental Analytics Report',
      periodDates: d => (d.rentals || []).map(r => r.startDate),
      fetch: () => fetchLists('/rentals', '/customers', '/equipment').then(([rentals, customers, equipment]) => ({ rentals, customers, equipment })),
      compute(d) {
        const list = d.rentals;
        const cname = id => _name(d.customers, id);
        const ename = id => _name(d.equipment, id);
        return {
          kpis: [
            kpi('Total Rentals', String(list.length), 'package'),
            kpi('Active', String(byStatus(list, 'Active')), 'play'),
            kpi('Overdue', String(byStatus(list, 'Overdue')), 'alarm-clock'),
            kpi('Revenue', fmtMoney(sumBy(list, r => r.totalCost)), 'banknote'),
          ],
          chart: doughnut('Rentals by status', ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'], ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'].map(s => byStatus(list, s))),
          table: { head: ['Customer', 'Equipment', 'Start', 'End', 'Cost', 'Status'], rows: list.slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 8).map(r => [cname(r.customerId), ename(r.equipmentId), dstr(r.startDate), dstr(r.endDate), fmtMoney(r.totalCost), r.status || '—']) },
        };
      },
      charts(d) {
        const list = d.rentals || [];
        const buckets = monthBuckets(list.filter(r => r.status !== 'Cancelled'), r => r.startDate, r => r.totalCost);
        return [
          doughnut('Rentals by status', ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'], ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'].map(s => byStatus(list, s))),
          (buckets.length >= 2 ? line : bar)('Rental revenue by month (Rs.)', buckets.map(b => b.label), buckets.map(b => b.value), true, 'Month', 'Revenue (Rs.)'),
        ];
      },
    },

    // Member 3 — Packages, Photographers (team) & Service Bookings (bookings)
    packages: {
      title: 'Packages',
      reportTitle: 'Package Analytics Report',
      fetch: () => fetchLists('/packages').then(([pk]) => pk),
      compute(list) {
        const prices = list.map(p => Number(p.price) || 0);
        const active = list.filter(p => p.isActive !== false).length;
        const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        return {
          kpis: [
            kpi('Total Packages', String(list.length), 'package'),
            kpi('Active', String(active), 'check-circle'),
            kpi('Average Price', fmtMoney(avg), 'tag'),
            kpi('Top Price', fmtMoney(prices.length ? Math.max.apply(null, prices) : 0), 'trending-up'),
          ],
          chart: bar('Package price (Rs.)', list.slice(0, 8).map(p => p.name), prices.slice(0, 8)),
          table: { head: ['Package', 'Price', 'Status'], rows: list.slice(0, 8).map(p => [p.name, fmtMoney(p.price), p.isActive !== false ? 'Active' : 'Inactive']) },
        };
      },
      charts(list) {
        const prices = list.map(p => Number(p.price) || 0);
        const active = list.filter(p => p.isActive !== false).length;
        return [
          bar('Package price (Rs.)', list.slice(0, 8).map(p => p.name), prices.slice(0, 8), true, 'Package', 'Price (Rs.)'),
          doughnut('Packages by status', ['Active', 'Inactive'], [active, list.length - active]),
        ];
      },
    },
    team: {
      title: 'Photographers',
      reportTitle: 'Staff Performance Report',
      // ADDED BY TEAM - Live Photographer Stats: the model's projects/rating fields are
      // never written by any form (always 0), so the report computes real assignment
      // stats from service bookings instead (shared phStats helper).
      periodDates: d => (d.bookings || []).map(b => b.date),
      fetch: () => fetchLists('/photographers', '/service-bookings').then(([ph, bookings]) => ({ ph, bookings })),
      compute(d) {
        const list = d.ph;
        const s = phStats(list, d.bookings);
        const bcount = id => s.counts[String(id)] || 0;
        const brev = id => s.revenue[String(id)] || 0;
        const totalBookings = list.reduce((t, p) => t + bcount(p._id), 0);
        const totalRevenue = list.reduce((t, p) => t + brev(p._id), 0);
        const top = list.slice().sort((a, b) => bcount(b._id) - bcount(a._id)).slice(0, 8);
        return {
          kpis: [
            kpi('Photographers', String(list.length), 'camera'),
            kpi('Active', String(byStatus(list, 'Active')), 'check-circle'),
            kpi('Total Assignments', String(totalBookings), 'calendar-check'),
            kpi('Assigned Revenue', fmtMoney(totalRevenue), 'banknote'),
          ],
          chart: bar('Bookings by photographer', top.map(p => p.name), top.map(p => bcount(p._id))),
          table: { head: ['Name', 'Specialization', 'Bookings', 'Revenue'], rows: top.map(p => [p.name, p.specialization || '—', String(bcount(p._id)), fmtMoney(brev(p._id))]) },
        };
      },
      charts(d) {
        const s = phStats(d.ph, d.bookings);
        const top = d.ph.slice().sort((a, b) => (s.counts[String(b._id)] || 0) - (s.counts[String(a._id)] || 0)).slice(0, 8);
        return [
          bar('Bookings by photographer', top.map(p => p.name), top.map(p => s.counts[String(p._id)] || 0), false, 'Photographer', 'Bookings'),
          bar('Assigned revenue by photographer (Rs.)', top.map(p => p.name), top.map(p => s.revenue[String(p._id)] || 0), true, 'Photographer', 'Revenue (Rs.)'),
        ];
      },
      insights(d) {
        const s = phStats(d.ph, d.bookings);
        const top = d.ph.slice().sort((a, b) => (s.counts[String(b._id)] || 0) - (s.counts[String(a._id)] || 0))[0];
        if (!top || !s.counts[String(top._id)]) return [];
        return ['Top performer: ' + top.name + ' with ' + s.counts[String(top._id)] + ' booking(s) worth ' + fmtMoney(s.revenue[String(top._id)]) + '.'];
      },
    },
    bookings: {
      title: 'Service Bookings',
      reportTitle: 'Booking Analytics Report',
      periodDates: d => (d.bookings || []).map(b => b.date),
      fetch: () => fetchLists('/service-bookings', '/customers').then(([bookings, customers]) => ({ bookings, customers })),
      compute(d) {
        const list = d.bookings;
        const done = byStatus(list, 'Completed');
        const rev = sumBy(list.filter(b => b.status !== 'Cancelled'), b => b.amount);
        return {
          kpis: [
            kpi('Total Bookings', String(list.length), 'calendar-check'),
            kpi('Pending / Confirmed', String(byStatus(list, 'Pending') + byStatus(list, 'Confirmed')), 'clock'),
            kpi('Completed', String(done), 'check-circle'),
            kpi('Revenue', fmtMoney(rev), 'banknote'),
          ],
          chart: doughnut('Bookings by status', ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'], ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(s => byStatus(list, s))),
          table: { head: ['Client', 'Event', 'Date', 'Amount', 'Status'], rows: list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(b => [_name(d.customers, b.customerId), b.event || '—', dstr(b.date), fmtMoney(b.amount), b.status || '—']) },
        };
      },
      pdfKpis(d) {
        const list = d.bookings || [];
        const rev = sumBy(list.filter(b => b.status !== 'Cancelled'), b => b.amount);
        return [
          kpi('Total Bookings', String(list.length), ''),
          kpi('Confirmed', String(byStatus(list, 'Confirmed')), ''),
          kpi('Pending', String(byStatus(list, 'Pending')), ''),
          kpi('Cancelled', String(byStatus(list, 'Cancelled')), ''),
          kpi('Completed', String(byStatus(list, 'Completed')), ''),
          kpi('Revenue (non-cancelled)', fmtMoney(rev), ''),
        ];
      },
      charts(d) {
        const list = d.bookings || [];
        const counts = monthBuckets(list, b => b.date);
        const revs = monthBuckets(list.filter(b => b.status !== 'Cancelled'), b => b.date, b => b.amount);
        return [
          doughnut('Bookings by status', ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'], ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(s => byStatus(list, s))),
          bar('Bookings by month', counts.map(b => b.label), counts.map(b => b.value), false, 'Month', 'Bookings'),
          (revs.length >= 2 ? line : bar)('Booking revenue trend (Rs.)', revs.map(b => b.label), revs.map(b => b.value), true, 'Month', 'Revenue (Rs.)'),
        ];
      },
      insights(d) {
        const list = d.bookings || [];
        const out = [];
        const pend = byStatus(list, 'Pending');
        if (pend) out.push(pend + ' booking(s) still Pending — confirmation or payment may need follow-up.');
        return out;
      },
    },

    // Member 4 — Payments & Invoices / Deposits
    invoices: {
      title: 'Payments & Invoices',
      reportTitle: 'Revenue Report',
      periodDates: d => (d.payments || []).map(p => p.date || p.createdAt),
      fetch: () => fetchLists('/payments', '/customers').then(([payments, customers]) => ({ payments, customers })),
      compute(d) {
        const list = d.payments;
        const completed = list.filter(p => p.status === 'Completed');
        const revenue = sumBy(completed, p => p.amount);
        const pending = sumBy(list.filter(p => p.status === 'Pending'), p => p.amount);
        const failed = byStatus(list, 'Failed') + byStatus(list, 'Refunded');
        const byMethod = {};
        completed.forEach(p => { const k = p.method || 'Other'; byMethod[k] = (byMethod[k] || 0) + (Number(p.amount) || 0); });
        const methods = Object.keys(byMethod);
        return {
          kpis: [
            kpi('Transactions', String(list.length), 'receipt'),
            kpi('Completed Revenue', fmtMoney(revenue), 'banknote'),
            kpi('Pending Amount', fmtMoney(pending), 'clock'),
            kpi('Failed / Refunded', String(failed), 'alert-triangle'),
          ],
          chart: bar('Completed revenue by method (Rs.)', methods, methods.map(m => byMethod[m])),
          table: { head: ['Client', 'Amount', 'Method', 'Status', 'Date'], rows: list.slice().sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 8).map(p => [_name(d.customers, p.customerId), fmtMoney(p.amount), p.method || '—', p.status || '—', dstr(p.date)]) },
        };
      },
      charts(d) {
        const list = d.payments || [];
        const completed = list.filter(p => p.status === 'Completed');
        const byMethod = {};
        completed.forEach(p => { const k = p.method || 'Other'; byMethod[k] = (byMethod[k] || 0) + (Number(p.amount) || 0); });
        const methods = Object.keys(byMethod);
        const revs = monthBuckets(completed, p => p.date || p.createdAt, p => p.amount);
        return [
          doughnut('Payments by status', ['Pending', 'Completed', 'Failed', 'Refunded'], ['Pending', 'Completed', 'Failed', 'Refunded'].map(s => byStatus(list, s))),
          bar('Completed revenue by method (Rs.)', methods, methods.map(m => byMethod[m]), true, 'Payment method', 'Revenue (Rs.)'),
          (revs.length >= 2 ? line : bar)('Completed revenue trend (Rs.)', revs.map(b => b.label), revs.map(b => b.value), true, 'Month', 'Revenue (Rs.)'),
        ];
      },
      insights(d) {
        const list = d.payments || [];
        const completed = list.filter(p => p.status === 'Completed');
        const pending = sumBy(list.filter(p => p.status === 'Pending'), p => p.amount);
        const out = [];
        if (pending) out.push(fmtMoney(pending) + ' is still outstanding across pending payments.');
        if (completed.length) out.push('Average completed payment: ' + fmtMoney(sumBy(completed, p => p.amount) / completed.length) + ' across ' + completed.length + ' transaction(s).');
        return out;
      },
    },
    deposits: {
      title: 'Deposits',
      reportTitle: 'Deposit Analytics Report',
      periodDates: d => (d.deposits || []).map(x => x.createdAt),
      fetch: () => fetchLists('/deposits', '/customers').then(([deposits, customers]) => ({ deposits, customers })),
      compute(d) {
        const list = d.deposits;
        const held = sumBy(list.filter(x => x.status === 'Held'), x => x.amount);
        const refunded = sumBy(list.filter(x => x.status === 'Refunded'), x => (x.refundAmount != null && x.refundAmount !== '') ? x.refundAmount : x.amount);
        const forfeited = sumBy(list.filter(x => x.status === 'Forfeited'), x => x.amount);
        return {
          kpis: [
            kpi('Total Deposits', String(list.length), 'shield'),
            kpi('Held Amount', fmtMoney(held), 'lock'),
            kpi('Refunded', fmtMoney(refunded), 'undo-2'),
            kpi('Forfeited', fmtMoney(forfeited), 'alert-triangle'),
          ],
          chart: doughnut('Deposits by status', ['Held', 'Refunded', 'Forfeited'], [byStatus(list, 'Held'), byStatus(list, 'Refunded'), byStatus(list, 'Forfeited')]),
          table: { head: ['Client', 'Purpose', 'Amount', 'Method', 'Status'], rows: list.slice(-8).reverse().map(x => [_name(d.customers, x.customerId), x.purpose || '—', fmtMoney(x.amount), x.paymentMethod || '—', x.status || '—']) },
        };
      },
      charts(d) {
        const list = d.deposits || [];
        const held = sumBy(list.filter(x => x.status === 'Held'), x => x.amount);
        const refunded = sumBy(list.filter(x => x.status === 'Refunded'), x => (x.refundAmount != null && x.refundAmount !== '') ? x.refundAmount : x.amount);
        const forfeited = sumBy(list.filter(x => x.status === 'Forfeited'), x => x.amount);
        return [
          doughnut('Deposits by status', ['Held', 'Refunded', 'Forfeited'], [byStatus(list, 'Held'), byStatus(list, 'Refunded'), byStatus(list, 'Forfeited')]),
          bar('Deposit amount by status (Rs.)', ['Held', 'Refunded', 'Forfeited'], [held, refunded, forfeited], true, 'Status', 'Amount (Rs.)'),
        ];
      },
      insights(d) {
        const list = d.deposits || [];
        const held = sumBy(list.filter(x => x.status === 'Held'), x => x.amount);
        if (!held) return [];
        return [fmtMoney(held) + ' in deposits is currently held across ' + byStatus(list, 'Held') + ' record(s).'];
      },
    },

    // Member 5 — Studios & Studio Bookings
    studios: {
      title: 'Studios',
      reportTitle: 'Studio Analytics Report',
      fetch: () => fetchLists('/studios').then(([st]) => st),
      compute(list) {
        const avail = byStatus(list, 'Available'), booked = byStatus(list, 'Booked'), maint = byStatus(list, 'Under Maintenance');
        const rates = list.map(s => Number(s.pricePerHour) || 0);
        const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        return {
          kpis: [
            kpi('Total Studios', String(list.length), 'building'),
            kpi('Available', String(avail), 'check-circle'),
            kpi('Booked / Maintenance', String(booked + maint), 'clock'),
            kpi('Avg Hourly Rate', fmtMoney(avgRate), 'banknote'),
          ],
          chart: doughnut('Studio availability', ['Available', 'Booked', 'Under Maintenance'], [avail, booked, maint]),
          table: { head: ['Studio', 'Location', 'Capacity', 'Per Hour', 'Availability'], rows: list.slice(0, 8).map(s => [s.name, s.location || '—', String(s.capacity || 0), fmtMoney(s.pricePerHour), s.availability || '—']) },
        };
      },
      charts(list) {
        const avail = byStatus(list, 'Available'), booked = byStatus(list, 'Booked'), maint = byStatus(list, 'Under Maintenance');
        const top = list.slice().sort((a, b) => (Number(b.pricePerHour) || 0) - (Number(a.pricePerHour) || 0)).slice(0, 8);
        return [
          doughnut('Studio availability', ['Available', 'Booked', 'Under Maintenance'], [avail, booked, maint]),
          bar('Hourly rate by studio (Rs.)', top.map(s => s.name), top.map(s => Number(s.pricePerHour) || 0), true, 'Studio', 'Hourly rate (Rs.)'),
        ];
      },
    },
    'studio-bookings': {
      title: 'Studio Bookings',
      reportTitle: 'Studio Booking Analytics Report',
      periodDates: d => (d.bookings || []).map(b => b.date),
      fetch: () => fetchLists('/studio-bookings', '/studios', '/customers').then(([bookings, studios, customers]) => ({ bookings, studios, customers })),
      compute(d) {
        const list = d.bookings;
        const rev = sumBy(list.filter(b => b.status !== 'Cancelled'), b => b.totalCost);
        return {
          kpis: [
            kpi('Total Bookings', String(list.length), 'calendar-check'),
            kpi('Pending / Confirmed', String(byStatus(list, 'Pending') + byStatus(list, 'Confirmed')), 'clock'),
            kpi('Completed', String(byStatus(list, 'Completed')), 'check-circle'),
            kpi('Revenue', fmtMoney(rev), 'banknote'),
          ],
          chart: doughnut('Bookings by status', ['Pending', 'Confirmed', 'Completed', 'Cancelled'], ['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => byStatus(list, s))),
          table: { head: ['Studio', 'Client', 'Date', 'Cost', 'Status'], rows: list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(b => [_name(d.studios, b.studioId), _name(d.customers, b.customerId), dstr(b.date), fmtMoney(b.totalCost), b.status || '—']) },
        };
      },
      pdfKpis(d) {
        const list = d.bookings || [];
        const rev = sumBy(list.filter(b => b.status !== 'Cancelled'), b => b.totalCost);
        return [
          kpi('Total Bookings', String(list.length), ''),
          kpi('Confirmed', String(byStatus(list, 'Confirmed')), ''),
          kpi('Pending', String(byStatus(list, 'Pending')), ''),
          kpi('Cancelled', String(byStatus(list, 'Cancelled')), ''),
          kpi('Completed', String(byStatus(list, 'Completed')), ''),
          kpi('Revenue (non-cancelled)', fmtMoney(rev), ''),
        ];
      },
      charts(d) {
        const list = d.bookings || [];
        const counts = monthBuckets(list, b => b.date);
        const revs = monthBuckets(list.filter(b => b.status !== 'Cancelled'), b => b.date, b => b.totalCost);
        return [
          doughnut('Bookings by status', ['Pending', 'Confirmed', 'Completed', 'Cancelled'], ['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => byStatus(list, s))),
          bar('Bookings by month', counts.map(b => b.label), counts.map(b => b.value), false, 'Month', 'Bookings'),
          (revs.length >= 2 ? line : bar)('Studio revenue trend (Rs.)', revs.map(b => b.label), revs.map(b => b.value), true, 'Month', 'Revenue (Rs.)'),
        ];
      },
      insights(d) {
        const list = d.bookings || [];
        const out = [];
        const pend = byStatus(list, 'Pending');
        if (pend) out.push(pend + ' studio booking(s) still Pending — confirmation may need follow-up.');
        return out;
      },
    },
  };

  // ── state ──
  const cache = {};    // page -> { at, data, raw } (60s TTL so in-page re-renders don't refetch)
  const lastData = {}; // page -> last computed data (used by PDF/CSV export)
  const lastRaw = {};  // page -> last raw fetched payload (used by the PDF report builder)
  let _deb = null;

  function isDemo() {
    try {
      const t = api && api.getToken && api.getToken();
      return !t || (typeof t === 'string' && t.indexOf('.demo') !== -1);
    } catch (e) { return true; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _toast(msg) {
    try {
      if (typeof showToast === 'function') showToast(msg);
      else if (typeof toast === 'function') toast(msg);
    } catch (e) { /* no-op */ }
  }

  // ── rendering ──
  function sectionShell(page, cfg) {
    const host = document.createElement('div');
    host.id = 'page-reports';
    host.className = 'mt-10';
    host.innerHTML =
      '<div class="flex items-end justify-between flex-wrap gap-3 mb-4">' +
        '<div>' +
          '<h2 class="text-xl font-bold text-gray-900 flex items-center gap-2"><i data-lucide="bar-chart-3" class="w-5 h-5" style="color:#B8960F"></i>Reports &amp; Analytics</h2>' +
          '<p class="text-xs text-gray-400 mt-1">' + esc(cfg.reportTitle || cfg.title) + ' · live module report · ' + todayStr() + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<button onclick="PageReports.exportPDF(\'' + page + '\')" class="btn-gold px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i>Download PDF</button>' +
          '<button onclick="PageReports.exportCSV(\'' + page + '\')" class="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i>CSV</button>' +
        '</div>' +
      '</div>' +
      '<div id="page-reports-body" class="text-sm text-gray-400">Loading module data…</div>';
    return host;
  }

  function kpiCard(k) {
    return '<div class="kpi-card flex items-center gap-3">' +
      '<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:#FBF6E3"><i data-lucide="' + k.icon + '" class="w-5 h-5" style="color:#B8960F"></i></div>' +
      '<div class="min-w-0"><p class="text-xs text-gray-400">' + esc(k.label) + '</p><p class="text-lg font-bold text-gray-900 truncate">' + esc(k.value) + '</p></div>' +
    '</div>';
  }

  function chartConfig(data) {
    const c = data.chart;
    if (c.type === 'doughnut') {
      // ADDED BY TEAM - Chart Sizing: doughnut charts default to a full-width square
      // (aspectRatio 1); maintainAspectRatio:false makes the pie fill the compact
      // fixed-height wrapper rendered by renderBody instead of the whole card width.
      return { type: 'doughnut', data: { labels: c.labels, datasets: [{ data: c.data, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#ffffff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }, cutout: '58%' } };
    }
    return { type: 'bar', data: { labels: c.labels, datasets: [{ label: c.label, data: c.data, backgroundColor: GOLD, borderRadius: 6, maxBarThickness: 42 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 }, maxRotation: 40, minRotation: 0 } } } } };
  }

  function drawChart(data) {
    if (typeof createChart !== 'function' || typeof Chart === 'undefined') return;
    try { if (typeof chartInstances !== 'undefined' && chartInstances['page-reports-chart']) chartInstances['page-reports-chart'].destroy(); } catch (e) { /* ignore */ }
    createChart('page-reports-chart', chartConfig(data));
  }

  function renderBody(page, cfg, data) {
    const body = document.getElementById('page-reports-body');
    if (!body) return;
    let tableHtml = '';
    if (data.table && data.table.rows.length) {
      tableHtml = '<p class="text-sm font-semibold text-gray-700 mb-3">Top entries</p><div class="overflow-x-auto"><table class="w-full text-xs text-left">' +
        '<thead><tr class="text-gray-400 border-b border-gray-100">' + data.table.head.map(h => '<th class="py-2 pr-3 font-medium">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
        data.table.rows.map(r => '<tr class="border-b border-gray-50">' + r.map(v => '<td class="py-2 pr-3 text-gray-600">' + esc(v) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>';
    }
    // ADDED BY TEAM - Chart Sizing: pie/doughnut charts render inside a compact
    // fixed-height wrapper (Chart.js fills the parent exactly when maintainAspectRatio
    // is false); bar charts keep their original full-width sizing.
    const isPie = data.chart && data.chart.type === 'doughnut';
    const chartCanvas = isPie
      ? '<div style="position:relative;height:220px"><canvas id="page-reports-chart"></canvas></div>'
      : '<canvas id="page-reports-chart" height="150"></canvas>';
    body.innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">' + data.kpis.map(kpiCard).join('') + '</div>' +
      '<div class="grid grid-cols-1 lg:grid-cols-5 gap-4">' +
        '<div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"><p class="text-sm font-semibold text-gray-700 mb-3">' + esc(data.chart.label) + '</p>' + chartCanvas + '</div>' +
        '<div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">' + (tableHtml || '<p class="text-xs text-gray-400">No rows to display.</p>') + '</div>' +
      '</div>';
    try { drawChart(data); } catch (e) { /* ignore */ }
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function renderNotice(kind, message, page) {
    const body = document.getElementById('page-reports-body');
    if (!body) return;
    const color = kind === 'demo' ? '#B45309' : '#B91C1C';
    const bg = kind === 'demo' ? '#FFFBEB' : '#FEF2F2';
    body.innerHTML = '<div class="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style="background:' + bg + ';border:1px solid ' + color + '22">' +
      '<span class="text-sm" style="color:' + color + '">' + esc(message) + '</span>' +
      (kind === 'error' ? '<button onclick="PageReports.retry(\'' + page + '\')" class="text-xs font-semibold underline">Retry</button>' : '') +
    '</div>';
  }

  // ── data loading ──
  async function load(page) {
    const cfg = REGISTRY[page];
    if (!cfg || !document.getElementById('page-reports')) return;
    if (isDemo()) { renderNotice('demo', 'Demo mode — sign in with a real account to see live analytics.', page); return; }
    const cached = cache[page];
    if (cached && Date.now() - cached.at < 60000) {
      lastData[page] = cached.data;
      lastRaw[page] = cached.raw;
      renderBody(page, cfg, cached.data);
      return;
    }
    const body = document.getElementById('page-reports-body');
    if (body) body.textContent = 'Loading module data…';
    try {
      const fetched = await cfg.fetch();
      if (!document.getElementById('page-reports')) return; // navigated away meanwhile
      const data = cfg.compute(fetched);
      cache[page] = { at: Date.now(), data: data, raw: fetched };
      lastData[page] = data;
      lastRaw[page] = fetched;
      renderBody(page, cfg, data);
    } catch (err) {
      if (!document.getElementById('page-reports')) return;
      renderNotice('error', 'Could not load live report data' + (err && err.message ? ': ' + err.message : '.'), page);
    }
  }

  function mount(page) {
    const cfg = REGISTRY[page];
    const content = document.getElementById('page-content');
    if (!cfg || !content || document.getElementById('page-reports')) return;
    content.appendChild(sectionShell(page, cfg));
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    load(page);
  }

  // ── auto-mount: fires whenever a page renders into #page-content ──
  function tick() {
    let page = null;
    try { page = (typeof currentPage !== 'undefined') ? currentPage : null; } catch (e) { page = null; }
    const existing = document.getElementById('page-reports');
    if (page && REGISTRY[page]) {
      if (!existing) mount(page);
    } else if (existing) {
      existing.remove();
    }
  }
  function schedule() { clearTimeout(_deb); _deb = setTimeout(tick, 350); }

  function boot() {
    const content = document.getElementById('page-content');
    if (!content || typeof MutationObserver === 'undefined') return;
    new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ── exports ──
  function fileName(cfg, ext) {
    return 'PhotoPro-' + cfg.title.replace(/&/g, 'and').replace(/[^A-Za-z0-9]+/g, '-') + '-Report_' + todayStr() + '.' + ext;
  }

  // ── professional PDF report engine ─────────────────────────────────────────
  // ADDED BY TEAM - Professional PDF Reports: one shared A4 engine for every module
  // report — branded header (system name + report title + generated date + reporting
  // period), KPI summary cards, a short insights summary and dynamically rendered
  // Chart.js charts (real data only, no data tables). Every page gets the footer
  // "PhotoPro AI | Photography Studio Management System" with "Page X of Y".
  const PDFP = {
    W: 210, H: 297, M: 15,
    TOP: 46,                 // first-page content start
    TOP_CONT: 32,            // continuation-page content start
    BOTTOM: 277,             // content must stay above this line
    FOOT_LINE: 283,          // thin separator above the footer text
    SYSTEM: 'PhotoPro AI \u2013 Photography Studio Management System',
    FOOTER: 'PhotoPro AI | Photography Studio Management System',
    GOLD: [212, 175, 55], GOLD_DARK: [184, 150, 15],
    DARK: [17, 17, 17], GRAY: [107, 114, 128], LIGHT: [229, 231, 235],
  };
  const _fill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
  const _stroke = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);
  const _text = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
  function sumArr(a) { return (a || []).reduce((s, v) => s + (Number(v) || 0), 0); }
  function _specEmpty(spec) {
    if (!spec || !spec.labels || !spec.labels.length) return true;
    return !(spec.data || []).some(v => Number(v) > 0);
  }
  // shrink a value's font until it fits the card width (never crop KPI values)
  function pdfFit(doc, s, maxW, size) {
    let fs = size || doc.getFontSize();
    while (fs > 6.5 && doc.getStringUnitWidth(s) * fs / doc.internal.scaleFactor > maxW) fs -= 0.5;
    doc.setFontSize(fs);
    return s;
  }
  // reporting-period line: real date span for transaction reports, otherwise "as at"
  function pdfPeriod(cfg, raw) {
    let dates = [];
    if (cfg && cfg.periodDates) {
      try { dates = (cfg.periodDates(raw) || []).map(v => new Date(v)).filter(d => !isNaN(d.getTime())); } catch (e) { dates = []; }
    }
    if (!dates.length) return 'All current records, as at ' + dstr(new Date());
    let min = dates[0], max = dates[0];
    dates.forEach(d => { if (d < min) min = d; if (d > max) max = d; });
    return min.getTime() === max.getTime() ? dstr(min) : dstr(min) + ' \u2013 ' + dstr(max);
  }
  function pdfHeader(doc, meta) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); _text(doc, PDFP.GRAY);
    doc.text(PDFP.SYSTEM, PDFP.M, 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); _text(doc, PDFP.DARK);
    doc.text(meta.title, PDFP.M, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); _text(doc, PDFP.GRAY);
    doc.text('Generated: ' + meta.generated + '   \u00b7   Reporting period: ' + meta.period, PDFP.M, 33);
    _stroke(doc, PDFP.GOLD); doc.setLineWidth(0.7);
    doc.line(PDFP.M, 38, PDFP.W - PDFP.M, 38);
    return PDFP.TOP;
  }
  function pdfContHeader(doc, meta) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); _text(doc, PDFP.GRAY);
    doc.text(PDFP.SYSTEM, PDFP.M, 15);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); _text(doc, PDFP.DARK);
    doc.text(meta.title, PDFP.M, 21.5);
    _stroke(doc, PDFP.LIGHT); doc.setLineWidth(0.4);
    doc.line(PDFP.M, 25, PDFP.W - PDFP.M, 25);
    return PDFP.TOP_CONT;
  }
  function pdfSubheading(doc, text, y) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); _text(doc, PDFP.DARK);
    doc.text(text, PDFP.M, y);
    return y + 6;
  }
  // clean KPI cards (4 per row) — replaces the old label:value text lines
  function pdfKpiGrid(doc, kpis, y) {
    if (!kpis || !kpis.length) return y;
    const gap = 4, w = (PDFP.W - 2 * PDFP.M - 3 * gap) / 4, h = 21;
    kpis.forEach((k, i) => {
      const x = PDFP.M + (i % 4) * (w + gap);
      const yy = y + Math.floor(i / 4) * (h + gap);
      _fill(doc, [250, 248, 240]);
      doc.roundedRect(x, yy, w, h, 2.5, 2.5, 'F');
      _fill(doc, PDFP.GOLD);
      doc.roundedRect(x, yy, 1.6, h, 0.8, 0.8, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); _text(doc, PDFP.GRAY);
      pdfFit(doc, String(k.label), w - 8, 7.5);
      doc.text(String(k.label), x + 4.5, yy + 7.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); _text(doc, PDFP.DARK);
      pdfFit(doc, String(k.value), w - 8, 11);
      doc.text(String(k.value), x + 4.5, yy + 15);
    });
    return y + Math.ceil(kpis.length / 4) * (h + gap) + 4;
  }
  // short factual insights derived from the same data as the charts
  function pdfInsights(doc, bullets, y) {
    if (!bullets || !bullets.length) return y;
    y = pdfSubheading(doc, 'Key Insights', y);
    doc.setFont('helvetica', 'normal');
    const lines = [];
    bullets.forEach((b, i) => {
      doc.setFontSize(9);
      doc.splitTextToSize('\u2022  ' + b, PDFP.W - 2 * PDFP.M - 12).forEach((w, j) => lines.push({ t: w, gap: i > 0 && j === 0 }));
    });
    const boxH = lines.length * 4.6 + bullets.length * 2.2 + 6;
    _fill(doc, [252, 250, 244]);
    doc.roundedRect(PDFP.M, y, PDFP.W - 2 * PDFP.M, boxH, 2.5, 2.5, 'F');
    _stroke(doc, [238, 232, 214]); doc.setLineWidth(0.3);
    doc.roundedRect(PDFP.M, y, PDFP.W - 2 * PDFP.M, boxH, 2.5, 2.5, 'S');
    let ly = y + 4.5;
    _text(doc, [75, 81, 92]); doc.setFontSize(9);
    lines.forEach(l => { if (l.gap) ly += 2.2; doc.text(l.t, PDFP.M + 4, ly); ly += 4.6; });
    return y + boxH + 4;
  }
  function autoInsights(specs) {
    const out = [];
    (specs || []).forEach(spec => {
      if (_specEmpty(spec)) return;
      const data = (spec.data || []).map(v => Number(v) || 0);
      let ti = 0; data.forEach((v, i) => { if (v > data[ti]) ti = i; });
      if (spec.type === 'doughnut') {
        const total = sumArr(data);
        out.push(spec.label + ': ' + spec.labels[ti] + ' makes up ' + Math.round(data[ti] / total * 100) + '% (' + data[ti] + ' of ' + total + ').');
      } else {
        const fmt = v => spec.money ? fmtMoney(v) : String(v);
        out.push(spec.label + ': total ' + fmt(sumArr(data)) + ', highest in ' + spec.labels[ti] + ' (' + fmt(data[ti]) + ').');
      }
    });
    return out;
  }
  // render one chart offscreen with Chart.js at print resolution and return its PNG
  function pdfPieLabels(spec) {
    if (spec.type !== 'doughnut') return spec.labels;
    const total = sumArr(spec.data);
    if (!total) return spec.labels;
    // legend entry explains each slice: name, actual count and share, e.g. "Active – 12 (60%)"
    return (spec.labels || []).map((l, i) => l + ' \u2013 ' + (Number(spec.data[i]) || 0) + ' (' + Math.round((Number(spec.data[i]) || 0) / total * 100) + '%)');
  }
  // compact chart number format: 2745000 -> "2.7M", 45000 -> "45K", 5 -> "5"
  function _compact(v) {
    v = Number(v) || 0;
    if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(v) >= 1000) return Math.round(v / 1000) + 'K';
    return String(Math.round(v));
  }
  function pdfChartCanvas(spec) {
    if (typeof Chart === 'undefined') return null;
    try {
      const wide = !!spec.wide || (spec.labels || []).length > 6;
      const w = wide ? 1500 : 1000, h = wide ? 540 : 600; // extra height leaves room for the axis titles
      // fonts are sized for the compact printed width (charts draw at CHART_SCALE of
      // their slot in exportPDF) — grid ~8pt / wide ~8.5pt when printed
      const fs = wide ? 30 : 38, lfs = wide ? 30 : 36;
      const afs = wide ? 25 : 30; // axis-title font
      const vfs = wide ? 26 : 32; // data-value label font
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      // print the exact value above every bar / on each point (skipped for crowded
      // long line series) so the numbers read without squinting at the axis
      const valueLabels = {
        id: 'pdfValueLabels',
        afterDatasetsDraw(chart) {
          if (spec.type === 'doughnut') return;
          if (spec.type === 'line' && (spec.labels || []).length > 8) return;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;
          const lctx = chart.ctx;
          const area = chart.chartArea;
          lctx.save();
          lctx.font = '700 ' + vfs + 'px Helvetica, Arial, sans-serif';
          lctx.textAlign = 'center';
          lctx.textBaseline = 'bottom';
          lctx.lineJoin = 'round';
          lctx.lineWidth = 6;
          lctx.strokeStyle = 'rgba(255,255,255,0.92)';
          lctx.fillStyle = '#374151';
          meta.data.forEach((el, i) => {
            const v = Number(spec.data[i]) || 0;
            if (!v || !el) return;
            const txt = spec.money ? _compact(v) : String(v);
            const tw = lctx.measureText(txt).width;
            let lx = el.x;
            // keep the label inside the plot area: a centred label on the first or
            // last data point would otherwise overlap the y-axis ticks (e.g. "2.7M"
            // sitting on top of "Rs. 3M") or get clipped at the chart edge
            if (area) {
              if (lx - tw / 2 < area.left) lx = area.left + tw / 2 + 2;
              if (lx + tw / 2 > area.right) lx = area.right - tw / 2 - 2;
            }
            // white halo keeps the number readable over gridlines and the series
            lctx.strokeText(txt, lx, el.y - 10);
            lctx.fillText(txt, lx, el.y - 10);
          });
          lctx.restore();
        }
      };
      // doughnut centre: bold total + "Total" caption inside the ring
      const centerTotal = {
        id: 'pdfCenterTotal',
        afterDraw(chart) {
          if (spec.type !== 'doughnut') return;
          const total = sumArr(spec.data);
          const meta = chart.getDatasetMeta(0);
          if (!total || !meta || !meta.data.length) return;
          const a = meta.data[0];
          const cctx = chart.ctx;
          cctx.save();
          cctx.textAlign = 'center';
          cctx.fillStyle = '#111111';
          cctx.font = '700 ' + Math.round(lfs * 1.3) + 'px Helvetica, Arial, sans-serif';
          cctx.fillText(String(total), a.x, a.y);
          cctx.fillStyle = '#6B7280';
          cctx.font = '400 ' + Math.round(lfs * 0.75) + 'px Helvetica, Arial, sans-serif';
          cctx.fillText('Total', a.x, a.y + Math.round(lfs * 0.9));
          cctx.restore();
        }
      };
      const dataset = {
        data: spec.data,
        backgroundColor: spec.type === 'doughnut' ? PALETTE : (spec.type === 'line' ? 'rgba(212,175,55,0.18)' : GOLD),
        borderColor: spec.type === 'doughnut' ? '#ffffff' : '#B8960F',
        borderWidth: spec.type === 'doughnut' ? 3 : (spec.type === 'line' ? 2.5 : 0),
        borderRadius: spec.type === 'bar' ? 8 : 0,
        maxBarThickness: wide ? 120 : 90,
        tension: 0.35, fill: spec.type === 'line', pointRadius: spec.type === 'line' ? 7 : 0,
        pointBackgroundColor: '#B8960F', pointBorderColor: '#ffffff', pointBorderWidth: 2,
      };
      const options = {
        responsive: false, animation: false,
        layout: { padding: { top: 14 } },
        cutout: spec.type === 'doughnut' ? '62%' : undefined,
        plugins: { legend: spec.type === 'doughnut' ? { position: 'bottom', labels: { boxWidth: 22, font: { size: lfs }, padding: 16 } } : { display: false } },
        // axis titles spell out what each axis measures (e.g. x "Month", y "Revenue (Rs.)");
        // ticks stay compact ("Rs. 2.5M") and integers for counts so nothing crowds
        scales: spec.type === 'doughnut' ? {} : {
          y: {
            beginAtZero: true, grace: '12%',
            title: { display: true, text: spec.yTitle || (spec.money ? 'Revenue (Rs.)' : 'Count'), font: { size: afs }, color: '#6B7280' },
            ticks: {
              font: { size: fs }, color: '#6B7280',
              precision: spec.money ? undefined : 0,
              callback: spec.money ? (v => 'Rs. ' + _compact(v)) : undefined,
            },
            grid: { color: '#E5E7EB', lineWidth: 1 },
            border: { color: '#E5E7EB' },
          },
          x: {
            title: { display: !!spec.xTitle, text: spec.xTitle || '', font: { size: afs }, color: '#6B7280', padding: 10 },
            ticks: { font: { size: fs }, color: '#6B7280', maxRotation: 45, minRotation: 0 },
            grid: { display: false },
            border: { color: '#E5E7EB' },
          },
        },
      };
      const chart = new Chart(c, { type: spec.type, data: { labels: pdfPieLabels(spec), datasets: [dataset] }, options: options, plugins: [valueLabels, centerTotal] });
      // paint onto white so the embedded PNG is opaque and print-safe
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(c, 0, 0);
      const url = out.toDataURL('image/png');
      try { chart.destroy(); } catch (e) { /* ignore */ }
      return { url: url, aspect: w / h };
    } catch (e) { return null; }
  }
  function pdfNoData(doc, x, y, w, h) {
    _fill(doc, [249, 250, 251]);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    _stroke(doc, PDFP.LIGHT); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); _text(doc, [156, 163, 175]);
    doc.text('No data available for the selected period.', x + w / 2, y + h / 2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }
  function pdfNotice(doc, text, y) {
    _fill(doc, [255, 251, 235]);
    doc.roundedRect(PDFP.M, y, PDFP.W - 2 * PDFP.M, 12, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); _text(doc, [180, 83, 9]);
    doc.text(text, PDFP.W / 2, y + 7.6, { align: 'center' });
    return y + 18;
  }
  function pdfFileName(cfg) {
    const slug = String(cfg.reportTitle || (cfg.title + ' Report')).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return 'PhotoPro_AI_' + slug + '.pdf';
  }

  function exportPDF(page) {
    const cfg = REGISTRY[page], data = lastData[page], raw = lastRaw[page];
    if (!cfg || !data) { _toast('Open the report section and let it load first.'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { _toast('PDF library is still loading — try again in a moment.'); return; }
    try {
      const meta = {
        title: cfg.reportTitle || (cfg.title + ' Report'),
        generated: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        period: pdfPeriod(cfg, raw),
      };
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const specs = (cfg.charts ? cfg.charts(raw) : (data.chart ? [data.chart] : [])) || [];
      let y = pdfHeader(doc, meta);
      // 1) visual summary — KPI cards (per-report set when defined, else the on-page 4)
      y = pdfSubheading(doc, 'Executive Summary', y);
      y = pdfKpiGrid(doc, (cfg.pdfKpis ? cfg.pdfKpis(raw) : null) || data.kpis || [], y);
      if (specs.length && specs.every(_specEmpty)) y = pdfNotice(doc, 'No data available for the selected period.', y);
      // 2) short insights from real values
      const bullets = [];
      if (cfg.insights) { try { (cfg.insights(raw) || []).forEach(b => bullets.push(b)); } catch (e) { /* ignore */ } }
      autoInsights(specs).forEach(b => { if (bullets.length < 6) bullets.push(b); });
      y = pdfInsights(doc, bullets.slice(0, 6), y + 2);
      // 3) charts (grid: two per row, time series full width) — no data tables.
      // compact sizing: every chart prints at CHART_SCALE of its slot width, centred
      // in the slot — still clearly smaller than a full slot, but with room for the
      // bigger value labels and axis text drawn by pdfChartCanvas
      const CHART_SCALE = 0.85;
      const colW = (PDFP.W - 2 * PDFP.M - 6) / 2;
      let col = 0, rowH = 0;
      const newPage = () => { doc.addPage(); y = pdfContHeader(doc, meta); col = 0; rowH = 0; };
      const drawBlock = (spec, img, x, yy, w, h) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); _text(doc, PDFP.DARK);
        doc.text(spec.label, x, yy + 4);
        if (img) { try { doc.addImage(img.url, 'PNG', x, yy + 7, w, h); } catch (e) { pdfNoData(doc, x, yy + 7, w, h); } }
        else pdfNoData(doc, x, yy + 7, w, h);
      };
      specs.forEach(spec => {
        const wide = !!spec.wide || (spec.labels || []).length > 6;
        const slotW = wide ? (PDFP.W - 2 * PDFP.M) : colW;
        const blockW = slotW * CHART_SCALE; // reduced printed width
        const off = (slotW - blockW) / 2;   // centred inside the slot
        const empty = _specEmpty(spec);
        const img = empty ? null : pdfChartCanvas(spec);
        const imgH = img ? blockW / img.aspect : 30;
        const blockH = 7 + imgH + 3;
        if (wide) {
          if (col === 1) { y += rowH + 8; col = 0; rowH = 0; }
          if (y + blockH > PDFP.BOTTOM) newPage();
          drawBlock(spec, img, PDFP.M + off, y, blockW, imgH);
          y += blockH + 6;
        } else if (col === 0) {
          if (y + blockH > PDFP.BOTTOM) newPage();
          rowH = blockH;
          drawBlock(spec, img, PDFP.M + off, y, blockW, imgH);
          col = 1;
        } else {
          if (y + blockH > PDFP.BOTTOM) {
            // the partner chart of this pair would cross the footer — finish the row
            // and start a fresh page for it instead of overlapping
            y += rowH + 8;
            if (y + blockH > PDFP.BOTTOM) newPage();
            rowH = blockH;
            drawBlock(spec, img, PDFP.M + off, y, blockW, imgH);
            col = 1;
          } else {
            drawBlock(spec, img, PDFP.M + colW + 6 + off, y, blockW, imgH);
            y += Math.max(rowH, blockH) + 6; col = 0; rowH = 0;
          }
        }
      });
      // 4) footer on every page (thin separator + branded line + Page X of Y)
      const pages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        _stroke(doc, [226, 226, 226]); doc.setLineWidth(0.3);
        doc.line(PDFP.M, PDFP.FOOT_LINE, PDFP.W - PDFP.M, PDFP.FOOT_LINE);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(PDFP.FOOTER, PDFP.M, PDFP.FOOT_LINE + 5);
        doc.text('Page ' + i + ' of ' + pages, PDFP.W - PDFP.M, PDFP.FOOT_LINE + 5, { align: 'right' });
      }
      doc.save(pdfFileName(cfg));
    } catch (e) { _toast('PDF export failed: ' + (e && e.message ? e.message : e)); }
  }

  function exportCSV(page) {
    const cfg = REGISTRY[page], data = lastData[page];
    if (!cfg || !data) { _toast('Open the report section and let it load first.'); return; }
    const rows = [];
    rows.push(['PhotoPro AI - ' + cfg.title + ' report']);
    rows.push(['Generated', new Date().toLocaleString()]);
    rows.push([]);
    (data.kpis || []).forEach(k => rows.push(['KPI', k.label, String(k.value)]));
    rows.push([]);
    if (data.chart) {
      rows.push(['Chart', data.chart.label]);
      (data.chart.labels || []).forEach((l, i) => rows.push([String(l), String((data.chart.data || [])[i])]));
      rows.push([]);
    }
    if (data.table && data.table.rows.length) {
      rows.push(data.table.head);
      data.table.rows.forEach(r => rows.push(r));
    }
    const csv = rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(cfg, 'csv');
    document.body.appendChild(a);
    a.click();
    a.remove();
    _toast('CSV downloaded.');
  }

  function retry(page) {
    delete cache[page];
    if (!document.getElementById('page-reports')) return;
    const body = document.getElementById('page-reports-body');
    if (body) body.textContent = 'Loading module data…';
    load(page);
  }

  window.PageReports = { retry: retry, exportPDF: exportPDF, exportCSV: exportCSV };
})();
