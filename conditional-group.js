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

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
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
