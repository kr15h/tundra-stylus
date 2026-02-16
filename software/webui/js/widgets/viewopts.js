import { Tools } from 'tools/manager.js';	

export class ViewOptions {
	constructor(calibrateTool) {
		this.viewOptionsElement = document.getElementById('view_options');
		this.calibrateTool = calibrateTool; // Forwards events from there to Projected View
		// Thoughts: maybe here it is where storing window in global state makes sense?
		this.pvWindow = null; // pv - Projected View
		this.pvCloseCheckInterval = null;
		this.calibrateButton = null;

		const buttons = this.viewOptionsElement.getElementsByTagName('button');
		for (const button of buttons) {
			if (button.textContent == 'Projected View') {
				button.addEventListener('click', (e) => {
					this.openProjectedView();
				});
			}
		}

		// Get the Calibrate tool button
		this.toolBarElement = document.getElementById('widget_tools');
		const toolButtons = this.toolBarElement.getElementsByTagName('button');
		for (const button of toolButtons) {
			if (button.textContent == 'Calibrate') {
				this.calibrateButton = button;
			}
		} 

		this.calibrateTool.addEventListener('calibrationComplete', (e) => {
  			const fourPoints = e.detail;
  			console.log("Got 4 points:", fourPoints);
		});

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
					
					// Disable calibrate button if projection view window is closed
					this.calibrateButton.disabled = true;
  				}
			}, 500);

			// Enable calibrate button
			this.calibrateButton.disabled = false; 
		} else {
			this.pvWindow.focus();
		}
	}

}

