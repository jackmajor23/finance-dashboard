export const DEFAULT_CURRENCY = '£';

export function formatMoney(value, currency = DEFAULT_CURRENCY) {
  const amount = Number(value) || 0;
  const formatted = Math.round(amount).toLocaleString('en-GB');
  return `${currency}${formatted}`;
}

export function formatSignedMoney(value, currency = DEFAULT_CURRENCY) {
  const amount = Number(value) || 0;
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${currency}${Math.abs(Math.round(amount)).toLocaleString('en-GB')}`;
}

export function parseMoney(value) {
  if (typeof value !== 'string') {
    return Number(value) || 0;
  }
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
