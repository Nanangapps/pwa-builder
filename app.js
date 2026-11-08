// ============ STATE MANAGEMENT ============
let currentStep = 1;
const totalSteps = 4;
let appConfig = {
  url: '', title: 'My PWA App', description: 'Progressive Web App',
  icon: '', themeColor: '#6366f1', bgColor: '#ffffff', display: 'standalone',
  shortcuts: [], enableShare: false, enableOffline: true
};

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  // Load theme dari localStorage
  const savedTheme = localStorage.getItem('pwa_theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
  
  updateWizardUI();
});

// ============ DARK MODE TOGGLE ============
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  
  // Simpan preferensi
  localStorage.setItem('pwa_theme', isDark ? 'dark' : 'light');
  
  console.log('Theme switched to:', isDark ? 'dark' : 'light');
}

// ============ WIZARD LOGIC ============
function changeStep(dir) {
  const newStep = currentStep + dir;
  if (newStep < 1 || newStep > totalSteps) return;
  
  document.getElementById(`step${currentStep}`).classList.add('hidden');
  currentStep = newStep;
  document.getElementById(`step${currentStep}`).classList.remove('hidden');
  
  updateWizardUI();
  if (currentStep === 2) updateMockup();
}

function updateWizardUI() {
  document.getElementById('progressBar').style.width = `${(currentStep / totalSteps) * 100}%`;
  for (let i = 1; i <= totalSteps; i++) {
    const indicator = document.getElementById(`step${i}-indicator`);
    if (i === currentStep) {
      indicator.classList.add('text-indigo-600', 'dark:text-indigo-400');
      indicator.classList.remove('text-gray-500', 'dark:text-gray-400');
    } else {
      indicator.classList.remove('text-indigo-600', 'dark:text-indigo-400');
      indicator.classList.add('text-gray-500', 'dark:text-gray-400');
    }
  }
  document.getElementById('btnPrev').disabled = currentStep === 1;
  document.getElementById('btnNext').textContent = currentStep === totalSteps ? 'Selesai' : 'Lanjut';
  document.getElementById('btnNext').onclick = currentStep === totalSteps ? generateUltimateZip : () => changeStep(1);
}

// ============ ANALYZE URL ============
async function analyzeUrl() {
  let url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Masukkan URL!');
  if (!url.startsWith('http')) url = 'https://' + url;
  appConfig.url = url;

  showLoading('Menganalisis...');
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    const html = await res.text();
    
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const colorMatch = html.match(/<meta name="theme-color" content="(.*?)"/i);
    
    if (titleMatch) { appConfig.title = titleMatch[1].trim(); document.getElementById('titleInput').value = appConfig.title; }
    if (colorMatch) { appConfig.themeColor = colorMatch[1].trim(); document.getElementById('colorInput').value = appConfig.themeColor; }
    
    hideLoading();
    changeStep(1);
  } catch (e) { hideLoading(); alert('Gagal analisis, isi manual.'); }
}

// ============ IMAGE PROCESSING & AI COLOR ============
async function handleIconUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showLoading('Memproses Ikon & AI Color...');
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const img = new Image();
    img.onload = async () => {
      appConfig.icon = e.target.result;
      document.getElementById('iconInput').value = e.target.result;
      
      const dominantColor = await getDominantColor(img);
      appConfig.themeColor = dominantColor;
      document.getElementById('colorInput').value = dominantColor;
      
      updateMockup();
      hideLoading();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function getDominantColor(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 50; canvas.height = 50;
  ctx.drawImage(img, 0, 0, 50, 50);
  const data = ctx.getImageData(0, 0, 50, 50).data;
  
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] > 125 && !(data[i]>240 && data[i+1]>240 && data[i+2]>240)) {
      r += data[i]; g += data[i+1]; b += data[i+2]; count++;
    }
  }
  if (count === 0) return '#6366f1';
  return rgbToHex(Math.round(r/count), Math.round(g/count), Math.round(b/count));
}

function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

// ============ MOCKUP PREVIEW ============
function updateMockup() {
  appConfig.title = document.getElementById('titleInput').value || 'App Name';
  appConfig.themeColor = document.getElementById('colorInput').value;
  appConfig.bgColor = document.getElementById('bgInput').value;
  
  const iconUrl = document.getElementById('iconInput').value || 'https://via.placeholder.com/192';
  
  document.getElementById('mockupTitle').textContent = appConfig.title;
  document.getElementById('mockupHeader').style.backgroundColor = appConfig.themeColor;
  document.getElementById('mockupScreen').style.backgroundColor = appConfig.bgColor;
  document.getElementById('mockupIcon').style.backgroundImage = `url(${iconUrl})`;
}

function toggleShortcuts() {
  const isChecked = document.getElementById('enableShortcuts').checked;
  document.getElementById('shortcutsContainer').classList.toggle('hidden', !isChecked);
}

// ============ ULTIMATE ZIP GENERATOR ============
async function generateUltimateZip() {
  showLoading('Membuat Paket PWA Ultimate...');
  
  try {
    const zip = new JSZip();
    const iconUrl = document.getElementById('iconInput').value;
    
    if (iconUrl) {
      const icons = await generateIconVariants(iconUrl);
      zip.file('icons/icon-192.png', icons[192]);
      zip.file('icons/icon-512.png', icons[512]);
      zip.file('icons/icon-maskable-512.png', icons[512]);
    }

    const manifest = {
      name: appConfig.title, short_name: appConfig.title.substring(0, 12),
      description: appConfig.description, start_url: appConfig.url || '/',
      scope: appConfig.url || '/', display: appConfig.display,
      orientation: 'portrait', background_color: appConfig.bgColor,
      theme_color: appConfig.themeColor,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };

    if (document.getElementById('enableShortcuts').checked) {
      const sName = document.getElementById('shortcutName1').value;
      const sUrl = document.getElementById('shortcutUrl1').value;
      if (sName && sUrl) {
        manifest.shortcuts = [{ name: sName, short_name: sName, url: sUrl, icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }];
      }
    }

    if (document.getElementById('enableShare').checked) {
      manifest.share_target = { action: '/share-receiver', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } };
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    let swCode = `const CACHE = 'pwa-v1';
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/offline.html']))));
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});`;
    zip.file('service-worker.js', swCode);

    if (document.getElementById('enableOffline').checked) {
      const offlineHtml = `<!DOCTYPE html><html><head><title>Offline</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:${appConfig.bgColor};color:${appConfig.themeColor}}</style></head><body><h1>📡 Anda Offline</h1><p>Periksa koneksi internet Anda.</p></body></html>`;
      zip.file('offline.html', offlineHtml);
    }

    zip.file('README.txt', `PWA ULTIMATE PACKAGE\n====================\n1. Upload folder 'icons', 'manifest.json', 'service-worker.js', 'offline.html' ke root hosting.\n2. Copy snippet HTML ke <head> website Anda.\n3. Pastikan hosting menggunakan HTTPS.`);

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${appConfig.title.replace(/\s/g, '_')}_Ultimate_PWA.zip`;
    link.click();
    
    hideLoading();
    alert('✅ Paket Ultimate berhasil didownload!');
  } catch (e) { hideLoading(); alert('Error: ' + e.message); }
}

async function generateIconVariants(url) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = url;
  await new Promise(r => img.onload = r);
  
  const variants = {};
  for (const size of [192, 512]) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = appConfig.bgColor;
    ctx.fillRect(0, 0, size, size);
    
    const scale = Math.min(size / img.width, size / img.height) * 0.8;
    const x = (size - img.width * scale) / 2;
    const y = (size - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    variants[size] = await new Promise(r => canvas.toBlob(r, 'image/png'));
  }
  return variants;
}

// ============ ULTIMATE SNIPPET ============
async function copyUltimateSnippet() {
  const snippet = `<!-- PWA Ultimate Snippet -->
<meta name="theme-color" content="${appConfig.themeColor}">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/icons/icon-192.png">

<!-- iOS Support -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${appConfig.title}">
<link rel="apple-touch-icon" href="/icons/icon-192.png">

<!-- Service Worker -->
<script>
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
<\/script>`;

  try {
    await navigator.clipboard.writeText(snippet);
    alert('📋 Snippet HTML (Termasuk iOS) disalin!');
  } catch (e) { alert('Gagal menyalin.'); }
}

// ============ IMPORT / EXPORT ============
function exportProject() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appConfig));
  const link = document.createElement('a');
  link.href = dataStr; link.download = "pwa-project.json"; link.click();
}

function importProject(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    appConfig = JSON.parse(e.target.result);
    document.getElementById('urlInput').value = appConfig.url || '';
    document.getElementById('titleInput').value = appConfig.title || '';
    document.getElementById('colorInput').value = appConfig.themeColor || '#6366f1';
    document.getElementById('bgInput').value = appConfig.bgColor || '#ffffff';
    updateMockup();
    alert('✅ Project berhasil diimport!');
  };
  reader.readAsText(file);
}

// ============ UI HELPERS ============
function showLoading(text) { document.getElementById('loadingText').textContent = text; document.getElementById('loading').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }