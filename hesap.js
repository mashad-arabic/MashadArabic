// Hesap: e-posta ile giriş / hesap açma (Firebase Authentication),
// profilin hesaba kaydedilmesi (Firestore: kullanicilar/{uid}) ve
// kliplerin Firestore'dan yüklenmesi.
// Hem oyun sayfasında hem profil sayfasında çalışır; sayfada olmayan
// öğeler (ör. giriş formu) atlanır.

import { firebaseHazir, yoneticiMi, klipleriGetir } from "./firebase.js";

const $ = (id) => document.getElementById(id);
const ui = {
  misafir: $("hesapMisafir"), uye: $("hesapUye"), eposta: $("hesapEposta"),
  dogrulamaUyari: $("dogrulamaUyari"), dogrulamaTekrar: $("dogrulamaTekrar"),
  cikis: $("cikisBtn"), yonetimLink: $("yonetimLink"), pDurum: $("pDurum"),
  sekmeGiris: $("sekmeGiris"), sekmeKayit: $("sekmeKayit"),
  form: $("girisForm"), sifre2Satir: $("sifre2Satir"),
  gEposta: $("gEposta"), sifre: $("gSifre"), sifre2: $("gSifre2"),
  mesaj: $("gMesaj"), gonder: $("gGonder"), unuttum: $("sifremiUnuttum")
};

const AYAR_EKSIK = "Hesap sistemi henüz ayarlanmadı: firebase-config.js dosyasına Firebase proje bilgileri girilmeli.";

let f = null;            // Firebase (auth, db, fb, fs)
let kullanici = null;
let kayitModu = false;
let yaziZamanlayici = null;

// ---------- Giriş / kayıt formu (yalnızca profil sayfasında) ----------
function mesaj(metin, tur = "hata") {
  if (!ui.mesaj) return;
  ui.mesaj.textContent = metin;
  ui.mesaj.className = `mesaj ${tur}`;
  ui.mesaj.hidden = !metin;
}

function sekmeSec(kayit) {
  kayitModu = kayit;
  ui.sekmeGiris.classList.toggle("aktif", !kayit);
  ui.sekmeKayit.classList.toggle("aktif", kayit);
  ui.sifre2Satir.hidden = !kayit;
  ui.unuttum.hidden = kayit;
  ui.sifre.autocomplete = kayit ? "new-password" : "current-password";
  ui.gonder.textContent = kayit ? "Hesap aç" : "Giriş yap";
  mesaj(f ? "" : AYAR_EKSIK);
}

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

if (ui.form) {
  ui.sekmeGiris.addEventListener("click", () => sekmeSec(false));
  ui.sekmeKayit.addEventListener("click", () => sekmeSec(true));

  ui.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!f) return mesaj(AYAR_EKSIK);
    const eposta = ui.gEposta.value.trim();
    const sifre = ui.sifre.value;

    if (!eposta) return mesaj("E-posta adresini yaz.");
    if (sifre.length < 6) return mesaj("Şifre en az 6 karakter olmalı.");
    if (kayitModu && sifre !== ui.sifre2.value) return mesaj("Şifreler birbirini tutmuyor.");

    ui.gonder.disabled = true;
    mesaj("");
    try {
      if (kayitModu) {
        const { user } = await f.fb.createUserWithEmailAndPassword(f.auth, eposta, sifre);
        await f.fb.sendEmailVerification(user);
        mesaj(`Hesabın açıldı. ${eposta} adresine bir doğrulama e-postası gönderdik.`, "basari");
      } else {
        await f.fb.signInWithEmailAndPassword(f.auth, eposta, sifre);
      }
      ui.form.reset();
    } catch (h) {
      mesaj(hataMetni(h));
    } finally {
      ui.gonder.disabled = false;
    }
  });

  ui.unuttum.addEventListener("click", async () => {
    if (!f) return mesaj(AYAR_EKSIK);
    const eposta = ui.gEposta.value.trim();
    if (!eposta) return mesaj("Önce e-posta adresini yaz, sonra \"Şifremi unuttum\"a bas.");
    try {
      await f.fb.sendPasswordResetEmail(f.auth, eposta);
      mesaj(`${eposta} adresine şifre sıfırlama bağlantısı gönderildi.`, "basari");
    } catch (h) {
      mesaj(hataMetni(h));
    }
  });
}

ui.dogrulamaTekrar?.addEventListener("click", async () => {
  if (!kullanici) return;
  try {
    await f.fb.sendEmailVerification(kullanici);
    ui.dogrulamaTekrar.textContent = "Gönderildi ✓";
    ui.dogrulamaTekrar.disabled = true;
  } catch (h) {
    alert(hataMetni(h));
  }
});

ui.cikis?.addEventListener("click", async () => {
  if (!f) return;
  await profiliYaz(); // bekleyen değişiklikleri kaybetme
  await f.fb.signOut(f.auth);
});

// ---------- Hesap durumunu ekrana yansıt ----------
function durumGoster() {
  const girisli = !!kullanici;
  $("hesapYukleniyor")?.remove();
  if (ui.misafir) ui.misafir.hidden = girisli;
  if (ui.uye) ui.uye.hidden = !girisli;
  if (ui.pDurum) ui.pDurum.textContent = girisli ? kullanici.email : "Misafir";
  if (girisli && ui.eposta) {
    ui.eposta.textContent = kullanici.email;
    ui.dogrulamaUyari.hidden = kullanici.emailVerified;
  }
}

// ---------- Profili hesapla eşitle ----------
const profilBelgesi = () => f.fs.doc(f.db, "kullanicilar", kullanici.uid);

async function profiliYaz() {
  clearTimeout(yaziZamanlayici);
  yaziZamanlayici = null;
  if (!kullanici || !f) return;
  try {
    // E-posta, yönetim sayfasındaki kullanıcı listesinde görünsün diye de yazılır
    await f.fs.setDoc(profilBelgesi(), {
      profil: Profil.veri(),
      eposta: kullanici.email,
      guncellendi: f.fs.serverTimestamp()
    });
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
    const belge = await f.fs.getDoc(profilBelgesi());
    const bulut = belge.exists() ? belge.data().profil : null;
    const yerel = Profil.veri();

    if (yerel.sahip === kullanici.uid) {
      // Bu tarayıcıdaki veri zaten bu hesabın: hangisi yeniyse o geçerli
      if (bulut && (bulut.zaman || 0) > (yerel.zaman || 0)) Profil.yerlestir(bulut);
      else await profiliYaz();
    } else if (bulut) {
      // Var olan hesaba girildi: hesaptaki profil geçerli
      Profil.yerlestir({ ...bulut, sahip: kullanici.uid });
    } else {
      // Yeni hesap: misafirken toplanan puanlar hesaba aktarılır
      Profil.sahipAyarla(kullanici.uid);
      await profiliYaz();
    }
  } catch (h) {
    console.warn("Profil hesaptan okunamadı:", h);
  }
}

// ---------- Klipler (yalnızca oyun sayfası dinler) ----------
// Firestore'da klip varsa oyun onları kullanır; yoksa data.js'deki örnekler kalır.
function klipleriBildir(liste) {
  document.dispatchEvent(new CustomEvent("klipler-hazir", { detail: liste }));
}

// ---------- Başlat ----------
async function baslat() {
  f = await firebaseHazir;
  if (!f) {
    console.info("MashadArabic: firebase-config.js boş; hesap sistemi kapalı, misafir modu.");
    durumGoster();
    if (ui.form) sekmeSec(false);
    klipleriBildir(null);
    return;
  }

  if (typeof KLIPLER !== "undefined") {
    klipleriGetir(f)
      .then((liste) => klipleriBildir(liste))
      .catch((h) => { console.warn("Klipler Firestore'dan okunamadı:", h); klipleriBildir(null); });
  }

  let ilkDurum = true;
  if (ui.form) sekmeSec(false);
  f.fb.onAuthStateChanged(f.auth, async (u) => {
    const oncekiKullanici = kullanici;
    kullanici = u;
    durumGoster();
    if (ui.yonetimLink) ui.yonetimLink.hidden = true;
    if (u) {
      // E-postadaki doğrulama bağlantısına tıklandıysa durumu tazele
      if (!u.emailVerified) {
        try { await u.reload(); kullanici = f.auth.currentUser; durumGoster(); } catch {}
      }
      await girisYapildi();
      if (ui.yonetimLink) ui.yonetimLink.hidden = !(await yoneticiMi(f, u));
    } else if (oncekiKullanici || !ilkDurum) {
      // Çıkış yapıldı: bu tarayıcıda boş misafir profiliyle devam et
      Profil.temizle();
    }
    ilkDurum = false;
  });
}

baslat().catch((h) => {
  console.error("Firebase başlatılamadı:", h);
  durumGoster();
  klipleriBildir(null);
});

// Sayfa kapanırken (ör. profil sayfasına geçerken) bekleyen değişiklik varsa yaz
window.addEventListener("pagehide", () => { if (yaziZamanlayici) profiliYaz(); });
