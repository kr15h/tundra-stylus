import WebSocketManager from 'wsman';

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

export function Stylus_Init() {
	//stylus.connection.addEventListener('message', (m) => {
	//	console.log(m);
	//});
}

