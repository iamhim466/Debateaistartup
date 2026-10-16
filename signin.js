(function () {
  var Auth = window.FlowedAuth;
  if (Auth.currentUser()) { location.replace('dashboard.html'); return; }

  var root = document.getElementById('auth');
  var form = document.getElementById('authForm');
  var tabs = document.querySelectorAll('.roles [role=tab]');
  var title = document.getElementById('formTitle');
  var sub = document.getElementById('formSub');
  var submit = document.getElementById('submitBtn');
  var switchText = document.getElementById('switchText');
  var switchBtn = document.getElementById('switchMode');
  var formErr = document.getElementById('formErr');
  var f = {
    name: document.getElementById('name'), email: document.getElementById('email'),
    password: document.getElementById('password'), extra: document.getElementById('extra'),
    remember: document.getElementById('remember')
  };

  var COPY = {
    student: {
      h1: 'Practice like it is <em>round one.</em>',
      lede: 'Spar against an AI opponent, read your judge-style ballot, and watch your scores climb.',
      points: ['Live sparring in any speech or debate event', 'Ballots with scores and a practice plan', 'Drills and topics assigned by your coach']
    },
    coach: {
      h1: 'Your whole team, <em>at a glance.</em>',
      lede: 'See how every student is doing, spot who needs a check-in, and assign what to work on next.',
      points: ['A roster with scores, trends and recent rounds', 'Flags for students who go quiet', 'Invite students with one code']
    }
  };

  var role = 'student', mode = 'signin';
  var params = new URLSearchParams(location.search);
  if (params.get('role') === 'coach') role = 'coach';
  if (params.get('mode') === 'signup') mode = 'signup';

  function fieldBox(input) { return input.closest('.field'); }
  function setError(name, message) {
    var box = fieldBox(f[name]);
    if (!box) return;
    box.classList.toggle('invalid', !!message);
    box.querySelector('.err').textContent = message || '';
    f[name].setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  function clearErrors() {
    ['name', 'email', 'password', 'extra'].forEach(function (n) { setError(n, ''); });
    formErr.textContent = '';
  }

  function render() {
    root.dataset.role = role;
    tabs.forEach(function (t) {
      var on = t.dataset.role === role;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    var c = COPY[role];
    document.getElementById('sideH1').innerHTML = c.h1;
    document.getElementById('sideLede').textContent = c.lede;
    var ul = document.getElementById('sidePoints'); ul.innerHTML = '';
    c.points.forEach(function (p) { var li = document.createElement('li'); li.textContent = p; ul.appendChild(li); });

    var up = mode === 'signup';
    title.textContent = up ? (role === 'coach' ? 'Create your coach account' : 'Create your student account') : (role === 'coach' ? 'Coach sign in' : 'Student sign in');
    sub.textContent = up ? 'It takes less than a minute.' : 'Welcome back. Leave the fields empty to preview the dashboard.';
    submit.textContent = up ? 'Create account' : 'Sign in';
    switchText.textContent = up ? 'Already have an account?' : 'New to Flowed?';
    switchBtn.textContent = up ? 'Sign in' : 'Create an account';

    fieldBox(f.name).hidden = !up;
    fieldBox(f.extra).hidden = !up;
    var label = fieldBox(f.extra).querySelector('label');
    if (role === 'coach') { label.textContent = 'School or team name'; f.extra.placeholder = 'Lincoln High Debate'; f.extra.autocomplete = 'organization'; }
    else { label.innerHTML = 'Coach invite code <span class="opt">(optional)</span>'; f.extra.placeholder = 'ABC123'; f.extra.autocomplete = 'off'; }
    f.password.autocomplete = up ? 'new-password' : 'current-password';
    document.getElementById('pwHint').hidden = !up;
    clearErrors();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { role = t.dataset.role; render(); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var n = tabs[(i + 1) % tabs.length]; n.focus(); role = n.dataset.role; render();
      }
    });
  });
  switchBtn.addEventListener('click', function () { mode = mode === 'signin' ? 'signup' : 'signin'; render(); });

  document.getElementById('togglePw').addEventListener('click', function () {
    var show = f.password.type === 'password';
    f.password.type = show ? 'text' : 'password';
    this.textContent = show ? 'Hide' : 'Show';
    this.setAttribute('aria-pressed', show ? 'true' : 'false');
  });

  function validate() {
    clearErrors();
    var ok = true, up = mode === 'signup';
    var email = f.email.value.trim();
    if (up && f.name.value.trim().length < 2) { setError('name', 'Enter your full name.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setError('email', 'Enter a valid email address.'); ok = false; }
    if (!f.password.value) { setError('password', 'Enter your password.'); ok = false; }
    else if (up && (f.password.value.length < 8 || !/\d/.test(f.password.value) || !/[A-Za-z]/.test(f.password.value))) {
      setError('password', 'Use at least 8 characters with a letter and a number.'); ok = false;
    }
    if (up && role === 'coach' && f.extra.value.trim().length < 2) { setError('extra', 'Enter your school or team name.'); ok = false; }
    if (!ok) { var first = form.querySelector('.invalid input'); if (first) first.focus(); }
    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Empty sign-in opens a preview of that role's dashboard.
    if (mode === 'signin' && !f.email.value.trim() && !f.password.value) {
      Auth.startDemo(role);
      location.href = 'dashboard.html';
      return;
    }
    if (!validate()) return;
    submit.disabled = true;
    var base = { role: role, email: f.email.value, password: f.password.value, remember: f.remember.checked };
    var p = mode === 'signup'
      ? Auth.signUp({ role: role, name: f.name.value, email: f.email.value, password: f.password.value, remember: f.remember.checked, team: f.extra.value, code: f.extra.value })
      : Auth.signIn(base);
    p.then(function () { location.href = 'dashboard.html'; }, function (err) {
      submit.disabled = false;
      if (err && err.field && err.field !== 'form') setError(err.field, err.message);
      else formErr.textContent = (err && err.message) || 'Something went wrong. Please try again.';
    });
  });

  render();
})();
