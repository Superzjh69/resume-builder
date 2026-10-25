/* 简历工坊 · 编辑器逻辑：表单 ↔ 数据 ↔ 简历预览，全部本地运行 */
(function () {
  'use strict';

  var LS_KEY = 'resume-workshop-v1';
  function $(s) { return document.querySelector(s); }

  /* ---------------- 示例数据 ---------------- */
  var sampleData = {
    basic: {
      name: '张小匠', intent: '前端开发工程师',
      phone: '138-0000-0000', email: 'zhangxiaojiang@mail.com',
      city: '上海', site: 'github.com/zhangxiaojiang',
      summary: '三年前端开发经验，主导过日活百万级活动页性能专项，首屏时间优化 40%。擅长工程化建设与团队协作，持续维护个人开源项目。'
    },
    education: [
      { school: '华东理工大学', major: '计算机科学与技术', degree: '本科', start: '2018-09', end: '2022-06', desc: 'GPA 3.7 / 4.0，连续三年获校奖学金' }
    ],
    work: [
      { company: '某互联网有限公司', title: '前端开发工程师', start: '2022-07', end: '至今',
        desc: '负责核心活动页开发与性能优化，主导组件库建设\n推动首屏加载从 2.8s 降至 1.7s，线上错误率下降 60%\n与设计、后端协作制定接口规范，联调效率提升 30%' },
      { company: '某科技有限公司', title: '前端开发实习生', start: '2021-06', end: '2021-09',
        desc: '参与管理后台迭代，独立完成 10+ 业务组件\n补充单元测试，覆盖率从 0 提升至 45%' }
    ],
    projects: [
      { name: '组件库 Collect-UI', role: '发起人 / 主要维护者', start: '2023-03', end: '至今',
        desc: '包含 40+ 高频业务组件，被 3 条产品线接入\nGitHub 800+ Star，提供完善的文档与在线用例' }
    ],
    skills: [
      '熟练使用 Vue3 / TypeScript 及周边生态',
      '熟悉 Vite / Webpack 工程化与性能优化',
      '掌握 Node.js，能独立完成全栈小项目',
      '良好的代码规范意识与文档习惯'
    ],
    honors: [
      { title: '公司年度新人奖', date: '2023' },
      { title: '全国大学生数学建模竞赛 二等奖', date: '2021' }
    ],
    settings: { template: 'classic', color: '#1d4ed8', fs: 13.5 }
  };

  function blank() {
    return {
      basic: { name: '', intent: '', phone: '', email: '', city: '', site: '', summary: '' },
      education: [], work: [], projects: [], skills: [], honors: [],
      settings: { template: 'classic', color: '#1d4ed8', fs: 13.5 }
    };
  }
  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
  function normalize(raw) {
    var d = blank();
    if (!raw || typeof raw !== 'object') return d;
    Object.keys(d.basic).forEach(function (k) { if (raw.basic && raw.basic[k] != null) d.basic[k] = String(raw.basic[k]); });
    ['education', 'work', 'projects', 'skills', 'honors'].forEach(function (k) {
      if (Array.isArray(raw[k])) d[k] = raw[k];
    });
    if (raw.settings) {
      if (['classic', 'minimal', 'modern'].indexOf(raw.settings.template) >= 0) d.settings.template = raw.settings.template;
      if (/^#[0-9a-fA-F]{6}$/.test(raw.settings.color)) d.settings.color = raw.settings.color;
      if ([12.5, 13.5, 14.5].indexOf(Number(raw.settings.fs)) >= 0) d.settings.fs = Number(raw.settings.fs);
    }
    return d;
  }

  /* ---------------- 状态 ---------------- */
  var state;
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY));
    if (saved && saved.basic) state = normalize(saved);
    else state = deepCopy(sampleData);
  } catch (e) { state = deepCopy(sampleData); }

  var tplParam = new URLSearchParams(location.search).get('tpl');
  if (tplParam && ['classic', 'minimal', 'modern'].indexOf(tplParam) >= 0) state.settings.template = tplParam;

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    }, 300);
  }

  /* ---------------- 工具函数 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function lines(s) {
    return String(s || '').split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean);
  }
  function range(s, e) {
    if (s && e) return s + ' — ' + e;
    return s || e || '';
  }
  function setPath(path, value) {
    var keys = path.split('.');
    var obj = state;
    for (var i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
  }
  function tint(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return 'rgba(29,78,216,.12)';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',0.12)';
  }
  function contactsOf(d) {
    return [d.basic.phone, d.basic.email, d.basic.city, d.basic.site].filter(Boolean);
  }
  function bulletsHtml(desc) {
    var ls = lines(desc);
    if (!ls.length) return '';
    return '<ul class="rz-bullets">' + ls.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }

  /* ---------------- 表单渲染 ---------------- */
  var DEGREES = ['本科', '硕士', '博士', '大专', '其他'];

  function itemHtml(listName, i, inner) {
    return '<div class="item-card">' +
      '<button type="button" class="del" data-action="del" data-list="' + listName + '" data-index="' + i + '" title="删除">✕</button>' +
      inner + '</div>';
  }
  function fInput(label, bind, value, ph) {
    return '<div class="field"><label>' + label + '</label>' +
      '<input data-bind="' + bind + '" value="' + esc(value) + '" placeholder="' + esc(ph || '') + '"></div>';
  }

  var listRender = {
    education: function (item, i) {
      return itemHtml('education', i,
        '<div class="grid2">' +
        fInput('学校', 'education.' + i + '.school', item.school, '华东理工大学') +
        fInput('专业', 'education.' + i + '.major', item.major, '计算机科学与技术') +
        '</div><div class="grid2">' +
        fInput('学历', 'education.' + i + '.degree', item.degree, '本科') +
        '</div><div class="grid2">' +
        fInput('开始（如 2018-09）', 'education.' + i + '.start', item.start, '2018-09') +
        fInput('结束（如 2022-06）', 'education.' + i + '.end', item.end, '2022-06') +
        '</div>' +
        fInput('备注（选填）', 'education.' + i + '.desc', item.desc, 'GPA 3.7 / 4.0'));
    },
    work: function (item, i) {
      return itemHtml('work', i,
        '<div class="grid2">' +
        fInput('公司', 'work.' + i + '.company', item.company, '某互联网有限公司') +
        fInput('职位', 'work.' + i + '.title', item.title, '前端开发工程师') +
        '</div><div class="grid2">' +
        fInput('开始（如 2022-07）', 'work.' + i + '.start', item.start, '2022-07') +
        fInput('结束（在职写“至今”）', 'work.' + i + '.end', item.end, '至今') +
        '</div>' +
        '<div class="field"><label>工作内容与业绩（每行一条）</label>' +
        '<textarea data-bind="work.' + i + '.desc" placeholder="负责核心活动页开发与性能优化&#10;推动首屏加载从 2.8s 降至 1.7s">' + esc(item.desc) + '</textarea></div>');
    },
    projects: function (item, i) {
      return itemHtml('projects', i,
        '<div class="grid2">' +
        fInput('项目名称', 'projects.' + i + '.name', item.name, '组件库 Collect-UI') +
        fInput('角色 / 链接', 'projects.' + i + '.role', item.role, '发起人 / 主要维护者') +
        '</div><div class="grid2">' +
        fInput('开始', 'projects.' + i + '.start', item.start, '2023-03') +
        fInput('结束', 'projects.' + i + '.end', item.end, '至今') +
        '</div>' +
        '<div class="field"><label>项目描述（每行一条）</label>' +
        '<textarea data-bind="projects.' + i + '.desc" placeholder="包含 40+ 高频业务组件，被 3 条产品线接入&#10;GitHub 800+ Star">' + esc(item.desc) + '</textarea></div>');
    },
    honors: function (item, i) {
      return itemHtml('honors', i,
        '<div class="grid2">' +
        fInput('名称', 'honors.' + i + '.title', item.title, '公司年度新人奖') +
        fInput('时间', 'honors.' + i + '.date', item.date, '2023') +
        '</div>');
    }
  };

  function renderLists() {
    var map = { education: 'listEdu', work: 'listWork', projects: 'listProj', honors: 'listHonor' };
    var cnt = { education: 'cntEdu', work: 'cntWork', projects: 'cntProj', honors: 'cntHonor' };
    Object.keys(map).forEach(function (k) {
      var html = '';
      for (var i = 0; i < state[k].length; i++) html += listRender[k](state[k][i], i);
      $('#' + map[k]).innerHTML = html;
      $('#' + cnt[k]).textContent = state[k].length ? '(' + state[k].length + ')' : '';
    });
    $('#skillsInput').value = state.skills.join('\n');
  }

  function renderBasicInputs() {
    document.querySelectorAll('[data-bind^="basic."]').forEach(function (el) {
      var key = el.getAttribute('data-bind').split('.')[1];
      el.value = state.basic[key] != null ? state.basic[key] : '';
    });
  }

  function syncToolbar() {
    document.querySelectorAll('.tpl-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tpl === state.settings.template);
    });
    document.querySelectorAll('.swatch').forEach(function (b) {
      b.classList.toggle('active', b.dataset.color.toLowerCase() === state.settings.color.toLowerCase());
    });
    document.querySelectorAll('.fs-btn').forEach(function (b) {
      b.classList.toggle('active', parseFloat(b.dataset.fs) === state.settings.fs);
    });
  }

  /* ---------------- 简历模板渲染 ---------------- */
  function nameHtml(d) { return esc(d.basic.name) || '你的姓名'; }

  function eduRows(d, centered) {
    return d.education.map(function (it) {
      var dt = range(it.start, it.end);
      if (centered) {
        return '<div class="rz-item rz-edu-item"><b>' + esc(it.school || '学校') + '</b>' +
          (it.major ? ' · ' + esc(it.major) : '') + (it.degree ? ' · ' + esc(it.degree) : '') +
          '<div class="rz-date">' + esc(dt) + (it.desc ? ' · ' + esc(it.desc) : '') + '</div></div>';
      }
      return '<div class="rz-item rz-head-item rz-row"><div class="rz-main"><b>' + esc(it.school || '学校') + '</b>' +
        (it.major ? ' · ' + esc(it.major) : '') + (it.degree ? ' · ' + esc(it.degree) : '') +
        (it.desc ? '<div class="rz-sub">' + esc(it.desc) + '</div>' : '') +
        '</div><div class="rz-date">' + esc(dt) + '</div></div>';
    }).join('');
  }
  function workRows(d) {
    return d.work.map(function (it) {
      return '<div class="rz-item rz-head-item">' +
        '<div class="rz-row"><div class="rz-main"><b>' + esc(it.company || '公司名称') + '</b>' +
        (it.title ? ' · ' + esc(it.title) : '') + '</div>' +
        '<div class="rz-date">' + esc(range(it.start, it.end)) + '</div></div>' +
        bulletsHtml(it.desc) + '</div>';
    }).join('');
  }
  function projRows(d) {
    return d.projects.map(function (it) {
      return '<div class="rz-item rz-head-item">' +
        '<div class="rz-row"><div class="rz-main"><b>' + esc(it.name || '项目名称') + '</b>' +
        (it.role ? ' · ' + esc(it.role) : '') + '</div>' +
        '<div class="rz-date">' + esc(range(it.start, it.end)) + '</div></div>' +
        bulletsHtml(it.desc) + '</div>';
    }).join('');
  }
  function honorRows(d, centered) {
    return d.honors.map(function (it) {
      var line = '<b>' + esc(it.title) + '</b>' + (it.date ? ' · ' + esc(it.date) : '');
      if (centered) return '<div class="rz-item rz-honor-line">' + line + '</div>';
      return '<div class="rz-item rz-honor-line">🏆 ' + line + '</div>';
    }).join('');
  }

  function sec(title, inner) {
    return '<div class="rz-sec"><div class="rz-sec-title">' + title + '</div>' + inner + '</div>';
  }

  function tplClassic(d) {
    var c = contactsOf(d).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var html = '<div class="rz-header"><div class="rz-name">' + nameHtml(d) + '</div>' +
      (d.basic.intent ? '<div class="rz-intent">求职意向：' + esc(d.basic.intent) + '</div>' : '') +
      '<div class="rz-contact">' + c + '</div></div><div class="rz-body">';
    if (d.basic.summary) html += sec('个人简介', '<p class="rz-summary">' + esc(d.basic.summary) + '</p>');
    if (d.education.length) html += sec('教育经历', eduRows(d));
    if (d.work.length) html += sec('工作经历', workRows(d));
    if (d.projects.length) html += sec('项目经历', projRows(d));
    if (d.skills.length) html += sec('专业技能', '<div class="rz-skill-tags">' +
      d.skills.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>');
    if (d.honors.length) html += sec('荣誉证书', honorRows(d));
    return html + '</div>';
  }

  function tplMinimal(d) {
    var c = contactsOf(d).join(' · ');
    var html = '<div class="rz-name">' + nameHtml(d) + '</div>' +
      (d.basic.intent ? '<div class="rz-intent">' + esc(d.basic.intent) + '</div>' : '') +
      (c ? '<div class="rz-contact">' + esc(c) + '</div>' : '') +
      '<div class="rz-rule"></div>';
    if (d.basic.summary) html += sec('个人简介', '<p class="rz-summary">' + esc(d.basic.summary) + '</p>');
    if (d.education.length) html += sec('教育经历', eduRows(d, true));
    if (d.work.length) html += sec('工作经历', workRows(d));
    if (d.projects.length) html += sec('项目经历', projRows(d));
    if (d.skills.length) html += sec('专业技能', '<div class="rz-skill-line">' +
      d.skills.map(esc).join(' · ') + '</div>');
    if (d.honors.length) html += sec('荣誉证书', honorRows(d, true));
    return html;
  }

  function tplModern(d) {
    var c = contactsOf(d).map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('');
    var side = '<div class="rz-side"><div class="rz-name">' + nameHtml(d) + '</div>' +
      (d.basic.intent ? '<div class="rz-intent">' + esc(d.basic.intent) + '</div>' : '');
    if (c) side += '<div class="rz-sec"><div class="rz-sec-title">联系方式</div><div class="rz-contact">' + c + '</div></div>';
    if (d.skills.length) side += '<div class="rz-sec"><div class="rz-sec-title">专业技能</div><div class="rz-skill-tags">' +
      d.skills.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div></div>';
    if (d.education.length) side += '<div class="rz-sec"><div class="rz-sec-title">教育经历</div>' +
      d.education.map(function (it) {
        return '<div class="rz-edu-item rz-item"><b>' + esc(it.school || '学校') + '</b>' +
          (it.major ? esc(it.major) + (it.degree ? ' · ' + esc(it.degree) : '') : '') +
          '<div class="rz-date">' + esc(range(it.start, it.end)) + '</div>' +
          (it.desc ? '<div style="font-size:.9em;opacity:.85;margin-top:2px;">' + esc(it.desc) + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
    side += '</div>';

    var main = '<div class="rz-main-col">';
    if (d.basic.summary) main += sec('个人简介', '<p class="rz-summary">' + esc(d.basic.summary) + '</p>');
    if (d.work.length) main += sec('工作经历', workRows(d));
    if (d.projects.length) main += sec('项目经历', projRows(d));
    if (d.honors.length) main += sec('荣誉证书', honorRows(d));
    main += '</div>';
    return side + main;
  }

  var renderTimer = null;
  function renderPreview() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      var root = $('#resumeRoot');
      var t = state.settings.template;
      root.className = 'resume tpl-' + t;
      root.style.setProperty('--accent', state.settings.color);
      root.style.setProperty('--accent-weak', tint(state.settings.color));
      root.style.setProperty('--fs', state.settings.fs + 'px');
      root.innerHTML = t === 'minimal' ? tplMinimal(state) : t === 'modern' ? tplModern(state) : tplClassic(state);
      fitPreview();
    }, 60);
  }

  function fitPreview() {
    var pane = $('#previewPane');
    var scaleEl = $('#rzScale');
    if (!pane || !scaleEl) return;
    var s = Math.min((pane.clientWidth - 28) / 794, 1);
    scaleEl.style.transform = 'scale(' + s + ')';
    scaleEl.style.marginBottom = ((s - 1) * scaleEl.offsetHeight) + 'px';
  }

  function renderAll() {
    renderBasicInputs();
    renderLists();
    syncToolbar();
    renderPreview();
    save();
  }

  /* ---------------- 事件 ---------------- */
  document.querySelector('.form-pane').addEventListener('input', function (e) {
    var el = e.target;
    if (el.id === 'skillsInput') {
      state.skills = el.value.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
      save(); renderPreview(); return;
    }
    var bind = el.getAttribute && el.getAttribute('data-bind');
    if (!bind) return;
    setPath(bind, el.value);
    save(); renderPreview();
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'add') {
      var list = btn.getAttribute('data-list');
      var empty = { education: { school: '', major: '', degree: '', start: '', end: '', desc: '' },
        work: { company: '', title: '', start: '', end: '', desc: '' },
        projects: { name: '', role: '', start: '', end: '', desc: '' },
        honors: { title: '', date: '' } }[list];
      state[list].push(empty);
      renderLists(); save(); renderPreview();
      var paneId = { education: 'listEdu', work: 'listWork', projects: 'listProj', honors: 'listHonor' }[list];
      var cards = document.querySelectorAll('#' + paneId + ' .item-card');
      if (cards.length) cards[cards.length - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      var first = cards[cards.length - 1] && cards[cards.length - 1].querySelector('input');
      if (first) first.focus();
    } else if (action === 'del') {
      var l = btn.getAttribute('data-list');
      var idx = parseInt(btn.getAttribute('data-index'), 10);
      state[l].splice(idx, 1);
      renderLists(); save(); renderPreview();
    } else if (btn.classList.contains('tpl-btn')) {
      state.settings.template = btn.getAttribute('data-tpl');
      syncToolbar(); save(); renderPreview();
    } else if (btn.classList.contains('swatch')) {
      state.settings.color = btn.getAttribute('data-color');
      syncToolbar(); save(); renderPreview();
    } else if (btn.classList.contains('fs-btn')) {
      state.settings.fs = parseFloat(btn.getAttribute('data-fs'));
      syncToolbar(); save(); renderPreview();
    }
  });
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  $('#btnSample').addEventListener('click', function () {
    state = deepCopy(sampleData);
    renderAll();
  });
  $('#btnClear').addEventListener('click', function () {
    if (this.dataset.armed) {
      state = blank();
      this.dataset.armed = '';
      this.textContent = '清空';
      renderAll();
    } else {
      this.dataset.armed = '1';
      this.textContent = '再点一次确认清空';
      var b = this;
      setTimeout(function () { b.dataset.armed = ''; b.textContent = '清空'; }, 2500);
    }
  });
  $('#btnPrint').addEventListener('click', function () { window.print(); });
  $('#btnExport').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '简历工坊备份.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#btnImport').addEventListener('click', function () { $('#fileInput').click(); });
  $('#fileInput').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    var self = this;
    reader.onload = function () {
      try {
        state = normalize(JSON.parse(reader.result));
        renderAll();
      } catch (err) { alert('导入失败：不是有效的备份文件'); }
      self.value = '';
    };
    reader.readAsText(file);
  });

  window.addEventListener('resize', fitPreview);

  renderAll();
})();
