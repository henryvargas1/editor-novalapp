# Transcripción palabra por palabra con faster-whisper (para la nube / GitHub Actions).
# Escribe el mismo formato JSON que whisper.cpp (-ml 1 -oj) para que auto.mjs lo lea igual.
import sys, json, os
from faster_whisper import WhisperModel
audio, salida = sys.argv[1], sys.argv[2]
modelo = os.environ.get("MODELO", "small")
m = WhisperModel(modelo, device="cpu", compute_type="int8")
segs, _ = m.transcribe(audio, language="es", word_timestamps=True, vad_filter=True)
out = []
for s in segs:
    for w in s.words:
        out.append({"offsets": {"from": int(w.start * 1000), "to": int(w.end * 1000)}, "text": w.word})
json.dump({"transcription": out}, open(salida, "w"), ensure_ascii=False)
print(f"{len(out)} palabras")
