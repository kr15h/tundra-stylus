// StylusModelLoader
// Loads and prepares stylus model for cloning in threejs scene

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export class StylusModelLoader {
	constructor( path ) {
		this.listeners = {};
		this.scale = 0.001;
		this.path = 'assets/models/tundrastylus.obj';
		this.colors = {
			'Buttons Final': 0x000000,
			'Base Final': 0xffffff,
			'Cover Final': 0xbababa
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

				// Assign colors
				this.model.traverse( ( child ) => {
					if ( child.isMesh ) {
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
				const axesHelper = new THREE.AxesHelper(5); 
				this.model.add(axesHelper);	
				
				this.modalElement.classList.add( 'hidden' );
				
				this.emit('loaded', { model: this.model });
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
