(function () {
  var Auth = window.FlowedAuth;
  var user = Auth.currentUser();
  if (!user) { location.replace('signin.html'); return; }

  var SVGNS = 'http://www.w3.org/2000/svg';
  var isCoach = user.role === 'coach';
  var demo = !!user.demo;

  /* ---------- tiny DOM helpers (all text goes through textContent) ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function add(parent) { for (var i = 1; i < arguments.length; i++) parent.appendChild(arguments[i]); return parent; }
  function initials(name) { return name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }

  function panel(id, label, title, cls) {
    var p = el('section', 'dpanel paper ' + (cls || '')); p.id = id;
    var h = el('div', 'phead');
    add(h, el('span', 'dlabel', label));
    if (title) add(h, el('h2', null, title));
    p.appendChild(h);
    var body = el('div', 'pbody'); p.appendChild(body);
    p.body = body; return p;
  }
  function tile(value, label, tone) {
    var t = el('div', 'dtile ' + (tone || ''));
    add(t, el('strong', null, value), el('span', null, label));
    return t;
  }
  function empty(text) { return el('p', 'empty', text); }
  function meter(pct) {
    var m = el('span', 'meter'); var i = el('span'); i.style.width = (pct == null ? 0 : pct) + '%'; m.appendChild(i); return m;
  }
  function skills(list) {
    var box = el('div', 'skills');
    list.forEach(function (s) {
      var row = el('div', 'skill');
      add(row, el('b', null, s[0]), meter(s[1]), el('em', null, s[1] == null ? '—' : String(s[1])));
      box.appendChild(row);
    });
    return box;
  }
  function trend(values, w, h, stroke) {
    var s = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, 'class': 'spark', 'aria-hidden': 'true' });
    if (!values || values.length < 2) return s;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = Math.max(1, max - min);
    var pts = values.map(function (v, i) { return (2 + i * (w - 4) / (values.length - 1)).toFixed(1) + ',' + (h - 3 - (v - min) / span * (h - 6)).toFixed(1); }).join(' ');
    s.appendChild(svg('polyline', { points: pts, fill: 'none', stroke: stroke || '#8A6B0C', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return s;
  }
  function lineChart(values) {
    var W = 300, H = 120;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Scores over recent rounds', 'class': 'chart' });
    [20, 50, 80, 110].forEach(function (y) { s.appendChild(svg('path', { d: 'M0 ' + y + 'H' + W, stroke: '#ECE8DC', 'stroke-width': '1' })); });
    var n = values.length;
    var pts = values.map(function (v, i) { return [10 + i * (W - 20) / (n - 1), 108 - (Math.max(40, Math.min(100, v)) - 40) / 60 * 96]; });
    var line = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    s.appendChild(svg('polygon', { points: '10,110 ' + line + ' ' + (W - 10) + ',110', fill: 'rgba(201,162,39,.16)' }));
    s.appendChild(svg('polyline', { points: line, fill: 'none', stroke: '#8A6B0C', 'stroke-width': '2.6', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    var last = pts[n - 1];
    s.appendChild(svg('circle', { cx: last[0], cy: last[1], r: '5', fill: '#8A6B0C' }));
    return s;
  }
  function pill(text, tone) { return el('span', 'pill ' + tone, text); }

  /* ---------- sample + empty data ---------- */
  var SAMPLE_STUDENT = {
    rounds: '18', avg: '74', streak: '5', best: '86',
    scores: [62, 66, 65, 70, 72, 74, 79, 82],
    skills: [['Clash', 78], ['Evidence', 64], ['Structure', 82], ['Delivery', 71]],
    ballots: [
      ['This house would require every voter to pass a civics exam', 'Parliamentary', 82, 'Oct 14'],
      ['This house believes social media does more harm than good', 'Public Forum', 79, 'Oct 12'],
      ['This house would ban private jets', 'Lincoln Douglas', 74, 'Oct 9'],
      ['This house regrets the rise of remote work', 'Parliamentary', 72, 'Oct 6']
    ],
    assignments: [
      ['Evidence drills: citing sources', 'Due Friday', 'Assigned'],
      ['Rebuttal speed: 3 timed rounds', 'Due next Tuesday', 'In progress'],
      ['Read the brief: civics exam motion', 'Completed Oct 10', 'Done']
    ],
    briefs: [['Civics exam motion', 'Pro & Con brief'], ['Social media and harm', 'Brief + 9 evidence cards'], ['Private jets ban', 'Brief']]
  };
  var EMPTY_STUDENT = { rounds: '0', avg: '—', streak: '0', best: '—', scores: [], skills: [['Clash', null], ['Evidence', null], ['Structure', null], ['Delivery', null]], ballots: [], assignments: [], briefs: [] };

  var SAMPLE_COACH = {
    students: '6', avg: '72', week: '64', flagged: '1',
    roster: [
      ['Maya Chen', 22, 81, [60, 66, 68, 74, 78, 81], 'Rebuttal speed', ''],
      ['Sofia Reyes', 20, 77, [62, 64, 70, 71, 75, 77], 'Delivery', ''],
      ['Jonas Park', 17, 74, [66, 70, 68, 72, 73, 74], 'Evidence', ''],
      ['Ethan Brooks', 15, 71, [68, 70, 69, 72, 70, 71], 'Structure', ''],
      ['Priya Nair', 19, 69, [70, 68, 70, 69, 70, 69], 'Structure', ''],
      ['Leo Martin', 6, 58, [68, 66, 64, 61, 60, 58], 'Check in', 'flag']
    ],
    skills: [['Clash', 74], ['Evidence', 61], ['Structure', 77], ['Delivery', 70]],
    attention: [
      ['Leo Martin', 'No practice in 9 days and his average is down 10 points.', 'Check in'],
      ['Priya Nair', 'Evidence scores sit below the team average.', 'Assign drills']
    ],
    activity: [
      ['Maya finished a Public Forum round', '82', 'Today'],
      ['Sofia viewed her ballot', '', 'Today'],
      ['Priya completed Evidence drills', '', 'Yesterday'],
      ['Jonas ran a Lincoln Douglas round', '74', 'Yesterday'],
      ['Leo has not practiced in 9 days', '', 'Flagged']
    ]
  };

  var linked = Auth.users().filter(function (u) { return u.role === 'student' && isCoach && u.coachCode === user.code; });

  /* ---------- sidebar ---------- */
  document.getElementById('dash').dataset.role = user.role;
  document.getElementById('avatar').textContent = initials(user.name);
  document.getElementById('uName').textContent = user.name;
  document.getElementById('uRole').textContent = (isCoach ? 'Coach' : 'Student') + (demo ? ' · Preview' : '');
  var myCoach = !isCoach && user.coachCode && !demo ? Auth.users().filter(function (u) { return u.role === 'coach' && u.code === user.coachCode; })[0] : null;
  document.getElementById('sideNote').textContent = isCoach ? user.team : (demo ? user.team : (myCoach ? 'Team: ' + myCoach.team : 'Not on a team yet'));
  document.getElementById('preview').hidden = !demo;
  if (demo) document.getElementById('previewCta').href = 'signin.html?role=' + user.role + '&mode=signup';

  var nav = document.getElementById('dnav');
  (isCoach
    ? [['Overview', 'top'], ['Roster', 'sec-roster'], ['Team skills', 'sec-skills'], ['Activity', 'sec-activity'], ['Assign work', 'sec-assign']]
    : [['Overview', 'top'], ['Progress', 'sec-progress'], ['Ballots', 'sec-ballots'], ['Assignments', 'sec-assign'], ['Briefs', 'sec-briefs']]
  ).forEach(function (l, i) {
    var a = el('a', null, l[0]); a.href = '#' + l[1];
    if (i === 0) a.setAttribute('aria-current', 'true');
    nav.appendChild(a);
  });

  /* ---------- header + tiles ---------- */
  var body = document.getElementById('body');
  var head = el('header', 'dhead'); head.id = 'top';
  var ht = el('div');
  add(ht, el('div', 'kicker', isCoach ? 'Coach dashboard' : 'Student dashboard'),
    el('h1', null, isCoach ? 'Welcome, Coach ' + user.name.split(/\s+/).slice(-1)[0] + '.' : 'Welcome, ' + user.name.split(/\s+/)[0] + '.'),
    el('p', 'lede', isCoach ? user.team + ' · your whole team at a glance.' : 'Your practice at a glance. Run a round to keep your streak going.'));
  var actions = el('div', 'dactions');
  var primary = el('a', 'btn solid', isCoach ? 'Assign work' : 'Start a round'); primary.href = isCoach ? '#sec-assign' : 'index.html#home';
  actions.appendChild(primary);
  if (isCoach) {
    var inv = el('div', 'invitechip');
    add(inv, el('span', null, 'Invite code'), el('code', null, user.code));
    actions.appendChild(inv);
  } else {
    var st = el('div', 'streakchip'); add(st, el('b', null, demo ? '5' : '0'), el('span', null, 'day streak'));
    actions.appendChild(st);
  }
  add(head, ht, actions);
  body.appendChild(head);

  /* ---------- student ---------- */
  if (!isCoach) {
    var S = demo ? SAMPLE_STUDENT : EMPTY_STUDENT;
    var tiles = el('div', 'dtiles');
    add(tiles, tile(S.rounds, 'Rounds', 't1'), tile(S.avg, 'Average score', 't2'), tile(S.streak, 'Day streak', 't3'), tile(S.best, 'Best round', 't4'));
    body.appendChild(tiles);
    var grid = el('div', 'dgrid'); body.appendChild(grid);

    var pg = panel('sec-progress', 'Progress', 'Score over your last 8 rounds', 'span2');
    if (S.scores.length > 1) pg.body.appendChild(lineChart(S.scores)); else pg.body.appendChild(empty('Run two rounds and your score trend will appear here.'));
    grid.appendChild(pg);

    var sk = panel('sec-skills', 'Skills', 'Where you stand');
    sk.body.appendChild(skills(S.skills));
    if (!demo) sk.body.appendChild(empty('Scores fill in after your first ballot.'));
    grid.appendChild(sk);

    var bl = panel('sec-ballots', 'Recent ballots', 'Judge-style feedback', 'span2');
    if (S.ballots.length) {
      var ul = el('ul', 'rows');
      S.ballots.forEach(function (b) {
        var li = el('li'); var info = el('div');
        add(info, el('strong', null, b[0]), el('span', null, b[1] + ' · ' + b[3]));
        add(li, info, el('em', 'score', String(b[2])));
        ul.appendChild(li);
      });
      bl.body.appendChild(ul);
    } else bl.body.appendChild(empty('Your ballots will be listed here, each with scores and notes.'));
    grid.appendChild(bl);

    var as = panel('sec-assign', 'From your coach', 'Assignments');
    if (S.assignments.length) {
      var ul2 = el('ul', 'rows');
      S.assignments.forEach(function (a) {
        var li = el('li'); var info = el('div');
        add(info, el('strong', null, a[0]), el('span', null, a[1]));
        add(li, info, pill(a[2], a[2] === 'Done' ? 'green' : a[2] === 'In progress' ? 'amber' : 'blue'));
        ul2.appendChild(li);
      });
      as.body.appendChild(ul2);
    } else as.body.appendChild(empty(user.coachCode ? 'No assignments yet.' : 'Join a team with a coach invite code to receive assignments.'));
    grid.appendChild(as);

    var qs = panel('sec-start', 'Quick start', 'Pick your event');
    var chips = el('div', 'chipset');
    ['Public Forum', 'Lincoln Douglas', 'Policy', 'Congress', 'Extemp', 'Original Oratory', 'Duo Interp'].forEach(function (c) { var a = el('a', null, c); a.href = 'index.html#home'; chips.appendChild(a); });
    qs.body.appendChild(chips);
    grid.appendChild(qs);

    var br = panel('sec-briefs', 'Library', 'Briefs & evidence', 'span2');
    if (S.briefs.length) {
      var ul3 = el('ul', 'rows');
      S.briefs.forEach(function (b) {
        var li = el('li'); var info = el('div');
        add(info, el('strong', null, b[0]), el('span', null, b[1]));
        add(li, info, el('span', 'open', 'Open'));
        ul3.appendChild(li);
      });
      br.body.appendChild(ul3);
    } else br.body.appendChild(empty('Briefs and evidence cards you build will be saved here.'));
    grid.appendChild(br);
  }

  /* ---------- coach ---------- */
  if (isCoach) {
    var C = demo ? SAMPLE_COACH : {
      students: String(linked.length), avg: '—', week: '0', flagged: '0',
      roster: linked.map(function (s) { return [s.name, null, null, null, '', '']; }),
      skills: [['Clash', null], ['Evidence', null], ['Structure', null], ['Delivery', null]], attention: [], activity: []
    };
    var tiles2 = el('div', 'dtiles');
    add(tiles2, tile(C.students, 'Students', 't1'), tile(C.avg, 'Team average', 't2'), tile(C.week, 'Rounds this week', 't3'), tile(C.flagged, 'Flagged', 'flagged'));
    body.appendChild(tiles2);
    var grid2 = el('div', 'dgrid'); body.appendChild(grid2);

    var ro = panel('sec-roster', 'Roster', 'Your team', 'span2');
    if (C.roster.length) {
      var table = el('div', 'table');
      var hr = el('div', 'tr th');
      ['Student', 'Rounds', 'Avg', 'Trend', 'Focus'].forEach(function (h) { hr.appendChild(el('span', null, h)); });
      table.appendChild(hr);
      C.roster.forEach(function (r) {
        var tr = el('div', 'tr' + (r[5] ? ' warn' : ''));
        var nm = el('span', 'who'); add(nm, el('i', 'av', initials(r[0])), el('b', null, r[0]));
        var focus = el('span'); if (r[5]) focus.appendChild(pill(r[4], 'navy')); else focus.textContent = r[4] || '—';
        var tw = el('span'); tw.appendChild(trend(r[3], 80, 24, r[5] ? '#14213D' : '#8A6B0C'));
        add(tr, nm, el('span', null, r[1] == null ? '—' : String(r[1])), el('span', null, r[2] == null ? '—' : String(r[2])), tw, focus);
        table.appendChild(tr);
      });
      ro.body.appendChild(table);
    } else ro.body.appendChild(empty('No students yet. Share your invite code ' + user.code + ' and they will appear here once they join on this device.'));
    grid2.appendChild(ro);

    var at = panel('sec-attention', 'Needs attention', 'Step in early');
    if (C.attention.length) {
      var ul4 = el('ul', 'rows');
      C.attention.forEach(function (a) {
        var li = el('li'); var info = el('div');
        add(info, el('strong', null, a[0]), el('span', null, a[1]));
        add(li, info, el('span', 'open', a[2]));
        ul4.appendChild(li);
      });
      at.body.appendChild(ul4);
    } else at.body.appendChild(empty('Students who slip or go quiet will be flagged here.'));
    grid2.appendChild(at);

    var sk2 = panel('sec-skills', 'Team skills', 'Plan your next practice');
    sk2.body.appendChild(skills(C.skills));
    grid2.appendChild(sk2);

    var ac = panel('sec-activity', 'Recent activity', 'What happened');
    if (C.activity.length) {
      var ul5 = el('ul', 'feed');
      C.activity.forEach(function (a) {
        var li = el('li'); li.appendChild(el('span', 'dot'));
        var info = el('div'); add(info, el('strong', null, a[0] + (a[1] ? ' · ' + a[1] : '')), el('span', null, a[2]));
        li.appendChild(info); ul5.appendChild(li);
      });
      ac.body.appendChild(ul5);
    } else ac.body.appendChild(empty('Rounds, ballots and drills your students complete will show up here.'));
    grid2.appendChild(ac);

    var asn = panel('sec-assign', 'Assign work', 'Drills and topics');
    var form = el('form', 'assign');
    form.noValidate = true;
    var sel = el('select'); sel.setAttribute('aria-label', 'Drill');
    ['Evidence drills', 'Rebuttal speed', 'Structure practice', 'Topic: civics exam motion'].forEach(function (o) { sel.appendChild(el('option', null, o)); });
    var who = el('div', 'chipset pick');
    (C.roster.length ? C.roster.slice(0, 4) : []).forEach(function (r) {
      var b = el('button', null, r[0].split(' ')[0]); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
      who.appendChild(b);
    });
    var due = el('input'); due.type = 'text'; due.placeholder = 'Due date, e.g. Friday'; due.setAttribute('aria-label', 'Due date');
    var go = el('button', 'btn solid', 'Assign'); go.type = 'submit';
    var msg = el('p', 'assign-msg'); msg.setAttribute('role', 'status');
    add(form, sel, who, due, go, msg);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = demo ? 'Preview only: assignments will be saved once you create an account.' : 'Assignments will be available once accounts are connected to a server.';
    });
    asn.body.appendChild(form);
    grid2.appendChild(asn);
  }

  document.getElementById('signOut').addEventListener('click', function (e) { e.preventDefault(); Auth.signOut(); location.href = 'signin.html'; });
})();
