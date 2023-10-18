import { create } from '/node_modules/socketcluster-client/socketcluster-client.min.js';

const DEFAULT_AUTH_TOKEN_NAME = 'saasufy.authToken';

let socket;

export function createSocket(options) {
  socket = create({
    authTokenName: DEFAULT_AUTH_TOKEN_NAME,
    ...options
  });
  return socket;
}

export function getSocket(options) {
  if (socket) {
    return socket;
  }
  return createSocket(options);
}
