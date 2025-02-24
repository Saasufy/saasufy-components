import { SocketConsumer } from './socket.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import { renderTemplate, convertStringToFieldParams } from './utils.js';

const DEFAULT_RELOAD_DELAY = 0;

class CollectionReducer extends SocketConsumer {
  constructor() {
    super();
    this.isReady = false;
    this.isStale = true;
    this.activeLoader = null;
    this.attachShadow({ mode: 'open' });

    this.handleGoToPreviousPageEvent = () => {
      this.goToPreviousPage();
    };

    this.handleGoToNextPageEvent = () => {
      this.goToNextPage();
    };

    this.handleGoToPageEvent = (event) => {
      this.goToPage((event.detail || {}).offset);
    };

    this.handleSlotChangeEvent = () => {
      this.renderReduction();
    };
  }

  connectedCallback() {
    this.isReady = true;
    this.socket = this.getSocket();
    this.activeLoader = null;
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.addEventListener('goToPreviousPage', this.handleGoToPreviousPageEvent);
    this.addEventListener('goToNextPage', this.handleGoToNextPageEvent);
    this.addEventListener('goToPage', this.handleGoToPageEvent);
    this.render();
  }

  disconnectedCallback() {
    if (this.collection) this.collection.destroy();
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
    this.removeEventListener('goToPreviousPage', this.handleGoToPreviousPageEvent);
    this.removeEventListener('goToNextPage', this.handleGoToNextPageEvent);
    this.removeEventListener('goToPage', this.handleGoToPageEvent);
  }

  goToPreviousPage() {
    if (!this.collection) return;
    this.isStale = true;
    this.collection.fetchPreviousPage();
    this.setAttribute('collection-page-offset', this.collection.meta.pageOffset);
  }

  goToNextPage() {
    if (!this.collection) return;
    this.isStale = true;
    this.collection.fetchNextPage();
    this.setAttribute('collection-page-offset', this.collection.meta.pageOffset);
  }

  goToPage(offset) {
    this.setAttribute('collection-page-offset', offset);
  }

  static get observedAttributes() {
    return [
      'collection-type',
      'collection-fields',
      'collection-view',
      'collection-view-params',
      'collection-page-size',
      'collection-page-offset',
      'collection-get-count',
      'max-show-loader',
      'type-alias'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    if (this.collection && name === 'collection-page-offset') {
      let newOffset = Number(newValue);
      if (newOffset !== this.collection.meta.pageOffset) {
        this.isStale = true;
        this.collection.fetchPage(newOffset);
      }
      this.updatePageNumberElements();
      this.updatePageButtons();
    } else {
      this.render();
    }
  }

  updatePageNumberElements() {
    if (!this.collection) return;
    let currentPageElements = this.shadowRoot.querySelector('slot[name="page-number"]').assignedElements();
    let pageNumber = Math.floor(this.collection.meta.pageOffset / this.collection.meta.pageSize + 1);
    for (let element of currentPageElements) {
      if (element.nodeName === 'INPUT') {
        element.value = pageNumber;
      } else {
        element.innerHTML = pageNumber;
      }
    }
  }

  updatePageButtons() {
    if (this.collection) {
      let previousPageElements = this.shadowRoot.querySelector('slot[name="previous-page"]').assignedElements();
      let nextPageElements = this.shadowRoot.querySelector('slot[name="next-page"]').assignedElements();
      if (this.collection.meta.pageOffset <= 0) {
        for (let element of previousPageElements) {
          element.setAttribute('disabled', '');
        }
      } else {
        for (let element of previousPageElements) {
          element.removeAttribute('disabled');
        }
      }
      if (this.collection.meta.isLastPage) {
        for (let element of nextPageElements) {
          element.setAttribute('disabled', '');
        }
      } else {
        for (let element of nextPageElements) {
          element.removeAttribute('disabled');
        }
      }
    }
  }

  renderError(error) {
    let viewportSlot = this.shadowRoot.querySelector('slot[name="viewport"]');
    if (!viewportSlot) return;

    let viewportNode = viewportSlot.assignedNodes()[0];
    if (!viewportNode) return;

    this.activeLoader = null;

    let errorTemplate = this.shadowRoot.querySelector('slot[name="error"]').assignedNodes()[0];
    if (errorTemplate) {
      let type = this.getAttribute('type-alias') || this.getAttribute('collection-type');
      this.setCurrentState({ [`$${type}`]: { error } });
      let errorItemString = renderTemplate(
        errorTemplate.innerHTML,
        this.getStateContext(),
        this.socket
      );
      viewportNode.innerHTML = errorItemString;
    }
  }

  renderReduction() {
    let viewportSlot = this.shadowRoot.querySelector('slot[name="viewport"]');
    if (!viewportSlot) return;

    let viewportNode = viewportSlot.assignedNodes()[0];
    if (!viewportNode) return;

    let loaderSlot = this.shadowRoot.querySelector('slot[name="loader"]');
    let loaderNode = loaderSlot.assignedNodes()[0];

    if (!this.collection || !this.collection.isLoaded) {
      if (
        loaderNode &&
        this.activeLoader !== loaderNode &&
        (this.isStale || this.hasAttribute('max-show-loader'))
      ) {
        this.activeLoader = loaderNode;
        viewportNode.innerHTML = loaderNode.innerHTML;
      }
      return;
    }
    this.isStale = false;
    this.activeLoader = null;

    let itemTemplate = this.shadowRoot.querySelector('slot[name="item"]').assignedNodes()[0];
    let noItemTemplate = this.shadowRoot.querySelector('slot[name="no-item"]').assignedNodes()[0];

    if (noItemTemplate && !this.collection.value.length) {
      viewportNode.innerHTML = noItemTemplate.innerHTML;
    } else if (itemTemplate) {
      let type = this.getAttribute('type-alias') || this.collection.type;
      this.setCurrentState({ [type]: this.collection.value, [`$${type}`]: this.collection.meta });
      let itemString = renderTemplate(
        itemTemplate.innerHTML,
        this.getStateContext(),
        this.socket
      );
      viewportNode.innerHTML = itemString;
    }
  }

  render() {
    if (
      !this.hasAttribute('collection-type') ||
      !this.hasAttribute('collection-fields') ||
      !this.hasAttribute('collection-view') ||
      !this.hasAttribute('collection-view-params')
    ) {
      return;
    };
    let collectionType = this.getAttribute('collection-type');
    let collectionFields = this.getAttribute('collection-fields') || '';
    let collectionView = this.getAttribute('collection-view') || 'defaultView';
    let collectionViewParams = this.getAttribute('collection-view-params') || '';
    let collectionPageSize = this.getAttribute('collection-page-size');
    let collectionPageOffset = this.getAttribute('collection-page-offset');
    let collectionGetCount = this.hasAttribute('collection-get-count');

    let collectionReloadDelay = Number(
      this.getAttribute('collection-reload-delay') || DEFAULT_RELOAD_DELAY
    );
    let { fieldValues: viewParams } = convertStringToFieldParams(collectionViewParams);

    if (this.collection) this.collection.destroy();
    this.isStale = true;

    this.collection = new AGCollection({
      socket: this.socket,
      type: collectionType,
      fields: collectionFields.split(',').map(field => field.trim()).filter(field => field),
      view: collectionView,
      viewParams,
      pageSize: Number(collectionPageSize || 10),
      pageOffset: Number(collectionPageOffset || 0),
      changeReloadDelay: collectionReloadDelay,
      getCount: collectionGetCount
    });

    this.shadowRoot.innerHTML = `
      <slot name="loader"></slot>
      <slot name="item"></slot>
      <slot name="no-item"></slot>
      <slot name="error"></slot>
      <slot name="viewport"></slot>
      <slot name="previous-page"></slot>
      <slot name="page-number"></slot>
      <slot name="next-page"></slot>
    `;

    let previousPageSlot = this.shadowRoot.querySelector('slot[name="previous-page"]');
    previousPageSlot.addEventListener('click', () => {
      this.goToPreviousPage();
    });

    let nextPageSlot = this.shadowRoot.querySelector('slot[name="next-page"]');
    nextPageSlot.addEventListener('click', () => {
      this.goToNextPage();
    });

    this.updatePageNumberElements();
    this.updatePageButtons();

    (async () => {
      await this.collection.listener('load').once();
      if (!this.collection.value.length) {
        this.renderReduction();
      }
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    })();

    (async () => {
      for await (let event of this.collection.listener('change')) {
        this.renderReduction();
        this.updatePageButtons();
      }
    })();

    (async () => {
      for await (let { error } of this.collection.listener('error')) {
        let hideErrorLogs = this.hasAttribute('hide-error-logs');
        if (!hideErrorLogs) {
          console.error(
            `Collection reducer encountered an error: ${error.message}`
          );
        }
        this.renderError(error);
      }
    })();
  }
}

window.customElements.define('collection-reducer', CollectionReducer);
