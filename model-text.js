import { SocketConsumer } from './socket.js';
import { toSafeHTML } from './utils.js';
import AGModel from '/node_modules/ag-model/ag-model.js';

class ModelText extends SocketConsumer {
  constructor() {
    super();
    this.isReady = false;
  }

  connectedCallback() {
    this.isReady = true;
    this.destroy = () => {};
    this.render();
  }

  disconnectedCallback() {
    this.destroy();
  }

  static get observedAttributes() {
    return [
      'model-instance-property',
      'model-type',
      'model-id',
      'model-field',
      'hide-error-logs'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.destroy();
    this.render();
  }

  render() {
    this.innerHTML = '';
    let modelInstanceProperty = this.getAttribute('model-instance-property');
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');
    let currentNode = this.parentNode;
    let model;
    let isModelLocal = false;
    if (modelInstanceProperty) {
      while (currentNode) {
        model = currentNode[modelInstanceProperty];
        if (model && modelType && (model.type !== modelType || !(model.fields || []).includes(modelField))) {
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
    } else {
      this.socket = this.getSocket();
      model = new AGModel({
        socket: this.socket,
        type: modelType,
        id: modelId,
        fields: [ modelField ]
      });
      if (!hideErrorLogs) {
        (async () => {
          for await (let { error } of model.listener('error')) {
            console.error(
              `Model input encountered an error: ${error.message}`
            );
          }
        })();
      }
      isModelLocal = true;
    }
    if (model.isLoaded) {
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    } else {
      this.isLoadedConsumer = model.listener('load').createConsumer();
      (async () => {
        await this.isLoadedConsumer.next();
        this.setAttribute('is-loaded', '');
        this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
      })();
    }
    let changeConsumer = model.listener('change').createConsumer();
    (async () => {
      for await (let event of changeConsumer) {
        if (event.resourceField !== modelField) continue;
        let fieldValue = toSafeHTML(model.value[modelField]);
        this.innerHTML = fieldValue;
      }
    })();
    if (model.isLoaded) {
      this.innerHTML = toSafeHTML(model.value[modelField]);
    }
    this.destroy = () => {
      changeConsumer.kill();
      this.isLoadedConsumer && this.isLoadedConsumer.kill();
      if (isModelLocal) {
        model.destroy();
      }
    };
  }
}

window.customElements.define('model-text', ModelText);
