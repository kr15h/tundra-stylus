export class ViewOptions {
	constructor() {
		this.viewOptionsElement = document.getElementById('view_options');
		this.pvWindow = null; // pv - Projected View
		this.pvCloseCheckInterval = null;

		const buttons = this.viewOptionsElement.getElementsByTagName('button');
		for (const button of buttons) {
			if (button.textContent == 'Projected View') {
				button.addEventListener('click', (e) => {
					this.openProjectedView();
				});
			}		
		}
	}

	openProjectedView() {
		if (!this.pvWindow) {
			this.pvWindow = window.open(
				'views/projected/index.html',
				'Projected View',
				'width=600,height=400'
			);

			this.pvCloseCheckInterval = setInterval(() => {
  				if (!this.pvWindow || this.pvWindow.closed) {
    				clearInterval(this.pvCloseCheckInterval);
    				console.log('Projected View window closed');
					this.pvWindow = null;
  				}
			}, 500);
		}
	}

}

