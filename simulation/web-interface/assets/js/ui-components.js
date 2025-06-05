/**
 * UI Components Module
 * Provides reusable UI components and utilities for the web interface
 */

class UIComponents {
  constructor() {
    this.animations = new Map();
    this.modals = new Map();
    this.tooltips = new Map();
  }

  /**
   * Create a notification toast
   * @param {string} message - Notification message
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in ms (0 = persistent)
   * @returns {HTMLElement} Toast element
   */
  createToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${this.getToastIcon(type)}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles if not already present
    this.ensureToastStyles();

    // Add to page
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('toast-show'), 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }

    return toast;
  }

  /**
   * Remove a toast notification
   * @param {HTMLElement} toast - Toast element
   */
  removeToast(toast) {
    if (!toast || !toast.parentElement) return;

    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} Icon character
   */
  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || icons.info;
  }

  /**
   * Ensure toast styles are present
   */
  ensureToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      }

      .toast {
        background: var(--bg-primary, white);
        border-radius: var(--radius-lg, 8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid var(--primary-color, #3B82F6);
        transform: translateX(100%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0;
        max-width: 100%;
      }

      .toast-success { border-left-color: var(--success-color, #10B981); }
      .toast-error { border-left-color: var(--danger-color, #EF4444); }
      .toast-warning { border-left-color: var(--warning-color, #F59E0B); }
      .toast-info { border-left-color: var(--primary-color, #3B82F6); }

      .toast-show {
        transform: translateX(0);
        opacity: 1;
      }

      .toast-hide {
        transform: translateX(100%);
        opacity: 0;
      }

      .toast-content {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .toast-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .toast-message {
        flex: 1;
        color: var(--text-primary, #111827);
        font-size: 14px;
        line-height: 1.4;
      }

      .toast-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: var(--text-secondary, #6B7280);
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .toast-close:hover {
        background-color: var(--bg-secondary, #F9FAFB);
      }

      @media (max-width: 480px) {
        .toast-container {
          left: 10px;
          right: 10px;
          top: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Create a loading spinner overlay
   * @param {string} message - Loading message
   * @returns {HTMLElement} Overlay element
   */
  createLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;

    this.ensureLoadingStyles();
    document.body.appendChild(overlay);

    // Animate in
    setTimeout(() => overlay.classList.add('loading-show'), 10);

    return overlay;
  }

  /**
   * Remove loading overlay
   * @param {HTMLElement} overlay - Overlay element
   */
  removeLoadingOverlay(overlay) {
    if (!overlay || !overlay.parentElement) return;

    overlay.classList.add('loading-hide');
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }, 300);
  }

  /**
   * Ensure loading styles are present
   */
  ensureLoadingStyles() {
    if (document.getElementById('loading-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'loading-styles';
    styles.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .loading-show { opacity: 1; }
      .loading-hide { opacity: 0; }

      .loading-content {
        background: var(--bg-primary, white);
        padding: 32px;
        border-radius: var(--radius-lg, 8px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
        text-align: center;
        min-width: 200px;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border-color, #E5E7EB);
        border-top: 4px solid var(--primary-color, #3B82F6);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      }

      .loading-message {
        color: var(--text-primary, #111827);
        font-size: 16px;
        margin: 0;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Create a progress bar
   * @param {number} value - Progress value (0-100)
   * @param {string} label - Progress label
   * @returns {HTMLElement} Progress bar element
   */
  createProgressBar(value = 0, label = '') {
    const container = document.createElement('div');
    container.className = 'progress-container';
    container.innerHTML = `
      ${label ? `<div class="progress-label">${label}</div>` : ''}
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${Math.max(
          0,
          Math.min(100, value)
        )}%"></div>
      </div>
      <div class="progress-text">${Math.round(value)}%</div>
    `;

    this.ensureProgressStyles();
    return container;
  }

  /**
   * Update progress bar value
   * @param {HTMLElement} progressBar - Progress bar container
   * @param {number} value - New progress value (0-100)
   * @param {string} label - Optional new label
   */
  updateProgressBar(progressBar, value, label = null) {
    const fill = progressBar.querySelector('.progress-fill');
    const text = progressBar.querySelector('.progress-text');
    const labelEl = progressBar.querySelector('.progress-label');

    if (fill) {
      fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
    if (text) {
      text.textContent = `${Math.round(value)}%`;
    }
    if (label && labelEl) {
      labelEl.textContent = label;
    }
  }

  /**
   * Ensure progress bar styles are present
   */
  ensureProgressStyles() {
    if (document.getElementById('progress-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'progress-styles';
    styles.textContent = `
      .progress-container {
        margin: 16px 0;
      }

      .progress-label {
        font-size: 14px;
        color: var(--text-secondary, #6B7280);
        margin-bottom: 8px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--bg-secondary, #F9FAFB);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .progress-fill {
        height: 100%;
        background: var(--primary-color, #3B82F6);
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .progress-text {
        font-size: 12px;
        color: var(--text-secondary, #6B7280);
        text-align: right;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Create a simple modal dialog
   * @param {string} title - Modal title
   * @param {string} content - Modal content (HTML)
   * @param {Array} buttons - Array of button objects {text, action, type}
   * @returns {HTMLElement} Modal element
   */
  createModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttons
            .map(
              (btn) => `
            <button class="modal-btn modal-btn-${btn.type || 'default'}" 
                    onclick="${
                      btn.action || "this.closest('.modal-overlay').remove()"
                    }">
              ${btn.text}
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    this.ensureModalStyles();

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => modal.classList.add('modal-show'), 10);

    return modal;
  }

  /**
   * Ensure modal styles are present
   */
  ensureModalStyles() {
    if (document.getElementById('modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'modal-styles';
    styles.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .modal-show { opacity: 1; }

      .modal-dialog {
        background: var(--bg-primary, white);
        border-radius: var(--radius-lg, 8px);
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.25);
        max-width: 500px;
        max-height: 90vh;
        width: 90%;
        overflow: hidden;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .modal-show .modal-dialog {
        transform: scale(1);
      }

      .modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color, #E5E7EB);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .modal-title {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary, #111827);
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary, #6B7280);
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .modal-close:hover {
        background-color: var(--bg-secondary, #F9FAFB);
      }

      .modal-body {
        padding: 24px;
        overflow-y: auto;
        max-height: 60vh;
      }

      .modal-footer {
        padding: 20px 24px;
        border-top: 1px solid var(--border-color, #E5E7EB);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .modal-btn {
        padding: 8px 16px;
        border: 1px solid var(--border-color, #E5E7EB);
        border-radius: var(--radius-md, 6px);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .modal-btn-default {
        background: var(--bg-primary, white);
        color: var(--text-primary, #111827);
      }

      .modal-btn-primary {
        background: var(--primary-color, #3B82F6);
        color: white;
        border-color: var(--primary-color, #3B82F6);
      }

      .modal-btn-danger {
        background: var(--danger-color, #EF4444);
        color: white;
        border-color: var(--danger-color, #EF4444);
      }

      .modal-btn:hover {
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Show a confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback for confirmation
   * @param {Function} onCancel - Callback for cancellation
   * @returns {HTMLElement} Modal element
   */
  showConfirmDialog(message, onConfirm, onCancel = null) {
    return this.createModal('Confirm Action', `<p>${message}</p>`, [
      {
        text: 'Cancel',
        type: 'default',
        action: `${
          onCancel ? onCancel.toString() + '();' : ''
        } this.closest('.modal-overlay').remove()`,
      },
      {
        text: 'Confirm',
        type: 'primary',
        action: `${onConfirm.toString()}(); this.closest('.modal-overlay').remove()`,
      },
    ]);
  }

  /**
   * Create a tooltip
   * @param {HTMLElement} element - Element to attach tooltip to
   * @param {string} text - Tooltip text
   * @param {string} position - Position: 'top', 'bottom', 'left', 'right'
   */
  addTooltip(element, text, position = 'top') {
    if (!element) return;

    this.ensureTooltipStyles();

    element.addEventListener('mouseenter', (e) => {
      this.showTooltip(e.target, text, position);
    });

    element.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  /**
   * Show tooltip
   * @param {HTMLElement} element - Target element
   * @param {string} text - Tooltip text
   * @param {string} position - Position
   */
  showTooltip(element, text, position) {
    this.hideTooltip(); // Remove any existing tooltip

    const tooltip = document.createElement('div');
    tooltip.className = `tooltip tooltip-${position}`;
    tooltip.textContent = text;
    tooltip.id = 'active-tooltip';

    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left, top;

    switch (position) {
      case 'top':
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        top = rect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        top = rect.bottom + 8;
        break;
      case 'left':
        left = rect.left - tooltipRect.width - 8;
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        left = rect.right + 8;
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        break;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    // Show tooltip
    setTimeout(() => tooltip.classList.add('tooltip-show'), 10);
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.getElementById('active-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Ensure tooltip styles are present
   */
  ensureTooltipStyles() {
    if (document.getElementById('tooltip-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'tooltip-styles';
    styles.textContent = `
      .tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        line-height: 1.4;
        z-index: 10001;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        max-width: 200px;
        word-wrap: break-word;
      }

      .tooltip-show {
        opacity: 1;
      }

      .tooltip::after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 4px solid transparent;
      }

      .tooltip-top::after {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: rgba(0, 0, 0, 0.9);
      }

      .tooltip-bottom::after {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: rgba(0, 0, 0, 0.9);
      }

      .tooltip-left::after {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: rgba(0, 0, 0, 0.9);
      }

      .tooltip-right::after {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: rgba(0, 0, 0, 0.9);
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Animate element with CSS animation
   * @param {HTMLElement} element - Element to animate
   * @param {string} animation - Animation name
   * @param {number} duration - Duration in ms
   * @returns {Promise} Animation completion promise
   */
  animate(element, animation, duration = 300) {
    return new Promise((resolve) => {
      element.style.animation = `${animation} ${duration}ms ease`;

      const onAnimationEnd = () => {
        element.style.animation = '';
        element.removeEventListener('animationend', onAnimationEnd);
        resolve();
      };

      element.addEventListener('animationend', onAnimationEnd);
    });
  }

  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in ms
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// Global UI utilities
const UI = new UIComponents();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIComponents;
}
