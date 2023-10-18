import { getSocket } from './socket.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import { getSafeHTML } from './utils.js';

const DEFAULT_RELOAD_DELAY = 0;

class CollectionBrowser extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.socket = getSocket();
  }

  connectedCallback() {
    this.isReady = true;
    this.shadowRoot.addEventListener('slotchange', () => this.renderTable());
    this.addEventListener('showModal', (event) => this.handleShowModalEvent(event));
    this.addEventListener('crudCreate', (event) => this.handleCRUDCreateEvent(event));
    this.addEventListener('crudDelete', (event) => this.handleCRUDDeleteEvent(event));
    this.render();
  }

  disconnectedCallback() {
    if (this.collection) this.collection.destroy();
  }

  static get observedAttributes() {
    return [
      'collection-type',
      'collection-fields',
      'collection-view',
      'collection-view-params',
      'collection-page-size'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.render();
  }

  renderTable() {
    if (!this.collection || !this.collection.isLoaded) return;
    let itemTemplate = this.shadowRoot.querySelector('slot[name="item"]').assignedNodes()[0];
    if (!itemTemplate) return;
    let listNode = this.shadowRoot.querySelector('slot[name="list"]').assignedNodes()[0];
    if (!listNode) return;
    let items = [];

    for (let modelItem of this.collection.value) {
      let itemString = itemTemplate.innerHTML;

      for (let [ field, value ] of Object.entries(modelItem)) {
        let regExp = new RegExp(`{{${field}}}`, 'g');
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

  handleShowModalEvent(event) {
    let modal = this.shadowRoot.querySelector('slot[name="modal"]').assignedNodes()[0];
    modal.show(event.detail.message, event.detail.callback);
  }

  handleCRUDCreateEvent(event) {
    if (this.collection) {
      this.collection.create(event.detail);
    }
  }

  handleCRUDDeleteEvent(event) {
    if (this.collection) {
      this.collection.delete(event.detail);
    }
  }

  render() {
    let collectionType = this.getAttribute('collection-type');
    let collectionFields = this.getAttribute('collection-fields');
    let collectionView = this.getAttribute('collection-view');
    let collectionPageSize = this.getAttribute('collection-page-size');
    let collectionViewParams = this.getAttribute('collection-view-params');
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
      changeReloadDelay: collectionReloadDelay
    });

    this.shadowRoot.innerHTML = '<slot name="item"></slot><slot name="no-item"></slot><slot name="list"></slot><slot name="modal"></slot>';

    (async () => {
      await this.collection.listener('load').once();
      if (!this.collection.value.length) {
        this.renderTable();
      }
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    })();

    (async () => {
      for await (let event of this.collection.listener('change')) {
        this.renderTable();
      }
    })();
  }
}

window.customElements.define('collection-browser', CollectionBrowser);
