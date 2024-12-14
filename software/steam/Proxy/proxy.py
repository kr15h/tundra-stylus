import openvr
import time
import json
import math
import numpy as np
from sys import stdout

# Distance between tracker base and the tip of the stylus, in meters
stylus_len = 0.19
axial_offset = math.sqrt(math.pow(stylus_len, 2) / 2)
print(axial_offset)

def normalize(vector):
	"""Normalize a 3D vector."""
	return vector / np.linalg.norm(vector)

def calculate_point_with_rotation(pose_matrix, x_offset, y_offset, z_offset):
	pose_array = list(pose_matrix)
	pose_matrix = np.array(pose_array)
	
	if pose_matrix.ndim != 2 or pose_matrix.shape != (3, 4):
		raise ValueError("Input pose_matrix must be a 3x4 array.")

	position = np.array([pose_matrix[0][3], pose_matrix[1][3], pose_matrix[2][3]])

	local_x_axis = np.array([pose_matrix[0][0], pose_matrix[1][0], pose_matrix[2][0]])  # First column
	local_y_axis = np.array([pose_matrix[0][1], pose_matrix[1][1], pose_matrix[2][1]])  # Second column
	local_z_axis = np.array([pose_matrix[0][2], pose_matrix[1][2], pose_matrix[2][2]])  # Third column

	# Scale the axes by the respective offsets
	x_offset_vector = local_x_axis * x_offset
	y_offset_vector = local_y_axis * y_offset
	z_offset_vector = local_z_axis * z_offset

	new_point = position + x_offset_vector + y_offset_vector + z_offset_vector

	return new_point

def initialize_vr_system():
	"""Initialize the VR system and return the VR system handle."""
	openvr.init(openvr.VRApplication_Other)
	vr_system = openvr.VRSystem()
	return vr_system

def get_active_trackers(vr_system):
	"""Retrieve positions of active trackers."""
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
					
					# Extract X, Y, Z coordinates, relative to the base station
					# position[0-2][0-2] contains 3x3 matrix
					# position[0-2][3] contains x, y, z coordinates

					pos_x = new_pose[0][3] # Left, right
					pos_y = new_pose[1][3] # Up, down
					pos_z = new_pose[2][3] # Towards, away

					# ToDo, let's calculate this from the 3x3 matrix
					rot_x = math.atan2(new_pose[1][1], new_pose[2][1]) # pitch
					rot_y = math.asin(-new_pose[0][1]) # yaw
					rot_z = math.atan2(new_pose[0][2], new_pose[0][0]) # roll

					# avoid gimbal lock
					if (math.fabs(new_pose[0][1]) >= 1.0):
						rot_x = 0.0 # can not distinguish pitch
						rot_y = (-math.pi / 2) if (new_pose[0][1] > 0) else (math.pi / 2) # yaw
						rot_z = math.atan2(-new_pose[2][0], new_pose[1][0]) # roll

					# calculate stylus tip
					# not sure how those axes really align, but it seems that x and z is x and y here
					tip_pos = calculate_point_with_rotation(new_pose, axial_offset, -axial_offset, 0.0)

					tip_x = tip_pos[0]
					tip_y = tip_pos[1]
					tip_z = tip_pos[2]

					tracker_data.append({
						"i": device_index,
						"p": (pos_x, pos_y, pos_z),
						"r": (rot_x, rot_y, rot_z),
						"t": (tip_x, tip_y, tip_z) 
					})
	return tracker_data

def main():
	# Initialize OpenVR
	vr_system = initialize_vr_system()
	
	fps = 1.0 / 30.0

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
			
			time.sleep(fps)  # Adjust the interval as needed
	except KeyboardInterrupt:
		print("\nStopped by user.")
	finally:
		openvr.shutdown()

if __name__ == "__main__":
	main()
