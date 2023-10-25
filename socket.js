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
  }

  disconnectedCallback() {
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
    let sanitizedURL = this.getSanitizedURL();
    if (
      this.saasufySocket &&
      this.saasufySocket.transport &&
      this.saasufySocket.transport.uri() !== sanitizedURL
    ) {
      this.saasufySocket.disconnect();
    }
    this.getSocket();
  }

  destroySocket() {
    if (this.saasufySocket) {
      this.saasufySocket.disconnect();
    }
  }

  getSocket() {
    if (this.saasufySocket) {
      this.saasufySocket.options = {
        ...this.saasufySocket.options,
        ...this.getSocketOptions()
      };
      this.saasufySocket.connect();
      return this.saasufySocket;
    }
    return this.createSocket();
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

  createSocket() {
    let socketOptions = this.getSocketOptions();
    this.saasufySocket = create(socketOptions);

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
    return socket;
  }
}

window.customElements.define('socket-provider', SocketProvider);
window.customElements.define('socket-consumer', SocketConsumer);
