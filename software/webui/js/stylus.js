import WebSocketManager from 'wsman';
import * as THREE from 'three';

// Stylus tip distance from tracker origin
const STYLUS_TIP_DISTANCE = 0.18889; // in meters
const STYLUS_TIP_OFFSET = 0.13356; // axial, in meters

export const stylus = {
	model: {
			path: 'assets/models/tundrastylus.obj',
			colors: {
					'Buttons Final': 0x000000,
					'Base Final': 0xffffff,
					'Cover Final': 0xbababa
			}
	},
	connection: new WebSocketManager('ws://localhost:8080/'),
	setup: {
		completed: false
	},
	devices: new Map()
};

// stylus.js
export class Stylus {
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
			STYLUS_TIP_OFFSET, -STYLUS_TIP_OFFSET, 0
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

export class StylusManager {
	constructor() {
		this.styluses = new Map();
		this.listeners = {};
	}

	handleWebSocketMessage(message) {
		// { "id":<tracker_id>, "buttons":{"trig":<true|false>,"grip":...} "pose":<3x4_pose_array> }
		const { id, buttons, pose } = message;
		
		if (!this.styluses.has(id)) {
			this.styluses.set(id, new Stylus(id));
		}
		
		const stylus = this.styluses.get(id);
		
		if (pose) {
			stylus.updatePose(pose);
			this.emit('pose', { 
				id, 
				pose, 
				position: stylus.position, 
				quaternion: stylus.quaternion,
				tip: stylus.tip 
			});
		}
		
		if (buttons) {
			for (const [buttonName, state] of Object.entries(buttons)) {
				const previousState = stylus.buttons[buttonName];
				stylus.updateButtonState(buttonName, state);
				
				if (state !== previousState) {
					const event = state ? 'pressed' : 'released';
					this.emit(event, { id, buttonName, tip: stylus.tip });
					if (state) this.emit('click', { id, buttonName, tip: stylus.tip });
				}
			}
		}
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

