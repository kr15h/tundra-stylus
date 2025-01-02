import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export class FreehandTool {
	constructor(workspace) {
		this.workspace = workspace;
		this.freehandGroup = new THREE.Group();
		this.trigPressed = false;
		this.line = null; // active line
		this.points = [];
		this.workspace.add(this.freehandGroup);
	}

	activate() {
		//this.workspace.add(this.freehandGroup);
	}

	deactivate() {
		//this.workspace.remove(this.freehandGroup);

		/*
		if (this.freehandGroup.children.length === 0) {
			return;
		}

		this.freehandGroup.traverse((child) => {
			if (child.isMesh) {
				if (child.geometry) {
					child.geometry.dispose();
				}
			}

			if (child.material) {
				child.material.dispose();
			}
		});

		this.freehandGroup.clear();
		*/

		this.trigPressed = false;
		this.line = null;
		this.points.length = 0;
	}

	clear() {
		if (this.freehandGroup.children.length === 0) {
			return;
		}

		this.freehandGroup.traverse((child) => {
			if (child.isMesh) {
				if (child.geometry) {
					child.geometry.dispose();
				}
			}

			if (child.material) {
				child.material.dispose();
			}
		});

		this.freehandGroup.clear();
	}

	onStylusClick(e) {
		// No
	}


	onStylusPressed(e) {
		if (e.buttonName == 'trig') {
			this.trigPressed = true;
		}

		if (!this.trigPressed) {
			return;
		}

		const p = e.position;
		this.points = [p.x, p.y, p.z];
		const lineGeometry = new LineGeometry();
		lineGeometry.setPositions(this.points);

		const lineMaterial = new LineMaterial({
			color: 0x0000ff,
			linewidth: 2, // Width in screen space
			depthTest: false, // Always render on top
		});

		this.line = new Line2(lineGeometry, lineMaterial);
		this.freehandGroup.add(this.line);
	}

	onStylusReleased(e) {
		if (e.buttonName == 'trig') {
			this.trigPressed = false;
			this.line = null;
			this.points.length = 0;
		}
	}

	onStylusPose(data) {
		if (!this.trigPressed) {
			return;
		}

		if (!this.line) {
			return;
		}

		const newPoint = [data.position.x, data.position.y, data.position.z];
		this.points = [...this.points, ...newPoint];

		const newGeometry = new LineGeometry();
		newGeometry.setPositions(this.points);
		this.line.geometry = newGeometry;
	}
}