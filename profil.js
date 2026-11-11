// Profil: ad, avatar ve istatistikler. Her zaman bu tarayıcıda (localStorage)
// saklanır; hesaba giriş yapılmışsa hesap.js değişiklikleri Firebase'e de yazar.

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
    son: []       // son cevaplar: { arapca, ceviri, dogru }
  });

  let p = yukle();

  function yukle() {
    const v = varsayilan();
    try {
      const kayit = JSON.parse(localStorage.getItem(ANAHTAR));
      if (kayit) {
        Object.assign(v, kayit);
        if (ESKI_EMOJI[v.avatar]) v.avatar = ESKI_EMOJI[v.avatar];
      }
      else v.enIyiSeri = Number(localStorage.getItem("voarabic-en-iyi-seri")) || 0; // eski kayıt
    } catch {}
    return v;
  }

  const dinleyiciler = [];   // profil değişince haber verilecekler (ör. hesap senkronu)

  function yerelKaydet() {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(p)); } catch {}
  }

  function kaydet() {
    yerelKaydet();
    dinleyiciler.forEach((f) => f(veri()));
  }

  const veri = () => JSON.parse(JSON.stringify(p));

  // Dışarıdan (ör. hesaptan) gelen profili yerleştir
  function yerlestir(yeni) {
    p = Object.assign(varsayilan(), yeni || {});
    yerelKaydet();
    ustuGuncelle();
    if (ui.panel.open) paneliDoldur();
    document.dispatchEvent(new Event("profil-degisti"));
  }

  // Çıkış yapınca bu tarayıcıda boş bir misafir profiliyle devam et
  function temizle() {
    yerlestir(varsayilan());
  }

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

  // ---------- Dışarıya açık işlemler ----------
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
    ustuGuncelle();
  }

  const enIyiSeri = () => p.enIyiSeri;

  // ---------- Arayüz ----------
  const $ = (id) => document.getElementById(id);
  const ui = {
    btn: $("profilBtn"), btnAvatar: $("profilBtnAvatar"), btnAd: $("profilBtnAd"),
    panel: $("profilPanel"), kapat: $("pKapat"),
    avatar: $("pAvatar"), ad: $("pAd"), avatarlar: $("pAvatarlar"),
    toplam: $("pToplam"), bugun: $("pBugun"), gunSeri: $("pGunSeri"),
    cevaplanan: $("pCevaplanan"), dogruluk: $("pDogruluk"), enIyi: $("pEnIyi"),
    son: $("pSon"), sifirla: $("pSifirla")
  };

  function ustuGuncelle() {
    ui.btnAvatar.innerHTML = avatarSvg(p.avatar);
    ui.btnAd.textContent = p.ad || "Profil";
  }

  function paneliDoldur() {
    ui.avatar.innerHTML = avatarSvg(p.avatar);
    ui.ad.value = p.ad;

    ui.avatarlar.replaceChildren(...AVATARLAR.map((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "avatar-sec" + (a.id === p.avatar ? " secili" : "");
      b.title = a.ad;
      b.innerHTML = avatarSvg(a.id);
      b.addEventListener("click", () => {
        p.avatar = a.id;
        kaydet();
        ustuGuncelle();
        paneliDoldur();
      });
      return b;
    }));

    ui.toplam.textContent = p.toplamPuan;
    ui.bugun.textContent = p.gunluk[gunAnahtari(new Date())] || 0;
    ui.gunSeri.textContent = gunSerisi();
    ui.cevaplanan.textContent = p.cevaplanan;
    ui.dogruluk.textContent = p.cevaplanan ? `%${Math.round((p.dogru / p.cevaplanan) * 100)}` : "–";
    ui.enIyi.textContent = p.enIyiSeri;

    if (!p.son.length) {
      const li = document.createElement("li");
      li.className = "bos";
      li.textContent = "Henüz cevap yok.";
      ui.son.replaceChildren(li);
    } else {
      ui.son.replaceChildren(...p.son.map((s) => {
        const li = document.createElement("li");
        li.className = s.dogru ? "dogru" : "yanlis";
        const isaret = document.createElement("span");
        isaret.className = "isaret";
        isaret.textContent = s.dogru ? "✓" : "✗";
        const metin = document.createElement("div");
        const ar = document.createElement("p");
        ar.className = "son-ar";
        ar.dir = "rtl";
        ar.lang = "ar";
        ar.textContent = s.arapca;
        const tr = document.createElement("p");
        tr.className = "son-tr";
        tr.textContent = s.ceviri;
        metin.append(ar, tr);
        li.append(isaret, metin);
        return li;
      }));
    }
  }

  ui.btn.addEventListener("click", () => {
    paneliDoldur();
    ui.panel.showModal();
  });
  ui.kapat.addEventListener("click", () => ui.panel.close());
  // Panelin dışına (karartılmış alana) tıklayınca kapat
  ui.panel.addEventListener("click", (e) => { if (e.target === ui.panel) ui.panel.close(); });

  ui.ad.addEventListener("input", () => {
    p.ad = ui.ad.value.trim();
    kaydet();
    ustuGuncelle();
  });

  ui.sifirla.addEventListener("click", () => {
    if (!confirm("Tüm puan ve istatistikler silinsin mi? Ad ve avatar kalır.")) return;
    const { ad, avatar } = p;
    p = Object.assign(varsayilan(), { ad, avatar });
    kaydet();
    paneliDoldur();
    document.dispatchEvent(new Event("profil-sifirlandi"));
  });

  ustuGuncelle();

  return {
    cevapKaydet, enIyiSeri, veri, yerlestir, temizle,
    degisince: (f) => dinleyiciler.push(f),
    ad: () => p.ad,
    adAyarla: (ad) => { if (ad && !p.ad) { p.ad = ad; kaydet(); ustuGuncelle(); } }
  };
})();
