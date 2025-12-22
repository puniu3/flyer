/**
 * Define sound names independently to keep audio logic decoupled from game rules.
 */
export type SoundEffect = 
  | 'roll' 
  | 'mighty' 
  | 'acrobatics' 
  | 'metamorph' 
  | 'win' 
  | 'dungeon_progress' 
  | 'attribute_gain';

/**
 * Triggers audio playback for a specific sound effect.
 * @param sound - The ID of the sound to play.
 */
export function playSound(sound: SoundEffect): void {
  // Logic to trigger audio goes here
}
