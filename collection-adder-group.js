class CollectionAdderGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        .hidden {
          display: none;
        }
      </style>
      <slot name="success" class="hidden"></slot>
      <slot name="error-container" class="hidden"></slot>
      <slot name="collection-adder"></slot>
      <slot name="submit-button"></slot>
    `;
    this.shadowRoot.querySelector('slot[name="submit-button"]').addEventListener('click', async (event) => {
      let collectionAdders = this.shadowRoot.querySelector('slot[name="collection-adder"]').assignedNodes();
      try {
        await Promise.all(
          collectionAdders.map(async (adder) => adder.submit())
        );
      } catch (error) {
        let errorContainerSlot = this.shadowRoot.querySelector('slot[name="error-container"]');
        errorContainerSlot.classList.remove('hidden');
        this.shadowRoot.querySelector('slot[name="success"]').classList.add('hidden');
        let errorContainers = errorContainerSlot.assignedNodes();
        for (let container of errorContainers) {
          container.textContent = error.message;
        }
        return;
      }
      let successSlot = this.shadowRoot.querySelector('slot[name="success"]');
      successSlot.classList.remove('hidden');
      this.shadowRoot.querySelector('slot[name="error-container"]').classList.add('hidden');
    });
  }
}

window.customElements.define('collection-adder-group', CollectionAdderGroup);
