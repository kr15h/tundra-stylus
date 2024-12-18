import * as THREE from 'three';

export class RulerTool {
	constructor( state ) {
		this.pointA = null;
		this.pointB = null;
		this.distance = 0;
	}

	onStylusClick( e ) {
		const position = e.tip.position;
		this.setPoint( position );
	}

	setPoint( position ) {
		if ( !this.pointA && !this.pointB ) {
			this.pointA = new THREE.Vector3();
			this.pointA.copy( position );
			this.distance = 0;
			console.log( 'Point A set at ' + this.pointA );
		} else if ( !this.pointB ) {
			this.pointB = new THREE.Vector3();
			this.pointB.copy( position );
			console.log( 'Point B set at ' + this.pointB );
			this.calculateDistance();
		} else {
			this.pointA = null;
			this.pointB = null;
			this.distance = 0;
			console.log( 'Cleared both points, A and B' );
		}
	}

	calculateDistance() {
		this.distance = this.pointA.distanceTo( this.pointB );
		console.log( 'Distance between two points: ' + this.distance );
	}
}