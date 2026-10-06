# App Store & Google Play Ekran Görüntüsü Üretici

[English](README.md) | Türkçe

Bu kopyanın bakımını [yanclogic](https://github.com/yanclogic) yapıyor; temeli [Parth Jadhav'ın app-store-screenshots projesi](https://github.com/ParthJadhav/app-store-screenshots). Editör şablonu upstream projeden geliyor. Bu kopyada skill sıkılaştırıldı: agent'lar metin, cihaz çerçevesi, küçük görsel kontrolü ve migrasyon için tek bir kaynağa bakıyor. Lisans MIT olarak kalıyor.

Bu, AI kodlama agent'ları için bir skill. App Store ve Google Play pazarlama ekran görüntüleri için kullanıma hazır bir Next.js editörü kurar. Bağlantılı bir canvas, gerçek cihaz çerçeveleri, ayar paneli, kalıcı proje durumu ve mağazanın istediği boyutlarda tek tıkla export paketi sunar.

![Bloom ekran görüntüsü destesini gösteren bağlantılı canvas editörü](example.png)

Bu skill ile üretilen örnek ekran görüntüleri [App Store'daki Bloom Coffee Shelf Recipe](https://apps.apple.com/us/app/bloom-coffee-shelf-recipe/id6759914524) uygulamasında kabul edildi.

## Ne Yapar

- Tek seferlik statik bir sayfa yerine tam bir ekran görüntüsü editörü kurar
- Ham uygulama görüntülerini, büyük ve okunaklı metinli reklam tarzı slaytlara dönüştürür
- Telefonlar, başlıklar ve süs öğeleri tek bir bağlantılı canvas üzerinde komşu ekranlara taşabilir
- Eski projeleri bozmaz: bağlantılı kırpmayı sen açana kadar her ekran ayrı export edilir
- Her desteyi `app-store-screenshots.json` dosyasına kaydeder; proje git'te takip edilebilir ve kaldığı yerden devam eder
- Seçilen görselleri `public/screenshots/uploaded/<hash>.png` altına yükler
- iPhone, iPad, Apple TV, Apple Watch, CarPlay, Mac, Android telefon, Android tablet ve Play Store feature graphic destelerini destekler
- App Store, Mac App Store ve Google Play'in istediği tüm boyutlarda birebir PNG paketleri üretir
- Çoklu dil, sağdan sola (RTL) dillere uygun metin ve yerleşim yönlendirmesi, yeniden kullanılabilir temalar ve yerinde proje migrasyonu sunar
- Ayrıntılı tarifleriyle 18 adlandırılmış görsel stil ve bir başlık metni kütüphanesiyle gelir

## Editör Arayüzü

- **Connected canvas** - tüm ekran şeridini bir arada görürsün, öğeleri ekran sınırlarının üzerinden sürüklersin; export sırasında her ekran tam yerinden kırpılır.
- **Isolated mode** - ekran dışındaki öğelerin komşu export'lara sızmaması gereken eski desteleri korur.
- **Ekran kenar çubuğu** - canlı küçük görsellerle ekran ekle, seç ve sürükleyerek sırala.
- **Inspector** - sağ panelden yerleşimi, etiketleri, başlıkları, ekran görüntülerini, öğe sıralamasını ve konum/boyut ayarlarını düzenle. Başlığın yanındaki **Copy ideas** menüsü, üzerinde oynayabileceğin denenmiş bir kalıp ekler.
- **Tema seçici** - toolbar'dan hazır paletler arasında geç; her adlandırılmış stilin bir paleti var. Yanındaki palet butonu, açık temanın renklerini yalnızca bu proje için düzenler.
- **Style Lab** - desten için dört tam görünümü (palet, yazı tipi, yerleşim ritmi ve sahne) yan yana gör. Beğendiğin kısımları Colors/Type/Layout/Scene kilitleriyle sabitle, gerisini karıştır ya da yeniden üret, favorilerini kaydet, birini tek bir geri alınabilir adımla uygula ve karşılaştırma görseli export et.
- **Scene Playground** - tüm ekranları tek seferde yeniden biçimlendir: şeridin tamamına yayılabilen arka planlar (gradient, düz, aurora, spotlight, ızgara, nokta, çizgili), süslemeler, cihaz gölgesi, parlama ve 3B eğim; başlık kalınlığı, büyük/küçük harf ve hizalama.
- **Büyüteç** - herhangi bir ekrana, ekran görüntüsünün tek bir ayrıntısını yakınlaştıran bir lup ekle; küçük görsel üzerinden hedefle, yakınlaştırma oranını ve şeklini seç, istediğin yere sürükle.
- **Platform sekmeleri** - iOS, Mac ve Android sekmeleri tüm desteleri yan yana tutar; hepsi aynı editör akışını kullanır.
- **Cihaz seçici** - iOS altında iPhone, iPad, Apple TV, Apple Watch ve CarPlay; Android altında Android telefon, Android tabletler ve feature graphic. Mac sekmesinde tek bir 16:10 Mac destesi var.
- **Otomatik kayıt** - `/api/project` üzerinden diske yazar, `localStorage`'a da kopyalar ve başka bir sekmenin ya da agent'ın işinin üzerine yazmadan önce diskte daha yeni bir sürüm olup olmadığını kontrol eder. Başarısız kayıtlar yeniden denenebilir; kaydedilmemiş değişiklik varken sayfadan çıkmaya çalışınca uyarı çıkar.
- **Zoom** - %5 ile %200 arasında yakınlaştır, tüm desteyi ya da açık ekranı sığdır; trackpad'de pinch veya ⌘ + scroll da çalışır.
- **Export bundle** - platform, cihaz, çözünürlük ve dile göre düzenlenmiş bir zip indirir. Yanındaki ok menüsü birden fazla cihaz destesini tek zip'te toplar.

İpucu: Kaynak iPhone ekran görüntülerini alırken 6.1 inç simülatörle başlamak genellikle en kolayı; çerçevelerin içinde elle görsel ayarı yapma ihtiyacını azaltır.

## Kurulum

### npx skills ile

```bash
npx skills add ParthJadhav/app-store-screenshots
```

Global kurulum:

```bash
npx skills add ParthJadhav/app-store-screenshots -g
```

Belirli bir agent için kurulum:

```bash
npx skills add ParthJadhav/app-store-screenshots -a claude-code
```

Claude Code, Cursor, Windsurf, OpenCode, Codex ve [`skills`](https://github.com/vercel-labs/skills) aracının desteklediği diğer agent'larla çalışır.

### Elle kurulum

```bash
git clone https://github.com/ParthJadhav/app-store-screenshots ~/.claude/skills/app-store-screenshots
```

## Kullanım

Kurduktan sonra kodlama agent'ından mağaza ekran görüntüleri iste:

```text
Uygulamam için App Store ve Google Play ekran görüntüleri hazırla.
```

Skill, editör projesini oluşturmadan önce agent'ın sana uygulamanı, kaynak ekran görüntülerini, platformları, dilleri, görsel yönü ve slayt sayısını sormasını sağlar.

## Örnek Promptlar

```text
Alışkanlık takip uygulamam için App Store ekran görüntüleri hazırla.
Uygulama, insanların basit günlük rutinlerle istikrarlı kalmasına yardım ediyor.
6 slayt istiyorum: sade minimal stil, sıcak nötr tonlar, sakin ve premium bir his.
```

```text
Kişisel finans uygulamam için App Store ekran görüntüleri üret.
Güçlü yanları hızlı harcama girişi, net aylık trendler ve ortak bütçeler.
Yüksek kontrastlı, keskin ve modern bir stil ile 7 slayt istiyorum.
```

```text
Menü çubuğu aracım için Mac App Store ekran görüntüleri hazırla.
Uygulama menü çubuğunda duruyor ve bu Mac'teki dosyaları anında buluyor.
5 slayt, koyu bir Mac pencere çerçevesi ve sakin bir masaüstü hissi istiyorum.
```

```text
Dil öğrenme uygulamam için App Store ekran görüntüleri hazırla.
İngilizce, Almanca ve Arapça setlere ihtiyacım var.
İki yeniden kullanılabilir tema kullan: clean-light ve dark-bold.
Arapça slaytlar sadece çevrilmiş gibi değil, baştan RTL tasarlanmış gibi dursun.
```

## Daha İyi Prompt İçin İpuçları

- Uygulamanın ne yaptığını tek cümleyle anlat
- En önemli 3-5 özelliği öncelik sırasıyla yaz
- İhtiyacın olan platformları ve cihazları belirt
- İstediğin görsel stili tarif et
- Kaç slayt istediğini söyle
- Gereken dilleri veya RTL dilleri belirt
- Varsa kaynak ekran görüntüsü yollarını, uygulama ikonunu ve stil referanslarını ver

## Neler Kurulur

Boş bir klasörden başlarsan skill şuna benzer bir Next.js projesi oluşturur:

```text
project/
├── public/
│   ├── mockup.png
│   ├── app-icon.png
│   └── screenshots/
│       ├── apple/
│       │   ├── iphone/{locale}/01.png
│       │   ├── ipad/{locale}/01.png
│       │   ├── tvos/{locale}/01.png
│       │   ├── watchos/{locale}/01.png
│       │   ├── carplay/{locale}/01.png
│       │   └── mac/{locale}/01.png
│       └── android/
│           ├── phone/{locale}/01.png
│           ├── tablet-7/portrait/{locale}/01.png
│           ├── tablet-10/landscape/{locale}/01.png
│           └── feature-graphic/{locale}/01.png
├── app-store-screenshots.json
├── src/app/
│   ├── layout.tsx
│   └── page.tsx
├── src/components/editor/
│   ├── screenshot-editor.tsx
│   ├── toolbar.tsx
│   ├── sidebar.tsx
│   ├── inspector.tsx
│   ├── preview-stage.tsx
│   ├── slide-canvas.tsx
│   ├── screenshot-picker.tsx
│   └── device-frames.tsx
└── src/lib/
    ├── constants.ts
    ├── defaults.ts
    ├── storage.ts
    ├── image-cache.ts
    ├── export-render.ts
    └── types.ts
```

Editörün iç yapısı `skills/app-store-screenshots/template/README.md` dosyasında daha ayrıntılı anlatılıyor (İngilizce).

## Editör Akışı

1. Simülatörden, emülatörden ya da cihazdan gerçek uygulama ekran görüntüleri al.
2. Agent'ından ekran görüntüsü projesini kurmasını ya da mevcut projeyi taşımasını iste.
3. Dev sunucusunu başlat ve editörü aç.
4. Ekranları kenar çubuğundan düzenle; metni, yerleşimi, ekran görüntülerini ve öğeleri inspector'dan değiştir.
5. Öğeler ekran sınırlarını aşacaksa Connected, aşmayacaksa Isolated modu seç.
6. Tam görünümleri karşılaştırmak için **Style Lab**'i, arka planı, derinliği ve başlık stilini elle ayarlamak için **Scene**'i aç.
7. Mağazaya hazır PNG'leri indirmek için **Export bundle**'a tıkla.

Yüklenen dosyalar `public/screenshots/uploaded/` altına, destenin asıl durumu `app-store-screenshots.json` dosyasına kaydedilir. Temiz bir clone'dan sonra destenin aynen geri gelmesi için ikisini de commit'le.

## Export Boyutları

### Apple App Store

| Cihaz | Çözünürlük |
|-------|------------|
| iPhone 6.9" | 1320 x 2868 |
| iPhone 6.5" | 1284 x 2778 |
| iPhone 6.3" | 1206 x 2622 |
| iPhone 6.1" | 1125 x 2436 |
| iPad 13" | 2064 x 2752 |
| iPad Pro 12.9" | 2048 x 2732 |
| Apple TV | 3840 x 2160, 1920 x 1080 |
| Apple Watch Ultra | 422 x 514, 410 x 502 |
| Apple Watch Series 10 | 416 x 496 |
| Apple Watch Series 7 | 396 x 484 |
| Apple Watch Series 4 | 368 x 448 |
| Apple Watch Series 3 | 312 x 390 |
| CarPlay (iPhone yuvası, yatay) | 2868 x 1320, 2778 x 1284, 2622 x 1206, 2436 x 1125 |

App Store Connect'te CarPlay için ayrı bir ekran görüntüsü yuvası yok: CarPlay görselleri iPhone yuvasına yüklenir. Bu yüzden CarPlay destesi, araç ekranı çerçevesiyle yatay iPhone boyutlarında export edilir.

### Mac App Store

| Cihaz | Çözünürlük |
|-------|------------|
| Mac (16:10) | 2880 x 1800, 2560 x 1600, 1440 x 900, 1280 x 800 |

App Store Connect macOS'u iOS uygulamasından ayrı bir platform olarak listelediği için Mac'in kendi **Mac** sekmesi var. Paketi `ios/...` ve `android/...` klasörlerinin yanına, `macos/mac/<WxH>/<locale>/` altına export edilir. Mac pencere çerçevesinin içerik alanı 16:10 olduğundan, tam ekran 16:10 bir görüntü kırpılmadan çerçeveyi doldurur.

### Google Play Store

| Cihaz | Çözünürlük |
|-------|------------|
| Telefon dikey | 1080 x 1920 |
| 7" tablet dikey | 1200 x 1920 |
| 7" tablet yatay | 1920 x 1200 |
| 10" tablet dikey | 1600 x 2560 |
| 10" tablet yatay | 2560 x 1600 |
| Feature graphic | 1024 x 500 |

Ekran görüntüleri her cihaz için en büyük boyutta tasarlanır ve küçük export'lar için ölçeklenerek küçültülür. Her export, her ekran görüntüsünün gerçekten çizildiğinden emin olana kadar bekler (Safari/WebKit görselleri asenkron çözer). Boş bir cihaz yazmak yerine uyarı verir. Android, iPad, Apple TV, Apple Watch, CarPlay ve Mac çerçeveleri CSS ile çizilir; iPhone ise projeyle gelen `mockup.png` çerçevesini kullanır.

## Proje Durumu

- `app-store-screenshots.json`; uygulama adı, açık platform, açık cihaz, diller, tema, connected-canvas modu, sahne, Style Lab'de kaydedilen görünümler, slaytlar, ekran görüntüsü yolları, büyüteçler ve konum/boyut ayarları için tek doğru kaynaktır.
- Editörde yüklenen dosyalar `public/screenshots/uploaded/<hash>.png` altına yazılır.
- Editör hızlı açılmak için önce `localStorage`'ı okur, ardından proje dosyasıyla eşitler.
- Eski proje dosyaları yüklenirken şema v2'ye taşınır; connected mod daha önce açılmamışsa eski desteler ayrık kalır.
- Özel temalar `src/lib/constants.ts` içinde durur; bilinmeyen tema id'leri `clean-light`'a düşer. Hazır bir temada yapılan renk değişiklikleri tema başına `themeColors` alanına kaydedilir.

## Stiller ve Metin

Skill 18 adlandırılmış görsel stille gelir. Her birinin `skills/app-store-screenshots/style-prompts/` altında ayrıntılı bir tarifi var: palet, tipografi, başlık vurgusu, yerleşim ritmi, süsleme yoğunluğu, ekranlar arası geçişler ve metin tonu. Örnek görselleri ve kopyalanıp yapıştırılabilir promptları [stil galerisinde](https://www.parthjadhav.com/products/app-store-screenshots/styles) inceleyebilirsin.

| Stil | Uygun olduğu alanlar |
|------|----------------------|
| Hand-Drawn Editorial Tasks | Tasarım zevki olan üretkenlik, görev ve not uygulamaları |
| Retro Rubberhose Mascot | Maskotlu, sıcak alışkanlık ve sağlıklı yaşam uygulamaları |
| Moody Curated Dating | Üyelere özel tanışma, akşam yemeği kulüpleri, premium yaşam tarzı |
| Paper Sticker Skeuomorphic | Öğrenci ajandaları, notlar, hobi uygulamaları |
| Dreamy Pastel Couples | Çiftler, uzak mesafe ilişkiler, evcil hayvan arkadaşları |
| Glossy 3D K-Beauty Creator | İçerik üreticisi ekonomisi, hayran toplulukları, güzellik |
| Liquid Glass Aurora | Premium iOS'a özgü araçlar, AI asistanları |
| Swiss Grid Bold | Finans, geliştirici araçları, analitik, B2B |
| Neon Athletic Night | Fitness, koşu, kuvvet, toparlanma |
| Magazine Cover Editorial | Yemek, tarif, okuma, seyahat, kahve |
| Candy Pop Social | Sosyal, arkadaşlar, etkinlikler, Z kuşağı tüketici uygulamaları |
| Soft Clay Wellness | Meditasyon, uyku, günlük tutma, sağlık |
| Midnight Glow Pro | AI, geliştirici araçları, profesyonel üretkenlik, ileri düzey finans |
| Risograph Zine | Müzik, etkinlikler, podcast'ler, bağımsız yaratıcı uygulamalar |
| Bento Keynote Grid | Özellik yoğun üretkenlik, sağlık, finans, araç uygulamaları |
| Toybox Primary | Çocuklar için öğrenme, aileler, yeni başlayanlar, gündelik oyunlar |
| Quiet Japandi | Notlar, takvimler, okuma, çay, minimalist araçlar |
| Vintage Travel Poster | Seyahat, haritalar, doğa, hava durumu, yol gezileri |

Promptta bir stilin adını verirsen ("Swiss Grid Bold kullan") agent tarifin tamamını uygular. Her adlandırılmış stilin editördeki tema seçicide eşleşen bir paleti de var.

Başlıklar için `skills/app-store-screenshots/copy-ideas.md` dosyasında şunlar var: slayt rolüne göre kalıplar, 13 uygulama kategorisi için hazır cümleler, üst etiketler, zayıftan güçlüye örnek tablosu, deste kurguları ve yerelleştirme notları. Aynı kalıplar inspector'da başlık alanının yanındaki **Copy ideas** menüsünde de duruyor.

## Tasarım İlkeleri

- Ekran görüntüleri dokümantasyon değil, reklamdır
- Her slayt tek bir net kullanıcı kazanımı satmalı
- Başlıklar bir saniyelik küçük görsel testini geçmeli
- Yan yana slaytlarda yerleşim ve cihaz konumu değişmeli
- Ekranlar arası öğeler zorunlu metni ya da kritik arayüzü asla bölmemeli
- Export edilen kırpımlar tek başına da ekran görüntüsü olarak işe yaramalı

## Teknolojiler

| Bağımlılık | Amacı |
|------------|-------|
| Next.js | Dev sunucusu ve uygulama iskeleti |
| React | Editör arayüzü |
| TypeScript | Proje ve slayt durumunun tip güvenliği |
| Tailwind CSS | Stil |
| shadcn/ui + Radix | Kontroller, diyaloglar, seçim menüleri, ipuçları |
| html-to-image | Birebir PNG çizimi |
| JSZip | Paket indirme |
| dnd-kit | Ekranları yeniden sıralama |
| react-rnd | Canvas'ta sürüklenebilir ve boyutlandırılabilir öğeler |

## Gereksinimler

- Node.js 20.9+
- bun, pnpm, yarn veya npm'den biri

## Katkı

Katkılara açığız; özellikle export güvenilirliği, ekran görüntüsü tasarım rehberliği, migrasyonlar ve farklı agent'larla uyumluluk konularında. Başlamak için `CONTRIBUTING.md` dosyasına bak (İngilizce).

## Lisans

MIT

## Yazar

[Parth Jadhav](https://www.parthjadhav.com/) tarafından oluşturuldu.
