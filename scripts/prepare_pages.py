#!/usr/bin/env python3
"""Stage only runtime assets: existing Three.js at root, Godot at godot-preview/."""
import hashlib,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
release=ROOT/'dist/godot';out=ROOT/'dist/pages'
manifest=json.loads((release/'manifest.json').read_text())
if manifest.get('verification') is not False:raise SystemExit('Pages requires the release export, not Verification')
for name,entry in manifest['files'].items():
 if Path(name).name!=name:raise SystemExit('Unexpected runtime path')
 if hashlib.sha256((release/name).read_bytes()).hexdigest()!=entry['sha256']:raise SystemExit('Export hash mismatch: '+name)
if out.exists():shutil.rmtree(out)
(out/'godot-preview').mkdir(parents=True)
original=['index.html','style.css','game.js','visuals.js','music.js','track.js','assets/driver.png','assets/driver-texture.js','vendor/three.min.js','vendor/THREE-LICENSE.txt','ASSETS.md']
if (ROOT/'CNAME').is_file():original.append('CNAME')
for name in original:
 target=out/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,target)
for name in manifest['files']:shutil.copy2(release/name,out/'godot-preview'/name)
shutil.copy2(release/'manifest.json',out/'godot-preview/manifest.json')
shutil.copytree(release/'licenses',out/'godot-preview/licenses')
(out/'.nojekyll').touch()
# Do not upload sibling .gz files: serving them correctly requires Content-Encoding.
files={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}
report={'published':False,'staging_directory':'dist/pages','original_route':'/','preview_route':'/godot-preview/','release_package_sha256':manifest['files']['index.pck']['sha256'],'files':files,'bytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'hosting_compression':'Pending measurement on deployed Pages; no assumption based on local gzip results.'}
(ROOT/'artifacts/godot/pages-package.json').write_text(json.dumps(report,indent=2)+'\n')
print('Prepared',out,'with',len(files),'runtime files; no deployment performed.')
