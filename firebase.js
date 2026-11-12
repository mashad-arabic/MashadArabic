// Firebase'i bir kez başlatan ortak modül (oyun sayfası ve yönetim sayfası kullanır).

import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.14.1";

// Firebase ayarlı değilse null döner.
export const firebaseHazir = (async () => {
  if (!firebaseConfig.apiKey) return null;
  const [app, fb, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  const uygulama = app.initializeApp(firebaseConfig);
  const auth = fb.getAuth(uygulama);
  auth.languageCode = "tr"; // doğrulama/sıfırlama e-postaları Türkçe gelsin
  const db = fs.getFirestore(uygulama);
  return { app: uygulama, auth, db, fb, fs };
})();

// Firebase Storage (yalnızca yönetim panelinde, video dosyası yüklerken gerekir)
let depoSozu = null;
export function depoHazir(f) {
  depoSozu ??= import(`${SDK}/firebase-storage.js`).then((st) => ({ st, depo: st.getStorage(f.app) }));
  return depoSozu;
}

// Kullanıcı yönetici mi? (yoneticiler/{uid} belgesi varsa evet.
// Bu belgeyi yalnızca Firebase konsolundan eklemek mümkün.)
export async function yoneticiMi(f, kullanici) {
  if (!kullanici) return false;
  try {
    const belge = await f.fs.getDoc(f.fs.doc(f.db, "yoneticiler", kullanici.uid));
    return belge.exists();
  } catch {
    return false;
  }
}

// Firestore'daki klipleri eklenme sırasıyla getir
export async function klipleriGetir(f) {
  const sorgu = f.fs.query(f.fs.collection(f.db, "klipler"), f.fs.orderBy("olusturuldu"));
  const sonuc = await f.fs.getDocs(sorgu);
  return sonuc.docs.map((d) => ({ id: d.id, ...d.data() }));
}
