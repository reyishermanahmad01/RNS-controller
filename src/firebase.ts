import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AccentTheme,
  AppCustomization,
  HomeSectionId,
  RemoteAppRelease,
  RgbMode,
} from './types/controller';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_OWNER_EMAIL = 'reyishermanahmad@gmail.com';
const LATEST_RELEASE_PATH = 'appReleases/latest';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export function isCloudAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified) return false;
  return (user.email || '').toLowerCase() === ADMIN_OWNER_EMAIL;
}

export async function signInCloudAdmin(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutCloudAdmin(): Promise<void> {
  await signOut(auth);
}

export function subscribeCloudAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

const VALID_ACCENTS: AccentTheme[] = ['cyan', 'magenta', 'crimson', 'amber', 'emerald'];
const VALID_SECTIONS: HomeSectionId[] = ['quick-controls', 'sliders'];

function sanitizeModeObject(mode: RgbMode): Record<string, string | number | boolean> {
  return {
    id: Number(mode.id),
    code: String(mode.code || `Mode ${String(mode.id).padStart(3, '0')}`).slice(0, 64),
    name: String(mode.name || 'Custom Mode').slice(0, 200),
    category: String(mode.category || 'Custom').slice(0, 64),
    description: String(mode.description || '').slice(0, 1000),
    primaryColor: String(mode.primaryColor || '#22D3EE').slice(0, 24),
    secondaryColor: String(mode.secondaryColor || '#EC4899').slice(0, 24),
    pattern: String(mode.pattern || 'aurora-dual').slice(0, 48),
    eyeBehavior: String(mode.eyeBehavior || 'look-around').slice(0, 32),
    isCustom: Boolean(mode.isCustom ?? true),
  };
}

function parseReleaseDoc(raw: Record<string, unknown>): RemoteAppRelease | null {
  if (typeof raw.version !== 'number') return null;

  const accent = VALID_ACCENTS.includes(raw.accentTheme as AccentTheme)
    ? (raw.accentTheme as AccentTheme)
    : 'cyan';

  const rawOrder = Array.isArray(raw.sectionOrder) ? raw.sectionOrder : VALID_SECTIONS;
  const sectionOrder = rawOrder.filter((s): s is HomeSectionId =>
    VALID_SECTIONS.includes(s as HomeSectionId)
  );

  const customModes: RgbMode[] = Array.isArray(raw.customModes)
    ? (raw.customModes as RgbMode[]).filter((m) => m && typeof m.id === 'number')
    : [];

  const modeOverrides: Record<number, Partial<RgbMode>> = {};
  if (Array.isArray(raw.modeOverridesList)) {
    for (const item of raw.modeOverridesList) {
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'number') {
        const { id, ...rest } = item as { id: number } & Partial<RgbMode>;
        modeOverrides[id] = rest;
      }
    }
  }

  let uiExt: Partial<AppCustomization> = {};
  if (typeof raw.uiConfigJson === 'string' && raw.uiConfigJson.length > 0) {
    try {
      const parsedExt = JSON.parse(raw.uiConfigJson);
      if (parsedExt && typeof parsedExt === 'object') {
        uiExt = parsedExt as Partial<AppCustomization>;
      }
    } catch {
      // Ignore malformed uiConfigJson
    }
  }

  return {
    version: raw.version,
    versionLabel:
      typeof raw.versionLabel === 'string' && raw.versionLabel ? raw.versionLabel : `v1.${raw.version}`,
    releaseNotes: typeof raw.releaseNotes === 'string' ? raw.releaseNotes : '',
    updatedByUid: typeof raw.updatedByUid === 'string' ? raw.updatedByUid : '',
    customization: {
      ...uiExt,
      appName:
        typeof raw.appName === 'string' && raw.appName.trim()
          ? raw.appName
          : 'RNS Controller',
      accentTheme: accent,
      sectionOrder: sectionOrder.length > 0 ? sectionOrder : VALID_SECTIONS,
      showWelcomeBtn: typeof raw.showWelcomeBtn === 'boolean' ? raw.showWelcomeBtn : true,
      showSeinBtn: typeof raw.showSeinBtn === 'boolean' ? raw.showSeinBtn : true,
      showBrakeBtn: typeof raw.showBrakeBtn === 'boolean' ? raw.showBrakeBtn : true,
      showComboBtn: typeof raw.showComboBtn === 'boolean' ? raw.showComboBtn : true,
      customModes,
      modeOverrides,
    },
  };
}

export function subscribeToLatestRelease(
  onRelease: (release: RemoteAppRelease | null) => void,
  onSyncError?: (error: Error) => void
): () => void {
  const releaseRef = doc(db, 'appReleases', 'latest');
  return onSnapshot(
    releaseRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onRelease(null);
        return;
      }
      const parsed = parseReleaseDoc(snapshot.data() as Record<string, unknown>);
      onRelease(parsed);
    },
    (error) => {
      if (
        error.code === 'permission-denied' ||
        error.message.includes('Missing or insufficient permissions')
      ) {
        try {
          handleFirestoreError(error, OperationType.GET, LATEST_RELEASE_PATH);
        } catch (wrapped) {
          onSyncError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      } else {
        onSyncError?.(error);
      }
    }
  );
}

export interface PublishReleaseInput {
  nextVersion: number;
  versionLabel: string;
  releaseNotes: string;
  customization: AppCustomization;
}

export async function publishRemoteRelease(input: PublishReleaseInput): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Silakan login menggunakan akun Google Admin terlebih dahulu.');
  }
  if (!isCloudAdminUser(user)) {
    throw new Error(`Hanya akun Admin (${ADMIN_OWNER_EMAIL}) yang dapat menerbitkan update jarak jauh.`);
  }

  const trimmedName = (input.customization.appName || 'RNS Controller').trim().slice(0, 500);
  const versionLabel = (input.versionLabel || `v1.${input.nextVersion}`).trim().slice(0, 128);
  const releaseNotes = (input.releaseNotes || '').trim().slice(0, 5000);
  const accentTheme = VALID_ACCENTS.includes(input.customization.accentTheme)
    ? input.customization.accentTheme
    : 'cyan';
  const sectionOrder = input.customization.sectionOrder.filter((s) =>
    VALID_SECTIONS.includes(s)
  );

  const customModes = input.customization.customModes.slice(0, 500).map(sanitizeModeObject);

  const modeOverridesList = Object.entries(input.customization.modeOverrides)
    .slice(0, 500)
    .map(([idStr, patch]) => {
      const cleanPatch: Record<string, string | number | boolean> = { id: Number(idStr) };
      if (typeof patch.name === 'string') cleanPatch.name = patch.name.slice(0, 200);
      if (typeof patch.primaryColor === 'string') cleanPatch.primaryColor = patch.primaryColor.slice(0, 24);
      if (typeof patch.secondaryColor === 'string') cleanPatch.secondaryColor = patch.secondaryColor.slice(0, 24);
      if (typeof patch.eyeBehavior === 'string') cleanPatch.eyeBehavior = patch.eyeBehavior.slice(0, 32);
      if (typeof patch.pattern === 'string') cleanPatch.pattern = patch.pattern.slice(0, 48);
      if (typeof patch.category === 'string') cleanPatch.category = patch.category.slice(0, 64);
      return cleanPatch;
    });

  const c = input.customization;
  const uiExt: Partial<AppCustomization> = {
    customAccentHex: c.customAccentHex || '',
    backgroundMode: c.backgroundMode,
    backgroundColor: c.backgroundColor,
    backgroundGradientStart: c.backgroundGradientStart,
    backgroundGradientMid: c.backgroundGradientMid,
    backgroundGradientEnd: c.backgroundGradientEnd,
    backgroundGradientAngle: c.backgroundGradientAngle,
    backgroundPattern: c.backgroundPattern,
    backgroundImageUrl: c.backgroundImageUrl,
    backgroundOverlayOpacity: c.backgroundOverlayOpacity,
    backgroundBlur: c.backgroundBlur,
    cardStyle: c.cardStyle,
    cardRadius: c.cardRadius,
    cardBgColor: c.cardBgColor,
    customCardRadiusPx: c.customCardRadiusPx,
    cardOpacity: c.cardOpacity,
    cardBlurPx: c.cardBlurPx,
    cardBorderWidth: c.cardBorderWidth,
    borderColor: c.borderColor,
    textColor: c.textColor,
    mutedTextColor: c.mutedTextColor,
    headerBgColor: c.headerBgColor,
    navBgColor: c.navBgColor,
    fontFamily: c.fontFamily,
    fontScale: c.fontScale,
    logoPreset: c.logoPreset,
    customLogoUrl: c.customLogoUrl,
    navOrder: c.navOrder,
    navLabels: c.navLabels,
    navIcons: c.navIcons,
    quickIcons: c.quickIcons,
    quickLabels: c.quickLabels,
    visualizerTitle: c.visualizerTitle,
    visualizerSubtitle: c.visualizerSubtitle,
    hiddenTabs: c.hiddenTabs,
    customerUnlockedTabs: c.customerUnlockedTabs,
    customCss: c.customCss,
    leftBlockOrder: c.leftBlockOrder,
    homeBlockOrder: c.homeBlockOrder,
    quickControlsPlacement: c.quickControlsPlacement,
    showStatusBar: c.showStatusBar,
    showModeCollector: c.showModeCollector,
    showSlidersCard: c.showSlidersCard,
    showWelcomeCard: c.showWelcomeCard,
    showStayWheelCard: c.showStayWheelCard,
    showCustomBanner: c.showCustomBanner,
    customBannerText: c.customBannerText,
    footerText: c.footerText,
    customMatrixModels: c.customMatrixModels,
    builtInPresets: c.builtInPresets,
  };
  let uiConfigJson = JSON.stringify(uiExt);
  if (uiConfigJson.length > 880000) {
    uiConfigJson = JSON.stringify({ ...uiExt, backgroundImageUrl: '' });
  }
  if (uiConfigJson.length > 880000) {
    uiConfigJson = JSON.stringify({ ...uiExt, backgroundImageUrl: '', customLogoUrl: '' });
  }

  const payload = {
    version: Math.max(1, Math.min(1000000, Math.floor(input.nextVersion))),
    versionLabel: versionLabel || 'v1.1',
    releaseNotes,
    appName: trimmedName || 'RNS Controller',
    accentTheme,
    sectionOrder: sectionOrder.length > 0 ? sectionOrder : VALID_SECTIONS,
    showWelcomeBtn: Boolean(input.customization.showWelcomeBtn),
    showSeinBtn: Boolean(input.customization.showSeinBtn),
    showBrakeBtn: Boolean(input.customization.showBrakeBtn),
    showComboBtn: Boolean(input.customization.showComboBtn),
    customModes,
    modeOverridesList,
    uiConfigJson,
    updatedByUid: user.uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'appReleases', 'latest'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LATEST_RELEASE_PATH);
  }
}
