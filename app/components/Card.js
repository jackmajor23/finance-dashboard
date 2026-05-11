export function createCard({ title = '', subtitle = '', children = [], className = '' }) {
  const card = document.createElement('div');
  card.className = `card ${className}`.trim();

  if (title || subtitle) {
    const header = document.createElement('div');
    header.className = 'card-header';
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'card-title';
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }
    if (subtitle) {
      const subtitleEl = document.createElement('div');
      subtitleEl.className = 'card-sub';
      subtitleEl.textContent = subtitle;
      header.appendChild(subtitleEl);
    }
    card.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  if (Array.isArray(children)) {
    children.forEach((child) => {
      if (typeof child === 'string') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = child;
        body.appendChild(wrapper);
      } else if (child instanceof Node) {
        body.appendChild(child);
      }
    });
  }

  card.appendChild(body);
  return card;
}
