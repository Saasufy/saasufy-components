import { SocketConsumer } from './socket.js';
import { generateRandomHexString } from './utils.js';

const DEFAULT_AUTH_TIMEOUT = 10000;

class OAuthHandler extends SocketConsumer {
  static get observedAttributes() {
    return [
      'provider',
      'code-param-name',
      'state-param-name',
      'state-session-storage-key',
      'success-url',
      'success-location-hash',
      'navigate-event-path',
      'auth-timeout'
    ];
  }

  successRedirect() {
    let successURL = this.getAttribute('success-url');
    let successLocationHash = this.getAttribute('success-location-hash');
    let navigateEventPath = this.getAttribute('navigate-event-path');

    if (successLocationHash) {
      location.hash = successLocationHash;
    } else if (successURL) {
      location.href = successURL;
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

  async connectedCallback() {
    this.innerHTML = '';

    let provider = this.getAttribute('provider');
    if (!provider) {
      throw new Error('The provider attribute of oauth-handler was not specified');
    }

    let sessionStorageKey = this.getAttribute('state-session-storage-key') || `oauth.${provider}.state`;
    let expectedOAuthState = sessionStorage.getItem(sessionStorageKey);
    if (!expectedOAuthState) return;

    let codeParamName = this.getAttribute('code-param-name') || 'code';
    let stateParamName = this.getAttribute('state-param-name') || 'state';

    let authTimeout = Number(this.getAttribute('auth-timeout') || DEFAULT_AUTH_TIMEOUT);

    let urlSearchParams = new URLSearchParams(location.search);
    let code = urlSearchParams.get(codeParamName);

    if (code) {
      let state = urlSearchParams.get(stateParamName);
      let socket = this.getSocket();

      history.replaceState({}, document.title, location.pathname);

      if (state === expectedOAuthState) {
        try {
          await socket.invoke('log-in-oauth', { provider, data: { code } });
        } catch (error) {
          this.innerHTML = `
            <div class="error">OAuth authentication failed. ${error.message}</div>
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