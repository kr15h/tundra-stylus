"""
SteamVR Proxy for Tundra Stylus

Waits for connected trackers and forwards pose and button information.
To be used in combination with websocketd. Has two types of messages.

1. Pose messages
2. Button messages

Pose message
{ "type":"pose", "tid":<tracker_id>, "pose":<3x4_pose_array> }

Button message
{ "type":"button", "tid":<tracker_id>, "bid":"<trig|menu|grip|tpad>", "pressed":<true|false> }

"""
import openvr
import time
import json
import math
import numpy as np
from sys import stdout

# 30 or 60 frames per second is probably what you want, 120 in some cases
fps = 30.0
sleep_time = 1.0 / fps

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
			if device_class == openvr.TrackedDeviceClass_GenericTracker:
				# Get device pose
				# TrackingUniverseStanding: absolute coordinate system
				# TrackingUniverseSeated:   relative coordinate system (can be reset using IVRSystem::ResetSeatedZeroPose)
				pose = vr_system.getDeviceToAbsoluteTrackingPose(
					openvr.TrackingUniverseStanding, 0, openvr.k_unMaxTrackedDeviceCount
				)[device_index]
				if pose.bPoseIsValid:
					new_pose = pose.mDeviceToAbsoluteTracking
					tracker_data.append({
						"type":"pose",
						"tid": device_index,
						"pose": (	(new_pose[0][0], new_pose[0][1], new_pose[0][2], new_pose[0][3]), 
									(new_pose[1][0], new_pose[1][1], new_pose[1][2], new_pose[1][3]), 
									(new_pose[2][0], new_pose[2][1], new_pose[2][2], new_pose[2][3])) 
					})
	return tracker_data

def main():
	vr_system = initialize_vr_system()

	try:
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
				print("No active trackers detected.")
			
			time.sleep(sleep_time)  # Adjust the interval as needed
	except KeyboardInterrupt:
		print("\nStopped by user.")
	finally:
		openvr.shutdown()

if __name__ == "__main__":
	main()
