document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const likeEnable = document.getElementById('likeEnable');
  const commentEnable = document.getElementById('commentEnable');
  const noteEnable = document.getElementById('noteEnable');
  const scrollEnable = document.getElementById('scrollEnable');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  const debounce = (fn, delay = 500) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const loadConfig = () => {
    chrome.storage.local.get(['apiKey', 'likeEnable', 'commentEnable', 'noteEnable', 'scrollEnable'], (result) => {
      apiKeyInput.value = result.apiKey || '';
      likeEnable.checked = result.likeEnable !== false;
      commentEnable.checked = result.commentEnable || false;
      noteEnable.checked = result.noteEnable !== false;
      scrollEnable.checked = result.scrollEnable !== false;
    });
  };

  // ====================== 已删除：sk- 开头验证 ======================
  const validateForm = () => {
    if (commentEnable.checked && !apiKeyInput.value.trim()) {
      setStatus('❌ AI评论开启时 API Key 不能为空', 'error');
      return false;
    }
    return true;
  };

  const setStatus = (text, type = '') => {
    status.textContent = text;
    status.className = `status ${type}`;
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 3000);
  };

  const syncAllTabs = () => {
    chrome.tabs.query({ url: "*://*.xiaohongshu.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'syncConfig' }).catch(() => {
            chrome.tabs.reload(tab.id);
          });
        }
      });
    });
  };

  const saveConfig = debounce(() => {
    if (!validateForm()) return;

    const config = {
      apiKey: apiKeyInput.value.trim(),
      likeEnable: likeEnable.checked,
      commentEnable: commentEnable.checked,
      noteEnable: noteEnable.checked,
      scrollEnable: scrollEnable.checked
    };

    chrome.storage.local.set(config, () => {
      if (chrome.runtime.lastError) {
        setStatus(`❌ 保存失败：${chrome.runtime.lastError.message}`, 'error');
        return;
      }
      setStatus('✅ 配置保存成功', 'success');
      syncAllTabs();
    });
  });

  saveBtn.addEventListener('click', saveConfig);
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveConfig();
  });

  loadConfig();
});