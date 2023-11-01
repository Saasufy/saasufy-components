import { debouncer, updateConsumerElements } from './utils.js';

const DEFAULT_DEBOUNCE_DELAY = 800;

class InputProvider extends HTMLElement {
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
      'type',
      'placeholder',
      'consumers',
      'debounce-delay',
      'options',
      'value',
      'height'
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
    let inputId = this.getAttribute('input-id');
    let inputList = this.getAttribute('list');
    let type = this.getAttribute('type') || 'text';
    let placeholder = this.getAttribute('placeholder');
    let options = this.getAttribute('options');
    let height = this.getAttribute('height');
    let value = this.getAttribute('value') || '';

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

    this.appendChild(this.inputElement);

    let destroyHandlers = this.updateConsumerElementsOnEdit();

    if (value) {
      this.value = value;
    }
    this.destroy = () => {
      destroyHandlers();
    };
  }

  updateConsumerElementsOnEdit() {
    let consumers = this.getAttribute('consumers');
    if (!consumers) return;

    let inputElement = this.inputElement;

    let debounceDelay = this.getAttribute('debounce-delay');
    debounceDelay = debounceDelay ? Number(debounceDelay) : DEFAULT_DEBOUNCE_DELAY;
    let debounce = debouncer();

    let onInputChange = (event) => {
      debounce(async () => {
        if (event.target.value === this.lastValue) return;
        if (inputElement.type === 'checkbox') {
          let checked = !!inputElement.checked;
          this.lastValue = checked;
          updateConsumerElements(this.parentElement, consumers, checked);
          return;
        }
        this.lastValue = event.target.value;
        if (event.target.value === '') {
          updateConsumerElements(this.parentElement, consumers, '');
        } else {
          let targetValue = inputElement.type === 'number' ?
            Number(event.target.value) : event.target.value;
          updateConsumerElements(this.parentElement, consumers, targetValue);
        }
      }, debounceDelay);
    };
    inputElement.addEventListener('change', onInputChange);

    let onInputKeyUp;
    if (inputElement.type !== 'checkbox') {
      onInputKeyUp = async (event) => {
        debounce(async () => {
          if (event.target.value === this.lastValue) return;
          this.lastValue = event.target.value;
          if (event.target.value === '') {
            updateConsumerElements(this.parentElement, consumers, '');
          } else {
            let targetValue = inputElement.type === 'number' ?
              Number(event.target.value) : event.target.value;
            updateConsumerElements(this.parentElement, consumers, targetValue);
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

window.customElements.define('input-provider', InputProvider);
