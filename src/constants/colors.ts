export const Colors = {
  primary: '#B531F6',
  primaryDark: '#9508F2',
  secondary: '#A855F7',
  background: '#000125',
  backgroundLight: '#1F0E35',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  transparent: 'transparent',
  
  // Gradients
  gradientPrimary: ['#8B5CF6', '#A855F7'],
  gradientSecondary: ['#7C3AED', '#8B5CF6'],
  gradientDark: ['#1A1A2E', '#16213E'],
};

export const GradientStyles = {
  primary: {
    colors: Colors.gradientPrimary,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: Colors.gradientSecondary,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  dark: {
    colors: Colors.gradientDark,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
};