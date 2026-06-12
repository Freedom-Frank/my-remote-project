/* ===== 中/英双语支持（默认英文） ===== */
window.I18N = (() => {
  'use strict';

  const dict = {
    zh: {
      title: '保卫论文',
      subtitle: '在 Bug、Deadline 和审稿人的围攻下，守住你的论文',
      choose: '选择你的角色',
      controls: '操作：WASD / 方向键移动 · 鼠标瞄准 · 按住左键或空格射击 · P 暂停 · M 静音',
      best: '最高分',
      score: '分数',
      wave: '波次',
      paused: '暂停中',
      resume: '继续游戏',
      menu: '返回主菜单',
      retry: '再战一次',
      send: '发送',
      save: '保存',
      clear: '清除',
      close: '关闭',

      phd_name: '卷王博士生',
      phd_desc: '均衡全能，导师眼里的好学生',
      wizard_name: '代码法师',
      wizard_desc: '射速拉满，单发伤害较低',
      postdoc_name: '咖啡因博士后',
      postdoc_desc: '移速狂飙，一击重锤但装填慢',
      st_speed: '移速',
      st_rate: '射速',
      st_dmg: '伤害',
      st_hp: '体力',

      wave_banner: '第 {n} 波',
      boss_banner: '审稿人二号驾到！',
      wave_clear: '波次完成 +{n}',
      minor_rev: '小修意见 ×2！',
      combo: '连击',

      upgrade_title: '波次完成！',
      upgrade_pick: '选择一项强化，让论文更坚不可摧',
      up_dmg_n: '更锋利的批判', up_dmg_d: '子弹伤害 +30%',
      up_rate_n: '咖啡因静脉滴注', up_rate_d: '射速 +25%',
      up_speed_n: '跑步鞋', up_speed_d: '移动速度 +15%',
      up_multishot_n: '一稿多投', up_multishot_d: '每次射击 +1 发子弹',
      up_pierce_n: '穿透性论证', up_pierce_d: '子弹多穿透 1 个敌人',
      up_thesis_n: '增厚论文', up_thesis_d: '论文耐久上限 +25 并立即修复',
      up_hp_n: '终身教职轨道', up_hp_d: '体力上限 +25 并回满',
      up_repair_n: '学术休假', up_repair_d: '论文耐久全部恢复',

      go_title: '答辩失败！',
      go_degree: '最终评定：{deg}',
      go_stats: '分数 {score} · 撑到第 {wave} 波 · 最高分 {best}',
      go_bestcombo: '最高连击 ×{n}',
      go_build: '本局强化：',
      deg_0: '🪪 结业证明',
      deg_1: '🎓 学士学位',
      deg_2: '🎓 硕士学位',
      deg_3: '🎓 博士学位',
      deg_4: '🏆 终身教授',
      roast_low: '你的论文在第一轮审稿就被毙了……再接再厉。',
      roast_mid: '勉强够毕业了，但导师建议你再投一轮。',
      roast_high: '同行评审一致通过！Nature 在向你招手。',

      advisor_title: 'AI 导师',
      advisor_placeholder: '问导师点什么……',
      api_settings: 'AI 导师设置（可选）',
      api_desc: '填入 Anthropic API Key 后，导师将由 Claude 实时驱动（claude-haiku-4-5），能结合战况自由对话。Key 仅保存在你的浏览器 localStorage，直接调用官方 API，不经过任何第三方服务器。不填也能玩，导师会使用内置语料回答。',
      api_saved: '✅ 已保存，导师已接入 Claude！',
      api_cleared: '已清除，导师切回内置语料模式。',
      api_thinking: '导师思考中……',
      api_error: '⚠️ Claude 调用失败（检查 Key 或网络），先用内置语料回答你：',
    },
    en: {
      title: 'Defend Your Thesis',
      subtitle: 'Survive the siege of Bugs, Deadlines and Peer Reviewers',
      choose: 'Choose Your Character',
      controls: 'Controls: WASD / Arrows to move · Mouse to aim · Hold LMB or Space to shoot · P pause · M mute',
      best: 'Best',
      score: 'Score',
      wave: 'Wave',
      paused: 'Paused',
      resume: 'Resume',
      menu: 'Main Menu',
      retry: 'Try Again',
      send: 'Send',
      save: 'Save',
      clear: 'Clear',
      close: 'Close',

      phd_name: 'Grind PhD',
      phd_desc: 'Balanced all-rounder, advisor\'s favorite',
      wizard_name: 'Code Wizard',
      wizard_desc: 'Blazing fire rate, lower damage',
      postdoc_name: 'Caffeinated Postdoc',
      postdoc_desc: 'Lightning fast, heavy hits, slow reload',
      st_speed: 'SPD',
      st_rate: 'RATE',
      st_dmg: 'DMG',
      st_hp: 'HP',

      wave_banner: 'Wave {n}',
      boss_banner: 'Reviewer #2 has arrived!',
      wave_clear: 'Wave clear +{n}',
      minor_rev: 'Minor revisions ×2!',
      combo: 'COMBO',

      upgrade_title: 'Wave Cleared!',
      upgrade_pick: 'Pick one upgrade to fortify your thesis',
      up_dmg_n: 'Sharper Critique', up_dmg_d: '+30% bullet damage',
      up_rate_n: 'Caffeine IV Drip', up_rate_d: '+25% fire rate',
      up_speed_n: 'Running Shoes', up_speed_d: '+15% move speed',
      up_multishot_n: 'Double Submission', up_multishot_d: '+1 projectile per shot',
      up_pierce_n: 'Piercing Argument', up_pierce_d: 'Bullets pierce +1 enemy',
      up_thesis_n: 'Thicker Thesis', up_thesis_d: '+25 max thesis HP & repair',
      up_hp_n: 'Tenure Track', up_hp_d: '+25 max stamina & heal',
      up_repair_n: 'Sabbatical', up_repair_d: 'Fully repair the thesis',

      go_title: 'Defense Failed!',
      go_degree: 'Final verdict: {deg}',
      go_stats: 'Score {score} · Survived to wave {wave} · Best {best}',
      go_bestcombo: 'Best combo ×{n}',
      go_build: 'Upgrades this run: ',
      deg_0: '🪪 Certificate of Attendance',
      deg_1: '🎓 Bachelor\'s Degree',
      deg_2: '🎓 Master\'s Degree',
      deg_3: '🎓 PhD',
      deg_4: '🏆 Tenured Professor',
      roast_low: 'Your thesis got desk-rejected in round one... try again.',
      roast_mid: 'Barely enough to graduate. Your advisor suggests one more round.',
      roast_high: 'Unanimous accept from all reviewers! Nature is calling.',

      advisor_title: 'AI Advisor',
      advisor_placeholder: 'Ask your advisor...',
      api_settings: 'AI Advisor Settings (optional)',
      api_desc: 'Paste an Anthropic API Key to power the advisor with Claude (claude-haiku-4-5) for free-form, battle-aware chat. The key is stored only in your browser\'s localStorage and calls the official API directly — no third-party server. Without a key, the advisor uses built-in responses.',
      api_saved: '✅ Saved. Advisor is now powered by Claude!',
      api_cleared: 'Cleared. Advisor switched back to built-in mode.',
      api_thinking: 'Advisor is thinking...',
      api_error: '⚠️ Claude call failed (check key or network). Built-in answer instead:',
    },
  };

  let lang = localStorage.getItem('dyt_lang') || 'en';
  if (!dict[lang]) lang = 'en';

  function t(key, vars) {
    let s = dict[lang][key] ?? dict.en[key] ?? key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }

  function setLang(l) {
    if (!dict[l]) return;
    lang = l;
    localStorage.setItem('dyt_lang', l);
    apply();
  }

  return { t, setLang, apply, get lang() { return lang; } };
})();
