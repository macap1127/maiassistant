import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

const PUBLIC_ORIGIN = 'https://miafamilyassistant.com';

/**
 * Sign in with Apple.
 *
 * - iOS native: uses the native system sheet via @capacitor-community/apple-sign-in,
 *   then exchanges the Apple identity token with Supabase via signInWithIdToken.
 * - Web / Android: uses Lovable Cloud managed OAuth redirect. Native Android uses the
 *   public web origin because `window.location.origin` in a WebView is localhost and
 *   is not a valid Apple OAuth redirect URL.
 */
export async function signInWithApple(inviteCode: string | null): Promise<void> {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  if (platform === 'ios') {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    const res = await SignInWithApple.authorize({
      clientId: 'com.aiblueribbon.mia',
      redirectURI: `${PUBLIC_ORIGIN}/auth`,
      scopes: 'name email',
    });
    const identityToken = res.response?.identityToken;
    if (!identityToken) {
      throw new Error('Apple sign-in did not return an identity token.');
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });
    if (error) throw error;
    return;
  }

  const origin = isNative ? PUBLIC_ORIGIN : window.location.origin;
  const redirect = inviteCode ? `${origin}/invite/${inviteCode}` : `${origin}/`;
  const result = await lovable.auth.signInWithOAuth('apple', {
    redirect_uri: redirect,
  });
  if (result.error) {
    throw new Error(result.error.message || 'Apple sign-in failed');
  }
}
