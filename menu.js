// Uygulama iskeleti: sol menüden bölüm seçimi (#dinleme, #kelimeler, #eslestirme, #harfler),
// sağ üstteki profil açılır menüsü, "İlerlemem" penceresi ve günlük hedef halkası.

(() => {
  const $ = (id) => document.getElementById(id);
  const GORUNUMLER = ["ana", "dinleme", "kelimeler", "eslestirme", "harfler"];
  const HALKA_CEVRE = 2 * Math.PI * 18; // halka yarıçapı 18

  // ---------- Bölüm seçimi ----------
  function gorunumSec(ad) {
    if (!GORUNUMLER.includes(ad)) ad = "ana";
    const onceki = document.body.dataset.gorunum;
    document.body.dataset.gorunum = ad;
    document.querySelectorAll("section.gorunum").forEach((s) => { s.hidden = s.dataset.gorunum !== ad; });
    document.querySelectorAll(".menu-oge").forEach((a) => {
      const aktif = a.dataset.gorunum === ad;
      a.classList.toggle("aktif", aktif);
      if (aktif) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    try { localStorage.setItem("voarabic-gorunum", ad); } catch {}
    if (onceki !== ad) {
      window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent("gorunum-degisti", { detail: ad }));
    }
  }

  window.addEventListener("hashchange", () => gorunumSec(location.hash.slice(1)));

  let ilk = location.hash.slice(1);
  if (!GORUNUMLER.includes(ilk)) {
    try { ilk = localStorage.getItem("voarabic-gorunum") || "ana"; } catch { ilk = "ana"; }
  }
  document.body.dataset.gorunum = ""; // ilk seçimde olay gitsin
  gorunumSec(ilk);

  // ---------- Halka (günlük hedef) ----------
  function halkaDoldur(daire, oran) {
    daire.style.strokeDasharray = HALKA_CEVRE;
    daire.style.strokeDashoffset = HALKA_CEVRE * (1 - Math.min(1, Math.max(0, oran)));
  }

  function hedefGuncelle() {
    const bugun = Profil.bugunkuPuan();
    const hedef = Profil.GUNLUK_HEDEF;
    $("hedefPuan").textContent = bugun;
    $("hedefToplam").textContent = hedef;
    $("hedefYazi").textContent = bugun >= hedef ? "Günlük hedef tamam" : "Günlük hedef";
    $("menuHedef").classList.toggle("tamam", bugun >= hedef);
    halkaDoldur($("hedefHalka"), bugun / hedef);
  }

  // ---------- Profil açılır menüsü ----------
  const cip = $("profilCip");
  const acilir = $("profilAcilir");

  function menuAc(ac) {
    acilir.hidden = !ac;
    cip.setAttribute("aria-expanded", String(ac));
    if (ac) {
      acilirGuncelle();
      acilir.querySelector(".acilir-oge:not([hidden])")?.focus();
    }
  }

  function acilirGuncelle() {
    const p = Profil.veri();
    $("acAvatar").innerHTML = avatarHtml(p.avatar, p.foto);
    $("acAd").textContent = p.ad || "Misafir";
    $("acSeviye").textContent = `Seviye ${Profil.seviye().n} · ${p.toplamPuan.toLocaleString("tr-TR")} puan`;
  }

  cip.addEventListener("click", () => menuAc(acilir.hidden));
  document.addEventListener("click", (e) => {
    if (!acilir.hidden && !e.target.closest("#profilMenu")) menuAc(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !acilir.hidden) { menuAc(false); cip.focus(); }
  });

  // ---------- İlerleme penceresi ----------
  const pencere = $("ilerlemePencere");

  const sureYaz = (sn) => sn.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function pencereDoldur() {
    const p = Profil.veri();
    const sv = Profil.seviye();
    $("ipAvatar").innerHTML = avatarHtml(p.avatar, p.foto);
    $("ipAd").textContent = p.ad || "Misafir";
    $("ipSeviye").textContent = `Seviye ${sv.n}`;
    $("ipPuan").textContent = p.toplamPuan.toLocaleString("tr-TR");
    $("ipSeviyeCubuk").style.width = `${Math.round(sv.oran * 100)}%`;
    $("ipSeviyeKalan").textContent = `Seviye ${sv.n + 1} için ${sv.kalan.toLocaleString("tr-TR")} puan daha.`;

    const bugun = Profil.bugunkuPuan();
    const hedef = Profil.GUNLUK_HEDEF;
    $("ipBugun").textContent = bugun;
    $("ipHedef").textContent = hedef;
    $("ipHedefYazi").textContent = bugun >= hedef
      ? "Bugünkü hedefini tamamladın. Gün serin devam ediyor."
      : `Hedefe ${hedef - bugun} puan kaldı. Bir tur kelime ya da eşleştirme yetebilir.`;
    halkaDoldur($("ipHedefHalka"), bugun / hedef);

    $("ipGunSeri").textContent = Profil.gunSerisi();
    $("ipEnIyi").textContent = p.enIyiSeri;
    $("ipCevaplanan").textContent = p.cevaplanan;
    $("ipDogruluk").textContent = p.cevaplanan ? `%${Math.round((p.dogru / p.cevaplanan) * 100)}` : "–";

    const kelimeIdleri = new Set(KELIMELER.map((k) => k.id));
    const kel = p.kelimeBilinen.filter((id) => kelimeIdleri.has(id)).length;
    $("ipKelCubuk").style.width = `${Math.round((kel / KELIMELER.length) * 100)}%`;
    $("ipKelDeger").textContent = `${kel} / ${KELIMELER.length}`;

    const harfIdleri = new Set(HARFLER.map((h) => h.id));
    const harf = p.harfOgrenilen.filter((id) => harfIdleri.has(id)).length;
    $("ipHarfCubuk").style.width = `${Math.round((harf / HARFLER.length) * 100)}%`;
    $("ipHarfDeger").textContent = `${harf} / ${HARFLER.length}`;

    $("ipEsDeger").textContent = p.eslestirmeEnIyi
      ? `En iyi süren ${sureYaz(p.eslestirmeEnIyi)} sn`
      : "Henüz oynamadın";

    // Son 7 günün puan çubukları
    const gunler = Profil.son7Gun();
    const enCok = Math.max(hedef, ...gunler.map((g) => g.puan));
    $("ipHafta").replaceChildren(...gunler.map((g) => {
      const kutu = document.createElement("div");
      kutu.className = "gun" + (g.bugun ? " bugun" : "") + (g.puan >= hedef ? " hedefe-ulasti" : "");
      kutu.title = `${g.ad}: ${g.puan} puan`;
      const deger = document.createElement("b");
      deger.textContent = g.puan || "";
      const cubuk = document.createElement("i");
      cubuk.style.height = `${Math.max(4, Math.round((g.puan / enCok) * 100))}%`;
      const ad = document.createElement("small");
      ad.textContent = g.bugun ? "Bugün" : g.ad;
      kutu.append(deger, cubuk, ad);
      return kutu;
    }));
  }

  function pencereAc() {
    menuAc(false);
    pencereDoldur();
    pencere.showModal();
  }

  $("acIlerleme").addEventListener("click", pencereAc);
  $("menuHedef").addEventListener("click", pencereAc);
  $("ipKapat").addEventListener("click", () => pencere.close());
  $("ipDevam").addEventListener("click", () => pencere.close());
  // Pencerenin dışına (karartılmış alana) tıklayınca kapansın
  pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });

  // ---------- Bildirim baloncuğu ----------
  let bildirimZaman = null;
  function bildir(metin, tur = "basari") {
    const b = $("bildirim");
    // Açık bir pencere varsa onun içinde göster (yoksa karartmanın altında kalır)
    (document.querySelector("dialog[open]") || document.body).append(b);
    b.textContent = metin;
    b.className = `bildirim ${tur}`;
    b.hidden = false;
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(() => { b.hidden = true; }, 3200);
  }

  // ---------- Fotoğraf yükleme (ana sayfa, menü, pencere) ----------
  document.querySelectorAll("input[data-foto-yukle]").forEach((girdi) => {
    girdi.addEventListener("change", async () => {
      const dosya = girdi.files[0];
      girdi.value = ""; // aynı dosya yeniden seçilebilsin
      if (!dosya) return;
      menuAc(false);
      try {
        await Profil.fotoDosyadan(dosya);
        bildir("Fotoğrafın güncellendi.");
      } catch (h) {
        bildir(h.message, "hata");
      }
    });
  });
  // Menüdeki "Fotoğrafını değiştir" klavyeyle de açılsın
  document.querySelectorAll("label.acilir-oge").forEach((l) => l.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); l.querySelector("input").click(); }
  }));

  // ---------- Ana sayfa (Bugün) ----------
  // Saate göre Arapça selam
  function selam() {
    const s = new Date().getHours();
    if (s >= 5 && s < 11) return ["صَبَاحُ الْخَيْرِ", "Günaydın"];
    if (s >= 11 && s < 17) return ["مَرْحَبًا", "Merhaba"];
    if (s >= 17 && s < 22) return ["مَسَاءُ الْخَيْرِ", "İyi akşamlar"];
    return ["تُصْبِحُ عَلَى خَيْرٍ", "İyi geceler"];
  }

  // Günün kelimesi: her gün sıradaki kelime (herkes aynı günde aynı kelimeyi görür)
  function gununKelimesi() {
    const gun = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    return KELIMELER[gun % KELIMELER.length];
  }

  function anaCiz() {
    const p = Profil.veri();
    const sv = Profil.seviye();
    const [ar, tr] = selam();
    $("anaAvatar").innerHTML = avatarHtml(p.avatar, p.foto);
    $("anaSelamAr").textContent = ar;
    $("anaSelam").textContent = p.ad ? `${tr}, ${p.ad}` : tr;
    const gunSeri = Profil.gunSerisi();
    $("anaAlt").textContent = `Seviye ${sv.n} · ${p.toplamPuan.toLocaleString("tr-TR")} puan`
      + (gunSeri ? ` · ${gunSeri} gündür aralıksız çalışıyorsun` : " · Bugün ilk adımını at");

    const bugun = Profil.bugunkuPuan();
    const hedef = Profil.GUNLUK_HEDEF;
    $("anaHedefPuan").textContent = bugun;
    $("anaHedefToplam").textContent = hedef;
    $("anaHedefYazi").textContent = bugun >= hedef ? "Hedef tamam" : "Günlük hedef";
    halkaDoldur($("anaHedefHalka"), bugun / hedef);

    $("anaDinleme").textContent = p.cevaplanan
      ? `${p.cevaplanan} klip · %${Math.round((p.dogru / p.cevaplanan) * 100)} doğru`
      : "Henüz klip cevaplamadın";
    const kelimeIdleri = new Set(KELIMELER.map((k) => k.id));
    const kel = p.kelimeBilinen.filter((id) => kelimeIdleri.has(id)).length;
    $("anaKelCubuk").style.width = `${Math.round((kel / KELIMELER.length) * 100)}%`;
    $("anaKel").textContent = `${kel} / ${KELIMELER.length} kelime`;
    const harfIdleri = new Set(HARFLER.map((h) => h.id));
    const harf = p.harfOgrenilen.filter((id) => harfIdleri.has(id)).length;
    $("anaHarfCubuk").style.width = `${Math.round((harf / HARFLER.length) * 100)}%`;
    $("anaHarf").textContent = `${harf} / ${HARFLER.length} harf`;
    $("anaEs").textContent = p.eslestirmeEnIyi ? `Rekorun ${sureYaz(p.eslestirmeEnIyi)} sn` : "Rekorun yok, ilk turu dene";

    const gk = gununKelimesi();
    $("gkAr").textContent = gk.ar;
    $("gkTr").textContent = gk.tr;
    $("gkOkunus").textContent = `Okunuşu: ${gk.okunus}`;
  }

  $("anaHedef").addEventListener("click", pencereAc);
  $("gkDinle").addEventListener("click", () => { if (window.Ses) Ses.oku(gununKelimesi().ar); });
  document.addEventListener("gorunum-degisti", (e) => { if (e.detail === "ana") anaCiz(); });

  // ---------- Profil değişince ----------
  document.addEventListener("profil-degisti", () => {
    hedefGuncelle();
    if (document.body.dataset.gorunum === "ana") anaCiz();
    if (!acilir.hidden) acilirGuncelle();
    if (pencere.open) pencereDoldur();
  });
  hedefGuncelle();
  anaCiz();
})();
