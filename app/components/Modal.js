export function createModal({ title = '', content = [], actions = [], className = '' }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = `modal ${className}`.trim();

  // Header
  if (title) {
    const header = document.createElement('div');
    header.className = 'modal-header';
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    header.appendChild(titleEl);
    modal.appendChild(header);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (Array.isArray(content)) {
    content.forEach(item => {
      if (typeof item === 'string') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = item;
        body.appendChild(wrapper);
      } else if (item instanceof Node) {
        body.appendChild(item);
      }
    });
  }
  modal.appendChild(body);

  // Actions
  if (actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'modal-actions';
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = action.className || 'btn';
      button.textContent = action.label;
      if (action.onClick) {
        button.addEventListener('click', action.onClick);
      }
      actionsEl.appendChild(button);
    });
    modal.appendChild(actionsEl);
  }

  overlay.appendChild(modal);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });

  return overlay;
}

export function showModal(modal) {
  document.body.appendChild(modal);
  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
}

export function closeModal(modal) {
  modal.classList.remove('show');
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }, 200);
}