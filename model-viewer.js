import { SocketConsumer } from './socket.js';
import AGModel from '/node_modules/ag-model/ag-model.js';
import { renderTemplate } from './utils.js';

class ModelViewer extends SocketConsumer {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.handleSlotChangeEvent = () => {
      this.renderItem();
    };
  }

  connectedCallback() {
    this.isReady = true;
    this.socket = this.getSocket();
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.render();
  }

  disconnectedCallback() {
    if (this.model) this.model.destroy();
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
  }

  static get observedAttributes() {
    return [
      'model-type',
      'model-id',
      'model-fields',
      'type-alias',
      'hide-error-logs'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  modelValueExists(modelValue) {
    let { id, ...otherProps } = modelValue;
    return !!Object.values(otherProps).filter(value => value != null).length;
  }

  renderItem() {
    let viewportSlot = this.shadowRoot.querySelector('slot[name="viewport"]');
    let loaderSlot = this.shadowRoot.querySelector('slot[name="loader"]');
    let hasLoaders = !!loaderSlot.assignedNodes().length;

    if (!this.model || !this.model.isLoaded) {
      if (hasLoaders) {
        viewportSlot.classList.add('hidden');
        loaderSlot.classList.remove('hidden');
      }
      return;
    }

    loaderSlot.classList.add('hidden');
    viewportSlot.classList.remove('hidden');

    let viewportNode = viewportSlot.assignedNodes()[0];
    if (!viewportNode) return;

    let itemTemplate = this.shadowRoot.querySelector('slot[name="item"]').assignedNodes()[0];
    let modelValue = this.model.value;

    let noItemTemplate = this.shadowRoot.querySelector('slot[name="no-item"]').assignedNodes()[0];
    if (noItemTemplate && !this.modelValueExists(modelValue)) {
      viewportNode.innerHTML = noItemTemplate.innerHTML;
    } else if (itemTemplate) {
      let type = this.getAttribute('type-alias') || this.model.type;
      let itemString = renderTemplate(
        itemTemplate.innerHTML,
        { [type]: modelValue },
        this.socket
      );
      viewportNode.innerHTML = itemString;
    }
  }

  render() {
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelFields = this.getAttribute('model-fields') || '';
    let hideErrorLogs = this.hasAttribute('hide-error-logs');

    if (this.model) this.model.destroy();

    this.model = new AGModel({
      socket: this.socket,
      type: modelType,
      id: modelId,
      fields: modelFields.split(',').map(field => field.trim()).filter(field => field)
    });

    this.shadowRoot.innerHTML = `
      <style>
        .hidden {
          display: none;
        }
      </style>
      <slot name="loader"></slot>
      <slot name="item"></slot>
      <slot name="no-item"></slot>
      <slot name="viewport"></slot>
    `;

    (async () => {
      await this.model.listener('load').once();
      if (!this.modelValueExists(this.model.value)) {
        this.renderItem();
      }
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    })();

    (async () => {
      for await (let event of this.model.listener('change')) {
        this.renderItem();
      }
    })();

    if (!hideErrorLogs) {
      (async () => {
        for await (let { error } of this.model.listener('error')) {
          console.error(
            `Model viewer encountered an error: ${error.message}`
          );
        }
      })();
    }
  }
}

window.customElements.define('model-viewer', ModelViewer);
