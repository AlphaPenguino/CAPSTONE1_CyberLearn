/**
 * CyberLearn Navy Theme Colors
 * Navy Blue base with Gold, White, Warm Beige, and Coral accents
 */

const tintColorLight = "#FFD700"; // Gold
const tintColorDark = "#FF7F50"; // Coral for dark mode

export const Colors = {
  light: {
    text: "#001F3F", // Navy Blue for text
    background: "#FFFFFF", // Pure white
    tint: tintColorLight,
    icon: "#001F3F", // Navy Blue icons
    tabIconDefault: "#F5DEB3", // Warm Beige for inactive tabs
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#FFFFFF", // White text for dark mode
    background: "#001F3F", // Navy Blue background
    tint: tintColorDark,
    icon: "#FFD700", // Gold icons
    tabIconDefault: "#F5DEB3", // Warm Beige for inactive tabs
    tabIconSelected: tintColorDark,
  },
};
