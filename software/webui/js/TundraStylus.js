import * as THREE from 'three';

// Stylus tip distance from tracker origin
const STYLUS_TIP_DISTANCE = 0.18889; // in meters
const STYLUS_TIP_OFFSET = 0.13356; // axial, in meters
export const STYLUS_ZOFFSET = 0.015; // the model is a bit offset

// Here TundraStylus is rather a TundraStylus manager,
// sort of facade that provides a target for event listeners.
export class TundraStylus extends EventTarget {
	constructor() {
		super();

		this.styluses = new Map();
		this.origin = {
			position: new THREE.Vector3()
		};
		this.url = ''; // e.g. ws://localhost:8080/
		this.connection = null;
		this.devices = new Map();
		// Modals should be handled externally based on events
    //this.modalElement = document.getElementById('modal_stylus_waiting');
	}

	connect(url) {
    this.url = url;
		this.connection = new TundraStylus_Connection(this.url);

    // Modals should be handled externally based on events
		//this.modalElement.classList.remove( 'hidden' );
		//this.on('new_stylus', ( e ) => {
		//	this.modalElement.classList.add( 'hidden' );
		//});

		this.connection.addEventListener('message', (event) => {
			try {
				const messages = JSON.parse(event.detail);

				// We are getting an array of possible multiple styluses
				for (const message of messages) {
					this.handleWebSocketMessage(message);
				}
			} catch (error) {
				console.error(error);
			}
		});

		this.connection.connect();
	}

	handleWebSocketMessage(message) {
		// { "id":<tracker_id>, "buttons":{"trig":<true|false>,"grip":...} "pose":<3x4_pose_array> }
		const {id, buttons, pose} = message;
		let firstStylus = false;

		if (!this.styluses.has(id)) {
			this.styluses.set(id, new TundraStylus_Single(id));

			// We want to notify the rest of the app that a new stylus has been added
      //this.emit('new_stylus', { id });
      this.dispatchEvent(new CustomEvent('new_stylus', {detail: {id}}));

			// If this is the first stylus to be added, set origin based on it
			if (this.styluses.size == 1) firstStylus = true;
		}
		
		const stylus = this.styluses.get(id);

		if (pose) {
			stylus.updatePose(pose);

			// If this is first stylus just added, 
			// set the origin based on where its tip is
			if (firstStylus) {
				this.setTipAsOrigin(stylus);
			}

			const tipPosition = new THREE.Vector3();
			tipPosition.copy(stylus.tip.position);
			tipPosition.sub(this.origin.position);

      this.dispatchEvent(new CustomEvent('pose', {detail: {
        id,
        pose,
        position: stylus.position,
        quaternion: stylus.quaternion,
        tip: tipPosition
      }}));
		}
		
		if (buttons) {
			for (const [buttonName, state] of Object.entries(buttons)) {
				const previousState = stylus.buttons[buttonName];
				stylus.updateButtonState(buttonName, state);
				
				if (state !== previousState) {
					// We want to take origin offset into account when passing on the tip pos
					const position = new THREE.Vector3();
					position.copy( stylus.tip.position );
					position.sub( this.origin.position );

					const event = state ? 'pressed' : 'released';
					
          this.dispatchEvent(new CustomEvent(event, {detail: {
            id,
            buttonName,
            position, 
            tip: stylus.tip
          }}));
					
          if (state) {
            this.dispatchEvent(new CustomEvent('click', {detail: {
              id, 
              buttonName, 
              position,
              tip: stylus.tip
            }}));
          }
				}
			}
		}
	}

	setTipAsOrigin(stylus) {
		this.origin.position.copy(stylus.tip.position);
	}

	getStylus(id) {
		if (!this.styluses.has(id)) {
			console.error('No stylus with id found:', id);
    }
		return this.styluses.get(id);
	}
}

class TundraStylus_Single {
	constructor(id) {
		this.id = id;
		this.pose = [[0,0,0,0], [0,0,0,0], [0,0,0,0]];
		this.position = new THREE.Vector3();
		this.quaternion = new THREE.Quaternion();
		this.buttons = {
			trig: false,
			grip: false,
			tpad: false,
			menu: false,
		};
		this.tip = {
			position: new THREE.Vector3()
		}
	}

	updatePose(pose) {
		// Save raw pose of styus
		this.pose = pose;

		// We need to change the SteamVR pose 3x4 matrix to threejs 4x4
		// to be able to take advantage of THREE utilities, to extract
		// position and rotation.
		const matrix = new THREE.Matrix4();
		matrix.set(
			pose[0][0], pose[0][1], pose[0][2], pose[0][3],
			pose[1][0], pose[1][1], pose[1][2], pose[1][3],
			pose[2][0], pose[2][1], pose[2][2], pose[2][3],
			0, 0, 0, 1
		);

		// Decompose the matrix into position, quaternion (rotation), and scale
		const position = new THREE.Vector3();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3(); // We can ignore this, but it is needed here
		matrix.decompose(position, quaternion, scale);

		this.position.copy(position);
		this.quaternion.copy(quaternion);

		const offset = Math.sqrt( Math.pow(STYLUS_TIP_DISTANCE, 2) / 2 );
		const tipPosition = this.calculateTipPosition(
			this.position, 
			this.quaternion, 
			STYLUS_TIP_OFFSET, -STYLUS_TIP_OFFSET, STYLUS_ZOFFSET
		);

		this.tip.position.copy(tipPosition);
	}

	updateButtonState(buttonName, state) {
		if (this.buttons.hasOwnProperty(buttonName)) {
			this.buttons[buttonName] = state;
		}
	}

	calculateTipPosition(position, quaternion, xOffset, yOffset, zOffset) 
	{
		const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
		const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
		const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);

		const xOffsetVector = localX.multiplyScalar(xOffset);
		const yOffsetVector = localY.multiplyScalar(yOffset);
		const zOffsetVector = localZ.multiplyScalar(zOffset);

		const tipPosition = new THREE.Vector3().copy(position);
		tipPosition.add(xOffsetVector).add(yOffsetVector).add(zOffsetVector);

		return tipPosition;
	}
}

class TundraStylus_Connection extends EventTarget {
	constructor(url) {
		super();

		this.url = url;
		this.socket = null;
		this.isConnected = false;
		this.reconnectInterval = 3000;
		this.maxRetries = Infinity; 
		this.retryCount = 0;
	}

	connect() {
		if (this.retryCount >= this.maxRetries) {
			console.error('Max reconnect attempts reached.');
			this.dispatchEvent(new CustomEvent('error', { detail: 'Max reconnect attempts reached.' }));
			return;
		}
	
		this.socket = new WebSocket(this.url);
	
		this.socket.onopen = () => {
			console.log('WebSocket connected.');
			this.isConnected = true;
			this.retryCount = 0;
			this.dispatchEvent(new CustomEvent('connect', { detail: { url: this.url } }));
		};
	
		this.socket.onclose = (event) => {
			console.warn('WebSocket closed.', event);
			this.isConnected = false;
			this.dispatchEvent(new CustomEvent('close', { detail: { code: event.code, reason: event.reason } }));
			this.reconnect();
		};
	
		this.socket.onerror = (error) => {
			console.error('WebSocket error.', error);
			this.dispatchEvent(new CustomEvent('error', { detail: error }));
		};
	
		this.socket.onmessage = (message) => {
			this.dispatchEvent(new CustomEvent('message', { detail: message.data }));
		};
	}

	reconnect() {
		if (!this.isConnected) {
			console.log(`Reconnecting in ${this.reconnectInterval / 1000}s...`);
			setTimeout(() => {
				this.retryCount += 1;
				this.connect();
			}, this.reconnectInterval);
		}
	}

	close() {
		if (this.socket) {
			this.socket.close();
			this.isConnected = false;
            this.dispatchEvent(new CustomEvent('close', { detail: { url: this.url } }));
		}
	}
}

