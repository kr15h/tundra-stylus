import WebSocketManager from 'wsman';

export const stylus = {
	model: {
			path: 'assets/models/tundrastylus.obj',
			colors: {
					'Buttons': 0x000000,
					'Base Clone': 0xffffff,
					'Cover Clone': 0xbababa
			}
	},
	connection: new WebSocketManager('ws://localhost:8080/'),
	setup: {
		completed: false
	},
	tracker: {
		position: { x:0, y:0, z:0 },
		fullPose: [	[0,0,0,0], 
					[0,0,0,0], 
					[0,0,0,0]]
	},
	tip: {
		position: { x:0, y:0, z:0 }
	}
};

