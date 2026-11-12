// Profil sayfası: ad, fotoğraf/avatar, seviye, istatistikler ve son cevaplar.
// (Hesap bölümünü hesap.js yönetir.)

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    avatar: $("pAvatar"), ad: $("pAd"), toplam: $("pToplam"), avatarlar: $("pAvatarlar"),
    seviye: $("pSeviye"), seviyeKalan: $("pSeviyeKalan"), seviyeCubuk: $("pSeviyeCubuk"),
    fotoDosyalar: [$("pFotoDosya"), $("pFotoDosya2")], fotoKaldir: $("pFotoKaldir"), fotoMesaj: $("pFotoMesaj"),
    bugun: $("pBugun"), gunSeri: $("pGunSeri"), enIyi: $("pEnIyi"),
    cevaplanan: $("pCevaplanan"), dogruluk: $("pDogruluk"),
    son: $("pSon"), sifirla: $("pSifirla")
  };

  // ---------- Fotoğraf ----------
  function fotoMesaj(metin, tur = "hata") {
    ui.fotoMesaj.textContent = metin;
    ui.fotoMesaj.className = `mesaj ${tur}`;
    ui.fotoMesaj.hidden = !metin;
  }

  async function fotoSecildi(girdi) {
    const dosya = girdi.files[0];
    girdi.value = ""; // aynı dosya yeniden seçilebilsin
    if (!dosya) return;
    try {
      await Profil.fotoDosyadan(dosya);
      fotoMesaj("Fotoğrafın güncellendi.", "basari");
    } catch (h) {
      fotoMesaj(h.message);
    }
  }

  ui.fotoDosyalar.forEach((girdi) => girdi.addEventListener("change", () => fotoSecildi(girdi)));
  ui.fotoKaldir.addEventListener("click", () => {
    Profil.avatarDegistir(Profil.veri().avatar);
    fotoMesaj("");
  });

  // ---------- Çizim ----------
  function ciz() {
    const p = Profil.veri();
    const fotoVar = fotoGecerli(p.foto);

    ui.avatar.innerHTML = avatarHtml(p.avatar, p.foto);
    if (document.activeElement !== ui.ad) ui.ad.value = p.ad;
    ui.toplam.textContent = p.toplamPuan.toLocaleString("tr-TR");
    ui.fotoKaldir.hidden = !fotoVar;

    const sv = Profil.seviye();
    ui.seviye.textContent = `Seviye ${sv.n}`;
    ui.seviyeKalan.textContent = `Sonraki seviyeye ${sv.kalan.toLocaleString("tr-TR")} puan`;
    ui.seviyeCubuk.style.width = `${Math.round(sv.oran * 100)}%`;

    ui.avatarlar.replaceChildren(...AVATARLAR.map((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "avatar-sec" + (!fotoVar && a.id === p.avatar ? " secili" : "");
      b.title = a.ad;
      b.setAttribute("aria-label", a.ad);
      b.innerHTML = avatarSvg(a.id);
      b.addEventListener("click", () => { Profil.avatarDegistir(a.id); fotoMesaj(""); });
      return b;
    }));

    ui.bugun.textContent = Profil.bugunkuPuan();
    ui.gunSeri.textContent = Profil.gunSerisi();
    ui.enIyi.textContent = p.enIyiSeri;
    ui.cevaplanan.textContent = p.cevaplanan;
    ui.dogruluk.textContent = p.cevaplanan ? `%${Math.round((p.dogru / p.cevaplanan) * 100)}` : "–";

    if (!p.son.length) {
      const li = document.createElement("li");
      li.className = "bos";
      li.textContent = "Henüz cevap yok. Oyuna dönüp birkaç klip izle.";
      ui.son.replaceChildren(li);
      return;
    }
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

  ui.ad.addEventListener("input", () => Profil.adDegistir(ui.ad.value));

  ui.sifirla.addEventListener("click", () => {
    if (confirm("Tüm puan ve istatistikler silinsin mi? Ad ve fotoğraf kalır.")) Profil.sifirla();
  });

  document.addEventListener("profil-degisti", ciz);
  ciz();
})();
