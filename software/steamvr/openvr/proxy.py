"""
SteamVR Proxy for Tundra Stylus

Waits for connected trackers and forwards pose and button information.
To be used in combination with websocketd. 

Message format (an array as multiple styluses could be connected at the same time)
[{ "id":<tracker_id>, "buttons":{"trig":<true|false>,"grip":...} "pose":<3x4_pose_array> }]

"""
import openvr
import time
import json
import math
from sys import stdout
import argparse

# 30 or 60 frames per second is probably what you want, 120 in some cases
fps = 30.0
sleep_time = 1.0 / fps
verbose = False

def initialize_vr_system():
	"""Initialize the VR system and return the VR system handle."""
	openvr.init(openvr.VRApplication_Other)
	vr_system = openvr.VRSystem()
	return vr_system

def get_active_trackers(vr_system):
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
					buttons = {
						"trig": bool(buttons_pressed & (1 << 33)),
						"grip": bool(buttons_pressed & (1 << 2)),
						"tpad": bool(buttons_pressed & (1 << 32)),
						"menu": bool(buttons_pressed & (1 << 1))
					}
					
					tracker_data.append({
						"id": device_index,
						"buttons": buttons,
						"pose": (	(new_pose[0][0], new_pose[0][1], new_pose[0][2], new_pose[0][3]), 
									(new_pose[1][0], new_pose[1][1], new_pose[1][2], new_pose[1][3]), 
									(new_pose[2][0], new_pose[2][1], new_pose[2][2], new_pose[2][3])) 
					})
	return tracker_data

def main():
	parser = argparse.ArgumentParser(description="Tundra Stylus SteamVR OpenVR proxy")
	parser.add_argument(
		"-v", "--verbose", 
		action="store_true",  # Makes this a flag (True if set, False otherwise)
		help="Enable verbose output"
	)

	args = parser.parse_args()
	verbose = args.verbose

	vr_system = initialize_vr_system()

	try:
		if verbose:
			print("Fetching tracker coordinates continuously (Press Ctrl+C to stop)...")
		while True:
			tracker_data = get_active_trackers(vr_system)
			
			if tracker_data:
				for tracker in tracker_data:
					json_string = json.dumps(tracker_data, default=lambda o: float(o))
					#json_data = json.dumps(data, default=lambda o: float(o))
					#print(f"Tracker {tracker['device_index']} position: {tracker['position']}")
					print(json_string)
					stdout.flush()
			else:
				if verbose:
					print("No active trackers detected.")
			
			time.sleep(sleep_time)  # Adjust the interval as needed
	except KeyboardInterrupt:
		if verbose:
			print("\nStopped by user.")
	finally:
		openvr.shutdown()

if __name__ == "__main__":
	main()
