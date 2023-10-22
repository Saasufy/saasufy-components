import { getSafeHTML } from './utils.js';

class AppRouter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.pages = {};
    this.pageRouteInfos = [];

    this.hashStartRegex = /^#/;

    this.hashChangeHandler = () => {
      this.renderCurrentPage();
    };

    this.handleSlotChangeEvent = async () => {
      let pageTemplates = this.shadowRoot.querySelector('slot[name="page"]').assignedNodes();
      let pageMaker = this.shadowRoot.querySelector('slot[name="page-maker"]').assignedNodes()[0];
      if (pageMaker) {
        await pageMaker.collection.listener('load').once();
        console.log(222, pageMaker.innerHTML);// TODO 000
      }

      for (let template of pageTemplates) {
        let routePath = template.getAttribute('route-path');
        this.pages[routePath] = template;
      }

      this.pageRouteInfos = Object.keys(this.pages).map((route) => {
        return {
          regExp: new RegExp(`^${route.replace(/\/:[^\/]+/g, '/([^/]*)').replace(/\//g, '\\/')}$`, 'g'),
          route,
          params: [ ...route.matchAll(/:[^\/]*/g) ].map(paramMatch => paramMatch[0].replace(':', ''))
        };
      });

      this.renderCurrentPage();
    };
  }

  computeRouteArgs(page, regExp, params) {
    let match = page.matchAll(regExp).next().value || [];
    let argEntries = match
      .slice(1)
      .map((groupMatch, i) => [ params[i], groupMatch ]);
    return Object.fromEntries(argEntries);
  }

  connectedCallback() {
    window.addEventListener('hashchange', this.hashChangeHandler);
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.hashChangeHandler);
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
  }

  renderCurrentPage() {
    let appContainer = this.shadowRoot.querySelector('.app-container');
    if (!appContainer) return;

    let { hash } = location;
    let pagePath = hash.replace(this.hashStartRegex, '');

    let { route, regExp, params } = this.pageRouteInfos.find(
      ({ regExp }) => pagePath.match(regExp)
    ) || {};

    let pageTemplate = this.pages[route];
    if (!pageTemplate) return;

    let routeArgs;
    if (route) {
      routeArgs = this.computeRouteArgs(pagePath, regExp, params);
    } else {
      routeArgs = {};
    }

    let templateHTML = pageTemplate.innerHTML;
    for (let [ key, value ] of Object.entries(routeArgs)) {
      let regExp = new RegExp(`{{${key}}}`, 'g');
      templateHTML = templateHTML.replace(regExp, getSafeHTML(value));
    }

    appContainer.innerHTML = templateHTML;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
      </style>
      <slot name="page"></slot>
      <div class="app-container"></div>
    `;
  }
}

window.customElements.define('app-router', AppRouter);
