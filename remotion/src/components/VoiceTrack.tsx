import { Audio, staticFile } from "remotion";

/** Loads a pre-generated Chatterbox voiceover MP3 from public/voiceovers/. */
export const VoiceTrack: React.FC<{ name: string }> = ({ name }) => {
  return <Audio src={staticFile(`voiceovers/${name}.mp3`)} />;
};
