import { debouncer } from './utils.js';

const DEBOUNCE_DELAY = 0;

class IfGroup extends HTMLElement {
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

      let showContent = this.getAttribute('show-content');
      if (
        !showContent ||
        showContent === 'false' ||
        showContent === 'null' ||
        showContent === 'undefined'
      ) return;

      let contentSlot = this.shadowRoot.querySelector('slot[name="content"]');
      let contentNodes = contentSlot.assignedNodes();
      if (!contentNodes.length) return;

      let contentList = [];
      for (let node of contentNodes) {
        contentList.push(node.innerHTML);
      }
      viewportNode.innerHTML = contentList.join('');
    };

    this.debouncedProcessTemplates = debounce(this.processTemplates, DEBOUNCE_DELAY);
    this.shadowRoot.addEventListener('slotchange', this.debouncedProcessTemplates);
  }

  static get observedAttributes() {
    return [
      'show-content'
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

window.customElements.define('if-group', IfGroup);
