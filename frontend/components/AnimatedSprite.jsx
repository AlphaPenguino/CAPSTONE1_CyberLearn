import React, { useState, useEffect, useRef } from 'react';
import { Animated, Image } from 'react-native';

export default function AnimatedSprite({ 
  frames, 
  fps = 12, 
  isPlaying = true, 
  loop = true, 
  onComplete,
  style,
  ...props 
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef(null);
  const lastFrameTime = useRef(Date.now());

  useEffect(() => {
    if (!frames || frames.length === 0) return;
    
    if (isPlaying) {
      const animate = () => {
        const now = Date.now();
        const delta = now - lastFrameTime.current;
        
        if (delta > (1000 / fps)) {
          setCurrentFrame(prevFrame => {
            const nextFrame = prevFrame + 1;
            
            if (nextFrame >= frames.length) {
              if (loop) {
                return 0;
              } else {
                if (onComplete) onComplete();
                return prevFrame;
              }
            }
            
            return nextFrame;
          });
          
          lastFrameTime.current = now;
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [frames, fps, isPlaying, loop, onComplete]);

  if (!frames || frames.length === 0) return null;
  
  return (
    <Animated.Image
      source={frames[currentFrame]}
      style={style}
      {...props}
    />
  );
}