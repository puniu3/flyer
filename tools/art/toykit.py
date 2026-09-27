from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


def linear(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def material(name, rgb, roughness=.65, base_color_texture=None,
             roughness_texture=None, normal_texture=None, normal_strength=1):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*[linear(v) for v in rgb], 1)
    shader.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*[linear(v) for v in rgb], 1)
    for path, socket, colorspace in [
        (base_color_texture, 'Base Color', 'sRGB'),
        (roughness_texture, 'Roughness', 'Non-Color'),
        (normal_texture, 'Normal', 'Non-Color'),
    ]:
        if path is None:
            continue
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = bpy.data.images.load(str(Path(path).resolve()), check_existing=False)
        texture.image.colorspace_settings.name = colorspace
        texture.image.pack()
        output = texture.outputs['Color']
        if socket == 'Normal':
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = normal_strength
            links.new(output, normal.inputs['Color'])
            output = normal.outputs['Normal']
        links.new(output, shader.inputs[socket])
    return mat


def _finish(obj, mat):
    obj.data.materials.append(mat)
    uv = obj.data.uv_layers.new(name='UVMap')
    for polygon in obj.data.polygons:
        axes = [i for i in range(3) if i != max(range(3), key=lambda i: abs(polygon.normal[i]))]
        for index in polygon.loop_indices:
            co = obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv = (co[axes[0]], co[axes[1]])
    return obj


def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return _finish(obj, mat)


def box(name, location, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('edge_break', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 1
    for layer in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(layer)
    return _finish(obj, mat)


def wedge(name, location, size, mat):
    x, y, z = [value / 2 for value in size]
    vertices = [(-x, -y, -z), (x, -y, -z), (0, -y, z),
                (-x, y, -z), (x, y, -z), (0, y, z)]
    faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    obj = mesh(name, vertices, faces, mat)
    obj.location = location
    return obj


def beam(name, start, end, width, depth, mat, bevel=0):
    start, end = Vector(start), Vector(end)
    axis = end - start
    if axis.length <= 0:
        raise ValueError('Beam endpoints must differ')
    obj = box(name, (start + end) / 2, (width, depth, axis.length), mat, bevel)
    obj.rotation_euler = axis.to_track_quat('Z', 'Y').to_euler()
    return obj
