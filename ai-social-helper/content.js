console.log('🚀 AI社交助手 - 加载中...');

// 配置
let config = {
  likeEnable: true,
  commentEnable: false,
  scrollEnable: true,
  apiKey: ''
};

// 状态
let state = {
  isWorking: false,
  scrollTimer: null,
  processedNotes: new Set(),
  scrollCount: 0  // 下滑次数计数器
};

// 关键词配置
const keywords = {
  target: [
    // 新增关键词
    '私汤', '纯欲', '美', '大学生', '恋爱', '对象', '高跟鞋',
    '反差', '夏天', '短裙', '瑜伽', '性感', '气质', '温柔',
    '甜美', '车模', '清纯', '御姐', '颜值', '模特',
    // 身材相关
    '腿', '美腿', '长腿', '细腿', '大长腿', '瘦腿', '长腿美女','女研',
    '脚', '玉足', '美足', '丝袜', '黑丝', '肉丝', '白丝',
    '身材', '好身材', '完美身材', '身材好', '身材棒',
    '美女', '辣妹', '女神', '美女姐姐', '小姐姐', '漂亮', '好看',
    '穿搭', 'ootd', '穿搭分享', '今日穿搭', '显瘦穿搭',
    // 身高参数 170-190
    '170', '171', '172', '173', '174', '175', '176', '177', '178', '179',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', '190',
    // 身高描述
    '高个子', '高妹', '高挑', '净高', 
    // 其他相关
    '健身', '瑜伽', '普拉提', '运动', '跑步', '马甲线', '小蛮腰', '大长腿',
    // 身份相关
    '女友', '女朋友', 'girl', '女友穿搭', '约会穿搭',
    // 肤色相关
    '显白', '冷白',  '冷白皮', '显白穿搭',
    // 风格标签相关
    '日系', '韩系', '欧美', '复古', '港风', '通勤', '休闲', '甜美', '学院风', 
    // 场景与氛围相关
    '约会', '旅行', '日常', '校园', '探店', '打卡', '网红店', '下午茶', '夜景', '海边', '公园', '咖啡馆',
    // 季节与天气相关
    '春季穿搭', '夏季穿搭', '初夏',
    // 流行趋势相关
    'ins风', 'Y2K', 'BM风', '辣妹风', '纯欲风', '甜辣风', '盐系', '甜酷', '氛围感', '复古风', '新中式', '法式'
  ],
  exclude: [
    // 原有排除词
    '职场', '美食', '母婴', '育儿', '学习', '考研', '考公', '工作', '装修', '数码', '汽车', '宠物', '萌宠', '科技', '游戏', '动漫', '影视', '明星', '娱乐',
    // 医美类科普词汇
    '医美', '整形', '整容', '玻尿酸', '水光针', '瘦脸针', '肉毒素', '隆鼻', '双眼皮', '隆胸', '吸脂', '美白针', '微整', '医美科普', '医美分享', '医美日记',
    '埋线', '热玛吉', '超声刀', '光子嫩肤', '点阵激光', '皮秒', '果酸焕肤', '热拉提', '线雕', '自体脂肪', '假体', '耳软骨', '肋骨鼻', '发际线', '脱毛',
    '医美攻略', '医美避坑', '医美科普', '医美知识', '医美干货', '医美教程', '医美指南', '医美测评', '医美体验',
    // 做饭相关词汇
    '做饭', '做菜', '烹饪', '食谱', '菜谱', '厨房', '烘焙', '烤箱', '电饭煲', '炒菜', '炖菜', '煲汤', '早餐', '晚餐', '午餐', '家常菜', '美食教程', '美食分享'
  ]
};

// 笔记卡片选择器
const noteCardSelectors = [
  'section[class*="note-item"]',
  'div[class*="note-card"]',
  'article[class*="note"]',
  'div[class*="feed-card"]',
  'div[class*="card"]',
  'article'
];

// 随机数生成
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机延时
function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, random(min, max)));
}

// 判断是否是目标笔记，返回匹配的关键词索引（越小优先级越高），不匹配返回-1
function isTargetNote(card) {
  try {
    const text = card.innerText.toLowerCase();
    // 检查是否排除
    if (keywords.exclude.some(w => text.includes(w))) return -1;
    // 按词库顺序查找，返回第一个匹配的关键词索引
    for (let i = 0; i < keywords.target.length; i++) {
      if (text.includes(keywords.target[i])) {
        return i;  // 返回索引，表示优先级
      }
    }
    return -1;  // 不匹配
  } catch (e) {
    return -1;
  }
}

// 获取可见的笔记卡片
function getVisibleNoteCards() {
  const allCards = [];
  
  for (const selector of noteCardSelectors) {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => {
      if (!allCards.includes(card)) {
        allCards.push(card);
      }
    });
  }
  
  // 过滤可见的卡片
  return allCards.filter(card => {
    const rect = card.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight * 1.5;
  });
}

// 模拟真人点击卡片
function clickCard(card) {
  return new Promise((resolve) => {
    // 1. 先滚动到卡片位置
    card.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    setTimeout(() => {
      // 2. 获取卡片位置
      const rect = card.getBoundingClientRect();
      console.log(`📐 卡片位置: x=${rect.left}, y=${rect.top}, width=${rect.width}, height=${rect.height}`);
      
      // 3. 随机点卡片内的一个位置（不是固定中心点！）
      const padding = 20;
      const x = rect.left + padding + random(0, rect.width - padding * 2);
      const y = rect.top + padding + random(0, rect.height - padding * 2);
      
      console.log(`🎯 点击坐标: (${x}, ${y})`);
      
      // 4. 找到那个位置的元素
      const clickEl = document.elementFromPoint(x, y);
      if (!clickEl) {
        console.error('❌ 无法找到点击位置的元素');
        resolve(false);
        return;
      }
      
      console.log(`📌 点击元素: ${clickEl.tagName}.${clickEl.className}`);
      
      // 5. 先 hover 再 click（完全真人行为）
      const hoverEvent = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window
      });
      clickEl.dispatchEvent(hoverEvent);
      
      setTimeout(() => {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          view: window
        });
        clickEl.dispatchEvent(clickEvent);
        console.log('✅ 点击成功');
        resolve(true);
      }, random(100, 300));
    }, random(500, 1000));
  });
}

// 查找并点击目标笔记（按词库优先级排序）
async function findAndClickTargetNote() {
  if (state.isWorking) {
    console.log('⏳ 正在处理中，跳过');
    return;
  }
  
  // 检查是否启用自动选取笔记
  if (!config.noteEnable) {
    console.log('ℹ️ 自动选取笔记功能未开启');
    return;
  }
  
  console.log('🔍 查找意向笔记...');
  
  // 获取可见的笔记卡片
  const visibleCards = getVisibleNoteCards();
  console.log(`📊 找到 ${visibleCards.length} 个可见卡片`);
  
  if (visibleCards.length === 0) {
    console.log('⚠️ 未找到可见卡片');
    return;
  }
  
  // 筛选目标笔记，按词库优先级排序（索引越小优先级越高）
  // 筛选目标笔记，排除已处理过的，按优先级排序
  const targetCardsWithPriority = visibleCards
    .map(card => {
      const cardKey = card.innerText.substring(0, 100) || card.getAttribute('href') || card.getAttribute('data-note-id') || Math.random().toString();
      return { card, priority: isTargetNote(card), key: cardKey };
    })
    .filter(item => item.priority !== -1 && !state.processedNotes.has(item.key))
    .sort((a, b) => a.priority - b.priority);
  
  console.log(`🎯 找到 ${targetCardsWithPriority.length} 个匹配关键词的卡片（已按优先级排序，排除已处理）`);
  
  // 选择要点击的卡片
  let selectedCard = null;
  if (targetCardsWithPriority.length > 0) {
    // 优先选择优先级最高的（索引最小的）
    const bestMatch = targetCardsWithPriority[0];
    selectedCard = bestMatch.card;
    // 标记为已处理
    state.processedNotes.add(bestMatch.key);
    console.log(`✅ 选择了优先级最高的笔记 (匹配关键词索引: ${bestMatch.priority}, 关键词: ${keywords.target[bestMatch.priority]})`);
    // 打印选中卡片的内容供调试
    try {
      const cardText = selectedCard.innerText.substring(0, 50);
      console.log(`📝 选中笔记内容预览: ${cardText}...`);
    } catch (e) {}
  } else {
    // 如果没有匹配关键词的，选择第一个可见卡片（也排除已处理的）
    const availableCards = visibleCards.filter(card => {
      const cardKey = card.innerText.substring(0, 100) || card.getAttribute('href') || Math.random().toString();
      return !state.processedNotes.has(cardKey);
    });
    if (availableCards.length > 0) {
      const cardKey = availableCards[0].innerText.substring(0, 100) || Math.random().toString();
      state.processedNotes.add(cardKey);
      selectedCard = availableCards[0];
      console.log('⚠️ 未找到匹配关键词的笔记，选择第一个笔记');
    } else {
      console.log('⚠️ 所有可见卡片都已处理过，跳过本次筛选');
      state.isWorking = false;
      return;
    }
  }
  
  // 标记为工作状态
  state.isWorking = true;
  
  // 点击卡片
  const success = await clickCard(selectedCard);
  
  // 如果点击成功，停止滚动（进入笔记后停止一切操作）
  if (success) {
    stopScrolling();
    console.log('⏹️ 进入笔记，停止滚动');
    // 检查是否进入笔记详情页
    checkNotePageAfterClick();
  }
  
  // 无论成功与否，3秒后重置状态（确保不会卡住）
  setTimeout(() => {
    state.isWorking = false;
    console.log('🔄 重置工作状态');
  }, 3000);
  
  if (!success) {
    state.isWorking = false;
  }
}

// 点赞
async function doLike() {
  try {
    console.log('👍 尝试点赞...');
    
    const parentSelector = "div.interactions.engage-bar";
    
    // 参考content副本.js：先找like-lottie元素，再找父元素like-wrapper
    const likeBtn = document.querySelector(`${parentSelector} span.like-lottie`);
    if (likeBtn) {
      console.log("📌 找到like-lottie元素");
      const likeWrapper = likeBtn.closest('span.like-wrapper');
      if (likeWrapper) {
        likeWrapper.click();
        console.log('✅ 点赞操作执行完成');
        return;
      }
    }
    
    // 备用：找reds-icon like-icon元素
    const likeIcon = document.querySelector(`${parentSelector} svg.reds-icon.like-icon`);
    if (likeIcon) {
      console.log("📌 找到reds-icon like-icon元素");
      const likeWrapper = likeIcon.closest('span.like-wrapper');
      if (likeWrapper) {
        likeWrapper.click();
        console.log('✅ 点赞操作执行完成');
        return;
      }
    }
    
    // 如果上面的方法失败，尝试其他选择器
    const likeSelectors = [
      `${parentSelector} span.like-wrapper`,
      `${parentSelector} .left .like-wrapper`,
      'span.like-wrapper',
      '.engage-bar .like-wrapper',
      '.buttons .like-wrapper'
    ];
    
    let fallbackBtn = null;
    for (const selector of likeSelectors) {
      fallbackBtn = document.querySelector(selector);
      if (fallbackBtn) {
        console.log(`📌 找到点赞按钮: ${selector}`);
        break;
      }
    }
    
    if (fallbackBtn) {
      fallbackBtn.click();
      console.log('✅ 点赞操作执行完成');
    } else {
      console.error('❌ 未找到点赞按钮');
    }
  } catch (e) {
    console.error('❌ 点赞失败:', e.message);
  }
}

// 调用火山方舟AI生成评论
async function generateAIComment(noteText) {
  if (!config.apiKey) {
    console.log('❌ API Key未配置');
    return '';
  }
  
  try {
    console.log('🤖 正在调用火山方舟API生成评论...');
    
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: "doubao-seed-2-0-pro-260215",
        endpoint_id: "ep-m-20260420182011-v5xsw",
        messages: [
          { role: "system", content: "你是真实的小红书用户，根据笔记内容生成一句10-20字的自然评论，口语化、走心有趣、无AI味、不肉麻、无广告，只返回评论内容。" },
          { role: "user", content: `笔记正文：${noteText}，请生成一句评论` }
        ],
        temperature: 0.8,
        max_tokens: 60,
        stream: false
      })
    });
    
    if (!response.ok) throw new Error('API调用失败');
    
    const data = await response.json();
    const comment = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (comment) {
      console.log('✅ AI生成评论:', comment);
    }
    
    return comment;
  } catch (e) {
    console.error('❌ API调用异常:', e.message);
    return '';
  }
}

// 评论
async function doComment() {
  if (!config.commentEnable) {
    console.log('ℹ️ 评论功能未开启');
    return;
  }
  
  try {
    console.log('💬 尝试发表评论...');
    
    const parentSelector = "div.interactions.engage-bar";
    
    // 获取笔记内容用于AI生成
    const noteContent = document.querySelector('.note-content')?.innerText || document.querySelector('.content')?.innerText || '';
    if (!noteContent) {
      console.log('❌ 未找到笔记内容');
      return;
    }
    
    // 调用AI生成评论
    const commentText = await generateAIComment(noteContent);
    if (!commentText) {
      console.log('❌ AI未生成评论内容');
      return;
    }
    
    // 第一步：点击评论按钮打开评论输入框
    console.log('👆 点击评论按钮');
    const commentOpenBtn = document.querySelector(`${parentSelector} span.chat-wrapper`);
    if (!commentOpenBtn) {
      console.error('❌ 未找到评论按钮');
      return;
    }
    commentOpenBtn.click();
    await randomDelay(500, 800);
    
    // 第二步：找到评论输入框
    console.log('🔍 正在查找评论输入框');
    const commentInput = document.querySelector(`${parentSelector} p#content-textarea`);
    if (!commentInput) {
      console.error('❌ 未找到评论输入框');
      return;
    }
    
    // 第三步：填入AI评论（使用execCommand方式）
    console.log('✍️ 填入AI评论');
    commentInput.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    document.execCommand("insertText", false, commentText);
    commentInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ AI评论已填入:', commentText);
    
    // 第四步：点击发送按钮
    await randomDelay(500, 800);
    const sendBtn = document.querySelector(`${parentSelector} button.btn.submit:not([disabled])`);
    if (sendBtn) {
      sendBtn.click();
      console.log('📤 评论发送成功！');
    } else {
      // 如果按钮不可用，尝试移除disabled属性
      const disabledBtn = document.querySelector(`${parentSelector} button.btn.submit[disabled]`);
      if (disabledBtn) {
        disabledBtn.removeAttribute('disabled');
        disabledBtn.click();
        console.log('📤 评论发送成功！');
      } else {
        console.error('❌ 未找到发送按钮');
      }
    }
  } catch (e) {
    console.error('❌ 评论失败:', e.message);
  }
}

// 等待元素
function waitElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(timer);
        reject(new Error(`元素 ${selector} 加载超时`));
      }
    }, 100);
  });
}

// 返回主页
async function closeNote() {
  try {
    console.log('🔙 准备返回主页...');
    
    // 修复选择器：使用 div.close-circle 而非 div.close-circle div.close
    const closeBtn = await waitElement("div.close-circle", 3000);
    if (closeBtn) {
      closeBtn.click();
      console.log('✅ 已点击关闭按钮，返回主页');
      await randomDelay(1000, 1500); // 等待页面跳转
      return;
    }
    
    // 如果上面的方法失败，尝试其他选择器
    const closeSelectors = [
      'div.close-circle',
      'button.close',
      '[aria-label="关闭"]',
      '[aria-label*="返回"]',
      'svg[class*="arrow-left"]',
      'svg[class*="back"]',
      'button[class*="back"]',
      'button[class*="close"]',
      'div[role="button"][class*="close"]',
      '.close-btn',
      '.back-btn'
    ];
    
    let fallbackBtn = null;
    for (const selector of closeSelectors) {
      fallbackBtn = document.querySelector(selector);
      if (fallbackBtn) {
        console.log(`📌 找到关闭按钮: ${selector}`);
        break;
      }
    }
    
    if (fallbackBtn) {
      fallbackBtn.click();
      console.log('✅ 点击关闭按钮返回');
    } else {
      console.log('⚠️ 未找到关闭按钮，使用 history.back()');
      window.history.back();
    }
    
    await randomDelay(1000, 1500);
    console.log('✅ 已返回主页');
  } catch (e) {
    console.error('❌ 返回失败:', e.message);
    window.history.back();
  }
}

// 判断页面类型
function isHomePage() {
  if (isNoteDetailPage()) return false; // 先排除笔记详情页
  const u = location.href.toLowerCase();
  const path = location.pathname.toLowerCase();
  
  // 首页：/explore 开头，不含数字ID路径
  // 搜索页：/search_result?keyword 开头
  const isExploreHome = path === '/explore' || path.startsWith('/explore?');
  const isSearchPage = path.startsWith('/search_result');
  
  return isExploreHome || isSearchPage || 
         u.includes('/discovery') || u.includes('/home') || 
         u.includes('/feed') || u.includes('/recommend');
}

function isNoteDetailPage() {
  // 检查 URL 是否包含笔记相关路径
  const path = location.pathname.toLowerCase();
  const search = location.search.toLowerCase();
  const href = location.href.toLowerCase();
  
  // 笔记详情页的特征：
  // 1. 路径包含 /note/ 或 /n/
  // 2. 查询参数包含 note_id 或 noteId
  // 3. 路径格式如 /explore/[数字ID]（搜索/首页进入的笔记）
  // 4. 参数包含 xsec_source=pc_search（搜索页进入的笔记）
  // 5. 参数包含 xsec_source=pc_cfeed 或 xsec_source=pc_feed（首页进入的笔记）
  const hasNumericId = /\/explore\/[0-9a-f]{10,}\/?$/.test(path); // 匹配 /explore/[10位以上数字ID]
  const isSearchNote = search.includes('xsec_source=pc_search');
  const isHomeNote = search.includes('xsec_source=pc_cfeed') || search.includes('xsec_source=pc_feed');
  
  return path.includes('/note/') || path.includes('/n/') || 
         search.includes('note_id') || search.includes('noteId') ||
         hasNumericId || isSearchNote || isHomeNote;
}

// 检查是否是风控页面
function isRiskPage() {
  const bodyText = document.querySelector('body')?.innerText || '';
  return bodyText.includes('当前笔记暂时无法浏览') || 
         bodyText.includes('请打开小红书App扫码查看') ||
         bodyText.includes('登录') ||
         bodyText.includes('验证码');
}

// 处理详情页
async function handleNotePage() {
  console.log('✅ 【详情页】开始操作');
  state.isWorking = true;  // 进入详情页立即锁定状态
  
  try {
    if (isRiskPage()) {
      console.log('🚨 检测到风控拦截！立即返回主页');
      await randomDelay(500, 1000);
      window.history.back();
      return;
    }
    
    await randomDelay(2000, 4000);
    
    if (isRiskPage()) {
      console.log('🚨 检测到风控拦截！');
      window.history.back();
      return;
    }
    
    if (config.likeEnable) {
      console.log('❤️ 准备点赞...');
      await doLike();
      await randomDelay(1000, 2000);
    }
    
    if (config.commentEnable) {
      console.log('💬 准备评论...');
      await doComment();
      await randomDelay(1500, 2500);
    }
    
    console.log('🔙 准备返回...');
    await closeNote();
  } catch (e) {
    console.error('❌ 详情页操作出错:', e.message);
    // 出错时也尝试返回主页
    try {
      await closeNote();
    } catch (closeError) {
      console.error('❌ 返回主页失败:', closeError.message);
      window.history.back();
    }
  } finally {
    state.isWorking = false;  // 无论成功与否都重置状态
    console.log('🔄 状态已重置');
  }
}

// 停止自动滚动
function stopScrolling() {
  if (state.scrollTimer) {
    clearInterval(state.scrollTimer);
    state.scrollTimer = null;
    console.log('⏹️ 停止自动滚动');
  }
}

// 启动自动滚动
function startScrolling() {
  if (config.scrollEnable && !state.scrollTimer) {
    state.scrollTimer = setInterval(async () => {
      if (!state.isWorking) {
        // 每两次下滑筛选一次
        if (state.scrollCount >= 2) {
          console.log(`🔍 第 ${state.scrollCount + 1} 次操作，执行筛选...`);
          await findAndClickTargetNote();
          
          // 如果找到并点击了笔记，重置计数器
          if (state.isWorking) {
            state.scrollCount = 0;
            console.log('🔄 找到目标笔记，重置下滑计数器');
          } else {
            // 没有找到目标笔记，继续下滑
            const scrollHeight = random(window.innerHeight * 0.5, window.innerHeight * 0.8);
            window.scrollBy({ top: scrollHeight, behavior: 'smooth' });
            console.log(`📉 未找到目标笔记，继续下滑 ${scrollHeight}px`);
          }
        } else {
          // 只下滑不筛选
          const scrollHeight = random(window.innerHeight * 0.5, window.innerHeight * 0.8);
          window.scrollBy({ top: scrollHeight, behavior: 'smooth' });
          state.scrollCount++;
          console.log(`📉 第 ${state.scrollCount} 次下滑 (${scrollHeight}px)，累计下滑 ${state.scrollCount} 次`);
        }
      }
    }, random(3000, 5000));
    
    console.log('🔄 自动滚动定时器已启动');
  }
}

// 处理主页
async function handleHomePage() {
  console.log('✅ 【主页】启动自动操作');
  
  // 确保停止之前的定时器
  stopScrolling();
  
  // 启动新的自动滚动循环
  startScrolling();
}

// 加载配置
function loadConfig() {
  chrome.storage.local.get(['apiKey', 'likeEnable', 'commentEnable', 'noteEnable', 'scrollEnable'], (result) => {
    config.apiKey = result.apiKey || '';
    config.likeEnable = result.likeEnable !== false;
    config.commentEnable = result.commentEnable || false;
    config.noteEnable = result.noteEnable !== false;
    config.scrollEnable = result.scrollEnable !== false;
    console.log('📋 配置已加载:', config);
  });
}

// 主函数
async function main() {
  console.log('🎯 插件启动成功！');
  
  if (isHomePage()) {
    handleHomePage();
  } else if (isNoteDetailPage()) {
    await handleNotePage();
  }
}

// 消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'syncConfig') {
    loadConfig();
    sendResponse({ success: true });
  }
});

// 启动监听
window.addEventListener('load', () => {
  console.log('🔔 页面加载完成');
  loadConfig();
  setTimeout(main, 2000);
});

// URL变化监听
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('🔄 URL变化:', lastUrl);
    setTimeout(main, 1500);
  }
}).observe(document.body, { 
  subtree: true, 
  childList: true,
  attributes: true,
  characterData: true
});

// 添加定期检查机制（确保不会遗漏页面变化）
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('🔄 定期检查发现URL变化:', lastUrl);
    setTimeout(main, 1000);
  }
}, 2000);

// 直接检查
if (document.readyState === 'complete') {
  console.log('🔔 文档已就绪');
  loadConfig();
  setTimeout(main, 2000);
}

// 点击后额外检查是否进入笔记页
function checkNotePageAfterClick() {
  setTimeout(() => {
    if (isNoteDetailPage() && !state.isWorking) {
      console.log('🔔 检测到进入笔记详情页');
      handleNotePage();
    }
  }, 2000);
}

console.log('✅ AI社交助手 - 加载完成！');
