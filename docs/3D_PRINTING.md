# 3D Printing

There are three parts to be 3D printed.

1. The main stylus baseplate
2. Button inlay
3. Cover

3D models for all of them can be found in the [design/3dprint](../design/3dprint) directory. 

![Design Parts](../media/design_parts_annotated.jpg)

Prusa MK4 3D printers with PLA filament were used to print the parts. Material is not limited to PLA, it is up to you and your printing method. The models were sliced using the default 0.10mm FAST DETAIL preset with 20% infill and 0.4mm nozzle Input Shaper printer profile.

The baseplate and cover were printed inside-up to maintain precision in the inner part of thde design. This is to make sure that parts fit together without additional post-processing.

![Slicing](../media/3dprinting_slicing.jpg)

After printing, supports were removed and the surfaces processed with sanding paper. For better appearance, one could use medium-viscosity two-component epoxy glue, optional sanding, and spraypaint of your choice. 

## Design Adjustments

It is possible that some features do not work out as expected, due to shrinkage and other issues. No 3D printer is the same, but it is possible to adjust the design parameters of Tundra Stylus if needed.

![Design Parameters in FreeCAD](../media/design_parameters.jpg)

Tundra Stylus enclosure design was made in FreeCAD 1.0. You can download and install it for free and it is compatible with all major operating systems. 

Once adjustments are made, you can export the Baseplate, ButtonInlay and Cover objects separately via File > Export.

