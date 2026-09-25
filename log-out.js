import { SocketConsumer } from './socket.js';

class LogOut extends SocketConsumer {
  getProviderLogOutURL(authToken) {
    let logoutURL = this.getAttribute('logout-url');
    if (!logoutURL) return null;

    // RP-initiated log out only applies to sessions which were created via an OAuth provider.
    let authSource = authToken && authToken.authSource;
    if (!authSource) return null;
    let provider = this.getAttribute('provider');
    if (provider && provider !== authSource) return null;

    let providerLogOutURL;
    try {
      providerLogOutURL = new URL(logoutURL, location.origin);
    } catch (error) {
      throw new Error(
        'The logout-url attribute of log-out was not a valid URL'
      );
    }

    let clientId = this.getAttribute('client-id');
    let postLogoutRedirectURI = this.getAttribute('post-logout-redirect-uri');
    let searchParams = providerLogOutURL.searchParams;

    // Without an id_token_hint, the provider asks the user to confirm the log out.
    if (authToken.idToken && !searchParams.has('id_token_hint')) {
      searchParams.set('id_token_hint', authToken.idToken);
    }
    if (clientId && !searchParams.has('client_id')) {
      searchParams.set('client_id', clientId);
    }
    if (postLogoutRedirectURI && !searchParams.has('post_logout_redirect_uri')) {
      searchParams.set('post_logout_redirect_uri', postLogoutRedirectURI);
    }
    return providerLogOutURL.href;
  }

  async logOut() {
    let socket = this.getSocket();
    // The auth token must be read before the socket is deauthenticated.
    let providerLogOutURL = this.getProviderLogOutURL(socket.authToken);
    await socket.deauthenticate();
    if (providerLogOutURL) {
      location.href = providerLogOutURL;
    }
  }
}

window.customElements.define('log-out', LogOut);
