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
      'socket-instance-property',
      'model-type',
      'model-id',
      'model-field',
      'slice-to',
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
    let socketInstanceProperty = this.getAttribute('socket-instance-property');
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    let sliceTo = this.getAttribute('slice-to');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');

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

    let fieldTransformations;
    if (sliceTo != null) {
      fieldTransformations = {
        [modelField]: { sliceTo: Number(sliceTo) }
      };
    } else {
      fieldTransformations = {};
    }

    let model = new AGModel({
      socket: this.socket,
      type: modelType,
      id: modelId,
      fields: [ modelField ],
      fieldTransformations
    });
    if (!hideErrorLogs) {
      (async () => {
        for await (let { error } of model.listener('error')) {
          console.error(
            `Model text encountered an error: ${error.message}`
          );
        }
      })();
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
      model.destroy();
    };
  }
}

window.customElements.define('model-text', ModelText);
