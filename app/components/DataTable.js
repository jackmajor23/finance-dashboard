export function createDataTable({ headers = [], rows = [], className = '' }) {
  const table = document.createElement('table');
  table.className = `data-table ${className}`.trim();

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      if (typeof cell === 'string') {
        td.innerHTML = cell;
      } else if (cell instanceof Node) {
        td.appendChild(cell);
      } else {
        td.textContent = String(cell);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

export function createEmptyState({ icon = '—', message = 'No data available', className = '' }) {
  const container = document.createElement('div');
  container.className = `empty-state ${className}`.trim();
  container.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <p class="empty-message">${message}</p>
  `;
  return container;
}