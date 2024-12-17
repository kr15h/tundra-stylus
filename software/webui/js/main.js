import { state } from 'state'; 
import { StylusModelLoader } from 'loader';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Stylus properties
import { StylusManager } from 'stylus';

// Wizard
import { StatusBar_Init } from 'status';

let group, camera, scene, renderer;

// TODO: This should be part of something like Scene class or something
let stylusModel = null; // Stylus model template to be cloned for each stylus instance 
let stylusTipShadow = null; // Stylus tip shadow instance to be cloned
const stylusModelMap = new Map(); // Maps stylus IDs to models in scene

// Manages networked stylus instances. 
// Not sure if one should do object loading there.
export const stylusManager = null;

// TODO:
// 1. Load model
// 1a Setup scene
// 2. Set up stylus manager
// 3. Add listeners
// 4. Fire up websocket connection

// 1. Load model
const modelLoader = new StylusModelLoader();

modelLoader.on( 'loaded', ( data ) => {
	console.log( 'Stylus model loaded' );
	stylusModel = data.model;

	// 1a Setup scene
	setupScene();
	
	state.stylusManager = new StylusManager();

	// 2. Set up stylus manager, including listeners
	setupStylusManager( state );

	// 4. Connect stylus manager and wait for incoming messages
	state.stylusManager.connect();

	StatusBar_Init();
});

modelLoader.load();

function setupScene() {
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
	stylusTipShadow.position.y = 0.001;
	stylusTipShadow.rotation.x = Math.PI / 2; 

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

	window.addEventListener( 'resize', onWindowResize );
}

function setupStylusManager( state ) {

	// Handle stylus manager events
	state.stylusManager.on( 'new_stylus', data => {
		addStylusClone( data.id );
	}); 

	state.stylusManager.on('pose', data => {
		const id = data.id;

		if ( !stylusModelMap.has( id ) ) {
			console.error( '3D model for stylus has not been added yet: ' + data.id );
			return;
		}

		const stylus = stylusModelMap.get( id ).stylus;
		const shadow = stylusModelMap.get( id ).shadow;

		stylus.position.subVectors(data.position, state.stylusManager.origin.position);
		stylus.quaternion.copy(data.quaternion);

		shadow.position.x = data.tip.position.x - state.stylusManager.origin.position.x;
		shadow.position.z = data.tip.position.z - state.stylusManager.origin.position.z;
		
		renderer.render(scene, camera);
	});
		
	state.stylusManager.on('click', data => {
		console.log('Button clicked:', data);
		if (data.buttonName == "menu") {
			state.stylusManager.setTipAsOrigin( state.stylusManager.getStylus(data.id) );
		}
	});
		
	state.stylusManager.on('pressed', data => {
		console.log('Button pressed:', data)
	});
		
	state.stylusManager.on('released', data => {
		console.log('Button released:', data)
	});
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

	stylusModelMap.set( id, { 
		stylus: stylusClone, 
		shadow: stylusTipShadowClone 
	});

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
