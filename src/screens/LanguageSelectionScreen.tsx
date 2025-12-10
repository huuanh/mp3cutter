import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    StatusBar,
    Dimensions,
    Alert,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, GradientStyles } from '../constants/colors';
import { SCREEN_NAMES } from '../constants';
import { NativeAdComponent } from '../utils/NativeAdComponent';
import { ADS_UNIT } from '../utils/AdManager';
import LanguageManager, { SUPPORTED_LANGUAGES } from '../utils/LanguageManager';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

type LanguageSelectionRouteProp = RouteProp<
    { LanguageSelection: { fromSettings?: boolean } },
    'LanguageSelection'
>;
const LanguageSelectionScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<LanguageSelectionRouteProp>();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [languageManager] = useState(() => LanguageManager.getInstance());
    const [supportedLanguages, setSupportedLanguages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Check if we came from Settings screen
    const isFromSettings = route.params?.fromSettings;

    // Load supported languages and current language
    useEffect(() => {
        const initializeLanguages = () => {
            // Get supported languages from LanguageManager
            const languages = languageManager.getSupportedLanguages();
            setSupportedLanguages(languages);
            
            // Get current language
            const currentLang = languageManager.getCurrentLanguage();
            setSelectedLanguage(currentLang);
        };

        initializeLanguages();
    }, [languageManager]);

    useEffect(() => {
        // Reset navigation stack to prevent going back
        // navigation.reset({
        //     index: 0,
        //     routes: [{ name: SCREEN_NAMES.ONBOARDING as never }],
        // });
    
        // Handle hardware back button on Android
        const backHandler = BackHandler.addEventListener(
          'hardwareBackPress',
          () => {
            // Prevent going back from onboarding
            return true; // Return true to prevent default back behavior
          }
        );
    
        return () => backHandler.remove();
      }, []);
    

    const handleLanguageSelect = (languageCode: string) => {
        setSelectedLanguage(languageCode);
    };

    const handleApply = async () => {
        if (!selectedLanguage) {
            console.error('No language selected');
            return;
        }

        setIsLoading(true);
        
        try {
            // Use LanguageManager to set the language
            const result = await languageManager.setLanguage(selectedLanguage);
            
            if (result.error) {
                Alert.alert('Error', `Failed to set language: ${result.error}`);
                setIsLoading(false);
                return;
            }
            
            // Check if app restart is required (for RTL languages)
            if (result.requiresRestart) {
                Alert.alert(
                    'Language Changed',
                    'The app needs to restart to apply the new language settings.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Navigate based on source
                                if (isFromSettings) {
                                    navigation.goBack();
                                } else {
                                    navigation.navigate(SCREEN_NAMES.ONBOARDING as never);
                                }
                            }
                        }
                    ]
                );
            } else {
                // Navigate without restart
                if (isFromSettings) {
                    navigation.goBack();
                } else {
                    navigation.navigate(SCREEN_NAMES.ONBOARDING as never);
                }
            }
            
        } catch (error) {
            console.error('Error applying language:', error);
            Alert.alert('Error', 'Failed to apply language changes.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderLanguageItem = (language: any) => {
        const isSelected = selectedLanguage === language.id;

        return (
            <TouchableOpacity
                key={language.id}
                style={[
                    styles.languageItem,
                    isSelected && styles.languageItemSelected
                ]}
                onPress={() => handleLanguageSelect(language.id)}
                activeOpacity={0.8}
            >
                <View style={styles.languageContent}>
                    <Image source={language.flag} style={styles.flagImage} />
                    <Text style={[
                        styles.languageName,
                        isSelected && styles.languageNameSelected
                    ]}>
                        {language.nativeName}
                    </Text>
                </View>

                <View style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected
                ]}>
                    {isSelected && <View style={styles.radioButtonInner} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <LinearGradient
            colors={GradientStyles.dark.colors}
            start={GradientStyles.dark.start}
            end={GradientStyles.dark.end}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>{t('settings.language')}</Text>

                <TouchableOpacity
                    style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
                    onPress={handleApply}
                    disabled={isLoading}
                >
                    <Text style={styles.nextButtonText}>
                        {isLoading ? 'Applying...' : 'Apply'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.languageList}>
                    {supportedLanguages.map(renderLanguageItem)}
                </View>

            </ScrollView>
            {/* Native Ad */}
            <View style={styles.adContainer}>
                <NativeAdComponent
                    adUnitId={ADS_UNIT.NATIVE_LANGUAGE}
                    hasMedia={true}
                    // hasToggleMedia={true}
                />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.background,
        // paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.white,
        letterSpacing: 1,
    },
    nextButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 3,
        borderRadius: 20,
    },
    nextButtonDisabled: {
        backgroundColor: Colors.gray,
        opacity: 0.6,
    },
    nextButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    languageList: {
        paddingHorizontal: 20,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 16,
        marginBottom: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    languageItemSelected: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: Colors.primary,
    },
    languageContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    flagImage: {
        width: 24,
        height: 24,
        borderRadius: 2,
        marginRight: 12,
    },
    languageName: {
        fontSize: 16,
        color: Colors.white,
        fontWeight: '500',
    },
    languageNameSelected: {
        color: Colors.white,
        fontWeight: '600',
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.gray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: Colors.primary,
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    adContainer: {
        backgroundColor: Colors.background,
        paddingHorizontal: 10,
        // marginTop: 30,
        paddingBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
        
    },
});

export default LanguageSelectionScreen;