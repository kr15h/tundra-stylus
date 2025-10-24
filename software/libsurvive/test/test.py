import pysurvive
import sys

actx = pysurvive.SimpleContext(sys.argv)

for obj in actx.Objects():
    print(obj.Name())

while actx.Running():
    updated = actx.NextUpdated()
    if updated:
        pose = updated.Pose()
        xyz = pose[0].Pos
        print(xyz[0], xyz[1], xyz[2])
