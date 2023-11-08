import { toSafeHTML, renderTemplate, debouncer } from './utils.js';
import { SocketConsumer } from './socket.js';

const DEFAULT_DEBOUNCE_DELAY = 100;
const DEFAULT_MAX_REDIRECTS = 5;

export class AppRouter extends SocketConsumer {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.isReady = false;
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
      'debounce-delay',
      'max-redirects'
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

  getMatchingRouteInfo(pagePath) {
    return this.pageRouteInfos.find(
      ({ regExp }) => pagePath.match(regExp)
    ) || {};
  }

  getMatchingPage(pagePath, routeType, noThrow) {
    let { route, regExp, params } = this.getMatchingRouteInfo(pagePath);
    let pageTemplate = this.pages[route];
    if (!pageTemplate && !noThrow) {
      throw new Error(`The specified ${routeType}${pagePath ? ` ${pagePath}` : ''} did not match any route`);
    }
    return { pageTemplate, route, regExp, params };
  }

  substituteRouteAgs(route, routeArgs) {
    for (let [ key, value ] of Object.entries(routeArgs || {})) {
      route = route.replace(new RegExp(`:${key}\\b`, 'g'), value);
    }
    return route;
  }

  renderCurrentPage() {
    let routerViewport = this.shadowRoot.querySelector('slot[name="viewport"]').assignedNodes()[0];
    if (!routerViewport) return;

    let routeArgs;
    let pagePath = location.hash.replace(this.hashStartRegex, '');
    let { pageTemplate, route, regExp, params } = this.getMatchingPage(pagePath, 'path', true);

    if (!pageTemplate) {
      let defaultPage = this.getAttribute('default-page');
      if (!defaultPage) return;
      routeArgs = this.computeRouteArgs(pagePath, regExp, params);
      pagePath = this.substituteRouteAgs(defaultPage, routeArgs);
      let result = this.getMatchingPage(pagePath, 'default-page');
      pageTemplate = result.pageTemplate;
      route = result.route;
      regExp = result.regExp;
      params = result.params;
    };

    let maxRedirects = Number(this.getAttribute('max-redirects') || DEFAULT_MAX_REDIRECTS);

    let redirectCount;
    for (redirectCount = 0; redirectCount < maxRedirects; redirectCount++) {
      let redirect = pageTemplate.getAttribute('redirect');
      let noAuthRedirect = pageTemplate.getAttribute('no-auth-redirect');
      let authRedirect = pageTemplate.getAttribute('auth-redirect');

      if (!redirect && !noAuthRedirect && !authRedirect) break;

      let hardRedirect = pageTemplate.hasAttribute('hard-redirect');

      if (redirect) {
        if (hardRedirect) {
          location.hash = redirect;
          return;
        }
        routeArgs = this.computeRouteArgs(pagePath, regExp, params);
        pagePath = this.substituteRouteAgs(redirect, routeArgs);
        let result = this.getMatchingPage(pagePath, 'redirect');
        pageTemplate = result.pageTemplate;
        route = result.route;
        regExp = result.regExp;
        params = result.params;
      } else {
        if (this.socket && (authRedirect || noAuthRedirect)) {
          if (this.socket.authState === 'authenticated') {
            if (authRedirect) {
              if (hardRedirect) {
                location.hash = authRedirect;
                return;
              }
              routeArgs = this.computeRouteArgs(pagePath, regExp, params);
              pagePath = this.substituteRouteAgs(authRedirect, routeArgs);
              let result = this.getMatchingPage(pagePath, 'auth-redirect');
              pageTemplate = result.pageTemplate;
              route = result.route;
              regExp = result.regExp;
              params = result.params;
            }
          } else {
            if (this.socket.state !== this.socket.OPEN) return;
            if (noAuthRedirect) {
              if (hardRedirect) {
                location.hash = noAuthRedirect;
                return;
              }
              routeArgs = this.computeRouteArgs(pagePath, regExp, params);
              pagePath = this.substituteRouteAgs(noAuthRedirect, routeArgs);
              let result = this.getMatchingPage(pagePath, 'no-auth-redirect');
              pageTemplate = result.pageTemplate;
              route = result.route;
              regExp = result.regExp;
              params = result.params;
            }
          }
        }
      }
    }

    if (redirectCount >= maxRedirects) {
      throw new Error(
        `The number of redirects exceeded the maximum amount of ${maxRedirects}`
      );
    }

    if (route) {
      routeArgs = this.computeRouteArgs(pagePath, regExp, params);
    } else {
      routeArgs = {};
    }

    routerViewport.innerHTML = renderTemplate(
      pageTemplate.innerHTML,
      routeArgs,
      this.socket
    );
  }

  render() {
    this.shadowRoot.innerHTML = `
      <slot name="page"></slot>
      <slot name="viewport"></slot>
    `;
  }
}

window.customElements.define('app-router', AppRouter);
