"""A provisional urban pass must never replace the public game, including manual CI."""
import contextlib,hashlib,io,json
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2];target=ROOT/'scripts/check_story_release.py';code=compile(target.read_text(),str(target),'exec');checks=[]
for name,world,allowed in [
 ('reference art is refused',{'version':2,'art_extent':'reference-slice','urban_extent':'reference-slice'},False),
 ('urban review cannot be bypassed by the old complete flag',{'version':2,'art_extent':'complete','urban_extent':'reference-slice'},False),
 ('completed urban world is accepted',{'version':2,'art_extent':'complete','urban_extent':'complete'},True),
 ('pre-urban complete exports remain compatible',{'version':2,'art_extent':'complete'},True)]:
 result=True
 with patch.object(Path,'read_text',return_value=json.dumps(world)),contextlib.redirect_stdout(io.StringIO()):
  try:exec(code,{'__file__':str(target),'__name__':'__main__'})
  except SystemExit:result=False
 checks.append({'name':name,'passed':result==allowed})
report={'guard_source_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'checks':checks,'passed':all(c['passed'] for c in checks)}
(ROOT/'artifacts/godot/urban/release-guard.json').write_text(json.dumps(report,indent=2)+'\n')
print('Release guard:',len(checks),'checks;',report['passed']);raise SystemExit(0 if report['passed'] else 1)
