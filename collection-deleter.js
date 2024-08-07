class CollectionDeleter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <slot></slot>
    `;
  }

  deleteItem() {
    let modelId = this.getAttribute('model-id');
    this.dispatchEvent(
      new CustomEvent('crudDelete', { detail: modelId, bubbles: true })
    );
  }

  deleteItemField() {
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    this.dispatchEvent(
      new CustomEvent('crudDelete', { detail: { id: modelId, field: modelField }, bubbles: true })
    );
  }

  showConfirmModal(deleteField) {
    let message = this.getAttribute('confirm-message');
    let title = this.getAttribute('confirm-title');
    let confirmButtonLabel = this.getAttribute('confirm-button-label');
    let cancelButtonLabel = this.getAttribute('cancel-button-label');
    this.dispatchEvent(
      new CustomEvent('showModal', {
        detail: {
          message,
          title,
          confirmButtonLabel,
          cancelButtonLabel,
          callback: () => {
            if (deleteField) {
              this.deleteItemField();
            } else {
              this.deleteItem();
            }
          }
        },
        bubbles: true
      })
    );
  }

  confirmDeleteItem() {
    this.showConfirmModal();
  }

  confirmDeleteItemField() {
    this.showConfirmModal(true);
  }
}

window.customElements.define('collection-deleter', CollectionDeleter);
