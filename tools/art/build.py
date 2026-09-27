import argparse
import hashlib
import importlib.util
import json
import math
import random
import re
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def statistics():
    bpy.context.view_layer.update()
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    points, triangles = [], 0
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in meshes:
        evaluated = obj.evaluated_get(graph)
        data = evaluated.to_mesh()
        try:
            data.calc_loop_triangles()
            triangles += len(data.loop_triangles)
            points.extend(evaluated.matrix_world @ vertex.co for vertex in data.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not points or triangles == 0:
        raise ValueError('Generator must create nonempty mesh geometry')
    if not all(math.isfinite(value) for point in points for value in point):
        raise ValueError('Mesh contains nonfinite coordinates')
    bounds = [[min(point[i] for point in points) for i in range(3)],
              [max(point[i] for point in points) for i in range(3)]]
    return {'triangles': triangles, 'mesh_objects': len(meshes), 'bounds_blender': bounds}


def generate(args, output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    random.seed(args.seed)
    import numpy as np
    np.random.seed(args.seed)
    sys.path.insert(0, str(args.generator.parent))
    module_spec = importlib.util.spec_from_file_location('toy_generator', args.generator)
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    metadata = module.build({'style': args.style, 'seed': args.seed})
    json.dumps(metadata)
    objects = list(bpy.context.scene.objects)
    unsupported = [obj.name for obj in objects if obj.type not in {'MESH', 'EMPTY'}]
    if unsupported:
        raise ValueError(f'Convert to meshes or remove non-asset objects: {unsupported}')
    before = statistics()
    if before['triangles'] > args.budget:
        raise ValueError(f"Triangle budget exceeded: {before['triangles']} > {args.budget}")
    lower, upper = map(Vector, before['bounds_blender'])
    if upper.z - lower.z <= 1e-8:
        raise ValueError('Asset must have nonzero vertical extent')
    factor = args.height / (upper.z - lower.z)
    root = bpy.data.objects.new(args.name, None)
    bpy.context.collection.objects.link(root)
    for obj in objects:
        if obj.parent is None:
            obj.parent = root
    root.scale = (factor,) * 3
    root.location = Vector((-(lower.x + upper.x) / 2, -(lower.y + upper.y) / 2, -lower.z)) * factor
    info = statistics()
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format='GLB', export_yup=True,
        export_apply=True, export_tangents=True, export_extras=True,
        export_animations=False, export_cameras=False, export_lights=False,
    )
    return {**info, 'design': metadata, 'normalization_scale': factor}


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def device(scene):
    preferences = bpy.context.preferences.addons['cycles'].preferences
    for backend in ['OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI']:
        try:
            preferences.compute_device_type = backend
            preferences.get_devices()
            if not any(item.type == backend for item in preferences.devices):
                continue
            for item in preferences.devices:
                item.use = item.type == backend
            scene.cycles.device = 'GPU'
            return backend
        except (TypeError, RuntimeError):
            continue
    scene.cycles.device = 'CPU'
    return 'CPU'


def render(args, output_dir, bounds):
    scene = bpy.context.scene
    lower, upper = map(Vector, bounds)
    target = (lower + upper) / 2
    extent = max(upper - lower)
    ratio = extent / 2
    bpy.ops.mesh.primitive_plane_add(size=extent * 100, location=(0, 0, -extent * .005))
    from toykit import material
    bpy.context.object.data.materials.append(material('preview_floor', (.82, .79, .73), .82))
    world = bpy.data.worlds.new('soft_studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.9, .94, 1, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .32
    scene.world = world
    for name, position, power, size, color in [
        ('key', (-3.5, -4.5, 6), 480, 3, (1, .88, .72)),
        ('fill', (4, -1, 4), 140, 3, (.86, .93, 1)),
        ('rim', (1, 4, 5), 350, 2.5, (1, .94, .8)),
    ]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.size, data.color = power * ratio ** 2, size * ratio, color
        data.shape = 'DISK'
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = Vector(position) * ratio
        aim(obj, target)
    data = bpy.data.cameras.new('preview_camera')
    camera = bpy.data.objects.new('preview_camera', data)
    bpy.context.collection.objects.link(camera)
    data.type = 'ORTHO'
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.samples, scene.cycles.seed = args.samples, args.seed
    scene.cycles.use_denoising = True
    backend = device(scene) if args.device == 'AUTO' else 'CPU'
    if backend == 'CPU':
        scene.cycles.device = 'CPU'
    scene.render.resolution_x = scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = .3
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    corners = [Vector((x, y, z)) for x in [lower.x, upper.x]
               for y in [lower.y, upper.y] for z in [lower.z, upper.z]]
    records = []
    for name, direction in [('front', (5, -7, 4)), ('back', (-5, 7, 4))]:
        camera.location = target + Vector(direction) * ratio
        aim(camera, target)
        rotation = camera.rotation_euler.to_matrix().transposed()
        projected = [rotation @ (point - target) for point in corners]
        data.ortho_scale = max(max(abs(point[i]) for point in projected) * 2 for i in [0, 1]) * 1.22
        scene.render.filepath = str(output_dir / f'{args.name}.{name}.png')
        try:
            bpy.ops.render.render(write_still=True)
        except RuntimeError:
            if backend == 'CPU':
                raise
            scene.cycles.device = 'CPU'
            backend = 'CPU'
            bpy.ops.render.render(write_still=True)
        records.append({'view': name, 'camera_blender': list(camera.location),
                        'target_blender': list(target), 'ortho_scale': data.ortho_scale,
                        'device': backend})
    return records


def main():
    parser = argparse.ArgumentParser(description='Build a static toy GLB from a Python build(spec) generator.')
    parser.add_argument('--generator', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--style', choices=['wood_blocks', 'painted_wood', 'origami'], required=True)
    parser.add_argument('--height', type=float, default=2)
    parser.add_argument('--budget', type=int, default=1500)
    parser.add_argument('--resolution', type=int, default=768)
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--seed', type=int, default=0)
    parser.add_argument('--device', choices=['AUTO', 'CPU'], default='AUTO')
    parser.add_argument('--skip-render', action='store_true')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', args.name):
        parser.error('--name must contain only ASCII letters, digits, underscores and hyphens')
    if not math.isfinite(args.height) or min(args.height, args.budget, args.resolution, args.samples) <= 0:
        parser.error('Height, budget, resolution and samples must be positive and finite')
    if not 0 <= args.seed < 2 ** 32:
        parser.error('--seed must be between 0 and 4294967295')
    args.generator = args.generator.expanduser().resolve()
    args.output_dir = args.output_dir.expanduser().resolve()
    if not args.generator.is_file():
        parser.error(f'Generator does not exist: {args.generator}')
    suffixes = ['glb', 'manifest.json', 'front.png', 'back.png']
    paths = [args.output_dir / f'{args.name}.{suffix}' for suffix in suffixes]
    existing = [str(path) for path in paths if path.exists()]
    if existing and not args.force:
        parser.error(f'Output exists; choose another name or pass --force: {existing}')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.toy-build-', dir=args.output_dir) as directory:
        staging = Path(directory)
        glb = staging / f'{args.name}.glb'
        info = generate(args, glb)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(glb))
        imported = statistics()
        if imported['triangles'] > args.budget:
            raise ValueError(f"Exported triangle budget exceeded: {imported['triangles']} > {args.budget}")
        views = [] if args.skip_render else render(args, staging, imported['bounds_blender'])
        record = {
            'schema_version': 1, 'name': args.name, 'style': args.style,
            **info, 'exported_geometry': imported,
            'generator': args.generator.name, 'generator_sha256': digest(args.generator),
            'pipeline_sha256': digest(Path(__file__)),
            'toykit_sha256': digest(Path(__file__).with_name('toykit.py')),
            'blender_version': bpy.app.version_string, 'seed': args.seed, 'requested_device': args.device,
            'height': args.height, 'triangle_budget': args.budget,
            'glb_bytes': glb.stat().st_size, 'glb_sha256': digest(glb),
            'coordinates': {'authoring': 'right-handed, +Z up, -Y front',
                            'glb': 'right-handed, +Y up, +Z front; ground Y=0; centered X/Z',
                            'units': 'meters'},
            'render': {'source': 'clean reimport of exported GLB', 'views': views,
                       'resolution': [args.resolution] * 2, 'samples': args.samples,
                       'view_transform': 'AgX', 'look': 'AgX - Medium High Contrast', 'exposure': .3},
            'artifacts': {path.name: digest(path) for path in staging.iterdir() if path.is_file()},
        }
        (staging / f'{args.name}.manifest.json').write_text(json.dumps(record, indent=2) + '\n')
        for path in staging.iterdir():
            path.replace(args.output_dir / path.name)
        if args.force and args.skip_render:
            for path in paths[2:]:
                path.unlink(missing_ok=True)
    print(json.dumps({'output_dir': str(args.output_dir), 'name': args.name,
                      'triangles': imported['triangles'], 'glb_bytes': record['glb_bytes']}))


if __name__ == '__main__':
    main()
