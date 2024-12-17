import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Stylus properties
import { stylus } from 'stylus';
import { StylusManager } from './stylus.js';

// Wizard
import { ZLevelWizard_Start, StylusWaiting_Start } from 'wizard';
import { StatusBar_Init } from 'status';

let group, camera, scene, renderer, object, tip;

const stylusManager = new StylusManager();
const STYLUS_SCALE = 0.001; // This could be set up in a settings/properties panel
const offset = {x:0, y:0, z:0};

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
		object.scale.setScalar( STYLUS_SCALE );
		scene.add( object );
		const axesHelper = new THREE.AxesHelper(5); // Size of the axes, this is 100x the size, given object scale
		object.add(axesHelper);

		// Add stylus tip shadow
		const geometry = new THREE.CircleGeometry( 0.05, 32 ); 
		const material = new THREE.MeshBasicMaterial({ 
			color: 0x000000, 
			transparent: true, 
			opacity: 0.5, 
			side: THREE.DoubleSide
		}); 
		tip = new THREE.Mesh( geometry, material );
		tip.position.y = 0.01;
		tip.rotation.x = Math.PI / 2; 
		scene.add( tip );

		renderer.render(scene, camera);

		stylusManager.on('pose', data => {
			object.position.x = data.position.x - stylusManager.origin.position.x;
			object.position.y = data.position.y - stylusManager.origin.position.y;
			object.position.z = data.position.z - stylusManager.origin.position.z;
			object.quaternion.copy(data.quaternion);
			tip.position.x = data.tip.position.x - stylusManager.origin.position.x;
			tip.position.z = data.tip.position.z - stylusManager.origin.position.z;
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

		stylus.connection.addEventListener('message', (m) => {
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

	// Axes helper
	scene.add( new THREE.AxesHelper( 12 ) );

	// Make use of groups
	group = new THREE.Group();
	scene.add( group );

	const geometry = new THREE.CircleGeometry( 2, 32 );
	const material = new THREE.MeshBasicMaterial( {color: 0xdfdfdf, side: THREE.DoubleSide} );
	const plane = new THREE.Mesh( geometry, material );
	plane.rotation.x = Math.PI / 2;
	group.add( plane );

	const size = 2;
	const divisions = 20;

	const gridHelper = new THREE.GridHelper( size, divisions );
	group.add( gridHelper );

	window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	renderer.render( scene, camera );
}
