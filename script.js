const PROXIES_URL = 'https://raw.githubusercontent.com/Durgaa17/cf-sg-proxies/refs/heads/main/proxies.txt';
const CHECK_API_URL = 'https://cf-workers-checkproxyip.pages.dev/check';
const proxyList = document.getElementById('proxy-list');
const updatedSpan = document.getElementById('updated').querySelector('span');
const sgCountEl = document.getElementById('sg-count');
const myCountEl = document.getElementById('my-count');
const totalCountEl = document.getElementById('total-count');

let proxies = [];
let updatedTime = 'Unknown';

async function fetchProxies() {
  try {
    const response = await fetch(PROXIES_URL);
    if (!response.ok) throw new Error('Failed to load proxies.txt');
    const text = await response.text();
    parseProxies(text);
  } catch (err) {
    proxyList.innerHTML = `<div class="loading">Error: ${err.message}<br><a href="${PROXIES_URL}" target="_blank">Check source file</a></div>`;
    console.error(err);
  }
}

function parseProxies(text) {
  const lines = text.split('\n');
  const proxyData = [];
  let sgCount = 0, myCount = 0;

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith('# Updated:')) {
      updatedTime = line.replace('# Updated:', '').trim();
    } else if (line.includes(' : ')) {
      const parts = line.split(' : ').map(p => p.trim());
      if (parts.length === 4) {
        const [ip, port, country, provider] = parts;
        proxyData.push({ ip, port: parseInt(port), country, provider });
        if (country === 'SG') sgCount++;
        if (country === 'MY') myCount++;
      }
    }
  });

  proxies = proxyData;
  updatedSpan.textContent = updatedTime;
  sgCountEl.textContent = sgCount;
  myCountEl.textContent = myCount;
  totalCountEl.textContent = proxyData.length;

  renderProxies();
}

function renderProxies() {
  if (proxies.length === 0) {
    proxyList.innerHTML = `<div class="loading">No proxies found.</div>`;
    return;
  }

  proxyList.innerHTML = proxies.map(proxy => `
    <div class="proxy-card">
      <div class="proxy-info">
        <div class="proxy-ip">
          <span></span>
          ${proxy.ip}:${proxy.port}
        </div>
        <span class="tag ${proxy.country.toLowerCase()}">${proxy.country}</span>
        <span class="provider">${escapeHtml(proxy.provider)}</span>
      </div>
      <div class="actions">
        <button class="copy-btn" onclick="copyProxy('${proxy.ip}:${proxy.port}')">Copy</button>
        <button class="check-btn" onclick="checkLatency(this, '${proxy.ip}', ${proxy.port})">Check</button>
        <span class="result">—</span>
      </div>
    </div>
  `).join('');
}

function copyProxy(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied: ${text}`);
  }).catch(() => {
    prompt('Copy this:', text);
  });
}

// FINAL WORKING CHECK FUNCTION
async function checkLatency(button, ip, port) {
  const resultEl = button.parentElement.querySelector('.result');
  const card = button.closest('.proxy-card');
  button.disabled = true;
  resultEl.innerHTML = 'Testing...';
  resultEl.style.color = '#f39c12';
  card.classList.remove('working', 'failed');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s max

  try {
    // EXACT FORMAT YOUR API EXPECTS
    const proxyStr = `${ip}:${port}`; // e.g., 8.219.1.169:443
    const url = `${CHECK_API_URL}?proxyip=${encodeURIComponent(proxyStr)}`;

    const start = performance.now();
    const resp = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);
    const end = performance.now();
    const latency = Math.round(end - start);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // API must return: { "success": true, "latency": 380 }
    if (data.success === true && latency < 3000) {
      resultEl.textContent = `${latency}ms`;
      resultEl.style.color = '#27ae60';
      card.classList.add('working');
    } else {
      throw new Error(data.error || 'No success');
    }

  } catch (err) {
    clearTimeout(timeoutId);
    resultEl.textContent = 'Failed';
    resultEl.style.color = '#e74c3c';
    resultEl.title = err.name === 'AbortError' ? 'Timeout' : 'Error';
    card.classList.add('failed');
  } finally {
    button.disabled = false;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
fetchProxies();
