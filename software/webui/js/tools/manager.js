export class ToolManager {
	constructor() {
		this.activeTool = null;
	}

	selectTool(tool) {
		if (this.activeTool) {
			this.activeTool.deactivate();
		}

		this.activeTool = tool;
		this.activeTool.activate();
	}

	deselectTool() {
		if (this.activeTool) {
			this.activeTool.deactivate();
		}

		this.activeTool = null;
	}

	onStylusClick(e) {
		if (this.activeTool) {
			this.activeTool.onStylusClick(e);
		}
	}

	onStylusPressed(e) {
		if (this.activeTool) {
			this.activeTool.onStylusPressed(e);
		}
	}

	onStylusReleased(e) {
		if (this.activeTool) {
			this.activeTool.onStylusReleased(e);
		}
	}

	onStylusPose(pose) {
		if (this.activeTool) {
			this.activeTool.onStylusPose(pose)
		}
	}
}