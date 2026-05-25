import type React from "react";
import { Text, type TextProps } from "ink";

// CropCode agricultural green theme
export const THEME_COLORS = {
  primary: "#2d8a4e", // Forest green
  secondary: "#1a6b3c", // Deep green
  accent: "#4caf50", // Bright crop green
  gold: "#d4a017", // Wheat gold
  earth: "#8b6914", // Soil brown
};

// Use solid color instead of gradient for clarity
export const ThemedGradient: React.FC<TextProps> = ({ children, ...props }) => {
  return (
    <Text color={THEME_COLORS.primary} {...props}>
      {children}
    </Text>
  );
};
