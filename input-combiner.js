import { debouncer, updateConsumerElements } from './utils.js';

const DEFAULT_DEBOUNCE_DELAY = 0;

class InputCombiner extends HTMLElement {
  constructor() {
    super();
    this.isReady = false;
    this.inputValues = {};
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
      'value'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }

  render() {
    if (!this.hasAttribute('value')) return;

    let value = this.getAttribute('value') || '';
    let debounceDelay = this.getAttribute('debounce-delay');
    debounceDelay = debounceDelay ? Number(debounceDelay) : DEFAULT_DEBOUNCE_DELAY;

    let valueParts = value.match(/^(?:([^:]*)[:])?(.*)$/);
    let valueUpdater = valueParts[1] || '_root';
    let rawValue = valueParts[2];
    this.inputValues[valueUpdater] = rawValue;

    if (!this.isReady) return;

    let consumers = this.getAttribute('consumers');
    if (!consumers) return;

    this.debounce(async () => {
      let providerTemplate = this.getAttribute('provider-template') || '{{value._root}}';
      updateConsumerElements(consumers, { ...this.inputValues }, providerTemplate);
    }, debounceDelay);
  }
}

window.customElements.define('input-combiner', InputCombiner);
