import { state } from 'state'; 
import { StylusModelLoader } from 'loader';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Stylus properties
import { TundraStylus } from 'TundraStylus';  

// Wizard
import { StatusBar_Init } from 'status';

// Tool manager with tools included
import { ToolManager, Tools } from 'tools/manager.js'; 

// UI Widgets
import { ToolBar } from 'widgets/toolbar.js';
import { Modal_StylusWaiting } from 'modals/Modal_StylusWaiting.js';

let group, camera, scene, renderer;
let origin = new THREE.Vector3();
let firstPoseReceived = false;

// TODO: This should be part of something like Scene class or something
let stylusModel = null; // Stylus model template to be cloned for each stylus instance 
let stylusTipShadow = null; // Stylus tip shadow instance to be cloned
const stylusModelMap = new Map(); // Maps stylus IDs to models in scene

export const stylus = null;

// Set up workspace where we will add all shapes etc
const workspace = new THREE.Group();
workspace.name = 'Workspace'; 

// Set up tool manager
const toolMan = new ToolManager(workspace); // Manages tool activation/deactivation
const toolBar = new ToolBar(toolMan); // Connects visible user inteface to tool man
const stylusWaitingModal = new Modal_StylusWaiting('modal_stylus_waiting');

// FPS Control Variables
const clock = new THREE.Clock();
let delta = 0;
const fps = 60;
const interval = 1 / fps;

const modelLoader = new StylusModelLoader();
modelLoader.on( 'loaded', ( data ) => {
  console.log( 'Stylus model loaded' );
  stylusModel = data.model;

  // 1a Setup scene
  setupScene();

  scene.add( workspace );
  
  // TODO: store it here as root of app instead of state
  state.stylus = new TundraStylus();

  // Now when we have a stylus, modals can add listeners to it
  stylusWaitingModal.addListeners(state.stylus);

  // 2. Set up stylus manager, including listeners
  // Does the stylus manager really need access to state?
  setupStylus( state );

  // 4. Connect stylus manager and wait for incoming messages
  state.stylus.connect('ws://localhost:8080');

  // If this needs to set up listeners to things, we pass those things to it
  StatusBar_Init();

  // Test activate the ruler tool
  toolMan.selectTool(Tools.RULER);
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

  const pointLight = new THREE.PointLight( 0xffffff, 1 );
  camera.add( pointLight );
  scene.add( camera );

  // Controls
  const controls = new OrbitControls( camera, renderer.domElement );
  controls.minDistance = 0.1;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2;

  // Stylus tip shadow template
  const geometry = new THREE.CircleGeometry( 0.01, 32 ); 
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.25, 
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

function setupStylus( state ) {
  state.stylus.addEventListener('new_stylus', event => {
    const data = event.detail;
    addStylusClone(data.id);
  });

  state.stylus.addEventListener('pose', (event) => {
    const data = event.detail;
    data.positionRelative = getRelativePosition(data.position);

    if ( !stylusModelMap.has(data.id) ) {
      console.error( '3D model for stylus has not been added yet: ' + data.id );
      return;
    }

    if (!firstPoseReceived) {
      setOrigin(data.position);
      firstPoseReceived = true;
    }

    const stylus = stylusModelMap.get(data.id).stylus;
    stylus.position.copy(getRelativePosition(data.tracker.position));
    stylus.quaternion.copy(data.tracker.quaternion);

    const shadow = stylusModelMap.get(data.id).shadow;
    shadow.position.x = data.positionRelative.x;
    shadow.position.z = data.positionRelative.z;

    // Pass data to tool manager and therefore to the active tool
    toolMan.onStylusPose(data);
    renderer.render(scene, camera);
  });
    
  state.stylus.addEventListener('click', (event) => {
    const data = event.detail;
    data.positionRelative = getRelativePosition(data.position);

    if ( data.buttonName == 'menu' ) {
      setOrigin(data.position);
    }

    toolMan.onStylusClick(data);
  });

  state.stylus.addEventListener('pressed', (event) => {
    const data = event.detail;
    data.positionRelative = getRelativePosition(data.position);
    toolMan.onStylusPressed(data);
  });

  state.stylus.addEventListener('released', (event) => {
    const data = event.detail;
    data.positionRelative = getRelativePosition(data.position);
    toolMan.onStylusReleased(data);
  });
}

function addStylusClone(id) {
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
  requestAnimationFrame(animate);

  // Control FPS
  delta += clock.getDelta();
  if (delta > interval) {
    renderer.render(scene, camera);

    // Get all labels and calculate their new 2D coordinates
    const labels = document.getElementsByClassName( 'label' );
    for ( const label of labels ) {
      const pos3D = new THREE.Vector3(
        label.dataset.x,
        label.dataset.y,
        label.dataset.z
      );
      const pos2D = getScreenCoordinates(pos3D, camera, renderer);
      label.style.left = `${Math.round(pos2D.x)}px`;
      label.style.top = `${Math.round(pos2D.y)}px`;
    }

    delta = delta % interval;   
  }
}

function setOrigin(newOrigin) {
  origin.copy(newOrigin);
}

function getRelativePosition(positionAbsolute) {
  const positionRelative = new THREE.Vector3();
  positionRelative.copy(positionAbsolute);
  positionRelative.sub(origin);
  return positionRelative;
}

function getStylusDataCopy(data) {
  const refinedData = {
    id: data.id,
    buttonName: data.buttonName,
    position: new THREE.Vector3()
  };

  refinedData.position.copy(data.position);
  return refinedData;
}

export function getScreenCoordinates(position, camera, renderer) {
  const vector = position.clone(); // Clone to avoid modifying the original
  vector.project(camera); // Project the 3D position to normalized device coordinates (NDC)

  const widthHalf = renderer.domElement.clientWidth / 2;
  const heightHalf = renderer.domElement.clientHeight / 2;

  return {
    x: (vector.x * widthHalf) + widthHalf, // Convert NDC to screen-space
    y: -(vector.y * heightHalf) + heightHalf, // Invert Y for screen-space
  };
}
