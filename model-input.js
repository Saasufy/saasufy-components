import { SocketConsumer } from './socket.js';
import {
  debouncer,
  updateConsumerElements,
  convertStringToFieldParams,
  convertStringToFieldTypeValues,
  formatError
} from './utils.js';
import AGModel from '/node_modules/ag-model/ag-model.js';

class ModelInput extends SocketConsumer {
  constructor() {
    super();
    this.isReady = false;
    this.inputElement = null;
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
      'list',
      'socket-instance-property',
      'type',
      'placeholder',
      'accept',
      'consumers',
      'show-error-message',
      'model-type',
      'model-id',
      'model-field',
      'slice-to',
      'debounce-delay',
      'enable-rebound',
      'options',
      'height',
      'default-value',
      'value',
      'hide-error-logs',
      'autocapitalize',
      'autocorrect',
      'input-id',
      'input-props',
      'ignore-invalid-selection'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    if (name === 'value') {
      this.value = newValue;
    } else {
      this.destroy();
      this.render();
    }
  }

  triggerChange() {
    this.inputElement && this.inputElement.dispatchEvent(new Event('change'));
  }

  set value(newValue) {
    if (this.inputElement) {
      if (newValue && this.hasAttribute('computable-value')) {
        newValue = renderTemplate(newValue, null, null, true);
      }
      let oldValue;
      if (this.inputElement.type === 'checkbox') {
        oldValue = this.inputElement.checked;
        if (typeof newValue === 'string') {
          this.inputElement.checked = newValue !== 'false' && newValue !== '';
        } else {
          this.inputElement.checked = newValue;
        }
        if (oldValue !== newValue) {
          this.triggerChange();
        }
        return;
      }
      oldValue = this.inputElement.value;
      this.inputElement.value = newValue;
      if (oldValue !== newValue) {
        this.triggerChange();
      }
    }
  }

  get value() {
    if (!this.inputElement) {
      return '';
    }
    if (this.inputElement.type === 'checkbox') {
      return this.inputElement.checked;
    }
    return this.inputElement.value;
  }

  render() {
    if (
      !this.hasAttribute('model-type') ||
      !this.hasAttribute('model-id') ||
      !this.hasAttribute('model-field')
    ) {
      return;
    };
    this.innerHTML = '';
    let socketInstanceProperty = this.getAttribute('socket-instance-property');
    let showErrorMessage = this.hasAttribute('show-error-message');
    let inputId = this.getAttribute('input-id');
    let autocapitalize = this.getAttribute('autocapitalize');
    let autocorrect = this.getAttribute('autocorrect');
    let inputList = this.getAttribute('list');
    let type = this.getAttribute('type') || 'text';
    let placeholder = this.getAttribute('placeholder');
    let accept = this.getAttribute('accept');
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    let sliceTo = this.getAttribute('slice-to');
    let options = this.getAttribute('options');
    let height = this.getAttribute('height');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');
    let enableRebound = this.hasAttribute('enable-rebound');
    let inputProps = this.getAttribute('input-props');
    let hasConsumers = this.hasAttribute('consumers');
    let writeOnly = type === 'file' && !hasConsumers;

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

    let modelFieldList = writeOnly ? [] : [ modelField ];

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
      fields: modelFieldList,
      fieldTransformations,
      enableRebound
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
    let elementType;
    if (type === 'select') {
      elementType = 'select';
    } else if (type === 'textarea') {
      elementType = 'textarea';
    } else {
      elementType = 'input';
    }
    this.inputElement = document.createElement(elementType);
    let optionList = null;
    if (type === 'select') {
      if (options != null) {
        let fieldTypeValues = convertStringToFieldTypeValues(options, true, true);
        let optionElements = fieldTypeValues
          .map((option) => {
            if (option.field === placeholder) {
              return `<option value="" selected class="select-default-option">${option.field}</option>`;
            }
            return `<option value="${option.value}">${option.field}</option>`;
          })
          .join('');
        this.inputElement.innerHTML = optionElements;
      }
    } else if (elementType === 'input') {
      if (inputList) {
        this.inputElement.setAttribute('list', inputList);
      }
      this.inputElement.type = type;
    }
    if (height) {
      this.inputElement.style.height = height;
    }
    if (inputId) {
      this.inputElement.setAttribute('id', inputId);
    }
    if (autocapitalize) {
      this.inputElement.setAttribute('autocapitalize', autocapitalize);
    }
    if (autocorrect) {
      this.inputElement.setAttribute('autocorrect', autocorrect);
    }
    if (placeholder) {
      this.inputElement.setAttribute('placeholder', placeholder);
    }
    if (accept) {
      this.inputElement.setAttribute('accept', accept);
    }
    if (inputProps) {
      let {
        fieldNames: attrNames,
        fieldValues: attrValues
      } = convertStringToFieldParams(inputProps);
      for (let attr of attrNames) {
        this.inputElement.setAttribute(attr, attrValues[attr]);
      }
    }
    let errorMessageContainer = null;
    if (showErrorMessage) {
      errorMessageContainer = document.createElement('div');
      errorMessageContainer.classList.add('error-message-container');
      this.appendChild(errorMessageContainer);
    }
    this.appendChild(this.inputElement);
    let destroyInputSync = this.syncInputElementWithModel(this.inputElement, model, modelField, errorMessageContainer, optionList);
    this.destroy = () => {
      destroyInputSync();
      this.isLoadedConsumer && this.isLoadedConsumer.kill();
      model.destroy();
    };
  }

  updateInputElement(inputElement, fieldValue) {
    let consumers = this.getAttribute('consumers');
    let providerTemplate = this.getAttribute('provider-template');
    if (inputElement.type === 'checkbox') {
      let checked = !!fieldValue;
      inputElement.checked = checked;
      updateConsumerElements(consumers, checked, providerTemplate, this.getAttribute('name'));
    } else {
      let defaultValue = this.getAttribute('default-value') || '';
      let elementValue = fieldValue == null ? defaultValue : fieldValue;
      if (inputElement.type !== 'file') {
        inputElement.value = elementValue;
      }
      updateConsumerElements(consumers, elementValue, providerTemplate, this.getAttribute('name'));
    }
  }

  verifyValue(fieldValue, optionList, inputElement, messageContainerElement) {
    if (
      optionList &&
      fieldValue != null &&
      !optionList.includes(fieldValue) &&
      !this.hasAttribute('ignore-invalid-selection')
    ) {
      inputElement.classList.add('error');
      inputElement.classList.remove('success');
      if (messageContainerElement) {
        messageContainerElement.textContent = 'Invalid selection';
        messageContainerElement.classList.add('error');
        messageContainerElement.classList.remove('hidden');
      }
    }
  }

  syncInputElementWithModel(inputElement, model, fieldName, messageContainerElement, optionList) {
    if (model.isLoaded) {
      let fieldValue = model.value[fieldName];
      this.verifyValue(fieldValue, optionList, inputElement, messageContainerElement);
      this.updateInputElement(inputElement, fieldValue);
    }
    let stopSaving = this.saveInputElementOnEdit(inputElement, model, fieldName, messageContainerElement);
    let changeConsumer = model.listener('change').createConsumer();
    (async () => {
      for await (let event of changeConsumer) {
        let hasFocus = document.activeElement === this.inputElement;
        if (event.resourceField !== fieldName || (hasFocus && !event.isRemote)) continue;
        let fieldValue = model.value[fieldName];
        this.verifyValue(fieldValue, optionList, inputElement, messageContainerElement);
        this.updateInputElement(inputElement, fieldValue);
      }
    })();
    return () => {
      stopSaving();
      changeConsumer.kill();
    };
  }

  saveInputElementOnEdit(inputElement, model, fieldName, messageContainerElement) {
    let errorStyleClass = 'error';
    let successStyleClass = 'success';
    let showErrorMessage = (fieldName, errorMessage) => {
      if (!messageContainerElement) return;
      messageContainerElement.textContent = errorMessage;
      messageContainerElement.classList.add(errorStyleClass);
      messageContainerElement.classList.remove('hidden');
    };

    let hideErrorMessage = (fieldName) => {
      if (!messageContainerElement) return;
      messageContainerElement.textContent = '';
      messageContainerElement.classList.remove(errorStyleClass);
      messageContainerElement.classList.add('hidden');
    };

    let consumers = this.getAttribute('consumers');
    let debounceDelay = this.getAttribute('debounce-delay');
    debounceDelay = debounceDelay ? Number(debounceDelay) : null;
    let debounce = debouncer();

    let onInputChange = (event) => {
      inputElement.classList.remove(successStyleClass);
      debounce(async () => {
        if (event.target.value === String(model.value[fieldName] ?? '')) return;
        let providerTemplate = this.getAttribute('provider-template');
        try {
          if (inputElement.type === 'checkbox') {
            let checked = !!inputElement.checked;
            updateConsumerElements(consumers, checked, providerTemplate, this.getAttribute('name'));
            await model.update(fieldName, checked);
            inputElement.classList.remove(errorStyleClass);
            inputElement.classList.add(successStyleClass);
            hideErrorMessage(fieldName);
            return;
          }
          let inputValue;
          if (inputElement.type === 'file') {
            if (inputElement.files && inputElement.files.length) {
              inputElement.focus();
              let reader = new FileReader();
              let readerLoadPromise = new Promise((resolve, reject) => {
                reader.addEventListener('load', () => {
                  resolve(reader.result);
                });
                reader.addEventListener('error', () => {
                  reject(new Error('Failed to read file'));
                });
              });
              reader.readAsDataURL(inputElement.files[0]);
              inputValue = await readerLoadPromise;
            } else {
              throw new Error('No file was selected');
            }
          } else {
            inputValue = event.target.value;
          }
          if (inputValue === '') {
            updateConsumerElements(consumers, '', providerTemplate, this.getAttribute('name'));
            await model.delete(fieldName);
          } else {
            let targetValue = inputElement.type === 'number' ?
              Number(inputValue) : inputValue;
            updateConsumerElements(consumers, targetValue, providerTemplate, this.getAttribute('name'));
            await model.update(fieldName, targetValue);
          }
          inputElement.classList.remove(errorStyleClass);
          inputElement.classList.add(successStyleClass);
          hideErrorMessage(fieldName);
        } catch (error) {
          inputElement.classList.add(errorStyleClass);
          inputElement.classList.remove(successStyleClass);
          showErrorMessage(fieldName, formatError(error));
        }
      }, debounceDelay);
    };
    inputElement.addEventListener('change', onInputChange);

    let onInputKeyUp;
    let inputType = inputElement.type;
    if (inputType !== 'checkbox' && inputType !== 'select' && inputType !== 'file') {
      onInputKeyUp = async (event) => {
        inputElement.classList.remove(successStyleClass);
        if (this.hasAttribute('disable-instant-flush')) return;
        debounce(async () => {
          if (event.target.value === String(model.value[fieldName] ?? '')) return;
          let providerTemplate = this.getAttribute('provider-template');
          try {
            if (event.target.value === '') {
              await model.delete(fieldName);
              updateConsumerElements(consumers, '', providerTemplate, this.getAttribute('name'));
            } else {
              let targetValue = inputType === 'number' ?
                Number(event.target.value) : event.target.value;
              updateConsumerElements(consumers, targetValue, providerTemplate, this.getAttribute('name'));
              await model.update(fieldName, targetValue);
            }
            inputElement.classList.remove(errorStyleClass);
            inputElement.classList.add(successStyleClass);
            hideErrorMessage(fieldName);
          } catch (error) {
            inputElement.classList.add(errorStyleClass);
            inputElement.classList.remove(successStyleClass);
            showErrorMessage(fieldName, error.message);
          }
        }, debounceDelay);
      };
      inputElement.addEventListener('keyup', onInputKeyUp);
    }
    return () => {
      inputElement.removeEventListener('change', onInputChange);
      onInputKeyUp && inputElement.removeEventListener('keyup', onInputKeyUp);
    };
  }
}

window.customElements.define('model-input', ModelInput);
