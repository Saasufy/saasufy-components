import { SocketConsumer } from './socket.js';
import AGModel from '/node_modules/ag-model/ag-model.js';
import { renderTemplate, convertStringToFieldParams } from './utils.js';

class ModelViewer extends SocketConsumer {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.handleSlotChangeEvent = () => {
      this.renderItem();
    };
    this.isReady = false;
    this.activeLoader = null;
  }

  connectedCallback() {
    this.isReady = true;
    this.activeLoader = null;
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.render();
  }

  disconnectedCallback() {
    if (this.model) {
      this.model.destroy();
    }
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
  }

  static get observedAttributes() {
    return [
      'socket-instance-property',
      'model-type',
      'model-id',
      'model-fields',
      'fields-slice-to',
      'type-alias'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    this.render();
  }

  modelValueExists(modelValue) {
    let { id, ...otherProps } = modelValue;
    return !!Object.values(otherProps).filter(value => value != null).length;
  }

  renderError(error) {
    let viewportSlot = this.shadowRoot.querySelector('slot[name="viewport"]');
    if (!viewportSlot) return;

    let viewportNode = viewportSlot.assignedNodes()[0];
    if (!viewportNode) return;

    this.activeLoader = null;

    let errorTemplate = this.shadowRoot.querySelector('slot[name="error"]').assignedNodes()[0];
    if (errorTemplate) {
      let type = this.getAttribute('type-alias') || this.getAttribute('model-type');
      this.setCurrentState({ [`$${type}`]: { error } });
      let errorItemString = renderTemplate(
        errorTemplate.innerHTML,
        this.getStateContext(),
        this.socket
      );
      viewportNode.innerHTML = errorItemString;
    }
  }

  renderItem() {
    let viewportSlot = this.shadowRoot.querySelector('slot[name="viewport"]');
    if (!viewportSlot) return;

    let viewportNode = viewportSlot.assignedNodes()[0];
    if (!viewportNode) return;

    let loaderSlot = this.shadowRoot.querySelector('slot[name="loader"]');
    let loaderNode = loaderSlot.assignedNodes()[0];

    if (!this.model || !this.model.isLoaded) {
      if (loaderNode && this.activeLoader !== loaderNode) {
        this.activeLoader = loaderNode;
        viewportNode.innerHTML = loaderNode.innerHTML;
      }
      return;
    }

    this.activeLoader = null;

    let itemTemplate = this.shadowRoot.querySelector('slot[name="item"]').assignedNodes()[0];
    let modelValue = this.model.value;

    let noItemTemplate = this.shadowRoot.querySelector('slot[name="no-item"]').assignedNodes()[0];
    if (noItemTemplate && !this.modelValueExists(modelValue)) {
      viewportNode.innerHTML = noItemTemplate.innerHTML;
    } else if (itemTemplate) {
      let type = this.getAttribute('type-alias') || this.model.type;
      this.setCurrentState({ [type]: modelValue });
      let itemString = renderTemplate(
        itemTemplate.innerHTML,
        this.getStateContext(),
        this.socket
      );
      viewportNode.innerHTML = itemString;
    }
  }

  render() {
    if (
      !this.hasAttribute('model-type') ||
      !this.hasAttribute('model-id') ||
      !this.hasAttribute('model-fields')
    ) {
      return;
    };
    let socketInstanceProperty = this.getAttribute('socket-instance-property');
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelFields = this.getAttribute('model-fields') || '';
    let fieldsSliceTo = this.getAttribute('fields-slice-to') || '';

    let {
      fieldValues: sliceToMap
    } = convertStringToFieldParams(fieldsSliceTo);

    let fieldTransformations = {};
    for (let [ fieldName, sliceTo ] of Object.entries(sliceToMap)) {
      fieldTransformations[fieldName] = { sliceTo: Number(sliceTo) };
    }

    if (this.model) this.model.destroy();

    let socket;
    if (socketInstanceProperty) {
      let currentNode = this.parentNode;
      while (currentNode) {
        socket = currentNode[socketInstanceProperty];
        if (socket) break;
        currentNode = currentNode.getRootNode().host || currentNode.parentNode;
      }
      if (!socket) {
        throw new Error(
          `The ${
            this.nodeName.toLowerCase()
          } element failed to bind to a socket via the ${
            socketInstanceProperty
          } socket-instance-property`
        );
      };
    } else {
      socket = this.getSocket();
    }
    this.socket = socket;

    this.model = new AGModel({
      socket: this.socket,
      type: modelType,
      id: modelId,
      fields: modelFields.split(',').map(field => field.trim()).filter(field => field),
      fieldTransformations
    });

    this.shadowRoot.innerHTML = `
      <slot name="loader"></slot>
      <slot name="item"></slot>
      <slot name="no-item"></slot>
      <slot name="error"></slot>
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
        this.renderItem();
      }
    })();

    (async () => {
      this.modelErrorConsumer = this.model.listener('error').createConsumer();
      for await (let { error } of this.modelErrorConsumer) {
        let hideErrorLogs = this.hasAttribute('hide-error-logs');
        if (!hideErrorLogs) {
          console.error(
            `Model viewer encountered an error: ${error.message}`
          );
        }
        this.renderError(error);
      }
    })();
  }
}

window.customElements.define('model-viewer', ModelViewer);
