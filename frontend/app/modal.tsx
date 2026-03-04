/**
 * Add Moment Modal
 *
 * Modal screen for creating a new moment.
 * Allows users to take a photo or choose from library,
 * add an optional caption, and upload to the server.
 * Rate limited to one moment per day.
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createMoment, canUploadToday } from '@/services/api';

export default function AddMomentModal() {
  const insets = useSafeAreaInsets();
  const [image, setImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState<boolean | null>(null);

  /** Check if user can upload today on mount */
  useEffect(() => {
    const checkUploadLimit = async () => {
      const allowed = await canUploadToday();
      setCanUpload(allowed);
      if (!allowed) {
        setError("You've already saved today's moment. Come back tomorrow!");
      }
    };
    checkUploadLimit();
  }, []);

  /** Open image picker to select from photo library */
  const pickImage = async () => {
    if (canUpload === false) {
      setError("You've already saved today's moment. Come back tomorrow!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage(asset.uri);
      if (asset.width && asset.height) {
        setAspectRatio(asset.width / asset.height);
      }
    }
  };

  /** Launch camera to capture a new photo */
  const takePhoto = async () => {
    if (canUpload === false) {
      setError("You've already saved today's moment. Come back tomorrow!");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage(asset.uri);
      if (asset.width && asset.height) {
        setAspectRatio(asset.width / asset.height);
      }
    }
  };

  /** Upload moment to server with image and optional caption */
  const handleSave = async () => {
    if (!image) {
      setError('Please select or take a photo first');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await createMoment(image, comment || undefined);
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save moment';
      if (message.includes('one moment per day')) {
        setError("You've already saved today's moment. Come back tomorrow!");
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /** Dismiss modal without saving */
  const handleClose = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>New Moment</Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveButton, !image && styles.saveButtonDisabled]}
          disabled={!image || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {image ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: image }}
                style={[styles.imagePreview, { aspectRatio, maxHeight: 400 }]}
                contentFit="contain"
              />
              <Pressable style={styles.changeImageButton} onPress={pickImage}>
                <Text style={styles.changeImageText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.imagePicker}>
              <Pressable
                style={[styles.imagePickerButton, canUpload === false && styles.imagePickerButtonDisabled]}
                onPress={takePhoto}
                disabled={canUpload === false}
              >
                <MaterialIcons name="camera-alt" size={32} color={canUpload === false ? "#d1d5db" : "#6b7280"} />
                <Text style={[styles.imagePickerText, canUpload === false && styles.imagePickerTextDisabled]}>Take Photo</Text>
              </Pressable>
              <Pressable
                style={[styles.imagePickerButton, canUpload === false && styles.imagePickerButtonDisabled]}
                onPress={pickImage}
                disabled={canUpload === false}
              >
                <MaterialIcons name="photo-library" size={32} color={canUpload === false ? "#d1d5db" : "#6b7280"} />
                <Text style={[styles.imagePickerText, canUpload === false && styles.imagePickerTextDisabled]}>Choose from Library</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Caption (optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a caption..."
              placeholderTextColor="#9ca3af"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={200}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="info-outline" size={20} color="#f59e0b" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  imagePicker: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  imagePickerButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  imagePickerButtonDisabled: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  imagePickerTextDisabled: {
    color: '#d1d5db',
  },
  imagePreviewContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    borderRadius: 12,
  },
  changeImageButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  changeImageText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  commentContainer: {
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#000',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
