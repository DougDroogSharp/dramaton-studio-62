export const speak = (text: string, force: boolean = false) => {
  if (!window.speechSynthesis) return;
  
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 0.9;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Samantha'));
  if (preferredVoice) utterance.voice = preferredVoice;

  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
