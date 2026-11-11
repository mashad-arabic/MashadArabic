// VoArabic oyun akışı: klip kendiliğinden oynar ve son karede durur,
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
  puan: document.getElementById("puan"),
  artis: document.getElementById("artis"),
  seri: document.getElementById("seri"),
  seriRozet: document.getElementById("seriRozet"),
  enIyi: document.getElementById("enIyi"),
  hata: document.getElementById("hata")
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
    artisGoster(`+${kazanc}`);
    parlat(el.seriRozet);
  } else {
    seri = 0;
  }
  Profil.cevapKaydet(klip, dogru, kazanc, seri);
  skoruGoster();
}

function skoruGoster() {
  const enIyi = Profil.enIyiSeri();
  el.puan.textContent = puan;
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
  el.altyazi.classList.toggle("bekliyor", !((altyaziliMod && seceneklerAcik) || cevaplandi));
  el.altyazi.textContent = klip ? klip.arapca : "";
}

el.modAltyazili.addEventListener("click", () => modSec(true));
el.modAltyazisiz.addEventListener("click", () => modSec(false));
modUygula();

// ---------- YouTube oynatıcısı ----------
function onYouTubeIframeAPIReady() {
  player = new YT.Player("oynatici", {
    videoId: KLIPLER[0].youtube,
    playerVars: {
      controls: 0, disablekb: 1, rel: 0, playsinline: 1,
      iv_load_policy: 3, fs: 0, origin: location.origin
    },
    events: {
      onReady: () => {
        el.basla.disabled = false;
        el.basla.textContent = "▶ Başla";
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) bitisiIzle();
      },
      onError: (e) => hataGoster(`Video oynatılamadı (hata kodu ${e.data}).`)
    }
  });
}

let klipBasladi = false;  // video klibin aralığına gerçekten girdi mi

function bitisiIzle() {
  clearInterval(izleyici);
  izleyici = setInterval(() => {
    const t = player.getCurrentTime();
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
  player.seekTo(klip.start, true);
  player.playVideo();
}

// Video son karede durur, ekran kararmaz.
function klibiDurdur() {
  clearInterval(izleyici);
  player.pauseVideo();
}

function perdeyiAc()    { el.perde.classList.add("gizli"); }
function perdeyiKapat() { el.perde.classList.remove("gizli"); }

function seceneklariGoster() {
  if (seceneklerAcik) return;
  seceneklerAcik = true;
  secenekZamani = performance.now();
  el.secenekler.classList.remove("bekliyor");
  modUygula(); // altyazılı modda cümleyi şimdi göster
}

// ---------- Oyun akışı ----------
el.basla.addEventListener("click", () => {
  el.basla.hidden = true;
  el.tekrar.hidden = false;
  el.secenekler.hidden = false;
  el.gecis.hidden = false;
  sira = karistir([...KLIPLER.keys()]);
  klibeGit(0);
});

function klibeGit(no) {
  if (no >= sira.length) {
    // Tur bitti: yeniden karıştır, aynı klip arka arkaya gelmesin
    const son = sira[sira.length - 1];
    sira = karistir([...KLIPLER.keys()]);
    if (sira[0] === son && sira.length > 1) sira.push(sira.shift());
    cevaplananlar.clear();
    no = 0;
  }
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
    skoruIsle(i === dogruIndex);
  }

  modUygula(); // altyazısız modda cümleyi şimdi göster
  el.gecis.classList.remove("bekliyor");
  el.sonraki.focus();
}

el.kartlar.forEach((kart, i) => kart.addEventListener("click", () => sec(i)));
el.onceki.addEventListener("click", () => { if (cevaplandi) klibeGit(siraNo - 1); });
el.sonraki.addEventListener("click", () => { if (cevaplandi) klibeGit(siraNo + 1); });
el.tekrar.addEventListener("click", () => { if (klip) klibiOynat(); });

// Klavye: 1 / 2 ile seç; cevaptan sonra ← / → ile geç; R ile tekrar dinle
document.addEventListener("keydown", (e) => {
  // Profil paneli açıkken ya da bir yazı alanındayken oyun tuşları çalışmasın
  if (!klip || document.querySelector("dialog[open]") || e.target.matches("input, textarea")) return;
  if (e.key === "1") sec(0);
  else if (e.key === "2") sec(1);
  else if (e.key === "ArrowRight" && cevaplandi) klibeGit(siraNo + 1);
  else if (e.key === "ArrowLeft" && cevaplandi && siraNo > 0) klibeGit(siraNo - 1);
  else if (e.key.toLowerCase() === "r") klibiOynat();
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
