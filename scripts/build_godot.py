#!/usr/bin/env python3
"""Import/test/export static sites. Uses reviewed art; never rebuilds Blender sources."""
import argparse,gzip,hashlib,json,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--verification',action='store_true');p.add_argument('--all',action='store_true',help='Export both release and verification after one import/test pass');args=p.parse_args()
logs=ROOT/'artifacts/godot';logs.mkdir(parents=True,exist_ok=True)
expected=json.loads((ROOT/'scripts/toolchain.json').read_text())['godot']
actual=subprocess.check_output([str(ROOT/'scripts/godot.sh'),'--version'],cwd=ROOT,text=True).strip()
if actual!=expected:raise SystemExit(f'Engine mismatch: expected {expected}, got {actual}')
def godot(arguments,log):
 result=subprocess.run([str(ROOT/'scripts/godot.sh'),'--headless',*arguments],cwd=ROOT,capture_output=True,text=True)
 (logs/log).write_text(result.stdout+result.stderr)
 if result.returncode or 'SCRIPT ERROR' in result.stderr or 'ERROR:' in result.stderr:raise SystemExit('Failed: '+log+'\n'+result.stderr)
for script in ['scripts/verify_layout.cjs','scripts/reference.cjs','tests/godot/host.cjs']:
 subprocess.run(['node',script],cwd=ROOT,check=True)
godot(['--editor','--import'],'import.log')
godot(['--script','tests/simulation_test.gd'],'simulation.log')
for verification in ([True,False] if args.all else [args.verification]):
 out=ROOT/'dist'/('godot-test' if verification else 'godot');out.mkdir(parents=True,exist_ok=True)
 godot(['--export-release','Verification' if verification else 'Web'],'export-verification.log' if verification else 'export.log')
 for file in ['index.html','index.js','index.wasm','index.pck']:
  if not (out/file).exists():raise SystemExit('Missing export '+file)
 shutil.copy2(ROOT/'godot/web/host.js',out/'host.js')
 shutil.copytree(ROOT/'godot/licenses',out/'licenses',dirs_exist_ok=True)
 manifest={'engine':json.loads((ROOT/'scripts/toolchain.json').read_text())['godot'],'verification':verification,'files':{}}
 for file in out.iterdir():
  if file.suffix not in ['.html','.js','.wasm','.pck','.png']:continue
  data=file.read_bytes();compressed=gzip.compress(data,compresslevel=9,mtime=0);file.with_suffix(file.suffix+'.gz').write_bytes(compressed)
  manifest['files'][file.name]={'bytes':len(data),'gzip_bytes':len(compressed),'sha256':hashlib.sha256(data).hexdigest()}
 manifest['gzip_mib']=sum(f['gzip_bytes'] for f in manifest['files'].values())/1048576
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (logs/('verification-build.json' if verification else 'release-build.json')).write_text(json.dumps(manifest,indent=2)+'\n')
 print(out, 'compressed MiB:',round(manifest['gzip_mib'],2),flush=True)
