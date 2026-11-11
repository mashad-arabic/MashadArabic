// Yönetim sayfası: yalnızca yönetici hesapları kullanabilir.
// Klip ekleme/düzenleme/silme ve kullanıcıların listesi.
// Asıl güvenlik Firestore kurallarında (firestore.rules); bu sayfa sadece arayüz.

import { firebaseHazir, yoneticiMi, klipleriGetir } from "./firebase.js";

const $ = (id) => document.getElementById(id);
const ui = {
  durum: $("durum"), icerik: $("icerik"), kim: $("kim"),
  sekmeKlipler: $("sekmeKlipler"), sekmeKullanicilar: $("sekmeKullanicilar"),
  bolumKlipler: $("bolumKlipler"), bolumKullanicilar: $("bolumKullanicilar"),
  form: $("klipForm"), formBaslik: $("formBaslik"),
  youtube: $("fYoutube"), start: $("fStart"), end: $("fEnd"),
  arapca: $("fArapca"), dogru: $("fDogru"), yanlis: $("fYanlis"),
  formMesaj: $("formMesaj"), kaydet: $("kaydetBtn"), vazgec: $("vazgecBtn"),
  onizle: $("onizleBtn"), baslangicYap: $("baslangicYap"), bitisYap: $("bitisYap"),
  klipTablo: $("klipTablo"), klipSayisi: $("klipSayisi"), iceAktar: $("iceAktarBtn"),
  kullaniciTablo: $("kullaniciTablo"), kullaniciSayisi: $("kullaniciSayisi"), yenile: $("yenileBtn")
};

let f = null;             // Firebase
let klipler = [];
let duzenlenenId = null;  // düzenlenen klibin kimliği (yeni klipte null)
let oynatici = null;

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
    if (!u) return durumYaz("Bu sayfa için önce oyun sayfasından yönetici hesabıyla giriş yapmalısın.");
    if (!(await yoneticiMi(f, u))) return durumYaz(`${u.email} bir yönetici hesabı değil. Bu sayfayı yalnızca yöneticiler kullanabilir.`);

    ui.kim.textContent = u.email;
    ui.durum.hidden = true;
    ui.icerik.hidden = false;
    klipleriYukle();
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

// YouTube bağlantısından 11 karakterlik video kimliğini çıkar
function videoKimligi(metin) {
  metin = metin.trim();
  if (/^[\w-]{11}$/.test(metin)) return metin;
  const m = metin.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const sn = (x) => Number(x).toFixed(2).replace(/\.?0+$/, "");

function formMesaj(metin, tur = "hata") {
  ui.formMesaj.textContent = metin;
  ui.formMesaj.className = `mesaj ${tur}`;
  ui.formMesaj.hidden = !metin;
}

// ---------- Klip listesi ----------
async function klipleriYukle() {
  bosSatir(ui.klipTablo, 4, "Yükleniyor…");
  try {
    klipler = await klipleriGetir(f);
  } catch (h) {
    return bosSatir(ui.klipTablo, 4, "Klipler okunamadı: " + h.message);
  }
  ui.klipSayisi.textContent = `(${klipler.length})`;
  ui.iceAktar.hidden = klipler.length > 0;

  if (!klipler.length) {
    return bosSatir(ui.klipTablo, 4, "Henüz klip yok. Oyun şu an data.js'deki örnek klipleri kullanıyor.");
  }

  ui.klipTablo.replaceChildren(...klipler.map((k) => {
    const tr = document.createElement("tr");
    if (k.id === duzenlenenId) tr.className = "secili-satir";
    const ar = hucre(k.arapca, "arapca-hucre");
    ar.dir = "rtl";
    ar.lang = "ar";
    const islem = document.createElement("td");
    islem.className = "islem-hucre";
    islem.append(
      dugme("Düzenle", "baglanti", () => duzenle(k)),
      dugme("Sil", "baglanti tehlike", () => sil(k))
    );
    tr.append(ar, hucre(k.dogru), hucre(`${sn(k.start)}–${sn(k.end)} sn`, "aralik-hucre"), islem);
    return tr;
  }));
}

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
function formuTemizle() {
  duzenlenenId = null;
  ui.form.reset();
  ui.formBaslik.textContent = "Yeni klip";
  ui.kaydet.textContent = "Klibi ekle";
  ui.vazgec.hidden = true;
  formMesaj("");
  klipleriYukle();
}

function duzenle(k) {
  duzenlenenId = k.id;
  ui.youtube.value = k.youtube;
  ui.start.value = k.start;
  ui.end.value = k.end;
  ui.arapca.value = k.arapca;
  ui.dogru.value = k.dogru;
  ui.yanlis.value = k.yanlis;
  ui.formBaslik.textContent = "Klibi düzenle";
  ui.kaydet.textContent = "Değişiklikleri kaydet";
  ui.vazgec.hidden = false;
  formMesaj("");
  klipleriYukle();
  ui.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function sil(k) {
  if (!confirm(`Bu klip silinsin mi?\n\n${k.arapca}\n${k.dogru}`)) return;
  try {
    await f.fs.deleteDoc(f.fs.doc(f.db, "klipler", k.id));
    if (duzenlenenId === k.id) formuTemizle();
    else klipleriYukle();
  } catch (h) {
    alert("Silinemedi: " + h.message);
  }
}

ui.vazgec.addEventListener("click", formuTemizle);

// Formu okuyup doğrula; hata varsa mesaj gösterip null döner
function formuOku() {
  const youtube = videoKimligi(ui.youtube.value);
  const start = parseFloat(ui.start.value);
  const end = parseFloat(ui.end.value);
  const arapca = ui.arapca.value.trim();
  const dogru = ui.dogru.value.trim();
  const yanlis = ui.yanlis.value.trim();

  if (!youtube) return formMesaj("Geçerli bir YouTube bağlantısı ya da 11 karakterlik video kimliği gir."), null;
  if (!(start >= 0) || !(end > 0)) return formMesaj("Başlangıç ve bitiş saniyesini gir."), null;
  if (end <= start) return formMesaj("Bitiş, başlangıçtan sonra olmalı."), null;
  if (end - start > 30) return formMesaj("Klip en fazla 30 saniye olabilir."), null;
  if (!arapca || !dogru || !yanlis) return formMesaj("Arapça cümleyi ve iki çeviriyi de yaz."), null;
  if (dogru === yanlis) return formMesaj("Doğru ve yanlış çeviri aynı olamaz."), null;

  return { youtube, start, end, arapca, dogru, yanlis };
}

ui.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const veri = formuOku();
  if (!veri) return;

  ui.kaydet.disabled = true;
  try {
    if (duzenlenenId) {
      await f.fs.updateDoc(f.fs.doc(f.db, "klipler", duzenlenenId), {
        ...veri, guncellendi: f.fs.serverTimestamp()
      });
    } else {
      await f.fs.addDoc(f.fs.collection(f.db, "klipler"), {
        ...veri, olusturuldu: f.fs.serverTimestamp()
      });
    }
    formuTemizle();
    formMesaj("Klip kaydedildi.", "basari");
  } catch (h) {
    formMesaj("Kaydedilemedi: " + h.message);
  } finally {
    ui.kaydet.disabled = false;
  }
});

// ---------- Önizleme ----------
ui.onizle.addEventListener("click", () => {
  const youtube = videoKimligi(ui.youtube.value);
  if (!youtube) return formMesaj("Önce YouTube bağlantısını gir.");
  if (!window.YT || !YT.Player) return formMesaj("YouTube oynatıcısı henüz yüklenmedi, birazdan tekrar dene.");
  formMesaj("");

  const start = parseFloat(ui.start.value) || 0;
  const end = parseFloat(ui.end.value);
  const ayar = { videoId: youtube, startSeconds: start };
  if (end > start) ayar.endSeconds = end;

  if (oynatici) {
    oynatici.loadVideoById(ayar);
  } else {
    oynatici = new YT.Player("onizleme", {
      videoId: youtube,
      playerVars: { rel: 0, playsinline: 1, origin: location.origin },
      events: { onReady: (e) => e.target.loadVideoById(ayar) }
    });
  }
});

function suAn(alan) {
  if (!oynatici || !oynatici.getCurrentTime) return formMesaj("Önce videoyu önizle.");
  alan.value = sn(oynatici.getCurrentTime());
}
ui.baslangicYap.addEventListener("click", () => suAn(ui.start));
ui.bitisYap.addEventListener("click", () => suAn(ui.end));

// ---------- Kullanıcılar ----------
async function kullanicilariYukle() {
  bosSatir(ui.kullaniciTablo, 7, "Yükleniyor…");
  let belgeler;
  try {
    belgeler = (await f.fs.getDocs(f.fs.collection(f.db, "kullanicilar"))).docs;
  } catch (h) {
    return bosSatir(ui.kullaniciTablo, 7, "Kullanıcılar okunamadı: " + h.message);
  }
  ui.kullaniciSayisi.textContent = `(${belgeler.length})`;
  if (!belgeler.length) return bosSatir(ui.kullaniciTablo, 7, "Henüz kayıtlı kullanıcı yok.");

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
    tr.append(
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
