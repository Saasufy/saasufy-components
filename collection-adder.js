import { SocketConsumer } from './socket.js';
import {
  updateConsumerElements,
  convertStringToFieldParams,
  getTypeCastFunction,
  formatError,
  renderTemplate
} from './utils.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';

class CollectionAdder extends SocketConsumer {
  constructor(options) {
    super();
    this.options = options || {};

    this.inputTypeWithParamsRegExp = /^([^()]*)(\(([^)]*)\))?/;
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
      'collection-fields',
      'field-labels',
      'option-labels',
      'model-values',
      'submit-button-label',
      'hide-submit-button',
      'success-message',
      'autocapitalize',
      'autocorrect',
      'trim-spaces'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  async submit() {
    if (!this.isReady) {
      throw new Error('Collection adder form is not ready to be submitted');
    }
    let successMessage = this.getAttribute('success-message');
    let messageContainer = this.querySelector('.collection-adder-message-container');

    messageContainer.classList.remove('success');
    messageContainer.classList.remove('error');
    messageContainer.textContent = '';

    // Clear any existing field errors
    let existingFieldErrors = this.querySelectorAll('.collection-adder-field-error-container');
    existingFieldErrors.forEach(el => el.textContent = '');

    // Clear error classes from all inputs
    let allInputs = this.querySelectorAll('.collection-adder-input, .collection-adder-radio');
    allInputs.forEach(input => input.classList.remove('error'));

    let radioInputs = [ ...this.querySelectorAll('.collection-adder-radio') ];
    let radioData = {};
    for (let radio of radioInputs) {
      if (radio.checked) {
        radioData[radio.name] = radio.value;
      }
    }

    let trimSpaces = this.hasAttribute('trim-spaces');
    let outputValue;

    let modelValues = this.getAttribute('model-values');
    if (modelValues && this.hasAttribute('computable-model-values')) {
      modelValues = renderTemplate.call(this, modelValues, null, null, true);
    }

    let {
      fieldValues: modelFieldValues
    } = convertStringToFieldParams(modelValues);

    this.modelFieldValues = modelFieldValues;

    try {
      let newModelData = {
        ...this.modelFieldValues,
        ...radioData,
        ...Object.fromEntries(
          await Promise.all(
            [ ...this.querySelectorAll('.collection-adder-input') ].filter(
              input => input.value !== ''
            )
            .map(
              async (input) => {
                let fieldType = this.fieldTypes[input.name];
                let Type = getTypeCastFunction(fieldType);
                let value;
                if (input.type === 'file' && input.files && input.files.length) {
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
                } else if (fieldType === 'checkbox') {
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
      let form = this.querySelector('.collection-adder-form');
      form.reset();

      outputValue = {
        resource: insertedModelData
      };

      messageContainer.classList.add('success');
      messageContainer.classList.remove('error');

      if (successMessage) {
        messageContainer.textContent = successMessage;
      } else {
        messageContainer.textContent = '';
      }
    } catch (error) {
      messageContainer.classList.add('error');
      messageContainer.classList.remove('success');

      if (this.hasAttribute('show-field-errors') && error.fieldErrors) {
        for (let fieldName in error.fieldErrors) {
          let fieldError = error.fieldErrors[fieldName];
          let fieldContainer = this.querySelector(`.collection-adder-field-container[data-field="${fieldName}"]`);

          if (fieldContainer) {
            let fieldType = this.fieldTypes[fieldName];
            let errorDiv = fieldContainer.querySelector('.collection-adder-field-error-container');

            // For radio buttons and checkboxes, just add error class to input(s)
            if (fieldType === 'radio') {
              let radioInputs = fieldContainer.querySelectorAll('.collection-adder-radio');
              radioInputs.forEach(radio => radio.classList.add('error'));
            } else if (fieldType === 'checkbox') {
              let input = fieldContainer.querySelector('.collection-adder-input');
              input.classList.add('error');
            } else {
              // For other input types, populate the error message div
              if (errorDiv) {
                let simpleFieldError = fieldError.replace(/^Invalid [^:]+:/i, '');
                errorDiv.textContent = simpleFieldError;
              }
            }
          }
        }
      } else {
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
    updateConsumerElements.call(this, consumers, outputValue, providerTemplate, selfName);
    updateConsumerElements.call(this, oppositeOutcomeConsumers, '', null, selfName);
  }

  reset() {
    let form = this.querySelector('.collection-adder-form');
    if (form) {
      form.reset();
    }
  }

  render() {
    let submitButtonLabel = this.getAttribute('submit-button-label');
    if (submitButtonLabel == null) {
      submitButtonLabel = 'Submit';
    }
    let hideSubmitButton = this.hasAttribute('hide-submit-button');
    let collectionType = this.getAttribute('collection-type');
    let {
      fieldNames,
      fieldTypes
    } = convertStringToFieldParams(this.getAttribute('collection-fields'));

    this.fieldTypes = fieldTypes;

    let {
      fieldValues: modelFieldLabels
    } = convertStringToFieldParams(this.getAttribute('field-labels'));

    let {
      fieldValues: optionLabels
    } = convertStringToFieldParams(this.getAttribute('option-labels'));

    let modelValues = this.getAttribute('model-values');
    let {
      fieldNames: modelFieldNames
    } = convertStringToFieldParams(modelValues);

    let autocapitalize = this.getAttribute('autocapitalize');
    let autocorrect = this.getAttribute('autocorrect');

    let extraAttributesString = `${
      autocapitalize ? ` autocapitalize="${autocapitalize}"` : ''
    }${
      autocorrect ? ` autocorrect="${autocorrect}"` : ''
    }`;

    if (this.collection) this.collection.destroy();

    this.collection = new AGCollection({
      socket: this.socket,
      type: collectionType,
      fields: [ ...new Set([ ...fieldNames, ...modelFieldNames ]) ],
      writeOnly: true
    });

    let items = [];
    for (let field of fieldNames) {
      let inputType = fieldTypes[field];
      let inputTypeParts = inputType.match(this.inputTypeWithParamsRegExp);
      let inputTypeParams;
      if (inputTypeParts) {
        inputType = inputTypeParts[1];
        inputTypeParams = inputTypeParts[3] ? inputTypeParts[3].split(',') : [];
      }
      let inputLabel = modelFieldLabels[field] == null ? field : modelFieldLabels[field];
      let optionLabel = optionLabels[field] == null ? 'Options' : optionLabels[field];
      if (inputType === 'checkbox') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <label>
              ${
                inputLabel
              }
              <input class="collection-adder-input" type="${
                inputType
              }" name="${
                field
              }" />
            </label>
          </div>`
        );
      } else if (inputType === 'select') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <label>
              ${
                inputLabel
              }
              <select name="${field}" class="collection-adder-input collection-adder-select">
                <option value="" selected disabled hidden>${optionLabel}</option>
                ${inputTypeParams.map(param => `<option value="${param}">${param}</option>`).join('')}
              </select>
            </label>
          </div>`
        );
      } else if (inputType === 'text-select') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <div class="collection-adder-select-text-row">
              <input class="collection-adder-input" type="text" name="${
                field
              }" placeholder="${
                inputLabel
              }"${extraAttributesString} />
              <select class="collection-adder-select">
                <option value="" selected disabled hidden>${optionLabel}</option>
                ${inputTypeParams.map(param => `<option value="${param}">${param}</option>`).join('')}
              </select>
            </div>
          </div>`
        );
      } else if (inputType === 'radio') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <div>
              ${
                inputLabel
              }
              ${
                inputTypeParams.map(
                  param => (
                    `<label>
                      <input class="collection-adder-radio" type="${
                        inputType
                      }" name="${
                        field
                      }" value=${
                        param
                      } />
                      ${param}
                    </label>`
                  )
                ).join('')
              }
            </div>
          </div>`
        );
      } else if (inputType === 'textarea') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <textarea class="collection-adder-input" name="${
              field
            }" placeholder="${
              inputLabel
            }"${extraAttributesString}></textarea>
          </div>`
        );
      } else if (inputType === 'file') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <input class="collection-adder-input" type="${
              inputType
            }" name="${
              field
            }"${extraAttributesString} />
          </div>`
        );
      } else if (inputType === 'number') {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <input class="collection-adder-input" type="${
              inputType
            }" name="${
              field
            }" placeholder="${
              inputLabel
            }" step="any"${extraAttributesString} />
          </div>`
        );
      } else {
        items.push(
          `<div class="collection-adder-field-container" data-field="${field}">
            <div class="collection-adder-field-error-container error"></div>
            <input class="collection-adder-input" type="${
              inputType
            }" name="${
              field
            }" placeholder="${
              inputLabel
            }"${extraAttributesString} />
          </div>`
        );
      }
    }

    this.innerHTML = `
      <form class="collection-adder-form form-container">
        <div class="collection-adder-message-container"></div>
        <div class="collection-adder-form-content">
          ${items.join('')}
          ${hideSubmitButton ? '' : `<input type="submit" value="${submitButtonLabel}" />`}
        </div>
      </form>
    `;

    let textSelectRows = this.querySelectorAll('.collection-adder-select-text-row');
    for (let groupElement of textSelectRows) {
      let selectElement = groupElement.querySelector('select');
      selectElement.addEventListener('change', (event) => {
        let inputElement = groupElement.querySelector('input[type="text"]');
        inputElement.value = inputElement.value ? `${inputElement.value}, ${event.target.value}` : event.target.value;
        event.target.value = '';
      });
    }

    let form = this.querySelector('.collection-adder-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.submit();
    });
  }
}

window.customElements.define('collection-adder', CollectionAdder);
