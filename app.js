// MashadArabic oyun akışı: klip kendiliğinden oynar ve son karede durur,
// bitince iki çeviri çıkar, biri seçilince sonuç gösterilir,
// ← / → oklarıyla önceki ya da sonraki klibe geçilir.
// Altyazılı modda klibin Arapça cümlesi videonun altında durur;
// altyazısız modda cümle ancak cevaptan sonra görünür.

const el = {
  perde: document.getElementById("perde"),
  basla: document.getElementById("basla"),
  tekrar: document.getElementById("tekrar"),
  altyazi: document.getElementById("altyazi"),
  secenekler: document.getElementById("secenekler"),
  kartlar: [...document.querySelectorAll(".secenek")],
  gecis: document.getElementById("gecis"),
  onceki: document.getElementById("onceki"),
  sonraki: document.getElementById("sonraki"),
  sayac: document.getElementById("sayac"),
  modAltyazili: document.getElementById("modAltyazili"),
  modAltyazisiz: document.getElementById("modAltyazisiz"),
  artis: document.getElementById("artis"),
  seri: document.getElementById("seri"),
  seriRozet: document.getElementById("seriRozet"),
  enIyi: document.getElementById("enIyi"),
  hata: document.getElementById("hata"),
  turOzet: document.getElementById("turOzet"),
  turOzetMetin: document.getElementById("turOzetMetin"),
  hizBtnlar: [...document.querySelectorAll("#hizGrup [data-hiz]")]
};

// ---------- Puan ve seri ----------
// Doğru cevap: 10 taban puan + hız bonusu (şıklar çıktıktan sonra
// ilk saniyede 10, her saniye 2 azalır) + seri bonusu (serideki her
// doğru için +2, en fazla +10). Yanlış cevap seriyi sıfırlar.
const TABAN_PUAN = 10;

let puan = 0;
let seri = 0;
let secenekZamani = 0;          // şıkların çıktığı an
const cevaplananlar = new Set(); // bu turda puanlanmış klipler (geri dönünce tekrar puan yok)
const tur = { dogru: 0, yanlis: 0, puan: 0 }; // tur sonu özeti için

function puanHesapla() {
  const sure = (performance.now() - secenekZamani) / 1000;
  const hiz = Math.max(0, 10 - Math.floor(sure) * 2);
  const seriBonus = Math.min(10, (seri - 1) * 2); // seri burada zaten artırılmış
  return TABAN_PUAN + hiz + seriBonus;
}

function skoruIsle(dogru) {
  let kazanc = 0;
  if (dogru) {
    seri++;
    kazanc = puanHesapla();
    puan += kazanc;
    tur.dogru++;
    tur.puan += kazanc;
    artisGoster(`+${kazanc}`); // sağ üstteki profil kartında süzülür
    parlat(el.seriRozet);
  } else {
    seri = 0;
    tur.yanlis++;
  }
  Profil.cevapKaydet(klip, dogru, kazanc, seri);
  skoruGoster();
}

function skoruGoster() {
  const enIyi = Profil.enIyiSeri();
  el.seri.textContent = seri;
  el.enIyi.textContent = enIyi ? `en iyi ${enIyi}` : "";
}

// Profilden istatistikler sıfırlanınca bu oturumun puanı da sıfırlansın
// Hesaba giriş/çıkışta profil değişince en iyi seri yazısını tazele
document.addEventListener("profil-degisti", skoruGoster);

document.addEventListener("profil-sifirlandi", () => {
  puan = 0;
  seri = 0;
  skoruGoster();
});

function artisGoster(metin) {
  el.artis.textContent = metin;
  el.artis.classList.remove("goster");
  void el.artis.offsetWidth; // animasyonu yeniden başlat
  el.artis.classList.add("goster");
}

function parlat(rozet) {
  rozet.classList.remove("parla");
  void rozet.offsetWidth;
  rozet.classList.add("parla");
}

skoruGoster();

let player;
let sira = [];            // karışık klip sırası
let siraNo = -1;          // şu anki klibin sıradaki konumu
let klip = null;          // şu anki klip
let dogruIndex = 0;       // doğru çevirinin hangi kartta olduğu
let cevaplandi = false;
let seceneklerAcik = false;
let izleyici = null;      // bitiş saniyesini takip eden zamanlayıcı
let altyaziliMod = modYukle();

// ---------- Altyazı modu ----------
function modYukle() {
  try { return localStorage.getItem("voarabic-mod") !== "altyazisiz"; }
  catch { return true; }
}

function modSec(altyazili) {
  altyaziliMod = altyazili;
  try { localStorage.setItem("voarabic-mod", altyazili ? "altyazili" : "altyazisiz"); } catch {}
  modUygula();
}

function modUygula() {
  el.modAltyazili.classList.toggle("aktif", altyaziliMod);
  el.modAltyazisiz.classList.toggle("aktif", !altyaziliMod);
  // Altyazılı: cümle klip bitince şıklarla birlikte çıkar.
  // Altyazısız: cümle ancak cevaptan sonra çıkar.
  // Gizliyken de yer tutar ki şıklar aşağı kaymasın.
  el.altyazi.hidden = !klip;
  // Klip oynarken (tekrar dinlerken de) hiçbir şey görünmez.
  el.altyazi.classList.toggle("bekliyor", !(seceneklerAcik && (altyaziliMod || cevaplandi)));
  el.altyazi.textContent = klip ? klip.arapca : "";
}

el.modAltyazili.addEventListener("click", () => modSec(true));
el.modAltyazisiz.addEventListener("click", () => modSec(false));
modUygula();

// ---------- Oynatma hızı ----------
// Yeni başlayanlar cümleyi yavaşlatarak daha rahat ayırt edebilsin.
const HIZLAR = [1, 0.75, 0.5];
let hiz = hizYukle();

function hizYukle() {
  try {
    const v = Number(localStorage.getItem("voarabic-hiz"));
    return HIZLAR.includes(v) ? v : 1;
  } catch { return 1; }
}

function hizSec(yeni) {
  hiz = yeni;
  try { localStorage.setItem("voarabic-hiz", String(hiz)); } catch {}
  hizUygula();
}

function hizUygula() {
  el.hizBtnlar.forEach((b) => b.classList.toggle("aktif", Number(b.dataset.hiz) === hiz));
  video.defaultPlaybackRate = hiz; // yeni dosya yüklenince de bu hız kullanılsın
  video.playbackRate = hiz;
  if (player && player.setPlaybackRate && player.getPlaybackRate() !== hiz) player.setPlaybackRate(hiz);
}

// ---------- İki tür video kaynağı ----------
// YouTube klipleri (klip.youtube) YouTube oynatıcısında, yüklenen ya da bağlantıyla
// eklenen dosyalar (klip.video: mp4/webm adresi) <video> öğesinde oynar.
const video = document.getElementById("videoOynatici");
const oynaticiKutu = document.querySelector(".oynatici-kutu");
let kaynak = "yt"; // "yt" | "video"

const videoKlibiMi = (k) => !!(k && k.video);

function kaynakSec(yeni) {
  if (kaynak === yeni) return;
  if (kaynak === "video") video.pause();
  else if (player && player.pauseVideo) player.pauseVideo();
  kaynak = yeni;
  oynaticiKutu.dataset.kaynak = yeni;
  video.hidden = yeni !== "video";
}

const oynatici = {
  suAn: () => (kaynak === "video" ? video.currentTime : player.getCurrentTime()),
  git: (t) => { if (kaynak === "video") video.currentTime = t; else player.seekTo(t, true); },
  oynat: () => {
    if (kaynak === "video") video.play().catch(() => {});
    else player.playVideo();
  },
  durdur: () => {
    if (kaynak === "video") video.pause();
    else if (player && player.pauseVideo) player.pauseVideo();
  }
};

video.addEventListener("playing", () => { if (kaynak === "video") bitisiIzle(); });
video.addEventListener("ended", () => {
  if (kaynak === "video" && klip && klipBasladi) { klibiDurdur(); seceneklariGoster(); }
});
video.addEventListener("error", () => {
  if (kaynak === "video" && klip) hataGoster("Video dosyası açılamadı. Bağlantıyı yönetim panelinden kontrol et.");
});

el.hizBtnlar.forEach((b) => b.addEventListener("click", () => hizSec(Number(b.dataset.hiz))));
hizUygula();

// ---------- Klipler hazır mı? ----------
// Klipler Firestore'dan gelir (hesap.js "klipler-hazir" olayıyla bildirir).
// Firestore'da klip yoksa ya da ulaşılamazsa data.js'deki örnek klipler kullanılır.
let oynaticiHazir = false;
let kliplerHazir = false;

function baslaHazirla() {
  // Hiç YouTube klibi yoksa YouTube oynatıcısını beklemeye gerek yok
  const ytGerekli = KLIPLER.some((k) => !videoKlibiMi(k));
  if (!kliplerHazir || (ytGerekli && !oynaticiHazir)) return;
  el.basla.disabled = false;
  el.basla.textContent = "▶ Başla";
}

let oyunBasladi = false;

function kliplerGeldi(liste) {
  // Firestore 5 sn'den geç yanıt verse bile, oyun başlamadıysa gerçek klipler kullanılsın
  if (Array.isArray(liste) && liste.length && !oyunBasladi) KLIPLER.splice(0, KLIPLER.length, ...liste);
  kliplerHazir = true;
  baslaHazirla();
}

document.addEventListener("klipler-hazir", (e) => kliplerGeldi(e.detail));
// Hesap modülü hiç yanıt vermezse 5 sn sonra örnek kliplerle devam et
setTimeout(() => kliplerGeldi(null), 5000);

// ---------- YouTube oynatıcısı ----------
function onYouTubeIframeAPIReady() {
  const ilkYoutube = KLIPLER.find((k) => !videoKlibiMi(k));
  player = new YT.Player("oynatici", {
    videoId: ilkYoutube ? ilkYoutube.youtube : undefined,
    playerVars: {
      controls: 0, disablekb: 1, rel: 0, playsinline: 1,
      iv_load_policy: 3, fs: 0, origin: location.origin
    },
    events: {
      onReady: () => {
        oynaticiHazir = true;
        hizUygula();
        baslaHazirla();
      },
      onStateChange: (e) => {
        if (kaynak !== "yt") return;
        if (e.data === YT.PlayerState.PLAYING) {
          hizUygula(); // yeni video yüklenince YouTube hızı sıfırlayabilir
          bitisiIzle();
        }
        // Klibin bitişi videonun sonuna denk gelirse bitiş saniyesine hiç ulaşılmayabilir
        if (e.data === YT.PlayerState.ENDED && klip && klipBasladi) {
          klibiDurdur();
          seceneklariGoster();
        }
      },
      onError: (e) => { if (kaynak === "yt") hataGoster(`Video oynatılamadı (hata kodu ${e.data}).`); }
    }
  });
}

let klipBasladi = false;  // video klibin aralığına gerçekten girdi mi

function bitisiIzle() {
  clearInterval(izleyici);
  izleyici = setInterval(() => {
    const t = oynatici.suAn();
    // seekTo hemen uygulanmayabilir; eski konumdaki (önceki klibin sonu) zamanı
    // "klip bitti" sanmamak için önce klibin aralığına girildiğini bekle.
    if (t >= klip.start - 0.5 && t < klip.end) {
      klipBasladi = true;
      perdeyiAc();
    }
    if (klipBasladi && t >= klip.end) {
      klibiDurdur();
      seceneklariGoster();
    }
  }, 40);
}

function klibiOynat() {
  klipBasladi = false;
  // Tekrar dinlerken şıklar, oklar ve altyazı gizlenir; klip bitince geri gelir.
  seceneklerAcik = false;
  el.secenekler.classList.add("bekliyor");
  el.gecis.classList.add("bekliyor");
  modUygula();
  oynatici.git(klip.start);
  oynatici.oynat();
}

// Video son karede durur, ekran kararmaz.
function klibiDurdur() {
  clearInterval(izleyici);
  oynatici.durdur();
}

function perdeyiAc()    { el.perde.classList.add("gizli"); }
function perdeyiKapat() { el.perde.classList.remove("gizli"); }

function seceneklariGoster() {
  if (seceneklerAcik) return;
  seceneklerAcik = true;
  secenekZamani = performance.now();
  el.secenekler.classList.remove("bekliyor");
  if (cevaplandi) el.gecis.classList.remove("bekliyor"); // cevaplanmış klibi tekrar dinlediyse
  modUygula(); // altyazılı modda cümleyi şimdi göster
}

// ---------- Oyun akışı ----------
el.basla.addEventListener("click", () => {
  oyunBasladi = true;
  el.basla.hidden = true;
  el.turOzet.hidden = true;
  document.getElementById("karsilama").hidden = true;
  el.tekrar.hidden = false;
  el.secenekler.hidden = false;
  el.gecis.hidden = false;

  // Yeni tur: karıştır, önceki turun son klibi ilk sırada gelmesin
  const son = sira[sira.length - 1];
  sira = karistir([...KLIPLER.keys()]);
  if (sira[0] === son && sira.length > 1) sira.push(sira.shift());
  cevaplananlar.clear();
  tur.dogru = tur.yanlis = tur.puan = 0;
  klibeGit(0);
});

// Tur bitti: videonun üstüne özet perdesi ve "Yeni tur" düğmesi
function turuBitir() {
  klibiDurdur();
  klip = null;
  seceneklerAcik = false;
  el.secenekler.classList.add("bekliyor");
  el.gecis.classList.add("bekliyor");
  el.tekrar.hidden = true;
  modUygula();

  const toplam = tur.dogru + tur.yanlis;
  const oran = toplam ? Math.round((tur.dogru / toplam) * 100) : 0;
  el.turOzetMetin.textContent =
    `${toplam} cevaptan ${tur.dogru} doğru (%${oran}) · +${tur.puan} puan`;
  el.turOzet.hidden = false;
  el.basla.textContent = "▶ Yeni tur";
  el.basla.hidden = false;
  perdeyiKapat();
  el.basla.focus();
}

function klibeGit(no) {
  if (no >= sira.length) return turuBitir();
  if (no < 0) return;

  siraNo = no;
  klip = KLIPLER[sira[siraNo]];
  cevaplandi = false;
  seceneklerAcik = false;
  el.secenekler.classList.add("bekliyor");
  el.gecis.classList.add("bekliyor");
  el.onceki.disabled = siraNo === 0;
  modUygula();

  // Doğru çeviriyi rastgele karta koy
  dogruIndex = Math.random() < 0.5 ? 0 : 1;
  const metinler = dogruIndex === 0 ? [klip.dogru, klip.yanlis] : [klip.yanlis, klip.dogru];
  el.kartlar.forEach((kart, i) => {
    kart.className = "secenek";
    kart.disabled = false;
    kart.querySelector("span").textContent = metinler[i];
  });

  el.sayac.textContent = `Klip ${siraNo + 1} / ${sira.length}`;

  el.hata.hidden = true;

  if (videoKlibiMi(klip)) {
    // Kendi videomuz (yüklenen dosya, doğrudan bağlantı ya da Google Drive)
    kaynakSec("video");
    const adres = oynatilabilirAdres(klip.video);
    if (video.dataset.adres !== adres) {
      perdeyiKapat(); // yeni dosya yüklenirken siyah ekran görünmesin
      klipBasladi = false;
      video.dataset.adres = adres;
      video.src = adres;
      video.addEventListener("loadedmetadata", () => {
        if (kaynak === "video" && video.dataset.adres === adres) klibiOynat();
      }, { once: true });
    } else {
      klibiOynat();
    }
    return;
  }

  kaynakSec("yt");
  if (player.getVideoData().video_id !== klip.youtube) {
    // Farklı video yüklenirken YouTube ekranı görünmesin
    perdeyiKapat();
    klipBasladi = false;
    player.loadVideoById({ videoId: klip.youtube, startSeconds: klip.start });
  } else {
    klibiOynat();
  }
}

function sec(i) {
  if (cevaplandi || !seceneklerAcik) return;
  cevaplandi = true;

  el.kartlar.forEach((kart, k) => {
    kart.disabled = true;
    if (k === dogruIndex) kart.classList.add("dogru");
    else if (k === i) kart.classList.add("yanlis");
    else kart.classList.add("soluk");
  });

  // Aynı turda daha önce cevaplanan klibe geri dönüldüyse puan/seri değişmez
  if (!cevaplananlar.has(siraNo)) {
    cevaplananlar.add(siraNo);
    const dogruMu = i === dogruIndex;
    skoruIsle(dogruMu);
    if (!dogruMu) yanlisiTekrarSirala();
  }

  modUygula(); // altyazısız modda cümleyi şimdi göster
  el.gecis.classList.remove("bekliyor");
  el.sonraki.focus();
}

// Yanlış bilinen klip aynı turda birkaç klip sonra tekrar sorulur (pekiştirme).
// Puanlanan klip her zaman sıranın en ilerisindedir, bu yüzden araya eklemek
// daha önce cevaplanmış konumları (cevaplananlar) kaydırmaz.
const TEKRAR_ARALIGI = 3;
function yanlisiTekrarSirala() {
  const klipNo = sira[siraNo];
  if (sira.slice(siraNo + 1).includes(klipNo)) return; // zaten ileride var
  const yer = Math.min(siraNo + TEKRAR_ARALIGI, sira.length);
  sira.splice(yer, 0, klipNo);
  el.sayac.textContent = `Klip ${siraNo + 1} / ${sira.length}`;
}

el.kartlar.forEach((kart, i) => kart.addEventListener("click", () => sec(i)));
el.onceki.addEventListener("click", () => { if (cevaplandi) klibeGit(siraNo - 1); });
el.sonraki.addEventListener("click", () => { if (cevaplandi) klibeGit(siraNo + 1); });
el.tekrar.addEventListener("click", () => { if (klip) klibiOynat(); });

// Klavye: 1 / 2 ile seç; cevaptan sonra ← / → ile geç; R ile tekrar dinle; S ile hız değiştir
document.addEventListener("keydown", (e) => {
  // Profil paneli açıkken ya da bir yazı alanındayken oyun tuşları çalışmasın
  if (document.body.dataset.gorunum !== "dinleme") return; // başka bölümdeyken oyun tuşları çalışmasın
  if (document.querySelector("dialog[open]") || e.target.matches("input, textarea")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+S, Ctrl+R gibi tarayıcı kısayollarına karışma
  if (e.key.toLowerCase() === "s") {
    hizSec(HIZLAR[(HIZLAR.indexOf(hiz) + 1) % HIZLAR.length]);
    return;
  }
  if (!klip) return;
  if (e.key === "1") sec(0);
  else if (e.key === "2") sec(1);
  else if (e.key === "ArrowRight" && cevaplandi) klibeGit(siraNo + 1);
  else if (e.key === "ArrowLeft" && cevaplandi && siraNo > 0) klibeGit(siraNo - 1);
  else if (e.key.toLowerCase() === "r") klibiOynat();
});

// ---------- Bölüm değişince ----------
// Başka bölüme geçilince video sussun; Dinleme'ye dönülünce yarım kalan klip baştan oynasın.
document.addEventListener("gorunum-degisti", (e) => {
  if (!klip || !player && kaynak === "yt") return;
  if (e.detail !== "dinleme") klibiDurdur();
  else if (!seceneklerAcik) klibiOynat();
});

// ---------- Yardımcılar ----------
function karistir(dizi) {
  for (let i = dizi.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
  }
  return dizi;
}

function hataGoster(mesaj) {
  el.hata.textContent = mesaj;
  el.hata.hidden = false;
}
