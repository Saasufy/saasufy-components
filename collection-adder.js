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
      number: Number
    };
    this.fieldPartsRegExp = /("[^"]*"|'[^']*'|\([^)]*\)|[^,()"']+)+/g;
    this.inputTypeWithParamsRegExp = /^([^()]*)(\(([^)]*)\))?/;
    this.quotedContentRegExp = /^\s*["']?(.*?)["']?\s*$/;
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
      'model-values',
      'submit-button-label'
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

  render() {
    let submitButtonLabel = this.getAttribute('submit-button-label');
    if (submitButtonLabel == null) {
      submitButtonLabel = 'Submit';
    }
    let collectionType = this.getAttribute('collection-type');
    let {
      fieldNames,
      fieldTypes
    } = this.getFieldDetails(this.getAttribute('collection-fields'));

    let {
      fieldNames: modelFieldNames,
      fieldValues: modelFieldValues
    } = this.getFieldDetails(this.getAttribute('model-values'));

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
      if (inputType === 'checkbox') {
        items.push(
          `<label>
            ${
              field
            }
            <input class="collection-adder-input" type="${
              inputType
            }" name="${
              field
            }" />
          </label>`
        );
      } else if (inputType === 'text-select') {
        items.push(
          `<div class="collection-adder-select-text-row">
            <input class="collection-adder-input" type="text" name="${
              field
            }" placeholder="${
              field
            }" />
            <select class="collection-adder-select">
              <option value="" selected disabled hidden>Options</option>
              ${inputTypeParams.map(param => `<option value="${param}">${param}</option>`)}
            </select>
          </div>`
        );
      } else if (inputType === 'textarea') {
        items.push(
          `<textarea class="collection-adder-input" name="${
            field
          }" placeholder="${
            field
          }"></textarea>`
        );
      } else {
        items.push(
          `<input class="collection-adder-input" type="${
            inputType
          }" name="${
            field
          }" placeholder="${
            field
          }" />`
        );
      }
    }

    this.innerHTML = `
      <form class="collection-adder-form form-container">
        <div class="collection-adder-message-container"></div>
        <div class="collection-adder-form-content">
          ${items.join('')}
          <input type="submit" value="${submitButtonLabel}" />
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

    let messageContainer = this.querySelector('.collection-adder-message-container');

    let form = this.querySelector('.collection-adder-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      messageContainer.classList.remove('success');
      messageContainer.classList.remove('error');
      messageContainer.textContent = '';

      let newModelData = {
        ...modelFieldValues,
        ...Object.fromEntries(
          [...event.target.querySelectorAll('.collection-adder-input')]
            .filter(input => input.value !== '')
            .map((input) => {
              let fieldType = fieldTypes[input.name];
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
        form.reset();
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
    });
  }
}

window.customElements.define('collection-adder', CollectionAdder);
