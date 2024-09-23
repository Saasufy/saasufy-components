class OverlayModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .overlay-background {
          display: flex;
          justify-content: center;
          align-items: center;
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 10000;
          background-color: rgba(0, 0, 0, .3);
        }

        .modal-dialog {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: var(--modal-width, 800px);
          height: var(--modal-height, auto);
          max-width: 100%;
          min-height: var(--modal-min-height, auto);
          background-color: #ffffff;
        }

        .modal-title-bar {
          display: var(--title-bar-display, flex);
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 10px;
          color: #ffffff;
          box-sizing: border-box;
          background: #e37042;
        }

        .modal-content {
          flex-grow: 1;
          padding: 10px;
        }

        .modal-footer {
          display: var(--footer-display, flex)
          padding: 10px;
        }

        .close-button {
          cursor: pointer;
        }
      </style>
      <div class="overlay-background" part="overlay-background">
        <div class="modal-dialog" part="dialog">
          <div class="modal-title-bar" part="title-bar">
            <div>
              <slot name="title"></slot>
            </div>
            <div class="close-button">&#x2715;</div>
          </div>
          <div class="modal-content" part="content">
            <slot name="content"></slot>
          </div>
          <div class="modal-footer" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
    this.shadowRoot.querySelector('.close-button').addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('close', { bubbles: true })
      );
    });
  }
}

window.customElements.define('overlay-modal', OverlayModal);
