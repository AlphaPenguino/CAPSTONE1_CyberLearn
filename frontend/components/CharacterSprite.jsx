import React, { useEffect, useMemo, useState } from "react";
import { View, Image, StyleSheet, Platform } from "react-native";

const SPRITE_WIDTH = 128;
const SPRITE_HEIGHT = 128;

// Default fallback frames and sprites (Fire Wizard)
const DEFAULT_FRAMES = {
  attack2: 4,
  attack: 4,
  idle: 7,
  hurt: 3,
  dead: 6,
};

const DEFAULT_SPRITES = {
  attack2: require("../assets/sprites/Fire_Wizard/Attack_2.png"),
  attack: require("../assets/sprites/Fire_Wizard/Attack_1.png"),
  idle: require("../assets/sprites/Fire_Wizard/Idle.png"),
  hurt: require("../assets/sprites/Fire_Wizard/Hurt.png"),
  dead: require("../assets/sprites/Fire_Wizard/Dead.png"),
};

export default function CharacterSprite({
  action = "idle",
  speed = 150,
  scale = 1,
  spriteSet = DEFAULT_SPRITES,
  frames = DEFAULT_FRAMES,
  flipped = false, // New prop to flip the sprite horizontally
  size = 120, // Size prop for easier scaling
  style, // allow parent to pass container style (e.g., margins, positioning)
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
  }, [action]);

  // Determine sprite source for current action
  const spriteSource =
    spriteSet[action] || DEFAULT_SPRITES[action] || DEFAULT_SPRITES.idle;

  // Track dynamically loaded size (web fallback)
  const [loadedSize, setLoadedSize] = useState(null);

  // Resolve sprite sheet dimensions (works for static requires on native). On web, Image.resolveAssetSource
  // might be missing, so guard it. We'll also optionally use onLoad to capture intrinsic size.
  const resolved = useMemo(() => {
    if (typeof Image.resolveAssetSource === "function") {
      try {
        return Image.resolveAssetSource(spriteSource) || {};
      } catch (_) {
        // ignore and fall back
      }
    }
    return {};
  }, [spriteSource]);

  // Compute frames per action with auto-detection:
  // - Prefer provided frames[action] when > 1
  // - Else, if the sheet is a horizontal strip, detect by width/height ratio
  // - Else, fall back to DEFAULT_FRAMES[action] or 1
  const framesForAction = useMemo(() => {
    const provided = frames?.[action];
    if (typeof provided === "number" && provided > 1) return provided;

    const w = resolved?.width;
    const h = resolved?.height;
    if (w && h && w > 0 && h > 0) {
      // Try to find an integer frame count that makes frameWidth ~= frameHeight (horizontal strip)
      let bestN = 1;
      let bestErr = Number.POSITIVE_INFINITY;
      const maxN = 24; // reasonable upper bound for sprite frames
      for (let n = 1; n <= maxN; n++) {
        const frameW = w / n;
        const err = Math.abs(frameW - h);
        // Prefer exact divisibility and smaller error
        const divisible = w % n === 0;
        const score = err + (divisible ? 0 : 0.5); // penalize non-divisible candidates
        if (score < bestErr) {
          bestErr = score;
          bestN = n;
        }
      }
      return Math.max(1, bestN);
    }
    return DEFAULT_FRAMES[action] || 1;
  }, [action, frames, resolved?.width, resolved?.height]);

  useEffect(() => {
    if (framesForAction <= 1) return; // nothing to animate

    // Do not loop death animation: advance to last frame and stop
    if (action === "dead") {
      const interval = setInterval(() => {
        setFrame((f) => {
          if (f + 1 >= framesForAction) {
            clearInterval(interval);
            return framesForAction - 1; // stay on the last frame
          }
          return f + 1;
        });
      }, speed);
      return () => clearInterval(interval);
    }

    // Default looping for other actions
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % framesForAction);
    }, speed);
    return () => clearInterval(interval);
  }, [action, speed, framesForAction]);

  // Use detected frames to compute frame sizing and offsets
  const sheetWidth =
    loadedSize?.width || resolved.width || SPRITE_WIDTH * framesForAction;
  const sheetHeight = loadedSize?.height || resolved.height || SPRITE_HEIGHT;
  const frameWidth = sheetWidth / framesForAction;
  const frameHeight = sheetHeight;

  // Scale to desired logical size based on frame width
  const actualScale = size / frameWidth;
  const scaledFrameW = Math.round(frameWidth * actualScale);
  const scaledFrameH = Math.round(frameHeight * actualScale);
  const scaledSheetW = Math.round(sheetWidth * actualScale);
  const scaledSheetH = Math.round(sheetHeight * actualScale);
  const offset = -Math.round(frame * frameWidth * actualScale);

  return (
    <View
      style={[
        styles.spriteContainer,
        {
          width: scaledFrameW,
          height: scaledFrameH,
          ...(Platform.OS === "web" && {
            minWidth: scaledFrameW,
            maxWidth: scaledFrameW,
          }),
        },
        style,
      ]}
    >
      <Image
        source={spriteSource}
        onLoad={(e) => {
          // React Native Web: e.nativeEvent?.source?.width/height
          const w = e?.nativeEvent?.source?.width;
          const h = e?.nativeEvent?.source?.height;
          // Only set if valid numbers and not already available from resolveAssetSource
          if (w && h && (!resolved.width || !resolved.height)) {
            setLoadedSize({ width: w, height: h });
          }
        }}
        style={{
          position: "absolute",
          left: offset,
          top: 0,
          width: scaledSheetW,
          height: scaledSheetH,
          transform: [{ scaleX: flipped ? -1 : 1 }],
          ...(Platform.OS === "web" && {
            imageRendering: "pixelated",
            WebkitImageRendering: "-webkit-optimize-contrast",
            right: "auto",
          }),
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  spriteContainer: {
    overflow: "hidden",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" && {
      position: "relative",
      clipPath: "inset(0px)",
      WebkitClipPath: "inset(0px)",
      maxWidth: "100%",
      boxSizing: "border-box",
    }),
  },
});
