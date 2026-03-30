<div align="center">
  <h1>📝 Kerotion</h1>
  <p><strong>Düşüncelerini Organize Et, Hayatını Yönet.</strong></p>
  <p>Notion'dan ilham alan, tamamen özelleştirilebilir, blok tabanlı ve minimalist dijital çalışma alanı.</p>
</div>

<br />

## 🌟 Proje Vizyonu
**Kerotion**, dağınık notları, YKS çalışma programlarını, kitap kurgularını ve projeleri tek bir merkezde toplayan modüler bir yaşam yönetim sistemidir. İster devasa bir veritabanı kurun, ister günlük yapılacaklar listenizi hazırlayın; Kerotion'ın blok tabanlı mimarisi size sınırsız bir özgürlük sunar.

---

## 🔥 Öne Çıkan Özellikler

- **🧱 Blok Tabanlı Editör (Block-Based Editing):** Yazdığınız her paragraf, başlık veya liste bir "blok"tur.
- **📄 İç İçe Geçmiş Sayfalar (Nested Pages):** Klasör mantığına son! Her sayfanın içine alt sayfalar açarak kendi bilgi ağacınızı oluşturun.
- **🌙 Minimalist Arayüz:** Odaklanmayı artıran temiz ve modern tasarım.

---

## 🏗️ Mimari & Kullanılan Teknolojiler

Proje, dış kütüphanelere bağımlı kalmadan, en yüksek hız ve tarayıcı uyumluluğu için temel web teknolojileriyle inşa edilmiştir.

- **Frontend (Arayüz):** Saf (Vanilla) HTML5 ve CSS3.
- **Mantık ve Etkileşim:** Vanilla JavaScript (ES6+). Blokların oluşturulması, sürükle-bırak (Drag & Drop) işlemleri ve sayfa yönlendirmeleri `app.js` üzerinden yönetilir.
- **UI Geliştirme:** Tasarımlar ve bileşenler, Magic MCP aracılığıyla otonom olarak üretilir.

---

## 📂 Klasör Yapısı

```bash
kerotion/
├── .agent/                 # Otonom yapay zeka uzman persona ve kural dosyaları
│   ├── .agents/            # Uzman kimlikleri (Frontend, Backend vb.)
│   ├── rules/              # Genel proje kuralları
│   └── skills/             # Ajan yetenekleri (Örn: SKILL.md)
├── app.js                  # Blok editörü ve uygulamanın ana mantığı
├── index.html              # Ana sayfa ve DOM iskeleti
├── README.md               # Proje tanıtım belgesi
└── style.css               # Tüm stil ve animasyon kuralları