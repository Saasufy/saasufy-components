import { renderTemplate, generateRandomHexString } from './utils.js';

class OAuthLink extends HTMLElement {
  constructor() {
    super();
    this.isReady = false;
    this.attachShadow({ mode: 'open' });

    this.handleSlotChangeEvent = () => {
      this.renderItem();
    };
  }

  static get observedAttributes() {
    return [
      'provider',
      'client-id',
      'state-size',
      'state-session-storage-key'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  connectedCallback() {
    this.isReady = true;
    this.render();
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
  }

  renderItem() {
    let provider = this.getAttribute('provider');
    if (!provider) {
      throw new Error('The provider attribute of oauth-link was not specified');
    }
    let viewportNode = this.shadowRoot.querySelector('slot[name="viewport"]').assignedNodes()[0];
    if (!viewportNode) return;
    let itemTemplate = this.shadowRoot.querySelector('slot[name="item"]').assignedNodes()[0];
    if (!itemTemplate) return;

    let clientId = this.getAttribute('client-id');
    let stateSize = Number(this.getAttribute('state-size') || 20);
    let sessionStorageKey = this.getAttribute('state-session-storage-key') || `oauth.${provider}.state`;
    let state = generateRandomHexString(stateSize);
    sessionStorage.setItem(sessionStorageKey, state);

    let itemString = renderTemplate(
      itemTemplate.innerHTML,
      {
        oauth: {
          clientId,
          state
        }
      }
    );
    viewportNode.innerHTML = itemString;
  }

  render() {
    let urlSearchParams = new URLSearchParams(location.search);
    let code = urlSearchParams.get('code');
    
    if (code) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    this.shadowRoot.innerHTML = `
      <slot name="item"></slot>
      <slot name="viewport"></slot>
    `;

    this.renderItem();
  }
}

window.customElements.define('oauth-link', OAuthLink);
