import { SocketConsumer } from './socket.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import { getSafeHTML } from './utils.js';

const DEFAULT_RELOAD_DELAY = 0;

class CollectionBrowser extends SocketConsumer {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.handleShowModalEvent = (event) => {
      let modal = this.shadowRoot.querySelector('slot[name="modal"]').assignedNodes()[0];
      modal.show(event.detail.message, event.detail.callback);
    };

    this.handleCRUDCreateEvent = (event) => {
      if (this.collection) {
        this.collection.create(event.detail);
      }
    };

    this.handleCRUDDeleteEvent = (event) => {
      if (this.collection) {
        this.collection.delete(event.detail);
      }
    };

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
      this.renderList();
    };
  }

  connectedCallback() {
    this.isReady = true;
    this.socket = this.getSocket();
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.addEventListener('showModal', this.handleShowModalEvent);
    this.addEventListener('crudCreate', this.handleCRUDCreateEvent);
    this.addEventListener('crudDelete', this.handleCRUDDeleteEvent);
    this.addEventListener('goToPreviousPage', this.handleGoToPreviousPageEvent);
    this.addEventListener('goToNextPage', this.handleGoToNextPageEvent);
    this.addEventListener('goToPage', this.handleGoToPageEvent);
    this.render();
  }

  disconnectedCallback() {
    if (this.collection) this.collection.destroy();
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
    this.removeEventListener('showModal', this.handleShowModalEvent);
    this.removeEventListener('crudCreate', this.handleCRUDCreateEvent);
    this.removeEventListener('crudDelete', this.handleCRUDDeleteEvent);
    this.removeEventListener('goToPreviousPage', this.handleGoToPreviousPageEvent);
    this.removeEventListener('goToNextPage', this.handleGoToNextPageEvent);
    this.removeEventListener('goToPage', this.handleGoToPageEvent);
  }

  goToPreviousPage() {
    if (!this.collection) return;
    this.collection.fetchPreviousPage();
    this.setAttribute('collection-page-offset', this.collection.meta.pageOffset);
  }

  goToNextPage() {
    if (!this.collection) return;
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
      'collection-page-offset'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    if (this.collection && name === 'collection-page-offset') {
      let newOffset = Number(newValue);
      if (newOffset !== this.collection.meta.pageOffset) {
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

  renderList() {
    if (!this.collection || !this.collection.isLoaded) return;
    let itemTemplate = this.shadowRoot.querySelector('slot[name="item"]').assignedNodes()[0];
    if (!itemTemplate) return;
    let listNode = this.shadowRoot.querySelector('slot[name="list"]').assignedNodes()[0];// TODO 0000 rename list
    if (!listNode) return;
    let items = [];

    for (let modelItem of this.collection.value) {
      let itemString = itemTemplate.innerHTML;

      for (let [ field, value ] of Object.entries(modelItem)) {
        let regExp = new RegExp(`{{${this.collection.type}.${field}}}`, 'g');
        itemString = itemString.replace(regExp, getSafeHTML(value));
      }
      items.push(itemString);
    }
    let noItemTemplate = this.shadowRoot.querySelector('slot[name="no-item"]').assignedNodes()[0];
    if (noItemTemplate && !items.length) {
      listNode.innerHTML = noItemTemplate.innerHTML;
    } else {
      listNode.innerHTML = items.join('');
    }
  }

  render() {
    let collectionType = this.getAttribute('collection-type');
    let collectionFields = this.getAttribute('collection-fields');
    let collectionView = this.getAttribute('collection-view');
    let collectionPageSize = this.getAttribute('collection-page-size');
    let collectionViewParams = this.getAttribute('collection-view-params');
    let collectionPageOffset = this.getAttribute('collection-page-offset');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');
    let collectionReloadDelay = Number(
      this.getAttribute('collection-reload-delay') || DEFAULT_RELOAD_DELAY
    );
    let viewParams = Object.fromEntries(collectionViewParams.split(',').map((pair) => pair.split('=')));
    if (this.collection) this.collection.destroy();

    this.collection = new AGCollection({
      socket: this.socket,
      type: collectionType,
      fields: collectionFields.split(',').map(field => field.trim()),
      view: collectionView,
      viewParams,
      pageSize: Number(collectionPageSize || 10),
      pageOffset: Number(collectionPageOffset || 0),
      changeReloadDelay: collectionReloadDelay
    });
    // TODO 00000000000000000000 rename slot list to render-area or content similar more generic
    this.shadowRoot.innerHTML = `
      <slot name="item"></slot>
      <slot name="no-item"></slot>
      <slot name="list"></slot>
      <slot name="previous-page"></slot>
      <slot name="page-number"></slot>
      <slot name="next-page"></slot>
      <slot name="modal"></slot>
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
        this.renderList();
      }
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    })();

    (async () => {
      for await (let event of this.collection.listener('change')) {
        this.renderList();
        this.updatePageButtons();
      }
    })();

    if (!hideErrorLogs) {
      (async () => {
        for await (let { error } of this.collection.listener('error')) {
          console.error(
            `Collection browser encountered an error: ${error.message}`
          );
        }
      })();
    }
  }
}

window.customElements.define('collection-browser', CollectionBrowser);
