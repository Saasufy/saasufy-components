import './overlay-modal.js';

class ConfirmModal extends HTMLElement {
  constructor() {
    super();
    this.hidden = true;
    this.isReady = false;
  }

  connectedCallback() {
    this.isReady = true;
    this.render();
  }

  static get observedAttributes() {
    return [ 'message', 'title', 'confirm-button-label', 'cancel-button-label' ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  show(message, confirmCallback) {
    let overlayModal = this.querySelector('overlay-modal');
    if (overlayModal) {
      overlayModal.removeAttribute('style');
    }
    this.confirmCallback = confirmCallback;
    this.hidden = false;
    this.setAttribute('message', message);
  }

  render() {
    let message = this.getAttribute('message') || '';
    let title = this.getAttribute('title') || '';
    let confirmButtonLabel = this.getAttribute('confirm-button-label') || 'Confirm';
    let cancelButtonLabel = this.getAttribute('cancel-button-label') || 'Cancel';

    this.innerHTML = `
      <overlay-modal${this.hidden ? ' style="display: none;"' : ''}>
        <div slot="title">${title}</div>
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
    overlayModal.addEventListener('close', () => {
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
