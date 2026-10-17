import { SocketConsumer } from './socket.js';
import { generateRandomHexString, convertStringToFieldParams, toSafeHTML } from './utils.js';

const DEFAULT_AUTH_TIMEOUT = 20000;

class OAuthHandler extends SocketConsumer {
  successRedirect() {
    let successURL = this.getAttribute('success-url');
    let successLocationHash = this.getAttribute('success-location-hash');
    let navigateEventPath = this.getAttribute('navigate-event-path');

    if (successLocationHash) {
      location.hash = successLocationHash;
    } else if (successURL) {
      let resolvedURL;
      // Resolved against the document URL so relative paths behave as they did
      // with the plain assignment; only an absolute URL brings its own scheme.
      try {
        resolvedURL = new URL(successURL, location.href);
      } catch (error) {
        throw new Error(
          'The success-url attribute of oauth-handler was not a valid URL'
        );
      }
      if (
        resolvedURL.protocol !== 'https:' &&
        resolvedURL.protocol !== 'http:'
      ) {
        throw new Error(
          'The success-url attribute of oauth-handler must be an http or https URL'
        );
      }
      location.href = resolvedURL.href;
    } else {
      this.dispatchEvent(
        new CustomEvent('navigate', {
          detail: {
            path: navigateEventPath
          },
          bubbles: true
        })
      );
    }
  }

  getProviderFromState(state) {
    if (typeof state !== 'string') return '';
    let lastDashIndex = state.lastIndexOf('-');
    if (lastDashIndex === -1) return state;
    return state.slice(0, lastDashIndex);
  }

  async connectedCallback() {
    this.innerHTML = '';

    let provider = this.getAttribute('provider');
    if (!provider) {
      throw new Error('The provider attribute of oauth-handler was not specified');
    }

    let useLocalStorage = !this.hasAttribute('use-session-storage');
    let storageKey = this.getAttribute('state-storage-key') || 'oauth.state';
    let storage = useLocalStorage ? localStorage : sessionStorage;
    let expectedOAuthState = storage.getItem(storageKey);
    if (!expectedOAuthState) {
      this.innerHTML = `
        <div class="error">OAuth authentication failed because the state was missing.</div>
      `;
      return;
    };

    let relevantStates = expectedOAuthState
      .split(',')
      .filter(expectedState => this.getProviderFromState(expectedState) === provider);

    // Do not process. The state may have been set for a different provider
    // which is handled on the same page.
    if (!relevantStates.length) return;

    let codeParamName = this.getAttribute('code-param-name') || 'code';
    let stateParamName = this.getAttribute('state-param-name') || 'state';
    let extraDataString = this.getAttribute('extra-data') || '';
    let { fieldValues: extraData } = convertStringToFieldParams(extraDataString);
    let redirectURI = this.getAttribute('redirect-uri');

    if (redirectURI) {
      extraData.redirectURI = redirectURI;
    }

    let authTimeout = Number(this.getAttribute('auth-timeout') || DEFAULT_AUTH_TIMEOUT);
    let urlSearchParams = new URLSearchParams(location.search);
    let state = urlSearchParams.get(stateParamName);

    let stateProvider = this.getProviderFromState(state);
    if (stateProvider !== provider) return;
    
    let code = urlSearchParams.get(codeParamName);

    if (code) {
      let socket = this.getSocket();

      history.replaceState({}, document.title, location.pathname);
      
      if (relevantStates.some(expectedState => expectedState === state)) {
        // Single-use, so consumed before the exchange. Re-read rather than
        // written back from the list captured above, which would drop a state
        // another handler or tab added since.
        let remainingStates = (storage.getItem(storageKey) || '')
          .split(',')
          .filter(existingState => existingState && existingState !== state);
        if (remainingStates.length) {
          storage.setItem(storageKey, remainingStates.join(','));
        } else {
          storage.removeItem(storageKey);
        }

        try {
          await socket.invoke('log-in-oauth', { provider, data: { code, ...extraData } });
        } catch (error) {
          // The message is quoted back by the service and can carry parts of the
          // query string which brought the browser here.
          this.innerHTML = `
            <div class="error">OAuth authentication failed. ${toSafeHTML(error.message)}</div>
          `;
          return;
        }
        if (socket.authState === 'authenticated') {
          this.successRedirect();
        } else {
          try {
            await socket.listener('authenticate').once(authTimeout);
          } catch (error) {
            this.innerHTML = `
              <div class="error">OAuth socket authentication timed out</div>
            `;
            return;
          }
          this.successRedirect();
        }
      } else {
        this.innerHTML = `
          <div class="error">OAuth state query parameter was invalid</div>
        `;
      }
    }
  }
}

window.customElements.define('oauth-handler', OAuthHandler);
