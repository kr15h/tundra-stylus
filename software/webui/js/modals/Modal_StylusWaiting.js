export class Modal_StylusWaiting {
  constructor(element_id) {
    this.stylus = null;
    this.element = document.getElementById(element_id);
    this.element.classList.remove( 'hidden' );
  }

  addListeners(stylus) {
    if (this.stylus) {
      return;
    }

    this.stylus = stylus;
    this.stylus.addEventListener('new_stylus', (event) => {
      this.element.classList.add('hidden');
    });
  }
}