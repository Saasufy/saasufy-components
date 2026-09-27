class IfGroup extends HTMLElement {
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
      'show-content'
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

window.customElements.define('if-group', IfGroup);
