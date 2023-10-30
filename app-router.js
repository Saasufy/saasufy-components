import { toSafeHTML, renderTemplate, debouncer } from './utils.js';
import { SocketConsumer } from './socket.js';

const DEFAULT_DEBOUNCE_DELAY = 100;

export class AppRouter extends SocketConsumer {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.pages = {};
    this.pageRouteInfos = [];
    this.debounce = debouncer();
    this.debounceDelay = DEFAULT_DEBOUNCE_DELAY;

    this.hashStartRegex = /^#/;

    this.handleHashChangeEvent = () => {
      this.debounce(this.renderCurrentPage, this.debounceDelay);
    };

    this.handleSlotChangeEvent = (event) => {
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
      if (!this.socket || this.socket.state === this.socket.OPEN) {
        this.debounce(this.renderCurrentPage, this.debounceDelay);
      }
    };
  }

  computeRouteArgs(page, regExp, params) {
    let match = page.matchAll(regExp).next().value || [];
    let argEntries = match
      .slice(1)
      .map((groupMatch, i) => [ params[i], groupMatch ]);
    return Object.fromEntries(argEntries);
  }

  static get observedAttributes() {
    return [
      'default-page',
      'debounce-delay'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'debounce-delay') {
      if (newValue) {
        this.debounceDelay = Number(newValue);
      } else {
        this.debounceDelay = DEFAULT_DEBOUNCE_DELAY;
      }
    } else if (this.isReady) {
      this.renderCurrentPage();
    }
  }

  connectedCallback() {
    window.addEventListener('hashchange', this.handleHashChangeEvent);
    this.shadowRoot.addEventListener('slotchange', this.handleSlotChangeEvent);

    try {
      // Socket is optional as not all routing use cases require authentication.
      this.socket = this.getSocket();
    } catch (error) {}
    if (this.socket) {
      let hasProcessedSocketConnect = this.socket.state === this.socket.OPEN;
      this.authStateChangeConsumer = this.socket.listener('authStateChange').createConsumer();
      (async () => {
        for await (let event of this.authStateChangeConsumer) {
          if (hasProcessedSocketConnect) {
            this.debounce(this.renderCurrentPage, this.debounceDelay);
          }
        }
      })();

      this.connectConsumer = this.socket.listener('connect').createConsumer();
      (async () => {
        for await (let event of this.connectConsumer) {
          hasProcessedSocketConnect = true;
          this.debounce(this.renderCurrentPage, this.debounceDelay);
        }
      })();
    }
    this.render();
    this.isReady = true;
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.handleHashChangeEvent);
    this.shadowRoot.removeEventListener('slotchange', this.handleSlotChangeEvent);
    this.authStateChangeConsumer.kill();
    this.connectConsumer.kill();
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
    if (!pageTemplate) {
      let defaultPage = this.getAttribute('default-page');
      if (!defaultPage) return;
      pageTemplate = this.pages[defaultPage];
    };

    let noAuthRedirect = pageTemplate.getAttribute('no-auth-redirect');
    let authRedirect = pageTemplate.getAttribute('auth-redirect');
    let hardRedirect = pageTemplate.hasAttribute('hard-redirect');

    if (this.socket && (authRedirect || noAuthRedirect)) {
      if (this.socket.authState === 'authenticated') {
        if (authRedirect) {
          if (hardRedirect) {
            location.hash = authRedirect;
            return;
          } else {
            pageTemplate = this.pages[authRedirect];
          }
        }
      } else {
        if (this.socket.state !== this.socket.OPEN) return;
        if (noAuthRedirect) {
          if (hardRedirect) {
            location.hash = noAuthRedirect;
            return;
          } else {
            pageTemplate = this.pages[noAuthRedirect];
          }
        }
      }
    }

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
