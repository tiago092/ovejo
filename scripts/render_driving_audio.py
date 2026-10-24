"""Deterministic original sound beds, mono PCM. No external audio or voices."""
import math,random,struct,wave
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'godot/assets'
RATE=22050;rng=random.Random(5947)
for name,duration in [('engine',1),('road',2),('sand',2),('surf',8),('club',4)]:
 samples=[];smooth=0.;low=0.
 for i in range(RATE*duration):
  t=i/RATE;noise=rng.uniform(-1,1);smooth=.93*smooth+.07*noise;low=.995*low+.005*noise
  if name=='engine':
   value=.22*math.sin(2*math.pi*48*t)+.13*math.sin(2*math.pi*96*t)+.06*math.sin(2*math.pi*144*t)+smooth*.15
  elif name=='road':value=smooth*(.4+.2*math.sin(2*math.pi*18*t))+.04*math.sin(2*math.pi*42*t)
  elif name=='sand':value=smooth*.55+noise*.025
  elif name=='surf':value=(smooth*.6+noise*.045)*(.55+.45*math.sin(2*math.pi*t/8))
  else:value=low*.9+smooth*.1*(.6+.4*math.sin(2*math.pi*t/4))
  # Short equal-power end fade avoids sample-loop clicks in generated noise.
  fade=min(1,i/220,(RATE*duration-1-i)/220)
  samples.append(struct.pack('<h',int(max(-1,min(1,value*fade))*32760)))
 with wave.open(str(OUT/(name+'.wav')),'wb') as out:
  out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE);out.writeframes(b''.join(samples))
print('Generated five local, deterministic sound beds.')
