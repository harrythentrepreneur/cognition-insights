import { GoogleAuth } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated via Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we have service account credentials
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.log('Using Google Service Account for ephemeral tokens');
      console.log('Service account email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
      console.log('Has private key:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

      // Generate ephemeral token using Google Auth
      const auth = new GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/generative-language'],
      });

      try {
        const client = await auth.getClient();
        console.log('Got auth client');

        const accessToken = await client.getAccessToken();
        console.log('Access token generated:', !!accessToken.token);

        if (!accessToken.token) {
          throw new Error('Failed to generate access token');
        }

        // Return the ephemeral token with a 5-minute expiration
        return NextResponse.json({
          token: accessToken.token,
          expiresAt: Date.now() + 300000, // 5 minutes
          type: 'ephemeral'
        });
      } catch (authError) {
        console.error('Service account auth failed:', authError);
        console.error('Falling back to API keys...');
        throw authError; // This will trigger the catch block below
      }
    } else {
      // Fallback to using API keys directly
      console.log('⚠️ Service account not configured, falling back to API keys');

      // Try to get API keys from environment (server-side only)
      const apiKeys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4
      ].filter(Boolean);

      if (apiKeys.length === 0) {
        console.error('🔴 No Gemini API keys found in environment!');
        return NextResponse.json({
          error: 'No Gemini API credentials configured. Please add GEMINI_API_KEY to your .env file.'
        }, { status: 500 });
      }

      // Rotate through API keys to distribute load
      const keyIndex = Math.floor(Math.random() * apiKeys.length);
      const selectedKey = apiKeys[keyIndex];

      console.log(`Using API key ${keyIndex + 1} of ${apiKeys.length}`);

      // Return the API key as a "token" - the client will use it directly
      return NextResponse.json({
        token: selectedKey,
        expiresAt: Date.now() + 86400000, // 24 hours (API keys don't expire)
        type: 'api_key'
      });
    }
  } catch (error) {
    console.error('Token generation error:', error);

    // Try fallback to API keys
    console.log('Attempting fallback to API keys...');

    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4
    ].filter(Boolean);

    if (apiKeys.length > 0) {
      const keyIndex = Math.floor(Math.random() * apiKeys.length);
      const selectedKey = apiKeys[keyIndex];

      console.log(`Fallback successful: Using API key ${keyIndex + 1} of ${apiKeys.length}`);

      return NextResponse.json({
        token: selectedKey,
        expiresAt: Date.now() + 86400000, // 24 hours
        type: 'api_key'
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate token and no API keys available' },
      { status: 500 }
    );
  }
}