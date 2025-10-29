import pysurvive
import sys
import json
from sys import stdout

actx = pysurvive.SimpleContext(sys.argv)

while actx.Running():
    updated = actx.NextUpdated()
    if updated:
        tracker_data = []
        name = updated.Name()
        pose = updated.Pose()
        xyz = pose[0].Pos
        rot = pose[0].Pos
        tracker_data.append({
			'sys': 'libsurvive',
            'id': str(name),
			'type': 'pose',
			'pos': tuple(float(v) for v in xyz),
            'rot': tuple(float(v) for v in rot)
			})
        json_string = json.dumps(tracker_data, default=lambda o: float(o))
        print(json_string)
        stdout.flush()
