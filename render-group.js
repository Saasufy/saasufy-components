class RenderGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.loadedElements = {};

    this.loadHandler = (event) => {
      let waitFor = this.getWaitFor();
      let renderLoadId = event.target.getAttribute('load-id');
      this.loadedElements[renderLoadId] = true;
      let areAllLoaded = waitFor.every(waitForId => this.loadedElements[waitForId]);
      if (areAllLoaded) {
        this.showSlottedElements();
      }
    };
  }

  connectedCallback() {
    this.loadedElements = {};
    let hasPending = !!this.getWaitFor().length;
    this.shadowRoot.innerHTML = `
      <style>
        .hidden {
          display: none;
        }
      </style>
      <slot name="loader"></slot>
      <slot id="main-slot"${hasPending ? ' class="hidden"': ''}></slot>
    `;
    if (hasPending) {
      this.addEventListener('load', this.loadHandler);
    }
  }

  disconnectedCallback() {
    this.removeEventListener('load', this.loadHandler);
  }

  showSlottedElements() {
    let loaderSlot = this.shadowRoot.querySelector('slot[name="loader"]');
    loaderSlot.classList.add('hidden');
    let mainSlot = this.shadowRoot.querySelector('#main-slot');
    mainSlot.classList.remove('hidden');
  }

  getWaitFor() {
    let waitForString = this.getAttribute('wait-for');
    if (!waitForString) {
      return [];
    }
    return waitForString.split(',').map(id => id.trim());
  }
}

window.customElements.define('render-group', RenderGroup);
