/*!
 * HARDCORE 5 - OPTIMIZED MULTIPLAYER  v1.9.0
 * ---------------------------------------------------------
 * Basit, tek-dosyalık canvas oyunları için hafif bir motor.
 * "Ultimate Meteor" tarzı oyunlarda tekrar tekrar yazılan
 * kalıpları (canvas kurulumu, oyun döngüsü, dokunmatik
 * kontroller, çarpışma, patlama efektleri, ekran/menü
 * yönetimi, kayıt) tek bir yerde toplar.
 *
 * HARDCORE 5, önceki Hardcore3 (v4.4) hattının devamı ve yeni
 * markasıdır — API'de kırıcı bir değişiklik yoktur, global nesne
 * artık "Hardcore5" olarak tanımlanır. Aşağıdaki değişiklik geçmişi
 * eski Hardcore3 sürümlerini de (referans için) içerir.
 *
 * v1.9.0 değişiklikleri (TEST DOM TAKLİDİ — AYRI DOSYA):
 *   - DOM taklidi test/dom-mock.js olarak AYRI bir dosyada yaşıyor
 *     (hardcore5.js'in İÇİNDE DEĞİL). Bir ara motorun içine izole/
 *     opt-in bir Hardcore5.testUtils.installDomMock() olarak gömülmüştü;
 *     tercih edilen kurulum ayrı dosya olduğu için geri alındı.
 *   - KIRICI DEĞİŞİKLİK YOK: motorun kendisi (hardcore5.js) test/mock
 *     kodu içermez, tamamen üretim/oyun koduna ayrılmış durumda.
 *
 * v1.8.0 değişiklikleri (OTOMATİK TESTLER):
 *   - test/ eklendi: Node'un yerleşik test koşucusuyla (node:test, ek
 *     bağımlılık YOK) 27 testlik bir paket — util/collide, Camera,
 *     Node (scene graph), sprite sheet/animasyon, TileMap (elle kurulan
 *     VE Tiled JSON'dan yüklenen), fizik broad-phase (regresyon +
 *     doğruluk), engine.script (BrickScript köprüsü, and/or/not dahil),
 *     ve Engine kurulumunun kendisi (WebGL yokken Canvas2D'ye düşme).
 *     Çalıştırma: `node --test test/hardcore5.test.js`.
 *   - test/dom-mock.js: motoru gerçek bir tarayıcı olmadan (canvas/
 *     Image/fetch mock'larıyla) örnekleyip test edebilmek için minimal
 *     bir DOM taklidi.
 *   - GERÇEK BİR HATA BULUNDU VE DÜZELTİLDİ: createInput() ve
 *     Engine._resize(), UMD sarmalayıcının kurduğu `global` parametresi
 *     yerine HAM `window` global'ine bakıyordu. Tarayıcıda fark
 *     edilmiyordu (window zaten var), ama Node/bundler gibi window'suz
 *     ortamlarda Engine.init() çağrısı anında "window is not defined"
 *     ile çöküyordu — v1.7.0'ın "DOM'suz import edilebilir" vaadi
 *     sadece MODÜLÜ yüklemeyi kapsıyordu, motoru ÖRNEKLEMEYİ değil. Artık
 *     her ikisi de window.addEventListener/innerWidth yerine tutarlı
 *     şekilde global.addEventListener/innerWidth kullanıyor — tarayıcıda
 *     davranış birebir aynı (global === window), ama artık test
 *     ortamında da (dom-mock.js ile) gerçek bir Engine kurulabiliyor.
 *
 * v1.7.0 değişiklikleri (MODÜL SİSTEMİ — UMD + TypeScript):
 *   - Dosya artık UMD (Universal Module Definition): düz <script>
 *     etiketiyle (window.Hardcore5), CommonJS ile (require('./hardcore5.js'))
 *     ve AMD ile (define(...)) aynı dosyadan kullanılabiliyor. Önceden
 *     SADECE global window.Hardcore5 ataması vardı.
 *   - require()/import ile DOM OLMADAN (Node, bundler, test aracı)
 *     yüklenebiliyor: modül üst seviyesinde eager çalışan tek DOM
 *     erişimi (_colorCanvas = document.createElement(...)) artık lazy
 *     — ilk gerçek renk çözümlemesinde kuruluyor. Motorun kendisi hâlâ
 *     tarayıcıya bağımlı (Engine.init() bir <canvas>/DOM ister), ama
 *     artık modülü İÇE AKTARMAK için tarayıcı GEREKMİYOR.
 *   - hardcore5.d.ts eklendi: Camera, Node, SpriteAnimation, TileMap,
 *     asset/script köprüleri ve engine.physical (Vec2/Body/World) dahil
 *     TypeScript tip tanımları — editörlerde otomatik tamamlama ve tip
 *     kontrolü sağlar. Ayrı bir dosyadır, hardcore5.js'in çalışma
 *     zamanı davranışını etkilemez.
 *   - KIRICI DEĞİŞİKLİK YOK: <script src="hardcore5.js"></script> ile
 *     kullanım (window.Hardcore5) birebir eskisi gibi çalışır.
 *
 * v1.6.0 değişiklikleri (TILEMAP):
 *   - engine.createTileMap({tileWidth, tileHeight, cols, rows, tileset,
 *     layers}) eklendi: çok katmanlı, tile-bazlı 2D haritalar.
 *     getTile/setTile, worldToTile, ve SADECE görünür hücreleri tarayan
 *     (view={minX,minY,maxX,maxY}) bir draw().
 *       const sheet = engine.assets.spriteSheet('tiles', 'tiles.png', { frameWidth: 16, frameHeight: 16 });
 *       const map = engine.createTileMap({ tileWidth:16, tileHeight:16, cols:100, rows:20, tileset: sheet, layers:[...] });
 *       draw(r) { map.draw(r, { minX: cam.x, minY: cam.y, maxX: cam.x+800, maxY: cam.y+600 }); }
 *   - engine.assets.loadTiledMap(name, url) eklendi: Tiled
 *     (mapeditor.org) JSON formatını doğrudan yükler ve bir TileMap
 *     döner. Kapsam bilerek dar tutuldu: orthogonal + tek tileset + CSV
 *     katman verisi (sıkıştırma/base64, flip bayrakları, object/image
 *     katmanları desteklenmiyor — bkz. kod içi yorum).
 *       const map = await engine.assets.loadTiledMap('level1', 'level1.json');
 *
 * v1.5.0 değişiklikleri (ASSET PIPELINE — SPRITE SHEET / ANİMASYON):
 *   - GLRenderer.drawImage VE Canvas2DRenderer.drawImage artık
 *     opts.sx/sy/sw/sh (kaynak kırpma dikdörtgeni) destekliyor —
 *     önceden HER İKİ backend de yalnızca görselin TAMAMINI
 *     çizebiliyordu, sprite sheet/atlas kullanımı mümkün değildi.
 *     Argüman verilmezse davranış birebir eskisiyle aynı (kırıcı
 *     değişiklik yok).
 *   - engine.assets.spriteSheet(name, url, {frameWidth, frameHeight,
 *     margin, spacing}) eklendi: bir görseli eşit ızgara karelerine
 *     böler, sheet.frame(i) ile { sx, sy, sw, sh } döner.
 *       const sheet = engine.assets.spriteSheet('hero', 'hero.png', { frameWidth: 32, frameHeight: 32 });
 *       renderer.drawImage(sheet.image, x, y, 32, 32, sheet.frame(3));
 *   - engine.createAnimation(sheet, frames, fps) eklendi: fps'e göre
 *     kareleri zamanla oynatan basit bir animasyon nesnesi
 *     (play/pause/reset, loop, .draw(renderer, x, y, w, h, opts)).
 *       const walk = engine.createAnimation(sheet, [0,1,2,3], 10);
 *       update(dt) { walk.update(dt); }
 *       draw(renderer) { walk.draw(renderer, player.x, player.y, 32, 32); }
 *
 * v1.4.0 değişiklikleri (FİZİK BROAD-PHASE — SPATIAL HASH GRID):
 *   - engine.physical.World'ün broad-phase'i, TÜM body çiftlerini
 *     dolaşan O(n²) bir döngü yerine artık bir SpatialHashGrid
 *     kullanıyor: dünya sabit boyutlu hücrelere bölünüyor, aday çiftler
 *     SADECE aynı hücreyi paylaşan body'lerden üretiliyor. Kesin çakışma
 *     hâlâ AABB + SAT narrow-phase ile doğrulanıyor — davranış/sonuç
 *     AYNI, sadece yoğun sahnelerde (100+ body) çok daha az karşılaştırma
 *     yapılıyor.
 *   - World'e opts.cellSize eklendi (varsayılan 128) — nesnelerin tipik
 *     boyutuna göre ayarlanabilir: new World({ cellSize: 64 }).
 *   - world.queryRegion(minX, minY, maxX, maxY): verilen dikdörtgenle
 *     kesişen body'leri broad-phase grid'i üzerinden döner (tüm body'ler
 *     üzerinde döngüye GEREK KALMADAN) — tıklama/dokunma ile nesne
 *     seçimi, alan hasarı gibi kullanımlar için.
 *   - KIRICI DEĞİŞİKLİK YOK: World/Body API'si, çarpışma olayları
 *     (collisionStart/collisionEnd), tüm mevcut davranış aynen duruyor.
 *
 * v1.3.0 değişiklikleri (SCENE GRAPH / TRANSFORM HİYERARŞİSİ):
 *   - engine.createNode({x,y,rotation,scaleX,scaleY}) eklendi: gerçek
 *     ebeveyn-çocuk ilişkisi kurulabilen, world-space transform'u
 *     atalarından otomatik hesaplayan bir sahne düğümü.
 *       const ship = engine.createNode({ x: 100, y: 100 });
 *       const turret = engine.createNode({ x: 20, y: 0 }); // ship'e göre local
 *       ship.add(turret);
 *       ship.rotation = Math.PI / 4;
 *       turret.worldTransform(); // { x, y, rotation, scaleX, scaleY }
 *   - node.draw(renderer, drawFn): düğümü ve görünür alt ağacını gezip
 *     her biri için drawFn(renderer, node, worldTransform) çağırır.
 *   - createGroup DEĞİŞMEDİ: hâlâ hiyerarşi bilmeyen, düz/basit
 *     koleksiyonlar için var. Node, gerçek bir ebeveyn-çocuk zinciri
 *     (ship -> turret -> namlu gibi) gerektiğinde kullanılır.
 *
 * v1.2.0 değişiklikleri (KAMERA SİSTEMİ):
 *   - engine.camera eklendi: pan/zoom/follow/screen-shake sağlayan,
 *     WebGL ve Canvas 2D backend'lerinden bağımsız bir dünya-uzayı
 *     katmanı.
 *       engine.camera.follow(player, { smoothing: 0.15 });
 *       engine.camera.shake(0.6); // çarpışma/patlama anında
 *       draw(renderer) {
 *         const world = engine.camera.view(renderer);
 *         world.drawCircle(player.x, player.y, 10, '#fff'); // kameradan etkilenir
 *         renderer.drawRect(10, 10, 120, 24, '#000');        // HUD, etkilenmez
 *       }
 *   - KIRICI DEĞİŞİKLİK YOK: engine.renderer aynen eskisi gibi ham
 *     ekran-uzayında çizim yapar. Kameranın etkilemesini istediğin
 *     çizimler için engine.camera.view(renderer) ile açıkça sarman
 *     gerekir; sarmadığın her şey öncekiyle birebir aynı davranır.
 *   - engine.camera her karede motor tarafından otomatik güncellenir
 *     (start() içinde update()'ten sonra, draw()'dan önce).
 *
 * v1.1.0 (Hardcore 5 - Optimized Multiplayer) değişiklikleri:
 *   - Motor "Hardcore 5 - Optimized Multiplayer" olarak yeniden
 *     markalandı (global nesne adı "Hardcore5" olarak aynı kalır,
 *     API'de kırıcı bir değişiklik yoktur).
 *   - HARDCORE ENGINE MULTIPLAYER PLUGIN eklendi: engine.AddWebRTC()
 *     çağrıldığında WebRTC tabanlı, sunucusuz (serverless) eşler arası
 *     (P2P) bir veri kanalı kurar (engine.multiplayer):
 *       const mp = engine.AddWebRTC();
 *       const offerText = await mp.host();      // karşı tarafa ilet
 *       await mp.connect(answerText);            // karşı taraf cevabını uygula
 *       mp.on('connect', (peerId) => { ... });
 *       mp.on('data', (data, peerId) => { ... });
 *       mp.send({ type: 'pos', x, y });
 *     Sinyalleşme (signaling) için ayrı bir sunucu GEREKMEZ: host()/join()
 *     ürettiği JSON metnini (offer/answer) herhangi bir kanaldan (link,
 *     kopyala-yapıştır, QR kod, kendi WebSocket sunucun vb.) elle veya
 *     otomatik olarak taşıyabilirsin.
 *
 * v1.0.0 (Hardcore 5) değişiklikleri:
 *   - Motor "Hardcore3" -> "Hardcore5" olarak yeniden markalandı;
 *     global nesne, hata mesajları ve script referansları güncellendi.
 *   - Fonksiyonellikte değişiklik yok: Hardcore3 v4.4'te bulunan her şey
 *     (engine.physical dahil) aynen mevcut.
 *
 * ↓ Hardcore3 hattından miras kalan değişiklik geçmişi ↓
 *
 * v4.4 değişiklikleri (Powered by Hardcore WebPhysical):
 *   - engine.physical: gerçek bir rigid-body fizik motoru gömüldü.
 *     engine.collide sadece basit AABB/dairesel çarpışma testleri
 *     yaparken, engine.physical kütle/eylemsizlik, SAT tabanlı
 *     çarpışma çözümü, sekme (restitution), sürtünme ve eklem
 *     (DistanceJoint) içeren tam bir simülasyon sağlar:
 *       const world = new engine.physical.World({ gravity: { x: 0, y: 900 } });
 *       const ground = engine.physical.Body.rect(x, y, w, h, { isStatic: true });
 *       const box = engine.physical.Body.rect(x, y, 40, 40, { restitution: 0.3 });
 *       world.addBody(ground); world.addBody(box);
 *       engine.start({ update(dt) { world.step(dt); } });
 *
 * v4.3 değişiklikleri (engine.scenes'e 2 küçük kolaylık):
 *   - firstScene: true -> engine.scenes.add() içinde bu bayrağı taşıyan
 *     sahne, başlangıç sahnesi olarak işaretlenir. engine.scenes.start()
 *     ismi vermeden çağrılırsa buradan başlar.
 *   - update(dt, timeScale) fonksiyonu sonunda bir sahne adı (string)
 *     DÖNDÜRÜRSE, motor o kare bittiğinde otomatik olarak o sahneye
 *     geçer; engine.scenes.switch()'i elle çağırmaya gerek kalmaz.
 *
 * v4.2 değişiklikleri:
 *   - engine.scenes: SAHNE (SCENE) YÖNETİMİ eklendi. Menü / oyun /
 *     oyun-sonu gibi farklı durumları ayrı update/draw çiftleri olarak
 *     tanımlayıp aralarında geçiş yapmayı sağlar.
 *     - engine.scenes.add(name, { enter, exit, update, draw })
 *     - engine.scenes.switch(name, props) -> mevcut sahnenin exit()'i,
 *       sonra hedefin enter(props)'ı çağrılır; 'scene-change' event'i
 *       yayılır.
 *     - engine.scenes.start(initialScene) -> engine.start()'ı sarmalar,
 *       her karede yalnızca aktif sahnenin update/draw'ını çağırır.
 *     - engine.scenes.current / has(name) / remove(name)
 *
 * v4.1 değişiklikleri (v4.0'daki pool sistemindeki 2 hatanın düzeltmesi):
 *   - BELLEK SIZINTISI DÜZELTİLDİ: önceden bir nesne oyun kodu tarafından
 *     "item.dead = true" ile öldürülüp de engine.pool.release() elle
 *     çağrılmazsa, o nesne p.active Set'inde sonsuza dek kalıyor, GC
 *     tarafından toplanamıyordu. Artık engine.pool.group(type) ile
 *     oluşturulan gruplar, ölen her nesneyi update() içinde OTOMATİK
 *     olarak release() eder (bkz. aşağıdaki madde).
 *   - createGroup <-> POOL ENTEGRASYONU EKLENDİ: engine.pool.group(type),
 *     normal bir grup (add/update/forEach/draw/clear/count) gibi davranır,
 *     artı grp.spawn(props) ile havuzdan nesne alıp gruba ekler; grp.update
 *     içinde bir nesne dead=true olduğunda splice'lanmadan önce nesneyi
 *     otomatik olarak havuza (free listesine) iade eder. Böylece gruptan
 *     düşen nesneler artık "askıda" kalmıyor, yeniden kullanılabilir hale
 *     geliyor.
 *
 * v4.0 değişiklikleri:
 *   - engine.pool: OBJECT POOLING sistemi eklendi. Meteor, mermi,
 *     düşman gibi sürekli yaratılıp yok edilen nesneler artık
 *     gerçekten silinmiyor; motor onları yeniden kullanıyor. Böylece
 *     sürekli "new object" + garbage collection yükü ortadan kalkıyor.
 *     - engine.pool.register(type, factory, opts): bir nesne türünü
 *       (örn. 'meteor') fabrika fonksiyonuyla tanımlar, isteğe bağlı
 *       initialSize kadar önceden ısıtır (pre-warm).
 *     - engine.pool.spawn(type, props): havuzdan boşta bir nesne
 *       alır (yoksa fabrikayla yeni üretir), reset(obj, props) ile
 *       ilk durumuna döndürüp aktif listeye ekler.
 *     - engine.pool.recycle(type, obj, opts): nesneyi YOK ETMEDEN,
 *       ekranda başka/optimize bir konuma taşıyıp yeniden sahneye
 *       sokar (örn. meteoru ekranın üstünden veya rastgele bir
 *       kenardan, diğer aktif meteorlarla çakışmayacak şekilde
 *       yeniden konumlandırır). Bu, "konum farklı olacak ve ekrana
 *       optimize olacak şekilde başka bir alana taşıma" davranışıdır.
 *     - engine.pool.release(type, obj): nesneyi tamamen pasif hale
 *       getirip serbest listeye (free pool) geri koyar.
 *     - engine.pool.stats(type): { active, free, created } döndürür,
 *       debug/HUD için kullanılabilir.
 *
 * v3.0 değişiklikleri:
 *   - WebGL renderer eklendi. Varsayılan mod "auto": önce WebGL
 *     dener, tarayıcı/cihaz desteklemiyorsa otomatik olarak
 *     Canvas 2D'ye düşer. opts.renderer ile 'webgl' | '2d' | 'auto'
 *     zorlanabilir.
 *   - engine.renderer: backend'den bağımsız (WebGL veya Canvas 2D)
 *     ortak çizim API'si -> clear(), drawImage(), drawRect(), drawCircle()
 *   - engine.assets.dynamicTexture(): Canvas 2D ile (gradient, metin,
 *     prosedürel desen vb.) üretilip WebGL'e doku olarak yüklenen
 *     dinamik dokular. WebGL kapalıysa doğrudan Canvas 2D ile çizilir.
 *   - Starfield ve particle sistemi artık engine.renderer kullanıyor,
 *     böylece otomatik olarak WebGL'den faydalanıyor.
 *   - WebGL context kaybı/geri yüklenmesi için temel destek
 *     ("gl-context-lost" / "gl-context-restored" event'leri).
 *   - ÖNEMLİ (BREAKING CHANGE): start({update, draw}) içindeki draw
 *     callback'i artık ham CanvasRenderingContext2D yerine
 *     engine.renderer alıyor: draw(renderer, timeScale). 2D modunda
 *     ham context'e ihtiyacın olursa engine.ctx her zaman erişilebilir
 *     durumda kalır (WebGL modunda null'dur; WebGL modunda ham 2D
 *     çizim için engine.assets.dynamicTexture() kullan).
 *
 * v2.0 değişiklikleri:
 *   - engine.assets: resim/sprite yükleyici eklendi
 *   - engine.ui.createScreen(): menü/HUD ekranlarını artık
 *     HTML'de elle yazmana gerek yok, motor kendisi üretiyor
 *   - resize event'i prevWidth/prevHeight veriyor (rescale için)
 *   - event emitter'daki "this" bağlam hatası düzeltildi
 *
 * KULLANIM:
 *   <script src="hardcore5.js"></script>
 *   <script>
 *     const engine = Hardcore5.init({ canvas: 'gameCanvas' });
 *     ...
 *     engine.pool.register('meteor', () => ({ x: 0, y: 0, r: 20, vy: 2 }), {
 *       initialSize: 15,
 *       reset(m, { x, y }) { m.x = x; m.y = y; m.vy = engine.util.rand(2, 5); }
 *     });
 *     // pool.group: spawn edilen ve dead=true olan nesneler otomatik
 *     // olarak havuza geri döner, elle release() çağırmana gerek kalmaz.
 *     const meteors = engine.pool.group('meteor');
 *
 *     // Sahneler: menü ve oyun ayrı update/draw çiftleri olarak tanımlanır
 *     engine.scenes.add('menu', {
 *       firstScene: true, // motor engine.scenes.start() ile buradan başlar
 *       enter() { engine.ui.show('menuScreen'); },
 *       exit()  { engine.ui.hide('menuScreen'); },
 *       update(dt) {
 *         if (engine.input.isDown(' ')) return 'game'; // sahne sonunda hedefi söyle
 *       },
 *       draw(renderer) { renderer.clear('#111'); }
 *     });
 *     engine.scenes.add('game', {
 *       enter() { meteors.spawn({ x: 100, y: -20 }); },
 *       update(dt, timeScale) {
 *         meteors.update(dt, (m) => {
 *           m.y += m.vy;
 *           if (m.y > engine.canvas.height + 40) {
 *             // yok etmek yerine ekranda başka/optimize bir konuma taşı:
 *             engine.pool.recycle('meteor', m, { edge: 'top', minGap: 80 });
 *           }
 *         });
 *       },
 *       draw(renderer) { meteors.draw(renderer, (r, m) => r.drawCircle(m.x, m.y, m.r, '#f66')); }
 *     });
 *     engine.scenes.start(); // firstScene: true olan 'menu'den başlar
 *     // ... bir butona tıklanınca: engine.scenes.switch('game');
 *   </script>
 *
 * Motor, global "Hardcore5" nesnesi olarak tanımlanır.
 * Modül sistemi / build aracı gerekmez, tek <script> etiketi yeterlidir.
 * ---------------------------------------------------------
 */
// UMD (Universal Module Definition): CommonJS (Node/bundler), AMD
// (RequireJS) ve düz <script> etiketi (global window.Hardcore5) için
// TEK dosyadan üç ortamı da destekler. İç motor kodu (factory
// fonksiyonu) DEĞİŞMEDİ — sadece dışa açılma şekli eklendi.
//   <script src="hardcore5.js"></script>              -> window.Hardcore5
//   const Hardcore5 = require('./hardcore5.js');       -> CommonJS
//   define(['./hardcore5.js'], (Hardcore5) => {...});  -> AMD
// Not: motorun kendisi (canvas/DOM/WebGL) tarayıcıya bağımlıdır; Node
// ortamında require() edilebilir ama Engine.init() bir <canvas>/DOM
// gerektirir.
(function (root, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory(root);
  } else if (typeof define === 'function' && define.amd) {
    define([], function () { return factory(root); });
  } else {
    root.Hardcore5 = factory(root);
  }
}(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';

  // =========================================================
  // YARDIMCI FONKSİYONLAR (Hardcore.util)
  // =========================================================
  const util = {
    rand(min, max) { return Math.random() * (max - min) + min; },
    randInt(min, max) { return Math.floor(util.rand(min, max + 1)); },
    clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
    dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
    choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    lerp(a, b, t) { return a + (b - a) * t; }
  };

  // =========================================================
  // BASİT OLAY YAYINLAYICI (Hardcore.on / emit)
  // =========================================================
  function createEmitter() {
    const listeners = {};
    function off(event, fn) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(f => f !== fn);
    }
    return {
      on(event, fn) {
        (listeners[event] = listeners[event] || []).push(fn);
        // Artık dışarıda "this" bağlamı kaybolsa bile çalışır
        // (örn. const unsub = engine.events.on(...); unsub();)
        return () => off(event, fn);
      },
      off,
      emit(event, data) {
        (listeners[event] || []).forEach(fn => fn(data));
      }
    };
  }

  // =========================================================
  // GİRİŞ YÖNETİMİ (Hardcore.input)
  // Klavye + dokunmatik/mouse "basılı tut" butonları
  // =========================================================
  function createInput() {
    const keys = new Set();
    const keyListeners = {};

    global.addEventListener('keydown', (e) => {
      keys.add(e.key);
      (keyListeners[e.key] || {}).down?.();
    });
    global.addEventListener('keyup', (e) => {
      keys.delete(e.key);
      (keyListeners[e.key] || {}).up?.();
    });

    function resolveEl(el) {
      return typeof el === 'string' ? document.getElementById(el) : el;
    }

    return {
      keys,
      isDown(key) { return keys.has(key); },

      // Belirli bir tuşa basma/bırakma anında callback tetikler
      onKey(key, onDown, onUp) {
        keyListeners[key] = { down: onDown, up: onUp };
      },

      // "Basılı tuttukça devam eden" butonlar için (sol/sağ hareket gibi)
      // touchstart/touchend + mousedown/mouseup hepsini bağlar.
      bindHold(el, onDown, onUp) {
        const node = resolveEl(el);
        if (!node) return;
        const start = (e) => { e.preventDefault(); onDown && onDown(e); };
        const end = (e) => { e.preventDefault(); onUp && onUp(e); };
        node.addEventListener('touchstart', start, { passive: false });
        node.addEventListener('touchend', end, { passive: false });
        node.addEventListener('touchcancel', end, { passive: false });
        node.addEventListener('mousedown', start);
        node.addEventListener('mouseup', end);
        node.addEventListener('mouseleave', end);
      },

      // Tek seferlik "dokun/tıkla" butonları için (ateş etme gibi)
      bindTap(el, onTap) {
        const node = resolveEl(el);
        if (!node) return;
        const fire = (e) => { e.preventDefault(); onTap && onTap(e); };
        node.addEventListener('touchstart', fire, { passive: false });
        node.addEventListener('mousedown', fire);
      }
    };
  }

  // =========================================================
  // GRUP / VARLIK (ENTITY) YÖNETİMİ (Hardcore.createGroup)
  // Mermi, meteor, güçlendirme, parçacık gibi listeler için
  // =========================================================
  function createGroup(onRemove) {
    let items = [];
    return {
      list: items,
      add(item) { items.push(item); return item; },
      // update(dt, fn): fn içinde item.dead = true denirse eleman silinir.
      // onRemove verildiyse (bkz. engine.pool.group), silinmeden hemen önce
      // çağrılır — havuzlu nesnelerin free listesine geri dönmesini sağlar.
      update(dt, fn) {
        for (let i = items.length - 1; i >= 0; i--) {
          fn(items[i], i, dt);
          if (items[i].dead) {
            if (onRemove) onRemove(items[i]);
            items.splice(i, 1);
          }
        }
      },
      forEach(fn) { items.forEach(fn); },
      // draw(arg, fn): arg genelde bir çizim hedefi (renderer) olur, fn(arg, item) çağrılır
      draw(arg, fn) { items.forEach(item => fn(arg, item)); },
      // clear(): tüm elemanları listeden atar; onRemove verildiyse her biri
      // için önce onu da çağırır (havuza toplu iade).
      clear() {
        if (onRemove) items.forEach(onRemove);
        items.length = 0;
      },
      get count() { return items.length; }
    };
  }

  // =========================================================
  // SCENE GRAPH / TRANSFORM HİYERARŞİSİ (engine.createNode)
  // createGroup düz bir koleksiyondur (parent-child bilmez). Node ise
  // gerçek bir ebeveyn-çocuk ilişkisi kurar ve world-space transform'u
  // (pozisyon/rotasyon/ölçek) atalarından otomatik hesaplar — örn. bir
  // geminin üstündeki turret'in, turret'in ucundaki namlunun konumu.
  //
  //   const ship = engine.createNode({ x: 100, y: 100 });
  //   const turret = engine.createNode({ x: 20, y: 0 }); // ship'e göre LOCAL
  //   ship.add(turret);
  //   ship.rotation = Math.PI / 4;
  //   const w = turret.worldTransform(); // { x, y, rotation, scaleX, scaleY }
  //
  // Not: rotasyon+ölçek birlikte zincirlenirken (anizotropik ölçek +
  // rotasyon) tam affine kompozisyon yerine basit toplama/çarpma
  // kullanılır (shear hesaba katılmaz) — çoğu 2D oyun ihtiyacı için
  // yeterlidir, ama örn. eliptik biçimde eğilmiş bir ölçek+rotasyon
  // zincirinde küçük sapmalar olabilir.
  // =========================================================
  class Node {
    constructor(props = {}) {
      this.x = props.x || 0;
      this.y = props.y || 0;
      this.rotation = props.rotation || 0;
      this.scaleX = props.scaleX ?? 1;
      this.scaleY = props.scaleY ?? 1;
      this.visible = props.visible !== false;
      this.data = props.data ?? null; // oyuna özgü serbest veri alanı
      this.parent = null;
      this.children = [];
    }

    add(child) {
      if (child.parent) child.parent.remove(child);
      child.parent = this;
      this.children.push(child);
      return child;
    }
    remove(child) {
      const i = this.children.indexOf(child);
      if (i !== -1) { this.children.splice(i, 1); child.parent = null; }
      return child;
    }
    removeFromParent() {
      if (this.parent) this.parent.remove(this);
      return this;
    }

    // Bu düğümün local transform'unu tüm atalarınınkiyle birleştirip
    // world-space transform'u döner. Her çağrıda kökten yeniden hesaplanır
    // (cache'lenmez) — tipik bir oyun hiyerarşisinin derinliği için
    // (birkaç-onlarca düğüm) bu maliyetsizdir.
    worldTransform() {
      let x = this.x, y = this.y, rotation = this.rotation;
      let scaleX = this.scaleX, scaleY = this.scaleY;
      let node = this.parent;
      while (node) {
        const cos = Math.cos(node.rotation), sin = Math.sin(node.rotation);
        const sx = x * node.scaleX, sy = y * node.scaleY;
        x = node.x + sx * cos - sy * sin;
        y = node.y + sx * sin + sy * cos;
        rotation += node.rotation;
        scaleX *= node.scaleX;
        scaleY *= node.scaleY;
        node = node.parent;
      }
      return { x, y, rotation, scaleX, scaleY };
    }

    // Bu düğümü ve tüm alt ağacını (derinlik-öncelikli) ziyaret eder.
    traverse(fn) {
      fn(this);
      for (const c of this.children) c.traverse(fn);
    }

    // Bu düğümü ve görünür alt ağacını çizer. drawFn(renderer, node, world)
    // her görünür düğüm için çağrılır — çizimin nasıl yapılacağına (hangi
    // renderer.drawX metodu, hangi sprite/renk) sen karar verirsin.
    // Kamera etkisi istersen renderer yerine engine.camera.view(renderer) ver.
    draw(renderer, drawFn) {
      if (!this.visible) return;
      drawFn(renderer, this, this.worldTransform());
      for (const c of this.children) c.draw(renderer, drawFn);
    }
  }

  // =========================================================
  // KARE TABANLI ANİMASYON (engine.createAnimation)
  // engine.assets.spriteSheet() ile kesilen kareleri zaman içinde
  // oynatır. fps'e göre hangi karenin gösterileceğini hesaplar ve
  // isteğe bağlı olarak doğrudan çizer.
  //
  //   const sheet = engine.assets.spriteSheet('hero', 'hero.png', { frameWidth: 32, frameHeight: 32 });
  //   const walk = engine.createAnimation(sheet, [0, 1, 2, 3], 10); // 10 kare/sn
  //   // update(dt) { walk.update(dt); }
  //   // draw(renderer) { walk.draw(renderer, player.x, player.y, 32, 32); }
  // =========================================================
  class SpriteAnimation {
    constructor(sheet, frames, fps = 12) {
      this.sheet = sheet;
      this.frames = frames; // sheet.frame(i) ile eşleşen indeks dizisi
      this.fps = fps;
      this.time = 0;
      this.loop = true;
      this.playing = true;
    }

    update(dt) {
      if (this.playing) this.time += dt;
    }

    play() { this.playing = true; return this; }
    pause() { this.playing = false; return this; }
    reset() { this.time = 0; return this; }

    // O anki karenin sheet içindeki indeksi.
    get index() {
      const frameDur = 1 / this.fps;
      let i = Math.floor(this.time / frameDur);
      i = this.loop ? i % this.frames.length : Math.min(i, this.frames.length - 1);
      return this.frames[i];
    }
    // O anki karenin kaynak kırpma dikdörtgeni: { sx, sy, sw, sh }.
    get rect() { return this.sheet.frame(this.index); }
    // Döngüsüz oynatımda son kareye ulaşıp ulaşmadığı.
    get finished() {
      if (this.loop) return false;
      return this.time >= (this.frames.length / this.fps);
    }

    // O anki kareyi renderer üzerinde çizer. opts, sx/sy/sw/sh dışındaki
    // her şeyi (rotation, alpha, flipX) olduğu gibi renderer.drawImage'a
    // geçirir.
    draw(renderer, x, y, w, h, opts = {}) {
      renderer.drawImage(this.sheet.image, x, y, w, h, { ...this.rect, ...opts });
    }
  }

  // =========================================================
  // TILEMAP (engine.createTileMap / engine.assets.loadTiledMap)
  // Izgara tabanlı 2D haritalar: birden fazla katman (arka plan, önde
  // duran süsler, çarpışma katmanı vb.), sadece ekranda görünen
  // hücreleri çizen (culling) bir draw() ve tile-bazlı okuma/yazma.
  //
  //   const sheet = engine.assets.spriteSheet('tiles', 'tiles.png', { frameWidth: 16, frameHeight: 16 });
  //   const map = engine.createTileMap({
  //     tileWidth: 16, tileHeight: 16, cols: 100, rows: 20, tileset: sheet,
  //     layers: [{ name: 'zemin', data: [...] }] // data[i]: 0=boş, N=tileset.frame(N-1)
  //   });
  //   draw(renderer) { map.draw(renderer, { minX: cam.x, minY: cam.y, maxX: cam.x+800, maxY: cam.y+600 }); }
  //
  // Tiled (mapeditor.org) ile hazırlanmış haritalar için:
  //   const map = await engine.assets.loadTiledMap('level1', 'level1.json');
  // (bkz. loadTiledMap yorumundaki kapsam/sınırlamalar)
  // =========================================================
  class TileMap {
    constructor(opts = {}) {
      this.tileWidth = opts.tileWidth;
      this.tileHeight = opts.tileHeight;
      this.cols = opts.cols;
      this.rows = opts.rows;
      this.tileset = opts.tileset; // engine.assets.spriteSheet() çıktısı
      this.layers = (opts.layers || []).map(l => ({
        name: l.name || '',
        data: l.data, // uzunluk cols*rows; 0 = boş, N = tileset.frame(N-1)
        visible: l.visible !== false,
        opacity: l.opacity ?? 1,
      }));
    }

    worldToTile(x, y) {
      return { col: Math.floor(x / this.tileWidth), row: Math.floor(y / this.tileHeight) };
    }

    _layer(indexOrName) {
      return typeof indexOrName === 'number' ? this.layers[indexOrName] : this.layers.find(l => l.name === indexOrName);
    }

    // (col,row) hücresindeki gid'i döner (0 = boş, sınır dışı = 0).
    getTile(layerIndexOrName, col, row) {
      const layer = this._layer(layerIndexOrName);
      if (!layer || col < 0 || row < 0 || col >= this.cols || row >= this.rows) return 0;
      return layer.data[row * this.cols + col] || 0;
    }
    setTile(layerIndexOrName, col, row, gid) {
      const layer = this._layer(layerIndexOrName);
      if (!layer || col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
      layer.data[row * this.cols + col] = gid;
    }

    // Katmanları sırayla çizer. `view` verilirse ({minX,minY,maxX,maxY},
    // world-space) SADECE o bölgeye denk gelen hücreler taranır — büyük
    // haritalarda (yüzlerce/binlerce hücre) performans için önemlidir.
    // view verilmezse tüm harita taranır (küçük haritalarda sorun değil).
    draw(renderer, view) {
      const tw = this.tileWidth, th = this.tileHeight;
      let minCol = 0, minRow = 0, maxCol = this.cols - 1, maxRow = this.rows - 1;
      if (view) {
        minCol = Math.max(0, Math.floor(view.minX / tw));
        minRow = Math.max(0, Math.floor(view.minY / th));
        maxCol = Math.min(this.cols - 1, Math.floor(view.maxX / tw));
        maxRow = Math.min(this.rows - 1, Math.floor(view.maxY / th));
      }
      for (const layer of this.layers) {
        if (!layer.visible) continue;
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const gid = layer.data[row * this.cols + col];
            if (!gid) continue;
            const frame = this.tileset.frame(gid - 1);
            renderer.drawImage(this.tileset.image, col * tw, row * th, tw, th, { ...frame, alpha: layer.opacity });
          }
        }
      }
    }
  }

  // =========================================================
  // OBJECT POOLING (engine.pool)
  // Meteor / mermi / düşman gibi sürekli spawn edilip yok edilen
  // nesneler için: her seferinde "new" ile nesne yaratıp GC'ye
  // yük bindirmek yerine, ölü/pasif nesneleri yeniden kullanır.
  // recycle() ise bir adım ileri gider: nesneyi tamamen yok edip
  // yeniden yaratmak yerine, ekranda diğer aktif nesnelerle
  // çakışmayacak/ekrana optimize bir konuma taşıyarak sahneye
  // geri sokar (örn. bir meteor ekranın altından çıkınca, onu
  // silmek yerine üstten, boş bir noktadan tekrar başlatmak gibi).
  // =========================================================
  function createPool(engine) {
    // type (örn. 'meteor') -> { factory, reset, free:[], active:Set, maxSize, created }
    const pools = new Map();

    function _get(type) {
      const p = pools.get(type);
      if (!p) {
        throw new Error(
          `Hardcore5.pool: "${type}" tipi kayıtlı değil. ` +
          `Önce engine.pool.register('${type}', factory, opts) çağır.`
        );
      }
      return p;
    }

    // "api" değişkeni, aşağıdaki metodların (özellikle group()) birbirini
    // "this" yerine doğrudan referansla çağırabilmesi için (bkz. group()).
    const api = {
      // factory(): yeni, boş bir nesne üretir -> { ... }
      // opts.initialSize: havuzu baştan bu kadar nesneyle ısıtır (pre-warm),
      //   oyun ortasında ilk spawn anında "new" maliyeti ödenmesin diye.
      // opts.maxSize: serbest (kullanılmayan) havuzda tutulacak azami nesne
      //   sayısı; aşımında fazla nesneler tamamen bırakılır (GC'ye gider).
      // opts.reset(obj, props): nesneyi spawn/recycle anında ilk durumuna
      //   döndürür (konum, hız, can vb.).
      register(type, factory, opts = {}) {
        const p = {
          factory,
          reset: opts.reset || (() => {}),
          free: [],
          active: new Set(),
          maxSize: opts.maxSize ?? Infinity,
          created: 0
        };
        pools.set(type, p);
        const initialSize = opts.initialSize || 0;
        for (let i = 0; i < initialSize; i++) {
          const obj = factory();
          obj._poolType = type;
          obj._pooled = true;
          obj.dead = true;
          p.free.push(obj);
          p.created++;
        }
        return api;
      },

      // Havuzdan boşta bir nesne alır (varsa) ya da fabrikayla yeni üretir,
      // reset(obj, props) ile ilk haline döndürüp aktif kümeye ekler.
      spawn(type, props = {}) {
        const p = _get(type);
        let obj = p.free.pop();
        if (!obj) {
          obj = p.factory();
          obj._poolType = type;
          obj._pooled = true;
          p.created++;
        }
        p.active.add(obj);
        obj.dead = false;
        p.reset(obj, props);
        return obj;
      },

      // Nesneyi tamamen pasif hale getirir ve serbest listeye geri koyar
      // (maxSize aşılmadıysa). p.active'den MUTLAKA siler — aksi halde Set
      // sonsuza dek büyür ve nesneler GC tarafından toplanamaz/yeniden
      // kullanılamaz (bkz. dosya başındaki "bellek sızıntısı" notu).
      // NOT: Bunu elle çağırman gerekmez — engine.pool.group(type) ile
      // oluşturduğun bir grubun update()'i, item.dead=true olduğunda bunu
      // OTOMATİK çağırır. Manuel akış kullanıyorsan (kendi dizinle grup
      // yönetiyorsan) nesne öldüğünde bunu senin çağırman gerekir.
      release(type, obj) {
        const p = _get(type);
        p.active.delete(obj);
        obj.dead = true;
        if (p.free.length < p.maxSize) p.free.push(obj);
      },

      // ASIL ÖZELLİK: nesneyi yok edip yeniden yaratmak yerine, ekranda
      // başka ve ekrana optimize (diğer aktif aynı-tip nesnelerle
      // çakışmayan) bir konuma taşıyarak "diriltir". Nesne p.active'de
      // zaten kayıtlıysa (normal akış) bir şey değişmez; release() sonrası
      // tekrar recycle edilirse (nadir/manuel senaryo) kendini yeniden
      // aktif kümeye ekler.
      // opts.edge: 'top' | 'bottom' | 'left' | 'right' | 'random' (vars: 'top')
      //   -> yeni konumun canvas'ın hangi kenarından "içeri gireceğini" seçer.
      // opts.margin: kenarın canvas dışına ne kadar taştığı (piksel, vars: 40)
      // opts.minGap: aynı tip diğer aktif nesnelere göre minimum mesafe
      //   (vars: 60) -> nesnelerin üst üste/yan yana yığılmasını önler.
      // opts.maxAttempts: uygun (çakışmayan) konum bulmak için deneme sayısı
      //   (vars: 8); bulunamazsa son denenen konum kullanılır.
      // opts.reset(obj, {x,y}): register() sırasındaki reset yerine bu
      //   çağrıda özel bir sıfırlama yapmak istersen (opsiyonel).
      recycle(type, obj, opts = {}) {
        const p = _get(type);
        const canvas = engine.canvas;
        const margin = opts.margin ?? 40;
        const minGap = opts.minGap ?? 60;
        const maxAttempts = opts.maxAttempts ?? 8;
        let edge = opts.edge || 'top';

        let x = 0, y = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const pick = edge === 'random'
            ? util.choice(['top', 'bottom', 'left', 'right'])
            : edge;
          if (pick === 'top') { x = util.rand(margin, canvas.width - margin); y = -margin; }
          else if (pick === 'bottom') { x = util.rand(margin, canvas.width - margin); y = canvas.height + margin; }
          else if (pick === 'left') { x = -margin; y = util.rand(margin, canvas.height - margin); }
          else { x = canvas.width + margin; y = util.rand(margin, canvas.height - margin); }

          // Ekrana optimize yerleşim: diğer aktif aynı-tip nesnelerle
          // çakışıp çakışmadığını kontrol et; çakışıyorsa yeniden dene.
          let overlaps = false;
          for (const other of p.active) {
            if (other === obj) continue;
            if (util.dist(x, y, other.x, other.y) < minGap) { overlaps = true; break; }
          }
          if (!overlaps) break;
        }

        obj.x = x;
        obj.y = y;
        obj.dead = false;
        p.active.add(obj); // idempotent: zaten aktifse Set'te değişiklik olmaz
        p.free = p.free.filter(f => f !== obj); // release sonrası recycle edildiyse free'den çıkar
        (opts.reset || p.reset)(obj, { x, y });
        return obj;
      },

      // Havuza doğrudan bağlı bir grup döndürür: createGroup ile aynı API'ye
      // sahiptir (add/update/forEach/draw/clear/count) ama artı olarak:
      //   - grp.spawn(props): pool.spawn(type, props) yapar VE otomatik
      //     olarak grubun kendi listesine ekler.
      //   - grp.update(dt, fn) içinde bir öğe item.dead=true olduğunda,
      //     splice'lanmadan hemen önce pool.release(type, item) OTOMATİK
      //     çağrılır -> nesne p.active'den silinir ve free listesine geri
      //     döner. Bu, "createGroup ile pool entegrasyonu kopuk" sorununu
      //     çözer: gruptan düşen her nesne otomatik olarak havuza iade edilir.
      //
      // Kullanım:
      //   const meteors = engine.pool.group('meteor');
      //   meteors.spawn({ x: 100, y: -20 });
      //   meteors.update(dt, (m) => { m.y += m.vy; if (m.y > H) m.dead = true; });
      group(type) {
        _get(type); // erken hata fırlatmak için (tip kayıtlı mı diye)
        const grp = createGroup((obj) => api.release(type, obj));
        grp.spawn = (props) => grp.add(api.spawn(type, props));
        return grp;
      },

      // Debug/HUD için: { active, free, created } sayıları.
      stats(type) {
        const p = pools.get(type);
        if (!p) return null;
        return { active: p.active.size, free: p.free.length, created: p.created };
      }
    };

    return api;
  }

  // =========================================================
  // ÇARPIŞMA TESPİTİ (Hardcore.collide)
  // =========================================================
  const collide = {
    // a ve b: {x, y, r} (merkez + yarıçap)
    circles(a, b) {
      return util.dist(a.x, a.y, b.x, b.y) < (a.r + b.r);
    },
    // a ve b: {x, y, width, height} (sol-üst köşe)
    rects(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x &&
             a.y < b.y + b.height && a.y + a.height > b.y;
    },
    // c: {x,y,r} daire, r2: {x,y,width,height} dikdörtgen
    circleRect(c, r2) {
      const closestX = util.clamp(c.x, r2.x, r2.x + r2.width);
      const closestY = util.clamp(c.y, r2.y, r2.y + r2.height);
      return util.dist(c.x, c.y, closestX, closestY) < c.r;
    }
  };

  // =========================================================
  // RENDERER ORTAK YARDIMCILARI
  // WebGL ve Canvas 2D renderer'ları arasında paylaşılan
  // renk çözümleme yardımcısı: herhangi bir CSS renk string'ini
  // ('#ffcc00', 'red', 'rgba(0,0,0,0.5)'...) [r,g,b,a] (0-1) dizisine
  // çevirir. 1x1'lik gizli bir Canvas 2D üzerinden çözülür — yani
  // WebGL modunda bile renk ayrıştırma işini Canvas 2D üstleniyor.
  // =========================================================
  // Modül import edilir edilmez (henüz hiçbir Engine kurulmadan) DOM'a
  // dokunmasın diye canvas İLK resolveColor() çağrısında (lazy) kurulur
  // — bu sayede hardcore5.js, tarayıcı olmayan ortamlarda (Node/bundler/
  // test araçları) require()/import edilebilir, sadece gerçek çizim
  // başladığında DOM gerekir.
  let _colorCanvas = null;
  let _colorCtx = null;
  const _colorCache = new Map();
  function resolveColor(cssColor) {
    let cached = _colorCache.get(cssColor);
    if (cached) return cached;
    if (!_colorCtx) {
      _colorCanvas = document.createElement('canvas');
      _colorCanvas.width = 1;
      _colorCanvas.height = 1;
      _colorCtx = _colorCanvas.getContext('2d', { willReadFrequently: true });
    }
    _colorCtx.clearRect(0, 0, 1, 1);
    _colorCtx.fillStyle = cssColor;
    _colorCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = _colorCtx.getImageData(0, 0, 1, 1).data;
    cached = [r / 255, g / 255, b / 255, a / 255];
    _colorCache.set(cssColor, cached);
    return cached;
  }

  // Döndürülmüş bir dikdörtgenin 4 köşesini (TRIANGLE_STRIP sırasıyla:
  // sol-üst, sağ-üst, sol-alt, sağ-alt) piksel uzayında hesaplar.
  function quadCorners(x, y, w, h, rotation = 0) {
    if (!rotation) {
      return [x, y, x + w, y, x, y + h, x + w, y + h];
    }
    const cx = x + w / 2, cy = y + h / 2;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    const out = [];
    for (const [px, py] of corners) {
      const dx = px - cx, dy = py - cy;
      out.push(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
    }
    return out;
  }

  // "Doku benzeri" bir kaynağın (ham Image/Canvas ya da assets.js
  // tarafından üretilen {source, dirty, ...} sarmalayıcısı) gerçek
  // piksel kaynağını döndürür.
  function unwrapSource(imageLike) {
    if (imageLike && typeof imageLike === 'object' && 'source' in imageLike) {
      return imageLike.source;
    }
    return imageLike;
  }

  // =========================================================
  // WEBGL RENDERER (Hardcore.renderers.GLRenderer)
  // Basit, "immediate mode" (kare başına draw call) bir 2D üstü
  // renderer: dört köşeli quad'lar üzerinden resim/dikdörtgen/daire
  // çizer. Küçük/orta ölçekli arcade oyunları (yüzlerce nesne) için
  // yeterince hızlıdır; instancing/batching yapmaz — sadelik tercih
  // edilmiştir.
  // =========================================================
  const VS_TEXTURE = `
    attribute vec2 a_position;
    attribute vec2 a_texcoord;
    uniform vec2 u_resolution;
    varying vec2 v_texcoord;
    void main() {
      vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      v_texcoord = a_texcoord;
    }
  `;
  const FS_TEXTURE = `
    precision mediump float;
    varying vec2 v_texcoord;
    uniform sampler2D u_image;
    uniform float u_alpha;
    void main() {
      vec4 c = texture2D(u_image, v_texcoord);
      if (c.a <= 0.0) discard;
      gl_FragColor = vec4(c.rgb, c.a * u_alpha);
    }
  `;
  const VS_COLOR = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    void main() {
      vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    }
  `;
  const FS_COLOR = `
    precision mediump float;
    uniform vec3 u_color;
    uniform float u_alpha;
    void main() {
      gl_FragColor = vec4(u_color, u_alpha);
    }
  `;
  const VS_CIRCLE = `
    attribute vec2 a_position;
    attribute vec2 a_local;
    uniform vec2 u_resolution;
    varying vec2 v_local;
    void main() {
      vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      v_local = a_local;
    }
  `;
  const FS_CIRCLE = `
    precision mediump float;
    varying vec2 v_local;
    uniform vec3 u_color;
    uniform float u_alpha;
    void main() {
      float d = length(v_local);
      if (d > 1.0) discard;
      float edgeAlpha = 1.0 - smoothstep(0.85, 1.0, d);
      gl_FragColor = vec4(u_color, u_alpha * edgeAlpha);
    }
  `;

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Hardcore5 GL shader derleme hatası: ' + info);
    }
    return sh;
  }
  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Hardcore5 GL program bağlama hatası: ' + info);
    }
    return program;
  }

  // Attrib/uniform konumlarını program başına önbelleğe alır
  // (her draw call'da getAttribLocation/getUniformLocation çağırmamak için)
  const _locCache = new WeakMap();
  function getAttrib(gl, program, name) {
    let c = _locCache.get(program);
    if (!c) { c = { a: {}, u: {} }; _locCache.set(program, c); }
    if (!(name in c.a)) c.a[name] = gl.getAttribLocation(program, name);
    return c.a[name];
  }
  function getUniform(gl, program, name) {
    let c = _locCache.get(program);
    if (!c) { c = { a: {}, u: {} }; _locCache.set(program, c); }
    if (!(name in c.u)) c.u[name] = gl.getUniformLocation(program, name);
    return c.u[name];
  }

  class GLRenderer {
    constructor(gl, canvas) {
      this.gl = gl;
      this.canvas = canvas;
      // Kaynak (Image/Canvas) -> {tex: WebGLTexture} eşlemesi.
      // WeakMap olduğu için kaynak artık kullanılmadığında kendiliğinden temizlenir.
      this._texCache = new WeakMap();

      this.texProgram = createProgram(gl, VS_TEXTURE, FS_TEXTURE);
      this.colorProgram = createProgram(gl, VS_COLOR, FS_COLOR);
      this.circleProgram = createProgram(gl, VS_CIRCLE, FS_CIRCLE);

      this.posBuffer = gl.createBuffer();
      this.uvBuffer = gl.createBuffer();
      this.localBuffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.localBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
    }

    clear(color) {
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      const [r, g, b] = resolveColor(color);
      gl.clearColor(r, g, b, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    _uploadPositions(corners) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STREAM_DRAW);
    }

    // Bir kaynağı (ham Image/Canvas ya da assets sarmalayıcısı) WebGL
    // dokusuna çevirir/önbellekten döndürür. Sarmalayıcı "dirty" ise
    // (assets.dynamicTexture().redraw() çağrıldıysa) dokuyu yeniden yükler.
    resolveTexture(imageLike) {
      const gl = this.gl;
      const isWrapper = imageLike && typeof imageLike === 'object' && 'source' in imageLike;
      const source = isWrapper ? imageLike.source : imageLike;
      let entry = this._texCache.get(source);
      if (!entry) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        entry = { tex };
        this._texCache.set(source, entry);
        if (isWrapper) imageLike.dirty = false;
      } else if (isWrapper && imageLike.dirty) {
        gl.bindTexture(gl.TEXTURE_2D, entry.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        imageLike.dirty = false;
      }
      return entry.tex;
    }

    // image: ham <img>/<canvas> ya da engine.assets.get(...) sarmalayıcısı
    // opts: { rotation (radyan), alpha (0-1), flipX }
    // opts.sx/sy/sw/sh verilirse (sprite sheet karesi), sadece o kaynak
    // dikdörtgeni çizilir — bkz. engine.assets.spriteSheet().
    drawImage(image, x, y, w, h, opts = {}) {
      if (!image) return;
      const source = unwrapSource(image);
      if (!source || source.width === 0 || source.height === 0) return; // henüz yüklenmemiş
      const srcW = source.width, srcH = source.height;
      const sx = opts.sx ?? 0, sy = opts.sy ?? 0;
      const sw = opts.sw ?? srcW, sh = opts.sh ?? srcH;
      const width = w ?? sw;
      const height = h ?? sh;
      const rotation = opts.rotation || 0;
      const alpha = opts.alpha ?? 1;
      const gl = this.gl;
      const tex = this.resolveTexture(image);

      this._uploadPositions(quadCorners(x, y, width, height, rotation));

      gl.useProgram(this.texProgram);
      const posLoc = getAttrib(gl, this.texProgram, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const uvLoc = getAttrib(gl, this.texProgram, 'a_texcoord');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      const u0 = sx / srcW, v0 = sy / srcH;
      const u1 = (sx + sw) / srcW, v1 = (sy + sh) / srcH;
      const uv = opts.flipX ? [u1, v0, u0, v0, u1, v1, u0, v1] : [u0, v0, u1, v0, u0, v1, u1, v1];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STREAM_DRAW);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(getUniform(gl, this.texProgram, 'u_resolution'), this.canvas.width, this.canvas.height);
      gl.uniform1f(getUniform(gl, this.texProgram, 'u_alpha'), alpha);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(getUniform(gl, this.texProgram, 'u_image'), 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    drawRect(x, y, w, h, color, alpha = 1) {
      const gl = this.gl;
      this._uploadPositions(quadCorners(x, y, w, h, 0));

      gl.useProgram(this.colorProgram);
      const posLoc = getAttrib(gl, this.colorProgram, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(getUniform(gl, this.colorProgram, 'u_resolution'), this.canvas.width, this.canvas.height);
      const [r, g, b, a] = resolveColor(color);
      gl.uniform3f(getUniform(gl, this.colorProgram, 'u_color'), r, g, b);
      gl.uniform1f(getUniform(gl, this.colorProgram, 'u_alpha'), alpha * a);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    drawCircle(x, y, r, color, alpha = 1) {
      const gl = this.gl;
      this._uploadPositions(quadCorners(x - r, y - r, r * 2, r * 2, 0));

      gl.useProgram(this.circleProgram);
      const posLoc = getAttrib(gl, this.circleProgram, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const localLoc = getAttrib(gl, this.circleProgram, 'a_local');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.localBuffer);
      gl.enableVertexAttribArray(localLoc);
      gl.vertexAttribPointer(localLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(getUniform(gl, this.circleProgram, 'u_resolution'), this.canvas.width, this.canvas.height);
      const [r_, g_, b_, a_] = resolveColor(color);
      gl.uniform3f(getUniform(gl, this.circleProgram, 'u_color'), r_, g_, b_);
      gl.uniform1f(getUniform(gl, this.circleProgram, 'u_alpha'), alpha * a_);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  // =========================================================
  // CANVAS 2D RENDERER (Hardcore.renderers.Canvas2DRenderer)
  // GLRenderer ile birebir aynı API'yi (clear/drawImage/drawRect/
  // drawCircle) Canvas 2D üzerinden uygular. WebGL desteklenmeyen
  // tarayıcı/cihazlarda otomatik devreye giren fallback budur.
  // =========================================================
  class Canvas2DRenderer {
    constructor(ctx) { this.ctx = ctx; }

    clear(color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // opts.sx/sy/sw/sh verilirse (sprite sheet karesi), sadece o kaynak
    // dikdörtgeni çizilir — bkz. engine.assets.spriteSheet().
    drawImage(image, x, y, w, h, opts = {}) {
      if (!image) return;
      const ctx = this.ctx;
      const source = unwrapSource(image);
      if (!source || source.width === 0 || source.height === 0) return; // henüz yüklenmemiş
      const srcW = source.width, srcH = source.height;
      const sx = opts.sx ?? 0, sy = opts.sy ?? 0;
      const sw = opts.sw ?? srcW, sh = opts.sh ?? srcH;
      const width = w ?? sw;
      const height = h ?? sh;
      const rotation = opts.rotation || 0;
      const alpha = opts.alpha ?? 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + width / 2, y + height / 2);
      if (rotation) ctx.rotate(rotation);
      if (opts.flipX) ctx.scale(-1, 1);
      ctx.drawImage(source, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
      ctx.restore();
    }

    drawRect(x, y, w, h, color, alpha = 1) {
      const ctx = this.ctx;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }

    drawCircle(x, y, r, color, alpha = 1) {
      const ctx = this.ctx;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // =========================================================
  // KAMERA (engine.camera)
  // Pan/zoom/follow/shake sağlayan, backend'den bağımsız bir dünya-uzayı
  // katmanı. engine.renderer HİÇBİR ŞEKİLDE değişmez — HUD/menü gibi
  // ekran-uzayı çizimler için onu doğrudan kullanmaya devam edebilirsin.
  // Kameranın etkilemesini istediğin çizimler için engine.camera.view()
  // ile sarılmış bir renderer kullan:
  //
  //   draw(renderer) {
  //     const world = engine.camera.view(renderer);
  //     world.drawCircle(player.x, player.y, 10, '#fff'); // kameradan etkilenir
  //     renderer.drawRect(10, 10, 120, 24, '#000');        // HUD, etkilenmez
  //   }
  //
  // camera.x/camera.y: ekranın SOL-ÜST köşesinde görünen dünya koordinatı
  // (scroll offset). Varsayılan (0,0) ve zoom=1 iken engine.camera.view(r)
  // ham renderer ile birebir aynı sonucu verir (kırıcı değişiklik yok).
  // =========================================================
  class Camera {
    constructor(engine) {
      this.engine = engine;
      this.x = 0;
      this.y = 0;
      this.zoom = 1;
      this.target = null;      // { x, y } sahip bir nesne (örn. oyuncu)
      this.smoothing = 0.1;    // 0 = hedefe anında yapış, 1'e yakın = çok yumuşak takip
      this._trauma = 0;        // 0..1, screen-shake şiddeti
      this._shakeX = 0;
      this._shakeY = 0;
    }

    // Bir nesneyi takip etmeye başlar; her karede o nesne ekranın ortasında
    // kalacak şekilde kamera kayar (smoothing ile yumuşatılmış).
    follow(target, opts = {}) {
      this.target = target;
      if (opts.smoothing !== undefined) this.smoothing = opts.smoothing;
      return this;
    }
    unfollow() { this.target = null; return this; }

    // Ekran sarsıntısı tetikler (çarpışma, patlama vb. için). amount 0..1
    // aralığında birikir (üst üste çağrılabilir), her karede sönümlenir.
    shake(amount = 0.5) {
      this._trauma = Math.min(1, this._trauma + amount);
      return this;
    }

    // Motorun oyun döngüsü tarafından her karede otomatik çağrılır.
    update(dt) {
      if (this.target) {
        const c = this.engine.canvas;
        const desiredX = this.target.x - (c.width / this.zoom) / 2;
        const desiredY = this.target.y - (c.height / this.zoom) / 2;
        if (this.smoothing <= 0) {
          this.x = desiredX; this.y = desiredY;
        } else {
          // dt'den bağımsız (frame-rate independent) üstel yumuşatma
          const t = 1 - Math.pow(1 - this.smoothing, dt * 60);
          this.x += (desiredX - this.x) * t;
          this.y += (desiredY - this.y) * t;
        }
      }
      if (this._trauma > 0) {
        this._trauma = Math.max(0, this._trauma - dt * 1.5);
        const power = this._trauma * this._trauma; // trauma^2: daha doğal his
        this._shakeX = (Math.random() * 2 - 1) * 16 * power;
        this._shakeY = (Math.random() * 2 - 1) * 16 * power;
      } else {
        this._shakeX = 0; this._shakeY = 0;
      }
    }

    worldToScreen(x, y) {
      return {
        x: (x - this.x) * this.zoom + this._shakeX,
        y: (y - this.y) * this.zoom + this._shakeY,
      };
    }
    screenToWorld(x, y) {
      return {
        x: (x - this._shakeX) / this.zoom + this.x,
        y: (y - this._shakeY) / this.zoom + this.y,
      };
    }

    // Verilen renderer'ı (WebGL ya da Canvas2D fark etmez) sarıp, aynı
    // clear/drawImage/drawRect/drawCircle arayüzünü sunan ama tüm
    // koordinatları bu kameranın pan/zoom/shake durumuna göre dönüştüren
    // bir "dünya-uzayı" renderer'ı döner.
    view(renderer) {
      const cam = this;
      return {
        clear: (color) => renderer.clear(color),
        drawImage: (image, x, y, w, h, opts) => {
          const p = cam.worldToScreen(x, y);
          renderer.drawImage(image, p.x, p.y, w != null ? w * cam.zoom : w, h != null ? h * cam.zoom : h, opts);
        },
        drawRect: (x, y, w, h, color, alpha) => {
          const p = cam.worldToScreen(x, y);
          renderer.drawRect(p.x, p.y, w * cam.zoom, h * cam.zoom, color, alpha);
        },
        drawCircle: (x, y, r, color, alpha) => {
          const p = cam.worldToScreen(x, y);
          renderer.drawCircle(p.x, p.y, r * cam.zoom, color, alpha);
        },
      };
    }
  }

  // =========================================================
  // SCRIPT KÖPRÜSÜ (engine.script) — BrickScript entegrasyonu
  // Oyun mantığını, motoru derlemeden/yeniden yüklemeden değiştirilebilen
  // BrickScript koduyla yazmayı sağlar. brickscript-optimized.js,
  // hardcore5.js'ten ÖNCE sayfaya yüklenmiş olmalı (global BrickScript
  // nesnesini bekler — engine.script.load() ilk çağrıldığında kontrol
  // edilir, hardcore5.js'in kendisi BrickScript'e sert bağımlı DEĞİLDİR).
  //
  //   <script src="brickscript-optimized.js"></script>
  //   <script src="hardcore5.js"></script>
  //   <script>
  //     const engine = Hardcore5.init({ canvas: 'gameCanvas' });
  //     engine.script.load(`
  //       blueprint onframe(dt) {
  //         show "kare süresi: " + dt;
  //       }
  //       blueprint onresize() {
  //         show "ekran boyutu değişti";
  //       }
  //     `, {
  //       // motorun kendi fonksiyonlarını BrickScript koduna aç:
  //       spawnMeteor(x, y) { meteors.spawn({ x, y }); },
  //     });
  //     engine.script.on('resize', 'onresize'); // engine.events -> blueprint köprüsü
  //     engine.start({
  //       update(dt) { engine.script.call('onframe', [dt]); }
  //     });
  //   </script>
  // =========================================================
  function createScriptRuntime(engine) {
    return {
      interpreter: null,

      // BrickScript kaynağını derler ve üst düzey kodunu (blueprint
      // tanımları dahil) hemen bir kez çalıştırır. `natives`, BrickScript
      // tarafından çağrılabilecek host (JS) fonksiyonlarıdır — motorun
      // kendi API'lerini (pool.spawn, camera.shake vb.) script'e açmak
      // için kullanılır.
      load(source, natives = {}) {
        if (typeof global.BrickScript === 'undefined') {
          throw new Error(
            "Hardcore5: engine.script.load() için brickscript-optimized.js sayfaya " +
            "hardcore5.js'ten ÖNCE yüklenmiş olmalı."
          );
        }
        const BrickScript = global.BrickScript;
        const bridged = {
          rand: (a, b) => engine.util.rand(a, b),
          randInt: (a, b) => engine.util.randInt(a, b),
          ...natives,
        };
        this.interpreter = new BrickScript.Interpreter(
          (text) => engine.events.emit('script-show', text), // show'lar 'script-show' event'i olarak yayılır
          bridged
        );
        this.interpreter.run(BrickScript.parse(source));
        return this;
      },

      // Yüklü scriptte verilen isimde bir blueprint tanımlı mı?
      has(name) {
        return !!(this.interpreter && this.interpreter.global.vars[name] !== undefined);
      },

      // Bir blueprint'i çağırır (varsa); tanımlı değilse sessizce null
      // döner — her karede önce has() ile kontrol etmeye gerek kalmadan
      // doğrudan engine.script.call('onframe', [dt]) diye çağırabilmek için.
      call(name, args = []) {
        if (!this.has(name)) return null;
        return this.interpreter.invoke(this.interpreter.global.vars[name], args);
      },

      // engine.events üzerindeki bir olayı ('resize', 'pause', 'resume',
      // 'scene-change', 'gl-context-lost'...) bir blueprint'e bağlar.
      // Dönen fonksiyon çağrılırsa bağlantıyı kaldırır (unsubscribe).
      on(eventName, blueprintName) {
        return engine.events.on(eventName, (data) => this.call(blueprintName, [data ?? null]));
      },
    };
  }

  // =========================================================
  // PARÇACIK / PATLAMA EFEKTLERİ (Hardcore.particles)
  // engine.renderer üzerinden çizer (WebGL veya Canvas 2D fark etmez).
  // =========================================================
  function createParticleSystem(engine) {
    const group = createGroup();
    return {
      explode(x, y, opts = {}) {
        const count = opts.count ?? 12;
        const color = opts.color ?? '#ffcc00';
        const speed = opts.speed ?? 3;
        const life = opts.life ?? 30; // kare (frame) cinsinden ömür
        const size = opts.size ?? 3;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
          const v = util.rand(speed * 0.4, speed);
          group.add({
            x, y,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v,
            life, maxLife: life,
            size: util.rand(size * 0.5, size),
            color
          });
        }
      },
      update(timeScale = 1) {
        group.update(1, (p) => {
          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= timeScale;
          if (p.life <= 0) p.dead = true;
        });
      },
      // Not: eskiden draw(ctx) idi; artık parametre almıyor, doğrudan
      // engine.renderer'ı kullanıyor.
      draw() {
        group.draw(engine.renderer, (renderer, p) => {
          renderer.drawCircle(p.x, p.y, p.size, p.color, Math.max(0, p.life / p.maxLife));
        });
      },
      clear() { group.clear(); }
    };
  }

  // =========================================================
  // YILDIZ / UZAY ARKA PLANI (Hardcore.Starfield)
  // engine.renderer üzerinden çizer.
  // =========================================================
  class Starfield {
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.canvas = engine.canvas;
      this.count = opts.count ?? 100;
      this.color = opts.color ?? '#ffffff';
      this.speed = opts.speed ?? 2;
      this.stars = [];
      this.fill();
    }
    fill() {
      this.stars = [];
      for (let i = 0; i < this.count; i++) {
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size: util.rand(0.5, 2),
          speed: util.rand(this.speed * 0.5, this.speed * 1.5)
        });
      }
    }
    update(timeScale = 1) {
      this.stars.forEach(star => {
        star.y += star.speed * timeScale;
        if (star.y > this.canvas.height) {
          star.y = 0;
          star.x = Math.random() * this.canvas.width;
        }
      });
    }
    // Not: eskiden draw(ctx) idi; artık parametre almıyor.
    draw() {
      const renderer = this.engine.renderer;
      this.stars.forEach(star => {
        renderer.drawRect(star.x, star.y, star.size, star.size, this.color, util.rand(0.4, 1));
      });
    }
  }

  // =========================================================
  // EKRAN / ARAYÜZ YÖNETİMİ (Hardcore.ui)
  // Menü, duraklatma, oyun-sonu gibi id'li div'leri
  // göster/gizle ve HUD metinlerini güncelle
  // =========================================================
  const ui = {
    show(id, display = 'flex') {
      const el = document.getElementById(id);
      if (el) el.style.display = display;
    },
    hide(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    },
    toggle(id, display = 'flex') {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = (el.style.display === 'none' || !el.style.display) ? display : 'none';
    },
    text(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    },

    // Menü / duraklatma / oyun-sonu gibi kaplama ekranlarını
    // HTML'de elle yazmana gerek kalmadan üretir.
    // opts:
    //   title, message   -> metinler
    //   buttons: [{ id, label, onClick }]
    //   visible: false   -> başta gizli oluşturulur (varsayılan true)
    //   className        -> ekstra CSS sınıfı eklemek için
    // Dönen değer: { el, show(), hide(), setText(id, value) }
    createScreen(id, opts = {}) {
      let el = document.getElementById(id);
      if (el) el.remove(); // aynı id ile tekrar çağrılırsa üstüne yazar

      el = document.createElement('div');
      el.id = id;
      el.className = `hc-screen${opts.className ? ' ' + opts.className : ''}`;
      Object.assign(el.style, {
        position: 'fixed', inset: '0', display: opts.visible === false ? 'none' : 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '12px', background: opts.background || 'rgba(0,0,0,0.75)',
        color: opts.color || '#fff', fontFamily: opts.fontFamily || 'sans-serif',
        textAlign: 'center', zIndex: opts.zIndex ?? 100, padding: '16px'
      });

      if (opts.title) {
        const h = document.createElement('h1');
        h.id = `${id}-title`;
        h.textContent = opts.title;
        h.style.margin = '0';
        el.appendChild(h);
      }
      if (opts.message) {
        const p = document.createElement('p');
        p.id = `${id}-message`;
        p.textContent = opts.message;
        p.style.margin = '0';
        el.appendChild(p);
      }
      (opts.buttons || []).forEach(btn => {
        const b = document.createElement('button');
        b.id = btn.id || `${id}-${btn.label}`;
        b.textContent = btn.label;
        Object.assign(b.style, {
          padding: '10px 20px', fontSize: '16px', cursor: 'pointer',
          border: 'none', borderRadius: '8px'
        });
        if (btn.onClick) b.addEventListener('click', btn.onClick);
        el.appendChild(b);
      });

      document.body.appendChild(el);

      return {
        el,
        show() { el.style.display = 'flex'; },
        hide() { el.style.display = 'none'; },
        setText(childId, value) {
          const child = document.getElementById(`${id}-${childId}`);
          if (child) child.textContent = value;
        },
        remove() { el.remove(); }
      };
    },
    removeScreen(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  };

  // =========================================================
  // SAHNE YÖNETİMİ (engine.scenes)
  // Menü / oyun / oyun-sonu gibi farklı "durumları" (state) ayrı
  // update/draw çiftleri olarak tanımlayıp aralarında geçiş yapmayı
  // sağlar. engine.ui.createScreen() DOM tabanlı kaplama ekranlarını
  // yönetirken, engine.scenes CANVAS içindeki oyun mantığının/çiziminin
  // hangi "sahnede" olduğunu yönetir — ikisi birlikte kullanılabilir
  // (örn. 'menu' sahnesinde bir DOM ekranı gösterip 'game' sahnesine
  // geçince gizlemek gibi).
  //
  // İki küçük kolaylık:
  //   1) firstScene: true -> engine.scenes.add() içinde bu bayrağı
  //      taşıyan sahne, motorun başlangıç sahnesi olarak işaretlenir.
  //      engine.scenes.start() ismi vermeden çağrılırsa bu sahneden
  //      başlar (elle engine.scenes.start('adı') vermeye gerek kalmaz).
  //   2) update(dt, timeScale) fonksiyonu SONUNDA bir sahne adı (string)
  //      döndürürse, motor kare bittiğinde otomatik olarak o sahneye
  //      geçer (engine.scenes.switch() çağırmana gerek kalmaz) —
  //      "sahne kodunun sonunda motorun hangi sahneye geçeceğini
  //      söylemesi" tam olarak bu.
  //
  // Kullanım:
  //   engine.scenes.add('menu', {
  //     firstScene: true,
  //     enter() { engine.ui.show('menuScreen'); },
  //     exit()  { engine.ui.hide('menuScreen'); },
  //     update(dt) {
  //       if (engine.input.isDown(' ')) return 'game'; // -> otomatik geçiş
  //     },
  //     draw(renderer) { ... }
  //   });
  //   engine.scenes.add('game', {
  //     enter(props) { resetGame(props); },
  //     update(dt, timeScale) {
  //       if (playerDead) return 'gameover'; // sahne sonunda hedefi söyle
  //     },
  //     draw(renderer, timeScale) { ... }
  //   });
  //   engine.scenes.start(); // firstScene: true olan 'menu'den başlar
  //   ...
  //   engine.scenes.switch('game', { difficulty: 'hard' }); // istersen elle de geçebilirsin
  // =========================================================
  function createSceneManager(engine) {
    const scenes = new Map(); // name -> { enter, exit, update, draw }
    let currentName = null;
    let current = null;
    let firstSceneName = null;

    const api = {
      // scene: { enter(props), exit(), update(dt, timeScale), draw(renderer, timeScale), firstScene }
      // Verilmeyen fonksiyonlar no-op olarak tamamlanır.
      // firstScene: true -> bu sahneyi engine.scenes.start()'ın isimsiz
      // (parametresiz) çağrısında kullanılacak başlangıç sahnesi yapar.
      // Birden fazla sahne firstScene:true ile işaretlenirse sonuncusu
      // geçerli olur ve konsola uyarı basılır.
      add(name, scene = {}) {
        scenes.set(name, {
          enter: scene.enter || (() => {}),
          exit: scene.exit || (() => {}),
          update: scene.update || (() => {}),
          draw: scene.draw || (() => {})
        });
        if (scene.firstScene) {
          if (firstSceneName && firstSceneName !== name) {
            console.warn(
              `Hardcore5.scenes: birden fazla sahne firstScene:true olarak işaretlendi ` +
              `("${firstSceneName}" ve "${name}"). Son işaretlenen ("${name}") geçerli olacak.`
            );
          }
          firstSceneName = name;
        }
        return api;
      },

      remove(name) {
        if (currentName === name) {
          throw new Error(`Hardcore5.scenes: aktif sahne ("${name}") kaldırılamaz, önce başka bir sahneye geç.`);
        }
        scenes.delete(name);
        if (firstSceneName === name) firstSceneName = null;
        return api;
      },

      has(name) { return scenes.has(name); },

      // Şu an aktif olan sahnenin adı (yoksa null)
      get current() { return currentName; },

      // firstScene: true ile işaretlenmiş sahnenin adı (yoksa null)
      get firstScene() { return firstSceneName; },

      // Aktif sahnenin exit()'ini, sonra hedef sahnenin enter()'ını
      // çağırarak sahne değiştirir. props, exit()'e { to } ile,
      // enter()'a olduğu gibi geçirilir.
      switch(name, props) {
        const next = scenes.get(name);
        if (!next) {
          throw new Error(
            `Hardcore5.scenes: "${name}" sahnesi kayıtlı değil. ` +
            `Önce engine.scenes.add('${name}', { enter, exit, update, draw }) çağır.`
          );
        }
        const from = currentName;
        if (current) current.exit({ to: name });
        currentName = name;
        current = next;
        engine.events.emit('scene-change', { from, to: name, props });
        current.enter(props);
        return api;
      },

      // engine.start()'ı sarmalar: her karede yalnızca aktif sahnenin
      // update/draw'ını çağırır. initialScene verilirse önce ona geçer;
      // verilmezse firstScene:true ile işaretlenmiş sahneden başlar.
      // Aktif sahnenin update()'i bir sahne adı (string) DÖNDÜRÜRSE, o
      // kare bittiğinde motor otomatik olarak o sahneye geçer.
      start(initialScene, props) {
        const target = initialScene || firstSceneName;
        if (!target) {
          throw new Error(
            'Hardcore5.scenes: başlangıç sahnesi belirsiz. ' +
            "engine.scenes.start('sahneAdi') ile ver ya da bir sahneyi " +
            "engine.scenes.add('sahneAdi', { firstScene: true, ... }) ile işaretle."
          );
        }
        api.switch(target, props);
        engine.start({
          update(dt, timeScale) {
            if (!current) return;
            const next = current.update(dt, timeScale);
            if (typeof next === 'string' && next !== currentName) {
              api.switch(next);
            }
          },
          draw(renderer, timeScale) { if (current) current.draw(renderer, timeScale); }
        });
        return api;
      }
    };

    return api;
  }

  // =========================================================
  // KAYIT (Hardcore.storage) — localStorage sarmalayıcı
  // =========================================================
  const storage = {
    save(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e) {
        console.warn('Hardcore.storage.save başarısız:', e);
        return false;
      }
    },
    load(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        console.warn('Hardcore.storage.load başarısız:', e);
        return fallback;
      }
    },
    clear(key) { localStorage.removeItem(key); }
  };

  // =========================================================
  // SES (Hardcore.sound) — çakışan sesleri klonlayarak çalar
  // =========================================================
  function createSound() {
    const bank = {};
    return {
      load(name, url) {
        bank[name] = new Audio(url);
        bank[name].preload = 'auto';
      },
      play(name, opts = {}) {
        const base = bank[name];
        if (!base) { console.warn(`Hardcore.sound: "${name}" yüklenmedi`); return; }
        const node = base.cloneNode();
        node.volume = opts.volume ?? 1;
        node.loop = opts.loop ?? false;
        node.play().catch(() => {});
        return node;
      },
      stopAll() {
        Object.values(bank).forEach(a => { a.pause(); a.currentTime = 0; });
      }
    };
  }

  // =========================================================
  // GÖRSEL / SPRITE YÜKLEME (Hardcore.assets)
  // Resimleri önceden yükleyip isimle erişim sağlar; oyun
  // döngüsü başlamadan tüm görsellerin hazır olduğundan
  // emin olmak için whenReady() ile beklenebilir.
  //
  // v3.0: Artık her giriş {source, dirty, kind, width, height}
  // şeklinde bir sarmalayıcı olarak döner (engine.renderer.drawImage
  // bunu doğrudan kabul eder). Ayrıca dynamicTexture() ile Canvas 2D
  // tarafında prosedürel olarak çizilip WebGL'e doku olarak yüklenen
  // dinamik dokular oluşturulabilir (gradient, metin, desen, vb).
  // =========================================================
  function createAssetLoader() {
    const entries = {};
    const pending = [];

    return {
      // Tek bir resmi kaydeder ve yüklemeyi başlatır.
      // Geriye uyumluluk için ham <img> elementini döndürür;
      // motora vermek istediğinde engine.assets.get(name) kullan.
      image(name, url) {
        const img = new Image();
        const p = new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Hardcore.assets: "${name}" yüklenemedi (${url})`));
        });
        img.src = url;
        entries[name] = { source: img, dirty: true, kind: 'image' };
        pending.push(p);
        return img;
      },
      // Birden fazla resmi tek seferde kaydeder: { ad: url, ... }
      images(map) {
        Object.entries(map).forEach(([name, url]) => this.image(name, url));
      },

      // Bir resmi eşit boyutlu ızgara karelerine böler (klasik "sprite
      // sheet"). image() gibi normal şekilde yüklenir (whenReady() ile
      // beklenmeli); ayrıca frame(i) ile renderer.drawImage(...)'e
      // doğrudan geçirilebilecek { sx, sy, sw, sh } kırpma dikdörtgenleri
      // üreten bir yardımcı döner.
      //
      //   const sheet = engine.assets.spriteSheet('hero', 'hero.png', { frameWidth: 32, frameHeight: 32 });
      //   await engine.assets.whenReady();
      //   renderer.drawImage(sheet.image, x, y, 32, 32, sheet.frame(3));
      spriteSheet(name, url, opts = {}) {
        const img = this.image(name, url);
        const frameWidth = opts.frameWidth;
        const frameHeight = opts.frameHeight;
        const margin = opts.margin || 0;
        const spacing = opts.spacing || 0;
        if (!frameWidth || !frameHeight) {
          throw new Error('Hardcore5: assets.spriteSheet() için frameWidth ve frameHeight zorunludur.');
        }
        const sheet = {
          image: img,
          frameWidth, frameHeight,
          // Görsel henüz yüklenmeden (naturalWidth=0) çağrılırsa 1 döner;
          // whenReady() sonrası doğru değerleri verir.
          get cols() {
            return Math.max(1, Math.floor((img.naturalWidth - margin * 2 + spacing) / (frameWidth + spacing)) || 1);
          },
          get rows() {
            return Math.max(1, Math.floor((img.naturalHeight - margin * 2 + spacing) / (frameHeight + spacing)) || 1);
          },
          get count() { return sheet.cols * sheet.rows; },
          // İndeksten (soldan sağa, yukarıdan aşağı) kaynak kırpma
          // dikdörtgenini döner: { sx, sy, sw, sh }.
          frame(index) {
            const cols = sheet.cols;
            const col = index % cols, row = Math.floor(index / cols);
            return {
              sx: margin + col * (frameWidth + spacing),
              sy: margin + row * (frameHeight + spacing),
              sw: frameWidth,
              sh: frameHeight,
            };
          },
        };
        entries[name + '.sheet'] = sheet;
        return sheet;
      },

      // Tiled Map Editor'den "JSON" formatında (.tmj/.json) dışa aktarılmış
      // bir haritayı yükler ve çizer. Desteklenenler: ortogonal (kare)
      // haritalar, birden fazla tile layer, birden fazla tileset (gid'e
      // göre otomatik eşleştirilir), yatay flip bayrağı. Desteklenmeyenler:
      // izometrik/hex haritalar, base64/sıkıştırılmış layer verisi
      // (Tiled'de "Layer Format: CSV" seçili olmalı — varsayılan JSON
      // dışa aktarımı zaten bunu kullanır), dikey/çapraz flip, object
      // layer'lar (ham veriye map.raw üzerinden kendin erişebilirsin).
      //
      // tilesetImages: TEK tileset'li haritalarda doğrudan bir görsel
      // (engine.assets.image() ile yüklenmiş <img>) verebilirsin. BİRDEN
      // FAZLA tileset varsa { tilesetAdı: görsel, ... } bir harita ver —
      // isimler Tiled'deki tileset adlarıyla eşleşmeli. Motor, tileset
      // görsellerini SENİN yüklemeni bekler (Tiled'in dosya içindeki göreli
      // yol referansını otomatik çözmeye çalışmaz — sayfa yapına göre bu
      // güvenilmez olurdu).
      //
      //   const tiles = engine.assets.image('tiles', 'tiles.png');
      //   const map = await engine.assets.tilemap('level1', 'level1.json', tiles);
      //   draw(renderer) {
      //     map.draw(renderer, { x: camX, y: camY, width: 800, height: 600 }); // sadece görünen kareler
      //   }
      //   if (map.solidAt(player.x, player.y, 'collision')) { ... } // "collision" katmanına göre
      tilemap(name, mapUrl, tilesetImages) {
        const promise = fetch(mapUrl)
          .then(res => {
            if (!res.ok) throw new Error(`Hardcore5: tilemap "${name}" yüklenemedi (${mapUrl}): HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (data.orientation && data.orientation !== 'orthogonal') {
              console.warn(`Hardcore5: tilemap "${name}" ortogonal değil (${data.orientation}) — sadece kare haritalar destekleniyor, sonuç beklenmedik olabilir.`);
            }
            const tileWidth = data.tilewidth, tileHeight = data.tileheight;
            const mapWidth = data.width, mapHeight = data.height;
            const FLIP_H = 0x80000000, FLIP_MASK = 0x1FFFFFFF;

            const tilesetDefs = (data.tilesets || []).map(ts => {
              let img = tilesetImages;
              const looksLikeSingleImage = tilesetImages &&
                (('source' in tilesetImages) || typeof tilesetImages.src === 'string');
              if (tilesetImages && !looksLikeSingleImage && tilesetImages[ts.name]) {
                img = tilesetImages[ts.name];
              }
              if (!img) throw new Error(`Hardcore5: tilemap "${name}" için "${ts.name}" tileset görseli verilmedi.`);
              return {
                firstgid: ts.firstgid, image: img, columns: ts.columns,
                tileWidth: ts.tilewidth, tileHeight: ts.tileheight,
                margin: ts.margin || 0, spacing: ts.spacing || 0,
              };
            }).sort((a, b) => b.firstgid - a.firstgid); // en yüksek firstgid önce -> gid'e göre doğru tileset

            function tilesetForGid(gid) {
              for (const ts of tilesetDefs) if (gid >= ts.firstgid) return ts;
              return null;
            }
            // Ham gid'i (flip bayraklarıyla) çizim karesine çevirir.
            // Dikey/çapraz flip DESTEKLENMEZ (renderer'da karşılığı yok);
            // sadece yatay flip (opts.flipX) uygulanır.
            function frameForRawGid(raw) {
              const gid = (raw & FLIP_MASK) >>> 0;
              if (!gid) return null;
              const ts = tilesetForGid(gid);
              if (!ts) return null;
              const localId = gid - ts.firstgid;
              const col = localId % ts.columns, row = Math.floor(localId / ts.columns);
              return {
                image: ts.image,
                sx: ts.margin + col * (ts.tileWidth + ts.spacing),
                sy: ts.margin + row * (ts.tileHeight + ts.spacing),
                sw: ts.tileWidth, sh: ts.tileHeight,
                flipX: !!(raw & FLIP_H),
              };
            }

            const layers = (data.layers || []).filter(l => l.type === 'tilelayer' && Array.isArray(l.data));

            const map = {
              raw: data,
              tileWidth, tileHeight, mapWidth, mapHeight,
              widthPx: mapWidth * tileWidth, heightPx: mapHeight * tileHeight,
              layers,

              // Belirli bir katmandaki (isim veya index, varsayılan ilk
              // katman) hücrenin (flip bayrakları temizlenmiş) gid'ini
              // döner; boş hücre ya da sınır dışı için 0.
              gidAt(col, row, layerNameOrIndex = 0) {
                const layer = typeof layerNameOrIndex === 'string'
                  ? layers.find(l => l.name === layerNameOrIndex) : layers[layerNameOrIndex];
                if (!layer || col < 0 || row < 0 || col >= layer.width || row >= layer.height) return 0;
                return (layer.data[row * layer.width + col] & FLIP_MASK) >>> 0;
              },
              worldToTile(x, y) { return { col: Math.floor(x / tileWidth), row: Math.floor(y / tileHeight) }; },
              // Verilen dünya noktasında (piksel) belirtilen katmanda boş
              // olmayan bir kare var mı — basit AABB tabanlı tilemap
              // çarpışması için (örn. platform oyunlarında zemin/duvar).
              solidAt(x, y, layerNameOrIndex = 0) {
                const { col, row } = map.worldToTile(x, y);
                return map.gidAt(col, row, layerNameOrIndex) !== 0;
              },

              // Haritayı çizer. viewport verilirse ({x,y,width,height},
              // engine.camera ile aynı sol-üst tabanlı dünya koordinatı)
              // SADECE görünen kareler çizilir — büyük haritalarda
              // performans için önemlidir. Görünmeyen katmanlar
              // (layer.visible === false) atlanır.
              draw(renderer, viewport) {
                const startCol = viewport ? Math.max(0, Math.floor(viewport.x / tileWidth)) : 0;
                const endCol = viewport ? Math.min(mapWidth - 1, Math.ceil((viewport.x + viewport.width) / tileWidth)) : mapWidth - 1;
                const startRow = viewport ? Math.max(0, Math.floor(viewport.y / tileHeight)) : 0;
                const endRow = viewport ? Math.min(mapHeight - 1, Math.ceil((viewport.y + viewport.height) / tileHeight)) : mapHeight - 1;
                for (const layer of layers) {
                  if (layer.visible === false) continue;
                  const opacity = layer.opacity ?? 1;
                  for (let row = startRow; row <= endRow; row++) {
                    for (let col = startCol; col <= endCol; col++) {
                      const raw = layer.data[row * layer.width + col];
                      if (!raw) continue;
                      const frame = frameForRawGid(raw);
                      if (!frame) continue;
                      renderer.drawImage(
                        frame.image, col * tileWidth, row * tileHeight, tileWidth, tileHeight,
                        { sx: frame.sx, sy: frame.sy, sw: frame.sw, sh: frame.sh, alpha: opacity, flipX: frame.flipX }
                      );
                    }
                  }
                }
              },
            };

            entries[name] = { source: null, kind: 'tilemap', tilemap: map, dirty: false };
            return map;
          });
        // whenReady() bir tilemap hatasında tüm bekleyenleri reddetmesin
        // diye ayrı bir catch'lenmiş kopyayı pending listesine koyuyoruz;
        // gerçek hata YİNE DE tilemap()'in döndürdüğü promise'e ulaşır.
        pending.push(promise.catch(() => {}));
        return promise;
      },

      // Canvas 2D ile prosedürel olarak üretilen bir doku tanımlar.
      // draw(ctx2d, canvas) fonksiyonu offscreen bir <canvas> üzerinde
      // istediğini çizer (gradient, metin, desen...). WebGL modunda bu
      // canvas bir GL dokusu olarak yüklenir; Canvas 2D modunda ise
      // doğrudan drawImage ile kullanılır.
      // redraw() her çağrıldığında draw() yeniden çalışır ve doku bir
      // sonraki çizimde otomatik olarak GPU'ya yeniden yüklenir.
      dynamicTexture(name, opts = {}) {
        const width = opts.width ?? 64;
        const height = opts.height ?? 64;
        const drawFn = opts.draw;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx2d = canvas.getContext('2d');

        const wrapper = {
          source: canvas,
          ctx: ctx2d,
          dirty: true,
          kind: 'dynamic',
          width, height,
          redraw(...args) {
            if (drawFn) drawFn(ctx2d, canvas, ...args);
            wrapper.dirty = true;
          }
        };
        if (drawFn) drawFn(ctx2d, canvas);
        entries[name] = wrapper;
        return wrapper;
      },

      // Kayıtlı bir girdiyi (resim veya dinamik doku) isimle döndürür.
      get(name) {
        const e = entries[name];
        if (!e) { console.warn(`Hardcore.assets: "${name}" kayıtlı değil`); return null; }
        return e;
      },
      // Tiled (mapeditor.org) ile dışa aktarılmış BİR JSON haritayı yükler
      // ve bir TileMap örneği döner (Promise).
      //
      // KAPSAM/SINIRLAMALAR (bilerek dar tutuldu — en yaygın kullanım
      // için yeterli, daha karmaşık ihtiyaçlarda engine.createTileMap()
      // ile elle harita kurabilirsin):
      //   - sadece "orthogonal" haritalar (isometric/hexagonal değil)
      //   - sadece TEK tileset (birden fazlası varsa sadece ilki kullanılır)
      //   - katman verisi CSV/düz dizi olmalı (Tiled'da katmanı dışa
      //     aktarırken sıkıştırma/base64 KAPALI, format "CSV" seçilmeli)
      //   - tile flip/rotation bayrakları, object/image katmanları
      //     desteklenmiyor
      async loadTiledMap(name, url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Hardcore5: tilemap "${url}" yüklenemedi (HTTP ${res.status})`);
        const json = await res.json();
        if (json.orientation && json.orientation !== 'orthogonal') {
          throw new Error(`Hardcore5: sadece "orthogonal" Tiled haritaları destekleniyor (bu harita: "${json.orientation}")`);
        }
        const tilesetDef = json.tilesets && json.tilesets[0];
        if (!tilesetDef) throw new Error(`Hardcore5: "${url}" içinde tileset bulunamadı.`);
        if (json.tilesets.length > 1) {
          console.warn(`Hardcore5: "${url}" birden fazla tileset içeriyor, sadece ilki kullanılacak.`);
        }
        // Tileset görselinin yolu harita dosyasına göre GÖRECELİ olabilir.
        const imageUrl = new URL(tilesetDef.image, new URL(url, location.href)).href;
        const sheet = this.spriteSheet(name + '.tileset', imageUrl, {
          frameWidth: tilesetDef.tilewidth,
          frameHeight: tilesetDef.tileheight,
          margin: tilesetDef.margin || 0,
          spacing: tilesetDef.spacing || 0,
        });
        await this.whenReady();

        const firstgid = tilesetDef.firstgid || 1;
        const layers = (json.layers || [])
          .filter(l => l.type === 'tilelayer' && Array.isArray(l.data))
          .map(l => ({
            name: l.name,
            visible: l.visible !== false,
            opacity: l.opacity ?? 1,
            // firstgid farklı olabilir; TileMap'in kendi kuralına (0=boş,
            // N=tileset.frame(N-1)) normalize ediyoruz.
            data: l.data.map(gid => (gid === 0 ? 0 : gid - firstgid + 1)),
          }));

        const map = new TileMap({
          tileWidth: json.tilewidth,
          tileHeight: json.tileheight,
          cols: json.width,
          rows: json.height,
          tileset: sheet,
          layers,
        });
        entries[name] = { source: map, dirty: false, kind: 'tilemap' };
        return map;
      },
      // Kayıtlı tüm resimler yüklenince çözülen Promise.
      // Kullanım: await engine.assets.whenReady(); engine.start(...);
      whenReady() { return Promise.all(pending); }
    };
  }

  // =========================================================
  // Powered by Hardcore WebPhysical
  // Gömülü 2D rigid-body fizik motoru: Vec2, Body (circle/polygon),
  // World (AABB broad-phase + SAT narrow-phase + sequential-impulse
  // çözücü), DistanceJoint. engine.physical üzerinden erişilir:
  //   const world = new engine.physical.World({ gravity: { x: 0, y: 900 } });
  //   const box = engine.physical.Body.rect(x, y, w, h, { restitution: 0.3 });
  //   world.addBody(box);
  //   engine.events.on ile mevcut oyun döngüsüne bağlamak için:
  //   engine.start({ update(dt){ world.step(dt); }, draw(r){ ... } });
  // =========================================================
  function createPhysicalEngine(engine) {
  const EPS = 1e-9;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ---------------------------------------------------------------------
  // Vec2
  // ---------------------------------------------------------------------
  class Vec2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    clone() { return new Vec2(this.x, this.y); }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    scale(s) { return new Vec2(this.x * s, this.y * s); }
    negate() { return new Vec2(-this.x, -this.y); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    // vector x vector -> scalar, or vector x scalar -> vector
    cross(v) {
      if (v instanceof Vec2) return this.x * v.y - this.y * v.x;
      return new Vec2(v * this.y, -v * this.x);
    }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() {
      const l = this.length();
      if (l < EPS) return new Vec2();
      return new Vec2(this.x / l, this.y / l);
    }
    perp() { return new Vec2(-this.y, this.x); }
    rotate(angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
    }
    static crossSV(s, v) { return new Vec2(-s * v.y, s * v.x); }
  }

  // ---------------------------------------------------------------------
  // Body
  // ---------------------------------------------------------------------
  let _bodyId = 1;

  class Body {
    constructor(opts = {}) {
      this.id = _bodyId++;
      this.shape = opts.shape || 'circle'; // 'circle' | 'polygon' (rect is a polygon)
      this.position = new Vec2(opts.x || 0, opts.y || 0);
      this.velocity = new Vec2(opts.vx || 0, opts.vy || 0);
      this.angle = opts.angle || 0;
      this.angularVelocity = opts.angularVelocity || 0;

      this.force = new Vec2();
      this.torque = 0;

      this.isStatic = !!opts.isStatic;
      this.isKinematic = !!opts.isKinematic;
      this.restitution = opts.restitution !== undefined ? clamp(opts.restitution, 0, 1) : 0.2;
      this.friction = opts.friction !== undefined ? clamp(opts.friction, 0, 1) : 0.3;
      this.linearDamping = opts.linearDamping !== undefined ? opts.linearDamping : 0.01;
      this.angularDamping = opts.angularDamping !== undefined ? opts.angularDamping : 0.01;
      this.gravityScale = opts.gravityScale !== undefined ? opts.gravityScale : 1;

      if (this.shape === 'circle') {
        this.radius = opts.radius || 20;
      } else {
        // polygon: vertices given in local space, CCW order
        this.vertices = (opts.vertices || []).map(v => new Vec2(v.x, v.y));
        this._computeNormals();
      }

      this._computeMass(opts.density !== undefined ? opts.density : 1, opts.mass);

      this.collisionFilter = Object.assign({ group: 0, category: 0x0001, mask: 0xFFFF }, opts.collisionFilter);
      this.userData = opts.userData !== undefined ? opts.userData : null;
      this.sleeping = false;
      this._listeners = {};
      this.world = null;
    }

    static circle(x, y, radius, opts = {}) {
      return new Body(Object.assign({ shape: 'circle', x, y, radius }, opts));
    }

    static rect(x, y, width, height, opts = {}) {
      const w = width / 2, h = height / 2;
      const verts = [
        new Vec2(-w, -h), new Vec2(w, -h), new Vec2(w, h), new Vec2(-w, h)
      ];
      const b = new Body(Object.assign({ shape: 'polygon', x, y, vertices: verts }, opts));
      b.width = width; b.height = height;
      return b;
    }

    static polygon(x, y, points, opts = {}) {
      return new Body(Object.assign({ shape: 'polygon', x, y, vertices: points }, opts));
    }

    on(event, cb) { (this._listeners[event] = this._listeners[event] || []).push(cb); return this; }
    off(event, cb) {
      if (!this._listeners[event]) return this;
      this._listeners[event] = this._listeners[event].filter(fn => fn !== cb);
      return this;
    }
    emit(event, data) {
      const l = this._listeners[event];
      if (l) for (let i = 0; i < l.length; i++) l[i](data);
    }

    _computeNormals() {
      const v = this.vertices, n = v.length;
      this.normals = [];
      for (let i = 0; i < n; i++) {
        const p1 = v[i], p2 = v[(i + 1) % n];
        const edge = p2.sub(p1);
        this.normals.push(new Vec2(edge.y, -edge.x).normalize());
      }
    }

    _computeMass(density, explicitMass) {
      if (this.isStatic || this.isKinematic) {
        this.mass = 0; this.invMass = 0; this.inertia = 0; this.invInertia = 0;
        return;
      }
      if (this.shape === 'circle') {
        this.mass = explicitMass !== undefined ? explicitMass : Math.PI * this.radius * this.radius * density;
        this.inertia = this.mass * this.radius * this.radius * 0.5;
      } else {
        let area = 0, inertiaSum = 0;
        const verts = this.vertices;
        for (let i = 0; i < verts.length; i++) {
          const p1 = verts[i], p2 = verts[(i + 1) % verts.length];
          const cr = p1.cross(p2);
          area += cr;
          const intx2 = p1.x * p1.x + p1.x * p2.x + p2.x * p2.x;
          const inty2 = p1.y * p1.y + p1.y * p2.y + p2.y * p2.y;
          inertiaSum += (cr) * (intx2 + inty2);
        }
        area = Math.abs(area) / 2;
        this.mass = explicitMass !== undefined ? explicitMass : area * density;
        this.inertia = Math.abs(inertiaSum) * density / 12;
      }
      this.invMass = this.mass > 0 ? 1 / this.mass : 0;
      this.inertia = Math.max(this.inertia, EPS);
      this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;
    }

    applyForce(f, worldPoint) {
      if (this.isStatic) return;
      this.force = this.force.add(f);
      if (worldPoint) {
        const r = worldPoint.sub(this.position);
        this.torque += r.cross(f);
      }
    }

    applyImpulse(impulse, contactVector) {
      if (this.isStatic) return;
      this.velocity = this.velocity.add(impulse.scale(this.invMass));
      this.angularVelocity += this.invInertia * contactVector.cross(impulse);
    }

    setVelocity(x, y) { this.velocity.set(x, y); return this; }
    wake() { this.sleeping = false; return this; }

    getWorldVertices() {
      if (