// Öğrenme içeriği: kelimeler (kategorili) ve Arap alfabesi.
// Okunuşlar Türkçe harflerle yazıldı; uzun ünlüler â, î, û ile gösterilir.

const KATEGORILER = [
  { id: "selam",   ad: "Selamlaşma" },
  { id: "aile",    ad: "Aile" },
  { id: "sayi",    ad: "Sayılar" },
  { id: "renk",    ad: "Renkler" },
  { id: "yemek",   ad: "Yiyecek ve içecek" },
  { id: "gunluk",  ad: "Günlük hayat" }
];

// Her kelime: kimlik, kategori, Arapça (harekeli), okunuş, Türkçe
const KELIMELER = [
  ["k1",  "selam", "مَرْحَبًا", "merhaben", "Merhaba"],
  ["k2",  "selam", "شُكْرًا", "şukran", "Teşekkürler"],
  ["k3",  "selam", "نَعَمْ", "na'am", "Evet"],
  ["k4",  "selam", "لَا", "lâ", "Hayır"],
  ["k5",  "selam", "مِنْ فَضْلِكَ", "min fadlike", "Lütfen"],
  ["k6",  "selam", "مَعَ السَّلَامَةِ", "me'a's-selâme", "Güle güle"],
  ["k7",  "selam", "صَبَاحُ الْخَيْرِ", "sabâhu'l-hayr", "Günaydın"],
  ["k8",  "selam", "عَفْوًا", "'afven", "Rica ederim"],

  ["k9",  "aile", "أَبٌ", "eb", "Baba"],
  ["k10", "aile", "أُمٌّ", "umm", "Anne"],
  ["k11", "aile", "أَخٌ", "ah", "Erkek kardeş"],
  ["k12", "aile", "أُخْتٌ", "uht", "Kız kardeş"],
  ["k13", "aile", "اِبْنٌ", "ibn", "Oğul"],
  ["k14", "aile", "بِنْتٌ", "bint", "Kız evlat"],
  ["k15", "aile", "جَدٌّ", "cedd", "Dede"],
  ["k16", "aile", "زَوْجٌ", "zevc", "Eş, koca"],

  ["k17", "sayi", "وَاحِدٌ", "vâhid", "Bir (1)"],
  ["k18", "sayi", "اِثْنَانِ", "isnân", "İki (2)"],
  ["k19", "sayi", "ثَلَاثَةٌ", "selâse", "Üç (3)"],
  ["k20", "sayi", "أَرْبَعَةٌ", "erba'a", "Dört (4)"],
  ["k21", "sayi", "خَمْسَةٌ", "hamse", "Beş (5)"],
  ["k22", "sayi", "سِتَّةٌ", "sitte", "Altı (6)"],
  ["k23", "sayi", "سَبْعَةٌ", "seb'a", "Yedi (7)"],
  ["k24", "sayi", "ثَمَانِيَةٌ", "semâniye", "Sekiz (8)"],
  ["k25", "sayi", "تِسْعَةٌ", "tis'a", "Dokuz (9)"],
  ["k26", "sayi", "عَشَرَةٌ", "'aşera", "On (10)"],

  ["k27", "renk", "أَحْمَرُ", "ahmer", "Kırmızı"],
  ["k28", "renk", "أَزْرَقُ", "ezrak", "Mavi"],
  ["k29", "renk", "أَخْضَرُ", "ahdar", "Yeşil"],
  ["k30", "renk", "أَصْفَرُ", "asfer", "Sarı"],
  ["k31", "renk", "أَبْيَضُ", "ebyad", "Beyaz"],
  ["k32", "renk", "أَسْوَدُ", "esved", "Siyah"],

  ["k33", "yemek", "مَاءٌ", "mâ'", "Su"],
  ["k34", "yemek", "خُبْزٌ", "hubz", "Ekmek"],
  ["k35", "yemek", "قَهْوَةٌ", "kahve", "Kahve"],
  ["k36", "yemek", "شَايٌ", "şây", "Çay"],
  ["k37", "yemek", "حَلِيبٌ", "halîb", "Süt"],
  ["k38", "yemek", "تُفَّاحَةٌ", "tuffâha", "Elma"],
  ["k39", "yemek", "لَحْمٌ", "lahm", "Et"],
  ["k40", "yemek", "أَرُزٌّ", "eruzz", "Pirinç"],

  ["k41", "gunluk", "بَيْتٌ", "beyt", "Ev"],
  ["k42", "gunluk", "كِتَابٌ", "kitâb", "Kitap"],
  ["k43", "gunluk", "قَلَمٌ", "kalem", "Kalem"],
  ["k44", "gunluk", "بَابٌ", "bâb", "Kapı"],
  ["k45", "gunluk", "سَيَّارَةٌ", "seyyâra", "Araba"],
  ["k46", "gunluk", "مَدْرَسَةٌ", "medrese", "Okul"],
  ["k47", "gunluk", "يَوْمٌ", "yevm", "Gün"],
  ["k48", "gunluk", "لَيْلٌ", "leyl", "Gece"]
].map(([id, kategori, ar, okunus, tr]) => ({ id, kategori, ar, okunus, tr }));

// Arap alfabesi: harf, adı, Türkçe ses ipucu, kendinden sonrakine bağlanır mı, örnek kelime
const HARFLER = [
  ["ا", "Elif", "a / uzatma harfi", false, "أَسَدٌ", "esed", "Aslan"],
  ["ب", "Be", "b", true, "بَيْتٌ", "beyt", "Ev"],
  ["ت", "Te", "t", true, "تُفَّاحَةٌ", "tuffâha", "Elma"],
  ["ث", "Se", "peltek s (İngilizce think)", true, "ثَلْجٌ", "selc", "Kar"],
  ["ج", "Cim", "c", true, "جَمَلٌ", "cemel", "Deve"],
  ["ح", "Ha", "boğazdan, hırıltısız h", true, "حَلِيبٌ", "halîb", "Süt"],
  ["خ", "Hı", "gırtlaktan, hırıltılı h", true, "خُبْزٌ", "hubz", "Ekmek"],
  ["د", "Dal", "d", false, "دَرْسٌ", "ders", "Ders"],
  ["ذ", "Zel", "peltek z (İngilizce this)", false, "ذَهَبٌ", "zeheb", "Altın"],
  ["ر", "Ra", "r", false, "رَجُلٌ", "racul", "Adam"],
  ["ز", "Ze", "z", false, "زَيْتٌ", "zeyt", "Zeytinyağı"],
  ["س", "Sin", "s", true, "سَمَكٌ", "semek", "Balık"],
  ["ش", "Şın", "ş", true, "شَمْسٌ", "şems", "Güneş"],
  ["ص", "Sad", "kalın s", true, "صَدِيقٌ", "sadîk", "Arkadaş"],
  ["ض", "Dad", "kalın d", true, "ضَيْفٌ", "dayf", "Misafir"],
  ["ط", "Tı", "kalın t", true, "طَالِبٌ", "tâlib", "Öğrenci"],
  ["ظ", "Zı", "kalın peltek z", true, "ظُهْرٌ", "zuhr", "Öğle vakti"],
  ["ع", "Ayn", "boğazı sıkarak çıkan ses", true, "عَيْنٌ", "'ayn", "Göz"],
  ["غ", "Ğayn", "gırtlaktan ğ", true, "غُرْفَةٌ", "ğurfe", "Oda"],
  ["ف", "Fe", "f", true, "فِيلٌ", "fîl", "Fil"],
  ["ق", "Kaf", "kalın k (gırtlaktan)", true, "قَلَمٌ", "kalem", "Kalem"],
  ["ك", "Kef", "ince k", true, "كِتَابٌ", "kitâb", "Kitap"],
  ["ل", "Lam", "l", true, "لَيْلٌ", "leyl", "Gece"],
  ["م", "Mim", "m", true, "مَاءٌ", "mâ'", "Su"],
  ["ن", "Nun", "n", true, "نُورٌ", "nûr", "Işık"],
  ["ه", "He", "hafif h", true, "هِلَالٌ", "hilâl", "Hilal"],
  ["و", "Vav", "v / uzun u", false, "وَرْدٌ", "verd", "Gül"],
  ["ي", "Ye", "y / uzun i", true, "يَدٌ", "yed", "El"]
].map(([harf, ad, ses, baglanir, ornek, ornekOkunus, ornekTr], i) => ({
  id: `h${i + 1}`, harf, ad, ses, baglanir, ornek, ornekOkunus, ornekTr
}));
