// Profil sayfası: ad, avatar, istatistikler ve son cevaplar.
// (Hesap bölümünü hesap.js yönetir.)

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    avatar: $("pAvatar"), ad: $("pAd"), toplam: $("pToplam"), avatarlar: $("pAvatarlar"),
    bugun: $("pBugun"), gunSeri: $("pGunSeri"), enIyi: $("pEnIyi"),
    cevaplanan: $("pCevaplanan"), dogruluk: $("pDogruluk"),
    son: $("pSon"), sifirla: $("pSifirla")
  };

  function ciz() {
    const p = Profil.veri();

    ui.avatar.innerHTML = avatarSvg(p.avatar);
    if (document.activeElement !== ui.ad) ui.ad.value = p.ad;
    ui.toplam.textContent = p.toplamPuan.toLocaleString("tr-TR");

    ui.avatarlar.replaceChildren(...AVATARLAR.map((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "avatar-sec" + (a.id === p.avatar ? " secili" : "");
      b.title = a.ad;
      b.innerHTML = avatarSvg(a.id);
      b.addEventListener("click", () => Profil.avatarDegistir(a.id));
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
      li.textContent = "Henüz cevap yok. Oyuna dönüp birkaç klip izle!";
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
