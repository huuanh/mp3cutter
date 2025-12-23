export const SCREEN_NAMES = {
  // Main Stack
  LOADING: 'Loading',
  LANGUAGE_SELECTION: 'LanguageSelection',
  ONBOARDING: 'Onboarding',
  MAIN_TABS: 'MainTabs',
  
  // Main Tabs
  HOME: 'Home',
  SETTINGS: 'Settings',
  CUT_AUDIO: 'CutAudio',
  AUDIO_FILE_SELECT: 'AudioFileSelect',
} as const;

export const ASYNC_STORAGE_KEYS = {
  ONBOARDING_COMPLETED: '@hair_clipper_onboarding_completed',
  SELECTED_LANGUAGE: '@hair_clipper_selected_language',
} as const;