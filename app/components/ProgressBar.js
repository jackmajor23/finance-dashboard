export function createProgressBar({ value = 0, max = 100, showLabel = true, className = '' }) {
  const container = document.createElement('div');
  container.className = `progress-container ${className}`.trim();

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.style.width = `${Math.min(100, Math.max(0, (value / max) * 100))}%`;

  const wrapper = document.createElement('div');
  wrapper.className = 'progress-wrapper';
  wrapper.appendChild(bar);

  container.appendChild(wrapper);

  if (showLabel) {
    const label = document.createElement('div');
    label.className = 'progress-label';
    label.textContent = `${Math.round((value / max) * 100)}%`;
    container.appendChild(label);
  }

  return container;
}

export function createProgressRing({ value = 0, max = 100, size = 80, strokeWidth = 8, className = '' }) {
  const container = document.createElement('div');
  container.className = `progress-ring ${className}`.trim();
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.classList.add('progress-ring-svg');

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', size / 2);
  bgCircle.setAttribute('cy', size / 2);
  bgCircle.setAttribute('r', radius);
  bgCircle.setAttribute('stroke', 'var(--border)');
  bgCircle.setAttribute('stroke-width', strokeWidth);
  bgCircle.setAttribute('fill', 'transparent');

  // Progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('cx', size / 2);
  progressCircle.setAttribute('cy', size / 2);
  progressCircle.setAttribute('r', radius);
  progressCircle.setAttribute('stroke', 'var(--accent)');
  progressCircle.setAttribute('stroke-width', strokeWidth);
  progressCircle.setAttribute('fill', 'transparent');
  progressCircle.setAttribute('stroke-dasharray', strokeDasharray);
  progressCircle.setAttribute('stroke-dashoffset', strokeDashoffset);
  progressCircle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);

  // Center text
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '50%');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-size', '14px');
  text.setAttribute('font-weight', '600');
  text.textContent = `${Math.round(percentage)}%`;
  svg.appendChild(text);

  container.appendChild(svg);
  return container;
}