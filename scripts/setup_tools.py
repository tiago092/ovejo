#!/usr/bin/env python3
"""Pinned portable Linux x86_64 toolchain; no changes outside this repository."""
import argparse,hashlib,json,os,tarfile,urllib.request,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];TOOLS=ROOT/'.tools';TOOLS.mkdir(exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--art',action='store_true');args=parser.parse_args()
manifest=json.loads((ROOT/'scripts/toolchain.json').read_text())
for item in manifest['archives']:
 if item['file']=='blender.tar.xz' and not args.art:continue
 target=TOOLS/item['file']
 if not target.exists():
  print('Downloading',item['url'],flush=True)
  with urllib.request.urlopen(item['url']) as response,target.open('wb') as out:
   while chunk:=response.read(1024*1024):out.write(chunk)
 digest=hashlib.file_digest(target.open('rb'),'sha256').hexdigest()
 if digest!=item['sha256']:raise SystemExit('Hash mismatch: '+str(target))
 if item['file']=='godot.zip':
  with zipfile.ZipFile(target) as archive:archive.extractall(TOOLS)
  (TOOLS/'Godot_v4.7.2-stable_linux.x86_64').chmod(0o755)
 elif item['file']=='templates.tpz':
  destination=TOOLS/'data/godot/export_templates/4.7.2.stable';destination.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(target) as archive:
   for name in ['web_nothreads_debug.zip','web_nothreads_release.zip']:
    (destination/name).write_bytes(archive.read('templates/'+name))
 elif not (TOOLS/'blender-4.5.3-linux-x64/blender').exists():
  with tarfile.open(target) as archive:archive.extractall(TOOLS,filter='data')
print('Toolchain verified. Run scripts/godot.sh --editor or python3 scripts/build_godot.py')
