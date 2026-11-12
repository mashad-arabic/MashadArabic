// Profil verisi: ad, avatar ve istatistikler. Her zaman bu tarayıcıda (localStorage)
// saklanır; hesaba giriş yapılmışsa hesap.js değişiklikleri Firebase'e de yazar.
// Ayrıca sağ üstteki profil kartını (avatar, ad, puan) günceller.

const Profil = (() => {
  const ANAHTAR = "voarabic-profil";
  // Eski sürümde avatar emoji olarak saklanıyordu; çizilmiş avatarın kimliğine çevir
  const ESKI_EMOJI = { "🐪": "deve", "🦅": "kartal", "🌙": "hilal", "⭐": "yildiz", "🌴": "hurma",
    "📚": "kitap", "🦁": "aslan", "🐎": "at", "🕌": "cami", "☕": "kahve" };
  const SON_SAYISI = 10;

  const varsayilan = () => ({
    ad: "",
    avatar: AVATARLAR[0].id,
    foto: "",     // öğrencinin yüklediği fotoğraf (küçültülmüş JPEG, data: adresi)
    toplamPuan: 0,
    cevaplanan: 0,
    dogru: 0,
    enIyiSeri: 0,
    gunluk: {},   // { "2026-11-11": puan }
    son: [],      // son cevaplar: { arapca, ceviri, dogru }
    kelimeBilinen: [],   // "biliyorum" denen kelimelerin kimlikleri
    harfOgrenilen: [],   // "öğrendim" denen harflerin kimlikleri
    eslestirmeEnIyi: 0,  // eşleştirme oyununda en kısa süre (sn, 0 = henüz yok)
    sahip: null,  // bu verinin ait olduğu hesabın uid'si (misafirse null)
    zaman: 0      // son değişiklik zamanı (hesapla eşitlemede yenisi seçilir)
  });

  let p = yukle();
  const dinleyiciler = [];   // profil değişince haber verilecekler (ör. hesap senkronu)

  function yukle() {
    const v = varsayilan();
    try {
      const kayit = JSON.parse(localStorage.getItem(ANAHTAR));
      if (kayit) Object.assign(v, kayit);
      else v.enIyiSeri = Number(localStorage.getItem("voarabic-en-iyi-seri")) || 0; // eski kayıt
    } catch {}
    if (ESKI_EMOJI[v.avatar]) v.avatar = ESKI_EMOJI[v.avatar];
    return v;
  }

  function yerelKaydet() {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(p)); } catch {}
  }

  // Kaydet, ekranı tazele ve dinleyicilere (hesap senkronu) haber ver
  function kaydet() {
    p.zaman = Date.now();
    yerelKaydet();
    cipGuncelle();
    document.dispatchEvent(new Event("profil-degisti"));
    dinleyiciler.forEach((f) => f(veri()));
  }

  const veri = () => JSON.parse(JSON.stringify(p));

  function gunAnahtari(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Bugünden (bugün oynanmadıysa dünden) geriye kesintisiz oynanan gün sayısı
  function gunSerisi() {
    const d = new Date();
    if (!(gunAnahtari(d) in p.gunluk)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (gunAnahtari(d) in p.gunluk) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  // ---------- Sağ üstteki profil kartı ----------
  function cipGuncelle() {
    const avatar = document.getElementById("cipAvatar");
    if (!avatar) return;
    avatar.innerHTML = avatarHtml(p.avatar, p.foto);
    document.getElementById("cipAd").textContent = p.ad || "Misafir";
    document.getElementById("cipPuan").textContent = p.toplamPuan.toLocaleString("tr-TR");
  }

  // ---------- İşlemler ----------
  function cevapKaydet(klip, dogruMu, kazanc, seri) {
    const bugun = gunAnahtari(new Date());
    p.cevaplanan++;
    if (dogruMu) p.dogru++;
    p.toplamPuan += kazanc;
    p.gunluk[bugun] = (p.gunluk[bugun] || 0) + kazanc;
    if (seri > p.enIyiSeri) p.enIyiSeri = seri;
    p.son.unshift({ arapca: klip.arapca, ceviri: klip.dogru, dogru: dogruMu });
    p.son.length = Math.min(p.son.length, SON_SAYISI);
    kaydet();
  }

  function adDegistir(ad) { p.ad = ad.trim().slice(0, 24); kaydet(); }
  // Hazır avatar seçilince yüklenen fotoğraf bırakılır
  function avatarDegistir(id) { p.avatar = id; p.foto = ""; kaydet(); }
  function fotoDegistir(foto) { if (fotoGecerli(foto)) { p.foto = foto; kaydet(); } }
  function adAyarla(ad) { if (ad && !p.ad) adDegistir(ad); } // sadece ad boşsa

  // Öğrencinin seçtiği resmi ortadan kare kırpar, 256×256 JPEG'e küçültür (≈10–40 KB)
  // ve profil fotoğrafı yapar. Böylece hem tarayıcıda hem hesapta (Firestore) rahatça saklanır.
  // Hata olursa öğrenciye gösterilecek mesajla reddeder.
  const FOTO_BOYUT = 256;
  function fotoDosyadan(dosya) {
    if (!dosya || !dosya.type.startsWith("image/"))
      return Promise.reject(new Error("Lütfen bir resim dosyası seç (JPG, PNG ya da WebP)."));
    if (dosya.size > 15 * 1024 * 1024)
      return Promise.reject(new Error("Resim çok büyük. 15 MB'tan küçük bir resim seç."));
    return new Promise((tamam, hata) => {
      const adres = URL.createObjectURL(dosya);
      const resim = new Image();
      resim.onload = () => {
        const kenar = Math.min(resim.naturalWidth, resim.naturalHeight);
        const tuval = document.createElement("canvas");
        tuval.width = tuval.height = FOTO_BOYUT;
        const ctx = tuval.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(resim,
          (resim.naturalWidth - kenar) / 2, (resim.naturalHeight - kenar) / 2, kenar, kenar,
          0, 0, FOTO_BOYUT, FOTO_BOYUT);
        URL.revokeObjectURL(adres);
        fotoDegistir(tuval.toDataURL("image/jpeg", 0.85));
        tamam();
      };
      resim.onerror = () => {
        URL.revokeObjectURL(adres);
        hata(new Error("Bu resim açılamadı. Başka bir resim dene."));
      };
      resim.src = adres;
    });
  }

  // Kelime, eşleştirme ve harf bölümlerinden gelen puan
  function puanEkle(kazanc) {
    if (!(kazanc > 0)) return;
    const bugun = gunAnahtari(new Date());
    p.toplamPuan += kazanc;
    p.gunluk[bugun] = (p.gunluk[bugun] || 0) + kazanc;
    kaydet();
  }

  // Listeye ekle/çıkar; yeni eklendiyse true döner
  function isaretle(liste, id, var_) {
    const i = p[liste].indexOf(id);
    if (var_ && i === -1) { p[liste].push(id); kaydet(); return true; }
    if (!var_ && i !== -1) { p[liste].splice(i, 1); kaydet(); }
    return false;
  }

  function eslestirmeBitti(sure) {
    if (!p.eslestirmeEnIyi || sure < p.eslestirmeEnIyi) { p.eslestirmeEnIyi = sure; kaydet(); return true; }
    return false;
  }

  // Seviye n için gereken toplam puan: 50·n·(n−1) → 1: 0, 2: 100, 3: 300, 4: 600 …
  const seviyeEsigi = (n) => 50 * n * (n - 1);
  function seviye() {
    let n = 1;
    while (p.toplamPuan >= seviyeEsigi(n + 1)) n++;
    const alt = seviyeEsigi(n), ust = seviyeEsigi(n + 1);
    return { n, oran: (p.toplamPuan - alt) / (ust - alt), kalan: ust - p.toplamPuan };
  }

  // Son 7 günün puanları (eskiden yeniye)
  function son7Gun() {
    const gunler = [];
    const d = new Date();
    d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) {
      gunler.push({
        ad: d.toLocaleDateString("tr-TR", { weekday: "short" }),
        puan: p.gunluk[gunAnahtari(d)] || 0,
        bugun: i === 6
      });
      d.setDate(d.getDate() + 1);
    }
    return gunler;
  }

  // İstatistikleri sıfırla, ad ve avatar kalsın
  function sifirla() {
    const { ad, avatar, foto } = p;
    p = Object.assign(varsayilan(), { ad, avatar, foto });
    kaydet();
    document.dispatchEvent(new Event("profil-sifirlandi"));
  }

  // Dışarıdan (ör. hesaptan) gelen profili yerleştir — hesaba geri yazılmaz
  function yerlestir(yeni) {
    p = Object.assign(varsayilan(), yeni || {});
    if (ESKI_EMOJI[p.avatar]) p.avatar = ESKI_EMOJI[p.avatar];
    yerelKaydet();
    cipGuncelle();
    document.dispatchEvent(new Event("profil-degisti"));
  }

  // Çıkış yapınca bu tarayıcıda boş bir misafir profiliyle devam et
  const temizle = () => yerlestir(varsayilan());

  // Yerel veriyi bir hesaba bağla (hesaba yazmadan önce)
  function sahipAyarla(uid) { p.sahip = uid; yerelKaydet(); }

  cipGuncelle();

  return {
    veri, gunSerisi, bugunkuPuan: () => p.gunluk[gunAnahtari(new Date())] || 0,
    enIyiSeri: () => p.enIyiSeri,
    GUNLUK_HEDEF: 50,
    puanEkle, seviye, son7Gun, eslestirmeBitti, fotoDosyadan,
    kelimeIsaretle: (id, biliyor) => isaretle("kelimeBilinen", id, biliyor),
    harfIsaretle: (id, ogrendi) => isaretle("harfOgrenilen", id, ogrendi),
    cevapKaydet, adDegistir, avatarDegistir, fotoDegistir, adAyarla, sifirla, yerlestir, temizle, sahipAyarla,
    degisince: (f) => dinleyiciler.push(f)
  };
})();
