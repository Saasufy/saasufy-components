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
      'type',
      'placeholder',
      'consumers',
      'show-error-message',
      'model-type',
      'model-id',
      'model-field',
      'debounce-delay',
      'options',
      'height',
      'hide-error-logs'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.destroy();
    this.render();
  }

  triggerChange() {
    this.inputElement && this.inputElement.dispatchEvent(new Event('change'));
  }

  set value(newValue) {
    if (this.inputElement) {
      let oldValue = this.inputElement.value;
      this.inputElement.value = newValue;
      if (oldValue !== newValue) {
        this.triggerChange();
      }
    }
  }

  get value() {
    return (this.inputElement && this.inputElement.value) || '';
  }

  render() {
    this.innerHTML = '';
    let modelInstanceProperty = this.getAttribute('model-instance-property');
    let showErrorMessage = this.hasAttribute('show-error-message');
    let inputId = this.getAttribute('input-id');
    let inputList = this.getAttribute('list');
    let type = this.getAttribute('type') || 'text';
    let placeholder = this.getAttribute('placeholder');
    let modelType = this.getAttribute('model-type');
    let modelId = this.getAttribute('model-id');
    let modelField = this.getAttribute('model-field');
    let options = this.getAttribute('options');
    let height = this.getAttribute('height');
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

  syncInputElementWithModel(inputElement, model, fieldName, messageContainerElement) {
    if (model.isLoaded) {
      let consumers = this.getAttribute('consumers');
      let fieldValue = model.value[fieldName];
      if (inputElement.type === 'checkbox') {
        let checked = !!fieldValue;
        inputElement.checked = checked;
        updateConsumerElements(this.parentElement, consumers, checked);
      } else {
        let defaultValue = this.getAttribute('default-value') || '';
        inputElement.value = fieldValue == null ? defaultValue : fieldValue;
        updateConsumerElements(this.parentElement, consumers, inputElement.value);
      }
    }
    let stopSaving = this.saveInputElementOnEdit(inputElement, model, fieldName, messageContainerElement);
    let changeConsumer = model.listener('change').createConsumer();
    (async () => {
      for await (let event of changeConsumer) {
        let hasFocus = document.activeElement === this.inputElement;
        if (event.resourceField !== fieldName || (hasFocus && !event.isRemote)) continue;
        let consumers = this.getAttribute('consumers');
        let fieldValue = model.value[fieldName];
        if (inputElement.type === 'checkbox') {
          let checked = !!fieldValue;
          inputElement.checked = checked;
          updateConsumerElements(this.parentElement, consumers, checked);
        } else {
          let defaultValue = this.getAttribute('default-value') || '';
          inputElement.value = fieldValue == null ? defaultValue : fieldValue;
          updateConsumerElements(this.parentElement, consumers, inputElement.value);
        }
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
        try {
          if (inputElement.type === 'checkbox') {
            let checked = !!inputElement.checked;
            updateConsumerElements(this.parentElement, consumers, checked);
            await model.update(fieldName, checked);
            inputElement.classList.remove(errorStyleClass);
            inputElement.classList.add(successStyleClass);
            hideErrorMessage(fieldName);
            return;
          }
          if (event.target.value === '') {
            updateConsumerElements(this.parentElement, consumers, '');
            await model.delete(fieldName);
          } else {
            let targetValue = inputElement.type === 'number' ?
              Number(event.target.value) : event.target.value;
            updateConsumerElements(this.parentElement, consumers, targetValue);
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
    if (inputElement.type !== 'checkbox') {
      onInputKeyUp = async (event) => {
        debounce(async () => {
          try {
            if (event.target.value === '') {
              await model.delete(fieldName);
              updateConsumerElements(this.parentElement, consumers, '');
            } else {
              let targetValue = inputElement.type === 'number' ?
                Number(event.target.value) : event.target.value;
              updateConsumerElements(this.parentElement, consumers, targetValue);
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
