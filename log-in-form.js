import '/node_modules/capitalisk-auth-client/dist/capitalisk-log-in.js';
import { SocketConsumer } from './socket.js';

const DEFAULT_AUTH_TIMEOUT = 10000;

class LogInForm extends SocketConsumer {
  constructor() {
    super();
    this.isReady = false;
  }

  connectedCallback() {
    this.socket = this.getSocket();
    this.isReady = true;
    this.render();
  }

  static get observedAttributes() {
    return [
      'hostname',
      'port',
      'network-symbol',
      'chain-module-name',
      'secure',
      'auth-timeout',
      'success-location-hash'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
    this.render();
  }

  render() {
    let hostname = this.getAttribute('hostname');
    let port = this.getAttribute('port');
    let networkSymbol = this.getAttribute('network-symbol');
    let chainModuleName = this.getAttribute('chain-module-name');
    let secure = this.getAttribute('secure');
    let authTimeout = Number(this.getAttribute('auth-timeout') || DEFAULT_AUTH_TIMEOUT);
    let successLocationHash = this.getAttribute('success-location-hash');

    this.innerHTML = `
      <capitalisk-log-in
        hostname="${hostname}"
        port="${port}"
        network-symbol="${networkSymbol}"
        chain-module-name="${chainModuleName}"
        secure="${secure}"
        disabled="true"
      ></capitalisk-log-in>
    `;

    let capitaliskLogIn = this.querySelector('capitalisk-log-in');
    capitaliskLogIn.addEventListener('accountReadyStateChange', (event) => {
      if (event.detail.accountReady) {
        capitaliskLogIn.removeAttribute('disabled');
      } else {
        capitaliskLogIn.setAttribute('disabled', '');

      }
    });

    capitaliskLogIn.addEventListener('error', (event) => {
      console.error(`CapitaliskLogIn error: ${event.detail.error.message}`);
    });

    capitaliskLogIn.addEventListener('submitCredentials', async (event) => {
      capitaliskLogIn.setAttribute('disabled', '');
      capitaliskLogIn.removeAttribute('error');
      capitaliskLogIn.setAttribute('submit-button-text', 'Loading...');
      try {
        let credentials = {
          ...event.detail,
          networkSymbol
        };
        let logInResponse = await this.socket.invoke('log-in', credentials);
      } catch (error) {
        capitaliskLogIn.setAttribute('error', `${error.message}.`);
        capitaliskLogIn.removeAttribute('disabled');
        capitaliskLogIn.setAttribute('submit-button-text', 'Log in');
        return;
      }
      if (this.socket.authState !== 'authenticated') {
        try {
          await this.socket.listener('authenticate').once(authTimeout);
        } catch (error) {
          capitaliskLogIn.setAttribute(
            'error',
            'Authentication timed out, please try again.'
          );
          capitaliskLogIn.removeAttribute('disabled');
          capitaliskLogIn.setAttribute('submit-button-text', 'Log in');
          return;
        }
      }

      capitaliskLogIn.setAttribute('disabled', '');
      capitaliskLogIn.setAttribute('submit-button-text', 'Success!');

      if (successLocationHash) {
        location.hash = successLocationHash;
      }
    });
  }
}

window.customElements.define('log-in-form', LogInForm);
