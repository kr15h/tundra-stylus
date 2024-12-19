import { Tools } from 'tools/manager.js';	

export class ToolBar {
	constructor(toolManager) {
		this.toolBarElement = document.getElementById('widget_tools');
		this.toolManager = toolManager;

		const buttons = this.toolBarElement.getElementsByTagName('button');
		for (const button of buttons) {
			if (button.textContent == 'Ruler') {
				button.addEventListener('click', (e) => {
					this.deselectAllToolButtons();
					this.toolManager.selectTool(Tools.RULER);
					this.selectToolButton(button.textContent);
				});
			} else if (button.textContent == 'Freehand') {
				button.addEventListener('click', (e) => {
					this.deselectAllToolButtons();
					this.toolManager.selectTool(Tools.FREEHAND);
					this.selectToolButton(button.textContent);
				});
			} else if (button.textContent == 'Clear') {
				button.addEventListener('click', (e) => {
					this.toolManager.clear();
				});
			}
		}
	}

	selectToolButton(textContent) {
		const buttons = this.toolBarElement.getElementsByTagName('button');

		for (const button of buttons) {
			if (button.textContent == textContent) {
				button.classList.add('active');
				return;
			}
		}
	}

	deselectAllToolButtons() {
		const buttons = this.toolBarElement.getElementsByTagName('button');

		for (const button of buttons) {
			if (button.classList.contains('active')) {
				button.classList.remove('active');
			}
		}
	}
}

