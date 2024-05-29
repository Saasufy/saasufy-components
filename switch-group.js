import { debouncer } from './utils.js';

const DEBOUNCE_DELAY = 0;

class SwitchGroup extends HTMLElement {
  constructor() {
    super();
    this.isReady = false;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '<slot name="content"></slot><slot name="viewport"></slot>';

    let debounce = debouncer();

    this.processTemplates = () => {
      let viewportSlot = this.shadowRoot.querySelector('slot[name="viewport"]');
      let viewportNode = viewportSlot.assignedNodes()[0];
      if (!viewportNode) return;

      let showCases = this.getAttribute('show-cases');
      if (!showCases) return;

      let caseEntries = showCases.split(',').map((caseString) => {
        let sanitizedCase = caseString.trim();
        return sanitizedCase.split('=').map(part => part.trim());
      });

      let contentList = [];

      for (let [ caseName, showContent ] of caseEntries) {
        if (
          !showContent ||
          showContent === 'false' ||
          showContent === 'null' ||
          showContent === 'undefined'
        ) continue;

        let contentSlot = this.shadowRoot.querySelector('slot[name="content"]');

        let contentElements = contentSlot.assignedElements().filter((element) => {
          return element.getAttribute('name') === caseName;
        });

        for (let element of contentElements) {
          contentList.push(element.innerHTML);
        }
      }

      viewportNode.innerHTML = contentList.join('');
    };

    this.debouncedProcessTemplates = debounce(this.processTemplates, DEBOUNCE_DELAY);
    this.shadowRoot.addEventListener('slotchange', this.debouncedProcessTemplates);
  }

  static get observedAttributes() {
    return [
      'show-cases'
    ];
  }

  attributeChangedCallback() {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    this.processTemplates();
  }

  connectedCallback() {
    this.isReady = true;
  }
}

window.customElements.define('switch-group', SwitchGroup);
