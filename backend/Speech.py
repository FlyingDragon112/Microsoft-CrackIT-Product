import os
import threading
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv
import requests, uuid

load_dotenv()
api_endpoint = os.getenv("SPEECH_ENDPOINT")
api_key = os.getenv("SPEECH_KEY")
speech_config = speechsdk.SpeechConfig(subscription=api_key, endpoint=api_endpoint)

_speech_synthesizer = None
_is_speaking        = False
_synthesizer_lock   = threading.Lock()

def recognize_from_microphone():
    auto_detect_source_language_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
        languages=["en-US", "hi-IN", "bn-IN", "gu-IN"]
    )
    audio_config    = speechsdk.audio.AudioConfig(use_default_microphone=True)
    speech_recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        auto_detect_source_language_config=auto_detect_source_language_config,
        audio_config=audio_config,
    )

    print("Speak into your microphone.")
    result = speech_recognizer.recognize_once()
    auto_detect_source_language_result = speechsdk.AutoDetectSourceLanguageResult(result)
    detected_language = auto_detect_source_language_result.language

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        print(f"Recognized: {result.text} (Language: {detected_language})")
        return result.text,detected_language        # ← also return language
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech could be recognized: {}".format(result.no_match_details))
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print("Speech Recognition canceled: {}".format(cancellation_details.reason))
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print("Error details: {}".format(cancellation_details.error_details))
            print("Did you set the speech resource key and endpoint values?")
    return "explain electric field", detected_language

def translate_text_azure(text, to_language):
    constructed_url = "https://api.cognitive.microsofttranslator.com/translate"
    params = {"api-version": "3.0", "from": "en", "to": to_language}
    headers = {
        "Ocp-Apim-Subscription-Key": os.getenv("TRANSLATE_KEY"),
        "Ocp-Apim-Subscription-Region": "southeastasia",
        "Content-type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4()),
    }
    body = [{"text": text}]
    response = requests.post(constructed_url, params=params, headers=headers, json=body)
    response.raise_for_status()
    translations = response.json()
    if translations and "translations" in translations[0]:
        return translations[0]["translations"][0]["text"]
    return text  # fallback

def stop_speech():
    """Stop any ongoing TTS playback."""
    global _speech_synthesizer, _is_speaking
    with _synthesizer_lock:
        if _speech_synthesizer and _is_speaking:
            _speech_synthesizer.stop_speaking_async()
            _is_speaking = False
            print("Speech stopped.")


def convert_text_to_speech(text, language):
    """
    Toggle behaviour:
      • If audio is playing  → stop it and return.
      • If audio is silent   → translate (if needed) and start playback.
    Runs synthesis on a background thread so the UI stays responsive.
    """
    global _speech_synthesizer, _is_speaking

    with _synthesizer_lock:
        if _is_speaking:
            _speech_synthesizer.stop_speaking_async()
            _is_speaking = False
            print("Speech stopped by toggle.")
            return

    print(f"Converting text to speech in language: {language}")

    voices = {
        "en-US": "en-US-AvaNeural",
        "hi-IN": "hi-IN-SwaraNeural",
        "bn-IN": "bn-IN-TanishaaNeural",
        "gu-IN": "gu-IN-DhwaniNeural",
    }

    #Translate if the target language is not English
    if language != "en-US":
        lang_map = {"hi-IN": "hi", "bn-IN": "bn", "gu-IN": "gu"}
        text = translate_text_azure(text, lang_map.get(language, "hi"))

    speech_config.speech_synthesis_voice_name = voices.get(language, "hi-IN-SwaraNeural")
    audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)

    # Create a fresh synthesizer for every playback session
    with _synthesizer_lock:
        _speech_synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=audio_config,
        )
        _is_speaking = True

    def _synthesize():
        global _is_speaking
        result = _speech_synthesizer.speak_text_async(text).get()

        with _synthesizer_lock:
            _is_speaking = False  # reset once playback finishes naturally

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print(f"Speech synthesized for text [{text}] in language [{language}]")
        elif result.reason == speechsdk.ResultReason.Canceled:
            details = result.cancellation_details
            print("Speech synthesis canceled: {}".format(details.reason))
            if details.reason == speechsdk.CancellationReason.Error and details.error_details:
                print("Error details: {}".format(details.error_details))
                print("Did you set the speech resource key and endpoint values?")

    threading.Thread(target=_synthesize, daemon=True).start()