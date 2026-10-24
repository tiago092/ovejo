#!/usr/bin/env python3
"""Stable runtime-source identity across working-cache and clean CI Godot exports."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def runtime_fingerprint():
 files={}
 for p in sorted((ROOT/'godot').rglob('*')):
  relative=p.relative_to(ROOT/'godot')
  if not p.is_file() or '.godot' in relative.parts or 'tests' in relative.parts:continue
  if p.suffix not in {'.gd','.uid','.tscn','.godot','.cfg','.glb','.png','.wav','.ttf','.json','.js','.html','.import'}:continue
  files[str(relative)]=hashlib.sha256(p.read_bytes()).hexdigest()
 return hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check');args=p.parse_args();current=runtime_fingerprint()
 if args.check:
  recorded=json.loads(Path(args.check).read_text()).get('runtime_source_sha256')
  if recorded!=current:raise SystemExit('Export does not match current runtime sources. Rebuild before testing; do not overwrite exports during tests.')
 print(current)
