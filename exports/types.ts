export interface WrytesUserProfile {
  firstName:    string | null;
  lastName:     string | null;
  businessName: string | null;
  isVerified:   boolean;
}

export interface WrytesUserWallet {
  address: string;
  label:   string | null;
}

/** Shape returned by wrytes-api GET /auth/me */
export interface WrytesUser {
  id:                   string;
  telegramHandle:       string | null;
  notificationsEnabled: boolean;
  scopes:               string[];
  wallets:              WrytesUserWallet[];
  profile:              WrytesUserProfile | null;
}
