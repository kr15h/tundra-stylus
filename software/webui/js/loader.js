// StylusModelLoader
// Loads and prepares stylus model for cloning in threejs scene

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STYLUS_ZOFFSET } from 'TundraStylus';

export class StylusModelLoader {
	constructor( path ) {
		this.listeners = {};
		this.scale = 0.001;
		this.offset = {
			x: 0,
			y: 0,
			z: -STYLUS_ZOFFSET * 1000 // 7 mm
		}
		this.path = 'assets/models/TundraStylus.obj';
		this.colors = {
			'Tracker_Body': 0x000000,
			'Stylus_Buttons_Body': 0x000000,
			'Stylus_Base_Body': 0xffffff,
			'Stylus_Cover_Body': 0xffffff
		}
		this.model = null;
		this.modalElement = document.getElementById( 'modal_loading' );
	}

	load() {
		const loader = new OBJLoader();
		loader.load(
			this.path,
			(obj) => {
				this.model = obj;
				this.model.scale.setScalar( this.scale );

				this.model.rotation.x = Math.PI;
				this.model.rotation.z = Math.PI;

				// Assign colors
				this.model.traverse( ( child ) => {
					if ( child.isMesh ) {
						console.log(child.name);
						
						// Shift origin
						const geometry = child.geometry;
						geometry.translate(this.offset.x, this.offset.y, this.offset.z);

						for (const key in this.colors) {
							if ( this.colors.hasOwnProperty(key) ) {
								if ( child.name == key ) {
									child.material = new THREE.MeshStandardMaterial({
										color: this.colors[key]
									});
								}
							}
						}
					}
				});

				// Add helper axes
				const axesHelper = new THREE.AxesHelper(50);
				this.model.add(axesHelper);
				
				const group = new THREE.Group();
				group.add(this.model);

				this.modalElement.classList.add( 'hidden' );

				this.emit('loaded', { model: group });
			},
			(xhr) => {
				if ( xhr.lengthComputable ) {
					const percentComplete = xhr.loaded / xhr.total * 100;
					const progressBar = this.modalElement.getElementsByTagName( 'progress' )[0];
					progressBar.value = percentComplete.toFixed( 2 );
				}
			},
			(err) => {
				console.error( 'Error loading model: ' + err );
			}
		);

		this.modalElement.classList.remove( 'hidden' );
	}

	emit(event, data) {
		if (this.listeners[event]) {
			this.listeners[event].forEach(callback => callback(data));
		}
	}

	on(event, callback) {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(callback);
	}

	off(event, callback) {
		if (this.listeners[event]) {
			this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
		}
	}
}
