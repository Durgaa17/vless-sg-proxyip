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
    const text = await response.text();
    parseProxies(text);
  } catch (err) {
    proxyList.innerHTML = `<div class="loading">Failed to load proxies. Check internet or URL.</div>`;
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
      const parts = line.split(' : ');
      if (parts.length === 4) {
        const [ip, port, country, provider] = parts.map(p => p.trim());
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
        <div class="proxy-ip">${proxy.ip}:${proxy.port}</div>
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

async function checkLatency(button, ip, port) {
  const resultEl = button.parentElement.querySelector('.result');
  button.disabled = true;
  resultEl.textContent = 'Testing...';
  resultEl.style.color = '#f39c12';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const proxyStr = `${ip}:${port}`;
    const url = `${CHECK_API_URL}?proxyip=${encodeURIComponent(proxyStr)}`;
    
    const startTime = performance.now();
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const apiLatency = Math.round(endTime - startTime);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      // Assume API returns { success: true, ip: "detected_ip", ... } – adjust keys if needed
      const detectedIp = data.ip || 'Unknown';
      resultEl.textContent = `${apiLatency}ms (${detectedIp})`;
      resultEl.style.color = '#27ae60';
    } else {
      resultEl.textContent = 'Failed';
      resultEl.style.color = '#e74c3c';
      resultEl.title = data.error || 'Proxy test failed';
    }
  } catch (err) {
    clearTimeout(timeoutId);
    resultEl.textContent = 'Failed';
    resultEl.style.color = '#e74c3c';
    resultEl.title = err.name === 'AbortError' ? 'Timeout (slow proxy)' : err.message;
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
