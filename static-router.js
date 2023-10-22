import { getSafeHTML } from './utils.js';

export class StaticRouter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.pages = {};
    this.pageRouteInfos = [];

    this.hashStartRegex = /^#/;

    this.handleHashChangeEvent = () => {
      this.renderCurrentPage();
    };

    this.handleSlotChangeEvent = () => {
      let pageTemplates = this.shadowRoot.querySelector('slot[name="page"]').assignedNodes();

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
    window.addEventListener('hashchange', this.handleHashChangeEvent);
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.handleHashChangeEvent);
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
  }

  renderCurrentPage() {
    let routerContainer = this.shadowRoot.querySelector('.static-router-container');
    if (!routerContainer) return;

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

    routerContainer.innerHTML = templateHTML;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
      </style>
      <slot name="page"></slot>
      <div class="static-router-container"></div>
    `;
  }
}

window.customElements.define('static-router', StaticRouter);
