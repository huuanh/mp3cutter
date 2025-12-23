import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import RNFS from 'react-native-fs';

import { Colors, GradientStyles } from '../constants/colors';
import { SCREEN_NAMES } from '../constants';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { NativeAdComponent } from '../utils/NativeAdComponent';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg'];
const MAX_SCAN_DEPTH = 1;
const MAX_RESULTS = 150;

interface AudioFileItem {
    name: string;
    path: string;
    size: number;
    mimeType: string;
    modified?: number;
}

const getCandidateDirectories = () => {
    if (Platform.OS === 'android') {
        const directories: string[] = [];
        if (RNFS.ExternalStorageDirectoryPath) {
            directories.push(`${RNFS.ExternalStorageDirectoryPath}/Music`);
            directories.push(`${RNFS.ExternalStorageDirectoryPath}/Download`);
            directories.push(`${RNFS.ExternalStorageDirectoryPath}/Ringtones`);
        }
        if (RNFS.DownloadDirectoryPath) {
            directories.push(RNFS.DownloadDirectoryPath);
        }
        return Array.from(new Set(directories));
    }

    // iOS exposes user files via DocumentDirectoryPath (sandboxed)
    return [RNFS.DocumentDirectoryPath];
};

const ensurePermission = async () => {
    if (Platform.OS !== 'android') {
        return true;
    }

    if (Platform.Version >= 33) {
        const scopedPermission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO;

        if (!scopedPermission) {
            return true;
        }

        const checkResult = await PermissionsAndroid.check(scopedPermission);
        if (checkResult) {
            return true;
        }

        const result = await PermissionsAndroid.request(scopedPermission, {
            title: 'Audio File Permission',
            message: 'This app needs access to your audio files to let you select and edit them.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
        });
        return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    const legacyPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const checkResult = await PermissionsAndroid.check(legacyPermission);
    if (checkResult) {
        return true;
    }

    const legacy = await PermissionsAndroid.request(
        legacyPermission,
        {
            title: 'Storage Permission',
            message: 'This app needs access to your storage to let you select audio files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
        }
    );
    return legacy === PermissionsAndroid.RESULTS.GRANTED;
};

const getMimeType = (filename: string) => {
    const lowered = filename.toLowerCase();
    if (lowered.endsWith('.mp3')) return 'audio/mpeg';
    if (lowered.endsWith('.m4a')) return 'audio/mp4';
    if (lowered.endsWith('.aac')) return 'audio/aac';
    if (lowered.endsWith('.wav')) return 'audio/wav';
    if (lowered.endsWith('.flac')) return 'audio/flac';
    if (lowered.endsWith('.ogg')) return 'audio/ogg';
    return 'audio/*';
};

const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
        size /= 1024;
        idx += 1;
    }
    const precision = idx === 0 ? 0 : 2;
    return `${size.toFixed(precision)} ${units[idx]}`;
};

const isAudioFile = (name: string) => AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
const AudioFileSelectScreen: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<AudioFileItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

    // Request permission when screen loads
    useEffect(() => {
        const requestPermission = async () => {
            const granted = await ensurePermission();
            setPermissionGranted(granted);
            
            if (!granted) {
                Alert.alert(
                    'Permission Required',
                    'Audio file access is required to browse and select your audio files. Please grant permission in your device settings.',
                    [
                        {
                            text: 'Cancel',
                            onPress: () => navigation.goBack(),
                            style: 'cancel',
                        },
                        {
                            text: 'Try Again',
                            onPress: async () => {
                                const retryGranted = await ensurePermission();
                                setPermissionGranted(retryGranted);
                                if (!retryGranted) {
                                    navigation.goBack();
                                }
                            },
                        },
                    ]
                );
            }
        };

        requestPermission();
    }, [navigation]);

    const loadFiles = useCallback(async () => {
        if (!permissionGranted) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const directories = getCandidateDirectories();
            const discovered: AudioFileItem[] = [];

            const scanDirectory = async (dirPath: string, depth: number) => {
                if (!dirPath || discovered.length >= MAX_RESULTS) {
                    return;
                }
                try {
                    const entries = await RNFS.readDir(dirPath);
                    for (const entry of entries) {
                        if (discovered.length >= MAX_RESULTS) {
                            break;
                        }
                        if (entry.isFile() && isAudioFile(entry.name)) {
                            try {
                                const stat = entry.size != null ? entry : await RNFS.stat(entry.path);
                                discovered.push({
                                    name: entry.name,
                                    path: entry.path,
                                    size: Number(stat.size ?? 0),
                                    mimeType: getMimeType(entry.name),
                                    modified: stat.mtime ? new Date(stat.mtime).getTime() : undefined,
                                });
                            } catch (statError) {
                                // Ignore individual stat errors to continue scanning
                            }
                        } else if (entry.isDirectory() && depth < MAX_SCAN_DEPTH) {
                            await scanDirectory(entry.path, depth + 1);
                        }
                    }
                } catch (dirError) {
                    // Ignore folder access issues (e.g., permissions or hidden folders)
                }
            };

            for (const dir of directories) {
                await scanDirectory(dir, 0);
                if (discovered.length >= MAX_RESULTS) {
                    break;
                }
            }

            const sorted = discovered.sort((a, b) => {
                if (a.modified && b.modified) {
                    return b.modified - a.modified;
                }
                return b.size - a.size;
            });
            console.log(`Discovered ${sorted.length} audio files.`, sorted);
            setFiles(sorted);
        } catch (scanError) {
            setError('Failed to load audio files. Please try again.');
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [permissionGranted]);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            const run = async () => {
                if (!mounted || !permissionGranted) {
                    return;
                }
                await loadFiles();
            };
            run();
            return () => {
                mounted = false;
            };
        }, [loadFiles, permissionGranted]),
    );

    const handleSelect = useCallback(
        (item: AudioFileItem) => {
            navigation.navigate(SCREEN_NAMES.CUT_AUDIO, {
                uri: item.path.startsWith('file://') ? item.path : `file://${item.path}`,
                name: item.name,
                size: item.size,
                type: item.mimeType,
            });
        },
        [navigation],
    );

    const listContentStyle = useMemo(
        () => ({
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 20,
        }),
        [],
    );

    const getAudioIcon = (index: number) => {
        // Alternate between two icon styles for visual variety
        return index % 2 === 0 
            ? require('../../assets/icon/mp3.png')
            : require('../../assets/icon/m4a.png');
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]} >
            <LinearGradient
                colors={GradientStyles.dark.colors}
                start={GradientStyles.dark.start}
                end={GradientStyles.dark.end}
                style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
                        <Image source={require('../../assets/icon/back.png')} style={{ width: 22, height: 22 }} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select File</Text>
                    <View style={styles.headerPlaceholder} />
                </View>

                <View style={styles.content}>
                    {permissionGranted === null ? (
                        <View style={styles.loadingWrapper}>
                            <ActivityIndicator size="large" color={Colors.white} />
                            <Text style={styles.loadingText}>Requesting permission…</Text>
                        </View>
                    ) : !permissionGranted ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>Permission Required</Text>
                            <Text style={styles.emptySubtitle}>Please grant audio file access to browse your music.</Text>
                        </View>
                    ) : loading ? (
                        <View style={styles.loadingWrapper}>
                            <ActivityIndicator size="large" color={Colors.white} />
                            <Text style={styles.loadingText}>Scanning audio files…</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>Oops!</Text>
                            <Text style={styles.emptySubtitle}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={loadFiles}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={files}
                            keyExtractor={(item) => item.path}
                            contentContainerStyle={listContentStyle}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity 
                                    style={styles.row} 
                                    activeOpacity={0.7} 
                                    onPress={() => handleSelect(item)}>
                                    <Image source={getAudioIcon(index)} style={styles.audioIcon} />
                                    <View style={styles.rowContent}>
                                        <Text style={styles.rowTitle} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.rowSubtitle}>{formatFileSize(item.size)}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyTitle}>No audio found</Text>
                                    <Text style={styles.emptySubtitle}>Place your music files in the Music or Download folder.</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                <View style={styles.adContainer}>
                    <NativeAdComponent />
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    headerPlaceholder: {
        width: 40,
        height: 40,
    },
    content: {
        flex: 1,
    },
    loadingWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        marginTop: 16,
        color: Colors.backgroundLight,
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    emptyTitle: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: Colors.backgroundLight,
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 14,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: Colors.white,
    },
    retryText: {
        color: Colors.background,
        fontWeight: '700',
    },
    audioIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    rowContent: {
        flex: 1,
        justifyContent: 'center',
    },
    rowTitle: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    rowSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
    },
    adContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
});

export default AudioFileSelectScreen;
