import os
import asyncio
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv
import requests, uuid

load_dotenv()
api_endpoint = os.getenv("SPEECH_ENDPOINT")
api_key      = os.getenv("SPEECH_KEY")

VOICES = {
    "en-US": "en-US-AvaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "bn-IN": "bn-IN-TanishaaNeural",
    "gu-IN": "gu-IN-DhwaniNeural",
}
LANG_MAP = {"hi-IN": "hi", "bn-IN": "bn", "gu-IN": "gu"}


def recognize_from_microphone():
    speech_config = speechsdk.SpeechConfig(subscription=api_key, endpoint=api_endpoint)
    auto_detect   = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
        languages=["en-US", "hi-IN", "bn-IN", "gu-IN"]
    )
    mic_config        = speechsdk.audio.AudioConfig(use_default_microphone=True)
    speech_recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        auto_detect_source_language_config=auto_detect,
        audio_config=mic_config,
    )
    print("Speak into your microphone.")
    result            = speech_recognizer.recognize_once()
    detected_language = speechsdk.AutoDetectSourceLanguageResult(result).language

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        print(f"Recognized: {result.text} (Language: {detected_language})")
        return result.text, detected_language
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech could be recognized:", result.no_match_details)
    elif result.reason == speechsdk.ResultReason.Canceled:
        cd = result.cancellation_details
        print("Speech Recognition canceled:", cd.reason)
        if cd.reason == speechsdk.CancellationReason.Error:
            print("Error details:", cd.error_details)
    return "", detected_language


def translate_text_azure(text, to_language):
    url      = "https://api.cognitive.microsofttranslator.com/translate"
    params   = {"api-version": "3.0", "from": "en", "to": to_language}
    headers  = {
        "Ocp-Apim-Subscription-Key": os.getenv("TRANSLATE_KEY"),
        "Ocp-Apim-Subscription-Region": "southeastasia",
        "Content-type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4()),
    }
    response = requests.post(url, params=params, headers=headers, json=[{"text": text}])
    response.raise_for_status()
    translations = response.json()
    if translations and "translations" in translations[0]:
        return translations[0]["translations"][0]["text"]
    return text


async def stream_tts(text, language):
    """Async generator that yields audio chunks as they are synthesized."""
    if language != "en-US":
        text = translate_text_azure(text, LANG_MAP.get(language, "hi"))

    cfg = speechsdk.SpeechConfig(subscription=api_key, endpoint=api_endpoint)
    cfg.speech_synthesis_voice_name = VOICES.get(language, "en-US-AvaNeural")
    cfg.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    )

    loop        = asyncio.get_event_loop()
    queue       = asyncio.Queue()
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=None)

    def on_chunk(evt):
        loop.call_soon_threadsafe(queue.put_nowait, bytes(evt.result.audio_data))

    def on_done(evt):
        loop.call_soon_threadsafe(queue.put_nowait, None)

    synthesizer.synthesizing.connect(on_chunk)
    synthesizer.synthesis_completed.connect(on_done)
    synthesizer.synthesis_canceled.connect(on_done)
    synthesizer.speak_text_async(text)  # non-blocking

    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        yield chunk