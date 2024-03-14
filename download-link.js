import { SocketConsumer } from './socket.js';

class DownloadLink extends SocketConsumer {
  constructor() {
    super();
    let dataTypeRegExp = /data:([^;]+);base64,(.*)/;

    this.handleLinkClickEvent = async (event) => {
      let socket = this.getSocket();

      let modelType = this.getAttribute('model-type');
      let modelId = this.getAttribute('model-id');
      let modelField = this.getAttribute('model-field');

      this.setAttribute('is-loading', '');
      this.removeAttribute('failed');

      let data;
      try {
        data = await socket.invoke('crud', {
          action: 'read',
          type: modelType,
          id: modelId,
          field: modelField
        });
      } catch (error) {
        this.setAttribute('failed', '');
        if (!this.hasAttribute('hide-error-logs')) {
          console.error(
            `Failed to download file because of error: ${error.message}`
          );
        }
      }

      this.removeAttribute('is-loading');

      if (typeof data !== 'string') {
        this.setAttribute('failed', '');
        if (!this.hasAttribute('hide-error-logs')) {
          console.error(
            'Failed to download file because it did not exist'
          );
        }
        return;
      };

      let dataParts = data.match(dataTypeRegExp);
      if (!dataParts) {
        this.setAttribute('failed', '');
        if (!this.hasAttribute('hide-error-logs')) {
          console.error(
            'Failed to process downloaded file because format was invalid'
          );
        }
        return;
      }

      let contentType = dataParts[1];
      let content = dataParts[2];

      let binaryString = atob(content);
      let length = binaryString.length;
      let bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      let blob = new Blob([ bytes ], { type: contentType });

      let fileName = this.getAttribute('file-name');
      let fileDataURL = URL.createObjectURL(blob);

      let downloadElement = document.createElement('a');
      downloadElement.style.display = 'none';
      downloadElement.setAttribute('href', fileDataURL);
      downloadElement.setAttribute('download', fileName);
      document.body.appendChild(downloadElement);
      downloadElement.click();
      downloadElement.remove();
      URL.revokeObjectURL(fileDataURL);
    };
  }

  connectedCallback() {
    this.removeAttribute('failed');
    this.removeAttribute('is-loading');
    this.addEventListener('click', this.handleLinkClickEvent);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleLinkClickEvent);
  }
}

window.customElements.define('download-link', DownloadLink);
