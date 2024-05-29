import { create } from '/node_modules/socketcluster-client/socketcluster-client.min.js';
import { convertStringToFieldParams } from './utils.js';

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
    this.lastExtraSocketOptionsString = '';
  }

  connectedCallback() {
    this.isReady = true;
    this.getSocket();
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
      'auth-token-name',
      'disable-tab-sync',
      'socket-options'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isReady) return;
    let greedyRefresh = this.hasAttribute('greedy-refresh');
    if (!greedyRefresh && oldValue === newValue) return;
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
    let socketOptionsString = this.getAttribute('socket-options') || '';
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
    let {
      fieldValues: extraSocketOptions
    } = convertStringToFieldParams(socketOptionsString);
    let socketOptions = {
      authTokenName,
      autoConnect: !!url,
      ...extraSocketOptions,
      ...urlOptions
    };
    return socketOptions;
  }

  getSocket() {
    let socket;
    let socketOptionsString = this.getAttribute('socket-options') || '';
    if (this.saasufySocket) {
      let sanitizedURL = this.getSanitizedURL();
      if (this.lastSaasufySocketURL !== sanitizedURL || this.lastExtraSocketOptionsString !== socketOptionsString) {
        this.saasufySocket.connect(
          this.getSocketOptions()
        );
      } else {
        this.saasufySocket.connect();
      }
      this.lastSaasufySocketURL = sanitizedURL;
      this.lastExtraSocketOptionsString = socketOptionsString;
      socket = this.saasufySocket;
    } else {
      socket = this.createSocket();
    }
    if (this.storageChangeWatcher) {
      window.removeEventListener('storage', this.storageChangeWatcher);
    }
    let disableTabSync = this.hasAttribute('disable-tab-sync');
    if (!disableTabSync) {
      this.storageChangeWatcher = async (event) => {
        if (event.storageArea === window.localStorage && event.key === this.saasufySocket.options.authTokenName) {
          if (event.newValue == null) {
            await this.saasufySocket.deauthenticate();
            if (this.hasAttribute('disconnect-on-deauth')) {
              this.saasufySocket.disconnect(1000, 'log-out');
            } else {
              this.saasufySocket.reconnect(1000, 'log-out');
            }
          } else {
            this.saasufySocket.reconnect(1000, 'log-out');
          }
        }
      };
      window.addEventListener('storage', this.storageChangeWatcher);
    }
    return socket;
  }

  createSocket() {
    let socketOptions = this.getSocketOptions();
    this.saasufySocket = create(socketOptions);
    this.lastSaasufySocketURL = this.getSanitizedURL();
    this.lastExtraSocketOptionsString = this.getAttribute('socket-options') || '';

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
