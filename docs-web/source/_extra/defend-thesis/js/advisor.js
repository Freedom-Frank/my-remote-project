/* ===== AI 导师 NPC =====
 * 双模式：
 * 1) 内置模式：规则引擎，根据游戏事件/战况推送提示，聊天用关键词匹配回答。
 * 2) Claude 模式：填入 API Key 后，聊天经由 Anthropic Messages API（claude-haiku-4-5），
 *    系统提示词中注入实时战况，导师可自由对话。
 */
window.Advisor = (() => {
  'use strict';

  const t = () => window.I18N.t;
  const zh = () => window.I18N.lang === 'zh';

  let getState = () => null;
  let lastTipAt = 0;
  let seen = new Set();        // 本局已触发过的一次性事件
  let chatHistory = [];        // 发给 Claude 的最近对话
  let logEl, inputEl, formEl;

  const MODEL = 'claude-haiku-4-5';
  const keyStore = 'dyt_api_key';

  // ---------- 文案 ----------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const L = (zhText, enText) => (zh() ? zhText : enText);

  const startLines = {
    phd: () => L('选得稳！卷王博士生均衡发展。记住：论文没了就真的毕不了业了。',
      'Solid choice! The Grind PhD is well-balanced. Remember: no thesis, no graduation.'),
    wizard: () => L('代码法师射速拉满！贴近输出很爽，但你血皮薄，别站撸 Boss。',
      'Code Wizard with max fire rate! Melts crowds, but you\'re squishy — don\'t facetank the boss.'),
    postdoc: () => L('咖啡因驱动型选手！跑得快打得疼，但装填慢——每一枪都要打准。',
      'Caffeine-powered! Fast and hard-hitting, but slow reload — make every shot count.'),
  };

  const idleTips = () => zh() ? [
    '走位比输出更重要——绕着圈风筝它们。',
    '你的子弹可以打掉审稿人发来的修改意见（✉️），试试空中拦截。',
    '别一直守在论文旁边，主动出击在半路拦截更安全。',
    'Boss 每 5 波来一次，来之前记得把论文修满。',
    '⏰Deadline 越接近论文跑得越快，这很真实。优先处理它。',
    '波次之间有几秒喘息，利用这段时间捡道具、占好位。',
  ] : [
    'Positioning beats firepower — kite them in circles.',
    'Your bullets can intercept reviewer comments (✉️) mid-air. Try it.',
    'Don\'t camp next to the thesis — intercepting halfway is safer.',
    'A boss arrives every 5 waves. Patch up your thesis beforehand.',
    'Deadlines speed up the closer they get to the thesis. Realistic, huh? Kill them first.',
    'Use the breather between waves to grab pickups and reposition.',
  ];

  const pickupLines = {
    coffee: () => L('☕ 咖啡：8 秒内移速射速大增。学术界的硬通货。',
      '☕ Coffee: +speed & fire rate for 8s. Academia\'s hard currency.'),
    cite: () => L('📚 文献加持：10 秒双倍伤害。引用就是力量！',
      '📚 Citations: double damage for 10s. Citation is power!'),
    tape: () => L('🩹 胶带：论文 +20 耐久。放心，盲审看不出来。',
      '🩹 Tape: thesis +20 HP. Don\'t worry, reviewers won\'t notice.'),
    spread: () => L('🔥 热门观点：5 秒三向散射！一稿三投，火力覆盖。',
      '🔥 Hot Take: 5s of triple-spread fire! Submit to three venues at once.'),
    idea: () => L('💡 灵感爆发：全屏伤害！要是写论文也能这样就好了。',
      '💡 Eureka: full-screen damage! If only writing papers worked like this.'),
  };

  // ---------- 输出到面板 ----------
  function say(text, cls = 'tip') {
    if (!logEl) return;
    const div = document.createElement('div');
    div.className = 'msg ' + cls;
    div.innerHTML = '<span class="who">🤖</span><span class="body"></span>';
    div.querySelector('.body').textContent = text;
    logEl.appendChild(div);
    while (logEl.children.length > 80) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function sayUser(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = '<span class="who">🧑‍🎓</span><span class="body"></span>';
    div.querySelector('.body').textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ---------- 游戏事件入口 ----------
  function event(type, data = {}) {
    const now = performance.now() / 1000;
    const urgent = ['start', 'boss', 'thesis25', 'death', 'gameover', 'bosskill'].includes(type);
    if (!urgent && now - lastTipAt < 6) return;

    let text = null;
    switch (type) {
      case 'start':
        seen = new Set();
        chatHistory = [];
        text = (startLines[data.charId] || startLines.phd)();
        break;
      case 'wave':
        if (data.n === 1) text = L('第一波只是热身。离论文远一点，半路拦下它们！',
          'Wave one is a warm-up. Stay off the thesis and intercept them halfway!');
        else if (data.n === 2 && !seen.has('deadline')) { seen.add('deadline');
          text = L('⏰ Deadline 出现了！它越接近论文冲得越快——务必优先击杀。',
            '⏰ Deadlines incoming! They accelerate toward your thesis — kill them first.'); }
        else if (data.n === 3 && !seen.has('reviewer')) { seen.add('reviewer');
          text = L('🤓 审稿人上线！他们在远处朝论文投修改意见，优先点名。',
            '🤓 Reviewers online! They lob comments at your thesis from range. Focus them down.'); }
        else if (Math.random() < 0.5) text = pick(idleTips());
        break;
      case 'boss':
        text = L('审稿人二号来了！！皮糙肉厚还会召唤小修意见。集中火力——小怪也别放过！',
          'Reviewer #2 is here!! Tanky, and spawns minor revisions. Focus fire — but don\'t ignore the minions!');
        break;
      case 'bosskill':
        text = L('漂亮！审稿人二号被你成功说服（物理）。快捡掉落奖励！',
          'Beautiful! You\'ve convinced Reviewer #2 (physically). Grab the loot!');
        break;
      case 'thesis50':
        if (seen.has('t50')) return; seen.add('t50');
        text = L('论文耐久掉到一半了！捡 🩹 胶带能修复，稳住别慌。',
          'Thesis at half HP! 🩹 Tape pickups repair it. Stay calm.');
        break;
      case 'thesis25':
        if (seen.has('t25')) return; seen.add('t25');
        text = L('危！论文快被毙了！立刻清掉最近的敌人，优先 ⏰ 和贴脸的！',
          'CRITICAL! Thesis nearly destroyed! Clear the closest enemies NOW — deadlines first!');
        break;
      case 'death':
        text = L('你倒下了……几秒后归来。复活前论文全靠它自己了，祈祷吧。',
          'You\'re down... respawning in a few seconds. The thesis is on its own — pray.');
        break;
      case 'pickup':
        if (seen.has('p_' + data.type)) return; seen.add('p_' + data.type);
        text = (pickupLines[data.type] || (() => null))();
        break;
      case 'milestone':
        text = L(`${data.score} 分了！按这个势头，Nature 都得给你发约稿函。`,
          `${data.score} points! At this rate Nature will be sending YOU invitations.`);
        break;
      case 'combo':
        if (seen.has('combo20')) return; seen.add('combo20');
        text = L('20 连击！手感火热，别让论文挨打，连击断了就清零了。',
          '20-kill combo! On fire — keep the thesis untouched, a single hit resets it.');
        break;
      case 'upgrade':
        if (seen.has('upg1')) return; seen.add('upg1');
        text = L('每波结束都能三选一强化！穿透 + 一稿多投是滚雪球的经典组合。',
          'After every wave you pick 1 of 3 upgrades! Pierce + multishot is a classic snowball combo.');
        break;
      case 'waveclear':
        if (data.n % 2 === 0) text = L(`第 ${data.n} 波撑过去了，论文还在，导师很欣慰。`,
          `Wave ${data.n} survived. Thesis intact. Your advisor is pleased.`);
        break;
      case 'gameover':
        text = L(`最终成绩：${data.score} 分，撑到第 ${data.wave} 波。${data.degree}。休息一下，下次答辩再战！`,
          `Final: ${data.score} pts, survived to wave ${data.wave}. ${data.degree}. Rest up — see you at the next defense!`);
        break;
    }
    if (text) {
      say(text, type === 'thesis25' || type === 'boss' ? 'alert' : 'tip');
      lastTipAt = now;
    }
  }

  // ---------- 聊天：内置关键词匹配 ----------
  function localAnswer(q) {
    const s = q.toLowerCase();
    const has = (...words) => words.some(w => s.includes(w));
    if (has('怎么玩', '操作', '控制', 'how', 'control', 'key', '玩法'))
      return L('WASD 或方向键移动，鼠标瞄准，按住左键或空格射击。P 暂停，M 静音。守住中间的论文就行！',
        'Move with WASD/arrows, aim with mouse, hold LMB or Space to shoot. P to pause, M to mute. Just keep the thesis alive!');
    if (has('敌人', '怪', 'bug', 'deadline', '审稿', 'enemy', 'reviewer', 'boss', '二号', 'split', '分裂'))
      return L('🐛Bug 快而脆；⏰Deadline 越近越快，优先杀；🤓审稿人远程丢修改意见；📋返修堆被打死会分裂成 2 只 Bug；🧐审稿人二号是 Boss，每 5 波一次，会召唤小修。',
        '🐛 Bugs are fast but fragile. ⏰ Deadlines accelerate when close — kill first. 🤓 Reviewers lob comments from range. 📋 Revision Piles split into 2 bugs when killed. 🧐 Reviewer #2 is the boss every 5 waves, spawns minions.');
    if (has('角色', '人物', 'char', 'who', '选谁'))
      return L('博士生均衡，新手推荐；代码法师射速快适合扫虫群；博士后跑得快单发猛，适合走位流。',
        'PhD is balanced (best for beginners). Wizard\'s fire rate shreds bug swarms. Postdoc is fast with heavy single shots — for kiters.');
    if (has('道具', '掉落', '咖啡', 'pickup', 'item', 'power', 'drop'))
      return L('敌人掉落：☕咖啡=加速、📚文献=双倍伤害、🩹胶带=修论文+20、💡灵感=全屏炸弹。掉落 9 秒后消失，抓紧捡。',
        'Drops: ☕ coffee = speed boost, 📚 citations = double damage, 🩹 tape = repair thesis +20, 💡 eureka = screen bomb. They vanish after 9s — grab fast.');
    if (has('加血', '回血', '修复', 'heal', 'repair', 'hp', '血'))
      return L('论文靠 🩹胶带修复，每波结束也会小回 5 点；你自己 4 秒不挨打会缓慢回血。',
        'Repair the thesis with 🩹 tape; it also heals 5 after each wave. You regen slowly after 4s without taking damage.');
    if (has('分数', '得分', 'score', '高分', '技巧', 'tip', '秘诀', 'advice'))
      return L('高分秘诀：别漏怪到论文、波次奖励吃满、Boss 必杀（300分）。死亡扣 50 分，苟住也是技术。',
        'Score tips: let nothing touch the thesis, collect every wave bonus, always kill the boss (+300). Dying costs 50 — survival is skill.');
    const st = getState();
    if (st && st.state === 'playing' && st.thesisHp < 50)
      return L('现在别聊了——你论文都快没了！先清掉身边的敌人！', 'No time to chat — your thesis is nearly gone! Clear those enemies first!');
    return pick(idleTips());
  }

  // ---------- 聊天：Claude API ----------
  function buildSystem() {
    const st = getState() || {};
    const stateStr = st.state === 'playing'
      ? `wave=${st.wave}, score=${st.score}, thesisHP=${st.thesisHp}/100, playerHP=${st.playerHp}, character=${st.char}, enemiesOnScreen=${st.enemies}, bossActive=${st.boss}`
      : `not in battle (state=${st.state || 'menu'})`;
    return 'You are the AI advisor NPC inside a tower-defense shooter game "Defend Your Thesis" (保卫论文). ' +
      'The player is a grad student protecting their thesis at the center of the screen. ' +
      'Enemies: 🐛 Bug (fast, fragile), ⏰ Deadline (accelerates near thesis), 🤓 Reviewer (ranged comments), 🧐 Reviewer #2 (boss every 5 waves, spawns minions). ' +
      'Pickups: ☕ coffee (speed+fire rate), 📚 citations (double damage), 🩹 tape (repair thesis +20), 💡 eureka (screen bomb). ' +
      'Controls: WASD move, mouse aim, hold LMB/Space to shoot. Game over when thesis HP hits 0. ' +
      `Current battle state: ${stateStr}. ` +
      'Stay in character as a witty, supportive academic advisor. Answer in 1-3 short sentences, with humor and occasional jokes about academia. Give practical advice based on the live battle state. Reply in the same language the player uses.';
  }

  async function askClaude(q) {
    const key = localStorage.getItem(keyStore);
    chatHistory.push({ role: 'user', content: q });
    if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: buildSystem(),
        messages: chatHistory,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('') || '...';
    chatHistory.push({ role: 'assistant', content: text });
    return text;
  }

  async function onAsk(q) {
    sayUser(q);
    const hasKey = !!localStorage.getItem(keyStore);
    if (hasKey) {
      const thinking = document.createElement('div');
      thinking.className = 'msg tip';
      thinking.innerHTML = '<span class="who">🤖</span><span class="body"></span>';
      thinking.querySelector('.body').textContent = t()('api_thinking');
      logEl.appendChild(thinking);
      logEl.scrollTop = logEl.scrollHeight;
      try {
        const text = await askClaude(q);
        thinking.remove();
        say(text);
      } catch (err) {
        thinking.remove();
        say(t()('api_error') + '\n' + localAnswer(q), 'alert');
      }
    } else {
      setTimeout(() => say(localAnswer(q)), 250 + Math.random() * 350);
    }
  }

  // ---------- 初始化 ----------
  function init(opts) {
    getState = opts.getState;
    logEl = document.getElementById('advisor-log');
    inputEl = document.getElementById('advisor-input');
    formEl = document.getElementById('advisor-form');

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = inputEl.value.trim();
      if (!q) return;
      inputEl.value = '';
      onAsk(q);
    });

    // API Key 设置弹窗
    const modal = document.getElementById('modal-api');
    const keyInput = document.getElementById('api-key-input');
    const status = document.getElementById('api-status');
    document.getElementById('btn-ai-settings').addEventListener('click', () => {
      keyInput.value = localStorage.getItem(keyStore) || '';
      status.textContent = localStorage.getItem(keyStore) ? '🟢 Claude mode' : '⚪ Built-in mode';
      modal.classList.remove('hidden');
    });
    document.getElementById('btn-api-save').addEventListener('click', () => {
      const v = keyInput.value.trim();
      if (v) {
        localStorage.setItem(keyStore, v);
        status.textContent = t()('api_saved');
      }
    });
    document.getElementById('btn-api-clear').addEventListener('click', () => {
      localStorage.removeItem(keyStore);
      keyInput.value = '';
      status.textContent = t()('api_cleared');
    });
    document.getElementById('btn-api-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    // 欢迎语
    say(L('欢迎来到《保卫论文》！我是你的 AI 导师。选个角色开打，有问题随时问我。',
      'Welcome to Defend Your Thesis! I\'m your AI advisor. Pick a character and start — ask me anything.'));
  }

  return { init, event, say };
})();
