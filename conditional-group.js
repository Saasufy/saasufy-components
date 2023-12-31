class ConditionalGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isReady = false;
  }

  static get observedAttributes() {
    return [
      'show-content',
    ];
  }

  attributeChangedCallback() {
    if (!this.isReady) return;
    this.render();
  }

  connectedCallback() {
    this.isReady = true;
    this.render();
  }

  render() {
    let showContent = this.getAttribute('show-content');
    if (
      !showContent ||
      showContent === 'false' ||
      showContent === 'null' ||
      showContent === 'undefined'
    ) {
      this.shadowRoot.innerHTML = '';
      return;
    }
    this.shadowRoot.innerHTML = '<slot></slot>';
  }
}

window.customElements.define('conditional-group', ConditionalGroup);
