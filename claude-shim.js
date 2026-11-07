// Replaces the claude.ai runtime (window.claude.use 'db' | 'user' | 'downloads')
// with Firebase Auth (Google sign-in) + Cloud Firestore, so the page runs on any static host (Vercel).
(function () {
  firebase.initializeApp(window.FIREBASE_CONFIG);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  const admins = (window.ADMIN_EMAILS || []).map(e => String(e).trim().toLowerCase());

  const mapErr = e => {
    if (e && e.code === 'permission-denied') e.code = 'not_granted';
    else if (e && e.code === 'invalid-argument') e.code = 'invalid_argument';
    return e;
  };
  const wrapDoc = path => {
    const ref = fs.doc(path);
    return {
      // claude db update creates the doc if missing; Firestore update does not, so fall back to merge
      update: data => ref.update(data).catch(e => {
        if (e && e.code === 'not-found') return ref.set(data, { merge: true });
        throw mapErr(e);
      }),
      set: data => ref.set(data).catch(e => { throw mapErr(e); }),
      delete: () => ref.delete().catch(e => { throw mapErr(e); }),
      get: () => ref.get(),
      onSnapshot: (next, err) => ref.onSnapshot(next, e => err && err(mapErr(e)))
    };
  };
  const wrapCol = path => {
    const ref = fs.collection(path);
    return { onSnapshot: (next, err) => ref.onSnapshot(next, e => err && err(mapErr(e))) };
  };
  const db = { doc: wrapDoc, collection: wrapCol };

  // ---- sign-in overlay ----
  const css = document.createElement('style');
  css.textContent =
    '#authGate{position:fixed;inset:0;z-index:100;background:var(--bg,#EEF1EC);display:grid;place-items:center;padding:16px;font-family:var(--font,sans-serif)}' +
    '#authGate .box{background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:16px;padding:28px 24px;max-width:360px;width:100%;text-align:center;display:grid;gap:14px}' +
    '#authGate h1{margin:0;font-size:1.3rem}#authGate p{margin:0;color:var(--muted,#666);font-size:.92rem}' +
    '#authOut{position:fixed;top:10px;left:10px;z-index:35;background:var(--surface,#fff);border:1px solid var(--line,#ddd);color:var(--muted,#666);border-radius:999px;padding:5px 12px;font-size:.8rem}';
  document.head.appendChild(css);

  function gate(msg) {
    let g = document.getElementById('authGate');
    if (!g) {
      g = document.createElement('div');
      g.id = 'authGate';
      g.dir = 'rtl';
      g.innerHTML = '<div class="box"><h1>أجازات الفريق</h1><p id="authMsg"></p>' +
        '<button class="btn block" id="authBtn" type="button">تسجيل الدخول بحساب جوجل</button></div>';
      document.body.appendChild(g);
      document.getElementById('authBtn').onclick = () => {
        const p = new firebase.auth.GoogleAuthProvider();
        p.setCustomParameters({ prompt: 'select_account' });
        auth.signInWithPopup(p).catch(e => {
          if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) auth.signInWithRedirect(p);
          else document.getElementById('authMsg').textContent = 'ماقدرش يسجل الدخول، جرّب تاني.';
        });
      };
    }
    document.getElementById('authMsg').textContent = msg || 'سجّل الدخول عشان تشوف الأجازات.';
    g.hidden = false;
  }

  const ready = new Promise(resolve => {
    auth.onAuthStateChanged(async u => {
      if (!u) { gate(); return; }
      const g = document.getElementById('authGate'); if (g) g.hidden = true;
      // keep a profile so admins can find and link accounts
      try {
        await fs.doc('users/' + u.uid).set({
          name: u.displayName || '', email: (u.email || '').toLowerCase(), photo: u.photoURL || ''
        }, { merge: true });
      } catch (e) {}
      if (!document.getElementById('authOut')) {
        const b = document.createElement('button');
        b.id = 'authOut'; b.type = 'button'; b.textContent = 'خروج (' + (u.displayName || u.email) + ')';
        b.onclick = () => auth.signOut().then(() => location.reload());
        document.body.appendChild(b);
      }
      resolve(u);
    });
  });

  const userApi = {
    id: async () => (await ready).uid,
    canEdit: async () => admins.includes(((await ready).email || '').toLowerCase()),
    async search(q) {
      const s = await fs.collection('users').get();
      const t = String(q || '').trim().toLowerCase();
      return s.docs.map(d => Object.assign({ id: d.id }, d.data()))
        .filter(x => !t || (x.name || '').toLowerCase().includes(t) || (x.email || '').includes(t));
    },
    async profiles(ids) {
      const out = {};
      await Promise.all(ids.map(async id => {
        try { const s = await fs.doc('users/' + id).get(); if (s.exists) out[id] = s.data(); } catch (e) {}
      }));
      return out;
    }
  };

  const downloads = {
    async save({ filename, data }) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  window.claude = {
    async use(name) {
      await ready;
      if (name === 'db') return db;
      if (name === 'user') return userApi;
      if (name === 'downloads') return downloads;
      return null;
    }
  };
})();
