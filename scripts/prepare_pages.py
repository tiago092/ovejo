#!/usr/bin/env python3
"""Stage only runtime assets: Godot at the site root."""
import hashlib,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
release=ROOT/'dist/godot';out=ROOT/'dist/pages'
manifest=json.loads((release/'manifest.json').read_text())
if manifest.get('verification') is not False:raise SystemExit('Pages requires the release export, not Verification')
if manifest.get('art_extent')!='complete' or manifest.get('urban_extent')!='complete' or manifest.get('building_count')!=80:raise SystemExit('Pages requires the completed eighty-building world')
for name,entry in manifest['files'].items():
 if Path(name).name!=name:raise SystemExit('Unexpected runtime path')
 if hashlib.sha256((release/name).read_bytes()).hexdigest()!=entry['sha256']:raise SystemExit('Export hash mismatch: '+name)
if out.exists():shutil.rmtree(out)
out.mkdir(parents=True)
if (ROOT/'CNAME').is_file():shutil.copy2(ROOT/'CNAME',out/'CNAME')
for name in manifest['files']:shutil.copy2(release/name,out/name)
shutil.copy2(release/'manifest.json',out/'manifest.json')
shutil.copytree(release/'licenses',out/'licenses')
(out/'.nojekyll').touch()
# Do not upload sibling .gz files: serving them correctly requires Content-Encoding.
files={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}
report={'published':False,'staging_directory':'dist/pages','runtime':'godot','game_route':'/','release_package_sha256':manifest['files']['index.pck']['sha256'],'files':files,'bytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'hosting_compression':'Pending measurement on deployed Pages; no assumption based on local gzip results.'}
(ROOT/'artifacts/godot/pages-package.json').write_text(json.dumps(report,indent=2)+'\n')
print('Prepared',out,'with',len(files),'runtime files; no deployment performed.')
