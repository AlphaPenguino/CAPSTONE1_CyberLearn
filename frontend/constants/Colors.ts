/**
 * Color theme using light blue and white as primary colors
 */

const tintColorLight = '#0ea5e9'; // Sky blue
const tintColorDark = '#38bdf8';  // Lighter sky blue for dark mode

export const Colors = {
  light: {
    text: '#0c4a6e',          // Dark blue for text
    background: '#ffffff',     // Pure white
    tint: tintColorLight,
    icon: '#0369a1',          // Medium blue
    tabIconDefault: '#7dd3fc', // Very light blue
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#e0f2fe',          // Very light blue-white
    background: '#0c4a6e',     // Dark blue
    tint: tintColorDark,
    icon: '#7dd3fc',          // Light blue
    tabIconDefault: '#38bdf8', // Sky blue
    tabIconSelected: tintColorDark,
  },
};
