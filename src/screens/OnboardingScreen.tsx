import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Image,
    ScrollView,
    BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';
import LinearGradient from 'react-native-linear-gradient';

import { CustomButton } from '../components';
import { Colors, GradientStyles } from '../constants/colors';
import { SCREEN_NAMES, ASYNC_STORAGE_KEYS } from '../constants';
import { NativeAdComponent } from '../utils/NativeAdComponent';
import { ADS_UNIT } from '../utils/AdManager';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(0);
    const pagerRef = useRef<PagerView>(null);

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
    }, [navigation]);

    const getOnboardingData = () => [
        {
            id: 1,
            title: t('onboarding.cut_create.title'),
            subtitle: t('onboarding.cut_create.subtitle'),
            image: require('../../assets/onboard/1.png'),
        },
        {
            id: 2,
            title: t('onboarding.make_it_ur.title'),
            subtitle: t('onboarding.cut_create.subtitle'),
            image: require('../../assets/onboard/2.png'),
        },
        {
            id: 3,
            title: t('onboarding.edit_merge.title'),
            subtitle: t('onboarding.edit_merge.subtitle'),
            image: require('../../assets/onboard/3.png'),
        },
    ];

    const ONBOARDING_DATA = getOnboardingData();

    const handleNext = async () => {
        if (currentPage < ONBOARDING_DATA.length - 1) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            pagerRef.current?.setPage(nextPage);
        } else {
            await handleGetStarted();
        }
    };

    const handleGetStarted = async () => {
        try {
            await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
            navigation.navigate(SCREEN_NAMES.HOME as never);
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            navigation.navigate(SCREEN_NAMES.HOME as never);
        }
    };

    const handleSkip = async () => {
        await handleGetStarted();
    };

    const renderPage = (item: typeof ONBOARDING_DATA[0]) => (
        <View key={item.id} style={styles.page}>
            {/* Image Section */}
            <View style={styles.imageContainer}>
                <Image
                    source={item.image}
                    style={styles.onboardingImage}
                    resizeMode="cover"
                />
                {/* Content Section - Overlaid on image */}
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
            </View>
        </View>
    );

    const renderPagination = () => (
        <View style={styles.pagination}>
            {ONBOARDING_DATA.map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        {
                            backgroundColor: index === currentPage ? Colors.primary : Colors.gray,
                            width: index === currentPage ? 22 : 6,
                        },
                    ]}
                />
            ))}
        </View>
    );

    return (
        <LinearGradient
            colors={GradientStyles.dark.colors}
            start={GradientStyles.dark.start}
            end={GradientStyles.dark.end}
            style={styles.container}>

            <PagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}>
                {ONBOARDING_DATA.map(renderPage)}
            </PagerView>

            {currentPage === ONBOARDING_DATA.length - 1 && (
                <View style={styles.footer}>
                    {renderPagination()}
                    <CustomButton
                        title={currentPage === ONBOARDING_DATA.length - 1 ? t('onboarding.get_started') : t('onboarding.next')}
                        onPress={handleNext}
                        size="large"
                        variant="outline"
                        style={styles.nextButton}
                        textStyle={styles.nextButtonText}
                    />
                </View>)}
            {/* Native Ads Section */}
            <View style={styles.nativeAdsContainer}>
                <NativeAdComponent 
                    adUnitId={ADS_UNIT.NATIVE_ONBOARD} 
                    hasMedia={true} />
            </View>
            {currentPage !== ONBOARDING_DATA.length - 1 && (
                <View style={styles.footer}>
                    {renderPagination()}
                    <CustomButton
                        title={currentPage === ONBOARDING_DATA.length - 1 ? t('onboarding.get_started') : t('onboarding.next')}
                        onPress={handleNext}
                        size="large"
                        variant="outline"
                        style={styles.nextButton}
                        textStyle={styles.nextButtonText}
                    />
                </View>)}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pagerView: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    page: {
        flex: 1,
        width: width,
        height: height * 0.5,
        // backgroundColor: Colors.background,
    },
    imageContainer: {
        flex: 1,
        position: 'relative',
        width: width,
        height: height * 0.5,
        // backgroundColor: Colors.background,
    },
    onboardingImage: {
        width: width,
        height: height * 0.5,
        // backgroundColor: Colors.background,
    },
    contentContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.lightGray,
        textAlign: 'center',
        lineHeight: 24,
    },
    nativeAdsContainer: {
        width: '100%',
        paddingBottom: 5,
        paddingHorizontal: 10,
        backgroundColor: Colors.background,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    adRating: {
        fontSize: 10,
        color: Colors.white,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
        overflow: 'hidden',
    },
    ratingStars: {
        fontSize: 12,
        color: '#FFD700',
    },
    adButton: {
        backgroundColor: Colors.white,
        paddingVertical: 12,
        borderRadius: 8,
    },
    adButtonText: {
        color: Colors.primary,
        fontWeight: '600',
    },
    pageNextButton: {
        borderColor: Colors.white,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        // paddingVertical: 20,
    },
    dot: {
        width: 10,
        height: 6,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        // paddingBottom: 10,
        backgroundColor: Colors.background,
    },
    nextButton: {
        // width: '100%',
        backgroundColor: Colors.primary,
        borderWidth: 0,
        borderRadius: 8,
    },
    nextButtonText: {
        // textDecorationLine: 'underline',
        color: Colors.white,
    },
});

export default OnboardingScreen;
