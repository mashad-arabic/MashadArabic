// E-posta ile hesap açma / giriş (Firebase Authentication) ve
// profilin hesaba kaydedilmesi (Cloud Firestore: kullanicilar/{uid}).

import { firebaseConfig } from "./firebase-config.js";

const FIREBASE = "https://www.gstatic.com/firebasejs/10.14.1";

const $ = (id) => document.getElementById(id);
const ui = {
  girisBtn: $("girisBtn"), pGiris: $("pGiris"),
  misafir: $("hesapMisafir"), uye: $("hesapUye"), eposta: $("hesapEposta"),
  dogrulamaUyari: $("dogrulamaUyari"), dogrulamaTekrar: $("dogrulamaTekrar"), cikis: $("cikisBtn"),
  profilPanel: $("profilPanel"),
  panel: $("girisPanel"), kapat: $("gKapat"),
  sekmeGiris: $("sekmeGiris"), sekmeKayit: $("sekmeKayit"),
  form: $("girisForm"), adSatir: $("adSatir"), sifre2Satir: $("sifre2Satir"),
  ad: $("gAd"), gEposta: $("gEposta"), sifre: $("gSifre"), sifre2: $("gSifre2"),
  mesaj: $("gMesaj"), gonder: $("gGonder"), unuttum: $("sifremiUnuttum")
};

let kayitModu = false;
let auth = null, fb = null, db = null, fs = null;
let kullanici = null;
let yaziZamanlayici = null;

// ---------- Giriş paneli ----------
function sekmeSec(kayit) {
  kayitModu = kayit;
  ui.sekmeGiris.classList.toggle("aktif", !kayit);
  ui.sekmeKayit.classList.toggle("aktif", kayit);
  ui.adSatir.hidden = !kayit;
  ui.sifre2Satir.hidden = !kayit;
  ui.unuttum.hidden = kayit;
  ui.sifre.autocomplete = kayit ? "new-password" : "current-password";
  ui.gonder.textContent = kayit ? "Hesap aç" : "Giriş yap";
  mesaj(auth ? "" : AYAR_EKSIK);
}

const AYAR_EKSIK = "Hesap sistemi henüz ayarlanmadı: firebase-config.js dosyasına Firebase proje bilgileri girilmeli.";

function mesaj(metin, tur = "hata") {
  ui.mesaj.textContent = metin;
  ui.mesaj.className = `mesaj ${tur}`;
  ui.mesaj.hidden = !metin;
}

function paneliAc() {
  if (ui.profilPanel.open) ui.profilPanel.close();
  sekmeSec(false);
  ui.form.reset();
  ui.panel.showModal();
}

ui.girisBtn.addEventListener("click", paneliAc);
ui.pGiris.addEventListener("click", paneliAc);
ui.kapat.addEventListener("click", () => ui.panel.close());
ui.panel.addEventListener("click", (e) => { if (e.target === ui.panel) ui.panel.close(); });
ui.sekmeGiris.addEventListener("click", () => sekmeSec(false));
ui.sekmeKayit.addEventListener("click", () => sekmeSec(true));

// Firebase hata kodlarını Türkçe mesaja çevir
const HATALAR = {
  "auth/email-already-in-use": "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
  "auth/invalid-email": "E-posta adresi geçerli görünmüyor.",
  "auth/missing-email": "E-posta adresini yaz.",
  "auth/missing-password": "Şifreni yaz.",
  "auth/weak-password": "Şifre en az 6 karakter olmalı.",
  "auth/invalid-credential": "E-posta ya da şifre yanlış.",
  "auth/wrong-password": "E-posta ya da şifre yanlış.",
  "auth/user-not-found": "Bu e-posta ile bir hesap bulunamadı.",
  "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
  "auth/too-many-requests": "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.",
  "auth/network-request-failed": "İnternet bağlantısı kurulamadı.",
  "auth/operation-not-allowed": "Firebase'de E-posta/Şifre ile giriş açılmamış.",
  "auth/configuration-not-found": "Firebase'de Authentication henüz etkinleştirilmemiş."
};
const hataMetni = (h) => HATALAR[h.code] || `Bir sorun oluştu (${h.code || h.message}).`;

ui.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!auth) return;
  const eposta = ui.gEposta.value.trim();
  const sifre = ui.sifre.value;

  if (!eposta) return mesaj("E-posta adresini yaz.");
  if (sifre.length < 6) return mesaj("Şifre en az 6 karakter olmalı.");
  if (kayitModu && sifre !== ui.sifre2.value) return mesaj("Şifreler birbirini tutmuyor.");

  ui.gonder.disabled = true;
  mesaj("");
  try {
    if (kayitModu) {
      const { user } = await fb.createUserWithEmailAndPassword(auth, eposta, sifre);
      const ad = ui.ad.value.trim();
      if (ad) {
        await fb.updateProfile(user, { displayName: ad });
        Profil.adAyarla(ad);
      }
      await fb.sendEmailVerification(user);
      mesaj(`Hesabın açıldı. ${eposta} adresine bir doğrulama e-postası gönderdik.`, "basari");
      setTimeout(() => ui.panel.close(), 2200);
    } else {
      await fb.signInWithEmailAndPassword(auth, eposta, sifre);
      ui.panel.close();
    }
  } catch (h) {
    mesaj(hataMetni(h));
  } finally {
    ui.gonder.disabled = false;
  }
});

ui.unuttum.addEventListener("click", async () => {
  if (!auth) return;
  const eposta = ui.gEposta.value.trim();
  if (!eposta) return mesaj("Önce e-posta adresini yaz, sonra \"Şifremi unuttum\"a bas.");
  try {
    await fb.sendPasswordResetEmail(auth, eposta);
    mesaj(`${eposta} adresine şifre sıfırlama bağlantısı gönderildi.`, "basari");
  } catch (h) {
    mesaj(hataMetni(h));
  }
});

ui.dogrulamaTekrar.addEventListener("click", async () => {
  if (!kullanici) return;
  try {
    await fb.sendEmailVerification(kullanici);
    ui.dogrulamaTekrar.textContent = "Gönderildi ✓";
    ui.dogrulamaTekrar.disabled = true;
  } catch (h) {
    alert(hataMetni(h));
  }
});

ui.cikis.addEventListener("click", async () => {
  if (!auth) return;
  await profiliYaz(); // bekleyen değişiklikleri kaybetme
  await fb.signOut(auth);
  ui.profilPanel.close();
});

// Profil açılınca doğrulama durumunu tazele (e-postadaki bağlantıya tıklandıysa uyarı kalksın)
$("profilBtn").addEventListener("click", async () => {
  if (!kullanici || kullanici.emailVerified) return;
  try { await kullanici.reload(); kullanici = auth.currentUser; durumGoster(); } catch {}
});

// ---------- Hesap durumunu ekrana yansıt ----------
function durumGoster() {
  const girisli = !!kullanici;
  ui.girisBtn.hidden = girisli;
  ui.misafir.hidden = girisli;
  ui.uye.hidden = !girisli;
  if (girisli) {
    ui.eposta.textContent = kullanici.email;
    ui.dogrulamaUyari.hidden = kullanici.emailVerified;
  }
}

// ---------- Profili hesapla eşitle ----------
const profilBelgesi = () => fs.doc(db, "kullanicilar", kullanici.uid);

async function profiliYaz() {
  clearTimeout(yaziZamanlayici);
  if (!kullanici || !db) return;
  try {
    await fs.setDoc(profilBelgesi(), { profil: Profil.veri(), guncellendi: fs.serverTimestamp() });
  } catch (h) {
    console.warn("Profil hesaba kaydedilemedi:", h);
  }
}

// Sık yazmamak için değişiklikleri 1,5 sn biriktirip tek seferde yaz
Profil.degisince(() => {
  if (!kullanici) return;
  clearTimeout(yaziZamanlayici);
  yaziZamanlayici = setTimeout(profiliYaz, 1500);
});

async function girisYapildi() {
  try {
    const belge = await fs.getDoc(profilBelgesi());
    if (belge.exists() && belge.data().profil) {
      // Hesapta kayıtlı profil varsa onu kullan
      Profil.yerlestir(belge.data().profil);
    } else {
      // Yeni hesap: misafirken toplanan puanlar hesaba aktarılır
      if (kullanici.displayName) Profil.adAyarla(kullanici.displayName);
      await profiliYaz();
    }
  } catch (h) {
    console.warn("Profil hesaptan okunamadı:", h);
  }
}

// ---------- Firebase'i başlat ----------
async function baslat() {
  if (!firebaseConfig.apiKey) {
    console.info("VoArabic: firebase-config.js boş; hesap sistemi kapalı, oyun misafir modunda.");
    ui.girisBtn.hidden = false;
    ui.misafir.hidden = false;
    return;
  }
  const [app, authMod, fsMod] = await Promise.all([
    import(`${FIREBASE}/firebase-app.js`),
    import(`${FIREBASE}/firebase-auth.js`),
    import(`${FIREBASE}/firebase-firestore.js`)
  ]);
  const uygulama = app.initializeApp(firebaseConfig);
  fb = authMod;
  fs = fsMod;
  auth = authMod.getAuth(uygulama);
  auth.languageCode = "tr"; // doğrulama/sıfırlama e-postaları Türkçe gelsin
  db = fsMod.getFirestore(uygulama);

  let ilkDurum = true;
  authMod.onAuthStateChanged(auth, async (u) => {
    const oncekiKullanici = kullanici;
    kullanici = u;
    durumGoster();
    if (u) {
      await girisYapildi();
    } else if (oncekiKullanici || !ilkDurum) {
      // Çıkış yapıldı: bu tarayıcıda boş misafir profiliyle devam et
      Profil.temizle();
    }
    ilkDurum = false;
  });
}

baslat().catch((h) => {
  console.error("Firebase başlatılamadı:", h);
  ui.girisBtn.hidden = false;
  ui.misafir.hidden = false;
});

// Sayfa kapanırken bekleyen değişiklik varsa yazmayı dene
window.addEventListener("pagehide", () => { if (yaziZamanlayici) profiliYaz(); });
