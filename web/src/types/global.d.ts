interface Window {
  nostr?: {
    getPublicKey: () => Promise<string>;
    signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>>;
    nip44?: {
      encrypt: (pubkey: string, plaintext: string) => Promise<string>;
      decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
    };
  };
}
