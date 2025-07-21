import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { wanderer_sprites, wanderer_frames } from '../components/spriteSets.js';
const SPRITE_WIDTH = 128;
const SPRITE_HEIGHT = 128;
const FRAMES = {
  attack2: 4,
  attack: 4,
  idle: 7,
  hurt: 3,
  dead: 6,
};
const SPRITES = {
  attack2: require('../assets/sprites/Fire_Wizard/Attack_2.png'),
  attack: require('../assets/sprites/Fire_Wizard/Attack_1.png'),
  idle: require('../assets/sprites/Fire_Wizard/Idle.png'),
  hurt: require('../assets/sprites/Fire_Wizard/Hurt.png'),
  dead: require('../assets/sprites/Fire_Wizard/Dead.png'),
};



export default function CharacterSprite({
  action = 'idle',
  speed = 100,
  scale = 1,
  spriteSet = SPRITES, // fallback to default
  frames = FRAMES,     // fallback to default
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
  }, [action]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % frames[action]);
    }, speed);
    return () => clearInterval(interval);
  }, [action, speed, frames]);

  const offset = -frame * SPRITE_WIDTH * scale;

  return (
    <View style={[styles.spriteContainer, { width: SPRITE_WIDTH * scale, height: SPRITE_HEIGHT * scale }]}>
      <Image
        source={spriteSet[action]}
        style={{
          position: 'absolute',
          left: offset,
          width: SPRITE_WIDTH * frames[action] * scale,
          height: SPRITE_HEIGHT * scale,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  spriteContainer: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});