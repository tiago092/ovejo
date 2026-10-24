#!/usr/bin/env python3
"""Reproducible ZIP of runtime files, including licenses and gzip variants."""
import hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];source=ROOT/'dist/godot';out=ROOT/'artifacts/godot/codigo-rosa-web.zip'
if not (source/'manifest.json').exists():raise SystemExit('First run python3 scripts/build_godot.py')
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for file in sorted(source.rglob('*')):
  if not file.is_file():continue
  item=zipfile.ZipInfo(str(file.relative_to(source)),date_time=(2026,1,1,0,0,0));item.compress_type=zipfile.ZIP_DEFLATED;item.external_attr=0o644<<16;archive.writestr(item,file.read_bytes())
report={'file':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'runtime_manifest':json.loads((source/'manifest.json').read_text()),'note':'ZIP includes normal and precompressed alternatives; the network budget counts the gzip transfer, not both copies.'}
(ROOT/'artifacts/godot/package.json').write_text(json.dumps(report,indent=2)+'\n')
print(out)
