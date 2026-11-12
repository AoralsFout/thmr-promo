"""Measure fundamental frequency (F0) of every synthesized line so pitch
post-processing can be chosen from data rather than by ear."""
import glob
import json
import os
import sys

import librosa
import numpy as np

pattern = sys.argv[1] if len(sys.argv) > 1 else "public/audio/lines/*.wav"
report = sys.argv[2] if len(sys.argv) > 2 else "gen/f0.json"

out = {}
for f in sorted(glob.glob(pattern)):
    y, sr = librosa.load(f, sr=None, mono=True)
    f0, _, _ = librosa.pyin(y, fmin=110, fmax=650, sr=sr, frame_length=2048)
    v = f0[~np.isnan(f0)]
    name = os.path.basename(f)[:-4]
    out[name] = {
        "sr": int(sr),
        "dur": round(len(y) / sr, 2),
        "f0_med": round(float(np.median(v)), 1) if len(v) else None,
        "f0_p10": round(float(np.percentile(v, 10)), 1) if len(v) else None,
        "f0_p90": round(float(np.percentile(v, 90)), 1) if len(v) else None,
    }
    print(f"{name:18s} sr={sr} dur={out[name]['dur']:5.2f} f0_med={out[name]['f0_med']} p10={out[name]['f0_p10']} p90={out[name]['f0_p90']}")

os.makedirs("gen", exist_ok=True)
with open(report, "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
