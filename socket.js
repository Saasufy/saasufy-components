import { create } from '/node_modules/socketcluster-client/socketcluster-client.min.js';

const DEFAULT_AUTH_TOKEN_NAME = 'saasufy.authToken';

let socket;

export function createSocket(options) {
  socket = create({
    authTokenName: DEFAULT_AUTH_TOKEN_NAME,
    ...options
  });

  (async () => {
    for await (let { error } of socket.listener('error')) {
      console.error(error);
    }
  })();

  (async () => {
    for await (let event of socket.listener('connect')) {
      console.log('Socket is connected');
    }
  })();

  return socket;
}

window.createSocket = createSocket;

export function getSocket(options) {
  if (socket) {
    return socket;
  }
  return createSocket(options);
}

window.getSocket = getSocket;
