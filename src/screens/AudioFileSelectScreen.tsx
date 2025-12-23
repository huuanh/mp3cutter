import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
        const scopedPermission =
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO ?? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;

        if (!scopedPermission) {
            return true;
        }

        const result = await PermissionsAndroid.request(scopedPermission);
        return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    const legacy = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
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
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<AudioFileItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const granted = await ensurePermission();
            if (!granted) {
                setError('Permission required to browse audio files.');
                setFiles([]);
                setLoading(false);
                return;
            }

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
    }, []);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            const run = async () => {
                if (!mounted) {
                    return;
                }
                await loadFiles();
            };
            run();
            return () => {
                mounted = false;
            };
        }, [loadFiles]),
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
            paddingBottom: 160,
        }),
        [],
    );

    return (
        <View style={styles.safeArea}>
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
                    {loading ? (
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
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.row} activeOpacity={0.9} onPress={() => handleSelect(item)}>
                                    <Image source={require('../../assets/icon/mp3.png')} style={styles.audioIcon} />
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
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: 12,
    },
    audioIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    rowIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    rowSubtitle: {
        marginTop: 4,
        color: Colors.gray,
        fontSize: 12,
    },
    adContainer: {
        // position: 'absolute',
        // bottom: 20,
        // left: 20,
        // right: 20,
    },
});

export default AudioFileSelectScreen;
