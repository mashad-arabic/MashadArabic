// Yönetim sayfası: yalnızca yönetici hesapları kullanabilir.
// Klip ekleme/düzenleme/silme (YouTube, Google Drive / Dropbox / doğrudan video bağlantısı
// ya da Firebase Storage'a dosya yükleme) ve öğrenci listesi.
// Asıl güvenlik Firestore ve Storage kurallarında (firestore.rules, storage.rules); bu sayfa sadece arayüz.

import { firebaseHazir, yoneticiMi, klipleriGetir, depoHazir } from "./firebase.js";

const $ = (id) => document.getElementById(id);
const ui = {
  durum: $("durum"), icerik: $("icerik"), kim: $("kim"),
  ozKlip: $("ozKlip"), ozVideo: $("ozVideo"), ozYoutube: $("ozYoutube"), ozKullanici: $("ozKullanici"),
  sekmeKlipler: $("sekmeKlipler"), sekmeKullanicilar: $("sekmeKullanicilar"),
  bolumKlipler: $("bolumKlipler"), bolumKullanicilar: $("bolumKullanicilar"),
  form: $("klipForm"), formBaslik: $("formBaslik"),
  kaynakBaglanti: $("kaynakBaglanti"), kaynakDosya: $("kaynakDosya"),
  baglantiAlani: $("baglantiAlani"), dosyaAlani: $("dosyaAlani"),
  baglanti: $("fBaglanti"), baglantiTur: $("baglantiTur"),
  dosya: $("fDosya"), dosyaBirak: $("dosyaBirak"), dosyaAd: $("dosyaAd"),
  ilerleme: $("ilerleme"), ilerlemeCubuk: $("ilerlemeCubuk"), ilerlemeYazi: $("ilerlemeYazi"),
  onizlemeVideo: $("onizlemeVideo"), onizlemeBos: $("onizlemeBos"),
  start: $("fStart"), end: $("fEnd"),
  arapca: $("fArapca"), dogru: $("fDogru"), yanlis: $("fYanlis"),
  formMesaj: $("formMesaj"), kaydet: $("kaydetBtn"), vazgec: $("vazgecBtn"),
  onizle: $("onizleBtn"), baslangicYap: $("baslangicYap"), bitisYap: $("bitisYap"),
  klipTablo: $("klipTablo"), klipSayisi: $("klipSayisi"), klipAra: $("klipAra"), iceAktar: $("iceAktarBtn"),
  kullaniciTablo: $("kullaniciTablo"), kullaniciSayisi: $("kullaniciSayisi"), yenile: $("yenileBtn")
};

const EN_BUYUK_DOSYA = 200 * 1024 * 1024; // storage.rules ile aynı sınır
const BAGLANTI_IPUCU = ui.baglantiTur.textContent;

let f = null;             // Firebase
let klipler = [];
let duzenlenen = null;    // düzenlenen klip (yeni klipte null)
let kaynakModu = "baglanti"; // "baglanti" | "dosya"
let seciliDosya = null;   // yüklenmek üzere seçilen dosya
let dosyaAdresi = null;   // seçilen dosyanın önizleme adresi (blob:)
let ytOynatici = null;
let onizlemeTur = null;   // "yt" | "video" | null

// ---------- Giriş ve yetki ----------
function durumYaz(metin) {
  ui.durum.textContent = metin;
  ui.durum.hidden = false;
  ui.icerik.hidden = true;
}

(async () => {
  try {
    f = await firebaseHazir;
  } catch (h) {
    return durumYaz("Firebase yüklenemedi: " + h.message);
  }
  if (!f) return durumYaz("Firebase ayarlı değil (firebase-config.js boş).");

  f.fb.onAuthStateChanged(f.auth, async (u) => {
    if (!u) return durumYaz("Bu sayfayı kullanmak için önce profil sayfasından yönetici hesabıyla giriş yap.");
    if (!(await yoneticiMi(f, u))) return durumYaz(`${u.email} bir yönetici hesabı değil. Bu sayfayı yalnızca yöneticiler kullanabilir.`);

    ui.kim.textContent = u.email;
    ui.durum.hidden = true;
    ui.icerik.hidden = false;
    klipleriYukle();
    kullaniciSayisiniYukle();
  });
})();

// ---------- Sekmeler ----------
function sekmeSec(kullanicilar) {
  ui.sekmeKlipler.classList.toggle("aktif", !kullanicilar);
  ui.sekmeKullanicilar.classList.toggle("aktif", kullanicilar);
  ui.bolumKlipler.hidden = kullanicilar;
  ui.bolumKullanicilar.hidden = !kullanicilar;
  if (kullanicilar) kullanicilariYukle();
}
ui.sekmeKlipler.addEventListener("click", () => sekmeSec(false));
ui.sekmeKullanicilar.addEventListener("click", () => sekmeSec(true));

// ---------- Yardımcılar ----------
function hucre(metin, sinif) {
  const td = document.createElement("td");
  td.textContent = metin;
  if (sinif) td.className = sinif;
  return td;
}

function dugme(metin, sinif, tik) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = sinif;
  b.textContent = metin;
  b.addEventListener("click", tik);
  return b;
}

function bosSatir(tablo, sutun, metin) {
  const tr = document.createElement("tr");
  const td = hucre(metin, "bos-hucre");
  td.colSpan = sutun;
  tr.append(td);
  tablo.replaceChildren(tr);
}

const sn = (x) => Number(x).toFixed(2).replace(/\.?0+$/, "");

function formMesaj(metin, tur = "hata") {
  ui.formMesaj.textContent = metin;
  ui.formMesaj.className = `mesaj ${tur}`;
  ui.formMesaj.hidden = !metin;
}

function boyutYaz(bayt) {
  return bayt > 1024 * 1024 ? `${(bayt / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bayt / 1024)} KB`;
}

// Klibin kaynağını kısa adla yaz
function kaynakAdi(k) {
  return k.video ? VideoKaynak.neredenAd(k.nereden) : "YouTube";
}

// ---------- Video kaynağı: bağlantı ya da dosya ----------
function kaynakModuSec(mod) {
  kaynakModu = mod;
  ui.kaynakBaglanti.classList.toggle("aktif", mod === "baglanti");
  ui.kaynakDosya.classList.toggle("aktif", mod === "dosya");
  ui.baglantiAlani.hidden = mod !== "baglanti";
  ui.dosyaAlani.hidden = mod !== "dosya";
  onizlemeyiKapat();
}
ui.kaynakBaglanti.addEventListener("click", () => kaynakModuSec("baglanti"));
ui.kaynakDosya.addEventListener("click", () => kaynakModuSec("dosya"));

// Bağlantı yazıldıkça türünü tanıyıp göster
function baglantiTanit() {
  const metin = ui.baglanti.value.trim();
  const c = VideoKaynak.coz(metin);
  ui.baglantiTur.classList.toggle("tanindi", !!c);
  ui.baglantiTur.classList.toggle("taninmadi", !!metin && !c);
  if (!metin) ui.baglantiTur.textContent = BAGLANTI_IPUCU;
  else if (!c) ui.baglantiTur.textContent = "Bu bağlantı tanınmadı. https:// ile başlayan bir video, Google Drive ya da YouTube bağlantısı gir.";
  else if (c.tur === "youtube") ui.baglantiTur.textContent = "YouTube videosu tanındı.";
  else if (c.nereden === "drive") ui.baglantiTur.textContent = "Google Drive dosyası tanındı. Dosya \"Bağlantıya sahip olan herkes\" ile paylaşılmış olmalı.";
  else if (c.nereden === "dropbox") ui.baglantiTur.textContent = "Dropbox dosyası tanındı.";
  else ui.baglantiTur.textContent = "Video bağlantısı tanındı (.mp4 ya da .webm olmalı).";
}
ui.baglanti.addEventListener("input", baglantiTanit);

function dosyaSec(dosya) {
  if (!dosya) return;
  if (!dosya.type.startsWith("video/")) return formMesaj("Seçilen dosya bir video değil. MP4 ya da WebM dosyası seç.");
  if (dosya.size > EN_BUYUK_DOSYA) return formMesaj(`Dosya çok büyük (${boyutYaz(dosya.size)}). En fazla 200 MB olabilir.`);
  formMesaj("");
  seciliDosya = dosya;
  if (dosyaAdresi) URL.revokeObjectURL(dosyaAdresi);
  dosyaAdresi = URL.createObjectURL(dosya);
  ui.dosyaAd.textContent = `${dosya.name} · ${boyutYaz(dosya.size)}`;
  ui.dosyaBirak.classList.add("secildi");
  videoOnizle(dosyaAdresi, true);
}
ui.dosya.addEventListener("change", () => dosyaSec(ui.dosya.files[0]));

// Sürükle-bırak
["dragenter", "dragover"].forEach((olay) => ui.dosyaBirak.addEventListener(olay, (e) => {
  e.preventDefault();
  ui.dosyaBirak.classList.add("uzerinde");
}));
["dragleave", "drop"].forEach((olay) => ui.dosyaBirak.addEventListener(olay, () => ui.dosyaBirak.classList.remove("uzerinde")));
ui.dosyaBirak.addEventListener("drop", (e) => {
  e.preventDefault();
  dosyaSec(e.dataTransfer.files[0]);
});

function ilerlemeGoster(oran, yazi) {
  ui.ilerleme.hidden = oran === null;
  if (oran === null) return;
  ui.ilerlemeCubuk.style.width = `${Math.round(oran * 100)}%`;
  ui.ilerlemeYazi.textContent = yazi;
}

// ---------- Önizleme ----------
function onizlemeGorunumu(tur) {
  onizlemeTur = tur;
  const ytAlan = $("onizleme"); // YouTube oynatıcısı bu öğeyi iframe ile değiştirir, kimlik aynı kalır
  ytAlan.hidden = tur !== "yt";
  ui.onizlemeVideo.hidden = tur !== "video";
  ui.onizlemeBos.hidden = !!tur;
}

function onizlemeyiKapat() {
  ui.onizlemeVideo.pause();
  if (ytOynatici && ytOynatici.pauseVideo) ytOynatici.pauseVideo();
  onizlemeGorunumu(null);
}

function videoOnizle(adres, aralikDoldur = false) {
  if (ytOynatici && ytOynatici.pauseVideo) ytOynatici.pauseVideo();
  onizlemeGorunumu("video");
  const v = ui.onizlemeVideo;
  const start = parseFloat(ui.start.value) || 0;
  if (v.dataset.adres !== adres) {
    v.dataset.adres = adres;
    v.src = adres;
    v.addEventListener("loadedmetadata", () => {
      // Kısa bir dosya seçildiyse aralığı kendiliğinden tüm video yap
      if (aralikDoldur && !ui.end.value && v.duration <= 30) {
        ui.start.value = 0;
        ui.end.value = sn(v.duration);
      }
      v.currentTime = start;
    }, { once: true });
  } else {
    v.currentTime = start;
    v.play().catch(() => {});
  }
}

ui.onizlemeVideo.addEventListener("error", () => {
  if (onizlemeTur !== "video") return;
  formMesaj(kaynakModu === "baglanti"
    ? "Video açılamadı. Bağlantının herkese açık olduğundan ve bir video dosyasını gösterdiğinden emin ol. (Google Drive'da \"Bağlantıya sahip olan herkes\" seçilmeli.)"
    : "Video dosyası açılamadı.");
});

function youtubeOnizle(id) {
  if (!window.YT || !YT.Player) return formMesaj("YouTube oynatıcısı henüz yüklenmedi, birazdan tekrar dene.");
  ui.onizlemeVideo.pause();
  onizlemeGorunumu("yt");
  const start = parseFloat(ui.start.value) || 0;
  const end = parseFloat(ui.end.value);
  const ayar = { videoId: id, startSeconds: start };
  if (end > start) ayar.endSeconds = end;

  if (ytOynatici) {
    ytOynatici.loadVideoById(ayar);
  } else {
    ytOynatici = new YT.Player("onizleme", {
      videoId: id,
      playerVars: { rel: 0, playsinline: 1, origin: location.origin },
      events: { onReady: (e) => e.target.loadVideoById(ayar) }
    });
  }
}

ui.onizle.addEventListener("click", () => {
  formMesaj("");
  if (kaynakModu === "baglanti") {
    const c = VideoKaynak.coz(ui.baglanti.value);
    if (!c) return formMesaj("Önce geçerli bir video bağlantısı gir.");
    if (c.tur === "youtube") youtubeOnizle(c.youtube);
    else videoOnizle(c.video);
  } else if (dosyaAdresi) {
    videoOnizle(dosyaAdresi);
  } else if (duzenlenen && duzenlenen.nereden === "yukleme") {
    videoOnizle(duzenlenen.video);
  } else {
    formMesaj("Önce bir video dosyası seç.");
  }
});

function suAn(alan) {
  let t = null;
  if (onizlemeTur === "video") t = ui.onizlemeVideo.currentTime;
  else if (onizlemeTur === "yt" && ytOynatici && ytOynatici.getCurrentTime) t = ytOynatici.getCurrentTime();
  if (t === null) return formMesaj("Önce videoyu önizle.");
  alan.value = sn(t);
}
ui.baslangicYap.addEventListener("click", () => suAn(ui.start));
ui.bitisYap.addEventListener("click", () => suAn(ui.end));

// ---------- Klip listesi ----------
function ozetGuncelle() {
  const video = klipler.filter((k) => k.video).length;
  ui.ozKlip.textContent = klipler.length;
  ui.ozVideo.textContent = video;
  ui.ozYoutube.textContent = klipler.length - video;
}

async function klipleriYukle() {
  bosSatir(ui.klipTablo, 5, "Yükleniyor…");
  try {
    klipler = await klipleriGetir(f);
  } catch (h) {
    return bosSatir(ui.klipTablo, 5, "Klipler okunamadı: " + h.message);
  }
  ui.klipSayisi.textContent = `(${klipler.length})`;
  ui.iceAktar.hidden = klipler.length > 0;
  ozetGuncelle();
  klipleriCiz();
}

function klipleriCiz() {
  if (!klipler.length) {
    return bosSatir(ui.klipTablo, 5, "Henüz klip yok. Soldaki formla ilk klibi ekle; o zamana kadar oyun data.js'deki örnek klipleri kullanır.");
  }
  const ara = ui.klipAra.value.trim().toLocaleLowerCase("tr");
  const gorunen = ara
    ? klipler.filter((k) => `${k.arapca} ${k.dogru} ${k.yanlis}`.toLocaleLowerCase("tr").includes(ara))
    : klipler;
  if (!gorunen.length) return bosSatir(ui.klipTablo, 5, `"${ui.klipAra.value}" ile eşleşen klip yok.`);

  ui.klipTablo.replaceChildren(...gorunen.map((k) => {
    const tr = document.createElement("tr");
    if (duzenlenen && k.id === duzenlenen.id) tr.className = "secili-satir";
    const ar = hucre(k.arapca, "arapca-hucre");
    ar.dir = "rtl";
    ar.lang = "ar";
    const kaynakTd = document.createElement("td");
    const etiket = document.createElement("span");
    etiket.className = `etiket ${k.video ? "etiket-video" : "etiket-yt"}`;
    etiket.textContent = kaynakAdi(k);
    kaynakTd.append(etiket);
    const islem = document.createElement("td");
    islem.className = "islem-hucre";
    islem.append(
      dugme("Düzenle", "baglanti", () => duzenle(k)),
      dugme("Sil", "baglanti tehlike", () => sil(k))
    );
    tr.append(ar, hucre(k.dogru), kaynakTd, hucre(`${sn(k.start)}–${sn(k.end)} sn`, "aralik-hucre"), islem);
    return tr;
  }));
}
ui.klipAra.addEventListener("input", klipleriCiz);

// İlk kurulum: data.js'deki örnek klipleri Firestore'a aktar
ui.iceAktar.addEventListener("click", async () => {
  if (!confirm(`data.js'deki ${KLIPLER.length} örnek klip Firestore'a eklensin mi?`)) return;
  ui.iceAktar.disabled = true;
  try {
    const toplu = f.fs.writeBatch(f.db);
    KLIPLER.forEach((k, i) => {
      const ref = f.fs.doc(f.fs.collection(f.db, "klipler"));
      toplu.set(ref, {
        youtube: k.youtube, start: k.start, end: k.end,
        arapca: k.arapca, dogru: k.dogru, yanlis: k.yanlis,
        // Sıra korunsun diye her birine biraz farklı zaman ver
        olusturuldu: f.fs.Timestamp.fromMillis(Date.now() + i)
      });
    });
    await toplu.commit();
    await klipleriYukle();
  } catch (h) {
    alert("İçe aktarılamadı: " + h.message);
  } finally {
    ui.iceAktar.disabled = false;
  }
});

// ---------- Klip formu ----------
function dosyaSeciminiTemizle() {
  seciliDosya = null;
  if (dosyaAdresi) URL.revokeObjectURL(dosyaAdresi);
  dosyaAdresi = null;
  ui.dosya.value = "";
  ui.dosyaBirak.classList.remove("secildi");
  ui.dosyaAd.textContent = "Video dosyasını seç ya da buraya sürükle";
  ilerlemeGoster(null);
}

function formuTemizle() {
  duzenlenen = null;
  ui.form.reset();
  dosyaSeciminiTemizle();
  baglantiTanit();
  kaynakModuSec("baglanti");
  ui.formBaslik.textContent = "Yeni klip";
  ui.kaydet.textContent = "Klibi ekle";
  ui.vazgec.hidden = true;
  formMesaj("");
  klipleriCiz();
}

function duzenle(k) {
  formuTemizle();
  duzenlenen = k;
  if (k.nereden === "yukleme") {
    kaynakModuSec("dosya");
    ui.dosyaAd.textContent = `Yüklü dosya: ${k.dosyaAdi || "video"} (değiştirmek için yeni dosya seç)`;
    ui.dosyaBirak.classList.add("secildi");
  } else {
    kaynakModuSec("baglanti");
    ui.baglanti.value = k.video ? (k.baglanti || k.video) : `https://www.youtube.com/watch?v=${k.youtube}`;
    baglantiTanit();
  }
  ui.start.value = k.start;
  ui.end.value = k.end;
  ui.arapca.value = k.arapca;
  ui.dogru.value = k.dogru;
  ui.yanlis.value = k.yanlis;
  ui.formBaslik.textContent = "Klibi düzenle";
  ui.kaydet.textContent = "Değişiklikleri kaydet";
  ui.vazgec.hidden = false;
  klipleriCiz();
  ui.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function depoDosyasiniSil(yol) {
  if (!yol) return;
  try {
    const { st, depo } = await depoHazir(f);
    await st.deleteObject(st.ref(depo, yol));
  } catch (h) {
    console.warn("Video dosyası silinemedi:", yol, h);
  }
}

async function sil(k) {
  if (!confirm(`Bu klip silinsin mi?\n\n${k.arapca}\n${k.dogru}`)) return;
  try {
    await f.fs.deleteDoc(f.fs.doc(f.db, "klipler", k.id));
    await depoDosyasiniSil(k.depoYolu);
    if (duzenlenen && duzenlenen.id === k.id) formuTemizle();
    await klipleriYukle();
  } catch (h) {
    alert("Silinemedi: " + h.message);
  }
}

ui.vazgec.addEventListener("click", formuTemizle);

// Formun soru ve aralık kısmını oku; hata varsa mesaj gösterip null döner
function soruyuOku() {
  const start = parseFloat(ui.start.value);
  const end = parseFloat(ui.end.value);
  const arapca = ui.arapca.value.trim();
  const dogru = ui.dogru.value.trim();
  const yanlis = ui.yanlis.value.trim();

  if (!(start >= 0) || !(end > 0)) return formMesaj("Başlangıç ve bitiş saniyesini gir."), null;
  if (end <= start) return formMesaj("Bitiş, başlangıçtan sonra olmalı."), null;
  if (end - start > 30) return formMesaj("Klip en fazla 30 saniye olabilir."), null;
  if (!arapca || !dogru || !yanlis) return formMesaj("Arapça cümleyi ve iki çeviriyi de yaz."), null;
  if (dogru === yanlis) return formMesaj("Doğru ve yanlış çeviri aynı olamaz."), null;
  return { start, end, arapca, dogru, yanlis };
}

// Storage hatalarını anlaşılır mesaja çevir
function depoHatasi(h) {
  const kod = h.code || "";
  if (kod === "storage/unauthorized") return "Yükleme izni yok. storage.rules dosyasındaki kurallar Firebase'de yayınlanmış olmalı.";
  if (kod === "storage/canceled") return "Yükleme iptal edildi.";
  if (kod === "storage/quota-exceeded") return "Firebase Storage kotası doldu.";
  if (kod === "storage/unknown" || kod === "storage/bucket-not-found" || kod === "storage/project-not-found")
    return "Firebase Storage bu projede açık değil (Blaze planı gerekir). Bunun yerine videoyu Google Drive'a koyup bağlantısını ekleyebilirsin.";
  return `Video yüklenemedi (${kod || h.message}).`;
}

async function dosyayiYukle(dosya) {
  const { st, depo } = await depoHazir(f);
  const temizAd = dosya.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const yol = `videolar/${Date.now()}-${temizAd}`;
  const gorev = st.uploadBytesResumable(st.ref(depo, yol), dosya, { contentType: dosya.type });

  await new Promise((tamam, hata) => {
    gorev.on("state_changed",
      (s) => ilerlemeGoster(s.bytesTransferred / s.totalBytes,
        `Yükleniyor… %${Math.round((s.bytesTransferred / s.totalBytes) * 100)} (${boyutYaz(s.bytesTransferred)} / ${boyutYaz(s.totalBytes)})`),
      hata, tamam);
  });
  ilerlemeGoster(1, "Yüklendi");
  return { video: await st.getDownloadURL(gorev.snapshot.ref), nereden: "yukleme", depoYolu: yol, dosyaAdi: dosya.name };
}

// Formdaki video kaynağını oku (gerekirse dosyayı yükler)
async function kaynagiHazirla() {
  if (kaynakModu === "baglanti") {
    const ham = ui.baglanti.value.trim();
    const c = VideoKaynak.coz(ham);
    if (!c) throw new Error("Geçerli bir video bağlantısı gir (Google Drive, Dropbox, .mp4 adresi ya da YouTube).");
    return c.tur === "youtube"
      ? { youtube: c.youtube }
      : { video: c.video, nereden: c.nereden, baglanti: ham };
  }
  if (seciliDosya) return dosyayiYukle(seciliDosya);
  if (duzenlenen && duzenlenen.nereden === "yukleme") {
    const { video, nereden, depoYolu, dosyaAdi } = duzenlenen;
    return { video, nereden, depoYolu, dosyaAdi: dosyaAdi || "" };
  }
  throw new Error("Yüklemek için bir video dosyası seç.");
}

ui.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const soru = soruyuOku();
  if (!soru) return;

  ui.kaydet.disabled = true;
  formMesaj("");
  let kaynakVeri;
  try {
    kaynakVeri = await kaynagiHazirla();
  } catch (h) {
    ui.kaydet.disabled = false;
    ilerlemeGoster(null);
    return formMesaj(h.code ? depoHatasi(h) : h.message);
  }

  const yeniDosya = !!seciliDosya;
  try {
    const belge = { ...kaynakVeri, ...soru };
    if (duzenlenen) {
      // Tüm belgeyi yeniden yaz: kaynak değiştiyse eski alanlar (youtube/video) kalmasın
      await f.fs.setDoc(f.fs.doc(f.db, "klipler", duzenlenen.id), {
        ...belge,
        olusturuldu: duzenlenen.olusturuldu || f.fs.serverTimestamp(),
        guncellendi: f.fs.serverTimestamp()
      });
      // Eski yüklenmiş dosya artık kullanılmıyorsa sil
      if (duzenlenen.depoYolu && duzenlenen.depoYolu !== belge.depoYolu) await depoDosyasiniSil(duzenlenen.depoYolu);
    } else {
      await f.fs.addDoc(f.fs.collection(f.db, "klipler"), { ...belge, olusturuldu: f.fs.serverTimestamp() });
    }
    formuTemizle();
    formMesaj("Klip kaydedildi.", "basari");
    await klipleriYukle();
  } catch (h) {
    // Belge yazılamadıysa az önce yüklenen dosya boşta kalmasın
    if (yeniDosya && kaynakVeri.depoYolu) await depoDosyasiniSil(kaynakVeri.depoYolu);
    formMesaj("Kaydedilemedi: " + h.message);
  } finally {
    ui.kaydet.disabled = false;
  }
});

// ---------- Öğrenciler ----------
async function kullaniciSayisiniYukle() {
  try {
    const sonuc = await f.fs.getCountFromServer(f.fs.collection(f.db, "kullanicilar"));
    ui.ozKullanici.textContent = sonuc.data().count;
  } catch {
    ui.ozKullanici.textContent = "–";
  }
}

async function kullanicilariYukle() {
  bosSatir(ui.kullaniciTablo, 8, "Yükleniyor…");
  let belgeler;
  try {
    belgeler = (await f.fs.getDocs(f.fs.collection(f.db, "kullanicilar"))).docs;
  } catch (h) {
    return bosSatir(ui.kullaniciTablo, 8, "Öğrenciler okunamadı: " + h.message);
  }
  ui.kullaniciSayisi.textContent = `(${belgeler.length})`;
  ui.ozKullanici.textContent = belgeler.length;
  if (!belgeler.length) return bosSatir(ui.kullaniciTablo, 8, "Henüz kayıtlı öğrenci yok.");

  const satirlar = belgeler
    .map((d) => ({ ...d.data(), uid: d.id }))
    .sort((a, b) => (b.profil?.toplamPuan || 0) - (a.profil?.toplamPuan || 0));

  ui.kullaniciTablo.replaceChildren(...satirlar.map((k) => {
    const p = k.profil || {};
    const tr = document.createElement("tr");
    const dogruluk = p.cevaplanan ? `%${Math.round((p.dogru / p.cevaplanan) * 100)}` : "–";
    const tarih = k.guncellendi?.toDate
      ? k.guncellendi.toDate().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
      : "–";
    const avatarTd = document.createElement("td");
    const avatar = document.createElement("span");
    avatar.className = "tablo-avatar";
    avatar.innerHTML = avatarHtml(p.avatar, p.foto);
    avatarTd.append(avatar);
    tr.append(
      avatarTd,
      hucre(p.ad || "—"),
      hucre(k.eposta || k.uid),
      hucre(p.toplamPuan ?? 0, "sayi-hucre"),
      hucre(p.cevaplanan ?? 0, "sayi-hucre"),
      hucre(dogruluk, "sayi-hucre"),
      hucre(p.enIyiSeri ?? 0, "sayi-hucre"),
      hucre(tarih)
    );
    return tr;
  }));
}
ui.yenile.addEventListener("click", kullanicilariYukle);
