import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Stylus properties
import { stylus } from 'stylus';
import { StylusManager } from './stylus.js';

// Wizard
import { StylusWaiting_Start } from 'wizard';
import { StatusBar_Init } from 'status';

let group, camera, scene, renderer;

// TODO: This should be part of something like Scene class or something
let stylusModel = null; // Stylus model template to be cloned for each stylus instance 
let stylusTipShadow = null; // Stylus tip shadow instance to be cloned
const stylusModelMap = new Map(); // Maps stylus IDs to models in scene

// Manages networked stylus instances. 
// Not sure if one should do object loading there.
export const stylusManager = new StylusManager();

const STYLUS_SCALE = 0.001; // This could be set up in a settings/properties panel
const STYLUS_MODEL_PATH = 'assets/models/tundrastylus.obj'; 
const STYLUS_COLORS = {
	'Buttons Final': 0x000000,
	'Base Final': 0xffffff,
	'Cover Final': 0xbababa
};

// TODO:
// 1. Load model
// 2. Set up stylus manager
// 3. Add listeners
// 4. Fire up websocket connection

init();
StatusBar_Init();
StylusWaiting_Start();

function init() {
	scene = new THREE.Scene();

	// Renderer setup
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	document.body.appendChild( renderer.domElement );

	// Camera setup
	camera = new THREE.PerspectiveCamera( 
		50, // Narrow fov for better view 
		window.innerWidth / window.innerHeight, 
		0.1, // Near clipping, in meters 
		1000 ); // Far clipping plane
	camera.position.set( 1, 1, 1 ); // A bit closer to the origin at first
	scene.add(camera);

	// We need some light
	const ambientLight = new THREE.AmbientLight( 0xffffff );
	scene.add( ambientLight );

	const pointLight = new THREE.PointLight( 0xffffff, 15 );
	camera.add( pointLight );
	scene.add( camera );

	// Controls
	const controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI / 2;

	// Stylus tip shadow template
	const geometry = new THREE.CircleGeometry( 0.05, 32 ); 
	const material = new THREE.MeshBasicMaterial({ 
		color: 0x000000, 
		transparent: true, 
		opacity: 0.5, 
		side: THREE.DoubleSide
	}); 
	stylusTipShadow = new THREE.Mesh( geometry, material );
	stylusTipShadow.position.y = 0.01;
	stylusTipShadow.rotation.x = Math.PI / 2; 
	
	// Stylus model template loading
	const loader = new OBJLoader();
	loader.load( 
		STYLUS_MODEL_PATH, 
		(obj) => {
			stylusModel = obj;
			stylusModel.scale.setScalar( STYLUS_SCALE );

			// Assign colors
			stylusModel.traverse( ( child ) => {
				if ( child.isMesh ) {
					for (const key in STYLUS_COLORS) {
						if ( STYLUS_COLORS.hasOwnProperty(key) ) {
							if ( child.name == key ) {
								child.material = new THREE.MeshStandardMaterial({ 
									color: STYLUS_COLORS[key] 
								});
							}
						}
					}
				}
			});

			// Add helper axes
			const axesHelper = new THREE.AxesHelper(5); 
			stylusModel.add(axesHelper);

			// Check if we have any established stylus connections 
			// and clone models based on how many connected styluses we have
			if ( stylusManager.styluses.size ) {
				for ( const id of stylusManager.styluses.keys() ) {
					addStylusClone(id);
				}
			}			
		}, 
		(xhr) => {
			if ( xhr.lengthComputable ) {
				const percentComplete = xhr.loaded / xhr.total * 100;
				console.log( 'model ' + percentComplete.toFixed( 2 ) + '% downloaded' );
			}
		}, 
		(err) => {
			console.log( 'Error loading model: ' + err );
		} 
	);

	// Work area group
	group = new THREE.Group();
	scene.add( group );

	// Add work area canvas
	const canvasGeometry = new THREE.CircleGeometry( 2, 32 );
	const canvasMaterial = new THREE.MeshBasicMaterial( { color: 0xdfdfdf, side: THREE.DoubleSide } );
	const canvasMesh = new THREE.Mesh( canvasGeometry, canvasMaterial );
	canvasMesh.rotation.x = Math.PI / 2;
	group.add( canvasMesh );

	// Display grid so we can compare real units with virtual visually
	const size = 2; // this is in meters, remember
	const divisions = 20;
	const colorCenterLine = 0x777777;
	const colorGrid = 0xaaaaaa;
	const gridHelper = new THREE.GridHelper( size, divisions, colorCenterLine, colorGrid );
	group.add( gridHelper );

	// Axes helper
	const sceneAxisHelper = new THREE.AxesHelper( 12 );
	group.add( sceneAxisHelper );

	renderer.render(scene, camera);

	// Handle stylus manager events
	stylusManager.on( 'new_stylus', data => {
		addStylusClone( data.id );
	}); 

	stylusManager.on('pose', data => {
		const id = data.id;

		if ( !stylusModelMap.has( id ) ) {
			console.error( '3D model for stylus has not been added yet: ' + data.id );
			return;
		}

		const stylus = stylusModelMap.get( id ).stylus;
		const shadow = stylusModelMap.get( id ).shadow;

		stylus.position.subVectors(data.position, stylusManager.origin.position);
		stylus.quaternion.copy(data.quaternion);

		shadow.position.x = data.tip.position.x - stylusManager.origin.position.x;
		shadow.position.z = data.tip.position.z - stylusManager.origin.position.z;
		
		renderer.render(scene, camera);
	});
		
	stylusManager.on('click', data => {
		console.log('Button clicked:', data);
		if (data.buttonName == "menu") {
			stylusManager.setTipAsOrigin(stylusManager.getStylus(data.id));
		}
	});
		
	stylusManager.on('pressed', data => {
		console.log('Button pressed:', data)
	});
		
	stylusManager.on('released', data => {
		console.log('Button released:', data)
	});

	// I wonder if this should be part of stylusManager itself?
	// When initializing: new StylusManager( ws_connection ); 
	// How about that?
	stylus.connection.addEventListener('message', (m) => 
	{
		try {
			const obj_arr = JSON.parse(m.detail);
			// We are getting an array of possible multiple styluses
			for (const m of obj_arr) {
				stylusManager.handleWebSocketMessage(m);
			}
		} catch (e) {
			console.error(e);
		}
	});

	window.addEventListener( 'resize', onWindowResize );
}

function addStylusClone( id ) 
{
	if ( stylusModel == null ) {
		console.error( 'Stylus model not loaded' );
		return;
	}

	if ( stylusModelMap.has( id ) ) {
		console.error( 'Stylus with ID already added: ' + id );
		return;
	}

	const stylusClone = stylusModel.clone();
	scene.add( stylusClone );

	const stylusTipShadowClone = stylusTipShadow.clone();
	scene.add( stylusTipShadowClone );

	const stylusCombo = {
		stylus: stylusClone,
		shadow: stylusTipShadowClone
	};
	stylusModelMap.set( id, stylusCombo );

	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	renderer.render( scene, camera );
}
