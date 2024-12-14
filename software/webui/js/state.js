export const state = {
	stylus: {
		model: {
			path: 'assets/models/tundrastylus.obj',
			colors: {
				'Buttons': 0x000000,
				'Base Clone': 0xffffff,
				'Cover Clone': 0xbababa
			}
		},
		socket: null,
		tracker: {
			position: { x:0, y:0, z:0 },
			fullPose: [	[0,0,0,0], 
						[0,0,0,0], 
						[0,0,0,0]]
		},
		tip: {
			position: { x:0, y:0, z:0 }
		}
	},
	scene: {
		setup: {
			completed: false
		}
	}
}