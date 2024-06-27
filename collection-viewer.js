import { SocketConsumer } from './socket.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import { renderTemplate, convertStringToFieldParams } from './utils.js';

const DEFAULT_RELOAD_DELAY = 0;

class CollectionViewer extends SocketConsumer {
  constructor() {
    super();
    this.isReady = false;
    this.isStale = true;
    this.activeLoader = null;
    this.attachShadow({ mode: 'open' });

    this.handleShowModalEvent = (event) => {
      event.stopPropagation();
      let modal = this.shadowRoot.querySelector('slot[name="modal"]').assignedNodes()[0];
      modal.show(event.detail.message, event.detail.callback);
    };

    this.handleCRUDCreateEvent = (event) => {
      event.stopPropagation();
      if (this.collection) {
        this.collection.create(event.detail);
        this.dispatchEvent(
          new CustomEvent('collectionCreate', {
            detail: {
              type: this.collection.type,
              value: event.detail
            },
            bubbles: true
          })
        );
      }
    };

    this.handleCRUDDeleteEvent = (event) => {
      event.stopPropagation();
      if (this.collection) {
        this.collection.delete(event.detail);
        this.dispatchEvent(
          new CustomEvent('collectionDelete', {
            detail: {
              type: this.collection.type,
              id: event.detail
            },
            bubbles: true
          })
        );
      }
    };

    this.handleGoToPreviousPageEvent = (event) => {
      event.stopPropagation();
      this.goToPreviousPage();
    };

    this.handleGoToNextPageEvent = (event) => {
      event.stopPropagation();
      this.goToNextPage();
    };

    this.handleGoToPageEvent = (event) => {
      event.stopPropagation();
      this.goToPage((event.detail || {}).offset);
    };

    this.handleSlotChangeEvent = (event) => {
      this.renderList();
    };
  }

  connectedCallback() {
    this.isReady = true;
    this.socket = this.getSocket();
    this.activeLoader = null;
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
      'collection-view-primary-fields',
      'collection-page-size',
      'collection-page-offset',
      'collection-get-count',
      'auto-reset-page-offset',
      'max-show-loader',
      'type-alias',
      'hide-error-logs'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    if (name === 'collection-page-offset') {
      if (this.collection) {
        let newOffset = Number(newValue);
        if (newOffset !== this.collection.meta.pageOffset) {
          this.isStale = true;
          this.collection.fetchPage(newOffset);
        }
        this.updatePageNumberElements();
        this.updatePageButtons();
      }
    } else {
      let autoResetPageOffset = this.hasAttribute('auto-reset-page-offset');
      if (autoResetPageOffset) {
        if (this.collection) this.collection.destroy();
        delete this.collection;
        this.goToPage(0);
      }
      this.render();
    }
  }

  updatePageNumberElements() {
    if (!this.collection) return;
    let currentPageElements = this.shadowRoot.querySelector('slot[name="page-number"]').assignedElements();
    let pageNumber = Math.floor(this.collection.meta.pageOffset / this.collection.meta.pageSize + 1);
    for (let element of currentPageElements) {
      if (element.nodeName === 'INPUT' || element.nodeName === 'MODEL-INPUT') {
        element.value = pageNumber;
      } else if (
        element.nodeName === 'INPUT-PROVIDER' ||
        element.nodeName === 'INPUT-COMBINER' ||
        element.nodeName === 'INPUT-TRANSFORMER'
      ) {
        element.setAttribute('value', pageNumber);
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
    let firstItemTemplate = this.shadowRoot.querySelector('slot[name="first-item"]').assignedNodes()[0];
    let lastItemTemplate = this.shadowRoot.querySelector('slot[name="last-item"]').assignedNodes()[0];

    let items = [];

    let type = this.getAttribute('type-alias') || this.collection.type;

    if (firstItemTemplate) {
      let itemString = renderTemplate(
        firstItemTemplate.innerHTML,
        { [`$${type}`]: this.collection.meta },
        this.socket
      );
      items.push(itemString);
    }
    if (noItemTemplate && !this.collection.value.length) {
      let itemString = renderTemplate(
        noItemTemplate.innerHTML,
        { [`$${type}`]: this.collection.meta },
        this.socket
      );
      items.push(itemString);
    } else if (itemTemplate) {
      for (let modelItem of this.collection.value) {
        let itemString = renderTemplate(
          itemTemplate.innerHTML,
          {
            [type]: modelItem,
            [`$${type}`]: this.collection.meta
          },
          this.socket
        );
        items.push(itemString);
      }
    }
    if (lastItemTemplate) {
      let itemString = renderTemplate(
        lastItemTemplate.innerHTML,
        { [`$${type}`]: this.collection.meta },
        this.socket
      );
      items.push(itemString);
    }
    viewportNode.innerHTML = items.join('');
  }

  render() {
    if (
      !this.hasAttribute('collection-type') ||
      !this.hasAttribute('collection-fields') ||
      !this.hasAttribute('collection-view') ||
      !this.getAttribute('collection-view-params')
    ) {
      return;
    };
    let collectionType = this.getAttribute('collection-type');
    let collectionFields = this.getAttribute('collection-fields') || '';
    let collectionView = this.getAttribute('collection-view') || 'defaultView';
    let collectionViewParams = this.getAttribute('collection-view-params') || '';
    let collectionViewPrimaryFields = this.getAttribute('collection-view-primary-fields');
    let collectionPageSize = this.getAttribute('collection-page-size');
    let collectionPageOffset = this.getAttribute('collection-page-offset');
    let collectionGetCount = this.hasAttribute('collection-get-count');
    let hideErrorLogs = this.hasAttribute('hide-error-logs');
    let collectionReloadDelay = Number(
      this.getAttribute('collection-reload-delay') || DEFAULT_RELOAD_DELAY
    );
    let { fieldValues: viewParams } = convertStringToFieldParams(collectionViewParams);
    let viewPrimaryFields = collectionViewPrimaryFields ?
      collectionViewPrimaryFields.split(',').map(fieldName => fieldName.trim()) :
      collectionViewPrimaryFields == null ?
      null : [];

    if (this.collection) this.collection.destroy();
    this.isStale = true;

    this.collection = new AGCollection({
      socket: this.socket,
      type: collectionType,
      fields: collectionFields.split(',').map(field => field.trim()).filter(field => field),
      view: collectionView,
      viewParams,
      viewPrimaryFields,
      pageSize: Number(collectionPageSize || 10),
      pageOffset: Number(collectionPageOffset || 0),
      changeReloadDelay: collectionReloadDelay,
      getCount: collectionGetCount
    });

    this.shadowRoot.innerHTML = `
      <slot name="loader"></slot>
      <slot name="item"></slot>
      <slot name="no-item"></slot>
      <slot name="first-item"></slot>
      <slot name="last-item"></slot>
      <slot name="viewport"></slot>
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
        // Ignore change events which originate from this collection instance.
        if (!event.isRemote) continue;
        this.renderList();
        this.updatePageButtons();
      }
    })();

    if (!hideErrorLogs) {
      (async () => {
        for await (let { error } of this.collection.listener('error')) {
          console.error(
            `Collection viewer encountered an error: ${error.message}`
          );
        }
      })();
    }
  }
}

window.customElements.define('collection-viewer', CollectionViewer);
