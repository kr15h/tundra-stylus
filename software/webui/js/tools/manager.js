import { RulerTool } from 'tools/ruler.js'; 
import { FreehandTool } from 'tools/freehand.js'; 

export const Tools = {
	RULER: null,
	FREEHAND: null
}

export class ToolManager {
	constructor(workspace) {
		this.workspace = workspace;
		this.activeTool = null;

		// Init tools
		Tools.RULER = new RulerTool(this.workspace);
		Tools.FREEHAND = new FreehandTool(this.workspace);
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

	clear() {
		if (this.activeTool) {
			this.activeTool.clear();
		}
	}
}