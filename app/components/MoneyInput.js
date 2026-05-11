export function createMoneyInput({ value = '', placeholder = 'Enter amount', className = '' }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = `money-input ${className}`.trim();
  input.placeholder = placeholder;
  input.value = value;

  input.addEventListener('input', (e) => {
    // Format as user types
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    if (raw) {
      const parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      e.target.value = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
    }
  });

  input.addEventListener('blur', (e) => {
    // Final formatting on blur
    const numValue = parseFloat(e.target.value.replace(/,/g, ''));
    if (!isNaN(numValue)) {
      e.target.value = numValue.toLocaleString('en-GB', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
  });

  return input;
}

export function parseMoneyInput(value) {
  return parseFloat(value.replace(/,/g, '')) || 0;
}