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
}

window.customElements.define('collection-deleter', CollectionDeleter);
