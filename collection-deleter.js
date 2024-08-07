class CollectionDeleter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return [
      'model-id',
      'confirm-message'
    ];
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

  confirmDeleteItem() {
    let confirmMessage = this.getAttribute('confirm-message');
    this.dispatchEvent(
      new CustomEvent('showModal', {
        detail: {
          message: confirmMessage,
          callback: () => {
            this.deleteItem();
          }
        },
        bubbles: true
      })
    )
  }

  deleteItemField() {
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    this.dispatchEvent(
      new CustomEvent('crudDelete', { detail: { id: modelId, field: modelField }, bubbles: true })
    );
  }

  confirmDeleteItemField() {
    let confirmMessage = this.getAttribute('confirm-message');
    this.dispatchEvent(
      new CustomEvent('showModal', {
        detail: {
          message: confirmMessage,
          callback: () => {
            this.deleteItemField();
          }
        },
        bubbles: true
      })
    )
  }
}

window.customElements.define('collection-deleter', CollectionDeleter);
