import { SocketConsumer } from './socket.js';
import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import { getSafeHTML } from './utils.js';
import './static-router.js';

const DEFAULT_RELOAD_DELAY = 0;

export class CollectionRouter extends SocketConsumer {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pages = {};

    this.handleSlotChangeEvent = () => {
      let pageTemplates = this.shadowRoot.querySelector('slot[name="page"]').assignedNodes();

      for (let template of pageTemplates) {
        let routePath = template.getAttribute('route-path');
        this.pages[routePath] = template;
      }
      if (this.collection && this.collection.isLoaded) {
        this.renderRoutes();
      }
    };
  }

  connectedCallback() {
    this.isReady = true;
    this.socket = this.getSocket();
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.render();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
  }

  static get observedAttributes() {
    return [
      'collection-type',
      'collection-fields',
      'collection-view',
      'collection-view-params',
      'collection-page-size',
      'collection-page-offset',
      'log-routes'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    if (this.collection && name === 'collection-page-offset') {
      let newOffset = Number(newValue);
      if (newOffset !== this.collection.meta.pageOffset) {
        this.collection.fetchPage(newOffset);
      }
    } else {
      this.render();
    }
  }

  renderRoutes() {
    let logRoutes = this.hasAttribute('log-routes');
    let staticRouter = this.shadowRoot.querySelector('static-router');
    if (!staticRouter) return;

    let pageEntries = Object.entries(this.pages);
    if (!pageEntries.length) return;

    staticRouter.innerHTML = pageEntries.map(
      ([ route, template ]) => {
        let routePath = template.getAttribute('route-path');
        let pageTemplates = this.collection.value.map(
          (modelItem) => {
            let pagePath = routePath;
            let templateHTML = template.innerHTML;
            for (let [ field, value ] of Object.entries(modelItem)) {
              let regExp = new RegExp(`{{${field}}}`, 'g');
              let safeValue = getSafeHTML(value);
              pagePath = pagePath.replace(regExp, String(safeValue).toLowerCase().replace(/ /g, '-'));
              templateHTML = templateHTML.replace(regExp, safeValue);
            }
            if (logRoutes) console.log(`Route: ${pagePath}`);
            return `<template slot="page" route-path="${pagePath}">${templateHTML}</template>`
          }
        );
        return pageTemplates.join('')
      }
    ).join('');
  }

  render() {
    let collectionType = this.getAttribute('collection-type');
    let collectionFields = this.getAttribute('collection-fields');
    let collectionView = this.getAttribute('collection-view');
    let collectionPageSize = this.getAttribute('collection-page-size');
    let collectionViewParams = this.getAttribute('collection-view-params');
    let collectionPageOffset = this.getAttribute('collection-page-offset');
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

    this.shadowRoot.innerHTML = `
      <slot name="page"></slot>
      <static-router></static-router>
    `;

    (async () => {
      await this.collection.listener('load').once();
      if (!this.collection.value.length) {
        this.renderRoutes();
      }
      this.setAttribute('is-loaded', '');
      this.dispatchEvent(new CustomEvent('load', { bubbles: true }));
    })();

    (async () => {
      for await (let event of this.collection.listener('change')) {
        if (!this.collection.isLoaded) continue;
        this.renderRoutes();
      }
    })();
  }
}

window.customElements.define('collection-router', CollectionRouter);
