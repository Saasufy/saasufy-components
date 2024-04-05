import { debouncer, updateConsumerElements } from './utils.js';

const DEFAULT_DEBOUNCE_DELAY = 0;

class InputTransformer extends HTMLElement {
  constructor() {
    super();
    this.isReady = false;
    this.debounce = debouncer();
  }
  connectedCallback() {
    this.isReady = true;
    this.render();
  }

  static get observedAttributes() {
    return [
      'consumers',
      'debounce-delay',
      'provider-template',
      'output-type',
      'value'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }

  render() {
    if (!this.hasAttribute('value')) return;

    let value = this.getAttribute('value') || '';
    let outputType = this.getAttribute('output-type');
    let debounceDelay = this.getAttribute('debounce-delay');
    debounceDelay = debounceDelay ? Number(debounceDelay) : DEFAULT_DEBOUNCE_DELAY;

    if (!this.isReady) return;

    let consumers = this.getAttribute('consumers');
    if (!consumers) return;

    this.debounce(async () => {
      let providerTemplate = this.getAttribute('provider-template') || '{{value}}';
      updateConsumerElements(consumers, value, providerTemplate, null, outputType);
    }, debounceDelay);
  }
}

window.customElements.define('input-transformer', InputTransformer);
