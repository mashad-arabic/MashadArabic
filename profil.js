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
    toplamPuan: 0,
    cevaplanan: 0,
    dogru: 0,
    enIyiSeri: 0,
    gunluk: {},   // { "2026-11-11": puan }
    son: [],      // son cevaplar: { arapca, ceviri, dogru }
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
    avatar.innerHTML = avatarSvg(p.avatar);
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
  function avatarDegistir(id) { p.avatar = id; kaydet(); }
  function adAyarla(ad) { if (ad && !p.ad) adDegistir(ad); } // sadece ad boşsa

  // İstatistikleri sıfırla, ad ve avatar kalsın
  function sifirla() {
    const { ad, avatar } = p;
    p = Object.assign(varsayilan(), { ad, avatar });
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
    cevapKaydet, adDegistir, avatarDegistir, adAyarla, sifirla, yerlestir, temizle, sahipAyarla,
    degisince: (f) => dinleyiciler.push(f)
  };
})();
