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
    this.isReady = false;
  }

  connectedCallback() {
    this.isReady = true;
    this.socket = this.getSocket();
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.render();
  }

  disconnectedCallback() {
    if (this.model && this.isModelLocal) {
      this.model.destroy();
    } else {
      if (this.modelLoadConsumer) this.modelLoadConsumer.kill();
      if (this.modelChangeConsumer) this.modelChangeConsumer.kill();
      if (this.modelErrorConsumer) this.modelErrorConsumer.kill();
    }
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
    let modelInstanceProperty = this.getAttribute('model-instance-property');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');

    if (this.model && this.isModelLocal) this.model.destroy();

    let currentNode = this.parentNode;
    let model;
    if (modelInstanceProperty) {
      while (currentNode) {
        model = currentNode[modelInstanceProperty];
        if (model && modelType && (model.type !== modelType || !(model.fields || []).includes(modelField))) {
          model = null;
        }
        if (model && !model.agFields) {
          model = null;
        }
        if (model) break;
        currentNode = currentNode.getRootNode().host || currentNode.parentNode;
      }
      if (!model) {
        throw new Error(
          `The ${
            this.nodeName.toLowerCase()
          } element failed to obtain a model via the specified model-instance-property - Ensure that the element is nested inside a parent element which exposes a model instance of the same type which has the relevant field`
        );
      };
      this.model = model;
      this.isModelLocal = false;
    } else {
      this.model = new AGModel({
        socket: this.socket,
        type: modelType,
        id: modelId,
        fields: modelFields.split(',').map(field => field.trim()).filter(field => field)
      });
      this.isModelLocal = true;
    }

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
      this.modelLoadConsumer = this.model.listener('load').createConsumer();
      let packet = await this.modelLoadConsumer.next();
      if (packet.done) return;
      if (!this.modelValueExists(this.model.value)) {
        this.renderItem();
      }
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    })();

    if (this.model.isLoaded) {
      this.renderItem();
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    }

    (async () => {
      this.modelChangeConsumer = this.model.listener('change').createConsumer();
      for await (let event of this.modelChangeConsumer) {
        // Ignore change events which originate from this collection instance.
        if (!event.isRemote) continue;
        this.renderItem();
      }
    })();

    if (!hideErrorLogs) {
      (async () => {
        this.modelErrorConsumer = this.model.listener('error').createConsumer();
        for await (let { error } of this.modelErrorConsumer) {
          console.error(
            `Model viewer encountered an error: ${error.message}`
          );
        }
      })();
    }
  }
}

window.customElements.define('model-viewer', ModelViewer);
