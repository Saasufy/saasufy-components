import { SocketConsumer } from './socket.js';
import {
  updateConsumerElements,
  convertStringToFieldParams,
  getTypeCastFunction,
  formatError
} from './utils.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';

class CollectionAdderForm extends SocketConsumer {
  constructor(options) {
    super();
    this.attachShadow({
      mode: 'open'
    });
    this.options = options || {};
    this.isReady = false;
  }

  connectedCallback() {
    this.socket = this.getSocket();
    this.isReady = true;
    this.render();
  }

  disconnectedCallback() {
    if (this.collection) this.collection.destroy();
  }

  static get observedAttributes() {
    return [
      'collection-type',
      'model-values',
      'success-message',
      'trim-spaces'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    this.render();
  }

  async submit() {
    if (!this.isReady) {
      throw new Error('Collection adder form is not ready to be submitted');
    }
    let successMessage = this.getAttribute('success-message');
    let messageContainer = this.shadowRoot.querySelector('slot[name="message"]').assignedElements()[0];

    if (messageContainer) {
      messageContainer.classList.remove('success');
      messageContainer.classList.remove('error');
      messageContainer.textContent = '';
    }

    let trimSpaces = this.hasAttribute('trim-spaces');

    let inputElements = this.getAllInputElements();
    let outputValue;

    try {
      let newModelData = {
        ...this.modelFieldValues,
        ...Object.fromEntries(
          await Promise.all(
            [ ...inputElements ].filter(
              input => input.type === 'radio' ? input.checked : input.value !== ''
            )
            .map(
              async (input) => {
                let inputType;
                if (input.nodeName === 'TEXTAREA' || input.nodeName === 'SELECT') {
                  inputType = input.nodeName.toLowerCase();
                } else {
                  inputType = input.type;
                }
                let Type = getTypeCastFunction(
                  inputType === 'hidden' ?
                    input.getAttribute('output-type') : inputType
                );
                let value;
                if (inputType === 'file' && input.files && input.files.length) {
                  let reader = new FileReader();
                  let readerLoadPromise = new Promise((resolve, reject) => {
                    reader.addEventListener('load', () => {
                      resolve(reader.result);
                    });
                    reader.addEventListener('error', () => {
                      reject(new Error('Failed to read file'));
                    });
                  });
                  reader.readAsDataURL(input.files[0]);
                  value = await readerLoadPromise;
                } else if (inputType === 'checkbox') {
                  value = input.checked;
                } else {
                  value = input.value;
                }
                let sanitizedValue = Type(value);
                if (trimSpaces && typeof sanitizedValue === 'string') {
                  sanitizedValue = sanitizedValue.trim();
                }
                return [ input.name, sanitizedValue ];
              }
            )
          )
        )
      };

      let resourceId = await this.collection.create(newModelData);
      let insertedModelData = {
        ...newModelData,
        id: resourceId
      };
      this.dispatchEvent(
        new CustomEvent('success', {
          detail: insertedModelData
        })
      );

      this.reset();

      outputValue = {
        resource: insertedModelData
      };

      messageContainer = this.shadowRoot.querySelector('slot[name="message"]').assignedElements()[0];
      if (messageContainer) {
        messageContainer.classList.add('success');
        messageContainer.classList.remove('error');
        if (successMessage) {
          messageContainer.textContent = successMessage;
        } else {
          messageContainer.textContent = '';
        }
      }
    } catch (error) {
      messageContainer = this.shadowRoot.querySelector('slot[name="message"]').assignedElements()[0];
      if (messageContainer) {
        messageContainer.classList.add('error');
        messageContainer.classList.remove('success');
        messageContainer.textContent = formatError(error);
      }
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: error
        })
      );

      outputValue = {
        error
      };
    }
    let consumers = this.getAttribute('consumers');
    let outcomeConsumers = this.getAttribute(outputValue.error ? 'error-consumers' : 'success-consumers');
    let oppositeOutcomeConsumers = this.getAttribute(outputValue.error ? 'success-consumers' : 'error-consumers');
    if (consumers) {
      if (outcomeConsumers) {
        consumers = `${consumers},${outcomeConsumers}`;
      }
    } else if (outcomeConsumers) {
      consumers = outcomeConsumers;
    }
    let providerTemplate = this.getAttribute('provider-template');
    let selfName = this.getAttribute('name');
    updateConsumerElements(consumers, outputValue, providerTemplate, selfName);
    updateConsumerElements(oppositeOutcomeConsumers, '', null, selfName);
  }

  getAllInputElements() {
    return this.shadowRoot.querySelector('.input-slot')
      .assignedElements()
      .filter(element => element)
      .flatMap(element => [ element, ...element.querySelectorAll('input,textarea,select') ])
      .filter(
        (element) => {
          return (element.nodeName === 'INPUT' && element.type !== 'submit' && element.type !== 'button') ||
            element.nodeName === 'TEXTAREA' || element.nodeName === 'SELECT';
        }
      );
  }

  reset() {
    let inputElements = this.getAllInputElements();
    for (let element of inputElements) {
      if (element.nodeName === 'INPUT') {
        if (element.type === 'checkbox' || element.type === 'radio') {
          element.checked = false;
        } else if (element.type !== 'hidden' || this.hasAttribute('auto-reset-hidden-inputs')) {
          element.value = '';
        }
      } else if (element.nodeName === 'TEXTAREA') {
        element.value = '';
      } else if (element.nodeName === 'SELECT') {
        element.selectedIndex = 0;
      }
    }
  }

  render() {
    let collectionType = this.getAttribute('collection-type');

    let {
      fieldValues: modelFieldValues
    } = convertStringToFieldParams(this.getAttribute('model-values'));

    this.modelFieldValues = modelFieldValues;

    if (this.collection) this.collection.destroy();

    this.collection = new AGCollection({
      socket: this.socket,
      type: collectionType,
      fields: [],
      writeOnly: true
    });

    this.shadowRoot.innerHTML = `
      <slot name="message" class="collection-adder-message-container"></slot>
      <slot class="input-slot"></slot>
    `;

    let inputSlot = this.shadowRoot.querySelector('.input-slot');
    inputSlot.addEventListener('click', async (event) => {
      let { target } = event;
      if (target && target.nodeName === 'INPUT' && target.type === 'submit') {
        await this.submit();
      }
    });
  }
}

window.customElements.define('collection-adder-form', CollectionAdderForm);
