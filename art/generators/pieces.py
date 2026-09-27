from pathlib import Path
import os
import math
import bpy
from toykit import material, box, mesh


def extrude(name, polygon, thickness, mat):
    n = len(polygon)
    vertices = [(x, y, z) for y in (-thickness / 2, thickness / 2) for x, z in polygon]
    faces = [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]
    faces += [(i, i+n, (i+1)%n+n, (i+1)%n) for i in range(n)]
    return mesh(name, vertices, faces, mat)


def build(spec):
    kind = os.environ.get('PIECE_KIND', 'die')
    wood = material('Maple', (.82, .69, .48), .7, base_color_texture=Path(__file__).parent.parent / 'textures/maple.png')
    ivory = material('Ivory', (.94, .87, .70), .65)
    ink = material('Ink', (.18, .15, .12), .82)
    paint = material('Paint', (.48, .23, .17), .76)
    brass = material('Ochre', (.69, .48, .22), .62)
    if kind == 'die':
        box('ivory-die', (0, 0, .5), (1, 1, 1), ivory, .065)
        arrangements = {1:[(0,0)], 2:[(-1,-1),(1,1)], 3:[(-1,-1),(0,0),(1,1)], 4:[(-1,-1),(-1,1),(1,-1),(1,1)], 5:[(-1,-1),(-1,1),(0,0),(1,-1),(1,1)], 6:[(-1,-1),(-1,0),(-1,1),(1,-1),(1,0),(1,1)]}
        for face, (axis, sign) in enumerate([(2,1),(1,-1),(0,1),(0,-1),(1,1),(2,-1)],1):
            for a,b in arrangements[face]:
                pos = [0,0,.5]
                other = [i for i in range(3) if i != axis]
                pos[axis] += sign * .501
                pos[other[0]] += a*.235
                pos[other[1]] += b*.235
                bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=.075, depth=.003, location=pos)
                dot = bpy.context.object
                dot.name = f'pip-{face}'
                if axis==0: dot.rotation_euler[1]=math.pi/2
                if axis==1: dot.rotation_euler[0]=math.pi/2
                dot.data.materials.append(ink)
        dots = [obj for obj in bpy.context.scene.objects if obj.name.startswith('pip-')]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in dots:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = dots[0]
        bpy.ops.object.join()
        dots[0].name = 'printed-pips'
    elif kind == 'adventurer':
        extrude('cloak', [(-.28,0),(.28,0),(.22,.36),(.13,.60),(-.13,.60),(-.22,.36)], .25, paint)
        box('head', (0,0,.70), (.25,.24,.23), wood,.025)
        box('hood', (0,.02,.82), (.32,.28,.08), paint,.014)
        box('pack', (0,.19,.42), (.27,.14,.30), wood,.02)
        box('staff', (.34,0,.41), (.055,.055,.82), wood,.005)
        box('belt', (0,-.13,.27), (.40,.026,.055), brass)
        box('foot-l', (-.14,-.025,.035), (.17,.32,.07), wood,.01)
        box('foot-r', (.14,-.025,.035), (.17,.32,.07), wood,.01)
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.40, depth=.16, location=(0,0,.08))
        bpy.context.object.name='wood-edge'
        bpy.context.object.data.materials.append(wood)
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.35, depth=.02, location=(0,0,.17))
        bpy.context.object.name='painted-face'
        bpy.context.object.data.materials.append(paint if kind=='marker' else brass)
        if kind=='skill':
            box('emblem', (0,0,.19), (.32,.08,.025), ivory,.005)
            box('emblem-cross', (0,0,.19), (.08,.32,.025), ivory,.005)
    return {'subject':kind, 'seed':spec['seed'], 'construction':'painted wooden tabletop component'}
