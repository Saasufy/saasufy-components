import { SocketConsumer } from './socket.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';

class CollectionAdder extends SocketConsumer {
  constructor(options) {
    super();
    this.options = options || {};

    this.typeCastFunctions = {
      text: String,
      textarea: String,
      checkbox: Boolean,
      number: Number,
      radio: String,
      select: String,
      'text-select': String
    };
    this.fieldPartsRegExp = /("[^"]*"|'[^']*'|\([^)]*\)|[^,()"']+)+/g;
    this.inputTypeWithParamsRegExp = /^([^()]*)(\(([^)]*)\))?/;
    this.quotedContentRegExp = /^\s*["']?(.*?)["']?\s*$/;
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
      'success-message'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  getTypeCastFunction(type) {
    return this.typeCastFunctions[type] || ((value) => value);
  }

  getFieldDetails(string) {
    let parts = ((string || '').match(this.fieldPartsRegExp) || []).map(field => field.trim());
    let fieldTypeValues = parts.map((part) => {
      let subParts = part.split('=');
      let nameType = (subParts[0] || '').split(':');
      let name = nameType[0];
      let type = nameType[1] || 'text';
      let value = subParts.slice(1).join('=').replace(this.quotedContentRegExp, '$1');
      return {
        name,
        type,
        value
      }
    });
    let fieldNames = fieldTypeValues.map(item => item.name);
    let fieldTypes = Object.fromEntries(
      fieldTypeValues.map(item => [ item.name, item.type ])
    );
    let fieldValues = Object.fromEntries(
      fieldTypeValues.map(
        (item) => {
          let type = fieldTypes[item.name];
          let Type = this.getTypeCastFunction(type);
          return [ item.name, Type(item.value) ];
        }
      )
    );
    return {
      fieldNames,
      fieldTypes,
      fieldValues
    };
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

    let radioInputs = [...this.querySelectorAll('.collection-adder-radio')];
    let radioData = {};
    for (let radio of radioInputs) {
      if (radio.checked) {
        radioData[radio.name] = radio.value;
      }
    }

    let newModelData = {
      ...this.modelFieldValues,
      ...radioData,
      ...Object.fromEntries(
        [...this.querySelectorAll('.collection-adder-input')]
          .filter(input => input.value !== '')
          .map((input) => {
            let fieldType = this.fieldTypes[input.name];
            let Type = this.getTypeCastFunction(fieldType);
            let value;
            if (fieldType === 'checkbox') {
              value = input.checked;
            } else {
              value = input.value;
            }
            return [ input.name, Type(value) ];
          })
      )
    };

    try {
      await this.collection.create(newModelData);
      messageContainer.classList.add('success');
      messageContainer.classList.remove('error');
      this.dispatchEvent(
        new CustomEvent('success', {
          detail: newModelData
        })
      );
      let form = this.querySelector('.collection-adder-form');
      form.reset();
      if (successMessage) {
        messageContainer.textContent = successMessage;
      } else {
        messageContainer.textContent = '';
      }
    } catch (error) {
      messageContainer.classList.add('error');
      messageContainer.classList.remove('success');
      messageContainer.textContent = error.message;
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: error
        })
      );
    }
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
    } = this.getFieldDetails(this.getAttribute('collection-fields'));

    this.fieldTypes = fieldTypes;

    let {
      fieldNames: modelFieldNames,
      fieldValues: modelFieldValues
    } = this.getFieldDetails(this.getAttribute('model-values'));

    let {
      fieldValues: modelFieldLabels
    } = this.getFieldDetails(this.getAttribute('field-labels'));

    let {
      fieldValues: optionLabels
    } = this.getFieldDetails(this.getAttribute('option-labels'));

    this.modelFieldValues = modelFieldValues;

    if (this.collection) this.collection.destroy();

    this.collection = new AGCollection({
      socket: this.socket,
      type: collectionType,
      fields: [...new Set([ ...fieldNames, ...modelFieldNames ])],
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
          `<label>
            ${
              inputLabel
            }
            <input class="collection-adder-input" type="${
              inputType
            }" name="${
              field
            }" />
          </label>`
        );
      } else if (inputType === 'select') {
        items.push(
          `<label>
            ${
              inputLabel
            }
            <select name="${field}" class="collection-adder-input collection-adder-select">
              <option value="" selected disabled hidden>${optionLabel}</option>
              ${inputTypeParams.map(param => `<option value="${param}">${param}</option>`).join('')}
            </select>
          </label>`
        );
      } else if (inputType === 'text-select') {
        items.push(
          `<div class="collection-adder-select-text-row">
            <input class="collection-adder-input" type="text" name="${
              field
            }" placeholder="${
              inputLabel
            }" />
            <select class="collection-adder-select">
              <option value="" selected disabled hidden>${optionLabel}</option>
              ${inputTypeParams.map(param => `<option value="${param}">${param}</option>`).join('')}
            </select>
          </div>`
        );
      } else if (inputType === 'radio') {
        items.push(
          `
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
            }`
        );
      } else if (inputType === 'textarea') {
        items.push(
          `<textarea class="collection-adder-input" name="${
            field
          }" placeholder="${
            inputLabel
          }"></textarea>`
        );
      } else {
        items.push(
          `<input class="collection-adder-input" type="${
            inputType
          }" name="${
            field
          }" placeholder="${
            inputLabel
          }" />`
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
