# Herramientas de audio/video para la nube (GitHub Actions). Uso:
#   python3 transcribir.py vad    audio.wav  salida.json   -> tramos con voz (Silero VAD) para quitar silencios
#   python3 transcribir.py texto  audio.wav  salida.json   -> palabras con tiempos (Whisper)
#   python3 transcribir.py cara   video.mp4  salida.json   -> posición de la cara (para centrar el encuadre)
# El audio debe ser WAV 16 kHz mono (lo prepara auto.mjs con ffmpeg).
import sys, json, os, wave
import numpy as np


def leer_wav(ruta):
    with wave.open(ruta, "rb") as w:
        datos = w.readframes(w.getnframes())
    return np.frombuffer(datos, dtype=np.int16).astype(np.float32) / 32768.0


def vad(audio, salida):
    # Silero VAD (viene incluido en faster-whisper)
    from faster_whisper.vad import get_speech_timestamps, VadOptions
    pcm = leer_wav(audio)
    tramos = get_speech_timestamps(pcm, VadOptions(min_silence_duration_ms=350, speech_pad_ms=120))
    out = [{"inicio": round(t["start"] / 16000, 3), "fin": round(t["end"] / 16000, 3)} for t in tramos]
    json.dump({"voz": out, "duracion": len(pcm) / 16000}, open(salida, "w"))
    print(f"{len(out)} tramos con voz")


def texto(audio, salida):
    from faster_whisper import WhisperModel
    m = WhisperModel(os.environ.get("MODELO", "small"), device="cpu", compute_type="int8")
    segs, _ = m.transcribe(leer_wav(audio), language="es", word_timestamps=True, vad_filter=True)
    out = []
    for s in segs:
        for w in s.words:
            out.append({"offsets": {"from": int(w.start * 1000), "to": int(w.end * 1000)}, "text": w.word})
    json.dump({"transcription": out}, open(salida, "w"), ensure_ascii=False)
    print(f"{len(out)} palabras")


def cara(video, salida):
    # Detección de cara con OpenCV (equivalente en la nube a Apple Vision)
    import cv2
    det = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    paso = max(1, int(fps / 4))  # 4 muestras por segundo
    puntos, i = [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % paso == 0:
            h, w = frame.shape[:2]
            peq = cv2.resize(frame, (w // 3, h // 3))
            caras = det.detectMultiScale(cv2.cvtColor(peq, cv2.COLOR_BGR2GRAY), 1.1, 5, minSize=(40, 40))
            if len(caras):
                x, y, cw, ch = max(caras, key=lambda c: c[2] * c[3])
                puntos.append({"t": round(i / fps, 2), "x": round((x + cw / 2) * 3 / w, 3), "y": round((y + ch / 2) * 3 / h, 3)})
        i += 1
    # suavizado para que el encuadre no tiemble
    for k in ("x", "y"):
        vals = [p[k] for p in puntos]
        for j in range(len(puntos)):
            ventana = vals[max(0, j - 4): j + 5]
            puntos[j][k] = round(sum(ventana) / len(ventana), 3)
    json.dump(puntos, open(salida, "w"))
    print(f"cara detectada en {len(puntos)} muestras")


{"vad": vad, "texto": texto, "cara": cara}[sys.argv[1]](sys.argv[2], sys.argv[3])
