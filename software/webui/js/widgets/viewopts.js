export class ViewOptions {
	constructor() {
		this.viewOptionsElement = document.getElementById('view_options');
		this.pvWindow = null; // pv - Projected View
		this.pvCloseCheckInterval = null;
		this.calibrateButton = null;

		const buttons = this.viewOptionsElement.getElementsByTagName('button');
		for (const button of buttons) {
			if (button.textContent == 'Projected View') {
				button.addEventListener('click', (e) => {
					this.openProjectedView();
				});
			} else if (button.textContent == "Calibrate") {
				this.calibrateButton = button;
				this.calibrateButton.addEventListener('click', () => {
					this.beginPvCalibration();
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
					this.calibrateButton.classList.add('hidden');
  				}
			}, 500);

			// Show calibrate button
			if (this.calibrateButton.classList.contains('hidden')) {
				this.calibrateButton.classList.remove('hidden');
			} 
		} else {
			this.pvWindow.focus();
		}
	}

	beginPvCalibration() {
		if (!this.pvWindow) {
			console.log('Projection View not open');
			return;
		}

		console.log('Begin Projected View Calibration');
	}

}

