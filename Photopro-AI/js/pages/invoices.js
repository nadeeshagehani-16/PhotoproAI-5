// Invoices & Payments Page
function renderInvoices() {
  const el = document.getElementById('page-content');
  const paid = MOCK.invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+i.amount,0);
  const pending = MOCK.invoices.filter(i=>i.status==='Pending').reduce((s,i)=>s+i.amount,0);
  const overdue = MOCK.invoices.filter(i=>i.status==='Overdue').reduce((s,i)=>s+i.amount,0);
  el.innerHTML = `
    ${pageHeader('Invoices & Payments', 'Financial overview and invoice management', `<button class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Create Invoice</button>`)}
    ${kpiCards([
      {icon:'banknote',iconBg:'bg-green-50',iconColor:'text-green-600',value:formatCurrency(paid+pending+overdue),label:'Total Revenue',trend:'+8.2%'},
      {icon:'check-circle',iconBg:'bg-blue-50',iconColor:'text-blue-600',value:formatCurrency(paid),label:'Paid'},
      {icon:'clock',iconBg:'bg-amber-50',iconColor:'text-amber-600',value:formatCurrency(pending),label:'Pending'},
      {icon:'alert-circle',iconBg:'bg-red-50',iconColor:'text-red-500',value:formatCurrency(overdue),label:'Overdue'},
    ])}
    <div class="flex gap-2 mb-6">
      ${['All','Paid','Pending','Overdue'].map((s,i)=>`<button class="px-4 py-2 rounded-xl text-sm font-medium transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Invoice ID</th><th>Client</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${MOCK.invoices.map(inv=>`<tr>
        <td class="font-mono text-sm font-semibold">${inv.id}</td>
        <td class="font-medium text-sm">${inv.client}</td>
        <td class="text-text-secondary">${inv.date}</td>
        <td class="text-text-secondary">${inv.due}</td>
        <td class="font-semibold">${formatCurrency(inv.amount)}</td>
        <td class="text-text-secondary">${inv.method}</td>
        <td>${statusBadge(inv.status)}</td>
        <td><div class="flex items-center gap-1">
          <button class="btn-action" title="View"><i data-lucide="eye" class="w-4 h-4"></i></button>
          <button class="btn-action" title="Download"><i data-lucide="download" class="w-4 h-4"></i></button>
          <button class="btn-action" title="Send"><i data-lucide="send" class="w-4 h-4"></i></button>
          <button class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  lucide.createIcons();
}
