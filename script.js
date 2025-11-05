async function checkLatency(button, ip, port) {
  const resultEl = button.parentElement.querySelector('.result');
  const card = button.closest('.proxy-card');
  button.disabled = true;
  resultEl.innerHTML = 'Testing...';
  resultEl.style.color = '#f39c12';
  card.classList.remove('working', 'failed'); // Reset badge

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (data.success && apiLatency < 2000) {
      resultEl.textContent = `${apiLatency}ms`;
      resultEl.style.color = '#27ae60';
      card.classList.add('working');
    } else {
      throw new Error('No success or too slow');
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
