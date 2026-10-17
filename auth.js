// Browser-only demo auth for the static site.
// Accounts live in localStorage on this device. Swap these functions for real
// API calls once a backend exists. Never ship this as production security.
(function () {
  var USERS = 'flowed.users';
  var SESSION = 'flowed.session';

  function read(store, key, fallback) {
    try { var v = store.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function users() { return read(localStorage, USERS, []); }
  function saveUsers(list) { return write(localStorage, USERS, list); }

  function randomHex(bytes) {
    var a = new Uint8Array(bytes);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  // SHA-256 where available; a simple fallback hash otherwise (e.g. insecure contexts).
  function hash(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('f' + (h >>> 0).toString(16));
  }

  function inviteCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var a = new Uint8Array(6);
    crypto.getRandomValues(a);
    for (var i = 0; i < 6; i++) out += chars[a[i] % chars.length];
    return out;
  }

  function findByEmail(email) {
    email = email.trim().toLowerCase();
    return users().filter(function (u) { return u.email === email; })[0] || null;
  }

  function startSession(user, remember) {
    var data = { email: user.email, role: user.role, at: Date.now(), picked: false };
    sessionStorage.removeItem(SESSION);
    localStorage.removeItem(SESSION);
    write(remember ? localStorage : sessionStorage, SESSION, data);
  }

  // Preview session: lets someone look around a dashboard without an account.
  function demoUser(role) {
    return {
      role: role, demo: true, email: '',
      name: role === 'coach' ? 'Dana Whitfield' : 'Alex Rivera',
      team: 'Lincoln High Debate', code: 'DEMO42', coachCode: 'DEMO42'
    };
  }
  function startDemo(role) {
    try { localStorage.removeItem(SESSION); } catch (e) {}
    write(sessionStorage, SESSION, { demo: true, role: role, at: Date.now(), picked: false });
  }

  function currentUser() {
    var s = read(sessionStorage, SESSION, null) || read(localStorage, SESSION, null);
    if (!s) return null;
    if (s.demo) { var d = demoUser(s.role === 'coach' ? 'coach' : 'student'); d.events = s.events || null; return d; }
    var u = findByEmail(s.email);
    return u && u.role === s.role ? u : null;
  }

  // Event choice. Each sign-in starts with picked:false so the student confirms
  // their events on the startup screen; the saved list is preselected next time.
  function sessionStore() {
    return read(sessionStorage, SESSION, null) ? sessionStorage : (read(localStorage, SESSION, null) ? localStorage : null);
  }
  function needsEventPick() {
    var st = sessionStore(); var s = st && read(st, SESSION, null);
    return !!s && s.picked !== true && s.role === 'student';
  }
  function saveEvents(events) {
    var st = sessionStore(); if (!st) return false;
    var s = read(st, SESSION, null);
    s.picked = true;
    if (s.demo) s.events = events;
    else {
      var list = users();
      list.forEach(function (u) { if (u.email === s.email) u.events = events; });
      if (!saveUsers(list)) return false;
    }
    return write(st, SESSION, s);
  }

  function signOut() {
    try { sessionStorage.removeItem(SESSION); localStorage.removeItem(SESSION); } catch (e) {}
  }

  function signUp(o) {
    var email = o.email.trim().toLowerCase();
    if (findByEmail(email)) return Promise.reject({ field: 'email', message: 'An account with this email already exists. Try signing in.' });
    var code = (o.code || '').trim().toUpperCase();
    if (o.role === 'student' && code) {
      var coach = users().filter(function (u) { return u.role === 'coach' && u.code === code; })[0];
      if (!coach) return Promise.reject({ field: 'extra', message: 'That invite code was not found on this device.' });
    }
    var salt = randomHex(16);
    return hash(salt + o.password).then(function (h) {
      var user = {
        role: o.role, name: o.name.trim(), email: email, salt: salt, hash: h, created: Date.now(),
        team: o.role === 'coach' ? o.team.trim() : '',
        code: o.role === 'coach' ? inviteCode() : '',
        coachCode: o.role === 'student' ? code : ''
      };
      var list = users(); list.push(user);
      if (!saveUsers(list)) return Promise.reject({ field: 'form', message: 'Your browser blocked saving the account. Check that site storage is enabled.' });
      startSession(user, o.remember);
      return user;
    });
  }

  function signIn(o) {
    var user = findByEmail(o.email);
    if (!user) return Promise.reject({ field: 'form', message: 'No account found for that email. Create one instead.' });
    if (user.role !== o.role) {
      return Promise.reject({ field: 'form', message: 'That email is registered as a ' + user.role + ' account. Switch to the ' + user.role + ' tab.' });
    }
    return hash(user.salt + o.password).then(function (h) {
      if (h !== user.hash) return Promise.reject({ field: 'password', message: 'Incorrect password.' });
      startSession(user, o.remember);
      return user;
    });
  }

  window.FlowedAuth = {
    users: users, currentUser: currentUser, startDemo: startDemo, needsEventPick: needsEventPick, saveEvents: saveEvents, signOut: signOut, signUp: signUp, signIn: signIn, findByEmail: findByEmail
  };
})();
