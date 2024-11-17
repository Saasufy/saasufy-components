import {
  debouncer,
  renderTemplate,
  updateConsumerElements,
  convertStringToFieldParams
} from './utils.js';

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
      'list',
      'type',
      'placeholder',
      'consumers',
      'debounce-delay',
      'options',
      'value',
      'height',
      'autocapitalize',
      'autocorrect',
      'input-id',
      'input-props'
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

  updateInputClassList(newValue) {
    if (this.inputElement.type === 'checkbox') {
      this.inputElement.classList.remove('empty-input');
      return;
    }
    if (newValue === '' || newValue == null) {
      this.inputElement.classList.add('empty-input');
    } else {
      this.inputElement.classList.remove('empty-input');
    }
  }

  set value(newValue) {
    if (this.inputElement) {
      let forceInitChange = this.forceTriggerChange;
      if (forceInitChange) {
        delete this.forceTriggerChange;
      }
      let skipInitChange = this.skipInitChange && !forceInitChange;
      delete this.skipInitChange;
      if (newValue && this.hasAttribute('computable-value')) {
        newValue = renderTemplate(newValue, null, null, true);
      }
      this.updateInputClassList(newValue);
      let oldValue;
      if (this.inputElement.type === 'checkbox') {
        oldValue = this.inputElement.checked;
        if (typeof newValue === 'string') {
          this.inputElement.checked = newValue !== 'false' && newValue !== '';
        } else {
          this.inputElement.checked = newValue;
        }
        if ((oldValue !== newValue || forceInitChange) && !skipInitChange) {
          this.triggerChange();
        }
        return;
      }
      oldValue = this.inputElement.value;
      this.inputElement.value = newValue;
      if ((oldValue !== newValue || forceInitChange) && !skipInitChange) {
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
    return this.inputElement.value || '';
  }

  render() {
    this.innerHTML = '';
    let inputId = this.getAttribute('input-id');
    let autocapitalize = this.getAttribute('autocapitalize');
    let autocorrect = this.getAttribute('autocorrect');
    let inputList = this.getAttribute('list');
    let type = this.getAttribute('type') || 'text';
    let placeholder = this.getAttribute('placeholder');
    let options = this.getAttribute('options');
    let height = this.getAttribute('height');
    let value = this.getAttribute('value') || '';
    let inputProps = this.getAttribute('input-props');
    let name = this.getAttribute('name');

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
      if (options != null) {
        let {
          fieldNames: optionNames,
          fieldValues: optionValues
        } = convertStringToFieldParams(options, true, true);

        let optionElements = optionNames
          .map((optionName) => {
            let optionValue = optionValues[optionName] || optionName;
            if (optionName === placeholder) {
              return `<option value="" selected class="select-default-option">${optionName}</option>`;
            }
            return `<option value="${optionValue}">${optionName}</option>`;
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
    if (name) {
      this.inputElement.setAttribute('name', name);
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

    if (type === 'select' && !value) {
      value = this.inputElement.value;
    }

    this.updateInputClassList(value);
    this.appendChild(this.inputElement);

    let destroyHandlers = this.updateConsumerElementsOnEdit();

    if (this.hasAttribute('force-init-change')) {
      this.forceTriggerChange = true;
      this.value = value;
    } else if (value) {
      if (this.hasAttribute('skip-init-change')) {
        this.skipInitChange = true;
      } else if (type === 'select') {
        this.forceTriggerChange = true;
      }
      this.value = value;
    }

    this.destroy = () => {
      destroyHandlers();
    };
  }

  updateConsumerElementsOnEdit() {
    let consumers = this.getAttribute('consumers');
    if (!consumers) return () => {};

    let inputElement = this.inputElement;

    let debounceDelay = this.getAttribute('debounce-delay');
    debounceDelay = debounceDelay ? Number(debounceDelay) : DEFAULT_DEBOUNCE_DELAY;
    let debounce = debouncer();

    let onInputChange = (event) => {
      this.updateInputClassList(event.target.value);
      debounce(async () => {
        let elementName = this.getAttribute('name');
        let providerTemplate = this.getAttribute('provider-template');
        if (event.target.value === this.lastValue) return;
        if (inputElement.type === 'checkbox') {
          let checked = !!inputElement.checked;
          this.lastValue = checked;

          updateConsumerElements(consumers, checked, providerTemplate, elementName);
          return;
        }
        this.lastValue = event.target.value;
        if (event.target.value === '') {
          updateConsumerElements(consumers, '', providerTemplate, elementName);
        } else {
          let targetValue = inputElement.type === 'number' ?
            Number(event.target.value) : event.target.value;
          updateConsumerElements(consumers, targetValue, providerTemplate, elementName);
        }
      }, debounceDelay);
    };
    inputElement.addEventListener('change', onInputChange);

    let onInputKeyUp;
    if (inputElement.type !== 'checkbox') {
      onInputKeyUp = async (event) => {
        this.updateInputClassList(event.target.value);
        if (this.hasAttribute('disable-instant-flush')) return;
        debounce(async () => {
          let elementName = this.getAttribute('name');
          let providerTemplate = this.getAttribute('provider-template');
          if (event.target.value === this.lastValue) return;
          this.lastValue = event.target.value;
          if (event.target.value === '') {
            updateConsumerElements(consumers, '', providerTemplate, elementName);
          } else {
            let targetValue = inputElement.type === 'number' ?
              Number(event.target.value) : event.target.value;
            updateConsumerElements(consumers, targetValue, providerTemplate, elementName);
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
