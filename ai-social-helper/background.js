// 专门转发API请求，解决跨域问题
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'generateComment') {
    fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.apiKey}`
      },
      body: JSON.stringify({
        model: "doubao-seed-2-0-pro-260215",
        endpoint_id: "用户虚根据模型调整自己的模型ID",
        messages: request.messages,
        temperature: 0.8,
        max_tokens: 60,
        stream: false
      })
    })
    .then(res => res.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 必须加，保证异步响应正常
  }
});
