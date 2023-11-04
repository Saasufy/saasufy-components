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
    this.shadowRoot.innerHTML = showContent != null && showContent !== 'false' ? '<slot></slot>' : '';
  }
}

window.customElements.define('conditional-group', ConditionalGroup);
