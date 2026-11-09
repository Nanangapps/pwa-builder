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
  document.getElementById('progressBar').style.width = `${(currentStep / totalSteps) * 100}%`;
  
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
  
  document.getElementById('btnPrev').disabled = currentStep === 1;
  
  const btnNext = document.getElementById('btnNext');
  if (currentStep === totalSteps) {
    btnNext.textContent = 'Selesai';
    btnNext.onclick = resetToStart;
  } else {
    btnNext.textContent = 'Lanjut';
    btnNext.onclick = () => changeStep(1);
  }
}

// ============ FUNGSI RESET UTAMA (Tunggal & Bersih) ============
function resetToStart() {
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
  
  document.querySelectorAll('.wizard-step').forEach(step => step.classList.add('hidden'));
  currentStep = 1;
  document.getElementById('step1').classList.remove('hidden');
  updateWizardUI();
  updateMockup();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  showToast('🔄 Aplikasi direset. Mulai dari awal!', 'success');
}

// ============ ANALISIS URL ============
async function analyzeUrl() {
  let url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Masukkan URL terlebih dahulu!');
  if (!url.startsWith('http')) url = 'https://' + url;
  appConfig.url = url;

  showLoading('Menganalisis website...');
  
  try {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    
    let html = null;
    let success = false;
    
    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, { method: 'GET', headers: { 'Accept': 'text/html' } });
        if (res.ok) {
          html = await res.text();
          if (html && html.length > 100) { success = true; break; }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!success || !html) throw new Error('Semua proxy gagal');
    
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i) 
                   || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
    const iconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["'](.*?)["']/i)
                   || html.match(/<link[^>]*href=["'](.*?)["'][^>]*rel=["'](icon|shortcut icon)["']/i);
    const colorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](.*?)["']/i)
                    || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']theme-color["']/i);
    
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
        try { iconUrl = new URL(iconUrl, url).href; } catch (e) { iconUrl = ''; }
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
    alert(`⚠️ Analisis otomatis gagal.\n\nPenyebab kemungkinan:\n• Website memblokir akses bot\n• URL tidak valid\n• Koneksi internet lambat\n\nSilakan isi form konfigurasi secara manual.`);
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
      appConfig.icon = e.target.result;
      document.getElementById('iconInput').value = e.target.result;
      
      const dominantColor = await getDominantColor(img);
      appConfig.themeColor = dominantColor;
      document.getElementById('colorInput').value = dominantColor;
      
      updateMockup();
      hideLoading();
      showToast('✅ Ikon berhasil diupload!', 'success');
    };
    img.onerror = () => { hideLoading(); alert('Gagal memproses gambar.'); };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function getDominantColor(img) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50; canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] > 125 && !(data[i]>240 && data[i+1]>240 && data[i+2]>240) && !(data[i]<15 && data[i+1]<15 && data[i+2]<15)) {
        r += data[i]; g += data[i+1]; b += data[i+2]; count++;
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

// ============ MOCKUP & UI HELPERS ============
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

function showLoading(text) { 
  document.getElementById('loadingText').textContent = text; 
  document.getElementById('loading').classList.remove('hidden'); 
}

function hideLoading() { 
  document.getElementById('loading').classList.add('hidden'); 
}

function showToast(message, type = 'success') {
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

// ============ BUILD APK (Saat ini Redirect) ============
function buildApk() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) {
    alert('⚠️ Masukkan URL website Anda di Step 1 terlebih dahulu!');
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    document.getElementById('step1').classList.remove('hidden');
    currentStep = 1;
    updateWizardUI();
    return;
  }

  const confirmMsg = `🤖 Konfirmasi Build APK\n\nAplikasi akan mengarahkan Anda ke PWABuilder dengan URL: \n\n${url}\n\nLanjutkan?`;
  
  if (confirm(confirmMsg)) {
    const btn = document.getElementById('btnBuildApk');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Menghubungkan...';
    btn.disabled = true;

    setTimeout(() => {
      const pwabuilderUrl = `https://www.pwabuilder.com/?url=${encodeURIComponent(url)}`;
      window.open(pwabuilderUrl, '_blank');
      
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1500);
  }
}
