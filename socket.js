import { create } from '/node_modules/socketcluster-client/socketcluster-client.min.js';

let globalSocket;

let urlPartsRegExp = /(^[^:]+):\/\/([^:\/]*)(:[0-9]*)?(\/.*)/;

export function createGlobalSocket(options) {
  globalSocket = create({ ...options });
  return globalSocket;
}

export function getGlobalSocket(options) {
  if (globalSocket) {
    return globalSocket;
  }
  return createGlobalSocket(options);
}

export class SocketProvider extends HTMLElement {
  constructor() {
    super();
    this.saasufySocket = null;
    this.isReady = false;
  }

  connectedCallback() {
    this.isReady = true;
    this.getSocket();
    let disableTabSync = this.hasAttribute('disable-tab-sync');
    if (!disableTabSync) {
      if (this.storageChangeWatcher) {
        window.removeEventListener('storage', this.storageChangeWatcher);
      }
      this.storageChangeWatcher = (event) => {
        if (event.storageArea === window.localStorage && event.key === this.saasufySocket.options.authTokenName) {
          this.saasufySocket.reconnect();
        }
      };
    }
    window.addEventListener('storage', this.storageChangeWatcher);
  }

  disconnectedCallback() {
    if (this.storageChangeWatcher) {
      window.removeEventListener('storage', this.storageChangeWatcher);
    }
    this.destroySocket();
  }

  static get observedAttributes() {
    return [
      'url',
      'auth-token-name'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    this.getSocket();
  }

  destroySocket() {
    if (this.saasufySocket) {
      this.saasufySocket.disconnect();
    }
  }

  getSanitizedURL() {
    let url = this.getAttribute('url') || '';
    return url.trim();
  }

  getSocketOptions() {
    let authTokenName = this.getAttribute('auth-token-name') || null;
    let url = this.getSanitizedURL();
    let urlOptions;
    let matchedList = url.match(urlPartsRegExp);
    if (matchedList) {
      let [ fullMatch, protocolScheme, hostname, port, path ] = matchedList;
      if (port) {
        port = port.replace(/^:/, '');
      }
      urlOptions = {
        protocolScheme,
        hostname,
        port,
        path
      };
    } else {
      if (url) {
        throw new Error(`The specified URL ${url} was invalid`);
      }
      urlOptions = {};
    }
    let socketOptions = {
      authTokenName,
      ...urlOptions
    };
    socketOptions.autoConnect = !!url;
    return socketOptions;
  }

  getSocket() {
    if (this.saasufySocket) {
      let sanitizedURL = this.getSanitizedURL();
      if (this.lastSaasufySocketURL !== sanitizedURL) {
        this.saasufySocket.connect(
          this.getSocketOptions()
        );
      } else {
        this.saasufySocket.connect();
      }
      this.lastSaasufySocketURL = sanitizedURL;
      return this.saasufySocket;
    }
    return this.createSocket();
  }

  createSocket() {
    let socketOptions = this.getSocketOptions();
    this.saasufySocket = create(socketOptions);
    this.lastSaasufySocketURL = this.getSanitizedURL();

    return this.saasufySocket;
  }
}

export class SocketConsumer extends HTMLElement {
  getSocket() {
    let socket = null;
    let currentNode = this.parentNode;
    while (currentNode) {
      socket = currentNode.saasufySocket;
      if (socket) break;
      currentNode = currentNode.getRootNode().host || currentNode.parentNode;
    }
    if (!socket) {
      throw new Error(
        `The ${
          this.nodeName.toLowerCase()
        } element failed to obtain a socket - Ensure that it is nested inside a socket-provider element`
      );
    }
    return socket;
  }
}

window.customElements.define('socket-provider', SocketProvider);
window.customElements.define('socket-consumer', SocketConsumer);
