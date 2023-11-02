import { SocketConsumer } from './socket.js';

class LogOut extends SocketConsumer {
  logOut() {
    this.getSocket().deauthenticate();
  }
}

window.customElements.define('log-out', LogOut);
