import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export class RulerTool {
	constructor( workspace ) {
		this.pointA = null;
		this.pointB = null;
		this.distance = 0;
		this.workspace = workspace;
		this.rulerGroup = new THREE.Group();
		this.textureLoader = new THREE.TextureLoader();
		this.circleTexture = this.textureLoader.load('./assets/textures/circle.png');
		this.label = null;
		this.workspace.add(this.rulerGroup);
	}

	activate() {
		//this.workspace.add(this.rulerGroup);
	}

	deactivate() {
		//this.workspace.remove(this.rulerGroup);
		this.clear();
	}

	clear() {
		if (this.rulerGroup.children.length === 0) {
			return;
		}

		this.rulerGroup.traverse((child) => {
			if (child.isMesh) {
				if (child.geometry) {
					child.geometry.dispose();
				}
			}

			if (child.material) {
				child.material.dispose();
			}
		});

		this.rulerGroup.clear();
		this.removeLabel();
		this.pointA = null;
		this.pointB = null;
		this.distance = 0;
	}

	onStylusClick(e) {
		if ( e.buttonName == 'trig' ) {
			this.setPoint( e.positionRelative );	
		}
	}


	onStylusPressed(e) {
		// Nothing here
	}

	onStylusReleased(e) {
		// Nothing here
	}

	onStylusPose(pose) {
		// Nothing here
	}

	setPoint( position ) {
		if ( !this.pointA && !this.pointB ) {
			this.pointA = new THREE.Vector3();
			this.pointA.copy( position );
			this.distance = 0;
			this.addPoint( this.pointA );
		} else if ( !this.pointB ) {
			this.pointB = new THREE.Vector3();
			this.pointB.copy( position );
			this.addPoint( this.pointB );
			this.calculateDistance();
			this.addLine();
			this.addLabel();
		} else {
			this.pointA = null;
			this.pointB = null;
			this.distance = 0;
			this.clearGroup();
			this.removeLabel();
		}
	}

	calculateDistance() {
		this.distance = this.pointA.distanceTo( this.pointB );
		console.log( 'Distance between two points: ' + this.distance );
	}

	clearGroup() {

		// Remove all children from the group
		while (this.rulerGroup.children.length > 0) {
			const child = this.rulerGroup.children[0];
			this.rulerGroup.remove(child);
		
			// Dispose of geometries and materials to free memory
			if (child.geometry) child.geometry.dispose();
			if (child.material) {
				if (Array.isArray(child.material)) {
					child.material.forEach((mat) => mat.dispose());
				} else {
					child.material.dispose();
				}
			}
		}
	}

	addPoint( position ) {

		// Create a sprite material
		const spriteMaterial = new THREE.SpriteMaterial({
			map: this.circleTexture,
			color: 0xff00ff, // Tint color
			sizeAttenuation: false, // Keep size constant regardless of distance
			depthTest: false
		});

		// Create a sprite and add it to the scene
		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.scale.set(0.01, 0.01, 1); // Size of the sprite
		sprite.position.copy(position); // Position in 3D space
		this.rulerGroup.add(sprite);
	}

	addLine() {
		const lineGeometry = new LineGeometry();
		lineGeometry.setPositions([
			this.pointA.x, this.pointA.y, this.pointA.z,
			this.pointB.x, this.pointB.y, this.pointB.z,
		]);

		// Create the line material
		const lineMaterial = new LineMaterial({
			color: 0x00ffff,
			linewidth: 2, // Width in screen space
			depthTest: false, // Always render on top
		});

		const fatLine = new Line2(lineGeometry, lineMaterial);
		this.rulerGroup.add(fatLine);
	}

	addLabel() {
		this.removeLabel();

		this.label = document.createElement('div');
		this.label.className = 'label';

		const mid = new THREE.Vector3();
		mid.lerpVectors(this.pointA, this.pointB, 0.5);

		this.label.dataset.x = mid.x;
		this.label.dataset.y = mid.y + 0.1;
		this.label.dataset.z = mid.z;

		const mm = this.distance * 1000;
		this.label.textContent = `${mm.toFixed(2)} mm`;
		document.body.appendChild(this.label);
	}

	removeLabel() {
		if (this.label) {
			this.label.remove();
			this.label = null;	
		}
	}
}