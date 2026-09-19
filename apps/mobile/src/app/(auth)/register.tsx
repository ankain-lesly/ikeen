import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, UserPlus, X } from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { toast } from '@/lib/toast';

export default function RegisterScreen() {
  const colors = useTheme();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast.error('Please enter your full name');
      return;
    }
    if (!trimmedEmail) {
      toast.error('Please enter your email address');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      clearError();
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Account created successfully!');
      router.dismiss();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleGoToLogin = () => {
    Haptics.selectionAsync();
    clearError();
    router.replace('/(auth)/login');
  };

  const handleDismiss = () => {
    Haptics.selectionAsync();
    router.dismiss();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-card">
      {/* Top Drag Indicator & Dismiss */}
      <View className="items-center pt-3 pb-2 px-4 relative">
        <View className="w-10 h-1.5 rounded-full bg-border" />
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          className="absolute right-4 top-3 w-8 h-8 rounded-full items-center justify-center bg-background-element active:opacity-70">
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="flex-1 px-6 pt-2 pb-safe">
        {/* Brand Icon & Heading */}
        <View className="items-center mt-2 mb-6">
          <View className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
            <UserPlus size={28} color={colors.primary} />
          </View>
          <ThemedText className="text-2xl font-bold text-text text-center tracking-tight">
            Create Your Account
          </ThemedText>
          <Text className="text-sm text-text-secondary text-center mt-1 px-4">
            Protect your notes with cloud sync, backups, and folder encryption.
          </Text>
        </View>

        {/* Error Alert Banner */}
        {error && (
          <View className="p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <Text className="text-xs font-semibold text-red-500 text-center">
              {error}
            </Text>
          </View>
        )}

        {/* Form Inputs */}
        <View className="gap-4">
          {/* Full Name Input */}
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 ml-1">
              Full Name
            </Text>
            <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-background-element">
              <User size={18} color={colors.textSecondary} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex Morgan"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                className="flex-1 ml-2.5 text-base text-text"
              />
            </View>
          </View>

          {/* Email Address Input */}
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 ml-1">
              Email Address
            </Text>
            <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-background-element">
              <Mail size={18} color={colors.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 ml-2.5 text-base text-text"
              />
            </View>
          </View>

          {/* Password Input */}
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 ml-1">
              Password
            </Text>
            <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-background-element">
              <Lock size={18} color={colors.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                className="flex-1 ml-2.5 text-base text-text"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                className="p-1">
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSecondary} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Create Account CTA */}
          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            className={`h-12 rounded-xl flex-row items-center justify-center bg-primary active:opacity-90 mt-2 shadow-sm ${
              isLoading ? 'opacity-70' : 'opacity-100'
            }`}>
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text className="text-white font-semibold text-base mr-1.5">
                  Create Account
                </Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </Pressable>
        </View>

        {/* Switch to Login */}
        <View className="flex-row items-center justify-center mt-6 gap-1">
          <Text className="text-sm text-text-secondary">
            Already have an account?
          </Text>
          <Pressable onPress={handleGoToLogin} hitSlop={6}>
            <Text className="text-sm font-bold text-primary">
              Sign In
            </Text>
          </Pressable>
        </View>

        {/* Continue as Guest */}
        <View className="items-center mt-4 mb-6">
          <Pressable onPress={handleDismiss} hitSlop={8} className="py-2 px-4">
            <Text className="text-xs font-semibold text-text-secondary">
              Continue as Guest
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
