#!/usr/bin/env python3
"""Do not replace the public game with a reference slice awaiting its planned art review."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
world=json.loads((ROOT/'godot/data/world.json').read_text())
if world.get('version')!=2 or world.get('art_extent')!='complete' or world.get('urban_extent','complete')!='complete':
 raise SystemExit('Publicación pendiente: el plan requiere revisar disco–primera curva y extender después el acabado. La exportación local de referencia sigue disponible; no sustituir Pages con volúmenes provisionales.')
print('Story world is complete; proceeding with release validation.')
