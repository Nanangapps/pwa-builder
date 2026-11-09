// ============ STATE MANAGEMENT ============
let currentStep = 1;
const totalSteps = 4;
let appConfig = {
  url: '', 
  title: 'My PWA App', 
  description: 'Progressive Web App',
  icon: '', 
  themeColor: '#6366f1', 
  bgColor: '#ffffff', 
  display: 'standalone',
  shortcuts: [], 
  enableShare: false, 
  enableOffline: true
};

// ============ INISIALISASI ============
document.addEventListener('DOMContentLoaded', () => {
  // Load theme dari localStorage
  const savedTheme = localStorage.getItem('pwa_theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
  
  updateWizardUI();
});

// ============ DARK MODE ============
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('pwa_theme', isDark ? 'dark' : 'light');
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
  // Update progress bar
  document.getElementById('progressBar').style.width = `${(currentStep / totalSteps) * 100}%`;
  
  // Update indikator step
  for (let i = 1; i <= totalSteps; i++) {
    const indicator = document.getElementById(`step${i}-indicator`);
    if (i === currentStep) {
      indicator.classList.add('text-indigo-600', 'dark:text-indigo-400', 'font-bold');
      indicator.classList.remove('text-gray-500', 'dark:text-gray-400');
    } else {
      indicator.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'font-bold');
      indicator.classList.add('text-gray-500', 'dark:text-gray-400');
    }
  }
  
  // Update tombol navigasi
  document.getElementById('btnPrev').disabled = currentStep === 1;
  
  if (currentStep === totalSteps) {
    document.getElementById('btnNext').textContent = 'Selesai';
    document.getElementById('btnNext').onclick = resetToStart;
  } else {
    document.getElementById('btnNext').textContent = 'Lanjut';
    document.getElementById('btnNext').onclick = () => changeStep(1);
  }
}

// ============ FUNGSI RESET (BARU!) ============
function resetToStart() {
  // Reset semua input form
  document.getElementById('urlInput').value = '';
  document.getElementById('titleInput').value = '';
  document.getElementById('descInput').value = '';
  document.getElementById('iconInput').value = '';
  document.getElementById('iconUpload').value = '';
  document.getElementById('colorInput').value = '#6366f1';
  document.getElementById('bgInput').value = '#ffffff';
  document.getElementById('displayInput').value = 'standalone';
  document.getElementById('enableShortcuts').checked = false;
  document.getElementById('enableShare').checked = false;
  document.getElementById('enableOffline').checked = true;
  document.getElementById('shortcutName1').value = '';
  document.getElementById('shortcutUrl1').value = '';
  document.getElementById('shortcutsContainer').classList.add('hidden');
  
  // Reset state
  appConfig = {
    url: '', 
    title: 'My PWA App', 
    description: 'Progressive Web App',
    icon: '', 
    themeColor: '#6366f1', 
    bgColor: '#ffffff', 
    display: 'standalone',
    shortcuts: [], 
    enableShare: false, 
    enableOffline: true
  };
  
  // Kembali ke step 1
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.add('hidden'));
  currentStep = 1;
  document.getElementById('step1').classList.remove('hidden');
  updateWizardUI();
  
  // Scroll ke atas
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Notifikasi
  showToast('🔄 Aplikasi direset. Mulai dari awal!', 'success');
}

// ============ ANALISIS URL (DIPERBAIKI!) ============
async function analyzeUrl() {
  let url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Masukkan URL terlebih dahulu!');
  if (!url.startsWith('http')) url = 'https://' + url;
  appConfig.url = url;

  showLoading('Menganalisis website...');
  
  try {
    // Coba 3 proxy berbeda untuk reliabilitas
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    
    let html = null;
    let success = false;
    
    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, { 
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });
        if (res.ok) {
          html = await res.text();
          if (html && html.length > 100) {
            success = true;
            break;
          }
        }
      } catch (e) {
        console.log('Proxy gagal:', proxyUrl, e.message);
        continue;
      }
    }
    
    if (!success || !html) {
      throw new Error('Semua proxy gagal');
    }
    
    // Parse HTML dengan regex
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i) 
                   || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
    const iconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["'](.*?)["']/i)
                   || html.match(/<link[^>]*href=["'](.*?)["'][^>]*rel=["'](icon|shortcut icon)["']/i);
    const colorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](.*?)["']/i)
                    || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']theme-color["']/i);
    
    // Isi form dengan data yang ditemukan
    if (titleMatch && titleMatch[1]) { 
      appConfig.title = titleMatch[1].trim(); 
      document.getElementById('titleInput').value = appConfig.title; 
    }
    
    if (descMatch && descMatch[1]) { 
      appConfig.description = descMatch[1].trim(); 
      document.getElementById('descInput').value = appConfig.description; 
    }
    
    if (iconMatch) {
      let iconUrl = iconMatch[1] || iconMatch[2];
      if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
        try {
          iconUrl = new URL(iconUrl, url).href;
        } catch (e) {
          iconUrl = '';
        }
      }
      if (iconUrl) {
        appConfig.icon = iconUrl;
        document.getElementById('iconInput').value = iconUrl;
      }
    }
    
    if (colorMatch && colorMatch[1]) { 
      const color = colorMatch[1].trim();
      if (color.startsWith('#')) {
        appConfig.themeColor = color;
        document.getElementById('colorInput').value = color;
      }
    }
    
    hideLoading();
    updateMockup();
    showToast('✅ Analisis berhasil!', 'success');
    
  } catch (e) {
    hideLoading();
    // Pesan error yang lebih informatif
    alert(`⚠️ Analisis otomatis gagal.\n\nPenyebab kemungkinan:\n• Website memblokir akses bot\n• URL tidak valid\n• Koneksi internet lambat\n\nSilakan isi form konfigurasi secara manual.`);
    // Tetap buka step 2 agar user bisa isi manual
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.add('hidden'));
    currentStep = 2;
    document.getElementById('step2').classList.remove('hidden');
    updateWizardUI();
  }
}

// ============ UPLOAD IKON & AI COLOR ============
async function handleIconUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showLoading('Memproses Ikon & AI Color...');
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const img = new Image();
    img.onload = async () => {
      // Simpan URL untuk preview
      appConfig.icon = e.target.result;
      document.getElementById('iconInput').value = e.target.result;
      
      // AI Color Extraction
      const dominantColor = await getDominantColor(img);
      appConfig.themeColor = dominantColor;
      document.getElementById('colorInput').value = dominantColor;
      
      updateMockup();
      hideLoading();
      showToast('✅ Ikon berhasil diupload!', 'success');
    };
    img.onerror = () => {
      hideLoading();
      alert('Gagal memproses gambar. Coba gambar lain.');
    };
    img.src = e.target.result;
  };
  reader.onerror = () => {
    hideLoading();
    alert('Gagal membaca file.');
  };
  reader.readAsDataURL(file);
}

async function getDominantColor(img) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50; 
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      // Skip pixel transparan atau putih/hitam pekat
      if (data[i+3] > 125 && !(data[i]>240 && data[i+1]>240 && data[i+2]>240) && !(data[i]<15 && data[i+1]<15 && data[i+2]<15)) {
        r += data[i]; 
        g += data[i+1]; 
        b += data[i+2]; 
        count++;
      }
    }
    if (count === 0) return '#6366f1';
    return rgbToHex(Math.round(r/count), Math.round(g/count), Math.round(b/count));
  } catch (e) {
    return '#6366f1';
  }
}

function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).padStart(6, '0');
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

// ============ GENERATE ZIP ============
async function generateUltimateZip() {
  showLoading('Membuat Paket PWA Ultimate...');
  
  try {
    const zip = new JSZip();
    const iconUrl = document.getElementById('iconInput').value;
    
    // Generate ikon berbagai ukuran
    if (iconUrl) {
      const icons = await generateIconVariants(iconUrl);
      zip.file('icons/icon-192.png', icons[192]);
      zip.file('icons/icon-512.png', icons[512]);
      zip.file('icons/icon-maskable-512.png', icons[512]);
    }

    // Manifest.json
    const manifest = {
      name: appConfig.title, 
      short_name: appConfig.title.substring(0, 12),
      description: appConfig.description, 
      start_url: appConfig.url || '/',
      scope: appConfig.url || '/', 
      display: appConfig.display,
      orientation: 'portrait', 
      background_color: appConfig.bgColor,
      theme_color: appConfig.themeColor,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };

    // Tambahkan Shortcuts jika diaktifkan
    if (document.getElementById('enableShortcuts').checked) {
      const sName = document.getElementById('shortcutName1').value;
      const sUrl = document.getElementById('shortcutUrl1').value;
      if (sName && sUrl) {
        manifest.shortcuts = [{ 
          name: sName, 
          short_name: sName, 
          url: sUrl, 
          icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] 
        }];
      }
    }

    // Tambahkan Share Target jika diaktifkan
    if (document.getElementById('enableShare').checked) {
      manifest.share_target = { 
        action: '/share-receiver', 
        method: 'GET', 
        params: { title: 'title', text: 'text', url: 'url' } 
      };
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Service Worker dengan offline fallback
    const swCode = `const CACHE = 'pwa-v1';
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/offline.html']))));
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});`;
    zip.file('service-worker.js', swCode);

    // Halaman Offline
    if (document.getElementById('enableOffline').checked) {
      const offlineHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Offline</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; background: ${appConfig.bgColor}; color: ${appConfig.themeColor}; }
    h1 { font-size: 48px; margin-bottom: 20px; }
    p { font-size: 18px; opacity: 0.8; }
  </style>
</head>
<body>
  <h1>📡</h1>
  <h2>Anda Offline</h2>
  <p>Periksa koneksi internet Anda dan coba lagi.</p>
</body>
</html>`;
      zip.file('offline.html', offlineHtml);
    }

    // README
    const readme = `PWA ULTIMATE PACKAGE
====================
Cara Pakai:
1. Upload folder 'icons', 'manifest.json', 'service-worker.js', 'offline.html' ke root hosting Anda.
2. Copy snippet HTML ke bagian <head> website Anda.
3. Pastikan hosting menggunakan HTTPS.
4. Buka website di Chrome, klik menu (titik tiga), pilih "Install App" atau "Tambahkan ke Layar Utama".

Dibuat dengan PWA Builder Ultimate 🚀`;
    zip.file('README.txt', readme);

    // Download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${appConfig.title.replace(/\s/g, '_')}_PWA.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    hideLoading();
    showToast('✅ Paket PWA berhasil didownload!', 'success');
  } catch (e) { 
    hideLoading(); 
    alert('❌ Error: ' + e.message); 
  }
}

async function generateIconVariants(url) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = url;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  
  const variants = {};
  for (const size of [192, 512]) {
    const canvas = document.createElement('canvas');
    canvas.width = size; 
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = appConfig.bgColor;
    ctx.fillRect(0, 0, size, size);
    
    // Gambar di tengah dengan padding
    const scale = Math.min(size / img.width, size / img.height) * 0.8;
    const x = (size - img.width * scale) / 2;
    const y = (size - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    variants[size] = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }
  return variants;
}

// ============ COPY SNIPPET ============
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
    showToast('📋 Snippet HTML berhasil disalin!', 'success');
  } catch (e) { 
    // Fallback untuk browser lama
    const textarea = document.createElement('textarea');
    textarea.value = snippet;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('📋 Snippet HTML berhasil disalin!', 'success');
    } catch (err) {
      alert('Gagal menyalin. Silakan copy manual.');
    }
    document.body.removeChild(textarea);
  }
}

// ============ IMPORT / EXPORT PROJECT ============
function exportProject() {
  // Simpan state saat ini
  appConfig.url = document.getElementById('urlInput').value;
  appConfig.title = document.getElementById('titleInput').value || 'My PWA App';
  appConfig.description = document.getElementById('descInput').value || 'Progressive Web App';
  appConfig.icon = document.getElementById('iconInput').value;
  appConfig.themeColor = document.getElementById('colorInput').value;
  appConfig.bgColor = document.getElementById('bgInput').value;
  appConfig.display = document.getElementById('displayInput').value;
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appConfig, null, 2));
  const link = document.createElement('a');
  link.href = dataStr; 
  link.download = "pwa-project.json"; 
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('💾 Project berhasil diexport!', 'success');
}

function importProject(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      appConfig = { ...appConfig, ...imported };
      
      document.getElementById('urlInput').value = appConfig.url || '';
      document.getElementById('titleInput').value = appConfig.title || '';
      document.getElementById('descInput').value = appConfig.description || '';
      document.getElementById('iconInput').value = appConfig.icon || '';
      document.getElementById('colorInput').value = appConfig.themeColor || '#6366f1';
      document.getElementById('bgInput').value = appConfig.bgColor || '#ffffff';
      document.getElementById('displayInput').value = appConfig.display || 'standalone';
      
      updateMockup();
      showToast('✅ Project berhasil diimport!', 'success');
    } catch (err) {
      alert('❌ File tidak valid.');
    }
  };
  reader.readAsText(file);
  // Reset input file agar bisa import file yang sama lagi
  event.target.value = '';
}

// ============ UI HELPERS ============
function showLoading(text) { 
  document.getElementById('loadingText').textContent = text; 
  document.getElementById('loading').classList.remove('hidden'); 
}

function hideLoading() { 
  document.getElementById('loading').classList.add('hidden'); 
}

function showToast(message, type = 'success') {
  // Hapus toast lama jika ada
  const oldToast = document.getElementById('toast-notification');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = `fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg font-medium z-[70] ${
    type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  }`;
  toast.style.animation = 'slideUp 0.3s ease-out';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Tambahkan animasi CSS untuk toast
if (!document.getElementById('toast-style')) {
  const style = document.createElement('style');
  style.id = 'toast-style';
  style.textContent = `
    @keyframes slideUp {
      from { transform: translate(-50%, 100px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
