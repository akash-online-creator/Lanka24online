// src/utils/sirenAudio.ts ඇතුළත වෙනස් කළ යුතු කොටස:

// 1. මොනවා වුණත් ඍජුවම ඔබගේ .wav File එක පමණක් Return කරන්න
export function getCustomSirenAudio(): string {
  return defaultSirenSound;
}

// 2. Siren එක Play වෙන තැන ස්ථිරවම .wav එකට Lock කරන්න
export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();
    isSirenActive = true;

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

    // Cloud Database එකේ මොන URL එක තිබුණත් ස්ථිරවම ඔබගේ .wav ගොනුව පමණක් Play වේ
    htmlAudioElement = new Audio(defaultSirenSound);
    htmlAudioElement.loop = true;
    htmlAudioElement.volume = effectiveVolume;
    
    htmlAudioElement.play().catch((err) => {
      console.warn('Siren Play Blocked by Browser:', err);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([600, 200, 600, 200, 900, 300, 600, 200]);
      } catch {}
    }
  } catch (err) {
    console.error('Failed to start emergency siren:', err);
  }

  return stopEmergencySiren;
}
