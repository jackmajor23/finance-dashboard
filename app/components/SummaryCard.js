export function createSummaryCard({ label = '', value = '', subtitle = '', colorClass = '', className = '' }) {
  const card = document.createElement('div');
  card.className = `stat-card ${colorClass} ${className}`.trim();

  const labelEl = document.createElement('div');
  labelEl.className = 'stat-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('div');
  valueEl.className = 'stat-val';
  valueEl.textContent = value;

  card.appendChild(labelEl);
  card.appendChild(valueEl);

  if (subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'stat-sub';
    subtitleEl.textContent = subtitle;
    card.appendChild(subtitleEl);
  }

  return card;
}