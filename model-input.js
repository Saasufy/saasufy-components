import { SocketConsumer } from './socket.js';
import { debouncer, updateConsumerElements } from './utils.js';
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
      'input-id',
      'list',
      'model-instance-property',
      'collection-instance-property',
      'bind-to-model',
      'bind-to-collection',
      'type',
      'placeholder',
      'consumers',
      'show-error-message',
      'model-type',
      'model-id',
      'model-field',
      'debounce-delay',
      'enable-rebound',
      'options',
      'height',
      'default-value',
      'value',
      'hide-error-logs',
      'autocapitalize',
      'autocorrect'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
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
      if (this.inputElement.type === 'checkbox') {
        let oldValue = this.inputElement.checked;
        this.inputElement.checked = newValue;
        if (oldValue !== newValue) {
          this.triggerChange();
        }
        return;
      }
      let oldValue = this.inputElement.value;
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
    this.innerHTML = '';
    let bindToModel = this.hasAttribute('bind-to-model');
    let modelInstanceProperty = this.getAttribute('model-instance-property');
    let bindToCollection = this.hasAttribute('bind-to-collection');
    let collectionInstanceProperty = this.getAttribute('collection-instance-property');
    let showErrorMessage = this.hasAttribute('show-error-message');
    let inputId = this.getAttribute('input-id');
    let autocapitalize = this.getAttribute('autocapitalize');
    let autocorrect = this.getAttribute('autocorrect');
    let inputList = this.getAttribute('list');
    let type = this.getAttribute('type') || 'text';
    let placeholder = this.getAttribute('placeholder');
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    let options = this.getAttribute('options');
    let height = this.getAttribute('height');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');
    let enableRebound = this.hasAttribute('enable-rebound');
    let currentNode = this.parentNode;
    let model;
    let isModelLocal = false;
    if (bindToCollection) {
      collectionInstanceProperty = 'collection';
    }
    if (collectionInstanceProperty) {
      let collection;
      while (currentNode) {
        collection = currentNode[collectionInstanceProperty];
        if (collection && collection.type !== modelType) {
          collection = null;
        }
        if (collection && (!collection.agModels || !collection.agModels[modelId])) {
          collection = null;
        }
        if (collection) break;
        currentNode = currentNode.getRootNode().host || currentNode.parentNode;
      }
      if (collection) {
        model = collection.agModels[modelId];
        if (!model.agFields[modelField]) {
          model.addField(modelField);
        }
      }
    }
    if (!model) {
      if (bindToModel) {
        modelInstanceProperty = 'model';
      }
      currentNode = this.parentNode;
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
            } element failed to bind to a model - Ensure that the element is nested inside a parent element which exposes a model instance of the same type with a ${modelField} field`
          );
        };
      } else {
        this.socket = this.getSocket();
        model = new AGModel({
          socket: this.socket,
          type: modelType,
          id: modelId,
          fields: [ modelField ],
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
        isModelLocal = true;
      }
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
    if (type === 'select') {
      if (options) {
        let optionElements = options
          .split(',')
          .map((option) => {
            return `<option value="${option}">${option}</option>`;
          })
          .join('');
          this.inputElement.innerHTML = optionElements;
      }
    } else if (elementType === 'input') {
      if (inputList) {
        this.inputElement.setAttribute('list', inputList)
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
    let errorMessageContainer = null;
    if (showErrorMessage) {
      errorMessageContainer = document.createElement('div');
      errorMessageContainer.classList.add('error-message-container');
      this.appendChild(errorMessageContainer);
    }
    this.appendChild(this.inputElement);
    let destroyInputSync = this.syncInputElementWithModel(this.inputElement, model, modelField, errorMessageContainer);
    this.destroy = () => {
      destroyInputSync();
      this.isLoadedConsumer && this.isLoadedConsumer.kill();
      if (isModelLocal) {
        model.destroy();
      }
    };
  }

  updateInputElement(inputElement, fieldValue) {
    let consumers = this.getAttribute('consumers');
    let providerTemplate = this.getAttribute('provider-template');
    if (inputElement.type === 'checkbox') {
      let checked = !!fieldValue;
      inputElement.checked = checked;
      updateConsumerElements(consumers, checked, providerTemplate);
    } else {
      let defaultValue = this.getAttribute('default-value') || '';
      inputElement.value = fieldValue == null ? defaultValue : fieldValue;
      updateConsumerElements(consumers, inputElement.value, providerTemplate);
    }
  }

  syncInputElementWithModel(inputElement, model, fieldName, messageContainerElement) {
    if (model.isLoaded) {
      let fieldValue = model.value[fieldName];
      this.updateInputElement(inputElement, fieldValue);
    }
    let stopSaving = this.saveInputElementOnEdit(inputElement, model, fieldName, messageContainerElement);
    let changeConsumer = model.listener('change').createConsumer();
    (async () => {
      for await (let event of changeConsumer) {
        let hasFocus = document.activeElement === this.inputElement;
        if (event.resourceField !== fieldName || (hasFocus && !event.isRemote)) continue;
        let fieldValue = model.value[fieldName];
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
      if (event.target.value === String(model.value[fieldName])) return;
      debounce(async () => {
        let providerTemplate = this.getAttribute('provider-template');
        try {
          if (inputElement.type === 'checkbox') {
            let checked = !!inputElement.checked;
            updateConsumerElements(consumers, checked, providerTemplate);
            await model.update(fieldName, checked);
            inputElement.classList.remove(errorStyleClass);
            inputElement.classList.add(successStyleClass);
            hideErrorMessage(fieldName);
            return;
          }
          if (event.target.value === '') {
            updateConsumerElements(consumers, '', providerTemplate);
            await model.delete(fieldName);
          } else {
            let targetValue = inputElement.type === 'number' ?
              Number(event.target.value) : event.target.value;
            updateConsumerElements(consumers, targetValue, providerTemplate);
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
    inputElement.addEventListener('change', onInputChange);

    let onInputKeyUp;
    if (inputElement.type !== 'checkbox' && inputElement.type !== 'select') {
      onInputKeyUp = async (event) => {
        debounce(async () => {
          let providerTemplate = this.getAttribute('provider-template');
          try {
            if (event.target.value === '') {
              await model.delete(fieldName);
              updateConsumerElements(consumers, '', providerTemplate);
            } else {
              let targetValue = inputElement.type === 'number' ?
                Number(event.target.value) : event.target.value;
              updateConsumerElements(consumers, targetValue, providerTemplate);
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
