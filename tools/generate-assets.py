from pathlib import Path
import os
import subprocess
root = Path(__file__).resolve().parent.parent
for kind, height in [('die', .80), ('adventurer', 1.15), ('marker', .16), ('skill', .19)]:
    subprocess.run(['uv','run','--python','3.11','--with','bpy==4.5.14','python',
        str(root/'tools/art/build.py'),'--generator',str(root/'art/generators/pieces.py'),
        '--output-dir',str(root/'public/assets/toys'),'--name',kind,'--style','painted_wood',
        '--height',str(height),'--budget','1500','--resolution','384','--samples','16','--force'],
        cwd=root,env={**os.environ,'PIECE_KIND':kind},check=True)
