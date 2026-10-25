import type { AlertRecord, FloodReport } from "@/lib/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isCloudConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

type CloudHandlers = {
  onReports: (reports: FloodReport[]) => void;
  onAlerts: (alerts: AlertRecord[]) => void;
  onReady: () => void;
  onError: (error: Error) => void;
};

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function getDb() {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore"),
  ]);

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  try {
    return firestore.initializeFirestore(app, {
      localCache: firestore.persistentLocalCache({
        tabManager: firestore.persistentMultipleTabManager(),
      }),
    });
  } catch {
    return firestore.getFirestore(app);
  }
}

async function ensureAuth() {
  const [{ getAuth, signInAnonymously }, appModule] = await Promise.all([
    import("firebase/auth"),
    import("firebase/app"),
  ]);
  const app = appModule.getApps().length
    ? appModule.getApp()
    : appModule.initializeApp(firebaseConfig);
  const auth = getAuth(app);
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth;
}

/** Subscribes to the Firestore demo collections. Returns an unsubscribe fn. */
export async function connectCloud(
  handlers: CloudHandlers,
): Promise<() => void> {
  if (!isCloudConfigured()) return () => {};

  const firestore = await import("firebase/firestore");
  await ensureAuth();
  const db = await getDb();

  const reportsQuery = firestore.query(
    firestore.collection(db, "reports"),
    firestore.orderBy("createdAt", "desc"),
    firestore.limit(80),
  );
  const alertsQuery = firestore.query(
    firestore.collection(db, "alerts"),
    firestore.orderBy("sentAt", "desc"),
    firestore.limit(40),
  );

  const unsubscribeReports = firestore.onSnapshot(
    reportsQuery,
    (snapshot) => {
      handlers.onReady();
      handlers.onReports(
        snapshot.docs.map(
          (entry) =>
            ({
              ...entry.data(),
              id: entry.id,
            }) as FloodReport,
        ),
      );
    },
    (error) => handlers.onError(error),
  );

  const unsubscribeAlerts = firestore.onSnapshot(
    alertsQuery,
    (snapshot) => {
      handlers.onAlerts(
        snapshot.docs.map(
          (entry) =>
            ({
              ...entry.data(),
              id: entry.id,
            }) as AlertRecord,
        ),
      );
    },
    (error) => handlers.onError(error),
  );

  return () => {
    unsubscribeReports();
    unsubscribeAlerts();
  };
}

export async function pushReport(report: FloodReport): Promise<boolean> {
  if (!isCloudConfigured()) return false;
  try {
    await ensureAuth();
    const firestore = await import("firebase/firestore");
    const db = await getDb();
    const payload = clean({
      ...report,
      // Firestore documents cap at 1 MiB. In production photos go to Cloud
      // Storage and only the download URL is stored here.
      photo:
        report.photo && report.photo.length < 600_000
          ? report.photo
          : undefined,
    });
    await firestore.setDoc(
      firestore.doc(db, "reports", report.id),
      payload,
    );
    return true;
  } catch (error) {
    console.warn("[FloodAlert] Firestore report write skipped", error);
    return false;
  }
}

export async function pushReportStatus(
  id: string,
  status: FloodReport["status"],
  updatedAt: string,
): Promise<boolean> {
  if (!isCloudConfigured()) return false;
  try {
    await ensureAuth();
    const firestore = await import("firebase/firestore");
    const db = await getDb();
    await firestore.updateDoc(firestore.doc(db, "reports", id), {
      status,
      updatedAt,
    });
    return true;
  } catch (error) {
    console.warn("[FloodAlert] Firestore status write skipped", error);
    return false;
  }
}

export async function pushAlert(alert: AlertRecord): Promise<boolean> {
  if (!isCloudConfigured()) return false;
  try {
    await ensureAuth();
    const firestore = await import("firebase/firestore");
    const db = await getDb();
    await firestore.setDoc(
      firestore.doc(db, "alerts", alert.id),
      clean(alert),
    );
    return true;
  } catch (error) {
    console.warn("[FloodAlert] Firestore alert write skipped", error);
    return false;
  }
}
