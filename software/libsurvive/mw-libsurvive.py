
"""
libsurvive Proxy for Tundra Stylus

Waits for connected trackers and forwards pose and button information.
To be used in combination with websocketd. 

Message format (an array as multiple styluses could be connected at the same time)

"""

# 30 or 60 frames per second is probably what you want, 120 in some cases
fps = 60.0
sleep_time = 1.0 / fps
verbose = False

# store button state
button_state = {} # buttons[ id, states:{ 'trig':0|1, 'grip':0|1, 'tpad':0|1, 'menu':0|1 } ]

def initialize_vr_system():
	"""Initialize the VR system and return the VR system handle."""
	openvr.init(openvr.VRApplication_Other)
	vr_system = openvr.VRSystem()
	return vr_system

def get_active_trackers(vr_system):
	global button_state
	tracker_data = []
	
	for device_index in range(openvr.k_unMaxTrackedDeviceCount):
		
		# Check if the device is tracked
		if vr_system.isTrackedDeviceConnected(device_index):
			device_class = vr_system.getTrackedDeviceClass(device_index)
			if device_class == openvr.TrackedDeviceClass_GenericTracker or openvr.TrackedDeviceClass_Controller:
				
				# Get device pose
				# TrackingUniverseStanding: absolute coordinate system
				# TrackingUniverseSeated:   relative coordinate system (can be reset using IVRSystem::ResetSeatedZeroPose)

				success, state, pose = vr_system.getControllerStateWithPose(
					openvr.TrackingUniverseStanding, device_index
					)

				if success and state and pose.bPoseIsValid:
					new_pose = pose.mDeviceToAbsoluteTracking
					
					if new_pose[0][0] == 1.0 and new_pose[1][1] == 1.0 and new_pose[2][2] == 1.0:
						continue # there are cases when the pose is empty. null hmd?

					buttons_pressed = state.ulButtonPressed
					incoming_button_state = {
						'trig': bool(buttons_pressed & (1 << 33)),
						'grip': bool(buttons_pressed & (1 << 2)),
						'tpad': bool(buttons_pressed & (1 << 32)),
						'menu': bool(buttons_pressed & (1 << 1)) 
						}

					incoming_pose = (	(new_pose[0][0], new_pose[0][1], new_pose[0][2], new_pose[0][3]), 
							 			(new_pose[1][0], new_pose[1][1], new_pose[1][2], new_pose[1][3]), 
										(new_pose[2][0], new_pose[2][1], new_pose[2][2], new_pose[2][3]))

					# get stored button states and compare with incoming
					if device_index in button_state:
						current_button_state = button_state[device_index]
						for k, v in current_button_state.items():
							if incoming_button_state[k] != v:
								tracker_data.append({
									'id': device_index,
									'type': 'button',  
									'button': k,
									'state': incoming_button_state[k], 
									'pose': incoming_pose 
									})

					# assign incoming button state as new state
					button_state[device_index] = incoming_button_state
					
					# send pose data continously
					tracker_data.append({
						'id': device_index,
						'type': 'pose',
						'pose': incoming_pose 
						})
	return tracker_data

def main():
	parser = argparse.ArgumentParser(description='Tundra Stylus SteamVR OpenVR middleware')
	parser.add_argument(
		'-v', '--verbose', 
		action='store_true',  # Makes this a flag (True if set, False otherwise)
		help='Enable verbose output' 
		)

	args = parser.parse_args()
	verbose = args.verbose

	vr_system = initialize_vr_system()

	try:
		if verbose:
			print('Fetching tracker coordinates continuously (Press Ctrl+C to stop)...')
		while True:
			tracker_data = get_active_trackers(vr_system)
			
			if tracker_data:
				json_string = json.dumps(tracker_data, default=lambda o: float(o))
				print(json_string)
				stdout.flush()
			else:
				if verbose:
					print('No active trackers detected.')
			
			time.sleep(sleep_time)  # Adjust the interval as needed
	except KeyboardInterrupt:
		if verbose:
			print('\nStopped by user.')
	finally:
		openvr.shutdown()

if __name__ == '__main__':
	main()
