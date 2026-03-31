import NDK from '@nostr-dev-kit/ndk';
import { DEFAULT_RELAYS } from './constants';

let ndkInstance: NDK | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
      autoConnectUserRelays: true,
  
    });
  }
  return ndkInstance;
}

export async function connectNDK(): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect();
  return ndk;
}
