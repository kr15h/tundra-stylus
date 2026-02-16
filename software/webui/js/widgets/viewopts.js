export class ViewOptions {
	constructor() {
		this.viewOptionsElement = document.getElementById('view_options');
		this.window = null;

		const buttons = this.viewOptionsElement.getElementsByTagName('button');
		for (const button of buttons) {
			if (button.textContent == 'Projected View') {
				button.addEventListener('click', (e) => {
					this.openInWindow();
				});
			}		
		}
	}

	openInWindow() {
		if (!this.window) {
			this.window = window.open(
				'views/projected/index.html',
				'Projected View',
				'width=600,height=400'
			);
		}
	}
}

