import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export class CalibrateTool {
	constructor( workspace ) {
		
        // Points for homography mapping
        this.pointA = null;
		this.pointB = null;
        this.pointC = null;
        this.pointD = null;

        // Other things
		this.workspace = workspace;
		this.calibrateGroup = new THREE.Group();
		this.textureLoader = new THREE.TextureLoader();
		this.circleTexture = this.textureLoader.load('./assets/textures/circle.png');
		this.workspace.add(this.calibrateGroup);
	}

	activate() {
		//this.workspace.add(this.calibrateGroup);
	}

	deactivate() {
		//this.workspace.remove(this.calibrateGroup);
		this.clear();
	}

	clear() {
		if (this.calibrateGroup.children.length === 0) {
			return;
		}

		this.calibrateGroup.traverse((child) => {
			if (child.isMesh) {
				if (child.geometry) {
					child.geometry.dispose();
				}
			}

			if (child.material) {
				child.material.dispose();
			}
		});

		this.calibrateGroup.clear();
		this.removeLabel();
		
        this.pointA = null;
		this.pointB = null;
        this.pointC = null;
        this.pointD = null;
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
        if ( !this.pointA && !this.pointB && !this.pointC && !this.pointD ) {
            this.pointA = new THREE.Vector3();
			this.pointA.copy( position );
			this.addPoint( this.pointA );
        } else if ( !this.pointB && !this.pointC && !this.pointD ) {
            this.pointB = new THREE.Vector3();
			this.pointB.copy( position );
			this.addPoint( this.pointB );
        } else if ( !this.pointC && !this.pointD ) {
			this.pointC = new THREE.Vector3();
			this.pointC.copy( position );
			this.addPoint( this.pointC );
		} else if ( !this.pointD ) {
			this.pointD = new THREE.Vector3();
			this.pointD.copy( position );
			this.addPoint( this.pointD );
			this.addLines();
		} else {
			this.pointA = null;
			this.pointB = null;
            this.pointC = null;
			this.pointD = null;
			this.clearGroup();
		}
	}

	clearGroup() {

		// Remove all children from the group
		while (this.calibrateGroup.children.length > 0) {
			const child = this.calibrateGroup.children[0];
			this.calibrateGroup.remove(child);
		
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
		this.calibrateGroup.add(sprite);
	}

	addLines() {
		const lineGeometry = new LineGeometry();
		lineGeometry.setPositions([
			this.pointA.x, this.pointA.y, this.pointA.z,
			this.pointB.x, this.pointB.y, this.pointB.z,
            this.pointC.x, this.pointC.y, this.pointC.z,
            this.pointD.x, this.pointD.y, this.pointD.z,
            this.pointA.x, this.pointA.y, this.pointA.z
		]);

		// Create the line material
		const lineMaterial = new LineMaterial({
			color: 0x00ffff,
			linewidth: 2, // Width in screen space
			depthTest: false, // Always render on top
		});

		const fatLine = new Line2(lineGeometry, lineMaterial);
		this.calibrateGroup.add(fatLine);
	}

}