import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Stylus properties
import { stylus } from 'stylus';

// Wizard
import { ZLevelWizard_Start, StylusWaiting_Start } from 'wizard';
import { StatusBar_Init } from 'status'; 

let group, camera, scene, renderer, object;

init();

function init() {
	scene = new THREE.Scene();

	// Renderer setup
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	document.body.appendChild( renderer.domElement );

	// Camera setup
	camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 15, 20, 30 );
	scene.add(camera);

	// We need some light
	const ambientLight = new THREE.AmbientLight( 0xffffff );
	scene.add( ambientLight );

	const pointLight = new THREE.PointLight( 0xffffff, 15 );
	camera.add( pointLight );
	scene.add( camera );

	// Controls
	const controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 10;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI / 2;

	// Load stylus model
	function loadModel() {
		object.traverse( function ( child ) {
			if ( child.isMesh ) {
				for (const key in stylus.model.colors) {
					if ( stylus.model.colors.hasOwnProperty(key) ) {
						if ( child.name == key ) {
							child.material = new THREE.MeshStandardMaterial({ color: stylus.model.colors[key] });
						}
					}
				}
			}
		} );

		object.position.y = 1.5;
		object.scale.setScalar( 0.01 );
		scene.add( object );
		renderer.render(scene, camera);
	}

	const manager = new THREE.LoadingManager( loadModel );

	function onSuccess( obj ) {
		object = obj;
	}

	function onProgress( xhr ) {
		if ( xhr.lengthComputable ) {
			const percentComplete = xhr.loaded / xhr.total * 100;
			console.log( 'model ' + percentComplete.toFixed( 2 ) + '% downloaded' );
		}
	}

	function onError( err ) {
		console.log( 'Error loading model: ' + err );
	}
	
	const loader = new OBJLoader( manager );
	loader.load( stylus.model.path, onSuccess, onProgress, onError );

	// Some light: later maybe

	// Axes helper
	scene.add( new THREE.AxesHelper( 20 ) );

	// Make use of groups
	group = new THREE.Group();
	scene.add( group );

	// Some geometry to be replaced with stylus model
	const geometry = new THREE.PlaneGeometry( 25, 25 );
	const material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
	const plane = new THREE.Mesh( geometry, material );
	plane.rotation.x = Math.PI / 2;
	group.add( plane );

	window.addEventListener( 'resize', onWindowResize );

	StatusBar_Init();
	StylusWaiting_Start();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	renderer.render( scene, camera );
}


