import { toSafeHTML } from './utils.js';
import { renderTemplate } from './utils.js';

export class AppRouter extends HTMLElement {
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
    let routerViewport = this.shadowRoot.querySelector('slot[name="viewport"]').assignedNodes()[0];
    if (!routerViewport) return;

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

    routerViewport.innerHTML = renderTemplate(pageTemplate.innerHTML, routeArgs);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <slot name="page"></slot>
      <slot name="viewport"></slot>
    `;
  }
}

window.customElements.define('app-router', AppRouter);
