#!/usr/bin/env python3
"""Verify that tracked sources import without a pre-existing .godot cache."""
import hashlib,json,shutil,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='rosa-clean-') as folder:
 project=Path(folder)/'godot'
 shutil.copytree(ROOT/'godot',project,ignore=shutil.ignore_patterns('.godot'))
 result=subprocess.run([str(ROOT/'scripts/godot.sh'),'--headless','--path',str(project),'--editor','--import'],cwd=ROOT,text=True,capture_output=True)
 log=result.stdout+result.stderr
 (ROOT/'artifacts/godot/clean-import.log').write_text(log)
 passed=result.returncode==0 and 'SCRIPT ERROR' not in log and 'ERROR:' not in log
 export_passed=False;package_hash=None
 if passed:
  (Path(folder)/'dist/godot').mkdir(parents=True)
  exported=subprocess.run([str(ROOT/'scripts/godot.sh'),'--headless','--path',str(project),'--export-release','Web'],cwd=ROOT,text=True,capture_output=True)
  export_log=exported.stdout+exported.stderr
  (ROOT/'artifacts/godot/clean-export.log').write_text(export_log)
  export_passed=exported.returncode==0 and 'ERROR:' not in export_log
  if export_passed:package_hash=hashlib.sha256((Path(folder)/'dist/godot/index.pck').read_bytes()).hexdigest()
 passed=passed and export_passed
 (ROOT/'artifacts/godot/clean-import.json').write_text(json.dumps({'passed':passed,'returncode':result.returncode,'cache_present_before':False,'clean_export_passed':export_passed,'clean_package_sha256':package_hash,'matches_previous_package_bytes':package_hash==hashlib.sha256((ROOT/'dist/godot/index.pck').read_bytes()).hexdigest(),'engine':'4.7.2.stable.official.ed1daf0bf'},indent=2)+'\n')
 print('Clean import:', 'PASSED' if passed else 'FAILED')
 if not passed:print(log);raise SystemExit(1)
