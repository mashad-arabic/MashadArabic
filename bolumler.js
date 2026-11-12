// Kelimeler (çevrilen kartlar), Eşleştirme (Arapça ↔ Türkçe) ve Harfler (alfabe + test) bölümleri.
// İçerik icerik.js'ten, ilerleme ve puan profil.js'ten (Profil) gelir.

(() => {
  const $ = (id) => document.getElementById(id);

  function karistir(dizi) {
    const d = [...dizi];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  // Kazanılan puanı sağ üstteki profil kartında göster (app.js'teki animasyon)
  function puanVer(miktar) {
    Profil.puanEkle(miktar);
    if (typeof artisGoster === "function") artisGoster(`+${miktar}`);
  }

  const aktifMi = (ad) => document.body.dataset.gorunum === ad && !document.querySelector("dialog[open]");

  // ---------- Sesli okuma (tarayıcıda Arapça ses varsa) ----------
  const Ses = (() => {
    let ses = null;
    const destek = "speechSynthesis" in window;
    function bul() {
      ses = speechSynthesis.getVoices().find((v) => (v.lang || "").toLowerCase().startsWith("ar")) || null;
      document.querySelectorAll("[data-ses]").forEach((b) => { b.hidden = !ses; });
    }
    if (destek) {
      bul();
      speechSynthesis.addEventListener("voiceschanged", bul);
    }
    return {
      oku(metin) {
        if (!ses) return;
        speechSynthesis.cancel();
        const s = new SpeechSynthesisUtterance(metin);
        s.voice = ses;
        s.lang = ses.lang;
        s.rate = 0.8;
        speechSynthesis.speak(s);
      }
    };
  })();

  window.Ses = Ses; // ana sayfadaki "günün kelimesi" de kullanır

  // ---------- Kategori çipleri (kelimeler ve eşleştirme ortak) ----------
  function cipleriCiz(kap, secili, sec, sayiYaz) {
    const secenekler = [{ id: "tumu", ad: "Tümü" }, ...KATEGORILER];
    kap.replaceChildren(...secenekler.map((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cip" + (k.id === secili ? " aktif" : "");
      b.setAttribute("aria-pressed", String(k.id === secili));
      b.textContent = k.ad;
      if (sayiYaz) {
        const s = document.createElement("small");
        s.textContent = sayiYaz(k.id);
        b.append(" ", s);
      }
      b.addEventListener("click", () => sec(k.id));
      return b;
    }));
  }

  const kategoriKelimeleri = (id) => (id === "tumu" ? KELIMELER : KELIMELER.filter((k) => k.kategori === id));

  // =========================================================
  // KELİMELER
  // =========================================================
  const kel = {
    kategori: "tumu",
    deste: [],
    kart: $("kelKart"),
  };

  function bilinenler() { return new Set(Profil.veri().kelimeBilinen); }

  function kelSayilari() {
    const b = bilinenler();
    $("kelBilinenSayi").textContent = KELIMELER.filter((k) => b.has(k.id)).length;
    $("kelToplamSayi").textContent = KELIMELER.length;
    cipleriCiz($("kelKategoriler"), kel.kategori, kelKategoriSec, (id) => {
      const liste = kategoriKelimeleri(id);
      return `${liste.filter((k) => b.has(k.id)).length}/${liste.length}`;
    });
  }

  // Deste: önce bilinmeyenler (karışık), sonra bilinenler (tekrar için)
  function desteKur() {
    const b = bilinenler();
    const liste = kategoriKelimeleri(kel.kategori);
    kel.deste = [...karistir(liste.filter((k) => !b.has(k.id))), ...karistir(liste.filter((k) => b.has(k.id)))];
    kartGoster();
  }

  function kelKategoriSec(id) {
    kel.kategori = id;
    kelSayilari();
    desteKur();
  }

  function kartGoster() {
    kel.kart.classList.remove("cevrik");
    const bitti = !kel.deste.length;
    $("kelBitti").hidden = !bitti;
    kel.kart.parentElement.hidden = bitti;
    $("kelDugmeler").hidden = bitti;
    if (bitti) { $("kelSayac").textContent = ""; return; }

    const k = kel.deste[0];
    $("kelAr").textContent = k.ar;
    $("kelAr2").textContent = k.ar;
    $("kelTr").textContent = k.tr;
    $("kelOkunus").textContent = k.okunus;
    $("kelRozet").hidden = !bilinenler().has(k.id);
    $("kelSayac").textContent = `${kel.deste.length} kart kaldı`;
  }

  function kartCevir() {
    if (!kel.deste.length) return;
    kel.kart.classList.toggle("cevrik");
  }

  // Bilinmiyor: kart 3 kart sonra yeniden gelir, "biliyorum" işareti kalkar
  function kelTekrar() {
    const k = kel.deste.shift();
    if (!k) return;
    Profil.kelimeIsaretle(k.id, false);
    kel.deste.splice(Math.min(3, kel.deste.length), 0, k);
    kelSayilari();
    kartGoster();
  }

  function kelBiliyorum() {
    const k = kel.deste.shift();
    if (!k) return;
    if (Profil.kelimeIsaretle(k.id, true)) puanVer(5); // ilk kez öğrenildiyse
    kelSayilari();
    kartGoster();
  }

  kel.kart.addEventListener("click", kartCevir);
  $("kelTekrar").addEventListener("click", kelTekrar);
  $("kelBiliyorum").addEventListener("click", kelBiliyorum);
  $("kelBastan").addEventListener("click", desteKur);
  $("kelDinle").addEventListener("click", () => { if (kel.deste[0]) Ses.oku(kel.deste[0].ar); });

  // =========================================================
  // EŞLEŞTİRME
  // =========================================================
  const ES_SAYI = 5;
  const es = { kategori: "tumu", secili: null, eslesen: 0, toplam: 0, hata: 0, basla: 0, zaman: null, bitti: false };

  const sureYaz = (sn) => sn.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function esEnIyiGoster() {
    const enIyi = Profil.veri().eslestirmeEnIyi;
    $("esEnIyi").textContent = enIyi ? `${sureYaz(enIyi)} sn` : "–";
  }

  function esKategoriSec(id) {
    es.kategori = id;
    cipleriCiz($("esKategoriler"), es.kategori, esKategoriSec);
    esYeniTur();
  }

  function esKart(k, dil) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "es-kart";
    b.dataset.id = k.id;
    if (dil === "ar") {
      b.lang = "ar";
      b.dir = "rtl";
      b.textContent = k.ar;
    } else {
      b.textContent = k.tr;
    }
    b.addEventListener("click", () => esTikla(b));
    // Yanlış eşleşmedeki sallanma bitince kırmızı çerçeve kalksın
    b.addEventListener("animationend", () => b.classList.remove("yanlis"));
    return b;
  }

  function esYeniTur() {
    clearInterval(es.zaman);
    Object.assign(es, { secili: null, eslesen: 0, hata: 0, basla: 0, zaman: null, bitti: false });
    const secilen = karistir(kategoriKelimeleri(es.kategori)).slice(0, ES_SAYI);
    es.toplam = secilen.length;
    $("esArapca").replaceChildren(...karistir(secilen).map((k) => esKart(k, "ar")));
    $("esTurkce").replaceChildren(...karistir(secilen).map((k) => esKart(k, "tr")));
    $("esSure").textContent = sureYaz(0);
    $("esHata").textContent = 0;
    $("esSonuc").hidden = true;
  }

  function esTikla(b) {
    if (es.bitti || b.disabled) return;
    if (!es.basla) {
      es.basla = performance.now();
      es.zaman = setInterval(() => {
        $("esSure").textContent = sureYaz((performance.now() - es.basla) / 1000);
      }, 100);
    }

    // İlk seçim ya da aynı sütundan başka bir kart: seçimi değiştir
    if (!es.secili || es.secili.parentElement === b.parentElement) {
      es.secili?.classList.remove("secili");
      es.secili = es.secili === b ? null : b;
      es.secili?.classList.add("secili");
      return;
    }

    const a = es.secili;
    es.secili = null;
    a.classList.remove("secili");

    if (a.dataset.id === b.dataset.id) {
      [a, b].forEach((x) => { x.classList.remove("yanlis"); x.classList.add("eslesti"); x.disabled = true; });
      es.eslesen++;
      puanVer(2);
      if (es.eslesen === es.toplam) esBitir();
    } else {
      es.hata++;
      $("esHata").textContent = es.hata;
      [a, b].forEach((x) => {
        x.classList.remove("yanlis");
        void x.offsetWidth;
        x.classList.add("yanlis");
      });
    }
  }

  function esBitir() {
    es.bitti = true;
    clearInterval(es.zaman);
    const sure = Math.round((performance.now() - es.basla) / 100) / 10;
    $("esSure").textContent = sureYaz(sure);
    const bonus = es.hata === 0 ? 15 : 10;
    puanVer(bonus);
    const rekor = Profil.eslestirmeBitti(sure);
    esEnIyiGoster();
    $("esSonucBaslik").textContent = rekor ? "Yeni rekor!" : es.hata === 0 ? "Hatasız!" : "Tamamlandı";
    $("esSonucMetin").textContent =
      `${sureYaz(sure)} saniyede, ${es.hata} hatayla bitirdin. Tur bonusu +${bonus} puan.`;
    $("esSonuc").hidden = false;
  }

  $("esYeni").addEventListener("click", esYeniTur);

  // =========================================================
  // HARFLER
  // =========================================================
  let seciliHarf = HARFLER[0];
  const ogrenilenler = () => new Set(Profil.veri().harfOgrenilen);

  function harfSayisi() {
    const o = ogrenilenler();
    $("hfOgrenilenSayi").textContent = HARFLER.filter((h) => o.has(h.id)).length;
  }

  // Harfin dört yazılışı; bağlanmayan harfler (ا د ذ ر ز و) kendinden sonrakine bitişmez
  function bicimler(h) {
    const T = "ـ"; // tatvil (bağlantı çizgisi)
    return [
      ["Tek", h.harf],
      ["Başta", h.baglanir ? h.harf + T : h.harf],
      ["Ortada", h.baglanir ? T + h.harf + T : T + h.harf],
      ["Sonda", T + h.harf]
    ];
  }

  function izgaraCiz() {
    const o = ogrenilenler();
    $("hfIzgara").replaceChildren(...HARFLER.map((h) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "harf-btn" + (h === seciliHarf ? " secili" : "") + (o.has(h.id) ? " ogrenildi" : "");
      b.setAttribute("aria-label", `${h.ad}${o.has(h.id) ? " (öğrenildi)" : ""}`);
      const ar = document.createElement("span");
      ar.className = "hb-harf";
      ar.lang = "ar";
      ar.textContent = h.harf;
      const ad = document.createElement("span");
      ad.className = "hb-ad";
      ad.dir = "ltr";
      ad.textContent = h.ad;
      b.append(ar, ad);
      b.addEventListener("click", () => { seciliHarf = h; izgaraCiz(); detayCiz(); });
      return b;
    }));
  }

  function detayCiz() {
    const h = seciliHarf;
    const ogrenildi = ogrenilenler().has(h.id);
    $("hfBuyuk").textContent = h.harf;
    $("hfAd").textContent = h.ad;
    $("hfSes").textContent = `Sesi: ${h.ses}`;
    $("hfBicimler").replaceChildren(...bicimler(h).map(([etiket, yazi]) => {
      const d = document.createElement("div");
      d.className = "bicim";
      const s = document.createElement("span");
      s.lang = "ar";
      s.textContent = yazi;
      const k = document.createElement("small");
      k.textContent = etiket;
      d.append(s, k);
      return d;
    }));
    $("hfOrnekAr").textContent = h.ornek;
    $("hfOrnekTr").textContent = h.ornekTr;
    $("hfOrnekOkunus").textContent = h.ornekOkunus;
    const btn = $("hfOgrendim");
    btn.textContent = ogrenildi ? "Öğrenildi ✓" : "Öğrendim";
    btn.classList.toggle("tamam", ogrenildi);
    btn.title = ogrenildi ? "İşareti kaldırmak için tıkla" : "";
  }

  $("hfOgrendim").addEventListener("click", () => {
    const ogrenildi = ogrenilenler().has(seciliHarf.id);
    if (Profil.harfIsaretle(seciliHarf.id, !ogrenildi)) puanVer(2);
    harfSayisi();
    izgaraCiz();
    detayCiz();
  });
  $("hfDinle").addEventListener("click", () => Ses.oku(seciliHarf.ornek));

  // ---------- Harf testi ----------
  const test = { harf: null, cevaplandi: false, dogru: 0, toplam: 0 };

  function hfSekme(testMi) {
    $("hfSekmeAlfabe").classList.toggle("aktif", !testMi);
    $("hfSekmeTest").classList.toggle("aktif", testMi);
    $("hfAlfabe").hidden = testMi;
    $("hfTest").hidden = !testMi;
    if (testMi && !test.harf) testYeni();
  }
  $("hfSekmeAlfabe").addEventListener("click", () => hfSekme(false));
  $("hfSekmeTest").addEventListener("click", () => hfSekme(true));

  function testYeni() {
    const onceki = test.harf;
    do { test.harf = HARFLER[Math.floor(Math.random() * HARFLER.length)]; } while (test.harf === onceki);
    test.cevaplandi = false;
    const secenekler = karistir([test.harf, ...karistir(HARFLER.filter((h) => h !== test.harf)).slice(0, 3)]);
    $("hfTestHarf").textContent = test.harf.harf;
    $("hfTestSecenekler").replaceChildren(...secenekler.map((h, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "test-sec";
      b.dataset.dogru = String(h === test.harf);
      b.innerHTML = `<kbd>${i + 1}</kbd> `;
      b.append(h.ad);
      b.addEventListener("click", () => testCevap(b));
      return b;
    }));
    $("hfTestSonraki").hidden = true;
  }

  function testCevap(b) {
    if (test.cevaplandi) return;
    test.cevaplandi = true;
    test.toplam++;
    const dogru = b.dataset.dogru === "true";
    if (dogru) { test.dogru++; puanVer(3); }
    $("hfTestSecenekler").querySelectorAll(".test-sec").forEach((x) => {
      x.disabled = true;
      if (x.dataset.dogru === "true") x.classList.add("dogru");
      else if (x === b) x.classList.add("yanlis");
      else x.classList.add("soluk");
    });
    $("hfTestSkor").textContent = `Bu oturumda ${test.toplam} sorudan ${test.dogru} doğru.`;
    $("hfTestSonraki").hidden = false;
    $("hfTestSonraki").focus();
  }
  $("hfTestSonraki").addEventListener("click", testYeni);

  // ---------- Klavye kısayolları ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches("input, textarea")) return;

    if (aktifMi("kelimeler")) {
      if (e.key === " " && !e.target.closest("button, a")) { e.preventDefault(); kartCevir(); }
      else if (e.key === "1") kelTekrar();
      else if (e.key === "2") kelBiliyorum();
    } else if (aktifMi("harfler") && !$("hfTest").hidden) {
      const n = Number(e.key);
      const secenekler = $("hfTestSecenekler").querySelectorAll(".test-sec");
      if (n >= 1 && n <= secenekler.length) secenekler[n - 1].click();
      else if (e.key === "Enter" && test.cevaplandi && e.target === document.body) testYeni();
    }
  });

  // ---------- Başlat ----------
  kelSayilari();
  desteKur();
  cipleriCiz($("esKategoriler"), es.kategori, esKategoriSec);
  esEnIyiGoster();
  esYeniTur();
  harfSayisi();
  izgaraCiz();
  detayCiz();

  // Hesaptan profil gelince (giriş/çıkış) sayıları tazele
  document.addEventListener("profil-degisti", () => {
    kelSayilari();
    harfSayisi();
    esEnIyiGoster();
  });
  // Eşleştirmeden çıkılırsa sayaç boşuna dönmesin
  document.addEventListener("gorunum-degisti", (e) => {
    if (e.detail !== "eslestirme" && es.basla && !es.bitti) esYeniTur();
  });
})();
