import './overlay-modal.js';

class ConfirmModal extends HTMLElement {
  constructor() {
    super();
    this.isHidden = true;
    this.isReady = false;
  }

  connectedCallback() {
    this.isReady = true;
    this.render();
  }

  static get observedAttributes() {
    return [ 'message', 'heading', 'confirm-button-label', 'cancel-button-label' ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  show(options, confirmCallback) {
    let overlayModal = this.querySelector('overlay-modal');
    if (overlayModal) {
      overlayModal.removeAttribute('style');
    }
    this.confirmCallback = confirmCallback;
    this.isHidden = false;
    if (typeof options === 'string') {
      this.setAttribute('message', options);
    } else {
      if (options.heading != null) {
        this.setAttribute('heading', options.heading);
      }
      if (options.confirmButtonLabel != null) {
        this.setAttribute('confirm-button-label', options.confirmButtonLabel);
      }
      if (options.cancelButtonLabel != null) {
        this.setAttribute('cancel-button-label', options.cancelButtonLabel);
      }
      if (options.message != null) {
        this.setAttribute('message', options.message);
      }
    }
    this.applyAutoFocus();
  }

  applyAutoFocus() {
    let autoFocus = this.getAttribute('auto-focus');
    let selector;
    if (autoFocus === 'confirm' || autoFocus === 'delete') {
      selector = '.modal-confirm-button';
    } else if (autoFocus === 'cancel') {
      selector = '.modal-cancel-button';
    }
    if (!selector) return;
    this.querySelector(selector)?.focus({ preventScroll: true });
  }

  render() {
    let message = this.getAttribute('message') || '';
    let heading = this.getAttribute('heading') || '';
    let confirmButtonLabel = this.getAttribute('confirm-button-label') || 'Confirm';
    let cancelButtonLabel = this.getAttribute('cancel-button-label') || 'Cancel';

    this.innerHTML = `
      <overlay-modal${this.isHidden ? ' style="display: none;"' : ''}>
        <div slot="title">${heading}</div>
        <div class="confirm-modal-content" slot="content">
          <div>${message}</div>
          <div class="confirm-modal-buttons-container">
            <input class="modal-confirm-button" type="button" value="${confirmButtonLabel}" />
            <input class="modal-cancel-button" type="button" value="${cancelButtonLabel}" />
          </div>
        </div>
      </overlay-modal>
    `;

    let overlayModal = this.querySelector('overlay-modal');
    overlayModal.addEventListener('close', (event) => {
      event.stopPropagation();
      overlayModal.style.display = 'none';
    });
    let cancelButton = this.querySelector('.modal-cancel-button');
    cancelButton.addEventListener('click', () => {
      overlayModal.style.display = 'none';
      this.dispatchEvent(new CustomEvent('cancel'));
    });
    let confirmButton = this.querySelector('.modal-confirm-button');
    confirmButton.addEventListener('click', () => {
      overlayModal.style.display = 'none';
      this.dispatchEvent(new CustomEvent('confirm'));
      this.confirmCallback && this.confirmCallback();
    });
  }
}

window.customElements.define('confirm-modal', ConfirmModal);
