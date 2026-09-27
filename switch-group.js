class SwitchGroup extends HTMLElement {
  constructor() {
    super();
    this.isReady = false;
    this.renderPending = false;
    this.lastViewportNode = null;
    this.lastRenderedContent = null;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '<slot name="content"></slot><slot name="viewport"></slot>';

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

      let content = contentList.join('');

      // Rewriting innerHTML with identical markup recreates the nodes, which loses
      // decoded images, focus and scroll position; greedy-refresh forces that reset.
      if (
        !this.hasAttribute('greedy-refresh') &&
        viewportNode === this.lastViewportNode &&
        content === this.lastRenderedContent
      ) return;

      this.lastViewportNode = viewportNode;
      this.lastRenderedContent = content;

      viewportNode.innerHTML = content;
    };

    // Coalescing on a microtask keeps the write ahead of the next paint; deferring
    // with a timeout lets the browser paint the empty viewport first, which flickers.
    this.debouncedProcessTemplates = () => {
      if (this.renderPending) return;
      this.renderPending = true;
      queueMicrotask(() => {
        this.renderPending = false;
        this.processTemplates();
      });
    };

    this.shadowRoot.addEventListener('slotchange', this.debouncedProcessTemplates);
  }

  static get observedAttributes() {
    return [
      'show-cases'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
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
