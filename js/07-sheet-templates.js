/* Memento module: sheet templates + calendar component
   Extracted from app.js lines 13943-17310. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   SHEET TEMPLATES
   ============================================ */
const SHEET_TEMPLATES = {
  // ---- Projects -> Milestones (v19 Daily Cockpit). A roomy surface under the
  // Neutron Star: each project laddered to its milestones, with progress,
  // done-toggles, inline add/edit, delete, and "today's focus" linking. Self-
  // contained .proj-* namespace built on --ink/--success tokens so it honors
  // dark/light/mono + the chosen accent. Opened via Sheet.open('projects'). ----
  projects: {
    _addingProject: false,
    _addingMsFor: null,
    HORIZONS: ['This week', 'Month 1', 'Month 3', 'Month 6', 'Month 12'],
    _id(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    _ensureStyles() {
      if (document.getElementById('projStyles')) return;
      const s = document.createElement('style');
      s.id = 'projStyles';
      s.textContent = `
      .proj-screen{max-width:680px;margin:0 auto;color:var(--pj-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
        --pj-hi:rgba(var(--ink),0.95);--pj-t1:rgba(var(--ink),0.86);--pj-t2:rgba(var(--ink),0.55);--pj-t3:rgba(var(--ink),0.34);
        --pj-hair:rgba(var(--ink),0.08);--pj-hair-2:rgba(var(--ink),0.13);--pj-card:rgba(var(--ink),0.022);--pj-card-2:rgba(var(--ink),0.04);}
      .proj-apex{padding:0 0 16px;border-bottom:1px solid var(--pj-hair);}
      .proj-apex__ey{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--success);margin-bottom:8px;}
      .proj-apex__ns{font-size:1.1rem;font-weight:650;line-height:1.38;color:var(--pj-hi);letter-spacing:-0.01em;}
      .proj-intro{font-size:0.84rem;line-height:1.5;color:var(--pj-t2);margin:16px 0 4px;}
      .proj-empty{margin-top:18px;border:1px dashed var(--pj-hair-2);border-radius:calc(8px * var(--rx, 1));padding:26px 22px;text-align:center;}
      .proj-empty__t{font-size:0.94rem;font-weight:600;color:var(--pj-hi);margin-bottom:6px;}
      .proj-empty__s{font-size:0.82rem;color:var(--pj-t2);line-height:1.5;}
      .proj-list{display:flex;flex-direction:column;gap:13px;margin-top:16px;}
      .proj{border:1px solid var(--pj-hair);border-radius:calc(8px * var(--rx, 1));background:var(--pj-card);overflow:hidden;}
      .proj__head{display:flex;align-items:flex-start;gap:12px;padding:14px 13px 13px 14px;}
      .proj__main{flex:1;min-width:0;}
      .proj__title{font-size:0.98rem;font-weight:650;color:var(--pj-hi);line-height:1.3;letter-spacing:-0.01em;}
      .proj__why{font-size:0.8rem;color:var(--pj-t2);margin-top:4px;line-height:1.45;}
      .proj__meta{display:flex;align-items:center;gap:11px;margin-top:11px;}
      .proj__bar{flex:1;height:4px;border-radius:calc(3px * var(--rx, 1));background:var(--kfill-09);overflow:hidden;}
      .proj__bar > i{display:block;height:100%;background:var(--success);border-radius:calc(3px * var(--rx, 1));transition:width .35s cubic-bezier(0.2,0.8,0.2,1);}
      .proj__count{font-size:0.72rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--pj-t2);white-space:nowrap;}
      .proj__del,.ms__del{flex:none;border:none;background:transparent;color:var(--pj-t3);font-size:1.15rem;line-height:1;cursor:pointer;padding:2px 5px;border-radius:calc(5px * var(--rx, 1));opacity:0;transition:opacity .15s ease,color .15s ease,background .15s ease;}
      .proj:hover .proj__del,.ms:hover .ms__del{opacity:1;}
      .proj__del:hover,.ms__del:hover{color:#ff6b6b;background:rgba(255,107,107,0.1);}
      .ms-list{list-style:none;margin:0;padding:0 14px;}
      .ms{display:flex;align-items:flex-start;gap:11px;padding:10px 0;border-top:1px solid var(--pj-hair);}
      .ms__check{flex:none;width:18px;height:18px;margin-top:1px;border-radius:50%;border:1.5px solid rgba(var(--ink),0.28);background:transparent;color:#0b0b0d;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background .15s ease,border-color .15s ease;}
      .ms__check svg{opacity:0;transition:opacity .15s ease;}
      .ms__check:hover{border-color:rgba(var(--ink),0.5);}
      .ms.is-done .ms__check{background:var(--success);border-color:var(--success);}
      .ms.is-done .ms__check svg{opacity:1;}
      .ms__body{flex:1;min-width:0;}
      .ms__title{font-size:0.88rem;color:var(--pj-t1);line-height:1.4;}
      .ms.is-done .ms__title{color:var(--pj-t3);text-decoration:line-through;}
      .ms__hz{flex:none;align-self:center;font-size:0.6rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--pj-t3);border:1px solid var(--pj-hair-2);border-radius:calc(5px * var(--rx, 1));padding:3px 7px;white-space:nowrap;}
      .ms__today{flex:none;align-self:center;border:1px solid var(--pj-hair-2);background:transparent;color:var(--pj-t3);cursor:pointer;border-radius:calc(5px * var(--rx, 1));padding:3px 6px;display:inline-flex;align-items:center;justify-content:center;font-size:0.58rem;font-weight:800;letter-spacing:0.08em;line-height:1;transition:color .15s ease,border-color .15s ease,background .15s ease;}
      .ms__today:hover{color:var(--success);border-color:var(--success);}
      .ms__today.is-on{background:var(--success);border-color:var(--success);color:#0b0b0d;}
      .proj-add-ms{display:inline-block;margin:2px 14px 13px;border:none;background:transparent;color:var(--pj-t2);font:inherit;font-size:0.8rem;font-weight:600;cursor:pointer;padding:5px 0;transition:color .15s ease;}
      .proj-add-ms:hover{color:var(--success);}
      .proj-add-proj{display:block;width:100%;margin-top:14px;border:1px dashed var(--pj-hair-2);background:transparent;color:var(--pj-t2);font:inherit;font-size:0.86rem;font-weight:600;cursor:pointer;padding:13px;border-radius:calc(8px * var(--rx, 1));transition:color .15s ease,border-color .15s ease;}
      .proj-add-proj:hover{color:var(--pj-hi);border-color:rgba(var(--ink),0.24);}
      .proj-comp{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 14px;}
      .proj-comp--new{margin-top:14px;border:1px solid var(--pj-hair-2);border-radius:calc(8px * var(--rx, 1));background:var(--pj-card-2);}
      .proj-inp,.proj-sel{font:inherit;font-size:0.88rem;color:var(--pj-hi);background:var(--kfill-04);border:1px solid var(--pj-hair-2);border-radius:calc(6px * var(--rx, 1));padding:9px 11px;outline:none;transition:border-color .15s ease;}
      .proj-inp{flex:1;min-width:160px;}
      .proj-inp:focus,.proj-sel:focus{border-color:rgba(var(--ink),0.34);}
      .proj-inp::placeholder{color:var(--pj-t3);}
      .proj-sel{cursor:pointer;}
      .proj-comp__btns{display:flex;gap:8px;margin-left:auto;}
      .proj-btn{font:inherit;font-size:0.82rem;font-weight:650;cursor:pointer;border-radius:calc(6px * var(--rx, 1));padding:9px 14px;border:1px solid var(--pj-hair-2);background:transparent;color:var(--pj-t2);transition:all .15s ease;}
      .proj-btn:hover{color:var(--pj-hi);border-color:rgba(var(--ink),0.24);}
      .proj-btn--p{background:var(--success);border-color:var(--success);color:#0b0b0d;}
      .proj-btn--p:hover{filter:brightness(1.08);color:#0b0b0d;}
      `;
      document.head.appendChild(s);
    },
    _horizonSelect(id) {
      return '<select class="proj-sel" id="' + id + '">' + this.HORIZONS.map(hz => '<option value="' + esc(hz) + '">' + esc(hz) + '</option>').join('') + '</select>';
    },
    render() {
      this._ensureStyles();
      const projects = (state.action && Array.isArray(state.action.projects)) ? state.action.projects : [];
      const ns = (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '';
      const pa = (state.action && state.action.primaryAction) || {};
      const CHK = '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M3.5 8.4l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const TGT = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none"/></svg>';
      let h = '<div class="proj-screen">';
      h += '<div class="proj-apex"><div class="proj-apex__ey">Your Neutron Star</div><div class="proj-apex__ns">' + (ns ? esc(ns) : 'Set your Neutron Star in Clarity to anchor your projects.') + '</div></div>';
      h += '<div class="proj-intro">Break the goal into projects, and projects into milestones. Check them off as you go, and pin one as today\'s focus.</div>';
      if (!projects.length) {
        h += '<div class="proj-empty"><div class="proj-empty__t">No projects yet</div><div class="proj-empty__s">A project is a meaningful chunk of your goal, made of milestones. Create your first one below.</div></div>';
      } else {
        h += '<div class="proj-list">';
        projects.forEach(pj => {
          const ms = Array.isArray(pj.milestones) ? pj.milestones : [];
          const done = ms.filter(m => m.done).length;
          const pct = ms.length ? Math.round(done / ms.length * 100) : 0;
          h += '<div class="proj" data-pid="' + esc(pj.id) + '">';
          h += '<div class="proj__head"><div class="proj__main">';
          h += '<div class="proj__title">' + esc(pj.title || 'Untitled project') + '</div>';
          if (pj.why) h += '<div class="proj__why">' + esc(pj.why) + '</div>';
          h += '<div class="proj__meta"><span class="proj__bar"><i style="width:' + pct + '%"></i></span><span class="proj__count">' + done + ' / ' + ms.length + '</span></div>';
          h += '</div><button class="proj__del" data-del-proj="' + esc(pj.id) + '" aria-label="Delete project" title="Delete project">&times;</button></div>';
          h += '<ul class="ms-list">';
          ms.forEach(m => {
            const linked = pa.linkedMilestoneId && pa.linkedMilestoneId === m.id;
            h += '<li class="ms' + (m.done ? ' is-done' : '') + '" data-mid="' + esc(m.id) + '">';
            h += '<button class="ms__check" data-toggle-ms="' + esc(m.id) + '" data-pid="' + esc(pj.id) + '" aria-label="Toggle done" aria-pressed="' + (m.done ? 'true' : 'false') + '">' + CHK + '</button>';
            h += '<div class="ms__body"><div class="ms__title">' + esc(m.title || '') + '</div></div>';
            if (m.horizon) h += '<span class="ms__hz">' + esc(m.horizon) + '</span>';
            h += '<button class="ms__today' + (linked ? ' is-on' : '') + '" data-link-ms="' + esc(m.id) + '" data-pid="' + esc(pj.id) + '" title="' + (linked ? 'Today\'s focus (tap to unpin)' : 'Make this today\'s focus') + '" aria-label="Make today\'s focus" aria-pressed="' + (linked ? 'true' : 'false') + '">' + (linked ? 'TODAY' : TGT) + '</button>';
            h += '<button class="ms__del" data-del-ms="' + esc(m.id) + '" data-pid="' + esc(pj.id) + '" aria-label="Delete milestone" title="Delete milestone">&times;</button>';
            h += '</li>';
          });
          h += '</ul>';
          if (this._addingMsFor === pj.id) {
            h += '<div class="proj-comp"><input class="proj-inp" id="msInp" type="text" placeholder="New milestone..." maxlength="120">' + this._horizonSelect('msHz') + '<div class="proj-comp__btns"><button class="proj-btn proj-btn--p" data-save-ms="' + esc(pj.id) + '">Add</button><button class="proj-btn" data-cancel-ms="1">Cancel</button></div></div>';
          } else {
            h += '<button class="proj-add-ms" data-add-ms="' + esc(pj.id) + '">+ Add milestone</button>';
          }
          h += '</div>';
        });
        h += '</div>';
      }
      if (this._addingProject) {
        h += '<div class="proj-comp proj-comp--new"><input class="proj-inp" id="pjInp" type="text" placeholder="New project name..." maxlength="80"><input class="proj-inp" id="pjWhy" type="text" placeholder="Why it matters (optional)" maxlength="140"><div class="proj-comp__btns"><button class="proj-btn proj-btn--p" data-save-proj="1">Create project</button><button class="proj-btn" data-cancel-proj="1">Cancel</button></div></div>';
      } else {
        h += '<button class="proj-add-proj" data-add-proj="1">+ New project</button>';
      }
      h += '</div>';
      return h;
    },
    bind(body) {
      const self = this;
      // Bind delegated listeners exactly once per body element (the #sheetBody is
      // reused across opens). innerHTML re-renders keep working via delegation, so
      // rerender() must NOT re-add listeners (that would stack and cascade).
      const rerender = (focusId) => {
        body.innerHTML = self.render();
        if (focusId) { const el = body.querySelector('#' + focusId); if (el) { try { el.focus(); } catch (_) {} } }
      };
      if (body._projBound) return;
      body._projBound = true;
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-toggle-ms],[data-link-ms],[data-del-proj],[data-del-ms],[data-add-ms],[data-cancel-ms],[data-save-ms],[data-add-proj],[data-cancel-proj],[data-save-proj]');
        if (!t || !body.querySelector('.proj-screen')) return;
        const projects = (state.action.projects = Array.isArray(state.action.projects) ? state.action.projects : []);
        if (t.hasAttribute('data-toggle-ms')) {
          const pj = projects.find(p => p.id === t.getAttribute('data-pid')); if (!pj) return;
          const m = (pj.milestones || []).find(x => x.id === t.getAttribute('data-toggle-ms')); if (!m) return;
          m.done = !m.done; m.doneAt = m.done ? new Date().toISOString() : null;
          persistNow(); rerender(); return;
        }
        if (t.hasAttribute('data-link-ms')) {
          const mid = t.getAttribute('data-link-ms'), pid = t.getAttribute('data-pid');
          const pa = (state.action.primaryAction = state.action.primaryAction || {});
          if (pa.linkedMilestoneId === mid) { pa.linkedMilestoneId = ''; pa.linkedProjectId = ''; }
          else { pa.linkedMilestoneId = mid; pa.linkedProjectId = pid; }
          persistNow(); rerender(); return;
        }
        if (t.hasAttribute('data-del-proj')) {
          const pid = t.getAttribute('data-del-proj');
          const i = projects.findIndex(p => p.id === pid); if (i >= 0) projects.splice(i, 1);
          const pa = state.action.primaryAction; if (pa && pa.linkedProjectId === pid) { pa.linkedProjectId = ''; pa.linkedMilestoneId = ''; }
          persistNow(); rerender(); return;
        }
        if (t.hasAttribute('data-del-ms')) {
          const mid = t.getAttribute('data-del-ms');
          const pj = projects.find(p => p.id === t.getAttribute('data-pid'));
          if (pj && Array.isArray(pj.milestones)) { const i = pj.milestones.findIndex(x => x.id === mid); if (i >= 0) pj.milestones.splice(i, 1); }
          const pa = state.action.primaryAction; if (pa && pa.linkedMilestoneId === mid) { pa.linkedProjectId = ''; pa.linkedMilestoneId = ''; }
          persistNow(); rerender(); return;
        }
        if (t.hasAttribute('data-add-ms')) { self._addingMsFor = t.getAttribute('data-add-ms'); rerender('msInp'); return; }
        if (t.hasAttribute('data-cancel-ms')) { self._addingMsFor = null; rerender(); return; }
        if (t.hasAttribute('data-save-ms')) {
          const pj = projects.find(p => p.id === t.getAttribute('data-save-ms')); if (!pj) return;
          const inp = body.querySelector('#msInp'), hz = body.querySelector('#msHz');
          const val = inp ? inp.value.trim() : ''; if (!val) { if (inp) inp.focus(); return; }
          if (!Array.isArray(pj.milestones)) pj.milestones = [];
          pj.milestones.push({ id: self._id('ms'), title: val, horizon: hz ? hz.value : '', done: false, doneAt: null });
          self._addingMsFor = null; persistNow(); rerender(); return;
        }
        if (t.hasAttribute('data-add-proj')) { self._addingProject = true; rerender('pjInp'); return; }
        if (t.hasAttribute('data-cancel-proj')) { self._addingProject = false; rerender(); return; }
        if (t.hasAttribute('data-save-proj')) {
          const inp = body.querySelector('#pjInp'), why = body.querySelector('#pjWhy');
          const val = inp ? inp.value.trim() : ''; if (!val) { if (inp) inp.focus(); return; }
          projects.push({ id: self._id('prj'), title: val, why: why ? why.value.trim() : '', goalLinked: true, milestones: [], createdAt: new Date().toISOString() });
          self._addingProject = false; persistNow(); rerender(); return;
        }
      });
      body.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (!body.querySelector('.proj-screen')) return;
        const id = e.target && e.target.id;
        if (id === 'msInp') { e.preventDefault(); const b = body.querySelector('[data-save-ms]'); if (b) b.click(); }
        else if (id === 'pjInp' || id === 'pjWhy') { e.preventDefault(); const b = body.querySelector('[data-save-proj]'); if (b) b.click(); }
      });
    }
  },
  // ---- Universal Capture Inbox (v19 Daily Cockpit). One frictionless place to
  // dump anything on your mind, then triage each item into the right module
  // (Action / Reflection / Memory / Friction / Proof / Project). Offline-safe;
  // routing writes the same record shapes the modules create natively. ----
  inbox: {
    // v25: the Inbox is the quiet Updates center. Grace days, records, the
    // weekly card, and comebacks land here as a calm, day-grouped digest.
    // User captures moved to Notes (the "Captures" folder); quick capture
    // lives on the FAB and the palette, writing straight into that folder.
    _ensureStyles() {
      if (document.getElementById('updStyles')) return;
      const s = document.createElement('style');
      s.id = 'updStyles';
      s.textContent = `
      .upd-screen{max-width:660px;margin:0 auto;
        --upd-hi:rgba(var(--ink),0.95);--upd-t1:rgba(var(--ink),0.86);--upd-t2:rgba(var(--ink),0.55);--upd-t3:rgba(var(--ink),0.34);
        --upd-card:rgba(var(--ink),0.025);}
      .upd-day{margin:20px 2px 9px;font-size:0.64rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--upd-t3);}
      .upd-list{display:flex;flex-direction:column;gap:9px;}
      .upd-item{display:flex;gap:11px;align-items:flex-start;border:1px solid var(--hairline);border-radius:calc(10px * var(--rx, 1));background:var(--upd-card);padding:12px 14px;}
      .upd-item__dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--color-consistency);margin-top:7px;opacity:0;transition:opacity 0.4s ease;}
      .upd-item--unread .upd-item__dot{opacity:1;}
      .upd-item--weekly{border-color:rgba(var(--success-rgb),0.22);background:rgba(var(--success-rgb),0.03);}
      .upd-item__body{flex:1;min-width:0;}
      .upd-item__title{font-size:0.9rem;font-weight:600;color:var(--upd-hi);line-height:1.35;}
      .upd-item__text{display:block;font-size:0.82rem;color:var(--upd-t2);line-height:1.45;margin-top:2px;}
      .upd-item__time{flex:none;font-size:0.7rem;color:var(--upd-t3);margin-top:2px;font-variant-numeric:tabular-nums;}
      .upd-empty{margin-top:24px;border:1px dashed rgba(var(--ink),0.14);border-radius:calc(10px * var(--rx, 1));padding:30px 22px;text-align:center;}
      .upd-empty__t{font-size:1rem;font-weight:650;color:var(--upd-hi);margin-bottom:7px;}
      .upd-empty__s{font-size:0.84rem;color:var(--upd-t2);line-height:1.5;}
      .upd-foot{margin-top:22px;font-size:0.7rem;color:var(--upd-t3);text-align:center;}
      `;
      document.head.appendChild(s);
    },
    _relTime(ts) {
      try {
        const d = Date.now() - ts;
        if (d < 60000) return 'now';
        if (d < 3600000) return Math.floor(d / 60000) + 'm';
        if (d < 86400000) return Math.floor(d / 3600000) + 'h';
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch (e) { return ''; }
    },
    render() {
      this._ensureStyles();
      if (!Array.isArray(state.updates)) state.updates = [];
      // Auto-archive: anything older than 30 days quietly leaves the room.
      const cutoff = Date.now() - 30 * 86400000;
      const before = state.updates.length;
      state.updates = state.updates.filter(u => u && u.ts >= cutoff);
      if (state.updates.length !== before) { try { persistState(); } catch (e) {} }
      const items = state.updates.slice().reverse();
      let h = '<div class="upd-screen">';
      if (!items.length) {
        h += '<div class="upd-empty"><div class="upd-empty__t">Quiet here.</div><div class="upd-empty__s">Grace days, new records, and your weekly card will land in this room. Nothing here ever demands anything of you.</div></div>';
      } else {
        const dayLabel = (ts) => {
          const k = localISO(new Date(ts));
          if (k === getTodayISO()) return 'Today';
          const y = new Date(); y.setDate(y.getDate() - 1);
          if (k === localISO(y)) return 'Yesterday';
          return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        };
        let lastDay = null;
        items.forEach((u) => {
          const dl = dayLabel(u.ts);
          if (dl !== lastDay) {
            if (lastDay !== null) h += '</div>';
            h += '<div class="upd-day">' + esc(dl) + '</div><div class="upd-list">';
            lastDay = dl;
          }
          h += '<div class="upd-item upd-item--' + esc(u.type || 'info') + (u.read ? '' : ' upd-item--unread') + '">' +
            '<span class="upd-item__dot" aria-hidden="true"></span>' +
            '<span class="upd-item__body"><span class="upd-item__title">' + esc(u.title) + '</span>' +
            (u.text ? '<span class="upd-item__text">' + esc(u.text) + '</span>' : '') + '</span>' +
            '<span class="upd-item__time">' + esc(this._relTime(u.ts)) + '</span>' +
          '</div>';
        });
        if (lastDay !== null) h += '</div>';
        h += '<div class="upd-foot">Updates keep for 30 days, then leave on their own.</div>';
      }
      h += '</div>';
      return h;
    },
    bind() { /* read-only digest: nothing to wire */ },
    afterOpen(body) {
      // Seeing the room is reading it: hold the unread dots for a beat so the
      // user catches which ones were new, then quietly mark everything read.
      try {
        const had = (state.updates || []).some(u => u && !u.read);
        if (!had) return;
        setTimeout(() => {
          try {
            (state.updates || []).forEach(u => { if (u) u.read = true; });
            persistState();
            body.querySelectorAll('.upd-item--unread').forEach(el => el.classList.remove('upd-item--unread'));
            try { if (typeof updateCaptureFab === 'function') updateCaptureFab(); } catch (e) {}
            try { if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh(); } catch (e) {}
          } catch (e) {}
        }, 1600);
      } catch (e) {}
    }
  },

  // reorder modules, show/hide them, toggle 2 sizes, and save named presets. The
  // top command center stays locked (it lives outside the grid). Changes apply
  // live and persist; "Reset to default" restores the hand-tuned layout. ----
  layout: {
    _saving: false,
    DEFAULT_ORDER: [
      { key: 'clarity', size: 'full' }, { key: 'action', size: 'full' }, { key: 'streak', size: 'half' },
      { key: 'mori', size: 'half' }, { key: 'vivere', size: 'half' }, { key: 'lifestats', size: 'half' },
      { key: 'reflection', size: 'full' }, { key: 'deepwork', size: 'half' }, { key: 'distraction', size: 'half' }
    ],
    _clone(x) { return JSON.parse(JSON.stringify(x)); },
    _apply() { try { persistNow(); } catch (_) {} try { renderGrid(); } catch (_) {} try { renderAll(); } catch (_) {} },
    _ensureStyles() {
      if (document.getElementById('layStyles')) return;
      const s = document.createElement('style');
      s.id = 'layStyles';
      s.textContent = `
      .lay-screen{max-width:600px;margin:0 auto;color:var(--lay-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
        --lay-hi:rgba(var(--ink),0.95);--lay-t1:rgba(var(--ink),0.86);--lay-t2:rgba(var(--ink),0.55);--lay-t3:rgba(var(--ink),0.34);
        --lay-hair:rgba(var(--ink),0.09);--lay-hair-2:rgba(var(--ink),0.14);--lay-card:rgba(var(--ink),0.025);}
      .lay-intro{font-size:0.84rem;line-height:1.5;color:var(--lay-t2);margin-bottom:16px;}
      .lay-list{display:flex;flex-direction:column;gap:8px;}
      .lay-row{display:flex;align-items:center;gap:10px;border:1px solid var(--lay-hair);border-radius:calc(8px * var(--rx, 1));background:var(--lay-card);padding:10px 11px;}
      .lay-row.is-hidden{opacity:0.46;}
      .lay-row__dot{width:8px;height:8px;border-radius:2px;flex:none;box-shadow:0 0 0 1px rgba(var(--ink),0.18);}
      .lay-row__name{flex:1;min-width:0;font-size:0.92rem;font-weight:600;color:var(--lay-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .lay-move{display:inline-flex;gap:3px;}
      .lay-btn{border:1px solid var(--lay-hair-2);background:transparent;color:var(--lay-t2);cursor:pointer;border-radius:calc(6px * var(--rx, 1));width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:color .15s ease,border-color .15s ease,background .15s ease;}
      .lay-btn svg{width:14px;height:14px;}
      .lay-btn:disabled{opacity:0.28;cursor:default;}
      .lay-btn:not(:disabled):hover{color:var(--lay-hi);border-color:rgba(var(--ink),0.3);}
      .lay-size{font:inherit;font-size:0.66rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;border:1px solid var(--lay-hair-2);background:transparent;color:var(--lay-t2);border-radius:calc(6px * var(--rx, 1));padding:0 9px;height:30px;cursor:pointer;min-width:78px;transition:color .15s ease,border-color .15s ease;}
      .lay-size:hover{color:var(--lay-hi);border-color:rgba(var(--ink),0.3);}
      .lay-size--locked{display:inline-flex;align-items:center;justify-content:center;opacity:0.42;cursor:default;}
      .lay-eye{border:1px solid var(--lay-hair-2);background:transparent;color:var(--lay-t2);cursor:pointer;border-radius:calc(6px * var(--rx, 1));width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:color .15s ease,border-color .15s ease;}
      .lay-eye svg{width:15px;height:15px;}
      .lay-eye:hover{color:var(--lay-hi);border-color:rgba(var(--ink),0.3);}
      .lay-eye.is-off{color:var(--lay-t3);}
      .lay-sec{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--lay-t3);margin:24px 0 12px;}
      .lay-presets{border-top:1px solid var(--lay-hair);padding-top:4px;}
      .lay-preset{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--lay-hair);}
      .lay-preset__name{flex:1;min-width:0;font-size:0.9rem;color:var(--lay-t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .lay-link{font:inherit;font-size:0.8rem;font-weight:650;border:none;background:transparent;color:var(--success);cursor:pointer;padding:4px 2px;}
      .lay-link--del{color:var(--lay-t3);}
      .lay-link--del:hover{color:#ff6b6b;}
      .lay-empty{font-size:0.82rem;color:var(--lay-t3);padding:4px 0 6px;}
      .lay-comp{display:flex;gap:8px;margin-top:12px;}
      .lay-input{flex:1;font:inherit;font-size:0.88rem;color:var(--lay-hi);background:var(--kfill-04);border:1px solid var(--lay-hair-2);border-radius:calc(7px * var(--rx, 1));padding:10px 12px;outline:none;}
      .lay-input:focus{border-color:rgba(var(--ink),0.32);}
      .lay-input::placeholder{color:var(--lay-t3);}
      .lay-foot{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px;}
      .lay-cta{font:inherit;font-size:0.84rem;font-weight:650;cursor:pointer;border-radius:calc(7px * var(--rx, 1));padding:11px 16px;border:1px solid var(--lay-hair-2);background:transparent;color:var(--lay-t1);transition:color .15s ease,border-color .15s ease;}
      .lay-cta:hover{color:var(--lay-hi);border-color:rgba(var(--ink),0.3);}
      .lay-cta--p{background:var(--success);border-color:var(--success);color:#0b0b0d;}
      .lay-cta--p:hover{filter:brightness(1.08);color:#0b0b0d;}
      `;
      document.head.appendChild(s);
    },
    render() {
      this._ensureStyles();
      const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
      const EYEOFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      const UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
      const DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
      const order = Array.isArray(state.widgetOrder) ? state.widgetOrder : [];
      const hidden = Array.isArray(state.hiddenWidgets) ? state.hiddenWidgets : [];
      let h = '<div class="lay-screen">';
      h += '<div class="lay-intro">Arrange your dashboard your way. Reorder modules, hide what you do not need, and resize between regular and large. Your command center up top stays put.</div>';
      h += '<div class="lay-list">';
      order.forEach((w, i) => {
        const def = WIDGET_DEFS[w.key]; if (!def) return;
        const isHidden = hidden.indexOf(w.key) !== -1;
        // Clarity / Action / Reflection are designed full-width (their content
        // would overflow a half column on desktop), so their size is locked Large.
        const fullLock = (w.key === 'clarity' || w.key === 'action' || w.key === 'reflection');
        const sizeLabel = (w.size === 'full') ? 'Large' : 'Regular';
        // --color-action is pure white (invisible on the light-mode card); use the
        // theme-aware text token for that dot so it reads in every theme.
        const dotColor = (def.color === 'action') ? 'var(--text-hi)' : ('var(--color-' + esc(def.color) + ')');
        h += '<div class="lay-row' + (isHidden ? ' is-hidden' : '') + '" data-key="' + esc(w.key) + '">';
        h += '<span class="lay-row__dot" style="background:' + dotColor + ';"></span>';
        h += '<span class="lay-row__name">' + esc(def.label) + '</span>';
        h += '<span class="lay-move"><button class="lay-btn" data-move-up="' + esc(w.key) + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">' + UP + '</button>';
        h += '<button class="lay-btn" data-move-down="' + esc(w.key) + '"' + (i === order.length - 1 ? ' disabled' : '') + ' aria-label="Move down">' + DOWN + '</button></span>';
        if (fullLock) h += '<span class="lay-size lay-size--locked" aria-label="Size: large (fixed)">Large</span>';
        else h += '<button class="lay-size" data-size="' + esc(w.key) + '" aria-label="Size: ' + sizeLabel + ', tap to toggle">' + sizeLabel + '</button>';
        h += '<button class="lay-eye' + (isHidden ? ' is-off' : '') + '" data-hide="' + esc(w.key) + '" aria-label="' + (isHidden ? 'Show module' : 'Hide module') + '" aria-pressed="' + (isHidden ? 'true' : 'false') + '">' + (isHidden ? EYEOFF : EYE) + '</button>';
        h += '</div>';
      });
      h += '</div>';
      // Presets
      h += '<div class="lay-sec">Saved layouts</div><div class="lay-presets">';
      const presets = Array.isArray(state.layoutPresets) ? state.layoutPresets : [];
      if (!presets.length) {
        h += '<div class="lay-empty">No saved layouts yet. Arrange things how you like, then save this layout.</div>';
      } else {
        presets.forEach((p, idx) => {
          h += '<div class="lay-preset"><span class="lay-preset__name">' + esc(p.name || ('Layout ' + (idx + 1))) + '</span>';
          h += '<button class="lay-link" data-apply-preset="' + idx + '">Apply</button>';
          h += '<button class="lay-link lay-link--del" data-del-preset="' + idx + '" aria-label="Delete layout">Delete</button></div>';
        });
      }
      if (this._saving) {
        h += '<div class="lay-comp"><input class="lay-input" id="layName" type="text" placeholder="Name this layout..." maxlength="40"><button class="lay-cta lay-cta--p" data-save-preset="1">Save</button><button class="lay-cta" data-cancel-save="1">Cancel</button></div>';
      }
      h += '</div>';
      // Footer actions
      h += '<div class="lay-foot">';
      if (!this._saving) h += '<button class="lay-cta lay-cta--p" data-start-save="1">Save this layout</button>';
      h += '<button class="lay-cta" data-reset="1">Reset to default</button>';
      h += '</div>';
      h += '</div>';
      return h;
    },
    afterOpen() { this._saving = false; },
    bind(body) {
      const self = this;
      const rerender = (focusId) => {
        body.innerHTML = self.render();
        if (focusId) { const el = body.querySelector('#' + focusId); if (el) { try { el.focus(); } catch (_) {} } }
      };
      if (body._layBound) return;
      body._layBound = true;
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-move-up],[data-move-down],[data-size],[data-hide],[data-apply-preset],[data-del-preset],[data-start-save],[data-cancel-save],[data-save-preset],[data-reset]');
        if (!t || !body.querySelector('.lay-screen')) return;
        if (!Array.isArray(state.widgetOrder)) return;
        const ord = state.widgetOrder;
        const ui = (state.ui = state.ui || {});
        const moveOne = (key, dir) => {
          const i = ord.findIndex(w => w.key === key); if (i < 0) return;
          const j = i + dir; if (j < 0 || j >= ord.length) return;
          const tmp = ord[i]; ord[i] = ord[j]; ord[j] = tmp; ui.layoutCustomized = true;
        };
        if (t.hasAttribute('data-move-up')) { moveOne(t.getAttribute('data-move-up'), -1); self._apply(); rerender(); return; }
        if (t.hasAttribute('data-move-down')) { moveOne(t.getAttribute('data-move-down'), 1); self._apply(); rerender(); return; }
        if (t.hasAttribute('data-size')) {
          const _k = t.getAttribute('data-size');
          if (_k === 'clarity' || _k === 'action' || _k === 'reflection') return; // size-locked
          const w = ord.find(x => x.key === _k); if (w) { w.size = (w.size === 'full') ? 'half' : 'full'; ui.layoutCustomized = true; }
          self._apply(); rerender(); return;
        }
        if (t.hasAttribute('data-hide')) {
          const key = t.getAttribute('data-hide');
          if (!Array.isArray(state.hiddenWidgets)) state.hiddenWidgets = [];
          const hi = state.hiddenWidgets.indexOf(key);
          if (hi >= 0) state.hiddenWidgets.splice(hi, 1); else state.hiddenWidgets.push(key);
          ui.layoutCustomized = true; self._apply(); rerender(); return;
        }
        if (t.hasAttribute('data-apply-preset')) {
          const p = (state.layoutPresets || [])[parseInt(t.getAttribute('data-apply-preset'), 10)]; if (!p) return;
          state.widgetOrder = self._clone(p.order || self.DEFAULT_ORDER);
          state.hiddenWidgets = self._clone(p.hidden || []);
          ui.layoutCustomized = true; self._apply(); rerender(); return;
        }
        if (t.hasAttribute('data-del-preset')) {
          const idx = parseInt(t.getAttribute('data-del-preset'), 10);
          if (Array.isArray(state.layoutPresets) && idx >= 0) state.layoutPresets.splice(idx, 1);
          try { persistNow(); } catch (_) {} rerender(); return;
        }
        if (t.hasAttribute('data-start-save')) { self._saving = true; rerender('layName'); return; }
        if (t.hasAttribute('data-cancel-save')) { self._saving = false; rerender(); return; }
        if (t.hasAttribute('data-save-preset')) {
          const inp = body.querySelector('#layName');
          let name = inp ? inp.value.trim() : '';
          if (!Array.isArray(state.layoutPresets)) state.layoutPresets = [];
          if (!name) name = 'Layout ' + (state.layoutPresets.length + 1);
          state.layoutPresets.push({ name: name.slice(0, 40), order: self._clone(state.widgetOrder), hidden: self._clone(state.hiddenWidgets || []) });
          self._saving = false; try { persistNow(); } catch (_) {} rerender(); return;
        }
        if (t.hasAttribute('data-reset')) {
          state.widgetOrder = self._clone(self.DEFAULT_ORDER);
          state.hiddenWidgets = [];
          ui.layoutCustomized = false; self._apply(); rerender(); return;
        }
      });
      body.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (e.target && e.target.id === 'layName') { e.preventDefault(); const b = body.querySelector('[data-save-preset]'); if (b) b.click(); }
      });
    }
  },
  // ---- Global Search / Command Palette (v19). One fast search over actions,
  // projects, milestones, reflections, memories, friction logs, the inbox (and
  // people once the CRM exists). Opens with Cmd/Ctrl+K, "/", or the header icon;
  // a result jumps straight to the right surface. ----
  search: {
    _q: '',
    _results: [],
    TYPES: {
      action: { label: 'Action', nav: 'action' },
      project: { label: 'Project', nav: 'projects' },
      milestone: { label: 'Milestone', nav: 'projects' },
      reflection: { label: 'Notes', nav: 'reflection' },
      memory: { label: 'Memory', nav: 'vivere' },
      friction: { label: 'Friction', nav: 'distraction' },
      inbox: { label: 'Updates', nav: 'inbox' },
      person: { label: 'Person', nav: 'vivere' }
    },
    _ensureStyles() {
      if (document.getElementById('srchStyles')) return;
      const s = document.createElement('style');
      s.id = 'srchStyles';
      s.textContent = `
      .srch-screen{max-width:620px;margin:0 auto;color:var(--s-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
        --s-hi:rgba(var(--ink),0.95);--s-t1:rgba(var(--ink),0.86);--s-t2:rgba(var(--ink),0.55);--s-t3:rgba(var(--ink),0.36);
        --s-hair:rgba(var(--ink),0.09);--s-hair-2:rgba(var(--ink),0.15);}
      .srch-bar{display:flex;align-items:center;gap:10px;border:1px solid var(--s-hair-2);border-radius:var(--pill-r);background:var(--kfill-04);padding:0 14px;}
      .srch-ico{color:var(--s-t3);display:flex;flex:none;}
      .srch-ico svg{width:18px;height:18px;}
      .srch-input{flex:1;min-width:0;font:inherit;font-size:1rem;color:var(--s-hi);background:transparent;border:none;outline:none;padding:14px 2px;}
      .srch-input::placeholder{color:var(--s-t3);}
      .srch-hint{font-size:0.84rem;line-height:1.5;color:var(--s-t2);margin-top:16px;padding:0 2px;}
      .srch-empty{font-size:0.88rem;color:var(--s-t2);margin-top:18px;padding:0 2px;}
      .srch-results{display:flex;flex-direction:column;gap:6px;margin-top:14px;}
      .srch-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid transparent;background:transparent;border-radius:calc(8px * var(--rx, 1));padding:10px 11px;cursor:pointer;font:inherit;transition:background .12s ease,border-color .12s ease;}
      .srch-item:hover{background:var(--kfill-05);border-color:var(--s-hair);}
      .srch-item__tag{flex:none;font-size:0.56rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--s-t3);border:1px solid var(--s-hair-2);border-radius:calc(5px * var(--rx, 1));padding:3px 0;width:76px;text-align:center;}
      .srch-item__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
      .srch-item__title{font-size:0.9rem;color:var(--s-t1);line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .srch-item__sub{font-size:0.74rem;color:var(--s-t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      `;
      document.head.appendChild(s);
    },
    _index() {
      const items = [];
      try {
        const pa = state.action && state.action.primaryAction;
        if (pa && pa.title) items.push({ type: 'action', title: pa.title, sub: pa.why || 'Your one thing', nav: 'action' });
        ((state.action && state.action.projects) || []).forEach(p => {
          if (!p) return;
          if (p.title) items.push({ type: 'project', title: p.title, sub: p.why || 'Project', nav: 'projects' });
          (p.milestones || []).forEach(m => { if (m && m.title) items.push({ type: 'milestone', title: m.title, sub: (p.title || 'Project') + (m.horizon ? ' · ' + m.horizon : ''), nav: 'projects' }); });
        });
        ((state.reflection && state.reflection.entries) || []).forEach(e => { if (e && e.text) items.push({ type: 'reflection', title: e.text, sub: e.date || '', nav: 'reflection' }); });
        ((state.vivere && state.vivere.memories) || []).forEach(m => { if (m && m.text) items.push({ type: 'memory', title: m.text, sub: m.category || 'Lived moment', nav: 'vivere' }); });
        ((state.distraction && state.distraction.logs) || []).forEach(l => { if (l && (l.note || l.category)) items.push({ type: 'friction', title: l.note || l.category, sub: l.category || '', nav: 'distraction' }); });
        ((state.updates) || []).forEach(it => { if (it && it.title) items.push({ type: 'inbox', title: it.title, sub: 'Updates', nav: 'inbox' }); });
        ((state.people) || []).forEach(p => { if (p && p.name) items.push({ type: 'person', title: p.name, sub: 'Person', nav: 'vivere' }); });
      } catch (_) {}
      return items;
    },
    render() {
      this._ensureStyles();
      const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      const q = (this._q || '').trim().toLowerCase();
      let results = [];
      if (q) { results = this._index().filter(it => { const meta = this.TYPES[it.type] || {}; return (String(it.title) + ' ' + String(it.sub || '') + ' ' + String(meta.label || it.type)).toLowerCase().indexOf(q) !== -1; }).slice(0, 40); }
      this._results = results;
      let h = '<div class="srch-screen">';
      h += '<div class="srch-bar"><span class="srch-ico">' + SEARCH_ICON + '</span><input id="srchInput" class="srch-input" type="text" aria-label="Search Memento" placeholder="Search actions, projects, reflections, memories..." value="' + esc(this._q || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false"></div>';
      if (!q) {
        h += '<div class="srch-hint">Search across everything in Memento, your one thing, projects, milestones, reflections, memories, and inbox. Press Enter to open the top result, Esc to close.</div>';
      } else if (!results.length) {
        h += '<div class="srch-empty">No matches for &ldquo;' + esc(this._q.trim()) + '&rdquo;.</div>';
      } else {
        h += '<div class="srch-results">';
        results.forEach((it, idx) => {
          const meta = this.TYPES[it.type] || { label: it.type };
          h += '<button class="srch-item" data-idx="' + idx + '">';
          h += '<span class="srch-item__tag">' + esc(meta.label) + '</span>';
          h += '<span class="srch-item__body"><span class="srch-item__title">' + esc(String(it.title).slice(0, 140)) + '</span>' + (it.sub ? '<span class="srch-item__sub">' + esc(String(it.sub).slice(0, 90)) + '</span>' : '') + '</span>';
          h += '</button>';
        });
        h += '</div>';
      }
      h += '</div>';
      return h;
    },
    afterOpen(body) {
      this._q = '';
      body.innerHTML = this.render();
      const i = body.querySelector('#srchInput');
      if (i) { try { i.focus(); } catch (_) {} }
    },
    _go(it) {
      if (!it) return;
      const nav = it.nav;
      if (nav === 'action') { Sheet.close(); try { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } catch (_) {} return; }
      if (nav === 'clarity') { Sheet.close(); try { if (typeof ClarityExperience !== 'undefined') ClarityExperience.open(); } catch (_) {} return; }
      try { Sheet.open(nav); } catch (_) {}
    },
    bind(body) {
      const self = this;
      if (body._srchBound) return;
      body._srchBound = true;
      body.addEventListener('input', (e) => {
        if (!(e.target && e.target.id === 'srchInput')) return;
        self._q = e.target.value;
        const scr = body.querySelector('.srch-screen'); if (!scr) return;
        // Rebuild only the results/hint area so the input keeps focus + caret.
        const tmp = document.createElement('div'); tmp.innerHTML = self.render();
        ['.srch-results', '.srch-hint', '.srch-empty'].forEach(s => { const el = scr.querySelector(s); if (el) el.remove(); });
        const add = tmp.querySelector('.srch-results') || tmp.querySelector('.srch-empty') || tmp.querySelector('.srch-hint');
        if (add) scr.appendChild(add);
      });
      body.addEventListener('click', (e) => {
        const t = e.target.closest('.srch-item'); if (!t) return;
        const it = (self._results || [])[parseInt(t.getAttribute('data-idx'), 10)];
        if (it) self._go(it);
      });
      body.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target && e.target.id === 'srchInput') {
          const first = body.querySelector('.srch-item'); if (first) { e.preventDefault(); first.click(); }
        }
      });
    }
  },
  // ---- Daily bookends (v19). A short guided OPEN (set the one thing, say why)
  // and CLOSE (mark the one thing, reflect, log a moment). Reuses the existing
  // action-completion, reflection and vivere data paths. Surfaced by a gentle,
  // time-of-day prompt in the command center. ----
  bookend: {
    _mode: 'morning',
    _step: 0,
    _finished: false,
    _todayISO() { return (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10); },
    _pickMode() { const h = new Date().getHours(); return (h >= 4 && h < 12) ? 'morning' : 'evening'; },
    _markDayDone() {
      if (!state.bookends || typeof state.bookends !== 'object') state.bookends = { lastMorningISO: '', lastEveningISO: '' };
      if (this._mode === 'morning') state.bookends.lastMorningISO = this._todayISO();
      else state.bookends.lastEveningISO = this._todayISO();
      try { persistNow(); } catch (_) {}
    },
    _creditAction() {
      const pa = state.action.primaryAction || {};
      if (actionCompletionForDay(this._todayISO(), pa)) return false;
      const tier = pa.recommendedTier || 'moderate';
      const actionText = (pa.tiers && pa.tiers[tier]) || pa.howToStart || pa.title || '';
      if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
      const completion = createActionCompletionRecord(pa, tier, actionText);
      state.action.completionHistory.push(completion);
      try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier, missionId: completion.missionId } }); } catch (_) {}
      if (typeof recalculateStreak === 'function') { try { recalculateStreak(); } catch (_) {} }
      try { persistNow(); } catch (_) {}
      return true;
    },
    _ensureStyles() {
      if (document.getElementById('beStyles')) return;
      const s = document.createElement('style');
      s.id = 'beStyles';
      s.textContent = `
      .be-screen{max-width:520px;margin:0 auto;text-align:center;color:var(--be-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:8px 0 12px;
        --be-hi:rgba(var(--ink),0.96);--be-t1:rgba(var(--ink),0.82);--be-t2:rgba(var(--ink),0.55);--be-t3:rgba(var(--ink),0.4);
        --be-hair:rgba(var(--ink),0.1);--be-hair-2:rgba(var(--ink),0.16);--be-card:rgba(var(--ink),0.03);--be-accent:var(--accent,var(--success));}
      .be-ico{font-size:1.9rem;margin-bottom:14px;}
      .be-step{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--be-t3);margin-bottom:16px;}
      .be-q{font-size:1.38rem;font-weight:700;letter-spacing:-0.01em;color:var(--be-hi);line-height:1.25;}
      .be-sub{font-size:0.9rem;color:var(--be-t2);line-height:1.5;margin-top:10px;}
      .be-onething{font-size:1.04rem;color:var(--be-hi);font-weight:600;border:1px solid var(--be-hair);border-radius:calc(8px * var(--rx, 1));padding:14px 16px;margin:16px 0 4px;background:var(--be-card);line-height:1.4;}
      .be-input,.be-ta{width:100%;box-sizing:border-box;font:inherit;font-size:0.98rem;color:var(--be-hi);background:var(--kfill-04);border:1px solid var(--be-hair-2);border-radius:calc(8px * var(--rx, 1));padding:13px 14px;outline:none;text-align:left;margin-top:14px;}
      .be-ta{resize:vertical;line-height:1.55;min-height:96px;}
      .be-input:focus,.be-ta:focus{border-color:rgba(var(--ink),0.34);}
      .be-input::placeholder,.be-ta::placeholder{color:var(--be-t3);}
      .be-btns{display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap;}
      .be-btn{font:inherit;font-size:0.9rem;font-weight:650;cursor:pointer;border-radius:calc(8px * var(--rx, 1));padding:12px 22px;border:1px solid var(--be-hair-2);background:transparent;color:var(--be-t1);transition:color .15s ease,border-color .15s ease,filter .15s ease;}
      .be-btn:hover{color:var(--be-hi);border-color:rgba(var(--ink),0.3);}
      .be-btn--p{background:var(--be-accent);border-color:var(--be-accent);color:#fff;}
      .be-btn--p:hover{filter:brightness(1.08);color:#fff;}
      .be-skip{display:inline-block;margin-top:16px;font:inherit;font-size:0.8rem;color:var(--be-t3);background:none;border:none;cursor:pointer;}
      .be-skip:hover{color:var(--be-t1);}
      `;
      document.head.appendChild(s);
    },
    render() {
      this._ensureStyles();
      const pa = (state.action && state.action.primaryAction) || {};
      const oneThing = pa.title || 'your one thing';
      let h = '<div class="be-screen">';
      if (this._finished) {
        const mor = this._mode === 'morning';
        h += '<div class="be-ico">' + (mor ? '&#9728;&#65039;' : '&#127769;') + '</div>';
        h += '<div class="be-q">' + (mor ? 'You are set for today.' : 'Day closed. Rest well.') + '</div>';
        h += '<div class="be-sub">' + (mor ? 'Your one thing is set. Now go do it.' : 'You showed up and you logged it. That is the whole game.') + '</div>';
        h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-close="1">Done</button></div>';
        h += '</div>';
        return h;
      }
      if (this._mode === 'morning') {
        if (this._step === 0) {
          // Yesterday, looked in the eye: counted, covered by grace, or quiet.
          const y = new Date(); y.setDate(y.getDate() - 1);
          const yk = localISO(y);
          let counts = {}; try { counts = buildConsistencyData(); } catch (_) {}
          const used = (state.streak && state.streak.grace && state.streak.grace.used) || {};
          const line = consistencyDayHasMainAction(counts[yk]) ? 'Yesterday counted.' : (used[yk] ? 'A grace day held the chain.' : 'Yesterday was quiet.');
          const streak = (state.streak && state.streak.count) || 0;
          h += '<div class="be-ico">&#9728;&#65039;</div><div class="be-step">Morning &middot; step 1 of 3</div>';
          h += '<div class="be-q">' + line + '</div>';
          h += '<div class="be-sub">' + (streak > 0 ? ('The chain stands at ' + streak + '. Today is what matters now.') : 'The chain starts whenever you do. Today is a good day for it.') + '</div>';
          h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-next="1">Continue</button></div>';
        } else if (this._step === 1) {
          // Today's one action: last night's named plan outranks the generated one.
          const tp = state.action && state.action.tomorrowPlan;
          const named = !!(tp && tp.date === this._todayISO() && tp.text);
          const pre = named ? tp.text : (pa.title || '');
          h += '<div class="be-ico">&#9728;&#65039;</div><div class="be-step">Morning &middot; step 2 of 3</div>';
          h += '<div class="be-q">What is the one thing today?</div>';
          h += '<div class="be-sub">' + (named ? 'You named this last night. Still true?' : 'The single move that would make today a win.') + '</div>';
          h += '<input class="be-input" id="beOne" type="text" maxlength="140" value="' + esc(pre) + '" placeholder="Today I will...">';
          h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-next="1">Continue</button></div>';
        } else {
          h += '<div class="be-ico">&#9728;&#65039;</div><div class="be-step">Morning &middot; step 3 of 3</div>';
          h += '<div class="be-q">Why does it matter today?</div>';
          h += '<div class="be-sub">One line to anchor you when resistance hits.</div>';
          h += '<input class="be-input" id="beWhy" type="text" maxlength="180" value="' + esc(pa.why || '') + '" placeholder="Because...">';
          h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-finish="1">Set my day</button></div>';
        }
      } else {
        if (this._step === 0) {
          h += '<div class="be-ico">&#127769;</div><div class="be-step">Evening &middot; step 1 of 3</div>';
          h += '<div class="be-q">Did you do the one thing?</div>';
          h += '<div class="be-onething">' + esc(oneThing) + '</div>';
          h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-did="1">I did it</button><button class="be-btn" data-be-next="1">Not today</button></div>';
        } else if (this._step === 1) {
          h += '<div class="be-ico">&#127769;</div><div class="be-step">Evening &middot; step 2 of 3</div>';
          h += '<div class="be-q">One honest reflection.</div>';
          h += '<div class="be-sub">What did today teach you? Optional, but it compounds.</div>';
          h += '<textarea class="be-ta" id="beRefl" maxlength="600" placeholder="Today I noticed..."></textarea>';
          h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-next="1">Continue</button></div>';
        } else {
          h += '<div class="be-ico">&#127769;</div><div class="be-step">Evening &middot; step 3 of 3</div>';
          h += '<div class="be-q">One moment worth keeping.</div>';
          h += '<div class="be-sub">A small good thing from today, for your Vivere jar. Optional.</div>';
          h += '<input class="be-input" id="beMem" type="text" maxlength="240" placeholder="I want to remember...">';
          h += '<div class="be-btns"><button class="be-btn be-btn--p" data-be-finish="1">Close the day</button></div>';
        }
      }
      h += '<button class="be-skip" data-be-skip="1">Skip for today</button>';
      h += '</div>';
      return h;
    },
    afterOpen(body) {
      this._mode = this._pickMode();
      this._step = 0;
      this._finished = false;
      try { if (Sheet && Sheet.titleEl) Sheet.titleEl.textContent = (this._mode === 'morning') ? 'Good morning' : 'Close the day'; } catch (_) {}
      body.innerHTML = this.render();
      const f = body.querySelector('.be-input, .be-ta');
      if (f) { try { f.focus(); } catch (_) {} }
    },
    _saveCurrentStep(body) {
      // Persist whatever the current step collected before advancing.
      if (this._mode === 'morning') {
        if (this._step === 0) { /* the yesterday step collects nothing */ }
        else if (this._step === 1) { const i = body.querySelector('#beOne'); if (i && i.value.trim()) { state.action.primaryAction = state.action.primaryAction || {}; state.action.primaryAction.title = i.value.trim(); } }
        else { const i = body.querySelector('#beWhy'); if (i && i.value.trim()) { state.action.primaryAction = state.action.primaryAction || {}; state.action.primaryAction.why = i.value.trim(); } }
      } else {
        if (this._step === 1) {
          const i = body.querySelector('#beRefl'); const v = i ? i.value.trim() : '';
          if (v) {
            if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
            const now = new Date();
            state.reflection.entries.push({ date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), iso: this._todayISO(), text: v });
            try { writeProofEvent('reflection-save', { title: 'Notes', text: v.slice(0, 140), module: 'reflection' }); } catch (_) {}
          }
        } else if (this._step === 2) {
          const i = body.querySelector('#beMem'); const v = i ? i.value.trim() : '';
          if (v) {
            if (!state.vivere || typeof state.vivere !== 'object') state.vivere = { memories: [] };
            if (!Array.isArray(state.vivere.memories)) state.vivere.memories = [];
            const mem = { id: (typeof _vivId === 'function' ? _vivId() : ('viv_' + Date.now().toString(36))), iso: this._todayISO(), text: v.slice(0, 400), category: '', mood: '', person: '', place: '', media: [] };
            state.vivere.memories.push(mem);
            try { writeProofEvent('vivere', { title: 'Lived moment', text: mem.text, module: 'vivere', metadata: {} }); } catch (_) {}
          }
        }
      }
    },
    _finish() {
      this._markDayDone();
      this._finished = true;
      try { persistNow(); } catch (_) {}
      try { renderAll(); } catch (_) {}
    },
    bind(body) {
      const self = this;
      const rerender = () => { body.innerHTML = self.render(); const f = body.querySelector('.be-input, .be-ta'); if (f) { try { f.focus(); } catch (_) {} } };
      if (body._beBound) return;
      body._beBound = true;
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-be-next],[data-be-did],[data-be-finish],[data-be-skip],[data-be-close]');
        if (!t || !body.querySelector('.be-screen')) return;
        if (t.hasAttribute('data-be-close')) { try { Sheet.close(); } catch (_) {} return; }
        if (t.hasAttribute('data-be-skip')) { self._markDayDone(); try { renderAll(); } catch (_) {} try { Sheet.close(); } catch (_) {} return; }
        if (t.hasAttribute('data-be-did')) { var _credited = self._creditAction(); if (_credited) { try { celebrateDone(t); } catch (_) {} } self._step = 1; rerender(); return; }
        if (t.hasAttribute('data-be-next')) { self._saveCurrentStep(body); self._step += 1; rerender(); return; }
        if (t.hasAttribute('data-be-finish')) { self._saveCurrentStep(body); self._finish(); rerender(); return; }
      });
    }
  },
  // ---- Light time-blocking (v19 Focus & Time). Plan today into a few intentional
  // blocks: the one thing, deep work, Vivere, reviews. No external calendar sync.
  // A rule-based "suggest a plan" seeds a sensible day around your one thing. ----
  timeblocks: {
    _adding: false,
    _addStart: '09:00',
    _day: null,            // ISO day being viewed; null = today
    _importing: false,     // ICS import panel open
    HOUR_H: 52,            // px per hour on the timeline
    TYPES: {
      onething: { label: 'One thing', color: 'var(--accent)' },
      focus: { label: 'Deep work', color: 'var(--color-deepwork)' },
      vivere: { label: 'Vivere', color: 'var(--color-vivere)' },
      review: { label: 'Review', color: 'var(--color-clarity)' },
      break: { label: 'Break', color: 'rgba(var(--ink),0.5)' }
    },
    DURS: [[15, '15 min'], [30, '30 min'], [60, '1 hr'], [90, '1.5 hr'], [120, '2 hr'], [180, '3 hr']],
    _id() { return 'tb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    _today() { return (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10); },
    _viewDay() { return this._day || this._today(); },
    _fmt12(hhmm) { const p = String(hhmm || '').split(':'); let H = parseInt(p[0], 10) || 0; const M = p[1] || '00'; const ap = H < 12 ? 'AM' : 'PM'; let h = H % 12; if (h === 0) h = 12; return h + ':' + M + ' ' + ap; },
    _end(start, dur) { const p = String(start || '').split(':'); let t = ((parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0) + (dur || 0)) % 1440; const eh = Math.floor(t / 60), em = t % 60; return String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0'); },
    _mins(hhmm) { const p = String(hhmm || '0:0').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); },
    _ensureStyles() {
      if (document.getElementById('tbStyles2')) return;
      const old = document.getElementById('tbStyles'); if (old) old.remove();
      const s = document.createElement('style');
      s.id = 'tbStyles2';
      s.textContent = `
      .tb-screen{max-width:640px;margin:0 auto;color:var(--tb-t1);
        --tb-hi:rgba(var(--ink),0.95);--tb-t1:rgba(var(--ink),0.85);--tb-t2:rgba(var(--ink),0.55);--tb-t3:rgba(var(--ink),0.36);
        --tb-hair:rgba(var(--ink),0.09);--tb-hair-2:rgba(var(--ink),0.15);--tb-card:rgba(var(--ink),0.025);}
      .tb-week{display:flex;gap:4px;margin:2px 0 14px;}
      .tb-wday{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 0 8px;border:none;background:transparent;border-radius:calc(10px * var(--rx,1));cursor:pointer;color:var(--tb-t2);font:inherit;}
      .tb-wday:hover{background:var(--kfill-05);}
      .tb-wday__l{font-size:0.56rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;}
      .tb-wday__n{font-size:0.92rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--tb-t1);}
      .tb-wday--on{background:var(--kfill-08);color:var(--tb-hi);}
      .tb-wday--on .tb-wday__n{color:var(--tb-hi);font-weight:700;}
      .tb-wday--today .tb-wday__l{color:var(--accent);}
      .tb-allday{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
      .tb-allday__chip{font-size:0.7rem;font-weight:600;color:var(--tb-t2);border:1px dashed var(--tb-hair-2);border-radius:999px;padding:4px 11px;}
      .tb-tl{position:relative;border-top:1px solid var(--tb-hair);}
      .tb-hour{position:absolute;left:0;right:0;border-bottom:1px solid var(--tb-hair);}
      .tb-hour__lbl{position:absolute;top:-7px;left:0;width:46px;font-size:0.62rem;font-weight:600;color:var(--tb-t3);font-variant-numeric:tabular-nums;background:transparent;}
      .tb-now{position:absolute;left:50px;right:0;height:0;border-top:1px solid rgba(255,107,107,0.85);z-index:3;pointer-events:none;}
      .tb-now::before{content:"";position:absolute;left:-5px;top:-3.5px;width:7px;height:7px;border-radius:50%;background:rgba(255,107,107,0.95);}
      .tb-ev{position:absolute;left:56px;right:6px;border-radius:calc(8px * var(--rx,1));padding:5px 9px 5px 11px;overflow:hidden;z-index:2;background:var(--kfill-05);border:1px solid var(--tb-hair);}
      .tb-ev::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tb-bar,var(--tb-hair-2));}
      .tb-ev__t{font-size:0.78rem;font-weight:600;color:var(--tb-hi);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tb-ev__m{font-size:0.62rem;color:var(--tb-t2);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tb-ev .tb-del{position:absolute;top:3px;right:4px;border:none;background:transparent;color:var(--tb-t3);font-size:1rem;line-height:1;cursor:pointer;padding:2px 5px;border-radius:calc(5px * var(--rx,1));opacity:0;transition:opacity .15s ease;}
      .tb-ev:hover .tb-del{opacity:1;}
      .tb-del:hover{color:#ff6b6b;background:rgba(255,107,107,0.1);}
      .tb-ev--ghost{background:transparent;border:1px dashed var(--tb-hair-2);z-index:1;}
      .tb-ev--ghost .tb-ev__t{color:var(--tb-t2);font-weight:500;}
      .tb-empty-hint{position:absolute;left:56px;right:6px;text-align:center;font-size:0.74rem;color:var(--tb-t3);pointer-events:none;}
      .tb-comp{margin-top:14px;border:1px solid var(--tb-hair-2);border-radius:calc(10px * var(--rx,1));background:var(--tb-card);padding:13px;display:flex;flex-wrap:wrap;gap:9px;align-items:center;}
      .tb-inp,.tb-sel{font:inherit;font-size:0.86rem;color:var(--tb-hi);background:var(--kfill-04);border:1px solid var(--tb-hair-2);border-radius:calc(6px * var(--rx,1));padding:9px 10px;outline:none;}
      .tb-inp:focus,.tb-sel:focus{border-color:rgba(var(--ink),0.32);}
      .tb-inp--label{flex:1;min-width:150px;}
      .tb-sel{cursor:pointer;}
      .tb-comp__btns{display:flex;gap:8px;margin-left:auto;}
      .tb-btn{font:inherit;font-size:0.82rem;font-weight:650;cursor:pointer;border-radius:calc(6px * var(--rx,1));padding:9px 14px;border:1px solid var(--tb-hair-2);background:transparent;color:var(--tb-t2);transition:all .15s ease;}
      .tb-btn:hover{color:var(--tb-hi);border-color:rgba(var(--ink),0.3);}
      .tb-btn--p{background:var(--solid-bg,#f5f5f7);border-color:transparent;color:var(--solid-fg,#0b0b0d);font-weight:650;}
      .tb-btn--p:hover{filter:brightness(0.96);color:var(--solid-fg,#0b0b0d);}
      .tb-seg{display:inline-flex;gap:2px;padding:3px;border-radius:calc(10px * var(--rx,1));background:var(--kfill-04);border:1px solid var(--tb-hair);}
      .tb-seg__b{font:inherit;font-size:0.74rem;font-weight:650;color:var(--tb-t2);background:transparent;border:none;border-radius:calc(7px * var(--rx,1));padding:6px 14px;cursor:pointer;}
      .tb-seg__b.is-on{background:var(--kfill-10);color:var(--tb-hi);}
      .tb-foot--more{margin-top:8px;}
      .tb-foot{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px;}
      .tb-ics{margin-top:14px;border:1px solid var(--tb-hair-2);border-radius:calc(10px * var(--rx,1));background:var(--tb-card);padding:13px;}
      .tb-ics__t{font-size:0.84rem;font-weight:650;color:var(--tb-hi);margin-bottom:4px;}
      .tb-ics__s{font-size:0.74rem;color:var(--tb-t2);line-height:1.5;margin-bottom:10px;}
      .tb-ics__ta{width:100%;min-height:84px;font:inherit;font-size:0.74rem;color:var(--tb-hi);background:var(--kfill-04);border:1px solid var(--tb-hair-2);border-radius:calc(6px * var(--rx,1));padding:9px 10px;outline:none;resize:vertical;}
      .tb-ics__row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center;}
      .tb-ev{touch-action:none;cursor:grab;}
      .tb-ev--ghost{touch-action:auto;cursor:default;}
      .tb-ev__rs{position:absolute;left:0;right:0;bottom:0;height:12px;cursor:ns-resize;}
      .tb-ev__rs::after{content:"";position:absolute;left:50%;bottom:3px;width:26px;height:3px;margin-left:-13px;border-radius:3px;background:rgba(var(--ink),0.18);opacity:0;transition:opacity .15s ease;}
      .tb-mode{display:flex;justify-content:center;margin-bottom:12px;}
      .tb-week7{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}
      .tb-w7col{position:relative;display:flex;flex-direction:column;gap:6px;align-items:stretch;border:1px solid var(--tb-hair);border-radius:calc(10px * var(--rx,1));background:var(--tb-card);padding:8px 4px 6px;cursor:pointer;font:inherit;min-height:200px;}
      .tb-w7col:hover{border-color:rgba(var(--ink),0.22);}
      .tb-w7col--today .tb-w7col__l{color:var(--accent);}
      .tb-w7col__l{font-size:0.6rem;font-weight:700;letter-spacing:0.08em;text-align:center;color:var(--tb-t2);line-height:1.4;}
      .tb-w7col__lane{position:relative;flex:1;border-radius:4px;background:var(--kfill-03);}
      .tb-w7col__n{font-size:0.62rem;font-weight:600;color:var(--tb-t3);text-align:center;min-height:12px;font-variant-numeric:tabular-nums;}
      .tb-actual{position:absolute;right:0;width:4px;border-radius:2px;background:var(--color-deepwork);opacity:0.9;z-index:2;}
      .tb-stats{margin-top:10px;font-size:0.7rem;color:var(--tb-t2);font-variant-numeric:tabular-nums;}
      .tb-typedot{width:10px;height:10px;border-radius:50%;flex:none;align-self:center;}
      .tb-ev__repglyph{font-size:0.7rem;opacity:0.6;}
      .tb-ev--rep{opacity:0.92;}
      .tb-suggest{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;border:1px solid var(--tb-hair-2);border-radius:calc(10px * var(--rx,1));background:var(--tb-card);padding:10px 12px;font-size:0.8rem;color:var(--tb-t2);}
      .tb-suggest strong{color:var(--tb-hi);font-weight:650;}
      .tb-ev:hover .tb-ev__rs::after{opacity:1;}
      `;
      document.head.appendChild(s);
    },
    _typeOptions(sel) {
      return Object.keys(this.TYPES).map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(this.TYPES[k].label) + '</option>').join('');
    },
    _durOptions(sel) { const cur = sel || this._addDur || 60; const have = this.DURS.some(d => d[0] === cur); let h = this.DURS.map(d => '<option value="' + d[0] + '"' + (d[0] === cur ? ' selected' : '') + '>' + esc(d[1]) + '</option>').join(''); if (!have) h = '<option value="' + cur + '" selected>' + cur + ' min</option>' + h; return h; },
    _weekHtml() {
      const view = this._viewDay();
      const today = this._today();
      const base = new Date(view + 'T12:00:00');
      const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      let h = '<div class="tb-week">';
      for (let off = -3; off <= 3; off++) {
        const d = new Date(base); d.setDate(d.getDate() + off);
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        h += '<button type="button" class="tb-wday' + (iso === view ? ' tb-wday--on' : '') + (iso === today ? ' tb-wday--today' : '') + '" data-tb-day="' + iso + '">'
          + '<span class="tb-wday__l">' + DOW[d.getDay()] + '</span><span class="tb-wday__n">' + d.getDate() + '</span></button>';
      }
      return h + '</div>';
    },
    _dayEvents(day) {
      const cal = (state.calendar && Array.isArray(state.calendar.events)) ? state.calendar.events : [];
      return cal.filter(e => e && e.day === day);
    },
    render() {
      this._ensureStyles();
      const day = this._viewDay();
      const today = this._today();
      let blocks = (Array.isArray(state.timeblocks) ? state.timeblocks : []).filter(b => b && b.day === day).slice();
      // Recurring blocks: rules live on their origin day and project forward.
      const dow0 = new Date(day + 'T12:00:00').getDay();
      (Array.isArray(state.timeblocks) ? state.timeblocks : []).forEach(b => {
        if (!b || !b.repeat || b.day === day || b.day > day) return;
        if (Array.isArray(b.skip) && b.skip.indexOf(day) >= 0) return;
        const ruleDow = new Date(b.day + 'T12:00:00').getDay();
        const applies = b.repeat === 'daily'
          || (b.repeat === 'weekdays' && dow0 >= 1 && dow0 <= 5)
          || (b.repeat === 'weekly' && ruleDow === dow0);
        if (!applies) return;
        blocks.push(Object.assign({}, b, { _derived: day }));
      });
      blocks.sort((a, b) => String(a.start).localeCompare(String(b.start)));
      const events = this._dayEvents(day);
      const timed = events.filter(e => !e.allDay);
      const allDay = events.filter(e => e.allDay);
      let h = '<div class="tb-screen">';
      h += '<div class="tb-mode"><span class="tb-seg">'
        + '<button type="button" class="tb-seg__b' + (!this._weekView ? ' is-on' : '') + '" data-tb-mode="day">Day</button>'
        + '<button type="button" class="tb-seg__b' + (this._weekView ? ' is-on' : '') + '" data-tb-mode="week">Week</button>'
        + '</span></div>';
      if (this._weekView) {
        // WEEK VIEW: seven mini day-lanes, blocks as proportional ticks.
        const base = new Date(day + 'T12:00:00');
        const dow = (base.getDay() + 6) % 7;
        base.setDate(base.getDate() - dow);
        const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        h += '<div class="tb-week7">';
        for (let i = 0; i < 7; i++) {
          const d = new Date(base); d.setDate(d.getDate() + i);
          const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          const dayBlocks = (Array.isArray(state.timeblocks) ? state.timeblocks : []).filter(b => b && b.day === iso);
          let ticks = '';
          dayBlocks.forEach(b => {
            const a = Math.max(8 * 60, this._mins(b.start)), z = Math.min(22 * 60, this._mins(b.start) + (b.durMin || 60));
            if (z <= a) return;
            const meta = this.TYPES[b.type] || { color: 'var(--tb-hair-2)' };
            ticks += '<span style="position:absolute;left:3px;right:3px;border-radius:2px;background:' + meta.color + ';opacity:0.85;top:' + (((a - 480) / 840) * 100).toFixed(2) + '%;height:' + (((z - a) / 840) * 100).toFixed(2) + '%;"></span>';
          });
          h += '<button type="button" class="tb-w7col' + (iso === today ? ' tb-w7col--today' : '') + '" data-tb-openday="' + iso + '">'
            + '<span class="tb-w7col__l">' + DOW[i] + '<br>' + d.getDate() + '</span>'
            + '<span class="tb-w7col__lane">' + ticks + '</span>'
            + '<span class="tb-w7col__n">' + (dayBlocks.length || '') + '</span>'
            + '</button>';
        }
        h += '</div>';
        // Week stats: planned hours, deep %, busiest day.
        let wkTotal = 0, wkDeep = 0; const perDay = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(base); d.setDate(d.getDate() + i);
          const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          const dayB = (Array.isArray(state.timeblocks) ? state.timeblocks : []).filter(b => b && b.day === iso);
          const tot = dayB.reduce((a, b) => a + (b.durMin || 60), 0);
          perDay[iso] = tot; wkTotal += tot;
          wkDeep += dayB.filter(b => b.type === 'focus' || b.type === 'onething').reduce((a, b) => a + (b.durMin || 60), 0);
        }
        if (wkTotal) {
          const busiest = Object.keys(perDay).sort((a, b) => perDay[b] - perDay[a])[0];
          const fmtH = (m) => (m >= 60 ? (Math.round(m / 6) / 10) + 'h' : m + 'm');
          h += '<div class="tb-stats">Planned ' + fmtH(wkTotal) + ' this week · ' + Math.round((wkDeep / wkTotal) * 100) + '% deep · busiest ' + new Date(busiest + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) + '</div>';
        }
        h += '</div>';
        return h;
      }
      h += this._weekHtml();
      if (allDay.length) {
        h += '<div class="tb-allday">' + allDay.map(e => '<span class="tb-allday__chip">' + esc(e.title || 'Event') + (e.recurring ? ' &middot; recurring' : '') + '</span>').join('') + '</div>';
      }
      // Timeline range: generous defaults, stretched by whatever exists.
      let minH = 8, maxH = 22;
      blocks.concat(timed).forEach(x => {
        const s = Math.floor(this._mins(x.start) / 60);
        const e = Math.ceil((this._mins(x.start) + (x.durMin || 60)) / 60);
        if (s < minH) minH = s; if (e > maxH) maxH = Math.min(24, e);
      });
      const HH = this.HOUR_H;
      const tlH = (maxH - minH) * HH;
      h += '<div class="tb-tl" id="tbTl" data-minh="' + minH + '" style="height:' + tlH + 'px">';
      for (let hr = minH; hr < maxH; hr++) {
        const top = (hr - minH) * HH;
        const lbl = (hr % 12 === 0 ? 12 : hr % 12) + (hr < 12 ? ' AM' : ' PM');
        h += '<div class="tb-hour" style="top:' + top + 'px;height:' + HH + 'px"><span class="tb-hour__lbl">' + lbl + '</span></div>';
      }
      // Calendar events first (ghost lane, read-only), then the user's blocks.
      timed.forEach(e => {
        const top = Math.max(0, (this._mins(e.start) - minH * 60) / 60 * HH);
        const hgt = Math.max(24, (e.durMin || 60) / 60 * HH - 2);
        h += '<div class="tb-ev tb-ev--ghost" style="top:' + top + 'px;height:' + hgt + 'px">'
          + '<div class="tb-ev__t">' + esc(e.title || 'Event') + (e.recurring ? ' (recurring)' : '') + '</div>'
          + '<div class="tb-ev__m">' + esc(this._fmt12(e.start)) + ' &middot; calendar</div></div>';
      });
      // Overlap lanes: concurrent blocks share the width side by side.
      const lanes = [];
      const laneOf = {};
      blocks.forEach(b => {
        const a = this._mins(b.start), z = a + (b.durMin || 60);
        let li = lanes.findIndex(endAt => endAt <= a);
        if (li < 0) { lanes.push(z); li = lanes.length - 1; } else { lanes[li] = z; }
        laneOf[b.id] = li;
      });
      const laneCount = Math.max(1, lanes.length);
      blocks.forEach(b => {
        const meta = this.TYPES[b.type] || { label: b.type || '', color: 'var(--tb-hair-2)' };
        const top = Math.max(0, (this._mins(b.start) - minH * 60) / 60 * HH);
        const hgt = Math.max(26, (b.durMin || 60) / 60 * HH - 2);
        const li = laneOf[b.id] || 0;
        const laneCss = laneCount > 1
          ? 'left:calc(56px + (100% - 62px) * ' + (li / laneCount).toFixed(4) + ');width:calc((100% - 62px) / ' + laneCount + ' - 4px);right:auto;'
          : '';
        h += '<div class="tb-ev' + (b._derived ? ' tb-ev--rep' : '') + '" data-id="' + esc(b.id) + '"' + (b._derived ? ' data-derived="' + esc(b._derived) + '"' : '') + ' style="top:' + top + 'px;height:' + hgt + 'px;--tb-bar:' + meta.color + ';' + laneCss + '">'
          + '<div class="tb-ev__t">' + (b.repeat ? '<span class="tb-ev__repglyph" title="Repeats" aria-hidden="true">&#8635;</span> ' : '') + esc(b.label || meta.label) + '</div>'
          + '<div class="tb-ev__m">' + esc(this._fmt12(b.start)) + ' to ' + esc(this._fmt12(this._end(b.start, b.durMin || 60))) + ' &middot; ' + esc(meta.label) + '</div>'
          + '<button class="tb-del" data-tb-del="' + esc(b.id) + '" aria-label="Delete block" title="Delete">&times;</button>'
          + '<div class="tb-ev__rs" data-tb-rs aria-hidden="true"></div>'
          + '</div>';
      });
      if (day === today) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (nowMin >= minH * 60 && nowMin <= maxH * 60) {
          h += '<div class="tb-now" style="top:' + ((nowMin - minH * 60) / 60 * HH) + 'px"></div>';
        }
      }
      // Planned vs actual: deep work sessions (with a recorded start) draw
      // as solid bars on the right rail in the deep work color.
      const dwSessions = ((state.deepwork && state.deepwork.sessions) || []).filter(x => x && x.iso === day && x.startedAt);
      dwSessions.forEach(x => {
        const d0 = new Date(x.startedAt);
        const a = d0.getHours() * 60 + d0.getMinutes();
        const top = Math.max(0, (a - minH * 60) / 60 * HH);
        const hgt = Math.max(8, (x.minutes || 0) / 60 * HH);
        h += '<div class="tb-actual" title="Deep work, ' + (x.minutes || 0) + ' min" style="top:' + top + 'px;height:' + hgt + 'px"></div>';
      });
      if (!blocks.length && !timed.length) {
        h += '<div class="tb-empty-hint" style="top:' + ((tlH / 2) - 10) + 'px">Tap an hour to place a block.</div>';
      }
      h += '</div>';
      // Morning auto-suggest: today is empty and a shape exists, offer it.
      const tpl0 = (state.timeblockTemplates && state.timeblockTemplates[0]) || null;
      if (day === today && !blocks.length && !this._adding && !this._suggestOff) {
        const tplName = tpl0 ? tpl0.name : 'Founder morning';
        h += '<div class="tb-suggest"><span>Empty day. Apply <strong>' + esc(tplName) + '</strong>?</span>'
          + '<span style="display:flex;gap:8px;"><button class="tb-btn tb-btn--p" data-tb-suggest-apply="' + (tpl0 ? esc(tpl0.id) : '__starter') + '">Apply</button>'
          + '<button class="tb-btn" data-tb-suggest-off="1" aria-label="Dismiss">&times;</button></span></div>';
      }
      h += '<div style="display:none">';
      h += '</div>';
      // Time-of-day stats: a quiet factual line.
      const plannedMin = blocks.reduce((a, b) => a + (b.durMin || 60), 0);
      const focusMin = blocks.filter(b => b.type === 'focus' || b.type === 'onething').reduce((a, b) => a + (b.durMin || 60), 0);
      const dwToday = ((state.deepwork && state.deepwork.sessions) || []).filter(x => x && x.iso === day).reduce((a, x) => a + (x.minutes || 0), 0);
      if (plannedMin || dwToday) {
        const fmtH = (m) => (m >= 60 ? (Math.round(m / 6) / 10) + 'h' : m + 'm');
        h += '<div class="tb-stats">' + [
          plannedMin ? ('Planned ' + fmtH(plannedMin)) : '',
          plannedMin ? (Math.round((focusMin / plannedMin) * 100) + '% deep') : '',
          dwToday ? ('Done ' + fmtH(dwToday) + ' deep work') : ''
        ].filter(Boolean).join(' · ') + '</div>';
      }
      if (this._adding) {
        h += '<div class="tb-comp">';
        h += '<input class="tb-inp" id="tbStart" type="time" value="' + esc(this._addStart || '09:00') + '" aria-label="Start time">';
        h += '<select class="tb-sel" id="tbDur" aria-label="Duration">' + this._durOptions() + '</select>';
        h += '<span class="tb-typedot" id="tbTypeDot" aria-hidden="true" style="background:' + (this.TYPES.focus.color) + ';"></span>';
        h += '<select class="tb-sel" id="tbType" aria-label="Type">' + this._typeOptions('focus') + '</select>';
        h += '<select class="tb-sel" id="tbRepeat" aria-label="Repeat"><option value="">No repeat</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select>';
        h += '<input class="tb-inp tb-inp--label" id="tbLabel" type="text" maxlength="80" placeholder="What is this block for?">';
        h += '<div class="tb-comp__btns"><button class="tb-btn tb-btn--p" data-tb-save="1">Add block</button><button class="tb-btn" data-tb-cancel="1">Cancel</button></div>';
        h += '</div>';
      } else if (this._importing) {
        h += '<div class="tb-ics"><div class="tb-ics__t">Import a calendar (.ics)</div>'
          + '<div class="tb-ics__s">Read-only: your events show as dashed blocks so you plan around them. Export an .ics from Google Calendar, Apple Calendar, or Outlook and drop it here. Recurring events import their first date with a recurring tag.</div>'
          + '<textarea class="tb-ics__ta" id="tbIcsPaste" placeholder="Paste the contents of an .ics file here"></textarea>'
          + '<div class="tb-ics__row">'
            + '<input class="tb-inp" id="tbIcsUrl" type="url" placeholder="...or a subscribe URL (https://...ics)" style="flex:1;min-width:180px;" value="' + esc((state.calendar && state.calendar.subUrl) || '') + '">'
            + '<button class="tb-btn" data-tb-ics-url="1">Connect</button>'
          + '</div>'
          + '<div class="tb-ics__row">'
            + '<input type="file" id="tbIcsFile" accept=".ics,text/calendar" style="display:none">'
            + '<button class="tb-btn" data-tb-ics-file="1">Choose .ics file</button>'
            + '<span style="margin-left:auto;display:flex;gap:8px;">'
            + '<button class="tb-btn tb-btn--p" data-tb-ics-import="1">Import</button>'
            + '<button class="tb-btn" data-tb-ics-cancel="1">Cancel</button></span>'
          + '</div></div>';
      } else if (this._tplOpen) {
        const tpls = [{ id: '__starter', name: 'Founder morning (starter)' }].concat(state.timeblockTemplates || []);
        h += '<div class="tb-ics"><div class="tb-ics__t">Day templates</div>'
          + '<div class="tb-ics__s">Apply a saved day shape to ' + (day === today ? 'today' : day) + '. Blocks are added to whatever is already planned.</div>'
          + tpls.map(t => '<div class="tb-ics__row"><span style="font-size:0.84rem;color:var(--tb-hi);flex:1;">' + esc(t.name) + '</span>'
            + '<button class="tb-btn tb-btn--p" data-tb-tpl-apply="' + esc(t.id) + '">Apply</button>'
            + (t.id === '__starter' ? '' : '<button class="tb-btn" data-tb-tpl-del="' + esc(t.id) + '">Delete</button>')
            + '</div>').join('')
          + '<div class="tb-ics__row"><span style="margin-left:auto;"><button class="tb-btn" data-tb-tpl-close="1">Close</button></span></div>'
          + '</div>';
      } else {
        h += '<div class="tb-foot"><button class="tb-btn tb-btn--p" data-tb-add="1">+ Add block</button>';
        if (!blocks.length) h += '<button class="tb-btn" data-tb-suggest="1">Suggest a plan</button>';
        h += '<button class="tb-btn" data-tb-more="1" style="margin-left:auto;" aria-haspopup="true">More &#8943;</button>';
        h += '</div>';
        if (this._moreOpen) {
          h += '<div class="tb-foot tb-foot--more">';
          if (blocks.length) h += '<button class="tb-btn" data-tb-copy-tmrw="1">Copy to tomorrow</button>';
          if (blocks.length) h += '<button class="tb-btn" data-tb-tpl-save="1">Save as template</button>';
          h += '<button class="tb-btn" data-tb-tpl-open="1">Templates</button>';
          h += '<button class="tb-btn" data-tb-ics-open="1">' + ((state.calendar && state.calendar.subUrl) ? 'Calendar connected' : ((state.calendar && (state.calendar.events || []).length) ? 'Calendar imported' : 'Import calendar')) + '</button>';
          h += '</div>';
        }
      }
      h += '</div>';
      return h;
    },
    // Minimal ICS parser, no dependencies. Handles line unfolding, VEVENT
    // blocks, all-day dates, UTC (Z) and naive/TZID local times. RRULE is
    // not expanded; the first instance imports with a recurring flag.
    _parseICS(text) {
      const raw = String(text || '').replace(/\r\n?/g, '\n');
      const lines = [];
      raw.split('\n').forEach(ln => {
        if ((/^[ \t]/.test(ln)) && lines.length) lines[lines.length - 1] += ln.slice(1);
        else lines.push(ln);
      });
      const events = [];
      let cur = null;
      const parseDT = (val, params) => {
        const p = String(params || '');
        const v = String(val || '').trim();
        if (/VALUE=DATE(;|$)/.test(p) || /^\d{8}$/.test(v)) {
          return { day: v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6, 8), allDay: true };
        }
        const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/);
        if (!m) return null;
        if (m[7] === 'Z') {
          const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
          return {
            day: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
            start: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
            mins: d.getHours() * 60 + d.getMinutes(), ts: d.getTime()
          };
        }
        // TZID or floating: treat as wall-clock local. Good enough for a
        // read-only "shape of the day" lane.
        return {
          day: m[1] + '-' + m[2] + '-' + m[3],
          start: m[4] + ':' + m[5],
          mins: (+m[4]) * 60 + (+m[5]),
          ts: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime()
        };
      };
      lines.forEach(ln => {
        if (/^BEGIN:VEVENT/i.test(ln)) { cur = {}; return; }
        if (/^END:VEVENT/i.test(ln)) {
          if (cur && cur._s) {
            let durMin = 60;
            if (cur._e && cur._s.ts != null && cur._e.ts != null) durMin = Math.max(15, Math.round((cur._e.ts - cur._s.ts) / 60000));
            events.push({
              id: 'cal_' + (cur.uid || Math.random().toString(36).slice(2, 10)).replace(/[^\w-]/g, '').slice(0, 40) + '_' + (cur._s.day || ''),
              day: cur._s.day, start: cur._s.start || '00:00',
              durMin: cur._s.allDay ? 0 : durMin,
              allDay: !!cur._s.allDay,
              title: (cur.summary || 'Event').slice(0, 80),
              recurring: !!cur.rrule
            });
          }
          cur = null; return;
        }
        if (!cur) return;
        const ix = ln.indexOf(':'); if (ix < 0) return;
        const head = ln.slice(0, ix), val = ln.slice(ix + 1);
        const name = head.split(';')[0].toUpperCase();
        if (name === 'SUMMARY') cur.summary = val.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
        else if (name === 'UID') cur.uid = val.trim();
        else if (name === 'RRULE') cur.rrule = val.trim();
        else if (name === 'DTSTART') cur._s = parseDT(val, head);
        else if (name === 'DTEND') cur._e = parseDT(val, head);
      });
      return events;
    },
    _importIcsText(text) {
      const found = this._parseICS(text);
      if (!found.length) return 0;
      if (!state.calendar || typeof state.calendar !== 'object') state.calendar = { events: [] };
      if (!Array.isArray(state.calendar.events)) state.calendar.events = [];
      const seen = new Set(state.calendar.events.map(e => e.id));
      let n = 0;
      found.forEach(e => { if (e.day && !seen.has(e.id)) { state.calendar.events.push(e); seen.add(e.id); n++; } });
      // Keep it bounded: drop events older than 60 days.
      const cutoff = new Date(Date.now() - 60 * 86400000);
      const cutIso = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
      state.calendar.events = state.calendar.events.filter(e => e.day >= cutIso);
      return n;
    },
    _suggest() {
      const day = this._viewDay();
      const oneThing = (state.action && state.action.primaryAction && state.action.primaryAction.title) || 'Your one thing';
      if (!Array.isArray(state.timeblocks)) state.timeblocks = [];
      const seed = [
        { start: '09:00', durMin: 90, type: 'onething', label: oneThing },
        { start: '13:30', durMin: 60, type: 'focus', label: 'Deep work block' },
        { start: '18:00', durMin: 30, type: 'vivere', label: 'Step away and live a little' },
        { start: '21:00', durMin: 15, type: 'review', label: 'Close the day' }
      ];
      seed.forEach(b => state.timeblocks.push({ id: this._id(), day: day, start: b.start, durMin: b.durMin, type: b.type, label: b.label }));
    },
    afterOpen(body) { this._adding = false; this._importing = false; this._day = null; body.innerHTML = this.render(); },
    bind(body) {
      const self = this;
      const rerender = (focusId) => { body.innerHTML = self.render(); if (focusId) { const el = body.querySelector('#' + focusId); if (el) { try { el.focus(); } catch (_) {} } } };
      if (body._tbBound) return;
      body._tbBound = true;
      body.addEventListener('click', (e) => {
        if (!body.querySelector('.tb-screen')) return;
        const t = e.target.closest('[data-tb-add],[data-tb-cancel],[data-tb-save],[data-tb-del],[data-tb-suggest],[data-tb-day],[data-tb-ics-open],[data-tb-ics-cancel],[data-tb-ics-import],[data-tb-ics-file],[data-tb-copy-tmrw],[data-tb-ics-url],[data-tb-mode],[data-tb-openday],[data-tb-tpl-save],[data-tb-tpl-open],[data-tb-tpl-close],[data-tb-tpl-apply],[data-tb-tpl-del],[data-tb-suggest-apply],[data-tb-suggest-off],[data-tb-more]');
        if (!Array.isArray(state.timeblocks)) state.timeblocks = [];
        if (!t) {
          // A drag that just ended must not read as a tap-to-add.
          if (self._justDragged) { self._justDragged = false; return; }
          // Tap an empty hour on the timeline: open the composer prefilled
          // with that hour (snapped to the half hour).
          const tl = e.target.closest && e.target.closest('#tbTl');
          if (tl && !e.target.closest('.tb-ev') && !self._adding && !self._importing) {
            const rect = tl.getBoundingClientRect();
            const minH = parseInt(tl.getAttribute('data-minh'), 10) || 8;
            const mins = minH * 60 + Math.max(0, (e.clientY - rect.top)) / self.HOUR_H * 60;
            const snapped = Math.round(mins / 30) * 30;
            self._addStart = String(Math.floor(snapped / 60)).padStart(2, '0') + ':' + String(snapped % 60).padStart(2, '0');
            self._adding = true;
            rerender('tbLabel');
          }
          return;
        }
        if (t.hasAttribute('data-tb-day')) { self._day = t.getAttribute('data-tb-day'); rerender(); return; }
        if (t.hasAttribute('data-tb-mode')) { self._weekView = t.getAttribute('data-tb-mode') === 'week'; rerender(); return; }
        if (t.hasAttribute('data-tb-openday')) { self._day = t.getAttribute('data-tb-openday'); self._weekView = false; rerender(); return; }
        if (t.hasAttribute('data-tb-tpl-save')) {
          const name = (typeof prompt === 'function') ? prompt('Template name', 'My day shape') : '';
          if (!name || !name.trim()) return;
          if (!Array.isArray(state.timeblockTemplates)) state.timeblockTemplates = [];
          const day0 = self._viewDay();
          state.timeblockTemplates.push({
            id: 'tpl_' + Date.now().toString(36),
            name: name.trim().slice(0, 40),
            blocks: state.timeblocks.filter(b => b && b.day === day0).map(b => ({ start: b.start, durMin: b.durMin, type: b.type, label: b.label }))
          });
          try { persistNow(); } catch (_) {}
          rerender(); return;
        }
        if (t.hasAttribute('data-tb-tpl-open')) { self._tplOpen = true; self._adding = false; self._importing = false; rerender(); return; }
        if (t.hasAttribute('data-tb-tpl-close')) { self._tplOpen = false; rerender(); return; }
        if (t.hasAttribute('data-tb-tpl-del')) {
          state.timeblockTemplates = (state.timeblockTemplates || []).filter(x => x.id !== t.getAttribute('data-tb-tpl-del'));
          try { persistNow(); } catch (_) {}
          rerender(); return;
        }
        if (t.hasAttribute('data-tb-more')) { self._moreOpen = !self._moreOpen; rerender(); return; }
        if (t.hasAttribute('data-tb-suggest-off')) { self._suggestOff = true; rerender(); return; }
        if (t.hasAttribute('data-tb-suggest-apply')) {
          const id2 = t.getAttribute('data-tb-suggest-apply');
          const proxy = body.querySelector('[data-tb-tpl-apply="' + id2 + '"]');
          // Reuse the template-apply path directly.
          self._tplOpen = false;
          const day0 = self._viewDay();
          const starter = [
            { start: '08:30', durMin: 90, type: 'onething', label: 'The one thing, first' },
            { start: '10:30', durMin: 60, type: 'focus', label: 'Deep work' },
            { start: '12:30', durMin: 30, type: 'break', label: 'Walk, no phone' },
            { start: '17:30', durMin: 30, type: 'vivere', label: 'Live a little' },
            { start: '21:30', durMin: 15, type: 'review', label: 'Close the day' }
          ];
          const tpl = id2 === '__starter' ? { blocks: starter } : (state.timeblockTemplates || []).find(x => x.id === id2);
          if (tpl) {
            tpl.blocks.forEach(b => state.timeblocks.push({ id: self._id(), day: day0, start: b.start, durMin: b.durMin, type: b.type, label: b.label }));
            try { persistNow(); } catch (_) {}
          }
          rerender(); return;
        }
        if (t.hasAttribute('data-tb-tpl-apply')) {
          const id = t.getAttribute('data-tb-tpl-apply');
          const day0 = self._viewDay();
          const starter = [
            { start: '08:30', durMin: 90, type: 'onething', label: 'The one thing, first' },
            { start: '10:30', durMin: 60, type: 'focus', label: 'Deep work' },
            { start: '12:30', durMin: 30, type: 'break', label: 'Walk, no phone' },
            { start: '17:30', durMin: 30, type: 'vivere', label: 'Live a little' },
            { start: '21:30', durMin: 15, type: 'review', label: 'Close the day' }
          ];
          const tpl = id === '__starter' ? { blocks: starter } : (state.timeblockTemplates || []).find(x => x.id === id);
          if (!tpl) return;
          tpl.blocks.forEach(b => state.timeblocks.push({ id: self._id(), day: day0, start: b.start, durMin: b.durMin, type: b.type, label: b.label }));
          self._tplOpen = false;
          try { persistNow(); } catch (_) {}
          rerender(); return;
        }
        if (t.hasAttribute('data-tb-add')) { self._addStart = '09:00'; self._adding = true; self._importing = false; rerender('tbLabel'); return; }
        if (t.hasAttribute('data-tb-cancel')) { self._adding = false; rerender(); return; }
        if (t.hasAttribute('data-tb-suggest')) { self._suggest(); try { persistNow(); } catch (_) {} rerender(); return; }
        if (t.hasAttribute('data-tb-copy-tmrw')) {
          const day = self._viewDay();
          const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + 1);
          const tm = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          const existing = state.timeblocks.filter(b => b && b.day === tm).length;
          if (existing) { try { showComingSoonToast('Tomorrow already has blocks.'); } catch (_) {} return; }
          state.timeblocks.filter(b => b && b.day === day).forEach(b => {
            state.timeblocks.push({ id: self._id(), day: tm, start: b.start, durMin: b.durMin, type: b.type, label: b.label });
          });
          try { persistNow(); } catch (_) {}
          self._day = tm; rerender(); return;
        }
        if (t.hasAttribute('data-tb-ics-open')) { self._importing = true; self._adding = false; rerender('tbIcsPaste'); return; }
        if (t.hasAttribute('data-tb-ics-cancel')) { self._importing = false; rerender(); return; }
        if (t.hasAttribute('data-tb-ics-file')) { const f = body.querySelector('#tbIcsFile'); if (f) f.click(); return; }
        if (t.hasAttribute('data-tb-ics-url')) {
          const inp = body.querySelector('#tbIcsUrl');
          const url = inp ? (inp.value || '').trim() : '';
          if (!/^https:\/\//.test(url)) { try { showComingSoonToast('Paste a full https calendar URL.'); } catch (_) {} return; }
          t.textContent = 'Connecting...';
          const base = (typeof window !== 'undefined' && window.MEMENTO_SUPABASE_URL) || '';
          const anon = (typeof window !== 'undefined' && window.MEMENTO_SUPABASE_ANON) || '';
          fetch(base + '/functions/v1/ics-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + anon, 'apikey': anon },
            body: JSON.stringify({ url: url })
          }).then(async (res) => {
            if (res.status === 404) { try { showComingSoonToast('Live subscribe needs the ics-proxy deployed (see the morning doc). File import works now.'); } catch (_) {} return; }
            if (!res.ok) { try { showComingSoonToast('That calendar URL did not respond.'); } catch (_) {} return; }
            const text = await res.text();
            const n = self._importIcsText(text);
            if (!state.calendar) state.calendar = { events: [] };
            state.calendar.subUrl = url;
            self._importing = false;
            try { persistNow(); showComingSoonToast(n ? (n + ' events synced.') : 'Connected. No new events.'); } catch (_) {}
            rerender();
          }).catch(() => { try { showComingSoonToast('Could not reach the calendar service.'); } catch (_) {} })
            .finally(() => { try { t.textContent = 'Connect'; } catch (_) {} });
          return;
        }
        if (t.hasAttribute('data-tb-ics-import')) {
          const ta = body.querySelector('#tbIcsPaste');
          const n = self._importIcsText(ta ? ta.value : '');
          self._importing = false;
          try { persistNow(); } catch (_) {}
          rerender();
          try { if (typeof showComingSoonToast === 'function') showComingSoonToast(n ? (n + (n === 1 ? ' event' : ' events') + ' imported.') : 'No events found in that.'); } catch (_) {}
          return;
        }
        if (t.hasAttribute('data-tb-del')) {
          const id = t.getAttribute('data-tb-del');
          const evEl = t.closest('.tb-ev');
          const derivedDay = evEl && evEl.getAttribute('data-derived');
          const i = state.timeblocks.findIndex(b => b.id === id);
          if (i >= 0) {
            const b = state.timeblocks[i];
            if (derivedDay && b.repeat) {
              // A projected instance: only this day, or the whole rule?
              const onlyThis = (typeof confirm === 'function') ? confirm('Remove this block for this day only? Cancel removes the repeat entirely.') : true;
              if (onlyThis) { if (!Array.isArray(b.skip)) b.skip = []; b.skip.push(derivedDay); }
              else state.timeblocks.splice(i, 1);
            } else {
              state.timeblocks.splice(i, 1);
            }
          }
          try { persistNow(); } catch (_) {} rerender(); return;
        }
        if (t.hasAttribute('data-tb-save')) {
          const start = (body.querySelector('#tbStart') || {}).value || '09:00';
          const dur = parseInt((body.querySelector('#tbDur') || {}).value, 10) || 60;
          const type = (body.querySelector('#tbType') || {}).value || 'focus';
          const labEl = body.querySelector('#tbLabel'); let label = labEl ? labEl.value.trim() : '';
          if (!label) label = (self.TYPES[type] && self.TYPES[type].label) || 'Block';
          const nb2 = { id: self._id(), day: self._viewDay(), start: start, durMin: dur, type: type, label: label.slice(0, 80) };
          const rep = (body.querySelector('#tbRepeat') || {}).value || '';
          if (rep) nb2.repeat = rep;
          state.timeblocks.push(nb2);
          self._adding = false; try { persistNow(); } catch (_) {} rerender(); return;
        }
      });
      body.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'tbType') {
          const dot = body.querySelector('#tbTypeDot');
          const meta = self.TYPES[e.target.value];
          if (dot && meta) dot.style.background = meta.color;
        }
      }, true);
      body.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'tbIcsFile' && e.target.files && e.target.files[0]) {
          const fr = new FileReader();
          fr.onload = () => {
            const n = self._importIcsText(String(fr.result || ''));
            self._importing = false;
            try { persistNow(); } catch (_) {}
            rerender();
            try { if (typeof showComingSoonToast === 'function') showComingSoonToast(n ? (n + (n === 1 ? ' event' : ' events') + ' imported.') : 'No events found in that file.'); } catch (_) {}
          };
          fr.readAsText(e.target.files[0]);
        }
      });
      // Drag to move, handle to resize (15-minute snaps). Live transform
      // during the gesture, state written once on release.
      let drag = null;
      body.addEventListener('pointerdown', (e) => {
        const ev = e.target.closest && e.target.closest('.tb-ev[data-id]');
        if (!ev || e.target.closest('.tb-del')) {
          // Drag on EMPTY timeline: sketch a block sized to the drag
          // (Fantastical pattern); release opens the composer prefilled.
          const tl = e.target.closest && e.target.closest('#tbTl');
          if (tl && !e.target.closest('.tb-ev') && !self._adding && !self._importing && (typeof e.button !== 'number' || e.button === 0)) {
            const rect = tl.getBoundingClientRect();
            const minH = parseInt(tl.getAttribute('data-minh'), 10) || 8;
            const m0 = minH * 60 + Math.max(0, (e.clientY - rect.top)) / self.HOUR_H * 60;
            drag = { kind: 'create', tl: tl, rect: rect, minH: minH, m0: Math.round(m0 / 15) * 15, moved: false };
          }
          return;
        }
        if (typeof e.button === 'number' && e.button > 0) return;
        const id = ev.getAttribute('data-id');
        const b = (state.timeblocks || []).find(x => x.id === id);
        if (!b) return;
        drag = {
          id: id, el: ev, startY: e.clientY,
          origStart: self._mins(b.start), origDur: b.durMin || 60,
          mode: e.target.closest('[data-tb-rs]') ? 'resize' : 'move',
          moved: false
        };
        try { ev.setPointerCapture(e.pointerId); } catch (x) {}
        e.preventDefault();
      });
      body.addEventListener('pointermove', (e) => {
        if (!drag) return;
        if (drag.kind === 'create') {
          const m1 = drag.minH * 60 + Math.max(0, (e.clientY - drag.rect.top)) / self.HOUR_H * 60;
          const a = Math.min(drag.m0, m1), z = Math.max(drag.m0, m1);
          if (z - a > 8) drag.moved = true;
          if (!drag.moved) return;
          drag.a = Math.round(a / 15) * 15; drag.z = Math.max(drag.a + 15, Math.round(z / 15) * 15);
          let g = drag.tl.querySelector('#tbGhostNew');
          if (!g) {
            g = document.createElement('div');
            g.id = 'tbGhostNew';
            g.className = 'tb-ev';
            g.style.cssText = 'pointer-events:none;border-style:dashed;opacity:0.7;';
            drag.tl.appendChild(g);
          }
          g.style.top = ((drag.a - drag.minH * 60) / 60 * self.HOUR_H) + 'px';
          g.style.height = Math.max(20, (drag.z - drag.a) / 60 * self.HOUR_H - 2) + 'px';
          g.innerHTML = '<div class="tb-ev__t">' + self._fmt12(String(Math.floor(drag.a / 60)).padStart(2, '0') + ':' + String(drag.a % 60).padStart(2, '0')) + ' to ' + self._fmt12(String(Math.floor(drag.z / 60)).padStart(2, '0') + ':' + String(drag.z % 60).padStart(2, '0')) + '</div>';
          return;
        }
        const dy = e.clientY - drag.startY;
        if (Math.abs(dy) > 4) drag.moved = true;
        if (!drag.moved) return;
        const deltaMin = Math.round((dy / self.HOUR_H) * 60 / 15) * 15;
        if (drag.mode === 'move') {
          const ns = Math.max(0, Math.min(1440 - drag.origDur, drag.origStart + deltaMin));
          drag.newStart = ns;
          drag.el.style.transform = 'translateY(' + ((ns - drag.origStart) / 60 * self.HOUR_H) + 'px)';
        } else {
          const nd = Math.max(15, Math.min(1440 - drag.origStart, drag.origDur + deltaMin));
          drag.newDur = nd;
          drag.el.style.height = Math.max(26, nd / 60 * self.HOUR_H - 2) + 'px';
        }
      });
      const endDrag = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (d.kind === 'create') {
          const g = d.tl && d.tl.querySelector('#tbGhostNew'); if (g) g.remove();
          if (!d.moved) return;
          self._justDragged = true;
          self._addStart = String(Math.floor(d.a / 60)).padStart(2, '0') + ':' + String(d.a % 60).padStart(2, '0');
          self._addDur = d.z - d.a;
          self._adding = true;
          rerender('tbLabel');
          return;
        }
        if (!d.moved) return;
        self._justDragged = true;
        const b = (state.timeblocks || []).find(x => x.id === d.id);
        if (b) {
          if (d.mode === 'move' && typeof d.newStart === 'number') {
            b.start = String(Math.floor(d.newStart / 60)).padStart(2, '0') + ':' + String(d.newStart % 60).padStart(2, '0');
          }
          if (d.mode === 'resize' && typeof d.newDur === 'number') b.durMin = d.newDur;
          try { persistNow(); } catch (x) {}
        }
        rerender();
      };
      body.addEventListener('pointerup', endDrag);
      body.addEventListener('pointercancel', () => { if (drag && drag.el) { drag.el.style.transform = ''; drag.el.style.height = ''; } drag = null; });
      body.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target && e.target.id === 'tbLabel') { e.preventDefault(); const b = body.querySelector('[data-tb-save]'); if (b) b.click(); }
      });
    }
  },
  // ---- The Year I Lived (v19 Life & Memory). A warm "year in review" over the
  // Vivere data: moments kept, days lived, people, places, top kinds of aliveness,
  // and your memories gathered by month. Read-only, derived from what you logged. ----
  yearbook: {
    _MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    _ensureStyles() {
      if (document.getElementById('ybStyles')) return;
      const s = document.createElement('style');
      s.id = 'ybStyles';
      s.textContent = `
      .yb-screen{max-width:640px;margin:0 auto;color:var(--yb-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
        --yb-hi:rgba(var(--ink),0.96);--yb-t1:rgba(var(--ink),0.84);--yb-t2:rgba(var(--ink),0.56);--yb-t3:rgba(var(--ink),0.36);
        --yb-hair:rgba(var(--ink),0.09);--yb-gold:var(--color-vivere);--yb-gold-rgb:var(--color-vivere-rgb,201,162,75);}
      .yb-head{text-align:center;padding:6px 0 22px;}
      .yb-eyebrow{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--yb-gold);margin-bottom:10px;}
      .yb-title{font-size:1.9rem;font-weight:800;letter-spacing:-0.02em;color:var(--yb-hi);line-height:1.1;}
      .yb-sub{font-size:0.9rem;color:var(--yb-t2);margin-top:10px;line-height:1.5;}
      .yb-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:6px 0 26px;padding:18px 0;border-top:1px solid var(--yb-hair);border-bottom:1px solid var(--yb-hair);}
      .yb-stat{text-align:center;}
      .yb-stat__n{font-size:1.7rem;font-weight:800;color:var(--yb-hi);letter-spacing:-0.02em;font-variant-numeric:tabular-nums;line-height:1;}
      .yb-stat__l{font-size:0.58rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--yb-t3);margin-top:6px;}
      .yb-sec-label{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--yb-t3);margin:0 0 12px;}
      .yb-cats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:26px;}
      .yb-cat{display:inline-flex;align-items:center;gap:7px;font-size:0.82rem;color:var(--yb-t1);border:1px solid var(--yb-hair);border-radius:999px;padding:7px 13px;}
      .yb-cat b{color:var(--yb-gold);font-variant-numeric:tabular-nums;}
      .yb-month{margin-bottom:22px;}
      .yb-month__head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px;}
      .yb-month__name{font-size:1.05rem;font-weight:700;color:var(--yb-hi);letter-spacing:-0.01em;}
      .yb-month__count{font-size:0.74rem;color:var(--yb-t3);font-weight:600;}
      .yb-mem{border-left:2px solid rgba(var(--yb-gold-rgb),0.4);padding:4px 0 4px 14px;margin-bottom:10px;}
      .yb-mem__text{font-size:0.92rem;line-height:1.5;color:var(--yb-t1);}
      .yb-mem__meta{font-size:0.72rem;color:var(--yb-t3);margin-top:3px;}
      .yb-alive{margin-top:8px;border-top:1px solid var(--yb-hair);padding-top:20px;}
      .yb-alive__item{font-size:0.9rem;color:var(--yb-t1);padding:7px 0;border-bottom:1px solid var(--yb-hair);line-height:1.4;}
      .yb-empty{text-align:center;padding:36px 22px;border:1px dashed var(--yb-hair);border-radius:calc(10px * var(--rx, 1));}
      .yb-empty__t{font-size:1.05rem;font-weight:650;color:var(--yb-hi);margin-bottom:8px;}
      .yb-empty__s{font-size:0.86rem;color:var(--yb-t2);line-height:1.55;}
      .yb-close{text-align:center;font-size:0.84rem;color:var(--yb-t2);font-style:italic;margin-top:18px;padding-top:18px;border-top:1px solid var(--yb-hair);line-height:1.5;}
      `;
      document.head.appendChild(s);
    },
    render() {
      this._ensureStyles();
      const v = state.vivere || {};
      const mems = Array.isArray(v.memories) ? v.memories.slice() : [];
      const alive = Array.isArray(v.aliveList) ? v.aliveList : [];
      const cats = v.categories || {};
      let h = '<div class="yb-screen">';
      let year = '';
      try { const isos = mems.map(m => m.iso).filter(Boolean).sort(); year = (isos.length ? isos[isos.length - 1] : (typeof getTodayISO === 'function' ? getTodayISO() : '')).slice(0, 4); } catch (_) {}
      h += '<div class="yb-head"><div class="yb-eyebrow">Memento Vivere</div><div class="yb-title">The Year I Lived' + (year ? ' &middot; ' + esc(year) : '') + '</div><div class="yb-sub">Not a metric to optimize. A record that you were here, and you noticed.</div></div>';
      if (!mems.length) {
        h += '<div class="yb-empty"><div class="yb-empty__t">Your year is still being written</div><div class="yb-empty__s">Every moment you keep in Vivere lands here, gathered by month. Save your first one and watch the year fill in.</div></div></div>';
        return h;
      }
      // Stats
      const daySet = {}; const people = {}; const places = {};
      mems.forEach(m => { if (m.iso) daySet[m.iso] = true; const pp = (m.person || '').trim(); if (pp) people[pp.toLowerCase()] = 1; const pl = (m.place || '').trim(); if (pl) places[pl.toLowerCase()] = 1; });
      const stat = (n, l) => '<div class="yb-stat"><div class="yb-stat__n">' + n + '</div><div class="yb-stat__l">' + l + '</div></div>';
      h += '<div class="yb-stats">' + stat(mems.length, 'Moments kept') + stat(Object.keys(daySet).length, 'Days lived') + stat(Object.keys(people).length, 'People') + stat(Object.keys(places).length, 'Places') + '</div>';
      // Top categories
      const catList = (typeof VIVERE_CATEGORIES !== 'undefined' ? VIVERE_CATEGORIES : Object.keys(cats))
        .map(k => ({ k: k, label: (typeof VIVERE_CAT_LABELS !== 'undefined' && VIVERE_CAT_LABELS[k]) || k, n: cats[k] || 0 }))
        .filter(c => c.n > 0).sort((a, b) => b.n - a.n);
      if (catList.length) {
        h += '<div class="yb-sec-label">How you came alive</div><div class="yb-cats">';
        catList.forEach(c => { h += '<span class="yb-cat">' + esc(c.label) + ' <b>' + c.n + '</b></span>'; });
        h += '</div>';
      }
      // Memories by month (most recent first)
      const groups = {};
      mems.forEach(m => { const key = (m.iso || '').slice(0, 7); if (!key) return; (groups[key] = groups[key] || []).push(m); });
      const monthKeys = Object.keys(groups).sort().reverse();
      if (monthKeys.length) {
        h += '<div class="yb-sec-label">Your months</div>';
        monthKeys.forEach(mk => {
          const list = groups[mk];
          const mi = parseInt(mk.slice(5, 7), 10) - 1;
          const mName = (this._MONTHS[mi] || mk) + ' ' + mk.slice(0, 4);
          h += '<div class="yb-month"><div class="yb-month__head"><span class="yb-month__name">' + esc(mName) + '</span><span class="yb-month__count">' + list.length + ' moment' + (list.length === 1 ? '' : 's') + '</span></div>';
          list.slice().reverse().forEach(m => {
            const meta = [];
            if (m.person) meta.push(esc(m.person));
            if (m.place) meta.push(esc(m.place));
            if (typeof VIVERE_CAT_LABELS !== 'undefined' && m.category && VIVERE_CAT_LABELS[m.category]) meta.push(esc(VIVERE_CAT_LABELS[m.category]));
            h += '<div class="yb-mem"><div class="yb-mem__text">' + esc(m.text || '') + '</div>' + (meta.length ? '<div class="yb-mem__meta">' + meta.join(' &middot; ') + '</div>' : '') + '</div>';
          });
          h += '</div>';
        });
      }
      // Alive list
      if (alive.length) {
        h += '<div class="yb-alive"><div class="yb-sec-label">What makes you feel alive</div>';
        alive.slice(0, 12).forEach(a => { const t = (typeof a === 'string') ? a : (a && a.text) || ''; if (t) h += '<div class="yb-alive__item">' + esc(t) + '</div>'; });
        h += '</div>';
      }
      h += '<div class="yb-close">This is the year you are building. Keep noticing.</div>';
      h += '</div>';
      return h;
    },
    bind() {}
  },
  // ---- People I care about (v19 Life & Memory, light personal CRM). The people
  // who matter, with how often you want to stay in touch and when you last did.
  // A gentle nudge when it has been a while. No social graph, just intention. ----
  people: {
    _adding: false,
    CADENCES: [[7, 'Weekly'], [14, 'Every 2 weeks'], [30, 'Monthly'], [90, 'Quarterly']],
    _id() { return 'pp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    _today() { return (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10); },
    _daysSince(iso) { if (!iso) return null; const t = Date.parse(iso + 'T00:00:00Z'); if (isNaN(t)) return null; return Math.floor((Date.parse(this._today() + 'T00:00:00Z') - t) / 86400000); },
    _agoLabel(d) { if (d == null) return 'No contact logged yet'; if (d <= 0) return 'Reached out today'; if (d === 1) return 'Yesterday'; if (d < 7) return d + ' days ago'; if (d < 14) return 'Last week'; if (d < 60) return Math.round(d / 7) + ' weeks ago'; const m = Math.round(d / 30); return m + ' month' + (m === 1 ? '' : 's') + ' ago'; },
    _ensureStyles() {
      if (document.getElementById('pplStyles')) return;
      const s = document.createElement('style');
      s.id = 'pplStyles';
      s.textContent = `
      .ppl-screen{max-width:600px;margin:0 auto;color:var(--ppl-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
        --ppl-hi:rgba(var(--ink),0.95);--ppl-t1:rgba(var(--ink),0.85);--ppl-t2:rgba(var(--ink),0.55);--ppl-t3:rgba(var(--ink),0.36);
        --ppl-hair:rgba(var(--ink),0.09);--ppl-hair-2:rgba(var(--ink),0.15);--ppl-card:rgba(var(--ink),0.025);--ppl-gold:var(--color-vivere);}
      .ppl-intro{font-size:0.84rem;line-height:1.5;color:var(--ppl-t2);margin-bottom:16px;}
      .ppl-list{display:flex;flex-direction:column;gap:9px;}
      .ppl{border:1px solid var(--ppl-hair);border-radius:calc(8px * var(--rx, 1));background:var(--ppl-card);padding:13px 14px;}
      .ppl.is-due{border-color:rgba(var(--color-vivere-rgb,201,162,75),0.45);background:linear-gradient(135deg,rgba(var(--color-vivere-rgb,201,162,75),0.07),rgba(var(--ink),0.012));}
      .ppl__top{display:flex;align-items:center;gap:11px;}
      .ppl__name{flex:1;min-width:0;font-size:0.98rem;font-weight:650;color:var(--ppl-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ppl__due{flex:none;font-size:0.58rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#0b0b0d;background:var(--ppl-gold);border-radius:calc(5px * var(--rx, 1));padding:3px 7px;}
      .ppl__del{flex:none;border:none;background:transparent;color:var(--ppl-t3);font-size:1.15rem;line-height:1;cursor:pointer;padding:2px 6px;border-radius:calc(5px * var(--rx, 1));opacity:0;transition:opacity .15s ease,color .15s ease,background .15s ease;}
      .ppl:hover .ppl__del{opacity:1;}
      .ppl__del:hover{color:#ff6b6b;background:rgba(255,107,107,0.1);}
      .ppl__meta{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}
      .ppl__ago{font-size:0.78rem;color:var(--ppl-t2);}
      .ppl__cad{font-size:0.66rem;color:var(--ppl-t3);border:1px solid var(--ppl-hair-2);border-radius:calc(5px * var(--rx, 1));padding:2px 7px;}
      .ppl__notes{font-size:0.8rem;color:var(--ppl-t2);margin-top:8px;line-height:1.45;}
      .ppl__reach{margin-top:10px;font:inherit;font-size:0.78rem;font-weight:650;cursor:pointer;border:1px solid var(--ppl-hair-2);background:transparent;color:var(--ppl-t1);border-radius:calc(6px * var(--rx, 1));padding:8px 13px;transition:color .15s ease,border-color .15s ease;}
      .ppl__reach:hover{color:var(--ppl-hi);border-color:var(--ppl-gold);}
      .ppl-empty{margin-top:8px;border:1px dashed var(--ppl-hair-2);border-radius:calc(8px * var(--rx, 1));padding:26px 22px;text-align:center;}
      .ppl-empty__t{font-size:0.96rem;font-weight:600;color:var(--ppl-hi);margin-bottom:6px;}
      .ppl-empty__s{font-size:0.82rem;color:var(--ppl-t2);line-height:1.5;margin-bottom:16px;}
      .ppl-comp{margin-top:14px;border:1px solid var(--ppl-hair-2);border-radius:calc(8px * var(--rx, 1));background:var(--ppl-card);padding:13px;display:flex;flex-wrap:wrap;gap:9px;align-items:center;}
      .ppl-inp,.ppl-sel{font:inherit;font-size:0.86rem;color:var(--ppl-hi);background:var(--kfill-04);border:1px solid var(--ppl-hair-2);border-radius:calc(6px * var(--rx, 1));padding:9px 11px;outline:none;}
      .ppl-inp{flex:1;min-width:150px;}
      .ppl-inp:focus,.ppl-sel:focus{border-color:rgba(var(--ink),0.32);}
      .ppl-inp::placeholder{color:var(--ppl-t3);}
      .ppl-sel{cursor:pointer;}
      .ppl-comp__btns{display:flex;gap:8px;margin-left:auto;}
      .ppl-btn{font:inherit;font-size:0.82rem;font-weight:650;cursor:pointer;border-radius:calc(6px * var(--rx, 1));padding:9px 14px;border:1px solid var(--ppl-hair-2);background:transparent;color:var(--ppl-t2);transition:all .15s ease;}
      .ppl-btn:hover{color:var(--ppl-hi);border-color:rgba(var(--ink),0.3);}
      .ppl-btn--p{background:var(--ppl-gold);border-color:var(--ppl-gold);color:#0b0b0d;}
      .ppl-btn--p:hover{filter:brightness(1.08);color:#0b0b0d;}
      .ppl-foot{margin-top:14px;}
      `;
      document.head.appendChild(s);
    },
    _cadOptions(sel) { return this.CADENCES.map(c => '<option value="' + c[0] + '"' + (c[0] === sel ? ' selected' : '') + '>' + esc(c[1]) + '</option>').join(''); },
    _cadLabel(d) { const m = { 7: 'Weekly', 14: 'Every 2 weeks', 30: 'Monthly', 90: 'Quarterly' }; return m[d] || ('Every ' + d + ' days'); },
    render() {
      this._ensureStyles();
      const people = (Array.isArray(state.people) ? state.people : []).slice();
      const self = this;
      // Sort most-overdue first (days since contact minus cadence).
      people.sort((a, b) => {
        const oa = (self._daysSince(a.lastContactISO) == null ? 9999 : self._daysSince(a.lastContactISO) - (a.cadenceDays || 30));
        const ob = (self._daysSince(b.lastContactISO) == null ? 9999 : self._daysSince(b.lastContactISO) - (b.cadenceDays || 30));
        return ob - oa;
      });
      let h = '<div class="ppl-screen">';
      h += '<div class="ppl-intro">The people who matter, and how often you want to stay close. Memento nudges you when it has been a while, gently.</div>';
      if (!people.length) {
        h += '<div class="ppl-empty"><div class="ppl-empty__t">No one here yet</div><div class="ppl-empty__s">Add the few people you never want to drift from. You will get a gentle nudge when it is time to reach out.</div></div>';
      } else {
        h += '<div class="ppl-list">';
        people.forEach(p => {
          const days = self._daysSince(p.lastContactISO);
          const cad = p.cadenceDays || 30;
          const due = (days == null) || (days > cad);
          h += '<div class="ppl' + (due ? ' is-due' : '') + '" data-id="' + esc(p.id) + '">';
          h += '<div class="ppl__top"><span class="ppl__name">' + esc(p.name || 'Someone') + '</span>' + (due ? '<span class="ppl__due">Reach out</span>' : '') + '<button class="ppl__del" data-ppl-del="' + esc(p.id) + '" aria-label="Remove person" title="Remove">&times;</button></div>';
          h += '<div class="ppl__meta"><span class="ppl__ago">' + esc(self._agoLabel(days)) + '</span><span class="ppl__cad">' + esc(self._cadLabel(cad)) + '</span></div>';
          if (p.notes) h += '<div class="ppl__notes">' + esc(p.notes) + '</div>';
          h += '<button class="ppl__reach" data-ppl-reach="' + esc(p.id) + '">I reached out</button>';
          h += '</div>';
        });
        h += '</div>';
      }
      if (this._adding) {
        h += '<div class="ppl-comp"><input class="ppl-inp" id="pplName" type="text" maxlength="60" placeholder="Name"><select class="ppl-sel" id="pplCad" aria-label="How often">' + this._cadOptions(30) + '</select><input class="ppl-inp" id="pplNotes" type="text" maxlength="140" placeholder="A note (optional)"><div class="ppl-comp__btns"><button class="ppl-btn ppl-btn--p" data-ppl-save="1">Add</button><button class="ppl-btn" data-ppl-cancel="1">Cancel</button></div></div>';
      } else {
        h += '<div class="ppl-foot"><button class="ppl-btn ppl-btn--p" data-ppl-add="1">Add someone</button></div>';
      }
      h += '</div>';
      return h;
    },
    afterOpen(body) { this._adding = false; body.innerHTML = this.render(); },
    bind(body) {
      const self = this;
      const rerender = (focusId) => { body.innerHTML = self.render(); if (focusId) { const el = body.querySelector('#' + focusId); if (el) { try { el.focus(); } catch (_) {} } } };
      if (body._pplBound) return;
      body._pplBound = true;
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-ppl-add],[data-ppl-cancel],[data-ppl-save],[data-ppl-reach],[data-ppl-del]');
        if (!t || !body.querySelector('.ppl-screen')) return;
        if (!Array.isArray(state.people)) state.people = [];
        if (t.hasAttribute('data-ppl-add')) { self._adding = true; rerender('pplName'); return; }
        if (t.hasAttribute('data-ppl-cancel')) { self._adding = false; rerender(); return; }
        if (t.hasAttribute('data-ppl-reach')) {
          const p = state.people.find(x => x.id === t.getAttribute('data-ppl-reach')); if (p) p.lastContactISO = self._today();
          try { persistNow(); } catch (_) {} rerender(); return;
        }
        if (t.hasAttribute('data-ppl-del')) {
          const i = state.people.findIndex(x => x.id === t.getAttribute('data-ppl-del')); if (i >= 0) state.people.splice(i, 1);
          try { persistNow(); } catch (_) {} rerender(); return;
        }
        if (t.hasAttribute('data-ppl-save')) {
          const nameEl = body.querySelector('#pplName'); const name = nameEl ? nameEl.value.trim() : '';
          if (!name) { if (nameEl) nameEl.focus(); return; }
          const cad = parseInt((body.querySelector('#pplCad') || {}).value, 10) || 30;
          const notes = (body.querySelector('#pplNotes') || {}).value || '';
          state.people.push({ id: self._id(), name: name.slice(0, 60), cadenceDays: cad, lastContactISO: self._today(), notes: notes.trim().slice(0, 140) });
          self._adding = false; try { persistNow(); } catch (_) {} rerender(); return;
        }
      });
      body.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target && (e.target.id === 'pplName' || e.target.id === 'pplNotes')) { e.preventDefault(); const b = body.querySelector('[data-ppl-save]'); if (b) b.click(); }
      });
    }
  },
  // ---- Weekly Review ritual (v19 premium). A short guided Sunday review that
  // recaps the week from real data, captures wins / what pulled you off / a
  // lesson / next week's one thing, persists to state.vivere.weeklyReviews, and
  // ends on Memento's signature Mori beat. The retention rhythm that brings
  // people back week after week. ----
  weeklyreview: {
    _step: 0,
    _finished: false,
    _todayISO() { return (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10); },
    _weekKey() { const d = new Date(); const oneJan = new Date(d.getFullYear(), 0, 1); const day = Math.floor((d - oneJan) / 86400000); return d.getFullYear() + '-W' + String(Math.ceil((day + oneJan.getDay() + 1) / 7)).padStart(2, '0'); },
    _stats() {
      const todayN = Math.floor(Date.parse(this._todayISO() + 'T00:00:00Z') / 86400000);
      // Bucket by LOCAL day (completionHistory.date is a full ISO timestamp; a raw
      // slice is the UTC day and would drop an evening US action from the window).
      const inWk = (iso) => { const day = (typeof isoToLocalDay === 'function') ? isoToLocalDay(iso) : String(iso || '').slice(0, 10); if (!day) return false; const t = Date.parse(day + 'T00:00:00Z'); if (isNaN(t)) return false; const n = Math.floor(t / 86400000); return (todayN - n >= 0 && todayN - n < 7); };
      const actions = ((state.action && state.action.completionHistory) || []).filter(h => h && inWk(h.date)).length;
      const deep = ((state.deepwork && state.deepwork.sessions) || []).filter(s => s && inWk(s.iso || s.date)).length;
      const refl = ((state.reflection && state.reflection.entries) || []).filter(e => e && inWk(e.iso || e.date)).length;
      const mins = ((state.deepwork && state.deepwork.sessions) || []).filter(s => s && inWk(s.iso || s.date)).reduce((a, s) => a + (s.minutes || 0), 0);
      return { actions, deep, refl, hours: (mins / 60) };
    },
    _lastIntention() {
      const arr = (state.vivere && Array.isArray(state.vivere.weeklyReviews)) ? state.vivere.weeklyReviews : [];
      for (let i = arr.length - 1; i >= 0; i--) { if (arr[i] && arr[i].nextIntention) return arr[i].nextIntention; }
      return '';
    },
    _weeksLeft() {
      try { if (state.mori && state.mori.birthYear && typeof moriYearsRemaining === 'function') { const y = moriYearsRemaining(state.mori.birthYear, state.mori.lifeExpectancy || 80); return Math.max(0, Math.round(y * 52)); } } catch (_) {}
      return null;
    },
    _ensureStyles() {
      if (document.getElementById('wrStyles')) return;
      const s = document.createElement('style');
      s.id = 'wrStyles';
      s.textContent = `
      .wr-screen{max-width:540px;margin:0 auto;text-align:center;color:var(--wr-t1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:8px 0 12px;
        --wr-hi:rgba(var(--ink),0.96);--wr-t1:rgba(var(--ink),0.82);--wr-t2:rgba(var(--ink),0.55);--wr-t3:rgba(var(--ink),0.4);
        --wr-hair:rgba(var(--ink),0.1);--wr-hair-2:rgba(var(--ink),0.16);--wr-card:rgba(var(--ink),0.03);--wr-accent:var(--accent,var(--success));}
      .wr-ico{font-size:1.9rem;margin-bottom:12px;}
      .wr-step{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--wr-t3);margin-bottom:16px;}
      .wr-q{font-size:1.38rem;font-weight:700;letter-spacing:-0.01em;color:var(--wr-hi);line-height:1.25;}
      .wr-sub{font-size:0.9rem;color:var(--wr-t2);line-height:1.5;margin-top:10px;}
      .wr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 6px;}
      .wr-stat{border:1px solid var(--wr-hair);border-radius:calc(10px * var(--rx, 1));background:var(--wr-card);padding:14px 8px;}
      .wr-stat__n{font-size:1.5rem;font-weight:800;color:var(--wr-hi);letter-spacing:-0.02em;font-variant-numeric:tabular-nums;line-height:1;}
      .wr-stat__l{font-size:0.58rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--wr-t3);margin-top:6px;}
      .wr-last{margin-top:18px;font-size:0.88rem;color:var(--wr-t2);line-height:1.5;border-top:1px solid var(--wr-hair);padding-top:16px;}
      .wr-last b{color:var(--wr-hi);font-weight:600;}
      .wr-input,.wr-ta{width:100%;box-sizing:border-box;font:inherit;font-size:0.98rem;color:var(--wr-hi);background:var(--kfill-04);border:1px solid var(--wr-hair-2);border-radius:calc(8px * var(--rx, 1));padding:13px 14px;outline:none;text-align:left;margin-top:16px;}
      .wr-ta{resize:vertical;line-height:1.55;min-height:92px;}
      .wr-input:focus,.wr-ta:focus{border-color:rgba(var(--ink),0.34);}
      .wr-input::placeholder,.wr-ta::placeholder{color:var(--wr-t3);}
      .wr-btns{display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap;}
      .wr-btn{font:inherit;font-size:0.9rem;font-weight:650;cursor:pointer;border-radius:calc(8px * var(--rx, 1));padding:12px 22px;border:1px solid var(--wr-hair-2);background:transparent;color:var(--wr-t1);transition:color .15s ease,border-color .15s ease,filter .15s ease;}
      .wr-btn:hover{color:var(--wr-hi);border-color:rgba(var(--ink),0.3);}
      .wr-btn--p{background:var(--wr-accent);border-color:var(--wr-accent);color:#fff;}
      .wr-btn--p:hover{filter:brightness(1.08);color:#fff;}
      .wr-skip{display:inline-block;margin-top:16px;font:inherit;font-size:0.8rem;color:var(--wr-t3);background:none;border:none;cursor:pointer;}
      .wr-skip:hover{color:var(--wr-t1);}
      .wr-mori{font-size:1.18rem;font-weight:650;color:var(--wr-hi);line-height:1.4;max-width:30ch;margin:0 auto;}
      .wr-mori b{color:var(--wr-accent);}
      `;
      document.head.appendChild(s);
    },
    render() {
      this._ensureStyles();
      const st = this._stats();
      let h = '<div class="wr-screen">';
      if (this._finished) {
        const wl = this._weeksLeft();
        h += '<div class="wr-ico">&#128218;</div>';
        h += '<div class="wr-q">The week is closed.</div>';
        if (wl != null) h += '<div class="wr-mori" style="margin-top:14px;">That is one of about <b>' + wl + '</b> weeks you have left. You spent it showing up.</div>';
        else h += '<div class="wr-sub">You spent this week showing up. That is the whole game.</div>';
        h += '<div class="wr-btns"><button class="wr-btn wr-btn--p" data-wr-close="1">Done</button></div>';
        h += '</div>';
        return h;
      }
      const last = this._lastIntention();
      if (this._step === 0) {
        h += '<div class="wr-ico">&#128218;</div><div class="wr-step">Weekly review &middot; recap</div>';
        h += '<div class="wr-q">Here is your week.</div>';
        h += '<div class="wr-stats">'
          + '<div class="wr-stat"><div class="wr-stat__n">' + st.actions + '</div><div class="wr-stat__l">Actions</div></div>'
          + '<div class="wr-stat"><div class="wr-stat__n">' + st.hours.toFixed(1) + 'h</div><div class="wr-stat__l">Deep work</div></div>'
          + '<div class="wr-stat"><div class="wr-stat__n">' + st.refl + '</div><div class="wr-stat__l">Reflections</div></div>'
          + '</div>';
        if (last) h += '<div class="wr-last">Last week you said your one thing was: <b>' + esc(last) + '</b></div>';
        h += '<div class="wr-btns"><button class="wr-btn wr-btn--p" data-wr-next="1">Continue</button></div>';
      } else if (this._step === 1) {
        h += '<div class="wr-ico">&#10024;</div><div class="wr-step">Weekly review &middot; step 1 of 3</div>';
        h += '<div class="wr-q">What went well?</div><div class="wr-sub">Name a win. Big or small, it counts.</div>';
        h += '<textarea class="wr-ta" id="wrWins" maxlength="600" placeholder="This week I..."></textarea>';
        h += '<div class="wr-btns"><button class="wr-btn wr-btn--p" data-wr-next="1">Continue</button></div>';
      } else if (this._step === 2) {
        h += '<div class="wr-ico">&#129517;</div><div class="wr-step">Weekly review &middot; step 2 of 3</div>';
        h += '<div class="wr-q">What pulled you off?</div><div class="wr-sub">No judgment. Naming it is how you beat it next week.</div>';
        h += '<textarea class="wr-ta" id="wrOff" maxlength="600" placeholder="What kept getting in the way..."></textarea>';
        h += '<div class="wr-btns"><button class="wr-btn wr-btn--p" data-wr-next="1">Continue</button></div>';
      } else if (this._step === 3) {
        h += '<div class="wr-ico">&#128161;</div><div class="wr-step">Weekly review &middot; step 3 of 3</div>';
        h += '<div class="wr-q">One lesson from the week.</div><div class="wr-sub">The thing you want to carry forward.</div>';
        h += '<textarea class="wr-ta" id="wrLesson" maxlength="400" placeholder="What I learned..."></textarea>';
        h += '<div class="wr-btns"><button class="wr-btn wr-btn--p" data-wr-next="1">Continue</button></div>';
      } else {
        h += '<div class="wr-ico">&#127919;</div><div class="wr-step">Weekly review &middot; reset</div>';
        h += '<div class="wr-q">Your one thing for next week.</div><div class="wr-sub">Set the intention now, while the week is fresh in mind.</div>';
        h += '<input class="wr-input" id="wrNext" type="text" maxlength="160" placeholder="Next week, the one thing is...">';
        h += '<div class="wr-btns"><button class="wr-btn wr-btn--p" data-wr-finish="1">Close the week</button></div>';
      }
      h += '<button class="wr-skip" data-wr-skip="1">Skip for now</button>';
      h += '</div>';
      return h;
    },
    afterOpen(body) {
      this._step = 0; this._finished = false;
      this._draft = { wins: '', off: '', lesson: '', next: '' };
      try { if (Sheet && Sheet.titleEl) Sheet.titleEl.textContent = 'Weekly review'; } catch (_) {}
      body.innerHTML = this.render();
    },
    _capture(body) {
      if (!this._draft) this._draft = { wins: '', off: '', lesson: '', next: '' };
      const w = body.querySelector('#wrWins'); if (w) this._draft.wins = w.value.trim();
      const o = body.querySelector('#wrOff'); if (o) this._draft.off = o.value.trim();
      const l = body.querySelector('#wrLesson'); if (l) this._draft.lesson = l.value.trim();
      const n = body.querySelector('#wrNext'); if (n) this._draft.next = n.value.trim();
    },
    _finish() {
      const d = this._draft || {};
      if (!state.vivere || typeof state.vivere !== 'object') state.vivere = {};
      if (!Array.isArray(state.vivere.weeklyReviews)) state.vivere.weeklyReviews = [];
      const st = this._stats();
      state.vivere.weeklyReviews.push({ week: this._weekKey(), iso: this._todayISO(), ts: Date.now(), stats: st, wins: (d.wins || '').slice(0, 600), offtrack: (d.off || '').slice(0, 600), lesson: (d.lesson || '').slice(0, 400), nextIntention: (d.next || '').slice(0, 160) });
      if (state.vivere.weeklyReviews.length > 200) state.vivere.weeklyReviews = state.vivere.weeklyReviews.slice(-200);
      try { if (!state.meta) state.meta = {}; state.meta.weeklyReviewWeek = this._weekKey(); } catch (_) {}
      try { writeProofEvent('weekly-review', { title: 'Weekly review', text: (d.next ? ('Next: ' + d.next) : 'Reviewed the week'), module: 'vivere' }); } catch (_) {}
      this._finished = true;
      try { persistNow(); } catch (_) {}
      try { renderAll(); } catch (_) {}
    },
    bind(body) {
      const self = this;
      const rerender = () => { body.innerHTML = self.render(); const f = body.querySelector('.wr-input, .wr-ta'); if (f) { try { f.focus(); } catch (_) {} } };
      if (body._wrBound) return;
      body._wrBound = true;
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-wr-next],[data-wr-finish],[data-wr-skip],[data-wr-close]');
        if (!t || !body.querySelector('.wr-screen')) return;
        if (t.hasAttribute('data-wr-close')) { try { Sheet.close(); } catch (_) {} return; }
        if (t.hasAttribute('data-wr-skip')) { try { if (!state.meta) state.meta = {}; state.meta.weeklyReviewWeek = self._weekKey(); persistNow(); } catch (_) {} try { renderAll(); } catch (_) {} try { Sheet.close(); } catch (_) {} return; }
        if (t.hasAttribute('data-wr-next')) { self._capture(body); self._step += 1; rerender(); return; }
        if (t.hasAttribute('data-wr-finish')) { self._capture(body); self._finish(); rerender(); return; }
      });
    }
  },
  // Personality (Myth of Sisyphus) module removed; its sheet template is gone so
  // it can never open as a sheet. The game CSS/JS elsewhere is left unreferenced.
  clarity: {
    render() {
      if (!state.clarity.completed) {
        wizardStep = 0;
        wizardAnswers = {};
        return renderWizard();
      }
      // Show Neutron Star summary
      const a = state.clarity.answers;
      let html = '';

      // Neutron Star
      if (a.neutronStar) {
        html += '<div style="text-align:center;margin-bottom:24px;">';
        html += '<div style="font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-clarity);margin-bottom:8px;">Your Neutron Star</div>';
        html += '<div style="font-size:1.25rem;font-weight:700;line-height:1.4;">' + esc(a.neutronStar) + '</div>';
        html += '</div>';
      }

      html += '<div class="clarity-summary">';
      const items = [
        a.identitySentence ? ['Identity', a.identitySentence] : null,
        a.whyItMatters ? ['Why It Matters', a.whyItMatters] : null,
        a.emotionalAnchor ? ['Emotional Anchor', a.emotionalAnchor] : null,
        a.ninetyDayGoal ? ['90-Day Vision', a.ninetyDayGoal] : null,
      ].filter(Boolean).filter(([, v]) => v);

      items.forEach(([label, value]) => {
        html += `<div class="clarity-summary__item">
          <div class="clarity-summary__label">${esc(label)}</div>
          <div class="clarity-summary__value">${esc(value)}</div>
        </div>`;
      });
      html += '</div>';
      html += renderClarityDrift();
      html += '<button class="sheet-btn sheet-btn--clarity" id="clarityRedo" style="margin-top:24px;opacity:0.5;font-size:0.875rem;">Start over</button>';
      return html;
    },
    bind(container) {
      if (!state.clarity.completed) {
        bindWizard(container);
      } else {
        const revisit = container.querySelector('#clarityRevisit');
        if (revisit) revisit.addEventListener('click', () => {
          Sheet.close();
          setTimeout(() => ClarityExperience.openTutorialOnly(), 400);
        });
        const redo = container.querySelector('#clarityRedo');
        if (redo) redo.addEventListener('click', () => {
          Sheet.close();
          setTimeout(() => {
            state.clarity.completed = false;
            state.clarity.tutorialSeen = false;
            persistNow();
            ClarityExperience.open();
          }, 400);
        });
      }
    }
  },

  action: {
    render() {
      if (!state.clarity.completed) {
        return `<div style="padding:8px 0 4px;">
          <div style="font-size:1.35rem;font-weight:700;line-height:1.2;margin-bottom:10px;">Action starts after Clarity.</div>
          <div style="font-size:0.94rem;line-height:1.6;color:var(--text-2);margin-bottom:18px;">First lock in your Neutron Star. Then Action can turn it into the highest-leverage next moves.</div>
          <button class="sheet-btn sheet-btn--action" id="actionGoClarity">Go To Clarity</button>
        </div>`;
      }
      if (hasActionPlan() && actionPlanMatchesClarity()) {
        const pa = state.action.primaryAction;
        return `<div style="padding:4px 0;"><div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(255,120,110,0.7);margin-bottom:6px;">Primary Action</div><div style="font-size:1.05rem;font-weight:700;margin-bottom:6px;">${esc(pa.title)}</div><div style="font-size:0.85rem;color:var(--text-2);line-height:1.5;">${esc(pa.howToStart)}</div><button class="sheet-btn sheet-btn--action" id="actionOpenExp" style="margin-top:16px;">View Action Plan</button></div>`;
      }
      return `<div style="padding:8px 0 4px;"><div style="font-size:0.94rem;line-height:1.6;color:var(--text-2);margin-bottom:16px;">Tap to build your action plan from your Neutron Star.</div><button class="sheet-btn sheet-btn--action" id="actionOpenExp">Find My Actions</button></div>`;
    },
    bind(container) {
      container.querySelector('#actionGoClarity')?.addEventListener('click', () => {
        if (ActionExperience.isOpen) ActionExperience.close();
        if (Sheet.isOpen) Sheet.close();
        setTimeout(() => ClarityExperience.open(), 420);
      });
      container.querySelector('#actionOpenExp')?.addEventListener('click', () => {
        if (Sheet.isOpen) Sheet.close();
        setTimeout(() => ActionExperience.open(), 100);
      });
    }
  },

  streak: {
    render() {
      const today = getTodayISO();
      const done = consistencyDayHasMainAction(consistencyStats().counts[today]);
      const st = consistencyStats();
      // Conditionally add the staggered reveal cascade only on a fresh open
      // (Sheet._expReveal), never on internal re-renders (day toggles, view swaps).
      const fresh = (typeof Sheet !== 'undefined' && Sheet._expReveal);
      const sec = (i, inner) => '<div class="exp-section' + (fresh ? ' exp-reveal" style="--i:' + i + '"' : '"') + '>' + inner + '</div>';
      const markBtn = done
        ? '<button class="sheet-btn sheet-btn--green" disabled>Done for today</button>'
        : '<button class="sheet-btn sheet-btn--green" id="streakMark">Mark today complete</button>';
      let proofCount = 0;
      try { proofCount = (typeof ProofTrail !== 'undefined' && ProofTrail._allEvents) ? ProofTrail._allEvents().length : 0; } catch (e) {}
      const proofLink = '<button class="sheet-btn" id="streakProofTrail" style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface-1);color:var(--text-hi);border:1px solid var(--hairline);"><span>Proof trail</span><span style="color:var(--text-3);font-size:0.78rem;font-weight:600;">' + proofCount + ' entries</span></button>';

      let html = '<div class="exp-shell exp-shell--top">';
      html += renderRecordMoment();
      html += sec(0, renderConsistencyHero(st, done));
      html += sec(1, markBtn);
      html += sec(2, renderConsistencyStats());
      html += sec(3, proofLink);
      html += sec(4, renderConsistencyViews());
      html += sec(5, renderConsistencyBreakdowns());
      html += sec(6, renderMilestoneLadder());
      html += oneThingFooterHtml();
      html += '</div>';
      return html;
    },
    bind(container) {
      const reRender = () => {
        container.innerHTML = SHEET_TEMPLATES.streak.render();
        SHEET_TEMPLATES.streak.bind(container);
      };
      const markBtn = container.querySelector('#streakMark');
      if (markBtn) markBtn.addEventListener('click', () => {
        const today = getTodayISO();
        if (!state.streak.history.includes(today)) state.streak.history.push(today);
        if (state.streak.history.length > 400) state.streak.history = state.streak.history.slice(-400);
        recalculateStreak();
        persistNow();
        renderAll();
        try { maybeShowMilestoneBanner(); } catch (_) {}
        reRender();
      });
      const proofBtn = container.querySelector('#streakProofTrail');
      if (proofBtn) proofBtn.addEventListener('click', () => {
        try { if (typeof ProofTrail !== 'undefined') ProofTrail.open(); } catch (e) {}
      });

      // View toggle (Heatmap/Chain/Month) and breakdown scale (Week/Month/Year).
      // Bound on the .exp-shell (which is replaced on every re-render) so the
      // delegated listener never accumulates on the persistent sheet body.
      const shell = container.querySelector('.exp-shell');
      if (shell) shell.addEventListener('click', (e) => {
        const vb = e.target.closest('[data-cview]');
        if (vb) { if (!state.ui) state.ui = {}; state.ui.consistencyView = vb.getAttribute('data-cview'); try { persistNow(); } catch (_) {} reRender(); return; }
        const sb = e.target.closest('[data-cscale]');
        if (sb) { if (!state.ui) state.ui = {}; state.ui.consistencyScale = sb.getAttribute('data-cscale'); try { persistNow(); } catch (_) {} reRender(); return; }
      });

      // Calendar nav (only present in Month view)
      bindCalendarNav(container);

      // Chain view: tapping a cell toggles that day (same path as the calendar).
      const chain = container.querySelector('.chain');
      if (chain) chain.addEventListener('click', (e) => {
        const cell = e.target.closest('.chain__cell--tap[data-date]');
        if (cell && chain.contains(cell)) toggleStreakDay(cell.dataset.date, container);
      });

      // Heatmap appearance toggles: write state.ui, persist, re-render the sheet,
      // then re-open the Customize panel so the user stays in context.
      const hmc = container.querySelector('.hmctl');
      if (hmc) hmc.addEventListener('click', (e) => {
        const b = e.target.closest('[data-hm]');
        if (!b) return;
        const g = b.getAttribute('data-hm');
        const v = b.getAttribute('data-val');
        if (!state.ui) state.ui = {};
        if (g === 'shape') state.ui.heatmapShape = v;
        else if (g === 'spacing') state.ui.heatmapSpacing = v;
        else if (g === 'palette') state.ui.heatmapPalette = v;
        persistNow();
        renderAll();
        reRender();
        const d = container.querySelector('.hmcustom');
        if (d) d.open = true;
      });

      // Heatmap backfill: tapping any past/present cell runs the SAME day toggle
      // the calendar uses (delegated, so it survives the re-render). Keep the
      // user's horizontal scroll position so a backfilled older day stays in view.
      const cgraph = container.querySelector('.cgraph');
      if (cgraph) {
        const fire = (cell) => {
          // Keep the user's horizontal position across the re-render so a
          // backfilled older day does not snap the grid back to the right edge.
          // The fresh bind queues a right-edge rAF during toggleStreakDay; this
          // rAF is registered afterward, so it runs later in the same frame and
          // wins, landing the grid back where the user was looking.
          const sc = container.querySelector('.cgraph__scroll');
          const keepScroll = sc ? sc.scrollLeft : 0;
          toggleStreakDay(cell.dataset.date, container);
          requestAnimationFrame(() => {
            const sc2 = container.querySelector('.cgraph__scroll');
            if (sc2) sc2.scrollLeft = keepScroll;
          });
        };
        cgraph.addEventListener('click', (e) => {
          const cell = e.target.closest('.cgraph__cell--tap[data-date]');
          if (cell && cgraph.contains(cell)) fire(cell);
        });
        cgraph.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          const cell = e.target.closest('.cgraph__cell--tap[data-date]');
          if (cell && cgraph.contains(cell)) { e.preventDefault(); fire(cell); }
        });
      }

      // Land the heatmap on the most recent weeks (right edge) when the sheet
      // first opens. A backfill restores its own scroll synchronously above, so
      // this rAF only governs the initial open.
      requestAnimationFrame(() => {
        const sc = container.querySelector('.cgraph__scroll');
        if (sc) sc.scrollLeft = sc.scrollWidth;
      });
    }
  },

  flow: {
    render() {
      const items = state.flow.items || [];
      const doneCount = items.filter(i => i.done).length;

      let html = `<div style="font-size:0.875rem;color:var(--text-2);margin-bottom:16px;font-weight:500">${doneCount} / ${items.length} protection steps active</div>`;

      // Quick-add chips
      html += '<div class="quick-chips">';
      ['Delete Instagram', 'Airplane mode during focus', 'App timer (30 min)', 'No phone in bedroom', 'Grayscale after 9pm'].forEach(chip => {
        if (!items.find(i => i.text === chip)) {
          html += `<div class="chip" data-chip="${esc(chip)}">${esc(chip)}</div>`;
        }
      });
      html += '</div>';

      // Add custom
      html += '<div class="input-row" style="margin-bottom:16px"><input class="sheet-field__input" id="flowCustom" placeholder="Add custom step...">';
      html += '<button class="sheet-btn--icon" id="flowAdd" aria-label="Add custom step">+</button></div>';

      // Items list
      items.forEach((item, i) => {
        html += `<div class="check-item">
          <div class="check-item__box ${item.done ? 'checked' : ''}" data-idx="${i}" style="${item.done ? 'background:var(--color-flow);' : ''}">${item.done ? '✓' : ''}</div>
          <span class="check-item__text ${item.done ? 'done' : ''}">${esc(item.text)}</span>
          <button class="check-item__delete" data-idx="${i}" aria-label="Delete step">&times;</button>
        </div>`;
      });

      // Tips section
      html += '<div class="flow-section"><div class="flow-section__title">Tips & Strategies</div>';
      const tips = [
        { title: 'The 2-Minute Rule', body: 'When you feel the urge to scroll, set a 2-minute timer. Do one productive thing first. Usually the urge passes.' },
        { title: 'Environment Design', body: 'Remove trigger apps from your home screen. Put them in folders or use Screen Time limits. Make the friction physical.' },
        { title: 'Replacement Stack', body: 'Replace the scroll habit with something better. When you reach for your phone: do 10 pushups, read 1 page, or write 1 sentence.' },
        { title: 'The Phone Parking Lot', body: 'Designate a spot in your room where your phone lives during focus time. It\'s not banned - it\'s just parked.' },
        { title: 'Digital Sunset', body: 'No screens 30 min before bed. Use this time for reading, journaling, or planning tomorrow. Your sleep will thank you.' },
        { title: 'Accountability Photo', body: 'Screenshot your screen time every Sunday. Share it with a friend. What gets measured gets managed.' }
      ];
      tips.forEach((tip, i) => {
        html += `<div class="flow-tip" data-tip="${i}">
          <div class="flow-tip__title">${esc(tip.title)} <span class="flow-tip__arrow">›</span></div>
          <div class="flow-tip__body">${esc(tip.body)}</div>
        </div>`;
      });
      html += '</div>';
      return '<div class="exp-shell exp-shell--top">' + html + '</div>';
    },
    bind(container) {
      // Toggle items
      container.querySelectorAll('.check-item__box').forEach(box => {
        box.addEventListener('click', () => {
          const idx = parseInt(box.dataset.idx);
          state.flow.items[idx].done = !state.flow.items[idx].done;
          persistState();
          container.innerHTML = SHEET_TEMPLATES.flow.render();
          SHEET_TEMPLATES.flow.bind(container);
          renderAll();
        });
      });

      // Delete items
      container.querySelectorAll('.check-item__delete').forEach(del => {
        del.addEventListener('click', () => {
          const idx = parseInt(del.dataset.idx);
          state.flow.items.splice(idx, 1);
          persistState();
          container.innerHTML = SHEET_TEMPLATES.flow.render();
          SHEET_TEMPLATES.flow.bind(container);
          renderAll();
        });
      });

      // Add custom
      const addBtn = container.querySelector('#flowAdd');
      const addInput = container.querySelector('#flowCustom');
      if (addBtn && addInput) {
        const doAdd = () => {
          const text = addInput.value.trim();
          if (!text) return;
          state.flow.items.push({ id: 'f' + Date.now(), text, done: false });
          persistState();
          container.innerHTML = SHEET_TEMPLATES.flow.render();
          SHEET_TEMPLATES.flow.bind(container);
          renderAll();
        };
        addBtn.addEventListener('click', doAdd);
        addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
      }

      // Quick-add chips
      container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const text = chip.dataset.chip;
          state.flow.items.push({ id: 'f' + Date.now(), text, done: false });
          persistState();
          container.innerHTML = SHEET_TEMPLATES.flow.render();
          SHEET_TEMPLATES.flow.bind(container);
          renderAll();
        });
      });

      // Tips expand
      container.querySelectorAll('.flow-tip').forEach(tip => {
        tip.addEventListener('click', () => tip.classList.toggle('expanded'));
      });
    }
  },

  mori: {
    secondsInterval: null,
    dayBurnInterval: null,
    currentTotalSeconds: 0,
    viewMode: 'weeks',
    // Setup questionnaire (ported in spirit from the Life Audit): a short guided
    // intake that gathers the few things needed to project a real death date.
    wizardActive: false,
    wizardStep: 0,
    wizardDraft: null,
    WIZ_STEPS: ['intro', 'year', 'expect', 'sleepHrs', 'workHrs', 'humanHrs', 'screenHrs', 'booksPerYear'],
    moriWizCfg(key) {
      const C = {
        sleepHrs:  { q: 'How many hours do you sleep a night?', sub: 'Across an average week. Honest, not aspirational.', min: 4, max: 12, step: 0.5, unit: 'hours a night' },
        workHrs:   { q: 'How many hours go to work or school?', sub: 'Counted across a five day week.', min: 0, max: 16, step: 0.5, unit: 'hours a day' },
        humanHrs:  { q: 'How many hours go to upkeep?', sub: 'Cooking, cleaning, commuting, errands. The tax of being alive.', min: 0, max: 10, step: 0.5, unit: 'hours a day' },
        screenHrs: { q: "What's your average daily screen time?", sub: 'Check your phone if you are not sure. It is usually higher than you think.', min: 0, max: 16, step: 0.5, unit: 'hours a day' },
        booksPerYear: { q: 'How many books do you read a year?', sub: 'Roughly, at your honest pace. Audiobooks count.', min: 0, max: 50, step: 1, unit: 'books a year' },
      };
      return C[key];
    },
    render() {
      // First run, or a deliberate recalculation, hands the screen to the wizard.
      if (this.wizardActive || !state.mori.birthYear) {
        return '<div class="exp-shell mori-shell">' + this.renderWizard() + '</div>';
      }
      const by = state.mori.birthYear;
      const le = state.mori.lifeExpectancy;
      const age = moriAgeYears(by);
      const yearsLeft = moriYearsRemaining(by, le);
      let html = '';
      if (by && yearsLeft !== null) {
        const daysLeft = Math.round(yearsLeft * 365.25);
        const weeksLeft = Math.round(yearsLeft * 52);
        const monthsLeft = Math.round(yearsLeft * 12);
        const hoursLeft = Math.round(yearsLeft * 365.25 * 24);
        // The anchor: the actual calendar date you are projected to die on. Shown
        // big, at the very top, so the whole module hangs under a real day.
        html += this.renderDeathDate(yearsLeft);
        html += `<div class="mori-countdown">
          <div class="mori-countdown__seconds">
            <div class="mori-countdown__label">Seconds Remaining</div>
            <div class="mori-countdown__value" id="moriSecondsValue" aria-label="Seconds remaining in your life" aria-live="off">--</div>
          </div>
          <div class="mori-countdown__grid">
            <div class="mori-countdown__unit"><div class="mori-countdown__num">${Math.floor(yearsLeft)}</div><div class="mori-countdown__unit-label">Years</div></div>
            <div class="mori-countdown__unit"><div class="mori-countdown__num">${monthsLeft.toLocaleString()}</div><div class="mori-countdown__unit-label">Months</div></div>
            <div class="mori-countdown__unit"><div class="mori-countdown__num">${weeksLeft.toLocaleString()}</div><div class="mori-countdown__unit-label">Weeks</div></div>
            <div class="mori-countdown__unit"><div class="mori-countdown__num">${daysLeft.toLocaleString()}</div><div class="mori-countdown__unit-label">Days</div></div>
            <div class="mori-countdown__unit"><div class="mori-countdown__num">${hoursLeft.toLocaleString()}</div><div class="mori-countdown__unit-label">Hours</div></div>
          </div>
        </div>`;
        // Perspective block (ported from the life audit, doom-scroll/branding
        // dropped): percent of life elapsed with a calm bar. The human-scale
        // counts live once, in the tail-end section below.
        const pctLived = Math.max(0, Math.min(100, Math.round((age / le) * 100)));
        const pctLeft = 100 - pctLived;
        html += `<div style="margin:4px 0 18px;padding:18px;border-radius:var(--card-r);background:var(--surface-1);border:1px solid var(--hairline);">
          <div style="font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:12px;">What that really means</div>
          <div style="height:8px;border-radius:999px;background:var(--kfill-07);overflow:hidden;margin-bottom:11px;">
            <div style="height:100%;width:${pctLived}%;background:linear-gradient(90deg, rgba(var(--accent-rgb),0.85), rgba(var(--accent-rgb),0.5));border-radius:999px;"></div>
          </div>
          <div style="font-size:0.92rem;line-height:1.5;color:var(--text-hi);">You have lived <strong>${pctLived}%</strong> of your ${le} years. <span style="color:var(--text-mid);">${pctLeft}% remains.</span></div>
        </div>`;
        html += `<div class="mori-toggle-pill">
          <button class="mori-t-btn ${this.viewMode === 'years' ? 'active' : ''}" data-view="years">Years</button>
          <button class="mori-t-btn ${this.viewMode === 'months' ? 'active' : ''}" data-view="months">Months</button>
          <button class="mori-t-btn ${this.viewMode === 'weeks' ? 'active' : ''}" data-view="weeks">Weeks</button>
        </div>`;
        html += '<div class="mori-life-grid" id="moriLifeGrid"></div>';
        html += this.renderTodayStrip();
        html += this.renderTailEnd(yearsLeft);
        html += this.renderPeople(yearsLeft);
        html += this.renderMilestones(age, le);
        html += this.renderReclaim();
        html += this.renderMomento(yearsLeft);
      }
      html += '<button class="mori-recalc" id="moriRecalc" type="button">Recalculate my time</button>';
      const _ls = state.mori.lifestyle || { sleepHrs: 8, workHrs: 8, humanHrs: 2.5, screenHrs: 4 };
      html += `<div class="mori-settings">
        <button class="mori-settings__toggle" id="moriSettingsToggle">Settings <span class="mori-settings__arrow" id="moriSettingsArrow">›</span></button>
        <div class="mori-settings__body" id="moriSettingsBody" style="display:${by ? 'none' : 'block'}">
          <div class="sheet-field"><label class="sheet-field__label">Birth Year</label><input class="sheet-field__input" id="moriBirth" type="number" placeholder="e.g. 1998" value="${by || ''}"></div>
          <div class="sheet-field"><label class="sheet-field__label">Life Expectancy</label><input class="sheet-field__input" id="moriLife" type="number" placeholder="80" value="${le}"></div>
          <div class="mori-ls-label">How an average day goes (hours)</div>
          <div class="mori-ls-grid">
            <div class="sheet-field"><label class="sheet-field__label">Sleep</label><input class="sheet-field__input" id="moriSleep" type="number" min="0" max="14" step="0.5" value="${_ls.sleepHrs}"></div>
            <div class="sheet-field"><label class="sheet-field__label">Work</label><input class="sheet-field__input" id="moriWork" type="number" min="0" max="16" step="0.5" value="${_ls.workHrs}"></div>
            <div class="sheet-field"><label class="sheet-field__label">Upkeep</label><input class="sheet-field__input" id="moriHuman" type="number" min="0" max="10" step="0.5" value="${_ls.humanHrs}"></div>
            <div class="sheet-field"><label class="sheet-field__label">Screens</label><input class="sheet-field__input" id="moriScreen" type="number" min="0" max="16" step="0.5" value="${_ls.screenHrs}"></div>
            <div class="sheet-field"><label class="sheet-field__label">Books a year</label><input class="sheet-field__input" id="moriBooks" type="number" min="0" max="50" step="1" value="${_ls.booksPerYear != null ? _ls.booksPerYear : 5}"></div>
          </div>
          <div class="sheet-field"><label class="sheet-field__label">A note to your future self</label><textarea class="sheet-field__input" id="moriFutureNote" rows="3" placeholder="What do you want to remember? Who are you becoming?" style="resize:vertical;min-height:64px;">${esc(state.mori.futureSelfNote || '')}</textarea></div>
          <button class="sheet-btn sheet-btn--mori" id="moriSave">Save</button>
        </div>
      </div>`;
      // Wrap in the shared centered, vertically balanced experience shell so the
      // module reads like the rest of the app instead of being pinned to the top.
      return '<div class="exp-shell mori-shell">' + html + '</div>';
    },
    // The death-date clock: the literal calendar day you are projected to reach,
    // if the averages hold. Computed from now + the years you have left, so it
    // lands on a real weekday and date instead of an abstract count.
    renderDeathDate(yearsLeft) {
      try {
        const MS_YEAR = 365.25 * 24 * 3600 * 1000;
        const death = new Date(Date.now() + Math.max(0, yearsLeft) * MS_YEAR);
        const dateStr = death.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const yrs = Math.max(0, Math.floor(yearsLeft));
        // Remainder days after the whole years (not the full span again, which
        // read as if the years and days were additive).
        const days = Math.max(0, Math.round((yearsLeft - yrs) * 365.25));
        return `<div class="mori-deathclock">
          <div class="mori-deathclock__eyebrow">If the averages hold, your last day is</div>
          <div class="mori-deathclock__date">${dateStr}</div>
          <div class="mori-deathclock__sub">about <strong>${yrs.toLocaleString()}</strong> years, <strong>${days.toLocaleString()}</strong> days from today</div>
        </div>`;
      } catch (e) { return ''; }
    },
    // The setup questionnaire. One question per panel, a live number and a line
    // of honest feedback as you drag, then it resolves into the death clock.
    renderWizard() {
      const steps = this.WIZ_STEPS;
      if (!this.wizardDraft) {
        const ls = state.mori.lifestyle || {};
        this.wizardDraft = {
          year: state.mori.birthYear || '',
          expect: state.mori.lifeExpectancy || 80,
          sleepHrs: ls.sleepHrs != null ? ls.sleepHrs : 8,
          workHrs: ls.workHrs != null ? ls.workHrs : 8,
          humanHrs: ls.humanHrs != null ? ls.humanHrs : 2.5,
          screenHrs: ls.screenHrs != null ? ls.screenHrs : 4,
          booksPerYear: ls.booksPerYear != null ? ls.booksPerYear : 5,
        };
      }
      const d = this.wizardDraft;
      const total = steps.length - 1; // questions, excluding the intro
      const cur = Math.min(this.wizardStep, steps.length - 1);
      let panels = '';
      steps.forEach((key, i) => {
        const active = i === cur ? ' is-active' : '';
        const last = i === steps.length - 1;
        const nextLabel = last ? 'See my time' : 'Next';
        let inner = '';
        if (key === 'intro') {
          inner = `<div class="mori-wiz__kicker">Memento Mori</div>
            <div class="mori-wiz__q">First, the truth.</div>
            <div class="mori-wiz__desc">You are going to die. Not today, hopefully. But on a real, specific day. A few honest answers and this screen will show you roughly when, and how much time is still yours to spend.</div>
            <div class="mori-wiz__nav"><button class="mori-wiz__btn" data-wiz-next>I'm ready</button></div>`;
        } else if (key === 'year') {
          inner = `<div class="mori-wiz__step-label">Question 1 of ${total}</div>
            <div class="mori-wiz__q">What year were you born?</div>
            <div class="mori-wiz__desc">So we can count what you have already spent.</div>
            <input class="mori-wiz__input" id="wizYear" type="number" inputmode="numeric" placeholder="e.g. 1998" value="${d.year || ''}">
            <div class="mori-wiz__egg" id="wizYearEgg"></div>
            <div class="mori-wiz__nav"><button class="mori-wiz__back" data-wiz-back>Back</button><button class="mori-wiz__btn" data-wiz-next>Next</button></div>`;
        } else if (key === 'expect') {
          inner = `<div class="mori-wiz__step-label">Question 2 of ${total}</div>
            <div class="mori-wiz__q">How long do you expect to live?</div>
            <div class="mori-wiz__desc">The global average is around 73. Many reach their late 80s. Pick the number you would honestly bet on.</div>
            <div class="mori-wiz__num"><span id="wizExpectVal">${d.expect}</span><span class="mori-wiz__unit">years</span></div>
            <input class="mori-wiz__slider" id="wizExpect" type="range" min="60" max="100" step="1" value="${d.expect}">
            <div class="mori-wiz__egg" id="wizExpectEgg"></div>
            <div class="mori-wiz__nav"><button class="mori-wiz__back" data-wiz-back>Back</button><button class="mori-wiz__btn" data-wiz-next>Next</button></div>`;
        } else {
          const cfg = this.moriWizCfg(key);
          inner = `<div class="mori-wiz__step-label">Question ${i} of ${total}</div>
            <div class="mori-wiz__q">${cfg.q}</div>
            <div class="mori-wiz__desc">${cfg.sub}</div>
            <div class="mori-wiz__num"><span id="wiz_${key}_val">${d[key]}</span><span class="mori-wiz__unit">${cfg.unit}</span></div>
            <input class="mori-wiz__slider" id="wiz_${key}" type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${d[key]}">
            <div class="mori-wiz__egg" id="wiz_${key}_egg"></div>
            <div class="mori-wiz__nav"><button class="mori-wiz__back" data-wiz-back>Back</button><button class="mori-wiz__btn" data-wiz-next>${nextLabel}</button></div>`;
        }
        panels += `<div class="mori-wiz__panel${active}" data-wiz-panel="${i}">${inner}</div>`;
      });
      const pct = Math.round((cur / (steps.length - 1)) * 100);
      return `<div class="mori-wiz${cur === 0 ? ' is-intro' : ''}" id="moriWiz">
        <div class="mori-wiz__progress"><div class="mori-wiz__bar"><div class="mori-wiz__fill" id="moriWizFill" style="width:${pct}%"></div></div></div>
        ${panels}
      </div>`;
    },
    // Reactive feedback line shown under each slider as you drag.
    _wizEgg(container, key) {
      const v = this.wizardDraft[key];
      const el = container.querySelector('#wiz_' + key + '_egg');
      if (!el) return;
      let txt = '', tone = '';
      if (key === 'sleepHrs') {
        if (v <= 4) { txt = 'Running on fumes.'; tone = 'warn'; }
        else if (v <= 6) { txt = 'A little short.'; }
        else if (v >= 7 && v <= 9) { txt = "The body's sweet spot."; tone = 'good'; }
        else if (v === 10) { txt = 'A lot of your life spent asleep.'; }
        else if (v >= 11) { txt = 'Nearly half your years, in the dark.'; tone = 'warn'; }
      } else if (key === 'workHrs') {
        if (v === 0) { txt = 'Every hour is yours. Rare.'; }
        else if (v >= 10 && v <= 11) { txt = 'Long days. They add up.'; }
        else if (v >= 12) { txt = 'Most of your waking life, already spoken for.'; tone = 'warn'; }
      } else if (key === 'humanHrs') {
        if (v <= 1) { txt = 'Lean.'; }
        else if (v >= 2 && v <= 4) { txt = 'About average for being alive.'; }
        else if (v >= 7) { txt = 'The admin of living, piling up.'; }
      } else if (key === 'screenHrs') {
        if (v === 0) { txt = 'Be honest with yourself.'; tone = 'warn'; }
        else if (v >= 1 && v <= 3) { txt = 'Light. Genuinely impressive.'; tone = 'good'; }
        else if (v >= 4 && v <= 6) { txt = 'Around the average.'; }
        else if (v >= 7 && v <= 9) { txt = 'That is a second job.'; }
        else if (v >= 10) { txt = 'Years of your life, lit by a screen.'; tone = 'warn'; }
      } else if (key === 'booksPerYear') {
        if (v === 0) { txt = 'Zero is an answer too. It sets your counter.'; }
        else if (v <= 4) { txt = 'A few good ones a year.'; }
        else if (v >= 12 && v <= 24) { txt = 'One or two a month. Solid.'; tone = 'good'; }
        else if (v >= 25) { txt = 'A serious reader.'; tone = 'good'; }
      }
      el.textContent = txt;
      el.className = 'mori-wiz__egg' + (tone ? ' is-' + tone : '');
    },
    _wizYearEgg(container, v, invalid) {
      const el = container.querySelector('#wizYearEgg');
      if (!el) return;
      if (invalid || !(v > 1900 && v < 2020)) {
        el.textContent = v ? 'Enter a year between 1901 and 2019.' : '';
        el.className = 'mori-wiz__egg' + (v ? ' is-warn' : '');
        return;
      }
      const age = Math.max(0, new Date().getFullYear() - v);
      el.textContent = 'That makes you about ' + age + '.';
      el.className = 'mori-wiz__egg';
    },
    _wizExpectEgg(container) {
      const el = container.querySelector('#wizExpectEgg');
      if (!el) return;
      const d = this.wizardDraft;
      const y = parseInt(d.year);
      if (y > 1900 && y < 2020) {
        el.textContent = 'Your last year would land around ' + (y + (d.expect || 80)) + '.';
      } else { el.textContent = ''; }
      el.className = 'mori-wiz__egg';
    },
    bindWizard(container) {
      const d = this.wizardDraft;
      const fill = container.querySelector('#moriWizFill');
      const wiz = container.querySelector('#moriWiz');
      const total = this.WIZ_STEPS.length - 1;
      const show = (idx) => {
        this.wizardStep = idx;
        container.querySelectorAll('[data-wiz-panel]').forEach(p => p.classList.toggle('is-active', +p.dataset.wizPanel === idx));
        if (fill) fill.style.width = Math.round((idx / total) * 100) + '%';
        if (wiz) wiz.classList.toggle('is-intro', idx === 0);
        const active = container.querySelector('[data-wiz-panel].is-active input');
        if (active) setTimeout(() => { try { active.focus(); } catch (e) {} }, 60);
      };
      container.querySelectorAll('[data-wiz-next]').forEach(btn => btn.addEventListener('click', () => {
        const idx = this.wizardStep;
        if (this.WIZ_STEPS[idx] === 'year') {
          const v = parseInt(container.querySelector('#wizYear').value);
          if (!(v > 1900 && v < 2020)) { this._wizYearEgg(container, v, true); return; }
          d.year = v;
        }
        if (idx >= this.WIZ_STEPS.length - 1) { this.finishWizard(container); return; }
        show(idx + 1);
      }));
      container.querySelectorAll('[data-wiz-back]').forEach(btn => btn.addEventListener('click', () => {
        if (this.wizardStep <= 0) return;
        show(this.wizardStep - 1);
      }));
      const yearInp = container.querySelector('#wizYear');
      if (yearInp) {
        yearInp.addEventListener('input', () => { d.year = parseInt(yearInp.value); this._wizYearEgg(container, d.year); });
        yearInp.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = container.querySelector('[data-wiz-panel].is-active [data-wiz-next]'); if (b) b.click(); } });
      }
      const expInp = container.querySelector('#wizExpect');
      if (expInp) { expInp.addEventListener('input', () => { d.expect = parseInt(expInp.value); const ve = container.querySelector('#wizExpectVal'); if (ve) ve.textContent = d.expect; this._wizExpectEgg(container); }); this._wizExpectEgg(container); }
      ['sleepHrs', 'workHrs', 'humanHrs', 'screenHrs', 'booksPerYear'].forEach(key => {
        const s = container.querySelector('#wiz_' + key);
        if (!s) return;
        s.addEventListener('input', () => { d[key] = parseFloat(s.value); const ve = container.querySelector('#wiz_' + key + '_val'); if (ve) ve.textContent = d[key]; this._wizEgg(container, key); });
        this._wizEgg(container, key);
      });
    },
    finishWizard(container) {
      const d = this.wizardDraft;
      const hadBirth = !!state.mori.birthYear;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      if (d.year > 1900 && d.year < 2020) state.mori.birthYear = d.year;
      if (d.expect >= 30 && d.expect <= 120) state.mori.lifeExpectancy = d.expect;
      if (!state.mori.lifestyle) state.mori.lifestyle = { sleepHrs: 8, workHrs: 8, humanHrs: 2.5, screenHrs: 4, booksPerYear: 5 };
      state.mori.lifestyle.sleepHrs = clamp(d.sleepHrs, 0, 14);
      state.mori.lifestyle.workHrs = clamp(d.workHrs, 0, 16);
      state.mori.lifestyle.humanHrs = clamp(d.humanHrs, 0, 10);
      state.mori.lifestyle.screenHrs = clamp(d.screenHrs, 0, 16);
      state.mori.lifestyle.booksPerYear = clamp(d.booksPerYear != null ? d.booksPerYear : 5, 0, 50);
      state.mori.auditDone = true;
      try { if (typeof writeProofEvent === 'function' && state.mori.birthYear && !hadBirth) writeProofEvent('mori-moment', { title: 'Faced the clock', module: 'mori', dedupeKey: 'mori-setup' }); } catch (e) {}
      this.wizardActive = false; this.wizardStep = 0; this.wizardDraft = null;
      try { persistNow(); renderAll(); } catch (e) {}
      container.innerHTML = SHEET_TEMPLATES.mori.render();
      SHEET_TEMPLATES.mori.bind(container);
    },
    // Inner HTML for the phone-vs-life stat. Lives in its own method so the
    // screen-time input can update it live without re-rendering the sheet.
    // Calm urgency: tie the time left to one daily action instead of a
    // screen-time guilt stat. Today's trade if there is an action; a quiet
    // acknowledgement once it is done.
    renderMomento(yearsLeft) {
      try {
        const weeksLeft = Math.round(yearsLeft * 52);
        const todayStr = getTodayISO();
        const ch = (state.action && state.action.completionHistory) || [];
        const last = ch.length ? ch[ch.length - 1] : null;
        const didToday = !!(last && last.date && isoToLocalDay(last.date) === todayStr);
        const action = (typeof getRecommendedActionText === 'function') ? getRecommendedActionText() : '';
        let line, sub;
        if (didToday) {
          line = 'You spent one of them well today.';
          sub = 'That is the whole game. One week, used on purpose.';
        } else if (action) {
          line = 'Today is one of them. Spend it on this:';
          sub = action;
        } else {
          line = 'Each one only passes once.';
          sub = 'Pick one thing that matters and spend today on it.';
        }
        const note = (state.mori && state.mori.futureSelfNote) ? state.mori.futureSelfNote : '';
        let noteHtml = '';
        if (note) {
          noteHtml = `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--hairline);text-align:left;">
            <div style="font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:6px;">A note to your future self</div>
            <div style="font-size:0.92rem;line-height:1.5;color:var(--text-mid);font-style:italic;">${esc(note)}</div>
          </div>`;
        }
        return `<div class="mori-momento" style="margin:20px 0 4px;padding:18px;border-radius:var(--card-r);background:var(--surface-1);border:1px solid var(--hairline);text-align:center;">
          <div style="font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:8px;">${weeksLeft.toLocaleString()} weeks left</div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--text-hi);line-height:1.35;margin-bottom:6px;">${esc(line)}</div>
          <div style="font-size:0.9rem;line-height:1.5;color:var(--text-mid);">${esc(sub)}</div>
          ${noteHtml}
        </div>`;
      } catch (e) { return ''; }
    },
    // Today strip: a thin day-burn bar showing how much of today is spent.
    // Rendered once here; a once-a-minute updater keeps it honest (never per
    // second, the seconds counter above is the only ticker in the module).
    renderTodayStrip() {
      try {
        const by = state.mori.birthYear;
        if (!by) return '';
        const now = new Date();
        const dayN = Math.floor((now - new Date(by, 0, 1)) / 86400000) + 1;
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const pct = Math.max(0, Math.min(100, ((now - midnight) / 86400000) * 100));
        const pctR = Math.round(pct);
        return `<div class="mori-today">
          <div class="mori-today__labels"><span>Today</span><span id="moriDayPctLabel">${pctR}% spent</span></div>
          <div class="mori-today__bar"><div class="mori-today__fill" id="moriDayFill" style="width:${pct.toFixed(2)}%"></div><div class="mori-today__tip" id="moriDayTip" style="left:${pct.toFixed(2)}%"></div></div>
          <div class="mori-today__caption">Today is day <strong>${dayN.toLocaleString()}</strong> of your life. <strong><span id="moriDayPctInline">${pctR}</span>%</strong> of today is already gone.</div>
          <div class="mori-today__aside">Some things today you are doing for the last time. You will not know which.</div>
        </div>`;
      } catch (e) { return ''; }
    },
    startDayBurn(container) {
      const fill = container.querySelector('#moriDayFill');
      if (!fill) return;
      const tip = container.querySelector('#moriDayTip');
      const label = container.querySelector('#moriDayPctLabel');
      const inline = container.querySelector('#moriDayPctInline');
      const update = () => {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const pct = Math.max(0, Math.min(100, ((now - midnight) / 86400000) * 100));
        fill.style.width = pct.toFixed(2) + '%';
        if (tip) tip.style.left = pct.toFixed(2) + '%';
        const r = Math.round(pct);
        if (label) label.textContent = r + '% spent';
        if (inline) inline.textContent = r;
      };
      if (this.dayBurnInterval) clearInterval(this.dayBurnInterval);
      this.dayBurnInterval = setInterval(update, 60000);
    },
    // Tail-end counters: years left converted into event counts at the user's
    // own frequency. Number first, noun, then one line of agency.
    renderTailEnd(yearsLeft) {
      try {
        const ls = state.mori.lifestyle || {};
        const perYear = (f) => Math.max(0, Math.round(yearsLeft * f));
        const books = ls.booksPerYear != null ? ls.booksPerYear : 5;
        const toSun = (7 - new Date().getDay()) % 7;
        const sunLine = toSun === 0 ? 'One is today.' : 'One is in ' + toSun + (toSun === 1 ? ' day.' : ' days.');
        const cards = [
          [perYear(1), 'summers', 'One of them starts June 21.'],
          [perYear(52), 'sundays', sunLine],
          [perYear(12.4), 'full moons', 'One rises about every 29 days.'],
          [perYear(books), 'books', 'At your pace.'],
          [perYear(365.25), 'mornings', 'One is tomorrow.'],
        ];
        return '<div class="mori-tail"><div class="mori-sec-label">What is left, counted</div><div class="mori-tail__row">' +
          cards.map(c => '<div class="mori-tail-card"><div class="mori-tail-card__num">' + c[0].toLocaleString() + '</div><div class="mori-tail-card__noun">' + c[1] + '</div><div class="mori-tail-card__line">' + c[2] + '</div></div>').join('') +
          '</div></div>';
      } catch (e) { return ''; }
    },
    // People you love: the See Your Folks integer. Visits per year times the
    // overlapping years you both likely have, then days of actual togetherness.
    renderPeople(yearsLeft) {
      try {
        const people = Array.isArray(state.mori.people) ? state.mori.people : [];
        let rows = '', anyComputable = false;
        people.forEach((p, i) => {
          const theirYears = Math.max(0, 85 - (p.age || 0));
          const horizon = Math.min(yearsLeft, theirYears);
          const times = Math.max(0, Math.round((p.visitsPerYear || 0) * horizon));
          const days = Math.max(0, Math.round(times * (p.daysPerVisit || 0)));
          if (times > 0) anyComputable = true;
          rows += `<div class="mori-person">
            <div class="mori-person__main">
              <div class="mori-person__name">${esc(p.label || 'Someone')}</div>
              <div class="mori-person__line">You will see them about <strong>${times.toLocaleString()}</strong> more times. About <strong>${days.toLocaleString()}</strong> days together.</div>
            </div>
            <button class="mori-person__del" data-person-del="${i}" type="button" aria-label="Remove">&times;</button>
          </div>`;
        });
        const invite = people.length ? '' : '<div class="mori-people__invite">Add someone you love. The number that comes back tends to change how often you call.</div>';
        const framing = anyComputable ? '<div class="mori-people__framing">Most of your time with them is already behind you. What is left is yours to schedule.</div>' : '';
        return `<div class="mori-people">
          <div class="mori-sec-label">People you love</div>
          ${invite}${rows}${framing}
          <div class="mori-people__form">
            <input class="sheet-field__input" id="moriPersonName" type="text" maxlength="40" placeholder="Who">
            <input class="sheet-field__input" id="moriPersonAge" type="number" min="1" max="110" placeholder="Their age">
            <input class="sheet-field__input" id="moriPersonVisits" type="number" min="1" max="365" placeholder="Visits a year">
            <input class="sheet-field__input" id="moriPersonDays" type="number" min="0.5" max="365" step="0.5" placeholder="Days per visit">
          </div>
          <button class="mori-people__add" id="moriPersonAdd" type="button">Add</button>
        </div>`;
      } catch (e) { return ''; }
    },
    bindPeople(container) {
      const rerender = () => {
        try { persistNow(); } catch (e) {}
        container.innerHTML = SHEET_TEMPLATES.mori.render();
        SHEET_TEMPLATES.mori.bind(container);
      };
      const add = container.querySelector('#moriPersonAdd');
      if (add) add.addEventListener('click', () => {
        const val = (sel) => { const el = container.querySelector(sel); return el ? el.value : ''; };
        const label = (val('#moriPersonName') || '').trim().slice(0, 40);
        const age = parseInt(val('#moriPersonAge'));
        const visits = parseFloat(val('#moriPersonVisits'));
        const days = parseFloat(val('#moriPersonDays'));
        if (!(age >= 1 && age <= 110) || !(visits > 0) || !(days > 0)) return;
        if (!Array.isArray(state.mori.people)) state.mori.people = [];
        state.mori.people.push({ label: label || 'Someone', age: age, visitsPerYear: Math.min(365, visits), daysPerVisit: Math.min(365, days) });
        rerender();
      });
      container.querySelectorAll('[data-person-del]').forEach(btn => btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.personDel);
        if (Array.isArray(state.mori.people) && i >= 0) state.mori.people.splice(i, 1);
        rerender();
      }));
    },
    // Milestone strip: the next round-number birthdays on one hairline, with
    // the expectancy as the end marker. Gold marks only where you are now.
    renderMilestones(age, le) {
      try {
        if (!state.mori.birthYear || !le) return '';
        let ticks = '';
        [30, 40, 50, 60, 70].filter(a => a > age && a < le).forEach(a => {
          const left = ((a / le) * 100).toFixed(1);
          const inY = Math.max(1, Math.round(a - age));
          ticks += `<div class="mori-miles__tick" style="left:${left}%"></div><div class="mori-miles__lab" style="left:${left}%">${a}<span>in ${inY}y</span></div>`;
        });
        const nowLeft = Math.max(0, Math.min(100, (age / le) * 100)).toFixed(1);
        return `<div class="mori-miles">
          <div class="mori-sec-label">Milestones</div>
          <div class="mori-miles__track">
            <div class="mori-miles__line"></div>
            ${ticks}
            <div class="mori-miles__tick" style="left:100%"></div><div class="mori-miles__lab mori-miles__lab--end" style="left:100%">${le}<span>avg end</span></div>
            <div class="mori-miles__now" style="left:${nowLeft}%"></div>
          </div>
        </div>`;
      } catch (e) { return ''; }
    },
    bind(container) {
      // The questionnaire owns the screen when it is up; nothing else to wire.
      if (container.querySelector('#moriWiz')) { this.bindWizard(container); return; }
      if (state.mori.birthYear) {
        this.startSecondsCounter(container);
        this.renderLifeGrid(container);
        this.startDayBurn(container);
        this.bindPeople(container);
      }
      const recalc = container.querySelector('#moriRecalc');
      if (recalc) recalc.addEventListener('click', () => {
        this.wizardActive = true; this.wizardStep = 0; this.wizardDraft = null;
        container.innerHTML = SHEET_TEMPLATES.mori.render();
        SHEET_TEMPLATES.mori.bind(container);
      });
      container.querySelectorAll('.mori-t-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.viewMode = btn.dataset.view;
          container.querySelectorAll('.mori-t-btn').forEach(b => b.classList.toggle('active', b.dataset.view === this.viewMode));
          this.renderLifeGrid(container);
        });
      });
      const toggle = container.querySelector('#moriSettingsToggle');
      const body = container.querySelector('#moriSettingsBody');
      const arrow = container.querySelector('#moriSettingsArrow');
      if (toggle && body) {
        toggle.addEventListener('click', () => {
          const open = body.style.display !== 'none';
          body.style.display = open ? 'none' : 'block';
          if (arrow) arrow.style.transform = open ? '' : 'rotate(90deg)';
        });
      }
      const saveBtn = container.querySelector('#moriSave');
      if (saveBtn) saveBtn.addEventListener('click', () => {
        const by = parseInt(container.querySelector('#moriBirth').value);
        const le = parseInt(container.querySelector('#moriLife').value);
        const noteEl = container.querySelector('#moriFutureNote');
        const hadBirth = !!state.mori.birthYear;
        if (by && by > 1900 && by < 2020) state.mori.birthYear = by;
        if (le && le > 30 && le <= 120) state.mori.lifeExpectancy = le;
        if (noteEl) state.mori.futureSelfNote = noteEl.value.trim().slice(0, 600);
        // Lifestyle hours that drive the life-spend grid (clamped to sane ranges).
        if (!state.mori.lifestyle) state.mori.lifestyle = { sleepHrs: 8, workHrs: 8, humanHrs: 2.5, screenHrs: 4, booksPerYear: 5 };
        const _num = (sel, lo, hi, d) => { const el = container.querySelector(sel); if (!el) return d; const v = parseFloat(el.value); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
        state.mori.lifestyle.sleepHrs = _num('#moriSleep', 0, 14, state.mori.lifestyle.sleepHrs);
        state.mori.lifestyle.workHrs = _num('#moriWork', 0, 16, state.mori.lifestyle.workHrs);
        state.mori.lifestyle.humanHrs = _num('#moriHuman', 0, 10, state.mori.lifestyle.humanHrs);
        state.mori.lifestyle.screenHrs = _num('#moriScreen', 0, 16, state.mori.lifestyle.screenHrs);
        state.mori.lifestyle.booksPerYear = _num('#moriBooks', 0, 50, state.mori.lifestyle.booksPerYear != null ? state.mori.lifestyle.booksPerYear : 5);
        state.mori.auditDone = true;
        try { if (typeof writeProofEvent === 'function' && state.mori.birthYear && !hadBirth) writeProofEvent('mori-moment', { title: 'Faced the clock', module: 'mori', dedupeKey: 'mori-setup' }); } catch (e) {}
        persistNow(); renderAll();
        container.innerHTML = SHEET_TEMPLATES.mori.render();
        SHEET_TEMPLATES.mori.bind(container);
      });
    },
    startSecondsCounter(container) {
      // Guard: without a valid birth year the math is NaN and the display shows
      // "NaN". Bail cleanly (the counter only matters once a year is set).
      if (!state.mori.birthYear || !state.mori.lifeExpectancy) return;
      const deathDate = new Date(state.mori.birthYear + state.mori.lifeExpectancy, 0, 1);
      this.currentTotalSeconds = (deathDate - new Date()) / 1000;
      const el = container.querySelector('#moriSecondsValue');
      if (!el) return;
      const tick = () => {
        if (this.currentTotalSeconds > 0) this.currentTotalSeconds -= 0.1;
        el.textContent = Math.max(0, this.currentTotalSeconds).toFixed(1).replace(/\B(?=(\d{3})+\.)/g, ',');
      };
      tick();
      if (this.secondsInterval) clearInterval(this.secondsInterval);
      this.secondsInterval = setInterval(tick, 100);
    },
    renderLifeGrid(container) {
      const gridEl = container.querySelector('#moriLifeGrid');
      if (!gridEl) return;
      const le = state.mori.lifeExpectancy || 80;
      const legend = '<div class="mori-legend">' + MORI_LEGEND.map(([k, label]) =>
        '<span class="mori-legend__item"><span class="mori-legend__dot" style="background:' + MORI_COLORS[k] + '"></span>' + label + '</span>').join('') + '</div>';
      // Resolve the css ink color once for canvas fills (canvas cannot use var()).
      let inkRGB = '255,255,255';
      try { inkRGB = (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '255,255,255').trim() || '255,255,255'; } catch (e) {}
      const resolve = (c) => c.replace('var(--ink)', inkRGB);
      if (this.viewMode === 'years') {
        const { units, ageU } = moriBuildUnits(1);
        let html = '<div class="mori-dots">';
        units.forEach((type, y) => {
          const isCur = y === ageU;
          html += '<div class="mori-dot' + (isCur ? ' mori-dot--current' : '') + '" style="background:' + MORI_COLORS[type] + '" title="Age ' + y + ', ' + type + '"></div>';
        });
        html += '</div>' + legend;
        gridEl.innerHTML = html;
      } else {
        const isWeeks = this.viewMode === 'weeks';
        const cols = this.viewMode === 'months' ? 12 : 52;
        const { units, ageU } = moriBuildUnits(cols);
        const rows = le;
        let canvasHtml = '<canvas id="moriCanvas" width="' + (cols * 8) + '" height="' + (rows * 8) + '" style="width:100%;border-radius:calc(8px * var(--rx, 1))"></canvas>';
        let captions = '';
        if (isWeeks) {
          // Hero upgrade: a gold "now" dot breathing on the current week cell,
          // an average-expectancy hairline when the grid runs past it, and the
          // week-count plus tablespoon-of-diamonds captions under the legend.
          const curRow = Math.floor(ageU / cols), curCol = ageU % cols;
          const dotLeft = (((curCol + 0.5) / cols) * 100).toFixed(2);
          const dotTop = (((curRow + 0.5) / rows) * 100).toFixed(2);
          let overlay = '<div class="mori-now-dot" style="left:' + dotLeft + '%;top:' + dotTop + '%"></div>';
          const AVG_EXPECTANCY = 80;
          if (le > AVG_EXPECTANCY) {
            overlay += '<div class="mori-avg-line" style="top:' + ((AVG_EXPECTANCY / le) * 100).toFixed(2) + '%"><span>average</span></div>';
          }
          canvasHtml = '<div class="mori-grid-wrap">' + canvasHtml + overlay + '</div>';
          const weeksLived = moriWeeksLived(state.mori.birthYear);
          const totalWeeks = moriTotalWeeks(le);
          if (weeksLived !== null) {
            captions = '<div class="mori-grid-caption">Week ' + weeksLived.toLocaleString() + ' of ' + totalWeeks.toLocaleString() + '. This is the only one that is live.</div>' +
              '<div class="mori-diamond">About a tablespoon of diamonds. Those are your weeks and they are all you have got.</div>';
          }
        }
        gridEl.innerHTML = canvasHtml + legend + captions;
        const canvas = container.querySelector('#moriCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cw = canvas.width, ch = canvas.height;
        const dotW = cw / cols, dotH = ch / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const type = units[idx] || 'ghost';
            const x = c * dotW, y = r * dotH;
            ctx.fillStyle = resolve(MORI_COLORS[type] || MORI_COLORS.ghost);
            ctx.fillRect(x + 0.5, y + 0.5, dotW - 1, dotH - 1);
            // Weeks view marks "now" with the gold overlay dot instead of a stroke.
            if (idx === ageU && !isWeeks) { ctx.strokeStyle = '#8E8E93'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, dotW - 1, dotH - 1); }
          }
        }
      }
    },
    // Positive reframe: how much free time you reclaim by trimming daily screens.
    renderReclaim() {
      try {
        const ls = state.mori.lifestyle || {}; const cur = ls.screenHrs || 0;
        if (cur < 1) return '';
        const le = state.mori.lifeExpectancy || 80; const rem = moriYearsRemaining(state.mori.birthYear, le) || 0;
        const cut = Math.min(cur, 2);
        const reclaimedYears = (cut / 24) * rem;
        const days = Math.round(reclaimedYears * 365.25);
        if (days < 1) return '';
        return '<div class="mori-reclaim"><div class="mori-reclaim__label">A small trade</div>' +
          '<div class="mori-reclaim__body">Spend ' + cut + ' fewer hours a day on screens and you hand yourself back about <strong>' + reclaimedYears.toFixed(1) + ' years</strong>, roughly ' + days.toLocaleString() + ' days, to spend on what matters.</div></div>';
      } catch (e) { return ''; }
    }
  },

  vivere: {
    // Memento Vivere full-screen experience. Mirrors Mori's structure but warm:
    // Today's Life Practice + Memory Jar + Alive List, plus an Aliveness Map and
    // a Weekly Recap that read only from data the app can actually derive.
    render() {
      // Three views: the freeform Vision board canvas (default), the Memory
      // lane ledger of Lived cards, and the original Practice (Today + Memory
      // Jar + Alive List), switched by the tab bar.
      const vtab = (state.vivere && state.vivere.viewTab) || 'canvas';
      if (vtab === 'canvas') return renderVivereCanvasView();
      if (vtab === 'lane') return renderVivereLaneView();

      const today = vivEnsureToday();
      const cats = (state.vivere && state.vivere.categories) || {};
      let mems = (state.vivere && Array.isArray(state.vivere.memories)) ? state.vivere.memories.slice().reverse() : [];
      const alive = (state.vivere && Array.isArray(state.vivere.aliveList)) ? state.vivere.aliveList : [];
      const totalLived = VIVERE_CATEGORIES.reduce((s, k) => s + (cats[k] || 0), 0);

      let html = '<div class="viv">';
      html += renderVivereTabs('practice');

      // ---- Calm header -----------------------------------------------------
      html += '<div class="viv__hero">'
        + '<div class="viv__eyebrow">Memento Vivere</div>'
        + '<div class="viv__hero-title">Remember what makes life worth staying awake for.</div>'
        + '<div class="viv__hero-sub">Mori says your time is finite. Vivere is the other half: noticing the moments that make the time worth it. Even if today was hard, was there one moment worth keeping?</div>'
        + '</div>';

      // ---- The Year I Lived (yearbook) entry --------------------------------
      const _memCount = (state.vivere && Array.isArray(state.vivere.memories)) ? state.vivere.memories.length : 0;
      html += '<button class="viv-yearbook-cta" id="vivYearbookBtn" type="button">'
        + '<span class="viv-yearbook-cta__main"><span class="viv-yearbook-cta__t">The Year I Lived</span>'
        + '<span class="viv-yearbook-cta__s">' + (_memCount ? (_memCount + ' moment' + (_memCount === 1 ? '' : 's') + ' kept, your year in review') : 'Your moments, people and aliveness, gathered by month') + '</span></span>'
        + '<span class="viv-yearbook-cta__ar" aria-hidden="true">&rarr;</span>'
        + '</button>';
      const _pplCount = (state.people && Array.isArray(state.people)) ? state.people.length : 0;
      let _pplDue = 0;
      try { const _t = (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10); (state.people || []).forEach(p => { if (!p.lastContactISO) { _pplDue++; return; } const dd = Math.floor((Date.parse(_t + 'T00:00:00Z') - Date.parse(p.lastContactISO + 'T00:00:00Z')) / 86400000); if (dd > (p.cadenceDays || 30)) _pplDue++; }); } catch (e) {}
      html += '<button class="viv-yearbook-cta" id="vivPeopleBtn" type="button">'
        + '<span class="viv-yearbook-cta__main"><span class="viv-yearbook-cta__t">People I care about</span>'
        + '<span class="viv-yearbook-cta__s">' + (_pplCount ? (_pplDue ? (_pplDue + ' to reach out to, stay close') : (_pplCount + ' people, all up to date')) : 'The few you never want to drift from') + '</span></span>'
        + '<span class="viv-yearbook-cta__ar" aria-hidden="true">&rarr;</span>'
        + '</button>';

      // ---- Your Week, lived: auto-recap of the last 7 days, badged until
      // watched (the weekly cadence the research called the retention sweet
      // spot between daily prompts and the annual yearbook).
      const weekKey = (() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
      const weekMems = (() => {
        const cut = new Date(); cut.setDate(cut.getDate() - 7);
        const cutIso = cut.getFullYear() + '-' + String(cut.getMonth() + 1).padStart(2, '0') + '-' + String(cut.getDate()).padStart(2, '0');
        return ((state.vivere && state.vivere.memories) || []).filter(m => m && m.text && m.iso && m.iso >= cutIso);
      })();
      const recapUnwatched = weekMems.length >= 2 && !(state.vivere.weekRecap && state.vivere.weekRecap.weekKey === weekKey && state.vivere.weekRecap.watched);
      if (weekMems.length >= 2) {
        html += '<button class="viv-yearbook-cta" id="vivWeekRecapBtn" type="button">'
          + '<span class="viv-yearbook-cta__main"><span class="viv-yearbook-cta__t">Your week, lived' + (recapUnwatched ? ' <span class="viv-badge-dot" aria-hidden="true"></span>' : '') + '</span>'
          + '<span class="viv-yearbook-cta__s">' + weekMems.length + ' moment' + (weekMems.length === 1 ? '' : 's') + ' from the last 7 days, as a short film</span></span>'
          + '<span class="viv-yearbook-cta__ar" aria-hidden="true">&#9654;</span>'
          + '</button>';
      }

      // ---- On This Day (date-anchored flashback, the retention engine the
      // research called out: every moment captured today is a future payoff).
      const todayIso = (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10);
      const otdMem = (() => {
        const ms = (state.vivere && state.vivere.memories) || [];
        const md = todayIso.slice(5);
        const hits = ms.filter(m => m && m.text && m.iso && m.iso !== todayIso && m.iso.slice(5) === md);
        if (hits.length) return { m: hits[hits.length - 1], label: (() => { const y = parseInt(todayIso.slice(0, 4)) - parseInt(hits[hits.length - 1].iso.slice(0, 4)); return y === 1 ? 'One year ago today' : y + ' years ago today'; })() };
        const d = new Date(todayIso + 'T12:00:00'); d.setMonth(d.getMonth() - 1);
        const ago = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const hit = ms.filter(m => m && m.text && m.iso === ago);
        return hit.length ? { m: hit[hit.length - 1], label: 'One month ago today' } : null;
      })();
      if (otdMem) {
        html += '<button type="button" class="viv-otdmem" data-viv-otd-mem="' + esc(otdMem.m.id) + '">'
          + (otdMem.m.media && otdMem.m.media[0] ? '<img class="viv-otdmem__img" src="' + esc(otdMem.m.media[0]) + '" alt="">' : '')
          + '<span class="viv-otdmem__body"><span class="viv-otdmem__label">' + esc(otdMem.label) + '</span>'
          + '<span class="viv-otdmem__text">' + esc(otdMem.m.text.slice(0, 120)) + '</span></span>'
          + '<span class="viv-otdmem__ar" aria-hidden="true">&#9654;</span>'
          + '</button>';
      }
      // Living streak: consecutive days (back from today) with a kept moment.
      const livingStreak = (() => {
        const days = new Set(((state.vivere && state.vivere.memories) || []).map(m => m && m.iso).filter(Boolean));
        if (state.vivere && state.vivere.today && state.vivere.today.done) days.add(todayIso);
        let n = 0; const d = new Date(todayIso + 'T12:00:00');
        if (!days.has(todayIso)) d.setDate(d.getDate() - 1);
        for (;;) {
          const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          if (!days.has(iso)) break;
          n++; d.setDate(d.getDate() - 1);
          if (n > 999) break;
        }
        return n;
      })();

      // ---- Resurfaced memory (if any) -------------------------------------
      const res = vivResurfaceMemory();
      if (res && res.mem && !(otdMem && otdMem.m && otdMem.m.id === res.mem.id)) {
        html += '<div class="viv-resurface" data-viv-resurfaced="' + esc(res.mem.id) + '">'
          + '<div class="viv-resurface__label">Worth remembering</div>'
          + '<div class="viv-resurface__text">' + esc(res.mem.text) + '</div>'
          + '<div class="viv-resurface__meta">' + esc(res.label) + '</div>'
          + '</div>';
      }

      // ---- Today's Life Practice ------------------------------------------
      html += '<div class="viv__section"><div class="viv__sec-head"><div class="viv__sec-title">Today\'s life practice</div></div>';
      html += '<div class="viv-card viv-card--lift">';
      // Context-aware prompt (uniquely possible here: the app already knows
      // your people, places, and patterns). Rules in priority order; falls
      // back to the seeded daily prompt. Display-only, never mutates state.
      const ctxPrompt = (() => {
        if (today.done) return null;
        try {
          const t0 = Date.parse(todayIso + 'T00:00:00');
          let worst = null;
          (state.people || []).forEach(pp => {
            if (!pp || !pp.name) return;
            const days = pp.lastContactISO ? Math.floor((t0 - Date.parse(pp.lastContactISO + 'T00:00:00')) / 86400000) : 9999;
            const over = days - (pp.cadenceDays || 30);
            if (over > 0 && (!worst || over > worst.over)) worst = { name: pp.name, days: days, over: over };
          });
          if (worst) return { text: 'Reach out to ' + worst.name + ' today. Two minutes counts.', why: worst.days >= 9999 ? 'You have never logged a contact.' : ('It has been ' + worst.days + ' days.') };
          const ms = (state.vivere.memories || []);
          const placeLast = {};
          ms.forEach(m => { if (m && m.place) placeLast[m.place] = m.iso; });
          const cut = new Date(); cut.setDate(cut.getDate() - 21);
          const cutIso = cut.getFullYear() + '-' + String(cut.getMonth() + 1).padStart(2, '0') + '-' + String(cut.getDate()).padStart(2, '0');
          const stale = Object.keys(placeLast).filter(k => placeLast[k] < cutIso);
          if (stale.length) return { text: 'Go back to ' + stale[0] + '.', why: 'You have not kept a moment there in weeks.' };
        } catch (e) {}
        return null;
      })();
      html += '<div class="viv-today__cat"><span class="viv-today__cat-dot"></span>' + esc(ctxPrompt ? 'For you' : (VIVERE_CAT_LABELS[today.category] || 'Today')) + '</div>';
      html += '<div class="viv-today__prompt">' + esc(ctxPrompt ? ctxPrompt.text : (today.prompt || '')) + '</div>';
      html += '<div class="viv-today__note">' + (ctxPrompt ? esc(ctxPrompt.why) + ' Or pick another below.' : 'A small invitation, not a task. Do it your way, or pick another below.') + '</div>';
      html += '<div class="viv-today__actions">';
      if (today.done) {
        html += '<div class="viv-today__done"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Kept today</div>';
        html += '<button class="viv-btn viv-btn--ghost" id="vivAddMemBtn" type="button">Save the moment</button>';
      } else {
        html += '<button class="viv-btn viv-btn--primary" id="vivDoneBtn" type="button">I lived this</button>';
        html += '<button class="viv-btn viv-btn--ghost" id="vivShuffleBtn" type="button">Show another</button>';
      }
      html += '</div>';
      // Category picker
      html += '<div class="viv-cat-row">';
      VIVERE_CATEGORIES.forEach(c => {
        const active = c === today.category ? ' is-active' : '';
        html += '<button class="viv-cat-pill' + active + '" data-viv-cat="' + c + '" type="button"' + (today.done ? ' disabled style="opacity:0.45;cursor:default;"' : '') + '>' + esc(VIVERE_CAT_LABELS[c]) + '</button>';
      });
      html += '</div>';
      // Inline "save the moment" form (also opened by the button after done)
      html += '<div class="viv-add" id="vivMemForm">'
        + '<div class="viv-add__row">'
        + '<input class="viv-add__input" id="vivMemText" type="text" placeholder="One line worth keeping..." maxlength="400">'
        + '<select class="viv-add__select" id="vivMemMood"><option value="">Mood</option>'
        + VIVERE_MOODS.map(m => '<option value="' + m + '">' + esc(m.charAt(0).toUpperCase() + m.slice(1)) + '</option>').join('')
        + '</select>'
        + '<button class="viv-btn viv-btn--primary" id="vivMemSave" type="button" style="flex:0 0 auto;min-width:0;padding:11px 18px;">Keep</button>'
        + '</div>'
        + '<label class="viv-add__photo"><input type="file" accept="image/*" id="vivMemPhoto"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg> <span id="vivMemPhotoLbl">Add a photo (optional)</span></label>'
        + '</div>';
      html += '</div></div>';

      // ---- Memory Jar -----------------------------------------------------
      // Find-it-again layer (Photos pattern): text search across what you
      // wrote / who / where, one-tap chips for favorites + kinds, and
      // clickable person chips on the cards themselves.
      const jq = (this._jarQ || '').toLowerCase();
      const jf = this._jarFilter || '';
      let shown = mems;
      if (jf === 'fav') shown = shown.filter(m => m && m.fav);
      else if (jf && jf.indexOf('cat:') === 0) shown = shown.filter(m => m && m.category === jf.slice(4));
      else if (jf && jf.indexOf('person:') === 0) shown = shown.filter(m => m && (m.person || '').toLowerCase() === jf.slice(7));
      else if (jf && jf.indexOf('place:') === 0) shown = shown.filter(m => m && (m.place || '').toLowerCase() === jf.slice(6));
      if (jq) shown = shown.filter(m => m && ((m.text || '') + ' ' + (m.person || '') + ' ' + (m.place || '')).toLowerCase().indexOf(jq) >= 0);
      html += '<div class="viv__section"><div class="viv__sec-head">'
        + '<div class="viv__sec-title">Memory jar' + (mems.length ? ' · ' + (shown.length === mems.length ? mems.length : shown.length + ' of ' + mems.length) : '') + '</div>'
        + '<span class="viv__sec-acts">'
        + (livingStreak >= 2 ? '<span class="viv-streak-chip" title="Days in a row with a kept moment">' + livingStreak + ' days alive</span>' : '')
        + (mems.length >= 3 ? '<button class="viv-link-btn" id="vivShuffleDice" type="button" title="A random kept moment">&#x2684; Shuffle</button>' : '')
        + (mems.length >= 3 ? '<button class="viv-link-btn" id="vivMovieBtn" type="button">&#9654; Memory movie</button>' : '')
        + '<button class="viv-link-btn" id="vivJarAddToggle" type="button">+ Add</button>'
        + '</span></div>';
      if (mems.length > 2) {
        const catSet = {};
        mems.forEach(m => { if (m && m.category) catSet[m.category] = 1; });
        const favCount = mems.filter(m => m && m.fav).length;
        html += '<div class="viv-jar-find">'
          + '<input class="viv-add__input viv-jar-find__in" id="vivJarSearch" type="text" placeholder="Search moments, people, places..." value="' + esc(this._jarQ || '') + '" autocomplete="off">'
          + '<div class="viv-jar-find__chips">'
          + (favCount ? '<button type="button" class="viv-cat-pill' + (jf === 'fav' ? ' is-active' : '') + '" data-viv-jar-filter="fav">&#9733; Favorites</button>' : '')
          + Object.keys(catSet).map(c => '<button type="button" class="viv-cat-pill' + (jf === 'cat:' + c ? ' is-active' : '') + '" data-viv-jar-filter="cat:' + esc(c) + '">' + esc(VIVERE_CAT_LABELS[c] || c) + '</button>').join('')
          + '</div></div>';
      }
      const vivMemCard = (m) => {
        let c = '<div class="viv-mem' + (m.fav ? ' viv-mem--fav' : '') + '">';
        c += '<button class="viv-mem__fav" data-viv-mem-fav="' + esc(m.id) + '" type="button" aria-label="' + (m.fav ? 'Unfavorite' : 'Favorite') + '" title="' + (m.fav ? 'Unfavorite' : 'Favorite') + '">' + (m.fav ? '&#9733;' : '&#9734;') + '</button>';
        c += '<button class="viv-mem__del" data-viv-mem-del="' + esc(m.id) + '" type="button" aria-label="Remove memory">&times;</button>';
        if (m.media && m.media[0]) c += '<img class="viv-mem__img" src="' + esc(m.media[0]) + '" alt="">';
        if (m.category) c += '<div class="viv-mem__cat">' + esc(VIVERE_CAT_LABELS[m.category] || m.category) + '</div>';
        c += '<div class="viv-mem__text">' + esc(m.text) + '</div>';
        const meta = [];
        meta.push(ProofTrail._relativeDay(m.iso) || '');
        if (m.mood) meta.push(esc(m.mood));
        if (m.person) meta.push('<button type="button" class="viv-mem__person" data-viv-jar-filter="person:' + esc(m.person.toLowerCase()) + '">with ' + esc(m.person) + '</button>');
        if (m.place) meta.push('<button type="button" class="viv-mem__person" data-viv-jar-filter="place:' + esc(m.place.toLowerCase()) + '">at ' + esc(m.place) + '</button>');
        c += '<div class="viv-mem__meta">' + meta.filter(Boolean).map(x => '<span>' + x + '</span>').join('<span style="opacity:0.4;">·</span>') + '</div>';
        c += '</div>';
        return c;
      };
      const jview = this._jarView || 'grid';
      if (mems.length > 2) {
        html += '<div class="viv-jarview">'
          + [['grid', 'Cards'], ['time', 'Timeline'], ['photos', 'Photos']].map(v =>
            '<button type="button" class="viv-cat-pill' + (jview === v[0] ? ' is-active' : '') + '" data-viv-jarview="' + v[0] + '">' + v[1] + '</button>').join('')
          + '</div>';
      }
      mems = shown;
      // Direct-add form for the jar
      html += '<div class="viv-add" id="vivJarForm">'
        + '<div class="viv-add__row">'
        + '<input class="viv-add__input" id="vivJarText" type="text" placeholder="A moment that made life feel worth it..." maxlength="400">'
        + '<select class="viv-add__select" id="vivJarCat"><option value="">Kind</option>'
        + VIVERE_CATEGORIES.map(c => '<option value="' + c + '">' + esc(VIVERE_CAT_LABELS[c]) + '</option>').join('')
        + '</select>'
        + '<button class="viv-btn viv-btn--primary" id="vivJarSave" type="button" style="flex:0 0 auto;min-width:0;padding:11px 18px;">Keep</button>'
        + '</div>'
        + '<label class="viv-add__photo"><input type="file" accept="image/*" id="vivJarPhoto"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg> <span id="vivJarPhotoLbl">Add a photo (optional)</span></label>'
        + '</div>';
      if (!mems.length) {
        html += '<div class="empty-state"><div class="empty-state__label">Nothing kept yet</div><div class="empty-state__hint">The first time you save a moment, it lands here, quietly waiting for the day you need it.</div><hr class="empty-state__rule" aria-hidden="true"></div>';
      } else if (jview === 'photos') {
        // Photo wall (media-first): the fastest emotional hit. Tap opens the
        // Memory Movie at that photo.
        const withMedia = mems.filter(m => m.media && m.media[0]);
        const order = (state.vivere.memories || []).filter(m => m && m.text && m.media && m.media[0]);
        if (!withMedia.length) {
          html += '<div class="empty-state"><div class="empty-state__label">No photos yet</div><div class="empty-state__hint">Add a photo to a moment and it lands on this wall.</div><hr class="empty-state__rule" aria-hidden="true"></div>';
        } else {
          html += '<div class="viv-phwall">' + withMedia.map(m => {
            const ix = order.findIndex(x => x.id === m.id);
            return '<button type="button" class="viv-ph" data-viv-ph="' + (ix < 0 ? 0 : ix) + '" aria-label="Open memory"><img src="' + esc(m.media[0]) + '" alt="" loading="lazy"></button>';
          }).join('') + '</div>';
        }
      } else if (jview === 'time') {
        // Timeline: wander by month (Photos/Day One pattern), with a year
        // scrubber once the archive spans multiple years.
        const years = Array.from(new Set(mems.map(m => (m.iso || '').slice(0, 4)).filter(Boolean))).sort().reverse();
        if (years.length > 1) {
          const ySel = this._jarYear || '';
          html += '<div class="viv-jarview">' + ['', ...years].map(y =>
            '<button type="button" class="viv-cat-pill' + ((y || '') === ySel ? ' is-active' : '') + '" data-viv-jaryear="' + y + '">' + (y || 'All years') + '</button>').join('') + '</div>';
          if (ySel) mems = mems.filter(m => (m.iso || '').slice(0, 4) === ySel);
        }
        const groups = [];
        let cur = null;
        mems.slice(0, 120).forEach(m => {
          const key = (m.iso || '').slice(0, 7);
          if (!cur || cur.key !== key) { cur = { key: key, items: [] }; groups.push(cur); }
          cur.items.push(m);
        });
        const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        groups.forEach(g => {
          const mNum = parseInt(g.key.slice(5), 10) || 1;
          html += '<div class="viv-tl-month"><span>' + MONTHS[mNum - 1] + ' ' + g.key.slice(0, 4) + '</span><span class="viv-tl-month__n">' + g.items.length + (g.items.length === 1 ? ' moment' : ' moments') + '</span></div>';
          html += '<div class="viv-jar-grid">';
          g.items.forEach(m => { html += vivMemCard(m); });
          html += '</div>';
        });
      } else {
        html += '<div class="viv-jar-grid">';
        mems.slice(0, 60).forEach(m => { html += vivMemCard(m); });
        html += '</div>';
      }
      html += '</div>';

      // ---- Lived, over time: moments kept per week, last 8 weeks ----------
      (() => {
        const ms2 = (state.vivere && state.vivere.memories) || [];
        if (ms2.length < 4) return;
        const weeks = [];
        for (let w = 7; w >= 0; w--) {
          const end = new Date(); end.setDate(end.getDate() - w * 7);
          const start = new Date(end); start.setDate(start.getDate() - 6);
          const sIso = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
          const eIso = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
          weeks.push(ms2.filter(m => m && m.iso && m.iso >= sIso && m.iso <= eIso).length);
        }
        const max = Math.max(1, ...weeks);
        const W = 300, H = 56;
        const pts = weeks.map((v, i) => (i / 7 * W).toFixed(1) + ',' + (H - 6 - (v / max) * (H - 14)).toFixed(1));
        const area = '0,' + (H - 2) + ' ' + pts.join(' ') + ' ' + W + ',' + (H - 2);
        html += '<div class="viv__section"><div class="viv__sec-head"><div class="viv__sec-title">Lived, over time</div><span class="viv__sec-acts" style="font-size:0.62rem;color:var(--text-faint,var(--text-lo));">last 8 weeks</span></div>'
          + '<svg class="viv-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-label="Moments kept per week">'
          + '<polygon points="' + area + '" fill="rgba(var(--color-vivere-rgb),0.12)"/>'
          + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="rgba(var(--color-vivere-rgb),0.8)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>'
          + weeks.map((v, i) => v ? '<circle cx="' + (i / 7 * W).toFixed(1) + '" cy="' + (H - 6 - (v / max) * (H - 14)).toFixed(1) + '" r="2" fill="rgba(var(--color-vivere-rgb),0.95)"/>' : '').join('')
          + '</svg></div>';
      })();

      // ---- Alive List -----------------------------------------------------
      html += '<div class="viv__section"><div class="viv__sec-head">'
        + '<div class="viv__sec-title">Alive list</div>'
        + '<button class="viv-link-btn" id="vivAliveAddToggle" type="button">+ Add</button>'
        + '</div>';
      html += '<div class="viv-bridge"><div class="viv-bridge__line"><strong>Mori:</strong> your time is limited. <strong>Vivere:</strong> then spend some of it on this.</div></div>';
      html += '<div class="viv-add" id="vivAliveForm" style="margin-bottom:10px;">'
        + '<div class="viv-add__row">'
        + '<input class="viv-add__input" id="vivAliveText" type="text" placeholder="Something you want to actually do..." maxlength="160">'
        + '<select class="viv-add__select" id="vivAliveHorizon">'
        + VIVERE_HORIZONS.map(h => '<option value="' + h + '"' + (h === 'month' ? ' selected' : '') + '>' + esc(VIVERE_HORIZON_LABELS[h]) + '</option>').join('')
        + '</select>'
        + '<button class="viv-btn viv-btn--primary" id="vivAliveSave" type="button" style="flex:0 0 auto;min-width:0;padding:11px 18px;">Add</button>'
        + '</div></div>';
      const anyAlive = alive.length > 0;
      if (!anyAlive) {
        html += '<div class="viv-empty">Empty for now. Not a someday-bucket-list of grand things, just small ones you would be glad you did. A walk somewhere new. A call you keep meaning to make.</div>';
      } else {
        VIVERE_HORIZONS.forEach(h => {
          const items = alive.filter(x => x && x.horizon === h);
          if (!items.length) return;
          html += '<div class="viv-alive-group"><div class="viv-alive-group__label">' + esc(VIVERE_HORIZON_LABELS[h]) + '</div>';
          items.forEach(it => {
            html += '<div class="viv-alive-item' + (it.done ? ' is-done' : '') + '">'
              + '<button class="viv-alive-check' + (it.done ? ' is-done' : '') + '" data-viv-alive-toggle="' + esc(it.id) + '" type="button" aria-label="Toggle done">'
              + (it.done ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '')
              + '</button>'
              + '<div class="viv-alive-text">' + esc(it.text) + '</div>'
              + '<button class="viv-alive-del" data-viv-alive-del="' + esc(it.id) + '" type="button" aria-label="Remove">&times;</button>'
              + '</div>';
          });
          html += '</div>';
        });
      }
      html += '</div>';

      // ---- Aliveness Map (derived from category counts) -------------------
      html += '<div class="viv__section"><div class="viv__sec-head"><div class="viv__sec-title">Aliveness map</div></div>';
      html += '<div class="viv-card">';
      if (totalLived < 1) {
        html += '<div class="viv-empty" style="padding:2px;">As you live more of these, this fills in. It quietly shows which kinds of moments your alive days are made of.</div>';
      } else {
        const maxC = Math.max.apply(null, VIVERE_CATEGORIES.map(k => cats[k] || 0).concat([1]));
        html += '<div class="viv-aliveness__bars">';
        VIVERE_CATEGORIES.forEach(k => {
          const v = cats[k] || 0;
          const pct = Math.round((v / maxC) * 100);
          html += '<div class="viv-aliveness__bar" title="' + esc(VIVERE_CAT_LABELS[k]) + ': ' + v + '">'
            + '<div class="viv-aliveness__fill" style="height:' + Math.max(v ? 8 : 2, pct) + '%;opacity:' + (v ? 1 : 0.3) + ';"></div>'
            + '<span class="viv-aliveness__lbl">' + esc(VIVERE_CAT_LABELS[k].slice(0, 4)) + '</span></div>';
        });
        html += '</div>';
        // One-line insight from the two strongest categories.
        const ranked = VIVERE_CATEGORIES.map(k => [k, cats[k] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
        if (ranked.length >= 2) {
          html += '<div class="viv-insight">Your most alive days usually include <strong>' + esc(VIVERE_CAT_LABELS[ranked[0][0]].toLowerCase()) + '</strong> and <strong>' + esc(VIVERE_CAT_LABELS[ranked[1][0]].toLowerCase()) + '</strong>.</div>';
        } else if (ranked.length === 1) {
          html += '<div class="viv-insight">So far, <strong>' + esc(VIVERE_CAT_LABELS[ranked[0][0]].toLowerCase()) + '</strong> shows up most in your alive days.</div>';
        }
      }
      html += '</div></div>';

      // ---- Weekly Vivere Recap (derived; honest, no faked data) -----------
      html += '<div class="viv__section"><div class="viv__sec-head"><div class="viv__sec-title">This week, lived</div></div>';
      html += '<div class="viv-card">' + this._weekRecapHtml() + '</div></div>';

      html += '</div>'; // .viv
      return html;
    },

    // Weekly recap computed entirely from real state (proofEvents of type vivere +
    // memories captured this week). Never invents numbers it cannot derive.
    _weekRecapHtml() {
      try {
        const todayNum = _vivDayNum(getTodayISO());
        const within7 = (iso) => { const n = _vivDayNum(iso); return (todayNum - n) >= 0 && (todayNum - n) < 7; };
        const evs = (state.proofEvents || []).filter(e => e && e.type === 'vivere' && within7(e.iso));
        const livedDays = new Set(evs.map(e => e.iso)).size;
        const mems = (state.vivere && state.vivere.memories || []).filter(m => m && within7(m.iso));
        const people = new Set(mems.map(m => (m.person || '').trim().toLowerCase()).filter(Boolean)).size;
        // Most alive day = the day with the most vivere events this week.
        const byDay = {};
        evs.forEach(e => { byDay[e.iso] = (byDay[e.iso] || 0) + 1; });
        let topDay = null, topN = 0;
        Object.keys(byDay).forEach(d => { if (byDay[d] > topN) { topN = byDay[d]; topDay = d; } });
        if (!evs.length && !mems.length) {
          return '<div class="viv-empty" style="padding:2px;">Nothing logged this week yet. Live one small thing and it shows up here, as evidence the week was not only spent, it was lived.</div>';
        }
        const stat = (n, l) => '<div style="flex:1;min-width:0;text-align:center;background:var(--kfill-03);border:1px solid var(--hairline);border-radius:calc(8px * var(--rx, 1));padding:12px 8px;">'
          + '<div style="font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-hi);line-height:1;font-variant-numeric:tabular-nums;">' + n + '</div>'
          + '<div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-lo);margin-top:6px;">' + esc(l) + '</div></div>';
        let out = '<div style="display:flex;gap:8px;">' + stat(livedDays, 'days lived') + stat(mems.length, 'moments kept') + stat(people, 'people') + '</div>';
        if (topDay) {
          const when = ProofTrail._relativeDay(topDay) || '';
          out += '<div class="viv-insight">Most alive day: <strong>' + esc(when) + '</strong>' + (topN > 1 ? ' (' + topN + ' moments)' : '') + '.</div>';
        }
        return out;
      } catch (e) { return ''; }
    },

    // Re-render the whole module body in place (keeps it cheap after small edits).
    _refresh(container) {
      try {
        const root = container || (Sheet && Sheet.body);
        if (!root) return;
        root.innerHTML = this.render();
        this.bind(root);
        try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
      } catch (e) {}
    },

    bind(container) {
      const self = this;
      const $ = (sel) => container.querySelector(sel);

      // View tabs (Canvas / Memory lane / Practice). VivereCanvas._bind also
      // wires these after canvas rerenders; _vivBound keeps it to one listener.
      container.querySelectorAll('[data-viv-tab]').forEach(t => {
        if (t._vivBound) return;
        t._vivBound = true;
        t.addEventListener('click', () => {
          if (!state.vivere) state.vivere = {};
          state.vivere.viewTab = t.getAttribute('data-viv-tab');
          try { persistNow(); } catch (e) {}
          self._refresh(container);
        });
      });

      // Canvas view: make the sheet body full-bleed, mount the controller, stop
      // (the practice bindings below reference Practice-only elements absent here).
      if ((state.vivere && state.vivere.viewTab || 'canvas') === 'canvas') {
        try { container.classList.add('viv-body-fs'); } catch (e) {}
        try { VivereCanvas.mount(container); } catch (e) {}
        return;
      }

      // Memory lane: hydrate image thumbs, wire the "view on board" jumps
      // (switch tab + board, then center the card), and stop here.
      if ((state.vivere && state.vivere.viewTab || 'canvas') === 'lane') {
        try { container.classList.remove('viv-body-fs'); } catch (e) {}
        try { hydrateImageEls(container); } catch (e) {}
        container.querySelectorAll('[data-lane-go]').forEach(b => b.addEventListener('click', () => {
          const parts = (b.getAttribute('data-lane-go') || '').split(':');
          state.vivere.viewTab = 'canvas';
          if (parts[0]) state.vivere.activeBoardId = parts[0];
          try { persistNow(); } catch (e) {}
          self._refresh(container);
          setTimeout(() => { try { VivereCanvas.centerOnCard(parts[1], false); } catch (e) {} }, 80);
        }));
        return;
      }
      try { container.classList.remove('viv-body-fs'); } catch (e) {}

      const today = vivEnsureToday();

      // Mark the resurfaced memory as seen so it does not repeat next time.
      const resEl = container.querySelector('[data-viv-resurfaced]');
      if (resEl) { try { vivMarkResurfaced(resEl.getAttribute('data-viv-resurfaced')); } catch (e) {} }

      // The Year I Lived (yearbook)
      const ybBtn = $('#vivYearbookBtn');
      if (ybBtn) ybBtn.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('yearbook'); } catch (e) {} });
      // People I care about (light CRM)
      const pplBtn = $('#vivPeopleBtn');
      if (pplBtn) pplBtn.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('people'); } catch (e) {} });

      // Today: "I lived this"
      const doneBtn = $('#vivDoneBtn');
      if (doneBtn) doneBtn.addEventListener('click', () => {
        vivCompleteToday();
        try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (e) {}
        self._refresh(container);
        // After marking done, gently open the "save the moment" form.
        setTimeout(() => { const f = container.querySelector('#vivMemForm'); const b = container.querySelector('#vivAddMemBtn'); if (f) f.classList.add('is-open'); if (b) b.focus(); const inp = container.querySelector('#vivMemText'); if (inp) inp.focus(); }, 30);
      });

      // Today: shuffle to another prompt
      const shuffleBtn = $('#vivShuffleBtn');
      if (shuffleBtn) shuffleBtn.addEventListener('click', () => { vivShuffleToday(); self._refresh(container); });

      // Today: category pills
      container.querySelectorAll('[data-viv-cat]').forEach(p => p.addEventListener('click', () => {
        if (today.done) return;
        vivShuffleToday(p.getAttribute('data-viv-cat'));
        self._refresh(container);
      }));

      // Today: "save the moment" toggle (shown after done)
      const addMemBtn = $('#vivAddMemBtn');
      if (addMemBtn) addMemBtn.addEventListener('click', () => { const f = container.querySelector('#vivMemForm'); if (f) f.classList.toggle('is-open'); const inp = container.querySelector('#vivMemText'); if (inp) inp.focus(); });

      // Shared photo handler factory
      let pendingMemPhoto = '';
      let pendingJarPhoto = '';
      const wirePhoto = (inputSel, lblSel, setter) => {
        const inp = $(inputSel); const lbl = $(lblSel);
        if (!inp) return;
        inp.addEventListener('change', () => {
          const file = inp.files && inp.files[0];
          if (!file) return;
          if (lbl) lbl.textContent = 'Compressing...';
          vivCompressImage(file, (url) => {
            setter(url);
            if (lbl) lbl.textContent = url ? 'Photo attached' : 'Could not add that photo';
          });
        });
      };
      wirePhoto('#vivMemPhoto', '#vivMemPhotoLbl', (u) => { pendingMemPhoto = u; });
      wirePhoto('#vivJarPhoto', '#vivJarPhotoLbl', (u) => { pendingJarPhoto = u; });

      // Today: save moment to jar (uses today's category by default)
      const memSave = $('#vivMemSave');
      if (memSave) memSave.addEventListener('click', () => {
        const text = ($('#vivMemText') || {}).value || '';
        const mood = ($('#vivMemMood') || {}).value || '';
        if (!text.trim()) { const i = $('#vivMemText'); if (i) i.focus(); return; }
        vivAddMemory({ text, mood, category: today.category, media: pendingMemPhoto ? [pendingMemPhoto] : [], silent: today.done });
        self._refresh(container);
      });

      // Jar: direct add toggle + save
      const jarToggle = $('#vivJarAddToggle');
      if (jarToggle) jarToggle.addEventListener('click', () => { const f = container.querySelector('#vivJarForm'); if (f) f.classList.toggle('is-open'); const inp = container.querySelector('#vivJarText'); if (inp && f && f.classList.contains('is-open')) inp.focus(); });
      // === Memory Movie (Photos Memories pattern): your kept moments as a
      // full-screen sequence. Photos get a slow Ken Burns drift, text-only
      // moments get the big-quote treatment. Auto-advances, tap for next,
      // Esc or X to close. Reduced motion = crossfade only.
      // Polaroid artifact: one memory as a dark Memento-styled PNG.
      const vivExportPolaroid = (m) => {
        try {
          const W = 640, PAD = 36;
          const cv = document.createElement('canvas');
          const cx = cv.getContext('2d');
          const finish = (imgH) => {
            const textY = PAD + imgH + (imgH ? 30 : 60);
            cv.height = textY + 150;
            // Re-draw after height set (canvas resets).
            cx.fillStyle = '#0b0c10';
            cx.fillRect(0, 0, W, cv.height);
            if (m.media && m.media[0] && window.__vivPolImg) {
              cx.drawImage(window.__vivPolImg, PAD, PAD, W - PAD * 2, imgH);
            }
            cx.fillStyle = 'rgba(245,245,247,0.95)';
            cx.font = '600 26px -apple-system, system-ui, sans-serif';
            // simple wrap
            const words = String(m.text || '').split(/\s+/);
            let line = '', y = textY + (imgH ? 8 : 0);
            words.forEach(w => {
              if (cx.measureText(line + ' ' + w).width > W - PAD * 2) { cx.fillText(line, PAD, y); y += 36; line = w; }
              else line = line ? line + ' ' + w : w;
            });
            cx.fillText(line, PAD, y);
            cx.fillStyle = 'rgba(201,162,75,0.95)';
            cx.font = '600 16px -apple-system, system-ui, sans-serif';
            const sub = [(m.iso ? new Date(m.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''), m.mood || '', m.person ? 'with ' + m.person : ''].filter(Boolean).join('  ·  ');
            cx.fillText(sub, PAD, y + 42);
            cx.fillStyle = 'rgba(245,245,247,0.35)';
            cx.font = '700 12px -apple-system, system-ui, sans-serif';
            cx.fillText('M E M E N T O', PAD, cv.height - 24);
            const a = document.createElement('a');
            a.href = cv.toDataURL('image/png');
            a.download = 'memento-moment.png';
            document.body.appendChild(a); a.click(); a.remove();
          };
          cv.width = W;
          if (m.media && m.media[0]) {
            const img = new Image();
            img.onload = () => { window.__vivPolImg = img; finish(Math.round((W - PAD * 2) * (img.height / img.width))); window.__vivPolImg = null; };
            img.onerror = () => finish(0);
            // Re-stash for finish's synchronous use.
            window.__vivPolImg = img;
            img.src = m.media[0];
          } else finish(0);
        } catch (e) {}
      };
      const playMovie = (list, startAt) => {
        const all = (list && list.length ? list : (state.vivere.memories || []).filter(m => m && m.text).slice(-30));
        if (!all.length) return;
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const old = document.getElementById('vivMovie'); if (old) old.remove();
        const ov = document.createElement('div');
        ov.id = 'vivMovie';
        ov.className = 'viv-movie' + (reduce ? ' viv-movie--calm' : '');
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', 'Memory movie');
        document.body.appendChild(ov);
        let i = Math.max(0, Math.min(all.length - 1, startAt || 0)), timer = 0;
        const closeMovie = () => { clearTimeout(timer); try { ov.remove(); } catch (e) {} document.removeEventListener('keydown', onKey, true); };
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMovie(); } };
        document.addEventListener('keydown', onKey, true);
        const fmtDate = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch (e) { return iso || ''; } };
        const show = () => {
          if (i >= all.length) { closeMovie(); return; }
          const m = all[i];
          const segs = all.map((x, k) => '<span class="viv-movie__seg' + (k < i ? ' is-done' : (k === i ? ' is-on' : '')) + '"></span>').join('');
          const meta = m._slide ? '' : [fmtDate(m.iso), m.person ? 'with ' + m.person : '', m.place || ''].filter(Boolean).join(' · ');
          ov.innerHTML =
            '<div class="viv-movie__segs">' + segs + '</div>' +
            '<button type="button" class="viv-movie__x" aria-label="Close">&times;</button>' +
            (m._slide ? '' : '<button type="button" class="viv-movie__save" aria-label="Save as image" title="Save as image"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>') +
            '<div class="viv-movie__slide">' +
              (m._slide
                ? '<div class="viv-movie__quote"><div class="viv-movie__text viv-movie__text--big">' + esc(m.text) + '</div><div class="viv-movie__meta">' + esc(m._slide) + '</div></div>'
                : m.media && m.media[0]
                ? '<img class="viv-movie__img" src="' + esc(m.media[0]) + '" alt="">' +
                  '<div class="viv-movie__scrim"></div>' +
                  '<div class="viv-movie__cap"><div class="viv-movie__text">' + esc(m.text) + '</div><div class="viv-movie__meta">' + esc(meta) + '</div></div>'
                : '<div class="viv-movie__quote"><div class="viv-movie__text viv-movie__text--big">' + esc(m.text) + '</div><div class="viv-movie__meta">' + esc(meta) + '</div></div>') +
            '</div>';
          ov.querySelector('.viv-movie__x').addEventListener('click', (e) => { e.stopPropagation(); closeMovie(); });
          const sv = ov.querySelector('.viv-movie__save');
          if (sv) sv.addEventListener('click', (e) => { e.stopPropagation(); vivExportPolaroid(m); });
          clearTimeout(timer);
          timer = setTimeout(() => { i++; show(); }, 4200);
        };
        ov.addEventListener('click', () => { i++; show(); });
        show();
      };
      // Your-Week recap: title slide + the week's moments + a closing card.
      const recapBtn = container.querySelector('#vivWeekRecapBtn');
      if (recapBtn) recapBtn.addEventListener('click', () => {
        const cut = new Date(); cut.setDate(cut.getDate() - 7);
        const cutIso = cut.getFullYear() + '-' + String(cut.getMonth() + 1).padStart(2, '0') + '-' + String(cut.getDate()).padStart(2, '0');
        const wk = (state.vivere.memories || []).filter(m => m && m.text && m.iso && m.iso >= cutIso);
        if (wk.length < 2) return;
        const moods = {};
        const ppl = new Set();
        wk.forEach(m => { if (m.mood) moods[m.mood] = (moods[m.mood] || 0) + 1; if (m.person) ppl.add(m.person); });
        const topMood = Object.keys(moods).sort((a, b) => moods[b] - moods[a])[0];
        const closing = wk.length + ' moments kept' + (topMood ? ' · mostly ' + topMood : '') + (ppl.size ? ' · with ' + Array.from(ppl).slice(0, 3).join(', ') : '');
        const slides = [{ text: 'Your week, lived.', _slide: 'The last 7 days' }]
          .concat(wk)
          .concat([{ text: closing, _slide: 'Keep going' }]);
        const wkKey = (() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
        state.vivere.weekRecap = { weekKey: wkKey, watched: true };
        try { persistNow(); } catch (e) {}
        playMovie(slides, 0);
        self._refresh(container);
      });
      // Timeline year scrubber.
      container.querySelectorAll('[data-viv-jaryear]').forEach(b => b.addEventListener('click', () => {
        self._jarYear = b.getAttribute('data-viv-jaryear') || '';
        self._refresh(container);
      }));
      const movieBtn = container.querySelector('#vivMovieBtn');
      if (movieBtn) movieBtn.addEventListener('click', () => playMovie(null, 0));
      // Shuffle dice (Retro pattern): one tap, a random kept moment, full
      // screen; tap again inside to keep wandering.
      const shuffleDice = container.querySelector('#vivShuffleDice');
      if (shuffleDice) shuffleDice.addEventListener('click', () => {
        const ms = (state.vivere.memories || []).filter(m => m && m.text);
        if (!ms.length) return;
        playMovie(ms, Math.floor(Math.random() * ms.length));
      });
      // Photo wall taps open the movie AT that photo.
      container.querySelectorAll('[data-viv-ph]').forEach(b => b.addEventListener('click', () => {
        const ms = (state.vivere.memories || []).filter(m => m && m.text && m.media && m.media[0]);
        playMovie(ms, parseInt(b.getAttribute('data-viv-ph'), 10) || 0);
      }));
      // Jar view switcher: grid | timeline | photos.
      container.querySelectorAll('[data-viv-jarview]').forEach(b => b.addEventListener('click', () => {
        self._jarView = b.getAttribute('data-viv-jarview');
        self._refresh(container);
      }));
      // On This Day flashback: tap plays the movie at that memory.
      const otd = container.querySelector('[data-viv-otd-mem]');
      if (otd) otd.addEventListener('click', () => {
        const id = otd.getAttribute('data-viv-otd-mem');
        const ms = (state.vivere.memories || []).filter(m => m && m.text);
        const ix = ms.findIndex(m => m.id === id);
        if (ix >= 0) playMovie(ms, ix);
      });

      // Jar find layer: search, filter chips, favorites.
      const jarSearch = $('#vivJarSearch');
      if (jarSearch) {
        let _jt = 0;
        jarSearch.addEventListener('input', () => {
          clearTimeout(_jt);
          _jt = setTimeout(() => {
            self._jarQ = jarSearch.value || '';
            const pos = jarSearch.selectionStart;
            self._refresh(container);
            const again = container.querySelector('#vivJarSearch');
            if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
          }, 220);
        });
      }
      container.querySelectorAll('[data-viv-jar-filter]').forEach(b => b.addEventListener('click', () => {
        const f = b.getAttribute('data-viv-jar-filter');
        self._jarFilter = (self._jarFilter === f) ? '' : f;
        self._refresh(container);
      }));
      container.querySelectorAll('[data-viv-mem-fav]').forEach(b => b.addEventListener('click', () => {
        const id = b.getAttribute('data-viv-mem-fav');
        const m = (state.vivere.memories || []).find(x => x && x.id === id);
        if (m) { m.fav = !m.fav; try { persistNow(); } catch (e) {} self._refresh(container); }
      }));
      const jarSave = $('#vivJarSave');
      if (jarSave) jarSave.addEventListener('click', () => {
        const text = ($('#vivJarText') || {}).value || '';
        const cat = ($('#vivJarCat') || {}).value || '';
        if (!text.trim()) { const i = $('#vivJarText'); if (i) i.focus(); return; }
        vivAddMemory({ text, category: cat, media: pendingJarPhoto ? [pendingJarPhoto] : [] });
        try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (e) {}
        self._refresh(container);
      });

      // Jar: delete a memory
      container.querySelectorAll('[data-viv-mem-del]').forEach(b => b.addEventListener('click', () => { vivRemoveMemory(b.getAttribute('data-viv-mem-del')); self._refresh(container); }));

      // Alive list: add toggle + save
      const aliveToggle = $('#vivAliveAddToggle');
      if (aliveToggle) aliveToggle.addEventListener('click', () => { const f = container.querySelector('#vivAliveForm'); if (f) f.classList.toggle('is-open'); const inp = container.querySelector('#vivAliveText'); if (inp && f && f.classList.contains('is-open')) inp.focus(); });
      const aliveSave = $('#vivAliveSave');
      if (aliveSave) aliveSave.addEventListener('click', () => {
        const text = ($('#vivAliveText') || {}).value || '';
        const horizon = ($('#vivAliveHorizon') || {}).value || 'month';
        if (!text.trim()) { const i = $('#vivAliveText'); if (i) i.focus(); return; }
        vivAddAlive(text, horizon);
        self._refresh(container);
      });
      // Allow Enter to submit the three quick-add inputs.
      [['#vivMemText', memSave], ['#vivJarText', jarSave], ['#vivAliveText', aliveSave]].forEach(([sel, btn]) => {
        const inp = $(sel);
        if (inp && btn) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
      });

      // Alive list: toggle + delete
      container.querySelectorAll('[data-viv-alive-toggle]').forEach(b => b.addEventListener('click', () => {
        const id = b.getAttribute('data-viv-alive-toggle');
        const wasDone = (state.vivere.aliveList || []).find(x => x && x.id === id);
        vivToggleAlive(id);
        if (wasDone && wasDone.done) { try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (e) {} }
        self._refresh(container);
      }));
      container.querySelectorAll('[data-viv-alive-del]').forEach(b => b.addEventListener('click', () => { vivRemoveAlive(b.getAttribute('data-viv-alive-del')); self._refresh(container); }));
    }
  },

  checkin: {
    // v23 Check-in: one light daily pulse (mood + energy + what is in the way).
    // Replaces the Energy + Friction daily flow on the default dashboard; both
    // of those keep their data and stay reachable from the More space. Soft
    // once-a-day guard: re-opening today shows the saved values, editable.
    _mood: 0,
    _energy: 0,
    _justSaved: false,
    MOODS: [
      { v: 1, label: 'Rough',  d: 'M7 16.4c1.7-2.8 8.3-2.8 10 0' },
      { v: 2, label: 'Low',    d: 'M7.5 15.5c1.8-1.6 7.2-1.6 9 0' },
      { v: 3, label: 'Okay',   d: 'M7.5 14.5h9' },
      { v: 4, label: 'Good',   d: 'M7.5 13.5c1.8 1.6 7.2 1.6 9 0' },
      { v: 5, label: 'Strong', d: 'M7 12.6c1.7 2.8 8.3 2.8 10 0' }
    ],
    _todayEntry() {
      const today = getTodayISO();
      return (Array.isArray(state.checkins) ? state.checkins : []).find(c => c && c.iso === today) || null;
    },
    render() {
      const entry = this._todayEntry();
      this._mood = entry ? (entry.mood || 0) : 0;
      this._energy = entry ? (entry.energy || 0) : 0;
      const C = 'var(--color-lifestats)';
      let html = '<div class="ci-card">';
      html += '<div style="font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:6px;">Daily check-in</div>';
      html += '<div style="font-size:1.25rem;font-weight:700;color:var(--text-hi);letter-spacing:-0.01em;">How are you today?</div>';
      html += entry
        ? '<div style="font-size:0.78rem;color:var(--text-lo);margin-top:5px;">Checked in today. Edit anything that changed.</div>'
        : '<div style="font-size:0.78rem;color:var(--text-lo);margin-top:5px;">Thirty seconds. Just the honest read.</div>';
      // Mood: five minimal line glyphs (no cartoon faces), 1 to 5.
      html += '<div class="ci-row-label">Mood</div>';
      html += '<div class="ci-moods" role="radiogroup" aria-label="Mood, 1 to 5">';
      this.MOODS.forEach(m => {
        const on = m.v === this._mood;
        html += '<button type="button" class="ci-mood' + (on ? ' is-on' : '') + '" data-mood="' + m.v + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="Mood: ' + m.label + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="' + m.d + '"/></svg>' +
          '<span>' + m.label + '</span></button>';
      });
      html += '</div>';
      // Energy: five tappable segments.
      html += '<div class="ci-row-label">Energy</div>';
      html += '<div class="ci-segs" role="radiogroup" aria-label="Energy, 1 to 5">';
      for (let i = 1; i <= 5; i++) {
        html += '<button type="button" class="ci-seg' + (i <= this._energy ? ' is-on' : '') + '" data-energy="' + i + '" role="radio" aria-checked="' + (i === this._energy ? 'true' : 'false') + '" aria-label="Energy: ' + i + ' of 5"></button>';
      }
      html += '</div>';
      html += '<div class="ci-row-label">What is in the way right now? <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--text-faint);">optional</span></div>';
      html += '<input id="ciBlocker" class="ci-input" type="text" autocomplete="off" maxlength="140" value="' + esc(entry ? (entry.blocker || '') : '') + '" placeholder="One line. Name it and it shrinks.">';
      html += '<div id="ciMsg" aria-live="polite" style="font-size:0.72rem;color:var(--text-lo);min-height:15px;margin-top:8px;"></div>';
      html += '<button class="sheet-btn" id="ciSave" style="margin-top:6px;background:' + C + ';color:#06211d;">' + (entry ? 'Update today' : 'Save') + '</button>';
      // Post-save: quiet park-it-in-Notes offer when a blocker was named.
      const hasBlocker = !!(entry && (entry.blocker || '').trim());
      if (hasBlocker && entry.parked) {
        html += '<div class="ci-park"><span>Parked in Notes.</span></div>';
      } else if (hasBlocker) {
        html += '<div class="ci-park"><span>That blocker sounds worth a longer think.</span><button type="button" id="ciPark">Park it in Notes?</button></div>';
      } else if (this._justSaved) {
        html += '<div class="ci-park"><span>Kept. See you tomorrow.</span></div>';
      }
      html += '</div>'; // .ci-card
      // Quiet week strip: which of the last 7 days have a check-in.
      try {
        const days = new Set((state.checkins || []).map(c => c && c.iso));
        let dots = '';
        let n = 0;
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const iso = localISO(d);
          const on = days.has(iso);
          if (on) n++;
          dots += '<span class="ci-dot' + (on ? ' is-on' : '') + '"></span>';
        }
        html += '<div class="ci-week"><span>' + n + ' check-in' + (n === 1 ? '' : 's') + ' this week</span><span class="ci-week__dots">' + dots + '</span></div>';
      } catch (e) {}
      this._justSaved = false;
      return '<div class="exp-shell exp-shell--top">' + html + '</div>';
    },
    bind(container) {
      const self = this;
      container.querySelectorAll('.ci-mood').forEach(b => b.addEventListener('click', () => {
        self._mood = parseInt(b.dataset.mood) || 0;
        container.querySelectorAll('.ci-mood').forEach(x => {
          const on = x === b;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-checked', on ? 'true' : 'false');
        });
      }));
      container.querySelectorAll('.ci-seg').forEach(b => b.addEventListener('click', () => {
        self._energy = parseInt(b.dataset.energy) || 0;
        container.querySelectorAll('.ci-seg').forEach(x => {
          const v = parseInt(x.dataset.energy) || 0;
          x.classList.toggle('is-on', v <= self._energy);
          x.setAttribute('aria-checked', v === self._energy ? 'true' : 'false');
        });
      }));
      const saveBtn = container.querySelector('#ciSave');
      if (saveBtn) saveBtn.addEventListener('click', () => {
        const msg = container.querySelector('#ciMsg');
        if (!self._mood || !self._energy) {
          if (msg) msg.textContent = 'Pick a mood and an energy level first.';
          return;
        }
        const iso = getTodayISO();
        const blocker = ((container.querySelector('#ciBlocker') || {}).value || '').trim().slice(0, 140);
        if (!Array.isArray(state.checkins)) state.checkins = [];
        const idx = state.checkins.findIndex(c => c && c.iso === iso);
        const prev = idx !== -1 ? state.checkins[idx] : null;
        const entry = { iso, ts: Date.now(), mood: self._mood, energy: self._energy, blocker, note: prev ? (prev.note || '') : '' };
        if (prev && prev.parked && blocker === (prev.blocker || '')) entry.parked = true;
        if (idx !== -1) state.checkins[idx] = entry; else state.checkins.push(entry);
        const moodLabel = (self.MOODS.find(m => m.v === self._mood) || {}).label || '';
        try { writeProofEvent('proof', { title: 'Checked in', text: blocker || ('Mood ' + moodLabel.toLowerCase() + ', energy ' + self._energy + ' of 5'), module: 'checkin', dedupeKey: 'checkin2-' + iso }); } catch (e) {}
        persistNow();
        try { renderAll(); } catch (e) {}
        self._justSaved = true;
        Sheet.body.innerHTML = self.render();
        self.bind(Sheet.body);
      });
      const parkBtn = container.querySelector('#ciPark');
      if (parkBtn) parkBtn.addEventListener('click', () => {
        const entry = self._todayEntry();
        const text = entry && (entry.blocker || '').trim();
        if (!entry || !text) return;
        const now = new Date();
        if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
        state.reflection.entries.push({ date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), iso: getTodayISO(), text: 'In the way today: ' + text });
        try { writeProofEvent('reflection-save', { title: 'Notes', text: text.slice(0, 140), module: 'reflection' }); } catch (e) {}
        entry.parked = true;
        persistNow();
        try { renderAll(); } catch (e) {}
        Sheet.body.innerHTML = self.render();
        self.bind(Sheet.body);
      });
      const blockerEl = container.querySelector('#ciBlocker');
      if (blockerEl && saveBtn) blockerEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); } });
    }
  },

  lifestats: {
    // Reshaped as "Energy": six dimensions of how fueled you are. Internal keys
    // stay sleep/diet/exercise (back-compat) plus mood/stress/focus (v16).
    DIMS: [
      { key: 'sleep', label: 'Sleep' },
      { key: 'exercise', label: 'Movement' },
      { key: 'diet', label: 'Food' },
      { key: 'mood', label: 'Mood' },
      { key: 'stress', label: 'Calm' },
      { key: 'focus', label: 'Focus' }
    ],
    render() {
      const ls = state.lifestats;
      const today = getTodayISO();
      const todayEntry = (ls.history || []).find(h => h.date === today);
      let html = '<div style="text-align:center;margin-bottom:18px"><div style="font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-lo);font-weight:700;">How is your fuel today</div><div style="font-size:0.82rem;color:var(--text-mid);margin-top:6px;line-height:1.45;">Rate each, 1 to 5. This is the context behind your consistency, not a report card.</div></div>';
      this.DIMS.forEach(d => {
        const current = todayEntry ? (todayEntry[d.key] || 0) : (ls[d.key] || 0);
        html += `<div class="lifestats-rating"><div class="lifestats-rating__label">${d.label}</div><div class="lifestats-rating__dots">`;
        for (let i = 1; i <= 5; i++) {
          html += `<div class="lifestats-dot ${i <= current ? 'lifestats-dot--active' : ''}" role="button" tabindex="0" aria-label="${d.label}: ${i} of 5" data-cat="${d.key}" data-val="${i}">${i}</div>`;
        }
        html += '</div></div>';
      });
      html += '<button class="sheet-btn sheet-btn--lifestats" id="lifestatsSave">Save today</button>';
      html += this.renderEnergyInsight();
      html += this.renderEnergyTrends();
      return '<div class="exp-shell">' + html + '</div>';
    },
    // 7-day energy average + a calm correlation with deep work, when there is
    // enough history. Read-only context, never a guilt stat.
    renderEnergyInsight() {
      try {
        const hist = (state.lifestats.history || []).filter(h => h && h.date);
        if (hist.length < 2) return '';
        const dims = ['sleep', 'exercise', 'diet', 'mood', 'stress', 'focus'];
        const score = (h) => { let s = 0, n = 0; dims.forEach(k => { if (typeof h[k] === 'number' && h[k] > 0) { s += h[k]; n++; } }); return n ? s / n : 0; };
        const recent = hist.slice(-7).filter(h => score(h) > 0);
        if (!recent.length) return '';
        const avg = recent.reduce((a, h) => a + score(h), 0) / recent.length;
        let line = '';
        try {
          const dwDays = new Set((state.deepwork.sessions || []).map(s => s.iso || s.dateISO).filter(Boolean));
          const scoreAll = hist.filter(h => score(h) > 0);
          const withDw = scoreAll.filter(h => dwDays.has(h.date));
          const woDw = scoreAll.filter(h => !dwDays.has(h.date));
          if (withDw.length >= 2 && woDw.length >= 2) {
            const a = withDw.reduce((x, h) => x + score(h), 0) / withDw.length;
            const b = woDw.reduce((x, h) => x + score(h), 0) / woDw.length;
            if (a - b >= 0.5) line = 'Your deep work days tend to be your higher-energy days. Fuel first, then focus.';
          }
        } catch (e) {}
        return `<div style="margin-top:20px;padding:16px;border-radius:var(--card-r);background:var(--surface-1);border:1px solid var(--hairline);">
          <div style="font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:6px;">Last 7 days</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--text-hi);font-variant-numeric:tabular-nums;">${avg.toFixed(1)} <span style="font-size:0.9rem;font-weight:600;color:var(--text-lo);">/ 5 energy</span></div>
          ${line ? `<div style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);margin-top:8px;">${esc(line)}</div>` : ''}
        </div>`;
      } catch (e) { return ''; }
    },
    // A tiny inline-SVG sparkline for a 0-5 series (0 = no entry that day).
    energySparkline(vals) {
      const w = 132, h = 30, n = vals.length;
      if (!n) return '';
      const step = n > 1 ? w / (n - 1) : w;
      const pts = vals.map((v, i) => { const x = i * step; const y = v > 0 ? (h - (v / 5) * (h - 5) - 2.5) : (h - 2.5); return x.toFixed(1) + ',' + y.toFixed(1); }).join(' ');
      return '<svg class="enspark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="var(--color-lifestats)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    },
    // Per-dimension 14-day trend rows. Read-only, appears once there is history.
    renderEnergyTrends() {
      try {
        const hist = (state.lifestats.history || []).filter(h => h && h.date);
        if (hist.length < 3) return '';
        const last = hist.slice(-14);
        let rows = '';
        this.DIMS.forEach(d => {
          const vals = last.map(h => h[d.key] || 0);
          const have = vals.filter(v => v > 0);
          const avg = have.length ? (have.reduce((a, b) => a + b, 0) / have.length) : 0;
          rows += '<div class="entrend"><span class="entrend__label">' + d.label + '</span>' + this.energySparkline(vals) + '<span class="entrend__val">' + (avg ? avg.toFixed(1) : '-') + '</span></div>';
        });
        return '<div class="entrends"><div class="entrends__title">Last 14 days</div>' + rows + '</div>';
      } catch (e) { return ''; }
    },
    bind(container) {
      const setDots = (cat, val) => container.querySelectorAll('.lifestats-dot[data-cat="' + cat + '"]').forEach(d => d.classList.toggle('lifestats-dot--active', parseInt(d.dataset.val) <= val));
      container.querySelectorAll('.lifestats-dot').forEach(dot => {
        const apply = () => { const cat = dot.dataset.cat; const val = parseInt(dot.dataset.val); state.lifestats[cat] = val; setDots(cat, val); };
        dot.addEventListener('click', apply);
        dot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(); } });
      });
      const saveBtn = container.querySelector('#lifestatsSave');
      if (saveBtn) saveBtn.addEventListener('click', () => {
        const today = getTodayISO();
        const ls = state.lifestats;
        const entry = { date: today, sleep: ls.sleep || 0, diet: ls.diet || 0, exercise: ls.exercise || 0, mood: ls.mood || 0, stress: ls.stress || 0, focus: ls.focus || 0 };
        if (!Array.isArray(ls.history)) ls.history = [];
        const idx = ls.history.findIndex(h => h.date === today);
        if (idx !== -1) ls.history[idx] = entry; else ls.history.push(entry);
        if (ls.history.length > 90) ls.history = ls.history.slice(-90);
        persistNow(); renderAll(); Sheet.close();
      });
    }
  },

  deepwork: {
    // Timer state lives on the template object (not the bind closure) so that
    // Sheet.close() can clear the interval and save an in-progress session no
    // matter how the sheet is dismissed (backdrop, close button, drag-down).
    _intervalId: null,
    _elapsed: 0,
    _running: false,
    // Save (>= 1 min) or cleanly discard a running session, then reset. Called
    // both from the Stop button and from Sheet.close(). Returns true if a
    // session was logged.
    _intention: '',
    _targetSec: 0,
    _commit() {
      if (this._intervalId) { clearInterval(this._intervalId); this._intervalId = null; }
      // If the focus overlay is open (e.g. the sheet is being dismissed), remove
      // it so it can never linger with a frozen timer.
      try { const o = document.getElementById('dwFocusOverlay'); if (o) o.remove(); } catch (e) {}
      const wasRunning = this._running;
      const mins = Math.round(this._elapsed / 60);
      let logged = false;
      if (wasRunning && mins >= 1) {
        const intention = (this._intention || '').slice(0, 200);
        if (!Array.isArray(state.deepwork.sessions)) state.deepwork.sessions = [];
        state.deepwork.sessions.push({
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          iso: getTodayISO(),
          minutes: mins,
          intention: intention,
          note: '',
          // Additive: when the session STARTED, so the planner can draw
          // planned-vs-actual on the timeline.
          startedAt: Date.now() - mins * 60000
        });
        if (state.deepwork.sessions.length > 180) state.deepwork.sessions = state.deepwork.sessions.slice(-180);
        try { writeProofEvent('deepwork-commit', { title: mins + ' min deep work', text: intention, module: 'deepwork', metadata: { minutes: mins } }); } catch (_) {}
        logged = true;
      }
      this._running = false;
      this._elapsed = 0;
      this._intention = '';
      this._targetSec = 0;
      return logged;
    },
    render() {
      const sessions = state.deepwork.sessions || [];
      const totalMin = sessions.reduce((a, s) => a + (s.minutes || 0), 0);
      const totalH = totalMin / 60;
      // v19 Deep Work Studio: link the session to today's one thing by default.
      const oneThing = (state.action && state.action.primaryAction && state.action.primaryAction.title) || '';
      const presets = [['25 min', 25], ['50 min', 50], ['90 min', 90], ['3 h', 180], ['4 h', 240], ['Open', 0]];
      let html = `
        <div style="padding: 8px 0 4px;">
          <div style="font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:8px;">What are you building?</div>
          <input id="dwIntention" type="text" autocomplete="off" value="${esc(oneThing)}" placeholder="One sentence. The thing this session is for." style="width:100%;box-sizing:border-box;font:inherit;font-size:0.9rem;color:var(--text-hi);background:var(--surface-1);border:1px solid var(--hairline);border-radius:calc(8px * var(--rx, 1));padding:11px 13px;outline:none;">${oneThing ? '<div style="font-size:0.68rem;color:var(--text-lo);margin-top:6px;">Linked to today&rsquo;s one thing. Edit if this session is for something else.</div>' : ''}
          <div id="dwPresets" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;">`;
      presets.forEach(([label, m]) => {
        html += `<button class="dw-preset" data-min="${m}" aria-label="${m ? 'Set a ' + label + ' focus target' : 'Open ended session'}" style="font:inherit;font-size:0.78rem;font-weight:650;cursor:pointer;border:1px solid var(--hairline);border-radius:999px;padding:6px 13px;background:transparent;color:var(--text-mid);">${label}</button>`;
      });
      html += `</div>
        </div>
        <div style="text-align:center; padding: 22px 0 8px;">
          <div style="font-size: 3.75rem; font-weight: 800; color: var(--color-deepwork); letter-spacing: -0.04em; font-variant-numeric: tabular-nums;" id="dwTimer">0:00</div>
          <div style="font-size: 0.8rem; color: var(--text-lo); margin-top: 6px;" id="dwTargetLabel">Open session</div>
          <button class="sheet-btn" id="dwStart" style="margin-top: 22px; max-width: 240px; margin-left: auto; margin-right: auto; background: var(--color-deepwork); color: #fff;">Start</button>
          <button id="dwFocus" style="margin: 12px auto 0; max-width: 240px; display:block; width:100%; font:inherit; font-weight:600; font-size:0.85rem; cursor:pointer; border:1px solid var(--hairline); border-radius:calc(8px * var(--rx, 1)); padding:11px 16px; background:transparent; color:var(--text-mid);">Enter focus mode</button>
        </div>`;
      // Post-session note: if the most recent session is from today and has no
      // note yet, invite one line about what got produced.
      const last = sessions.length ? sessions[sessions.length - 1] : null;
      if (last && last.iso === getTodayISO() && !last.note) {
        html += `<div style="margin-top:8px;padding:14px;border-radius:var(--card-r);background:var(--surface-1);border:1px solid var(--hairline);">
          <div style="font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:8px;">What did you produce?</div>
          <input id="dwLastNote" type="text" autocomplete="off" placeholder="Name the evidence. One line." style="width:100%;box-sizing:border-box;font:inherit;font-size:0.88rem;color:var(--text-hi);background:transparent;border:1px solid var(--hairline);border-radius:calc(8px * var(--rx, 1));padding:9px 11px;outline:none;">
        </div>`;
      }
      if (sessions.length) {
        const bars = renderDeepworkBars();
        if (bars) {
          html += '<div style="margin-top: 16px; border-top: 1px solid var(--hairline); padding-top: 16px;">';
          html += `<div style="font-size: 0.7rem; color: var(--text-lo); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Last 14 days</div>`;
          html += bars;
          html += '</div>';
        }
        html += '<div style="margin-top: 16px; border-top: 1px solid var(--hairline); padding-top: 16px;">';
        // v19 Deep Work Studio: focus analytics from existing sessions.
        const _todayN = Math.floor(Date.parse(getTodayISO() + 'T00:00:00Z') / 86400000);
        const _isoToN = (iso) => { const t = Date.parse((iso || '') + 'T00:00:00Z'); return isNaN(t) ? null : Math.floor(t / 86400000); };
        let thisWeekMin = 0; const daySet = {};
        sessions.forEach(s => { const n = _isoToN(s.iso); if (n == null) return; if (_todayN - n >= 0 && _todayN - n < 7) thisWeekMin += (s.minutes || 0); daySet[n] = true; });
        let dayStreak = 0, cursor = _todayN; if (!daySet[cursor]) cursor = _todayN - 1; while (daySet[cursor]) { dayStreak++; cursor--; }
        const _stat = (v, l) => '<div style="text-align:center;"><div style="font-size:1.45rem;font-weight:800;color:var(--text-hi);letter-spacing:-0.02em;font-variant-numeric:tabular-nums;line-height:1;">' + v + '</div><div style="font-size:0.58rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-lo);margin-top:5px;">' + l + '</div></div>';
        html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">' + _stat((thisWeekMin / 60).toFixed(1) + 'h', 'This week') + _stat(totalH.toFixed(1) + 'h', 'Total deep') + _stat(sessions.length, 'Sessions') + _stat(dayStreak, 'Day streak') + '</div>';
        sessions.slice(-6).reverse().forEach(s => {
          const mins = s.minutes || 0;
          const dur = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
          const sub = s.note || s.intention || '';
          html += `<div style="padding: 9px 0; border-bottom: 1px solid var(--hairline);">
            <div style="display:flex;justify-content:space-between;font-size: 0.8125rem; color: var(--text-mid);"><span>${esc(s.date)}</span><span style="color:var(--color-deepwork);">${dur}</span></div>`;
          if (sub) html += `<div style="font-size:0.8rem;color:var(--text-lo);margin-top:3px;line-height:1.4;">${esc(sub)}</div>`;
          html += `</div>`;
        });
        html += '</div>';
      }
      html += oneThingFooterHtml();
      return '<div class="exp-shell exp-shell--top">' + html + '</div>';
    },
    bind(container) {
      const self = this;
      // Defensively clear any orphaned interval before (re)binding.
      if (self._intervalId) { clearInterval(self._intervalId); self._intervalId = null; }
      self._running = false;
      self._elapsed = 0;
      self._targetSec = 0;
      const timerEl = container.querySelector('#dwTimer');
      const startBtn = container.querySelector('#dwStart');
      const targetLabel = container.querySelector('#dwTargetLabel');
      const intentionEl = container.querySelector('#dwIntention');
      const fmt = (sec) => {
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
      };
      // Preset chips set a target (0 = open). Disabled once running.
      container.querySelectorAll('.dw-preset').forEach(chip => chip.addEventListener('click', () => {
        if (self._running) return;
        const m = parseInt(chip.dataset.min) || 0;
        self._targetSec = m * 60;
        container.querySelectorAll('.dw-preset').forEach(c => { const on = c === chip; c.style.background = on ? 'var(--color-deepwork)' : 'transparent'; c.style.color = on ? '#fff' : 'var(--text-mid)'; c.style.borderColor = on ? 'var(--color-deepwork)' : 'var(--hairline)'; });
        if (targetLabel) targetLabel.textContent = m ? ('Target ' + (m >= 60 ? (m / 60) + ' h' : m + ' min')) : 'Open session';
      }));
      // Full-screen focus mode: a calm, chrome-free overlay with the intention
      // and the running timer. The interval updates both the sheet display and
      // (if open) the focus overlay. Exiting focus keeps the session running.
      let focusTimerEl = null;
      const _updateTimer = (text) => {
        if (timerEl) timerEl.textContent = text;
        if (focusTimerEl) focusTimerEl.textContent = text;
        // A3 thin progress line: fills toward the target; hidden-by-empty on open-ended runs.
        try {
          const bar = document.getElementById('dwFocusBar');
          if (bar && self._targetSec > 0) bar.style.width = Math.min(100, (self._elapsed / self._targetSec) * 100) + '%';
        } catch (_) {}
      };
      const _exitFocus = () => {
        const o = document.getElementById('dwFocusOverlay'); if (o) o.remove(); focusTimerEl = null;
        // v872 (Action sweep): focus launched FROM the Action plan (aplFocus)
        // opens this sheet as plumbing; exiting focus must land back on A5,
        // not strand the user on the Deep Work sheet.
        if (window.__dwFromAction) {
          window.__dwFromAction = false;
          try { if (typeof Sheet !== 'undefined' && Sheet.close) Sheet.close(); } catch (e) {}
        }
      };
      const finish = () => {
        const logged = self._commit();
        if (logged) { persistNow(); renderWidget('streak'); }
        _exitFocus();
        Sheet.body.innerHTML = SHEET_TEMPLATES.deepwork.render();
        SHEET_TEMPLATES.deepwork.bind(Sheet.body);
      };
      const startTimer = () => {
        if (self._running) return;
        self._running = true;
        self._intention = intentionEl ? intentionEl.value.trim() : '';
        startBtn.textContent = 'Stop & Log';
        if (intentionEl) intentionEl.setAttribute('readonly', 'readonly');
        self._intervalId = setInterval(() => {
          self._elapsed++;
          if (self._targetSec > 0) {
            const remain = Math.max(0, self._targetSec - self._elapsed);
            _updateTimer(fmt(remain));
            if (remain <= 0) { finish(); return; }
          } else {
            _updateTimer(fmt(self._elapsed));
          }
        }, 1000);
      };
      startBtn.addEventListener('click', () => { if (!self._running) startTimer(); else finish(); });
      const focusBtn = container.querySelector('#dwFocus');
      if (focusBtn) focusBtn.addEventListener('click', () => {
        startTimer();
        _exitFocus();
        const intention = self._intention || (intentionEl ? intentionEl.value.trim() : '') || 'Deep work';
        const cur = self._targetSec > 0 ? Math.max(0, self._targetSec - self._elapsed) : self._elapsed;
        const o = document.createElement('div');
        o.id = 'dwFocusOverlay';
        o.setAttribute('role', 'dialog');
        o.setAttribute('aria-label', 'Deep work focus mode');
        // v827: the A3 running state (Malik's locked finals). Flat near-black in
        // BOTH themes, huge tabular time, dimmed task, no amber, no borders.
        o.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:#060608;padding:40px;text-align:center;';
        o.innerHTML =
          '<div id="dwFocusTimer" style="font-size:clamp(3.6rem,16vw,8rem);font-weight:700;letter-spacing:-0.03em;color:rgba(255,255,255,0.96);font-variant-numeric:tabular-nums;line-height:0.9;">' + fmt(cur) + '</div>' +
          '<div style="width:120px;height:3px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden;"><div id="dwFocusBar" style="width:0%;height:100%;border-radius:2px;background:var(--success);"></div></div>' +
          '<div style="font-size:0.84375rem;font-weight:500;color:rgba(255,255,255,0.5);max-width:480px;line-height:1.45;">' + esc(intention) + '</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px;">' +
            '<button id="dwFocusEnd" style="font:inherit;font-weight:700;font-size:0.875rem;cursor:pointer;border:none;border-radius:calc(10px * var(--rx, 1));padding:13px 24px;background:#fff;color:#0a0c0e;">End and log</button>' +
            '<button id="dwFocusExit" style="font:inherit;font-weight:600;font-size:0.875rem;cursor:pointer;border:none;border-radius:calc(10px * var(--rx, 1));padding:13px 24px;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.9);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07);">Exit focus</button>' +
          '</div>' +
          '<input id="dwPark" type="text" autocomplete="off" placeholder="Park a distraction, then stay. Enter to save." aria-label="Park a distraction to your inbox" style="margin-top:4px;max-width:440px;width:100%;box-sizing:border-box;font:inherit;font-size:0.85rem;color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.05);border:none;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);border-radius:calc(8px * var(--rx, 1));padding:11px 14px;outline:none;text-align:center;">' +
          '<div id="dwParkMsg" aria-live="polite" style="font-size:0.7rem;color:rgba(255,255,255,0.6);min-height:14px;margin-top:-16px;">&nbsp;</div>';
        document.body.appendChild(o);
        focusTimerEl = o.querySelector('#dwFocusTimer');
        o.querySelector('#dwFocusExit').addEventListener('click', _exitFocus);
        o.querySelector('#dwFocusEnd').addEventListener('click', finish);
        // v19 Deep Work Studio: distraction parking lot. A thought that would
        // break focus goes straight to the capture inbox instead of a tab.
        const parkEl = o.querySelector('#dwPark'); const parkMsg = o.querySelector('#dwParkMsg');
        if (parkEl) parkEl.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          const v = parkEl.value.trim(); if (!v) return;
          try { if (typeof captureToNotes === 'function') captureToNotes(v); } catch (_) {}
          parkEl.value = '';
          if (parkMsg) { parkMsg.textContent = 'Parked in Notes. Back to work.'; setTimeout(() => { if (parkMsg) parkMsg.textContent = ' '; }, 1800); }
        });
      });
      // Post-session note saves onto the most recent session.
      const noteEl = container.querySelector('#dwLastNote');
      if (noteEl) {
        const save = () => {
          const sess = state.deepwork.sessions;
          if (sess && sess.length) { sess[sess.length - 1].note = noteEl.value.trim().slice(0, 200); persistNow(); }
        };
        noteEl.addEventListener('blur', save);
        noteEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { save(); noteEl.blur(); } });
      }
    }
  },

  distraction: {
    render() {
      const logs = state.distraction.logs || [];
      // Count categories for pattern view
      const catCounts = {};
      logs.forEach(l => { catCounts[l.category] = (catCounts[l.category] || 0) + 1; });
      const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
      const totalToday = logs.filter(l => l.date === getTodayISO()).length;

      let html = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">Quick Log</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;" id="distractCats">
            ${['Social Media', 'Notification', 'Person', 'Thought', 'News', 'YouTube', 'Email', 'Other'].map(cat =>
              `<button class="distract-chip" data-cat="${cat}" aria-label="Log ${cat} as what pulled you away" style="padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(var(--ink),0.1); background: var(--kfill-04); color: var(--text-1); font-family: var(--font); font-size: 0.8125rem; cursor: pointer; transition: all 0.2s;">${cat}</button>`
            ).join('')}
          </div>
          <textarea class="wiz__text-input wiz__textarea" id="distractNote" placeholder="What pulled you away? A word or two is plenty. (optional)" style="min-height: 60px; font-size: 0.875rem;"></textarea>
          <button class="sheet-btn" id="distractLog" style="margin-top: 12px; background: var(--color-distraction); color: #fff; opacity: 0.4; pointer-events: none;">Log Distraction</button>
        </div>`;

      // Pattern summary
      if (sorted.length) {
        html += `<div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(var(--ink),0.06);">`;
        html += `<div style="font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px;">Patterns · ${logs.length} total${totalToday ? ' · ' + totalToday + ' today' : ''}</div>`;
        sorted.forEach(([cat, count]) => {
          const pct = Math.round((count / logs.length) * 100);
          html += `<div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 4px;">
              <span style="color: var(--text-1);">${esc(cat)}</span>
              <span style="color: var(--text-3);">${count}× (${pct}%)</span>
            </div>
            <div style="height: 4px; border-radius: 2px; background: var(--kfill-06);">
              <div style="height: 100%; width: ${pct}%; border-radius: 2px; background: var(--color-distraction); opacity: 0.7;"></div>
            </div>
          </div>`;
        });
        html += `</div>`;
      }

      // Log history
      if (logs.length) {
        html += `<div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(var(--ink),0.06);">`;
        html += `<div style="font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px;">History</div>`;
        logs.slice().reverse().slice(0, 30).forEach(log => {
          html += `<div style="padding: 10px 0; border-bottom: 1px solid rgba(var(--ink),0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.8125rem; color: var(--color-distraction); font-weight: 600;">${esc(log.category)}</span>
              <span style="font-size: 0.6875rem; color: var(--text-3);">${esc(log.time)}</span>
            </div>
            ${log.note ? `<div style="font-size: 0.8125rem; color: var(--text-2); margin-top: 4px;">${esc(log.note)}</div>` : ''}
          </div>`;
        });
        html += `</div>`;
      }

      // ---- Guardrails (merged from Flow): proactive protection -------------
      const fitems = (state.flow && Array.isArray(state.flow.items)) ? state.flow.items : [];
      const fdone = fitems.filter(i => i.done).length;
      html += '<div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--hairline);">';
      html += '<div style="font-size:0.75rem;color:var(--text-lo);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Your guardrails' + (fitems.length ? ' · ' + fdone + ' of ' + fitems.length + ' active' : '') + '</div>';
      html += '<div style="font-size:0.82rem;color:var(--text-mid);line-height:1.45;margin-bottom:14px;">Set up the environment so the distraction never reaches you in the first place.</div>';
      html += '<div class="quick-chips">';
      ['Delete a trigger app', 'Airplane mode during focus', 'App timer (30 min)', 'No phone in bedroom', 'Grayscale after 9pm'].forEach(chip => { if (!fitems.find(i => i.text === chip)) html += '<div class="chip" data-frchip="' + esc(chip) + '">' + esc(chip) + '</div>'; });
      html += '</div>';
      html += '<div class="input-row" style="margin:12px 0 14px;"><input class="sheet-field__input" id="frCustom" placeholder="Add a guardrail..."><button class="sheet-btn--icon" id="frAdd" aria-label="Add guardrail">+</button></div>';
      fitems.forEach((item, i) => {
        html += '<div class="check-item"><div class="check-item__box ' + (item.done ? 'checked' : '') + '" data-fridx="' + i + '" role="checkbox" aria-checked="' + (item.done ? 'true' : 'false') + '" tabindex="0" style="' + (item.done ? 'background:var(--color-flow);' : '') + '">' + (item.done ? '✓' : '') + '</div><span class="check-item__text ' + (item.done ? 'done' : '') + '">' + esc(item.text) + '</span><button class="check-item__delete" data-fridel="' + i + '" aria-label="Remove guardrail">&times;</button></div>';
      });
      html += '<button class="sheet-btn" id="frDeepwork" style="margin-top:16px;background:var(--surface-2);color:var(--text-hi);border:1px solid var(--hairline);">Start a Deep Work block</button>';
      html += '</div>';

      html += oneThingFooterHtml();
      return '<div class="exp-shell exp-shell--top">' + html + '</div>';
    },
    bind(container) {
      let selectedCat = null;
      const logBtn = container.querySelector('#distractLog');
      const chips = container.querySelectorAll('.distract-chip');

      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => { c.style.background = 'var(--kfill-04)'; c.style.borderColor = 'rgba(var(--ink),0.1)'; });
          chip.style.background = 'rgba(255,107,107,0.2)';
          chip.style.borderColor = 'var(--color-distraction)';
          selectedCat = chip.dataset.cat;
          logBtn.style.opacity = '1';
          logBtn.style.pointerEvents = 'auto';
        });
      });

      logBtn.addEventListener('click', () => {
        if (!selectedCat || logBtn.disabled) return;
        logBtn.disabled = true; // guard against a rapid double tap re-logging before re-render
        const note = container.querySelector('#distractNote').value.trim();
        const now = new Date();
        if (!Array.isArray(state.distraction.logs)) state.distraction.logs = [];
        state.distraction.logs.push({
          category: selectedCat,
          note,
          date: getTodayISO(),
          time: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        });
        try { writeProofEvent('distraction-log', { title: selectedCat || 'Distraction', text: note || '', module: 'distraction', metadata: { category: selectedCat } }); } catch (_) {}
        persistNow(); renderAll();
        Sheet.body.innerHTML = SHEET_TEMPLATES.distraction.render();
        SHEET_TEMPLATES.distraction.bind(Sheet.body);
      });

      // ---- Guardrails (merged Flow) handlers -------------------------------
      if (!Array.isArray(state.flow.items)) state.flow.items = [];
      const frRerender = () => { Sheet.body.innerHTML = SHEET_TEMPLATES.distraction.render(); SHEET_TEMPLATES.distraction.bind(Sheet.body); };
      const frToggle = (i) => { if (state.flow.items[i]) { state.flow.items[i].done = !state.flow.items[i].done; persistState(); renderWidget('streak'); frRerender(); } };
      container.querySelectorAll('.check-item__box[data-fridx]').forEach(box => {
        box.addEventListener('click', () => frToggle(parseInt(box.dataset.fridx)));
        box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); frToggle(parseInt(box.dataset.fridx)); } });
      });
      container.querySelectorAll('.check-item__delete[data-fridel]').forEach(del => del.addEventListener('click', () => {
        state.flow.items.splice(parseInt(del.dataset.fridel), 1); persistState(); renderAll(); frRerender();
      }));
      container.querySelectorAll('.chip[data-frchip]').forEach(chip => chip.addEventListener('click', () => {
        state.flow.items.push({ id: 'f' + Date.now(), text: chip.dataset.frchip, done: false }); persistState(); renderAll(); frRerender();
      }));
      const frAdd = container.querySelector('#frAdd'); const frCustom = container.querySelector('#frCustom');
      if (frAdd && frCustom) {
        const doAdd = () => { const t = frCustom.value.trim(); if (!t) return; state.flow.items.push({ id: 'f' + Date.now(), text: t, done: false }); persistState(); renderAll(); frRerender(); };
        frAdd.addEventListener('click', doAdd);
        frCustom.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
      }
      const frDw = container.querySelector('#frDeepwork');
      if (frDw) frDw.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('deepwork'); } catch (e) {} });
    }
  },

  reflection: {
    _q: '',
    _tag: '',
    _view: 'all',
    render() {
      const r = state.reflection;
      if (!Array.isArray(r.entries)) r.entries = [];
      this._ensureIds();
      const entries = r.entries;
      let active = entries.find(e => e.id === r.activeNoteId);
      if (!active && entries.length && (this._view || 'all') !== 'trash') active = entries.slice().sort((a, b) => ((b.iso || '') + '').localeCompare((a.iso || '') + '') || (b.updated || 0) - (a.updated || 0))[0];
      // Keep activeNoteId in sync with the displayed note so edit/delete act on it.
      if (active && r.activeNoteId !== active.id) r.activeNoteId = active.id;
      const fresh = (typeof Sheet !== 'undefined' && Sheet._expReveal);
      // Mobile drill-down: on a fresh open, restore where the user last was. If
      // they closed Notes while inside a note (r.openInNote persisted), reopen
      // straight to that note full-screen; otherwise land on the library.
      if (fresh) this._mobileEditing = !!(r.openInNote && active);
      const d = (r.disp && typeof r.disp === 'object') ? r.disp : (r.disp = { font: 'system', surface: 'glass' });
      const shellCls = 'rnotes'
        + (active ? ' rnotes--editing' : '')
        + (this._mobileEditing ? ' rnotes--mobedit' : '')
        + (d.surface === 'solid' ? ' rnotes--solid' : '')
        + (d.font && d.font !== 'system' ? ' rnotes--font-' + d.font : '')
        + (d.theme && d.theme !== 'auto' ? ' rnotes--theme-' + d.theme : '')
        + (this._fs ? ' rnotes--fs' : '')
        + (this._zen ? ' rnotes--zen' : '')
        + (this._grid ? ' rnotes--grid' : '')
        + (fresh ? ' exp-reveal' : '');
      let html = '<div class="exp-shell exp-shell--top rnotes-shell">';
      html += '<div class="' + shellCls + '"' + (fresh ? ' style="--i:0"' : '') + '>';
      const ICON_GRID = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
      const ICON_LIST = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
      html += '<aside class="rnotes__side">'
        + '<div class="rnotes__brand"><span class="rnotes__brand-t">Notes</span><span class="rnotes__brand-n">' + (state.reflection.entries || []).length + '</span></div>'
        + '<div class="rnotes__sidehead">'
          + '<input id="rSearch" class="rnotes__search" type="text" placeholder="Search notes" value="' + esc(this._q || '') + '" autocomplete="off">'
          + '<button class="rnotes__icon" id="rGridToggle" title="' + (this._grid ? 'List view' : 'Gallery view') + '" aria-label="Toggle gallery view">' + (this._grid ? ICON_LIST : ICON_GRID) + '</button>'
          + '<button class="rnotes__icon' + (this._selectMode ? ' rnotes__icon--on' : '') + '" id="rSelectToggle" title="Select notes" aria-label="Select notes"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></button>'
          + '<div class="rnew-wrap">'
            + '<button class="rnotes__new rnotes__new--today" id="rToday" aria-label="Open today\'s note" title="Today\'s note">Today</button>'
            + '<button class="rnotes__new" id="rNew" aria-label="New note">+ New</button>'
            + '<button class="rnotes__new rnotes__new--caret" id="rNewMore" aria-label="New note from template" aria-haspopup="true"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>'
          + '</div>'
        + '</div>'
        + (() => {
          // Recents: the last 5 edited notes, one tap away (Bear pattern).
          const rec = (state.reflection.entries || []).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 5);
          if (rec.length < 2) return '';
          return '<div class="rrecents"><div class="rlist-eyebrow" style="padding:0 2px 5px;">Recent</div>'
            + rec.map(e => '<button type="button" class="rrecent" data-rrecent="' + esc(e.id) + '">' + esc(this._title(e)) + '</button>').join('')
            + '</div>';
        })()
        + '<div class="rnotes__folders" id="rFolders">' + this._foldersHtml() + '</div>'
        + '<div class="rnotes__list" id="rList">' + this._listHtml(active) + '</div>'
        + (this._selectMode ? (() => {
          const n = (this._selected && this._selected.size) || 0;
          const folders = (state.reflection.folders || []);
          return '<div class="rbatch">'
            + '<span class="rbatch__n">' + n + ' selected</span>'
            + '<button type="button" class="rbatch__btn" id="rBatchPin"' + (n ? '' : ' disabled') + '>Pin</button>'
            + '<select class="rbatch__sel" id="rBatchMove"' + (n ? '' : ' disabled') + '><option value="">Move to...</option><option value="__none">No folder</option>'
            + folders.map(f => '<option value="' + esc(f.id) + '">' + esc(f.name) + '</option>').join('') + '</select>'
            + '<button type="button" class="rbatch__btn rbatch__btn--del" id="rBatchDel"' + (n ? '' : ' disabled') + '>Delete</button>'
            + '</div>';
        })() : '')
        + '</aside>';
      const MOBBACK = '<button class="rnotes__mobback" id="rMobBack" aria-label="Back to all notes"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Notes</button>';
      html += '<section class="rnotes__main" id="rMain">' + MOBBACK + (this._grid ? '<div class="rgrid-wrap" id="rGridWrap">' + this._gridHtml() + '</div>' : (this._pinnedTabsHtml() + this._editorHtml(active))) + '</section>';
      html += '</div></div>';
      return html;
    },
    _ensureIds() {
      (state.reflection.entries || []).forEach((x, i) => { if (!x.id) x.id = 'rn_' + (x.iso || 'x') + '_' + i + '_' + Math.floor((x.ts || 0) / 1000); });
    },
    _pinnedTabsHtml() {
      const pinned = (state.reflection.entries || []).filter(e => e && e.pinned);
      if (!pinned.length) return '';
      const act = state.reflection.activeNoteId;
      return '<div class="rpins" id="rPins">' + pinned.map(e =>
        '<button type="button" class="rpin' + (e.id === act ? ' rpin--on' : '') + '" data-rpin="' + esc(e.id) + '" title="' + esc(this._title(e)) + '">' +
          '<span class="rpin__t">' + esc(this._title(e)) + '</span>' +
          '<span class="rpin__x" data-rpin-off="' + esc(e.id) + '" role="button" aria-label="Unpin">&times;</span>' +
        '</button>').join('') + '</div>';
    },
    _folderName(id) { const f = (state.reflection.folders || []).find(x => x.id === id); return f ? f.name : ''; },
    // Order entries per the persisted sort choice (disp.sort): recently edited
    // (default), created date, or alphabetical by title.
    _sorted(entries) {
      const d = state.reflection.disp || {};
      const mode = d.sort || 'edited';
      const arr = (entries || []).slice();
      if (mode === 'az') arr.sort((a, b) => this._title(a).toLowerCase().localeCompare(this._title(b).toLowerCase()));
      else if (mode === 'created') arr.sort((a, b) => ((b.iso || '') + '').localeCompare((a.iso || '') + '') || (b.updated || 0) - (a.updated || 0));
      else arr.sort((a, b) => (b.updated || 0) - (a.updated || 0) || ((b.iso || '') + '').localeCompare((a.iso || '') + ''));
      return arr;
    },
    // Escape-then-highlight: each raw segment is escaped separately, the <em>
    // wrapper is the only markup ever injected, so a query can never inject HTML.
    _hl(text) {
      const q = (this._q || '').trim();
      const s = String(text || '');
      if (!q) return esc(s);
      const lo = s.toLowerCase(), ql = q.toLowerCase();
      let out = '', i = 0;
      for (;;) {
        const k = lo.indexOf(ql, i);
        if (k < 0) { out += esc(s.slice(i)); break; }
        out += esc(s.slice(i, k)) + '<em class="rhit">' + esc(s.slice(k, k + q.length)) + '</em>';
        i = k + q.length;
      }
      return out;
    },
    _countText(note) {
      const t = (this._plain(note) || '').trim();
      const words = t ? t.split(/\s+/).length : 0;
      return words + (words === 1 ? ' word' : ' words') + ' · ' + t.length + (t.length === 1 ? ' character' : ' characters');
    },
    _gridHtml() {
      const view = this._view || 'all';
      if (view === 'trash') return '<div class="rgrid-trashwrap">' + this._trashHtml() + '</div>';
      const q = (this._q || '').toLowerCase();
      let entries = this._sorted(state.reflection.entries || []);
      if (view !== 'all') entries = entries.filter(e => (e.folder || null) === view);
      if (this._tag) entries = entries.filter(e => (e.tags || []).indexOf(this._tag) >= 0);
      const filtered = entries.filter(e => !q || this._plain(e).toLowerCase().indexOf(q) >= 0 || (e.title || '').toLowerCase().indexOf(q) >= 0);
      const d = state.reflection.disp || {};
      const sortSel = '<select class="rgrid-sort" id="rSort" aria-label="Sort notes">'
        + [['edited', 'Recent'], ['created', 'Created'], ['az', 'A to Z']].map(o => '<option value="' + o[0] + '"' + ((d.sort || 'edited') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('')
        + '</select>';
      const head = '<div class="rgrid-head"><span class="rgrid-head__t">' + (view === 'all' ? 'All notes' : esc(this._folderName(view) || 'Notes')) + '</span><span class="rgrid-head__r">' + sortSel + '</span></div>';
      if (!filtered.length) return head + (q
        ? '<div class="rgrid-empty">No notes match that.</div>'
        : '<div class="rgrid-empty rgrid-empty--teach"><div class="rgrid-empty__t">Your first note starts the record.</div><div class="rgrid-empty__s">One honest line about today is enough. Tap New note and write what actually happened.</div></div>');
      const card = (e) => {
        const preview = this._snippet(e) || this._plain(e).slice(0, 200);
        const fn = e.folder ? this._folderName(e.folder) : '';
        const col = e.color && e.color !== 'none' ? e.color : '';
        return '<button type="button" class="rgrid-card' + (e.pinned ? ' rgrid-card--pin' : '') + (col ? ' rgrid-card--c-' + col : '') + '" data-grid-note="' + esc(e.id) + '">'
          + '<div class="rgrid-card__title">' + (col ? '<span class="rnote__dot rnote__dot--' + col + '"></span>' : '') + this._hl(this._title(e)) + '</div>'
          + '<div class="rgrid-card__body">' + this._hl(preview) + '</div>'
          + '<div class="rgrid-card__foot"><span class="rgrid-card__date">' + esc(this._relDate(e)) + '</span>' + (fn ? '<span class="rgrid-card__tag">' + esc(fn) + '</span>' : '') + (e.pinned ? '<span class="rgrid-card__star">&#9733;</span>' : '') + '</div>'
          + '</button>';
      };
      // Pinned notes lead the gallery under their own eyebrow; the rest follow.
      const pinned = filtered.filter(e => e.pinned);
      const rest = filtered.filter(e => !e.pinned);
      let cards = '';
      if (pinned.length) {
        cards += '<div class="rgrid-eyebrow">Pinned</div>' + pinned.map(card).join('');
        if (rest.length) cards += '<div class="rgrid-eyebrow">Notes</div>';
      }
      cards += rest.map(card).join('');
      return head + '<div class="rgrid">' + cards + '</div>';
    },
    _showNoteMenu(x, y, note, actions) {
      const old = document.getElementById('rNoteMenu'); if (old) old.remove();
      const m = document.createElement('div'); m.id = 'rNoteMenu'; m.className = 'rnote-menu';
      const swatch = (c, label) => '<button type="button" class="rnote-sw rnote-sw--' + c + (note.color === c ? ' is-on' : '') + '" data-color="' + c + '" title="' + label + '" aria-label="' + label + '"></button>';
      const folders = (state.reflection.folders || []);
      const moveSel = '<div class="rnote-menu__lbl">Move to</div>' +
        '<select class="rnote-menu__move" data-move aria-label="Move to folder">' +
          '<option value=""' + (!note.folder ? ' selected' : '') + '>No folder</option>' +
          folders.map(f => '<option value="' + esc(f.id) + '"' + (note.folder === f.id ? ' selected' : '') + '>' + esc(f.parentId ? '\u00a0\u00a0' + f.name : f.name) + '</option>').join('') +
        '</select>';
      m.innerHTML =
        '<button type="button" data-act="open">Open</button>' +
        '<button type="button" data-act="pin">' + (note.pinned ? '&#9733; Unstar' : '&#9734; Star &amp; pin') + '</button>' +
        '<button type="button" data-act="dup">Duplicate</button>' +
        moveSel +
        '<div class="rnote-menu__lbl">Label</div>' +
        '<div class="rnote-sw-row">' + swatch('none', 'No label') + swatch('red', 'Red') + swatch('amber', 'Amber') + swatch('green', 'Green') + swatch('blue', 'Blue') + swatch('purple', 'Purple') + '</div>' +
        '<button type="button" class="rnote-menu--del" data-act="del">Delete</button>';
      document.body.appendChild(m);
      m.style.left = Math.min(x, window.innerWidth - 184) + 'px';
      m.style.top = Math.min(y, window.innerHeight - 200) + 'px';
      const close = () => { try { m.remove(); } catch (e) {} document.removeEventListener('click', close, true); document.removeEventListener('contextmenu', close, true); document.removeEventListener('keydown', onEsc, true); };
      const onEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
      m.querySelector('[data-act="open"]').addEventListener('click', () => { actions.open(); close(); });
      m.querySelector('[data-act="pin"]').addEventListener('click', () => { actions.pin(); close(); });
      const dupBtn = m.querySelector('[data-act="dup"]');
      if (dupBtn) dupBtn.addEventListener('click', () => { if (actions.dup) actions.dup(); close(); });
      m.querySelector('[data-act="del"]').addEventListener('click', () => { actions.del(); close(); });
      m.querySelectorAll('.rnote-sw').forEach(sw => sw.addEventListener('click', (ev) => { ev.stopPropagation(); if (actions.color) actions.color(sw.getAttribute('data-color')); close(); }));
      const mv = m.querySelector('[data-move]');
      if (mv) {
        mv.addEventListener('click', (ev) => ev.stopPropagation());
        mv.addEventListener('change', (ev) => { ev.stopPropagation(); if (actions.move) actions.move(mv.value || null); close(); });
      }
      setTimeout(() => { document.addEventListener('click', close, true); document.addEventListener('contextmenu', close, true); document.addEventListener('keydown', onEsc, true); }, 0);
    },
    _plain(e) {
      if (!e) return '';
      if (e.html) { let _d = ''; try { const _pd = new DOMParser().parseFromString(String(e.html), 'text/html'); _d = (_pd && _pd.body ? _pd.body.textContent : '') || ''; } catch (_) { _d = ''; } return _d.replace(/ /g, ' ').trim(); }
      return String(e.text || '').trim();
    },
    _title(e) {
      const first = (this._plain(e).split('\n').find(l => l.trim()) || '').trim();
      return first ? first.slice(0, 64) : 'Untitled note';
    },
    _snippet(e) {
      const p = this._plain(e).replace(/\s+/g, ' ').trim();
      const first = (this._plain(e).split('\n').find(l => l.trim()) || '').replace(/\s+/g, ' ').trim();
      let rest = (first && p.indexOf(first) === 0) ? p.slice(first.length).trim() : p;
      if (!rest && p.length > 64) {
        // One-line note longer than the title cut: resume on a word boundary.
        rest = p.slice(64);
        if (/\S/.test(p.charAt(63)) && /^\S/.test(rest)) rest = rest.replace(/^\S+\s*/, '');
        rest = rest.trim();
      }
      return rest.slice(0, 90);
    },
    _relDate(e) {
      let d = null;
      try { d = e.iso ? new Date(e.iso + 'T00:00:00') : (e.date ? new Date(e.date) : null); } catch (x) {}
      if (!d || isNaN(d.getTime())) return e.date || '';
      const now = new Date();
      const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const days = Math.round((a - b) / 86400000);
      if (days <= 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return days + ' days ago';
      const opts = { month: 'short', day: 'numeric' };
      if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
      return d.toLocaleDateString('en-US', opts);
    },
    _textToHtml(t) {
      const blocks = esc(String(t || '')).split(/\n{2,}/);
      const h = blocks.map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
      return h || '<p><br></p>';
    },
    _foldersHtml() {
      const r = state.reflection;
      const folders = Array.isArray(r.folders) ? r.folders : [];
      const view = this._view || 'all';
      const trashN = (r.trash || []).length;
      const entries = r.entries || [];
      const cnt = (id) => entries.filter(e => (e.folder || null) === id).length;
      let h = '<button class="rfold' + (view === 'all' ? ' rfold--on' : '') + '" data-rfold="all">All notes<span class="rfold__n">' + entries.length + '</span></button>';
      // Nested folders (additive parentId): children render indented under
      // their parent; legacy flat folders are simply roots.
      const kidsOf = (pid) => folders.filter(f => (f.parentId || null) === pid);
      const row = (f, depth) => {
        let out = '<button class="rfold' + (view === f.id ? ' rfold--on' : '') + (depth ? ' rfold--child' : '') + '" data-rfold="' + esc(f.id) + '" style="--fd:' + depth + '">' + esc(f.name) + '<span class="rfold__n">' + cnt(f.id) + '</span></button>';
        kidsOf(f.id).forEach(k => { out += row(k, Math.min(depth + 1, 3)); });
        return out;
      };
      kidsOf(null).forEach(f => { h += row(f, 0); });
      h += '<button class="rfold rfold--add" data-rfold-new aria-label="New folder">' + (view !== 'all' && view !== 'trash' ? '+ Subfolder' : '+ Folder') + '</button>';
      // Tag bar: every distinct #tag across notes; tap to filter, tap again
      // to clear. Tags live additively on note.tags.
      const allTags = {};
      entries.forEach(e => (e.tags || []).forEach(t => { allTags[t] = (allTags[t] || 0) + 1; }));
      const tagKeys = Object.keys(allTags).sort();
      if (tagKeys.length) {
        h += '<div class="rtagbar">' + tagKeys.map(t =>
          '<button type="button" class="rtag' + (this._tag === t ? ' rtag--on' : '') + '" data-rtag="' + esc(t) + '">#' + esc(t) + '</button>').join('') + '</div>';
      }
      if (trashN) h += '<button class="rfold rfold--trash' + (view === 'trash' ? ' rfold--on' : '') + '" data-rfold="trash">Recently Deleted (' + trashN + ')</button>';
      return h;
    },
    _relTime(ts) {
      if (!ts) return 'recently';
      const days = Math.floor((Date.now() - ts) / 86400000);
      if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; return days + ' days ago';
    },
    _purgeNoteImages(note) {
      if (!note || !note.html || note.html.indexOf('data-img-id') === -1) return;
      try {
        const d = new DOMParser().parseFromString(note.html, 'text/html');
        d.querySelectorAll('img[data-img-id]').forEach(im => { const id = im.getAttribute('data-img-id'); if (id) { try { idbDeleteImage(id); } catch (e) {} } });
      } catch (e) {}
    },
    _trashHtml() {
      const r = state.reflection;
      const items = (r.trash || []).slice().sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
      const win = (state.prefs && state.prefs.trashWindowDays);
      const winTxt = (typeof win === 'number') ? ('Deleted notes are kept ' + win + ' days, then removed.') : 'Deleted notes are kept until you empty them.';
      let head = '<div class="rtrash-head"><span>' + winTxt + '</span>' + (items.length ? '<button class="rtrash-empty" data-rtrash-empty>Empty</button>' : '') + '</div>';
      if (!items.length) return head + '<div class="rnote-empty">Recently Deleted is empty.</div>';
      return head + items.map(e => (
        '<div class="rnote rnote--trash">'
          + '<div class="rnote__title">' + esc(this._title(e)) + '</div>'
          + '<div class="rnote__row"><span class="rnote__meta">Deleted ' + esc(this._relTime(e.deletedAt)) + '</span></div>'
          + '<div class="rtrash-acts"><button class="rtrash-btn" data-rtrash-restore="' + esc(e.id) + '">Restore</button><button class="rtrash-btn rtrash-btn--del" data-rtrash-del="' + esc(e.id) + '">Delete</button></div>'
        + '</div>'
      )).join('');
    },
    _listHtml(active) {
      const view = this._view || 'all';
      if (view === 'trash') return this._trashHtml();
      const q = (this._q || '').toLowerCase();
      let entries = this._sorted(state.reflection.entries || []);
      if (view !== 'all') entries = entries.filter(e => (e.folder || null) === view);
      if (this._tag) entries = entries.filter(e => (e.tags || []).indexOf(this._tag) >= 0);
      const filtered = entries.filter(e => !q || this._plain(e).toLowerCase().indexOf(q) >= 0 || (e.title || '').toLowerCase().indexOf(q) >= 0);
      if (!filtered.length) return '<div class="rnote-empty">' + (q ? 'No notes match that.' : (view === 'all' ? 'One honest line about today is enough. Tap New note to start.' : 'No notes in this folder yet.')) + '</div>';
      const row = (e) => {
        const on = active && e.id === active.id;
        const snip = this._snippet(e);
        const col = e.color && e.color !== 'none' ? e.color : '';
        const fn = e.folder ? this._folderName(e.folder) : '';
        const sel = this._selectMode && this._selected && this._selected.has(e.id);
        return '<button class="rnote' + (on ? ' rnote--on' : '') + (col ? ' rnote--c-' + col : '') + (this._selectMode ? ' rnote--selectable' : '') + (sel ? ' rnote--selected' : '') + '" data-note-id="' + e.id + '">'
          + (this._selectMode ? '<span class="rnote__check" aria-hidden="true">' + (sel ? '&#10003;' : '') + '</span>' : '')
          + '<div class="rnote__title">' + (col ? '<span class="rnote__dot rnote__dot--' + col + '"></span>' : '') + (e.pinned ? '<span class="rnote__star">&#9733;</span>' : '') + this._hl(this._title(e)) + '</div>'
          + (snip ? '<div class="rnote__snipline">' + this._hl(snip) + '</div>' : '')
          + '<div class="rnote__row"><span class="rnote__meta">' + esc(this._relDate(e)) + (fn && view === 'all' ? ' · ' + esc(fn) : '') + '</span></div>'
          + '</button>';
      };
      // Pinned notes lead the list under quiet eyebrows, matching the gallery.
      const pinned = filtered.filter(e => e.pinned);
      const rest = filtered.filter(e => !e.pinned);
      let h = '';
      if (pinned.length) {
        h += '<div class="rlist-eyebrow">Pinned</div>' + pinned.map(row).join('');
        if (rest.length) h += '<div class="rlist-eyebrow">Notes</div>';
      }
      return h + rest.map(row).join('');
    },
    // Markdown IN: pasted markdown becomes the editor's own HTML vocabulary
    // (h1-h3, lists, rchk checklists, quotes, code fences, hr, bold/italic/
    // links). Plain text passes through untouched, so normal pasting is
    // unchanged; only text that actually reads as markdown converts.
    _looksLikeMd(t) {
      return /^(#{1,3} |[-*] |\d+\. |> |```|[-*] \[[ xX]\] )/m.test(t) || /\*\*[^*\n]+\*\*/.test(t) || /\[[^\]\n]+\]\([^)\s]+\)/.test(t);
    },
    _mdInline(s) {
      let h = esc(s);
      h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
      h = h.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
      h = h.replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return h;
    },
    _mdToHtml(md) {
      const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
      let out = '', i = 0;
      const flushList = (buf, tag, cls) => '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + buf.join('') + '</' + tag + '>';
      while (i < lines.length) {
        const ln = lines[i];
        if (/^```/.test(ln)) {
          const buf = []; i++;
          while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
          i++;
          out += '<pre>' + esc(buf.join('\n')) + '</pre>';
          continue;
        }
        let m;
        if ((m = ln.match(/^(#{1,3}) (.*)$/))) { out += '<h' + m[1].length + '>' + this._mdInline(m[2]) + '</h' + m[1].length + '>'; i++; continue; }
        if (/^(---|\*\*\*)\s*$/.test(ln)) { out += '<hr>'; i++; continue; }
        if (/^> /.test(ln)) {
          const buf = [];
          while (i < lines.length && /^> ?/.test(lines[i])) { buf.push(this._mdInline(lines[i].replace(/^> ?/, ''))); i++; }
          out += '<blockquote>' + buf.join('<br>') + '</blockquote>';
          continue;
        }
        if (/^[-*] \[[ xX]\] /.test(ln)) {
          const buf = [];
          while (i < lines.length && /^[-*] \[[ xX]\] /.test(lines[i])) {
            const done = /^[-*] \[[xX]\]/.test(lines[i]) ? '1' : '0';
            buf.push('<li data-done="' + done + '">' + this._mdInline(lines[i].replace(/^[-*] \[[ xX]\] /, '')) + '</li>');
            i++;
          }
          out += flushList(buf, 'ul', 'rchk');
          continue;
        }
        if (/^[-*] /.test(ln)) {
          const buf = [];
          while (i < lines.length && /^[-*] /.test(lines[i]) && !/^[-*] \[[ xX]\] /.test(lines[i])) { buf.push('<li>' + this._mdInline(lines[i].replace(/^[-*] /, '')) + '</li>'); i++; }
          out += flushList(buf, 'ul');
          continue;
        }
        if (/^\d+\. /.test(ln)) {
          const buf = [];
          while (i < lines.length && /^\d+\. /.test(lines[i])) { buf.push('<li>' + this._mdInline(lines[i].replace(/^\d+\. /, '')) + '</li>'); i++; }
          out += flushList(buf, 'ol');
          continue;
        }
        if (!ln.trim()) { i++; continue; }
        out += '<div>' + this._mdInline(ln) + '</div>';
        i++;
      }
      return out;
    },
    // Markdown OUT: walk the note's HTML back into clean markdown for
    // copy/export. Inverse of the vocabulary above; images become a marker
    // (their bytes live in IndexedDB, not in the note).
    _htmlToMd(html) {
      let doc;
      try { doc = new DOMParser().parseFromString('<div id="rx">' + String(html || '') + '</div>', 'text/html'); } catch (e) { return ''; }
      const inline = (node) => {
        let s = '';
        node.childNodes.forEach(ch => {
          if (ch.nodeType === 3) { s += ch.textContent; return; }
          const tag = (ch.tagName || '').toLowerCase();
          if (tag === 'b' || tag === 'strong') s += '**' + inline(ch) + '**';
          else if (tag === 'i' || tag === 'em') s += '*' + inline(ch) + '*';
          else if (tag === 's' || tag === 'strike' || tag === 'del') s += '~~' + inline(ch) + '~~';
          else if (tag === 'code') s += '`' + inline(ch) + '`';
          else if (tag === 'a') s += '[' + inline(ch) + '](' + (ch.getAttribute('href') || '') + ')';
          else if (tag === 'br') s += '\n';
          else if (tag === 'img') s += '![image]()';
          else s += inline(ch);
        });
        return s;
      };
      const walk = (node) => {
        let md = '';
        node.childNodes.forEach(ch => {
          if (ch.nodeType === 3) { const t = ch.textContent; if (t.trim()) md += t + '\n'; return; }
          const tag = (ch.tagName || '').toLowerCase();
          if (tag === 'h1') md += '# ' + inline(ch) + '\n\n';
          else if (tag === 'h2') md += '## ' + inline(ch) + '\n\n';
          else if (tag === 'h3') md += '### ' + inline(ch) + '\n\n';
          else if (tag === 'hr') md += '---\n\n';
          else if (tag === 'blockquote') md += inline(ch).split('\n').map(l => '> ' + l).join('\n') + '\n\n';
          else if (tag === 'pre') md += '```\n' + ch.textContent.replace(/\n$/, '') + '\n```\n\n';
          else if (tag === 'ul' && ch.classList.contains('rchk')) {
            ch.querySelectorAll(':scope > li').forEach(li => { md += '- [' + (li.getAttribute('data-done') === '1' ? 'x' : ' ') + '] ' + inline(li) + '\n'; });
            md += '\n';
          }
          else if (tag === 'ul') { ch.querySelectorAll(':scope > li').forEach(li => { md += '- ' + inline(li) + '\n'; }); md += '\n'; }
          else if (tag === 'ol') { let n = 1; ch.querySelectorAll(':scope > li').forEach(li => { md += (n++) + '. ' + inline(li) + '\n'; }); md += '\n'; }
          else if (tag === 'img') md += '![image]()\n\n';
          else if (tag === 'details') {
            const sum = ch.querySelector(':scope > summary');
            md += '**' + (sum ? inline(sum) : 'Toggle') + '**\n';
            ch.childNodes.forEach(k => { if (k.tagName && k.tagName.toLowerCase() !== 'summary') md += walk(k.parentNode === ch ? { childNodes: [k] } : k); });
            md += '\n';
          }
          else if (tag === 'table') {
            ch.querySelectorAll('tr').forEach((tr, ri) => {
              const cells = Array.from(tr.querySelectorAll('td,th')).map(td => inline(td).replace(/\|/g, '\\|').trim());
              md += '| ' + cells.join(' | ') + ' |\n';
              if (ri === 0) md += '|' + cells.map(() => ' --- ').join('|') + '|\n';
            });
            md += '\n';
          }
          else { const t = inline(ch); md += (t.trim() ? t + '\n' : '\n'); }
        });
        return md;
      };
      const root = doc.getElementById('rx');
      return root ? walk(root).replace(/\n{3,}/g, '\n\n').trim() + '\n' : '';
    },
    _noteToMd(note) {
      if (!note) return '';
      if (note.html) return this._htmlToMd(note.html);
      return String(note.text || '');
    },
    _editorHtml(active) {
      if (!active) {
        return '<div class="redit redit--empty"><div class="rempty-t">Your journal</div><div class="rempty-s">A clean, quiet space to think. Capture what is on your mind, one note at a time.</div><button class="sheet-btn sheet-btn--reflection" id="rNewEmpty">Start a note</button></div>';
      }
      const ICON_IMG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
      const ICON_DEL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
      const ICON_OPTS = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/></svg>';
      const ICON_FS = this._fs
        ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>'
        : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
      const _SV = 'viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
      const ICON_UL = '<svg ' + _SV + '><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>';
      const ICON_OL = '<svg ' + _SV + '><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2"/><path d="M6 16a1 1 0 0 0-2 0M4 16h2v2H4v2h2" stroke-width="1.6"/></svg>';
      const ICON_CHECK = '<svg ' + _SV + '><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
      const ICON_QUOTE = '<svg ' + _SV + '><path d="M7 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2H5V9h2zm9 0h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2h-2V9h2z"/></svg>';
      const ICON_CODE = '<svg ' + _SV + '><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
      const ICON_LINK = '<svg ' + _SV + '><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
      const ICON_HR = '<svg ' + _SV + '><line x1="3" y1="12" x2="21" y2="12"/></svg>';
      const d = (state.reflection.disp && typeof state.reflection.disp === 'object') ? state.reflection.disp : (state.reflection.disp = { font: 'system', surface: 'glass' });
      const curTheme = (d.theme === 'light' || d.theme === 'dark') ? d.theme : 'auto';
      const seg = (label, opts, key, cur) => '<div class="ropt-row"><span class="ropt-lbl">' + label + '</span><span class="ropt-seg">' + opts.map(o => '<button type="button" class="ropt-chip' + (o[0] === cur ? ' is-on' : '') + '" data-ropt-' + key + '="' + o[0] + '">' + o[1] + '</button>').join('') + '</span></div>';
      // Per-note style (Craft model): font + size live on the note object and
      // override the module default via classes on the editor body.
      const ns = (active.style && typeof active.style === 'object') ? active.style : {};
      const curNF = ns.font || d.font || 'system';
      const SIZES = ['xs', 's', 'm', 'l', 'xl'];
      const curSz = SIZES.indexOf(ns.size) >= 0 ? ns.size : 'm';
      const curLh = (ns.lh === 'c' || ns.lh === 'r') ? ns.lh : 'm';
      const TINTS = ['none', 'warm', 'rose', 'sage', 'mist'];
      const curTint = TINTS.indexOf(ns.tint) >= 0 ? ns.tint : 'none';
      const noteCls = (ns.font ? ' rbody--font-' + ns.font : '')
        + (curSz !== 'm' ? ' rbody--size-' + curSz : '')
        + (curLh !== 'm' ? ' rbody--lh-' + curLh : '')
        + (curTint !== 'none' ? ' rbody--tint-' + curTint : '');
      const agSeg = '<div class="ropt-row"><span class="ropt-lbl">This note &middot; Font</span><span class="ropt-seg ropt-seg--ag">'
        + [['system', 'System'], ['serif', 'Serif'], ['mono', 'Mono']].map(o =>
          '<button type="button" class="ropt-chip ropt-ag ropt-ag--' + o[0] + (o[0] === curNF ? ' is-on' : '') + '" data-rnote-font="' + o[0] + '"><span class="ropt-ag__g">Ag</span><span class="ropt-ag__l">' + o[1] + '</span></button>').join('')
        + '</span></div>';
      const szSeg = '<div class="ropt-row"><span class="ropt-lbl">This note &middot; Size</span><span class="ropt-seg">'
        + [['xs', 'XS'], ['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']].map(o => '<button type="button" class="ropt-chip' + (o[0] === curSz ? ' is-on' : '') + '" data-rnote-size="' + o[0] + '">' + o[1] + '</button>').join('')
        + '</span></div>';
      const lhSeg = '<div class="ropt-row"><span class="ropt-lbl">This note &middot; Spacing</span><span class="ropt-seg">'
        + [['c', 'Tight'], ['m', 'Normal'], ['r', 'Relaxed']].map(o => '<button type="button" class="ropt-chip' + (o[0] === curLh ? ' is-on' : '') + '" data-rnote-lh="' + o[0] + '">' + o[1] + '</button>').join('')
        + '</span></div>';
      const tintSeg = '<div class="ropt-row"><span class="ropt-lbl">This note &middot; Page</span><span class="ropt-seg">'
        + [['none', 'None'], ['warm', 'Warm'], ['rose', 'Rose'], ['sage', 'Sage'], ['mist', 'Mist']].map(o => '<button type="button" class="ropt-chip ropt-tint ropt-tint--' + o[0] + (o[0] === curTint ? ' is-on' : '') + '" data-rnote-tint="' + o[0] + '" title="' + o[1] + '" aria-label="' + o[1] + ' page tint"></button>').join('')
        + '</span></div>';
      // Empty notes render with no inner HTML so the :empty placeholder shows.
      const body = active.html ? sanitizeReflectionHtml(active.html) : (active.text ? this._textToHtml(active.text) : '');
      return '<div class="redit">'
        + '<div class="rtoolbar">'
          + '<div class="rtool-grp">'
            + '<button type="button" class="rtool rtool--txt" data-cmd="h1" title="Heading 1" aria-label="Heading 1">H1</button>'
            + '<button type="button" class="rtool rtool--txt" data-cmd="h2" title="Heading 2" aria-label="Heading 2">H2</button>'
            + '<button type="button" class="rtool rtool--txt" data-cmd="h3" title="Heading 3" aria-label="Heading 3">H3</button>'
          + '</div><span class="rtool__div"></span>'
          + '<div class="rtool-grp">'
            + '<button type="button" class="rtool" data-cmd="bold" title="Bold" aria-label="Bold"><b>B</b></button>'
            + '<button type="button" class="rtool" data-cmd="italic" title="Italic" aria-label="Italic"><i>I</i></button>'
            + '<button type="button" class="rtool" data-cmd="underline" title="Underline" aria-label="Underline"><u>U</u></button>'
            + '<button type="button" class="rtool" data-cmd="strike" title="Strikethrough" aria-label="Strikethrough"><s>S</s></button>'
          + '</div><span class="rtool__div"></span>'
          + '<div class="rtool-grp">'
            + '<button type="button" class="rtool" data-cmd="ul" title="Bulleted list" aria-label="Bulleted list">' + ICON_UL + '</button>'
            + '<button type="button" class="rtool" data-cmd="ol" title="Numbered list" aria-label="Numbered list">' + ICON_OL + '</button>'
            + '<button type="button" class="rtool" data-cmd="check" title="Checklist" aria-label="Checklist">' + ICON_CHECK + '</button>'
          + '</div><span class="rtool__div"></span>'
          + '<div class="rtool-grp">'
            + '<button type="button" class="rtool" data-cmd="quote" title="Quote" aria-label="Quote">' + ICON_QUOTE + '</button>'
            + '<button type="button" class="rtool" data-cmd="code" title="Code block" aria-label="Code block">' + ICON_CODE + '</button>'
            + '<button type="button" class="rtool" data-cmd="link" title="Add link" aria-label="Add link">' + ICON_LINK + '</button>'
            + '<button type="button" class="rtool" data-cmd="hr" title="Divider" aria-label="Divider">' + ICON_HR + '</button>'
            + '<button type="button" class="rtool" data-cmd="image" title="Add image" aria-label="Add image">' + ICON_IMG + '</button>'
          + '</div>'
          + '<span class="rtool__sp"></span>'
          + '<span class="redit__saved" id="rSaved"></span>'
          + '<button type="button" class="rtool" id="rFindBtn" title="Find in note" aria-label="Find in note"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>'
          + '<button type="button" class="rtool" id="rOptsBtn" title="View options" aria-label="View options" aria-haspopup="true">' + ICON_OPTS + '</button>'
          + '<button type="button" class="rtool" id="rFsBtn" title="Full screen (Esc to exit)" aria-label="Toggle full screen">' + ICON_FS + '</button>'
          + '<button type="button" class="rtool rtool--danger" data-cmd="delete" title="Delete note" aria-label="Delete note">' + ICON_DEL + '</button>'
          + '<input type="file" accept="image/*" id="rImg" style="display:none">'
        + '</div>'
        + '<div class="rfind" id="rFind" hidden>'
          + '<input class="rfind__in" id="rFindIn" type="text" placeholder="Find" autocomplete="off">'
          + '<span class="rfind__count" id="rFindCount"></span>'
          + '<button type="button" class="rfind__btn" id="rFindPrev" aria-label="Previous">&#8593;</button>'
          + '<button type="button" class="rfind__btn" id="rFindNext" aria-label="Next">&#8595;</button>'
          + '<input class="rfind__in rfind__in--rep" id="rFindRep" type="text" placeholder="Replace" autocomplete="off">'
          + '<button type="button" class="rfind__btn" id="rFindRepBtn" aria-label="Replace current">Replace</button>'
          + '<button type="button" class="rfind__btn" id="rFindClose" aria-label="Close">&times;</button>'
        + '</div>'
        + '<div class="rkbar" id="rKbar" hidden>'
          + '<button type="button" class="rkbar__b" data-kbar="bold"><b>B</b></button>'
          + '<button type="button" class="rkbar__b" data-kbar="italic"><i>I</i></button>'
          + '<button type="button" class="rkbar__b" data-kbar="h2">H</button>'
          + '<button type="button" class="rkbar__b" data-kbar="ul">&bull;</button>'
          + '<button type="button" class="rkbar__b" data-kbar="check">&#10003;</button>'
          + '<button type="button" class="rkbar__b" data-kbar="quote">&#8220;</button>'
          + '<button type="button" class="rkbar__b" data-kbar="image">&#9633;+</button>'
          + '<button type="button" class="rkbar__b rkbar__b--done" data-kbar-done="1">Done</button>'
        + '</div>'
        + '<div class="rnotes-opts" id="rOpts" hidden>'
          + seg('Theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], 'theme', curTheme)
          + seg('Surface', [['glass', 'Glassy'], ['solid', 'Solid']], 'surface', d.surface || 'glass')
          + seg('Font', [['system', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']], 'font', d.font || 'system')
          + '<div class="ropt-sep"></div>'
          + agSeg
          + szSeg
          + lhSeg
          + tintSeg
          + '<div class="ropt-sep"></div>'
          + '<div class="ropt-row"><span class="ropt-lbl">Export</span><span class="ropt-seg">'
            + '<button type="button" class="ropt-chip" id="rExportCopy">Copy Markdown</button>'
            + '<button type="button" class="ropt-chip" id="rExportDl">Download .md</button>'
            + '<button type="button" class="ropt-chip" id="rExportAll">All notes .md</button>'
            + '<button type="button" class="ropt-chip" id="rImportMd">Import .md</button>'
            + '<input type="file" id="rImportMdFile" accept=".md,.markdown,text/markdown,text/plain" multiple style="display:none">'
          + '</span></div>'
          + (() => {
            // Note info (Bear pattern): the facts, quietly.
            const words = this._plain(active).trim() ? this._plain(active).trim().split(/\s+/).length : 0;
            const backN = (state.reflection.entries || []).filter(e2 => e2.id !== active.id && (e2.html || '').indexOf('data-rnote-link="' + active.id + '"') >= 0).length;
            const fn2 = active.folder ? this._folderName(active.folder) : '';
            const bits = [
              'Created ' + esc(active.date || active.iso || ''),
              'Edited ' + esc(this._relTime(active.updated)),
              words + ' words',
              fn2 ? ('In ' + esc(fn2)) : '',
              (active.tags && active.tags.length) ? (active.tags.length + (active.tags.length === 1 ? ' tag' : ' tags')) : '',
              backN ? (backN + (backN === 1 ? ' backlink' : ' backlinks')) : ''
            ].filter(Boolean);
            let snapRow = '';
            if (Array.isArray(active.snapshots) && active.snapshots.length) {
              snapRow = '<div class="ropt-row"><span class="ropt-lbl">Snapshots</span><span class="ropt-seg">'
                + active.snapshots.slice().reverse().slice(0, 3).map((sn, i) => '<button type="button" class="ropt-chip" data-rsnap="' + (active.snapshots.length - 1 - i) + '">' + new Date(sn.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</button>').join('')
                + '</span></div>';
            }
            const imgRow = '<div class="ropt-row"><span class="ropt-lbl">Library</span><span class="ropt-seg"><button type="button" class="ropt-chip" id="rImagesAll">All images</button></span></div>';
            return '<div class="ropt-sep"></div>' + snapRow + imgRow + '<div class="ropt-info">' + bits.join(' &middot; ') + '</div>';
          })()
        + '</div>'
        + '<div class="rbody' + noteCls + '" id="rBody" contenteditable="true" spellcheck="true" data-ph="Write freely. Select text to format it." data-note-id="' + active.id + '">' + body + '</div>'
        + '<button type="button" class="rzen-exit" id="rZenExit" aria-label="Exit focus mode">Exit focus &middot; Esc</button>'
        + '<button type="button" class="rstat" id="rStat" title="Click to change the stat" aria-label="Note statistics"></button>'
        + '<button type="button" class="rtoc-btn" id="rTocBtn" hidden aria-label="Outline">Outline</button>'
        + '<div class="rtoc" id="rToc" hidden></div>'
        + '<div class="rtags" id="rTags">'
          + ((active.tags || []).map(t => '<span class="rtags__chip">#' + esc(t) + '<button type="button" class="rtags__x" data-rtag-del="' + esc(t) + '" aria-label="Remove tag">&times;</button></span>').join(''))
          + '<input class="rtags__in" id="rTagIn" type="text" maxlength="24" placeholder="+ tag" autocomplete="off">'
        + '</div>'
        + (() => {
          // Backlinks: every note whose body links here via [[...]].
          const refs = (state.reflection.entries || []).filter(e2 => e2.id !== active.id && (e2.html || '').indexOf('data-rnote-link="' + active.id + '"') >= 0);
          if (!refs.length) return '';
          return '<div class="rback"><div class="rback__t">Linked from</div>'
            + refs.slice(0, 12).map(e2 => '<button type="button" class="rback__row" data-rback="' + esc(e2.id) + '">' + esc(this._title(e2)) + '</button>').join('')
            + '</div>';
        })()
        + '<div class="redit-foot"><span class="redit-foot__hint">' + (this._fs ? 'Esc to exit full screen' : '') + '</span></div>'
        + '</div>';
    },
    bind(container) {
      const self = this;
      const r = state.reflection;
      if (!Array.isArray(r.entries)) r.entries = [];
      const reRender = () => { Sheet.body.innerHTML = SHEET_TEMPLATES.reflection.render(); SHEET_TEMPLATES.reflection.bind(Sheet.body); };
      const getActive = () => (r.entries || []).find(e => e.id === r.activeNoteId);
      // Pin toggle + soft-delete, shared by the toolbar, pins, and right-click menu.
      const togglePin = (id) => { const n = (r.entries || []).find(e => e.id === id); if (n) { n.pinned = !n.pinned; try { persistNow(); } catch (e) {} reRender(); } };
      const setColor = (id, c) => { const n = (r.entries || []).find(e => e.id === id); if (n) { n.color = (c && c !== 'none') ? c : null; try { persistNow(); } catch (e) {} reRender(); } };
      const softDel = (id) => { const idx = (r.entries || []).findIndex(e => e.id === id); if (idx < 0) return; if (!Array.isArray(r.trash)) r.trash = []; const n = r.entries[idx]; n.deletedAt = Date.now(); r.trash.unshift(n); r.entries.splice(idx, 1); if (r.activeNoteId === id) r.activeNoteId = null; try { persistNow(); renderAll(); } catch (e) {} reRender(); };
      // Duplicate: a copy lands right next to the original (the real-world
      // "use yesterday's note as a template" move).
      const dupNote = (id) => {
        const i = (r.entries || []).findIndex(x => x.id === id);
        if (i < 0) return;
        const src = r.entries[i];
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = 'rn_' + getTodayISO() + '_' + Date.now() + '_c';
        copy.pinned = false; copy.daily = undefined; copy.updated = Date.now();
        r.entries.splice(i + 1, 0, copy);
        r.activeNoteId = copy.id;
        try { persistNow(); } catch (e) {}
        reRender();
      };
      const bindList = () => container.querySelectorAll('.rnote[data-note-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn._swiped) { btn._swiped = false; return; }
          if (self._selectMode) {
            const id = btn.getAttribute('data-note-id');
            if (!self._selected) self._selected = new Set();
            if (self._selected.has(id)) self._selected.delete(id); else self._selected.add(id);
            reRender();
            return;
          }
          r.activeNoteId = btn.getAttribute('data-note-id'); self._mobileEditing = true; r.openInNote = true; try { persistNow(); } catch (e) {} reRender();
        });
        // Touch: swipe right pins, swipe left deletes (with undo); long-press
        // opens the same menu as right-click. touch-action pan-y on the row
        // keeps vertical scroll native while we own horizontal.
        let sw = null, lp = 0;
        const showMenuFor = (x, y) => {
          const id = btn.getAttribute('data-note-id'); const n = (r.entries || []).find(e2 => e2.id === id); if (!n) return;
          self._showNoteMenu(x, y, n, {
            open: () => { r.activeNoteId = id; self._mobileEditing = true; r.openInNote = true; try { persistNow(); } catch (e2) {} reRender(); },
            pin: () => togglePin(id),
            color: (c) => setColor(id, c),
            move: (fid) => { n.folder = fid || null; try { persistNow(); } catch (e2) {} reRender(); },
            dup: () => dupNote(id),
            del: () => softDel(id)
          });
        };
        btn.addEventListener('pointerdown', (e) => {
          if (e.pointerType !== 'touch') return;
          sw = { x: e.clientX, y: e.clientY, dx: 0, active: false };
          clearTimeout(lp);
          lp = setTimeout(() => { if (sw && !sw.active) { btn._swiped = true; sw = null; showMenuFor(e.clientX, e.clientY); } }, 480);
        });
        btn.addEventListener('pointermove', (e) => {
          if (!sw) return;
          const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
          if (!sw.active && (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4)) sw.active = true;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearTimeout(lp);
          if (sw.active) {
            sw.dx = dx;
            btn.style.transform = 'translateX(' + Math.max(-96, Math.min(96, dx)) + 'px)';
            btn.classList.toggle('rnote--swr', dx > 34);
            btn.classList.toggle('rnote--swl', dx < -34);
          }
        });
        const endSwipe = () => {
          clearTimeout(lp);
          if (!sw) return;
          const d = sw; sw = null;
          btn.style.transform = '';
          btn.classList.remove('rnote--swr', 'rnote--swl');
          if (!d.active) return;
          btn._swiped = true;
          const id = btn.getAttribute('data-note-id');
          if (d.dx > 72) { togglePin(id); return; }
          if (d.dx < -72) {
            const i = (r.entries || []).findIndex(x => x.id === id);
            if (i < 0) return;
            const n = r.entries[i];
            softDel(id);
            try {
              if (typeof showUndoToast === 'function') showUndoToast('Note deleted.', () => {
                r.trash = (r.trash || []).filter(t => t.id !== n.id);
                delete n.deletedAt;
                r.entries.splice(Math.min(i, r.entries.length), 0, n);
                try { persistNow(); } catch (e2) {}
                reRender();
              });
            } catch (e2) {}
          }
        };
        btn.addEventListener('pointerup', endSwipe);
        btn.addEventListener('pointercancel', endSwipe);
        // Right-click a note preview for more options (pin, delete, open).
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const id = btn.getAttribute('data-note-id'); const n = (r.entries || []).find(x => x.id === id); if (!n) return;
          self._showNoteMenu(e.clientX, e.clientY, n, {
            open: () => { r.activeNoteId = id; try { persistNow(); } catch (x) {} reRender(); },
            pin: () => togglePin(id),
            color: (c) => setColor(id, c),
            move: (fid) => { n.folder = fid || null; try { persistNow(); } catch (x) {} reRender(); },
            dup: () => dupNote(id),
            del: () => softDel(id)
          });
        });
      });

      const newNote = (tplHtml) => {
        const folder = (self._view && self._view !== 'all' && self._view !== 'trash') ? self._view : null;
        const e = { id: 'rn_' + getTodayISO() + '_' + Date.now(), iso: getTodayISO(), date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), text: '', html: '', title: '', folder: folder, updated: Date.now() };
        if (tplHtml && typeof tplHtml === 'string') {
          e.html = tplHtml;
          try { const pd = new DOMParser().parseFromString(tplHtml, 'text/html'); e.text = ((pd && pd.body ? pd.body.textContent : '') || '').trim(); } catch (x) {}
          e.title = self._title(e);
        }
        r.entries.push(e); r.activeNoteId = e.id; self._q = ''; self._mobileEditing = true; r.openInNote = true;
        if (self._view === 'trash') self._view = 'all';
        try { persistNow(); } catch (x) {}
        reRender();
        setTimeout(() => { const b = Sheet.body.querySelector('#rBody'); if (b) b.focus(); }, 40);
      };
      // Note templates: the +New caret (or a long-press on mobile) offers seeded
      // starting points. A plain click on +New stays an instant blank note.
      const TPL_DATE = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const NOTE_TEMPLATES = [
        { id: 'blank', label: 'Blank note', hint: 'Start empty', html: '' },
        { id: 'journal', label: 'Journal', hint: 'Today + prompts', html: '<h2>' + esc(TPL_DATE) + '</h2><p><br></p><h3>What happened</h3><p><br></p><h3>What mattered</h3><p><br></p><h3>What I am taking with me</h3><p><br></p>' },
        { id: 'idea', label: 'Idea', hint: 'What, why, first step', html: '<h2>Idea</h2><div class="rcallout"><p><strong>What:</strong> </p><p><strong>Why it matters:</strong> </p><p><strong>First step:</strong> </p></div><p><br></p>' },
        { id: 'script', label: 'Script outline', hint: 'Hook to CTA', html: '<h2>Script</h2><h3>Hook</h3><p><br></p><h3>Setup</h3><p><br></p><h3>Points</h3><ul><li><br></li></ul><h3>CTA</h3><p><br></p>' }
      ];
      const openTplMenu = (x, y) => {
        const old = document.getElementById('rTplMenu'); if (old) old.remove();
        const m = document.createElement('div'); m.id = 'rTplMenu'; m.className = 'rtpl-menu';
        m.innerHTML = NOTE_TEMPLATES.map(t => '<button type="button" data-tpl="' + t.id + '"><span class="rtpl-menu__t">' + t.label + '</span><span class="rtpl-menu__h">' + t.hint + '</span></button>').join('');
        document.body.appendChild(m);
        m.style.left = Math.max(8, Math.min(x, window.innerWidth - 200)) + 'px';
        m.style.top = Math.max(8, Math.min(y, window.innerHeight - m.offsetHeight - 10)) + 'px';
        const close = () => { try { m.remove(); } catch (e) {} document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onEsc, true); };
        const onDoc = (ev) => { if (!m.contains(ev.target)) close(); };
        const onEsc = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
        m.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', () => { const t = NOTE_TEMPLATES.find(z => z.id === b.getAttribute('data-tpl')); close(); newNote(t ? t.html : ''); }));
        setTimeout(() => { document.addEventListener('mousedown', onDoc, true); document.addEventListener('keydown', onEsc, true); }, 0);
      };
      const nb = container.querySelector('#rNew'); if (nb) nb.addEventListener('click', () => newNote());
      const ne = container.querySelector('#rNewEmpty'); if (ne) ne.addEventListener('click', () => newNote());
      const nm = container.querySelector('#rNewMore');
      if (nm) nm.addEventListener('click', (e) => { e.stopPropagation(); const rc = nm.getBoundingClientRect(); openTplMenu(rc.right - 188, rc.bottom + 6); });
      if (nb) {
        let lpT = null;
        nb.addEventListener('touchstart', () => { lpT = setTimeout(() => { lpT = 'fired'; const rc = nb.getBoundingClientRect(); openTplMenu(rc.left, rc.bottom + 6); }, 480); }, { passive: true });
        nb.addEventListener('touchend', (ev) => { if (lpT === 'fired') ev.preventDefault(); else if (lpT) clearTimeout(lpT); lpT = null; });
        nb.addEventListener('touchmove', () => { if (lpT && lpT !== 'fired') clearTimeout(lpT); lpT = null; }, { passive: true });
      }
      // Mobile drill-down: the back button returns from a note to the library.
      const mback = container.querySelector('#rMobBack');
      if (mback) mback.addEventListener('click', () => { self._mobileEditing = false; r.openInNote = false; try { persistNow(); } catch (x) {} reRender(); });
      bindList();

      // Pinned note tabs: click to open, x to unpin.
      container.querySelectorAll('[data-rpin]').forEach(b => b.addEventListener('click', (e) => {
        if (e.target.closest('[data-rpin-off]')) return;
        r.activeNoteId = b.getAttribute('data-rpin'); self._view = 'all'; try { persistNow(); } catch (x) {} reRender();
      }));
      container.querySelectorAll('[data-rpin-off]').forEach(x => x.addEventListener('click', (e) => { e.stopPropagation(); togglePin(x.getAttribute('data-rpin-off')); }));

      // Gallery (grid) view: toggle, and open a note from a card. Card + sort
      // bindings live in bindGrid so a live search re-render can rebind them.
      const gridToggle = container.querySelector('#rGridToggle');
      if (gridToggle) gridToggle.addEventListener('click', () => { self._grid = !self._grid; reRender(); });
      const bindGrid = () => {
        container.querySelectorAll('[data-grid-note]').forEach(card => {
          card.addEventListener('click', () => { r.activeNoteId = card.getAttribute('data-grid-note'); self._grid = false; self._mobileEditing = true; r.openInNote = true; try { persistNow(); } catch (x) {} reRender(); });
          card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const id = card.getAttribute('data-grid-note'); const n = (r.entries || []).find(x => x.id === id); if (!n) return;
            self._showNoteMenu(e.clientX, e.clientY, n, { open: () => { r.activeNoteId = id; self._grid = false; try { persistNow(); } catch (x) {} reRender(); }, pin: () => togglePin(id), color: (c) => setColor(id, c), move: (fid) => { n.folder = fid || null; try { persistNow(); } catch (x) {} reRender(); }, del: () => softDel(id) });
          });
        });
        // Gallery sort: persisted, applies to the list view too.
        const sortCtl = container.querySelector('#rSort');
        if (sortCtl) sortCtl.addEventListener('change', () => { if (!r.disp) r.disp = {}; r.disp.sort = sortCtl.value; try { persistNow(); } catch (e) {} reRender(); });
      };
      bindGrid();

      // Folder + Recently Deleted navigation
      container.querySelectorAll('[data-rfold]').forEach(b => b.addEventListener('click', () => { self._view = b.getAttribute('data-rfold'); self._q = ''; reRender(); }));
      container.querySelectorAll('[data-rtag]').forEach(b => b.addEventListener('click', () => {
        const t = b.getAttribute('data-rtag');
        self._tag = (self._tag === t) ? '' : t;
        reRender();
      }));
      const nf = container.querySelector('[data-rfold-new]');
      if (nf) nf.addEventListener('click', () => {
        const name = (typeof prompt === 'function') ? prompt('Folder name') : '';
        if (name && name.trim()) {
          if (!Array.isArray(r.folders)) r.folders = [];
          const parent = (self._view && self._view !== 'all' && self._view !== 'trash') ? self._view : null;
          const f = { id: 'fld_' + Date.now() + '_' + Math.floor(Math.random() * 1e4), name: name.trim().slice(0, 40), createdAt: Date.now() };
          if (parent) f.parentId = parent;
          r.folders.push(f); self._view = f.id;
          try { persistNow(); } catch (e) {}
          reRender();
        }
      });
      container.querySelectorAll('[data-rtrash-restore]').forEach(b => b.addEventListener('click', () => {
        const id = b.getAttribute('data-rtrash-restore');
        const idx = (r.trash || []).findIndex(x => x.id === id);
        if (idx >= 0) { const note = r.trash[idx]; delete note.deletedAt; r.trash.splice(idx, 1); r.entries.push(note); r.activeNoteId = note.id; self._view = 'all'; try { persistNow(); renderAll(); } catch (e) {} reRender(); }
      }));
      container.querySelectorAll('[data-rtrash-del]').forEach(b => b.addEventListener('click', () => {
        const id = b.getAttribute('data-rtrash-del');
        const idx = (r.trash || []).findIndex(x => x.id === id);
        if (idx < 0) return;
        // Instant, with a 6s undo; image purge waits for the window to close.
        const note = r.trash[idx];
        r.trash.splice(idx, 1);
        try { persistNow(); } catch (e) {} reRender();
        if (typeof showUndoToast === 'function') {
          showUndoToast('Note deleted.', () => {
            r.trash.splice(Math.min(idx, r.trash.length), 0, note);
            try { persistNow(); } catch (e) {} reRender();
          }, () => { try { self._purgeNoteImages(note); } catch (e) {} });
        } else { try { self._purgeNoteImages(note); } catch (e) {} }
      }));
      const et = container.querySelector('[data-rtrash-empty]');
      if (et) et.addEventListener('click', () => {
        const held = (r.trash || []).slice();
        if (!held.length) return;
        // Instant, with a 6s undo; image purges wait for the window to close.
        r.trash = [];
        try { persistNow(); } catch (e) {} reRender();
        if (typeof showUndoToast === 'function') {
          showUndoToast(held.length === 1 ? 'Note deleted.' : (held.length + ' notes deleted.'), () => {
            r.trash = held.concat(r.trash || []);
            try { persistNow(); } catch (e) {} reRender();
          }, () => { held.forEach(n => { try { self._purgeNoteImages(n); } catch (e) {} }); });
        } else { held.forEach(n => { try { self._purgeNoteImages(n); } catch (e) {} }); }
      });

      // Search filters the list (and the gallery) in place so typing never
      // loses focus. Matches are highlighted via _hl in both views.
      const search = container.querySelector('#rSearch');
      if (search) search.addEventListener('input', () => {
        self._q = search.value;
        const list = container.querySelector('#rList');
        if (list) { list.innerHTML = self._listHtml(getActive()); bindList(); }
        const gw = container.querySelector('#rGridWrap');
        if (gw) { gw.innerHTML = self._gridHtml(); bindGrid(); }
      });

      // Rich-text editor: debounced autosave on input, hard save on blur.
      const body = container.querySelector('#rBody');
      if (body) hydrateImageEls(body); // resolve IDB-backed note images on open
      const saved = container.querySelector('#rSaved');
      let saveT = null, proofed = false;
      const save = (proof) => {
        const a = getActive(); if (!a || !body) return;
        let _html = body.innerHTML;
        // Strip the ephemeral objectURL src + hydration markers from IDB-backed
        // images before persisting, so only the durable data-img-id is stored.
        if (_html.indexOf('data-img-id') !== -1) {
          try {
            const _t = new DOMParser().parseFromString(_html, 'text/html');
            _t.querySelectorAll('img[data-img-id]').forEach((im) => { im.removeAttribute('src'); im.removeAttribute('data-img-hydrated'); im.classList.remove('img-skeleton', 'img-loaded', 'img-missing'); if (!im.getAttribute('class')) im.removeAttribute('class'); });
            _html = _t.body.innerHTML;
          } catch (_) {}
        }
        a.html = _html;
        // Plain-text mirror via inert DOMParser (never detached innerHTML, which
        // would fire img onerror if a.html ever held an untrusted payload).
        let _pt = ''; try { const _pd = new DOMParser().parseFromString(String(a.html), 'text/html'); _pt = (_pd && _pd.body ? _pd.body.textContent : '') || ''; } catch (_) { _pt = ''; } a.text = _pt.trim();
        a.title = self._title(a); a.updated = Date.now();
        // Version snapshots (additive, capped 5): keep a copy when the note
        // has drifted far enough from the last snapshot and 5+ minutes have
        // passed. Cheap insurance against fat-finger losses.
        try {
          if (!Array.isArray(a.snapshots)) a.snapshots = [];
          const lastSnap = a.snapshots[a.snapshots.length - 1];
          const drift = !lastSnap || Math.abs((lastSnap.html || '').length - (a.html || '').length) > 80;
          const aged = !lastSnap || (Date.now() - lastSnap.ts) > 5 * 60000;
          if ((a.html || '').length > 40 && drift && aged) {
            a.snapshots.push({ ts: Date.now(), html: a.html });
            if (a.snapshots.length > 5) a.snapshots = a.snapshots.slice(-5);
          }
        } catch (e) {}
        try { persistNow(); } catch (e) {}
        // Keep the active sidebar row in sync without a full re-render (which would
        // steal editor focus). Title and snippet update live as you type.
        try { const row = container.querySelector('.rnote[data-note-id="' + a.id + '"]'); if (row) { const tt = row.querySelector('.rnote__title'); if (tt) tt.textContent = self._title(a); const sn = row.querySelector('.rnote__snip'); if (sn) sn.textContent = self._snippet(a); } } catch (e) {}
        if (saved) { saved.textContent = 'Saved'; clearTimeout(self._savedT); self._savedT = setTimeout(() => { try { saved.textContent = ''; } catch (e) {} }, 1400); }
        // Image-only notes are real content too, so they still earn a proof event.
        if (proof && (a.text || /<img/i.test(a.html || '')) && !proofed) { proofed = true; try { writeProofEvent('reflection-save', { title: 'Notes', text: (a.text || 'Added an image').slice(0, 140), module: 'reflection', dedupeKey: 'refl-' + a.id }); } catch (e) {} try { renderAll(); } catch (e) {} }
      };
      if (body) {
        // Keep the placeholder working: contenteditable leaves a stray <br> after
        // a type-then-delete, which breaks :empty. Drive a data-empty attribute and
        // hard-clear truly blank content so the placeholder always returns.
        // A freshly inserted heading/list/quote/etc is empty by text but must NOT
        // be wiped: the caret sits in it waiting for input. Only a note with no
        // structural blocks at all counts as truly blank.
        const refreshEmpty = () => { const t = (body.textContent || '').trim(); const blank = !t && !body.querySelector('img, h1, h2, h3, ul, ol, blockquote, pre, hr, .rcallout'); body.toggleAttribute('data-empty', blank); if (blank && body.innerHTML !== '') body.innerHTML = ''; };
        refreshEmpty();
        const _updateCount = () => { const el = container.querySelector('#rWordCount'); if (!el) return; const t = (body.textContent || '').trim(); const w = t ? t.split(/\s+/).length : 0; el.textContent = w + (w === 1 ? ' word' : ' words') + ' · ' + t.length + (t.length === 1 ? ' character' : ' characters'); };
        body.addEventListener('input', () => { refreshEmpty(); _updateCount(); if (saveT) clearTimeout(saveT); saveT = setTimeout(() => save(false), 500); });
        body.addEventListener('blur', () => { if (saveT) clearTimeout(saveT); save(true); });
        // Paste as plain text so Word/web HTML cannot inject styled or unsafe markup.
        // Paste: markdown converts into the editor's own structure (headings,
        // lists, checklists, quotes, code); anything else stays plain text.
        body.addEventListener('paste', (e) => {
          e.preventDefault();
          const t = ((e.clipboardData || window.clipboardData).getData('text/plain') || '');
          try {
            if (t.length > 2 && self._looksLikeMd(t)) document.execCommand('insertHTML', false, self._mdToHtml(t));
            else document.execCommand('insertText', false, t);
          } catch (x) {}
          refreshEmpty();
        });
        // Checklist: click the leading marker area of a .rchk item to toggle done.
        body.addEventListener('click', (e) => {
          const li = e.target.closest && e.target.closest('.rchk > li');
          if (!li) return;
          // Only toggle when the click lands on the marker zone (left padding), not the text.
          if (e.offsetX > 26) return;
          li.setAttribute('data-done', li.getAttribute('data-done') === '1' ? '0' : '1');
          save(false);
        });

        // ---------------------------------------------------------------
        // Editor power-ups: markdown shortcuts, slash menu, selection bubble.
        // All self-contained; they reuse the same execCommand insertions the
        // toolbar uses, then refreshEmpty + _updateCount + save like input does.
        // ---------------------------------------------------------------
        const BLOCK_TAGS = { P: 1, DIV: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, LI: 1, BLOCKQUOTE: 1, PRE: 1 };
        const closestBlock = (node) => {
          let el = (node && node.nodeType === 3) ? node.parentNode : node;
          while (el && el !== body) { if (BLOCK_TAGS[el.nodeName]) return el; el = el.parentNode; }
          return null;
        };
        // Text from the start of the caret's block up to the caret, plus the
        // range that spans it. Used to read line-start markers (# , - , / ...).
        const lineHead = () => {
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return null;
          const range = sel.getRangeAt(0);
          if (!range.collapsed) return null;
          const block = closestBlock(range.startContainer) || body;
          const pre = document.createRange();
          try { pre.setStart(block, 0); pre.setEnd(range.endContainer, range.endOffset); } catch (e) { return null; }
          return { text: pre.toString(), range: range, block: block, pre: pre };
        };
        const caretToStart = (block) => {
          const c = document.createRange(); c.setStart(block, 0); c.collapse(true);
          const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(c);
        };
        const afterEdit = () => { refreshEmpty(); _updateCount(); save(false); };
        const insertCheck = () => {
          document.execCommand('insertHTML', false, '<ul class="rchk"><li data-done="0" id="rckTmp"><br></li></ul>');
          const li = body.querySelector('#rckTmp');
          if (li) { li.removeAttribute('id'); const cr = document.createRange(); cr.setStart(li, 0); cr.collapse(true); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(cr); }
        };
        const insertCallout = () => {
          document.execCommand('insertHTML', false, '<div class="rcallout" id="rcoTmp"><br></div>');
          const co = body.querySelector('#rcoTmp');
          if (co) { co.removeAttribute('id'); const cr = document.createRange(); cr.setStart(co, 0); cr.collapse(true); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(cr); }
        };
        // Block actions shared by markdown shortcuts and the slash menu.
        const BLOCK_ACTIONS = {
          h1: () => document.execCommand('formatBlock', false, 'h1'),
          h2: () => document.execCommand('formatBlock', false, 'h2'),
          h3: () => document.execCommand('formatBlock', false, 'h3'),
          ul: () => document.execCommand('insertUnorderedList'),
          ol: () => document.execCommand('insertOrderedList'),
          quote: () => document.execCommand('formatBlock', false, 'blockquote'),
          code: () => document.execCommand('formatBlock', false, 'pre'),
          hr: () => document.execCommand('insertHorizontalRule'),
          check: insertCheck,
          callout: insertCallout
        };
        // Markdown markers that fire on the trailing space at line start.
        const MD_SPACE = { '#': 'h1', '##': 'h2', '###': 'h3', '-': 'ul', '*': 'ul', '+': 'ul', '1.': 'ol', '>': 'quote', '[]': 'check', '[ ]': 'check' };

        // ---- Slash command menu ----
        const SLASH_DEFS = [
          { kind: 'h1', label: 'Heading 1', hint: 'Big section title', keys: 'h1 heading title' },
          { kind: 'h2', label: 'Heading 2', hint: 'Medium heading', keys: 'h2 heading' },
          { kind: 'h3', label: 'Heading 3', hint: 'Small heading', keys: 'h3 heading' },
          { kind: 'ul', label: 'Bulleted list', hint: 'Simple list', keys: 'ul bullet list unordered' },
          { kind: 'ol', label: 'Numbered list', hint: 'Ordered steps', keys: 'ol number ordered list' },
          { kind: 'check', label: 'Checklist', hint: 'To-do items', keys: 'check todo task list' },
          { kind: 'quote', label: 'Quote', hint: 'Set apart a passage', keys: 'quote blockquote' },
          { kind: 'callout', label: 'Callout', hint: 'Highlighted box', keys: 'callout note tip box highlight' },
          { kind: 'code', label: 'Code', hint: 'Monospace block', keys: 'code pre monospace' },
          { kind: 'hr', label: 'Divider', hint: 'Horizontal line', keys: 'hr divider line rule separator' }
        ];
        const rSlash = {
          open: false, el: null, items: [], idx: 0,
          hide() { this.open = false; if (this.el) this.el.remove(); this.el = null; this.items = []; this.idx = 0; },
          show(h) {
            const q = h.text.slice(1).toLowerCase();
            const items = SLASH_DEFS.filter(d => !q || d.keys.indexOf(q) >= 0 || d.label.toLowerCase().indexOf(q) >= 0);
            if (!items.length) { this.hide(); return; }
            this.items = items; this.idx = 0; this.open = true;
            if (!this.el) {
              this.el = document.createElement('div'); this.el.id = 'rSlashMenu'; this.el.className = 'rslash';
              document.body.appendChild(this.el);
            }
            this.el.innerHTML = items.map((d, i) =>
              '<button type="button" class="rslash__item' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '">' +
                '<span class="rslash__label">' + d.label + '</span><span class="rslash__hint">' + d.hint + '</span>' +
              '</button>').join('');
            this.el.querySelectorAll('.rslash__item').forEach(btn => {
              btn.addEventListener('mousemove', () => this.setIdx(+btn.getAttribute('data-i')));
              btn.addEventListener('mousedown', (ev) => { ev.preventDefault(); this.idx = +btn.getAttribute('data-i'); this.choose(); });
            });
            // Position under the caret; fall back to the block if the caret rect is empty.
            let rect = h.range.getBoundingClientRect();
            if (!rect || (!rect.width && !rect.height)) rect = h.block.getBoundingClientRect();
            const mw = 248, mh = Math.min(items.length * 44 + 8, 320);
            let left = Math.max(8, Math.min(rect.left, window.innerWidth - mw - 8));
            let top = rect.bottom + 6; if (top + mh > window.innerHeight - 8) top = rect.top - mh - 6;
            this.el.style.left = left + 'px'; this.el.style.top = top + 'px';
          },
          setIdx(i) { this.idx = i; if (this.el) this.el.querySelectorAll('.rslash__item').forEach((b, k) => b.classList.toggle('is-on', k === i)); },
          move(d) { if (!this.items.length) return; this.setIdx((this.idx + d + this.items.length) % this.items.length); const on = this.el && this.el.querySelector('.is-on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); },
          choose() {
            const def = this.items[this.idx]; this.hide(); if (!def) return;
            const h = lineHead(); if (h && /^\/[\w]*$/.test(h.text)) { h.pre.deleteContents(); caretToStart(h.block); }
            const act = BLOCK_ACTIONS[def.kind]; if (act) act();
            afterEdit();
          },
          onKey(e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
            else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); this.choose(); }
            else if (e.key === 'Escape') { e.preventDefault(); this.hide(); }
          }
        };

        // Keydown: slash-menu navigation first, then markdown markers.
        body.addEventListener('keydown', (e) => {
          if (rSlash.open) { rSlash.onKey(e); if (e.defaultPrevented) return; }
          if (e.key === ' ' || e.key === 'Spacebar') {
            const h = lineHead(); if (!h) return;
            const kind = MD_SPACE[h.text]; if (!kind) return;
            e.preventDefault();
            h.pre.deleteContents(); caretToStart(h.block);
            const act = BLOCK_ACTIONS[kind]; if (act) act();
            afterEdit();
          } else if (e.key === '`') {
            const h = lineHead(); if (!h || h.text !== '``') return;
            e.preventDefault();
            h.pre.deleteContents(); caretToStart(h.block);
            BLOCK_ACTIONS.code(); afterEdit();
          } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
            // Cmd+Shift+M toggles the default (green) highlight on the selection.
            e.preventDefault();
            toggleHl(); afterEdit();
          }
        });
        // Input: open/refresh the slash menu when the line is "/" + word chars.
        body.addEventListener('input', () => {
          const h = lineHead();
          if (h && /^\/[\w]*$/.test(h.text)) rSlash.show(h); else rSlash.hide();
        });

        // ---- Multi-color highlights (Bear model) ----
        // execCommand has no <mark> insertion, so we apply a sentinel
        // background via hiliteColor (which handles multi-block selections
        // correctly), then convert the spans it created into <mark data-hl>.
        const HL_COLORS = ['green', 'red', 'blue', 'yellow', 'purple'];
        const HL_SENTINEL = { green: 'rgb(1, 255, 2)', red: 'rgb(255, 1, 2)', blue: 'rgb(1, 217, 255)', yellow: 'rgb(255, 255, 2)', purple: 'rgb(128, 1, 129)' };
        const unwrapEl = (el) => { const p = el.parentNode; if (!p) return; while (el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el); };
        const convertHlSpans = (color) => {
          const want = HL_SENTINEL[color];
          Array.prototype.slice.call(body.querySelectorAll('[style]')).forEach((el) => {
            let bg = ''; try { bg = el.style.backgroundColor || ''; } catch (e) {}
            if (bg !== want) return;
            el.style.backgroundColor = '';
            if (el.tagName === 'MARK') {
              el.setAttribute('data-hl', color);
            } else if (el.tagName === 'SPAN' || el.tagName === 'FONT') {
              const mk = document.createElement('mark'); mk.setAttribute('data-hl', color);
              while (el.firstChild) mk.appendChild(el.firstChild);
              el.parentNode.replaceChild(mk, el);
              return;
            } else {
              // The command landed on a block element: wrap its contents instead.
              const mk = document.createElement('mark'); mk.setAttribute('data-hl', color);
              while (el.firstChild) mk.appendChild(el.firstChild);
              el.appendChild(mk);
            }
            if (!el.getAttribute('style')) el.removeAttribute('style');
          });
        };
        const applyHl = (color) => {
          if (HL_COLORS.indexOf(color) < 0) color = 'green';
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || !sel.rangeCount || !body.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
          body.focus();
          try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
          try { document.execCommand('hiliteColor', false, HL_SENTINEL[color]); } catch (e) { try { document.execCommand('backColor', false, HL_SENTINEL[color]); } catch (x) {} }
          try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
          convertHlSpans(color);
        };
        const removeHl = () => {
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return;
          const range = sel.getRangeAt(0);
          if (!body.contains(range.commonAncestorContainer)) return;
          Array.prototype.slice.call(body.querySelectorAll('mark[data-hl]')).forEach((m) => {
            let hit = false; try { hit = range.intersectsNode(m); } catch (e) {}
            if (hit) unwrapEl(m);
          });
        };
        const selHasHl = () => {
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return false;
          const range = sel.getRangeAt(0);
          if (!body.contains(range.commonAncestorContainer)) return false;
          let anc = range.commonAncestorContainer; if (anc.nodeType === 3) anc = anc.parentNode;
          if (anc && anc.closest && anc.closest('mark[data-hl]')) return true;
          return Array.prototype.slice.call(body.querySelectorAll('mark[data-hl]')).some((m) => { try { return range.intersectsNode(m); } catch (e) { return false; } });
        };
        const toggleHl = () => { if (selHasHl()) removeHl(); else applyHl('green'); };

        // ---- Floating selection toolbar (bubble) ----
        const rBubble = {
          el: null,
          ensure() {
            if (this.el) return;
            const SV = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
            this.el = document.createElement('div'); this.el.id = 'rBubbleMenu'; this.el.className = 'rbubble'; this.el.hidden = true;
            this.el.innerHTML =
              '<div class="rbubble__row">' +
                '<button type="button" data-bc="bold" title="Bold"><b>B</b></button>' +
                '<button type="button" data-bc="italic" title="Italic"><i>I</i></button>' +
                '<button type="button" data-bc="underline" title="Underline"><u>U</u></button>' +
                '<button type="button" data-bc="strike" title="Strikethrough"><s>S</s></button>' +
                '<span class="rbubble__div"></span>' +
                '<button type="button" data-bc="h2" title="Heading">H</button>' +
                '<button type="button" data-bc="link" title="Link"><svg ' + SV + '><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>' +
                '<span class="rbubble__div"></span>' +
                '<button type="button" data-bc="hl" title="Highlight (Cmd+Shift+M)"><svg ' + SV + '><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg></button>' +
                '<button type="button" class="rbubble__more" data-bc="hlmore" title="Highlight colors" aria-label="Highlight colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>' +
              '</div>' +
              '<div class="rbubble__row rbubble__row--hl" data-hlrow hidden>' +
                HL_COLORS.map(c => '<button type="button" class="rhl-sw rhl-sw--' + c + '" data-hl="' + c + '" title="' + c.charAt(0).toUpperCase() + c.slice(1) + ' highlight" aria-label="' + c + ' highlight"></button>').join('') +
                '<button type="button" class="rhl-sw rhl-sw--off" data-hl="off" title="Remove highlight" aria-label="Remove highlight"></button>' +
              '</div>';
            document.body.appendChild(this.el);
            this.el.querySelectorAll('button[data-bc]').forEach(btn => btn.addEventListener('mousedown', (ev) => {
              ev.preventDefault();
              const c = btn.getAttribute('data-bc');
              if (c === 'hlmore') { const row = this.el.querySelector('[data-hlrow]'); if (row) row.hidden = !row.hidden; this.update(); return; }
              body.focus();
              try {
                if (c === 'bold') document.execCommand('bold');
                else if (c === 'italic') document.execCommand('italic');
                else if (c === 'underline') document.execCommand('underline');
                else if (c === 'strike') document.execCommand('strikeThrough');
                else if (c === 'h2') document.execCommand('formatBlock', false, 'h2');
                else if (c === 'hl') toggleHl();
                else if (c === 'link') {
                  const raw = (typeof prompt === 'function') ? prompt('Link URL') : '';
                  if (raw && raw.trim()) { const t = raw.trim(); const u = /^https?:\/\//i.test(t) ? t : (/^[a-z][a-z0-9+.-]*:/i.test(t) ? '' : 'https://' + t); if (u) document.execCommand('createLink', false, u); }
                }
              } catch (x) {}
              afterEdit(); this.update();
            }));
            this.el.querySelectorAll('[data-hl]').forEach(sw => sw.addEventListener('mousedown', (ev) => {
              ev.preventDefault();
              const c = sw.getAttribute('data-hl');
              body.focus();
              try { if (c === 'off') removeHl(); else applyHl(c); } catch (x) {}
              afterEdit(); this.update();
            }));
          },
          hide() { if (this.el) { this.el.hidden = true; const row = this.el.querySelector('[data-hlrow]'); if (row) row.hidden = true; } },
          update() {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || !sel.rangeCount || rSlash.open) { this.hide(); return; }
            const range = sel.getRangeAt(0);
            if (!body.contains(range.commonAncestorContainer)) { this.hide(); return; }
            const rect = range.getBoundingClientRect();
            if (!rect || (!rect.width && !rect.height)) { this.hide(); return; }
            this.ensure(); const el = this.el; el.hidden = false;
            const bw = el.offsetWidth || 220, bh = el.offsetHeight || 38;
            let left = Math.max(8, Math.min(rect.left + rect.width / 2 - bw / 2, window.innerWidth - bw - 8));
            let top = rect.top - bh - 8; if (top < 8) top = rect.bottom + 8;
            el.style.left = left + 'px'; el.style.top = top + 'px';
          }
        };
        // selectionchange is global, so re-bind once per render and clean the prior.
        let bubbleRaf = 0, statSync = null;
        const scheduleBubble = () => { if (bubbleRaf) return; bubbleRaf = requestAnimationFrame(() => { bubbleRaf = 0; rBubble.update(); if (statSync) statSync(); }); };
        if (self._rSelChange) document.removeEventListener('selectionchange', self._rSelChange);
        self._rSelChange = scheduleBubble; document.addEventListener('selectionchange', self._rSelChange);
        if (self._rDocDown) document.removeEventListener('mousedown', self._rDocDown, true);
        self._rDocDown = (ev) => {
          if (rSlash.el && !rSlash.el.contains(ev.target)) rSlash.hide();
          if (rBubble.el && !rBubble.el.contains(ev.target) && ev.target !== body && !body.contains(ev.target)) rBubble.hide();
        };
        document.addEventListener('mousedown', self._rDocDown, true);
        body.addEventListener('blur', () => { setTimeout(() => { if (rSlash.el && document.activeElement !== body) rSlash.hide(); rBubble.hide(); }, 120); });
        // Drop any stale overlays left by a previous render of the editor.
        ['rSlashMenu', 'rBubbleMenu'].forEach(id => { const old = document.getElementById(id); if (old && old !== rSlash.el && old !== rBubble.el) old.remove(); });

        // ---- Stats pill (iA model): one ambient stat, click to cycle ----
        // Selection-aware: stats describe the selection while one exists.
        const statEl = container.querySelector('#rStat');
        if (statEl) {
          const STAT_ORDER = ['read', 'words', 'chars', 'paras'];
          const statText = () => {
            if (!r.disp) r.disp = {};
            const kind = STAT_ORDER.indexOf(r.disp.stat) >= 0 ? r.disp.stat : 'read';
            let selTxt = '';
            try {
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed && sel.rangeCount && body.contains(sel.getRangeAt(0).commonAncestorContainer)) selTxt = sel.toString();
            } catch (e) {}
            const onSel = !!selTxt.trim();
            const t = onSel ? selTxt : (body.innerText || '');
            const flat = t.replace(/\s+/g, ' ').trim();
            const words = flat ? flat.split(' ').length : 0;
            let out;
            if (kind === 'words') out = words + (words === 1 ? ' word' : ' words');
            else if (kind === 'chars') out = flat.length + (flat.length === 1 ? ' character' : ' characters');
            else if (kind === 'paras') { const p = t.split(/\n+/).filter(s => s.trim()).length; out = p + (p === 1 ? ' paragraph' : ' paragraphs'); }
            else out = (words / 225 < 1) ? '<1 min read' : Math.ceil(words / 225) + ' min read';
            return { text: out, onSel: onSel };
          };
          const renderStat = () => { const s = statText(); statEl.textContent = s.text; statEl.classList.toggle('rstat--sel', s.onSel); };
          let statT = null;
          const queueStat = () => { if (statT) clearTimeout(statT); statT = setTimeout(renderStat, 200); };
          statSync = queueStat;
          statEl.addEventListener('click', () => {
            if (!r.disp) r.disp = {};
            const cur = STAT_ORDER.indexOf(r.disp.stat) >= 0 ? r.disp.stat : 'read';
            r.disp.stat = STAT_ORDER[(STAT_ORDER.indexOf(cur) + 1) % STAT_ORDER.length];
            try { persistNow(); } catch (e) {}
            renderStat();
          });
          body.addEventListener('input', queueStat);
          renderStat();
        }
      }

      // execCommand('insertHTML') is deprecated and absent in some engines;
      // Range-insertion fallback shared by the toolbar, the slash menu, and
      // the [[wiki-link]] picker.
      const insertHtmlAtCaret = (html) => {
        let ok = false;
        try { ok = document.execCommand('insertHTML', false, html); } catch (x) {}
        if (ok) return;
        try {
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const tpl = document.createElement('template');
          tpl.innerHTML = html;
          const last = tpl.content.lastChild;
          range.insertNode(tpl.content);
          if (last) { const nr = document.createRange(); nr.setStartAfter(last); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); }
        } catch (x) {}
      };
      // One exec path for every block/format command, shared by the toolbar
      // and the slash menu (so slash can insert blocks the toolbar does not
      // carry: toggle, callout, table).
      const execNoteCmd = (cmd) => {
        if (cmd === 'delete') {
          const a = getActive(); if (!a) return;
          // Soft delete: move to Recently Deleted (restorable, auto-purges later).
          if (!Array.isArray(r.trash)) r.trash = [];
          a.deletedAt = Date.now();
          r.trash.unshift(a);
          r.entries = r.entries.filter(x => x.id !== a.id); r.activeNoteId = null;
          try { persistNow(); renderAll(); } catch (x) {}
          reRender(); return;
        }
        if (cmd === 'image') { const f = container.querySelector('#rImg'); if (f) f.click(); return; }
        if (!body) return;
        body.focus();
        try {
          if (cmd === 'bold') document.execCommand('bold');
          else if (cmd === 'italic') document.execCommand('italic');
          else if (cmd === 'underline') document.execCommand('underline');
          else if (cmd === 'strike') document.execCommand('strikeThrough');
          else if (cmd === 'h1') document.execCommand('formatBlock', false, 'h1');
          else if (cmd === 'h2') document.execCommand('formatBlock', false, 'h2');
          else if (cmd === 'h3') document.execCommand('formatBlock', false, 'h3');
          else if (cmd === 'ul') document.execCommand('insertUnorderedList');
          else if (cmd === 'ol') document.execCommand('insertOrderedList');
          else if (cmd === 'quote') document.execCommand('formatBlock', false, 'blockquote');
          else if (cmd === 'code') document.execCommand('formatBlock', false, 'pre');
          else if (cmd === 'hr') document.execCommand('insertHorizontalRule');
          else if (cmd === 'check') { insertHtmlAtCaret('<ul class="rchk"><li data-done="0">To do</li></ul>'); }
          else if (cmd === 'toggle') { insertHtmlAtCaret('<details class="rtoggle" open><summary>Toggle</summary><div><br></div></details><div><br></div>'); }
          else if (cmd === 'callout') { insertHtmlAtCaret('<div class="rcallout"><br></div>'); }
          else if (cmd === 'table') { insertHtmlAtCaret('<table class="rtable"><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><div><br></div>'); }
          else if (cmd === 'blockup' || cmd === 'blockdown') {
            const sel = window.getSelection();
            let node = sel && sel.anchorNode;
            while (node && node.parentNode !== body) node = node.parentNode;
            if (node) {
              if (cmd === 'blockup' && node.previousElementSibling) body.insertBefore(node, node.previousElementSibling);
              else if (cmd === 'blockdown' && node.nextElementSibling) body.insertBefore(node.nextElementSibling, node);
              try { node.scrollIntoView({ block: 'nearest' }); } catch (x2) {}
            }
          }
          else if (cmd === 'link') {
            const raw = (typeof prompt === 'function') ? prompt('Link URL') : '';
            if (raw && raw.trim()) { const u = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : (/^[a-z][a-z0-9+.-]*:/i.test(raw.trim()) ? '' : 'https://' + raw.trim()); if (u) document.execCommand('createLink', false, u); }
          }
        } catch (x) {}
        save(false);
      };
      // Toolbar. mousedown + preventDefault keeps the editor selection so the
      // format command applies to the highlighted text.
      container.querySelectorAll('.rtool[data-cmd]').forEach(btn => btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        execNoteCmd(btn.getAttribute('data-cmd'));
      }));

      // === Slash menu (Craft pattern): type "/" on an empty stretch and an
      // insert palette appears at the caret; type to filter, arrows + Enter
      // to pick, Escape to dismiss. Picking removes the typed "/query". ===
      const SLASH_ITEMS = [
        ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3'],
        ['ul', 'Bulleted list'], ['ol', 'Numbered list'], ['check', 'Checklist'],
        ['toggle', 'Toggle block'], ['quote', 'Quote'], ['callout', 'Callout'],
        ['code', 'Code block'], ['table', 'Table'], ['hr', 'Divider'], ['image', 'Image'],
        ['blockup', 'Move block up'], ['blockdown', 'Move block down']
      ];
      let slashQ = '', slashIdx = 0;
      const slashEl = () => container.querySelector('#rSlash');
      const slashClose = () => { const m = slashEl(); if (m) m.remove(); slashQ = ''; slashIdx = 0; };
      const slashMatches = () => SLASH_ITEMS.filter(it => !slashQ || it[1].toLowerCase().indexOf(slashQ.toLowerCase()) >= 0);
      const slashPick = (cmd) => {
        // Delete the typed "/" plus whatever filter text followed it.
        const n = slashQ.length + 1;
        slashClose();
        try { for (let k = 0; k < n; k++) document.execCommand('delete'); } catch (x) {}
        execNoteCmd(cmd);
      };
      const slashRender = () => {
        let m = slashEl();
        const items = slashMatches();
        if (!items.length) { slashClose(); return; }
        if (slashIdx >= items.length) slashIdx = items.length - 1;
        if (!m) {
          m = document.createElement('div');
          m.id = 'rSlash';
          m.className = 'rslash';
          // Anchor at the caret; fall back to the editor's top-left.
          let x = 0, y = 0;
          try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount) {
              const rect = sel.getRangeAt(0).getBoundingClientRect();
              x = rect.left; y = rect.bottom + 6;
            }
          } catch (e) {}
          const host = container.querySelector('.rnotes__main') || container;
          const hr = host.getBoundingClientRect();
          m.style.left = Math.max(8, Math.min(x - hr.left, hr.width - 240)) + 'px';
          m.style.top = Math.max(8, (y - hr.top)) + 'px';
          host.appendChild(m);
        }
        m.innerHTML = items.map((it, i) =>
          '<button type="button" class="rslash__it' + (i === slashIdx ? ' is-on' : '') + '" data-slash="' + it[0] + '">' + esc(it[1]) + '</button>'
        ).join('');
        m.querySelectorAll('[data-slash]').forEach(b => b.addEventListener('mousedown', (e) => {
          e.preventDefault(); slashPick(b.getAttribute('data-slash'));
        }));
      };
      if (body && !body._slashBound) {
        body._slashBound = true;
        body.addEventListener('keydown', (e) => {
          const open = !!slashEl();
          if (!open) {
            if (e.key === '/') {
              // Only when the caret is not mid-word (start of line or after a space).
              try {
                const sel = window.getSelection();
                const node = sel && sel.anchorNode;
                const txt = node && node.nodeType === 3 ? node.textContent.slice(0, sel.anchorOffset) : '';
                if (txt && /\S$/.test(txt)) return;
              } catch (x) {}
              setTimeout(() => { slashQ = ''; slashIdx = 0; slashRender(); }, 0);
            }
            return;
          }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); slashClose(); return; }
          if (e.key === 'ArrowDown') { e.preventDefault(); slashIdx = Math.min(slashMatches().length - 1, slashIdx + 1); slashRender(); return; }
          if (e.key === 'ArrowUp') { e.preventDefault(); slashIdx = Math.max(0, slashIdx - 1); slashRender(); return; }
          if (e.key === 'Enter') { e.preventDefault(); const it = slashMatches()[slashIdx]; if (it) slashPick(it[0]); return; }
          if (e.key === 'Backspace') {
            if (!slashQ) { slashClose(); return; }
            slashQ = slashQ.slice(0, -1); slashRender(); return;
          }
          if (e.key.length === 1 && /[\w ]/.test(e.key)) { slashQ += e.key; slashRender(); return; }
          slashClose();
        });
        body.addEventListener('blur', () => setTimeout(slashClose, 150));
      }

      // === [[wiki links]] (Craft/Obsidian pattern): type [[ to link a note.
      // Picker reuses the slash menu's surface; picking inserts a chip that
      // opens the note on click. Backlinks render under the editor.
      let wikiQ = '';
      const wikiEl = () => container.querySelector('#rWiki');
      const wikiClose = () => { const m = wikiEl(); if (m) m.remove(); wikiQ = ''; };
      const wikiMatches = () => {
        const q = wikiQ.toLowerCase();
        return (r.entries || []).filter(e2 => e2.id !== r.activeNoteId && (!q || self._title(e2).toLowerCase().indexOf(q) >= 0)).slice(0, 8);
      };
      const wikiPick = (id) => {
        const target = (r.entries || []).find(e2 => e2.id === id);
        const n = wikiQ.length + 2; // the typed [[ plus the filter text
        wikiClose();
        if (!target) return;
        try { for (let k = 0; k < n; k++) document.execCommand('delete'); } catch (x) {}
        insertHtmlAtCaret('<a class="rwiki" data-rnote-link="' + esc(target.id) + '" contenteditable="false">' + esc(self._title(target)) + '</a>&nbsp;');
        save(false);
      };
      const wikiRender = () => {
        const items = wikiMatches();
        let m = wikiEl();
        if (!items.length) { wikiClose(); return; }
        if (!m) {
          m = document.createElement('div');
          m.id = 'rWiki';
          m.className = 'rslash';
          let x = 0, y = 0;
          try { const sel = window.getSelection(); if (sel && sel.rangeCount) { const rect = sel.getRangeAt(0).getBoundingClientRect(); x = rect.left; y = rect.bottom + 6; } } catch (e) {}
          const host = container.querySelector('.rnotes__main') || container;
          const hr2 = host.getBoundingClientRect();
          m.style.left = Math.max(8, Math.min(x - hr2.left, hr2.width - 240)) + 'px';
          m.style.top = Math.max(8, (y - hr2.top)) + 'px';
          host.appendChild(m);
        }
        m.innerHTML = '<div class="rslash__lbl">Link a note</div>' + items.map((e2, i) =>
          '<button type="button" class="rslash__it' + (i === 0 ? ' is-on' : '') + '" data-wiki="' + esc(e2.id) + '">' + esc(self._title(e2)) + '</button>').join('');
        m.querySelectorAll('[data-wiki]').forEach(b => b.addEventListener('mousedown', (e) => { e.preventDefault(); wikiPick(b.getAttribute('data-wiki')); }));
      };
      if (body && !body._wikiBound) {
        body._wikiBound = true;
        body.addEventListener('keydown', (e) => {
          const open = !!wikiEl();
          if (!open) {
            if (e.key === '[') {
              try {
                const sel = window.getSelection();
                const node = sel && sel.anchorNode;
                const txt = node && node.nodeType === 3 ? node.textContent.slice(0, sel.anchorOffset) : '';
                if (txt.slice(-1) === '[') setTimeout(() => { wikiQ = ''; wikiRender(); }, 0);
              } catch (x) {}
            }
            return;
          }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); wikiClose(); return; }
          if (e.key === 'Enter') { e.preventDefault(); const it = wikiMatches()[0]; if (it) wikiPick(it.id); return; }
          if (e.key === 'Backspace') { if (!wikiQ) { wikiClose(); return; } wikiQ = wikiQ.slice(0, -1); wikiRender(); return; }
          if (e.key.length === 1 && /[\w \-]/.test(e.key)) { wikiQ += e.key; wikiRender(); return; }
          wikiClose();
        });
        // Clicking a wiki chip opens the linked note.
        body.addEventListener('click', (e) => {
          const a = e.target.closest && e.target.closest('a.rwiki[data-rnote-link]');
          if (!a) return;
          e.preventDefault();
          const id = a.getAttribute('data-rnote-link');
          if ((r.entries || []).some(e2 => e2.id === id)) {
            r.activeNoteId = id; self._mobileEditing = true; r.openInNote = true;
            try { persistNow(); } catch (x) {}
            reRender();
          }
        });
      }
      // Backlink rows under the editor.
      container.querySelectorAll('[data-rback]').forEach(b => b.addEventListener('click', () => {
        r.activeNoteId = b.getAttribute('data-rback');
        self._mobileEditing = true; r.openInNote = true;
        try { persistNow(); } catch (x) {}
        reRender();
      }));
      // Daily Note (Craft pattern): one tap opens today's dated note, creating
      // it on first use (additive entry.daily = ISO day).
      const todayBtn = container.querySelector('#rToday');
      if (todayBtn) todayBtn.addEventListener('click', () => {
        const iso = getTodayISO();
        let d = (r.entries || []).find(e2 => e2 && e2.daily === iso);
        if (!d) {
          const heading = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          d = { id: 'rn_daily_' + iso + '_' + Date.now(), iso: iso, date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), text: heading, html: '<h1>' + esc(heading) + '</h1><div><br></div>', title: heading, folder: null, daily: iso, updated: Date.now() };
          r.entries.push(d);
        }
        r.activeNoteId = d.id; self._mobileEditing = true; r.openInNote = true; self._grid = false;
        try { persistNow(); } catch (x) {}
        reRender();
      });

      // View options: one clean popover for theme, surface (glassy/solid), font.
      const shell = container.querySelector('.rnotes');
      const optsBtn = container.querySelector('#rOptsBtn');
      const opts = container.querySelector('#rOpts');
      if (optsBtn && opts) {
        optsBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); opts.hidden = !opts.hidden; });
        if (self._optsOutside) document.removeEventListener('click', self._optsOutside);
        self._optsOutside = (e) => { if (!opts.hidden && !opts.contains(e.target) && !optsBtn.contains(e.target)) opts.hidden = true; };
        document.addEventListener('click', self._optsOutside);
      }
      // Recents: jump straight into a recently edited note.
      container.querySelectorAll('[data-rrecent]').forEach(b => b.addEventListener('click', () => {
        r.activeNoteId = b.getAttribute('data-rrecent');
        self._mobileEditing = true; r.openInNote = true; self._grid = false;
        try { persistNow(); } catch (e) {}
        reRender();
      }));
      // Outline (TOC): appears once a note has 2+ headings; tap a row to
      // scroll-jump to that heading.
      const tocBtn = container.querySelector('#rTocBtn');
      const tocEl = container.querySelector('#rToc');
      const tocHeads = () => body ? Array.from(body.querySelectorAll('h1, h2, h3')) : [];
      const tocSync = () => { if (tocBtn) tocBtn.hidden = tocHeads().length < 2; };
      if (tocBtn && tocEl && body) {
        tocSync();
        body.addEventListener('input', () => { clearTimeout(body._tocT); body._tocT = setTimeout(tocSync, 900); });
        tocBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!tocEl.hidden) { tocEl.hidden = true; return; }
          const hs = tocHeads();
          tocEl.innerHTML = hs.map((h, i) => '<button type="button" class="rtoc__row rtoc__row--' + h.tagName.toLowerCase() + '" data-toc="' + i + '">' + esc((h.textContent || 'Heading').slice(0, 48)) + '</button>').join('');
          tocEl.hidden = false;
          tocEl.querySelectorAll('[data-toc]').forEach(rb => rb.addEventListener('click', () => {
            const h = tocHeads()[parseInt(rb.getAttribute('data-toc'), 10)];
            if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            tocEl.hidden = true;
          }));
        });
        document.addEventListener('click', (e) => { if (!tocEl.hidden && !tocEl.contains(e.target) && e.target !== tocBtn) tocEl.hidden = true; }, true);
      }
      // Export the ENTIRE library as one markdown file, folder headers and
      // note dividers included. Local-first apps owe the user a way out.
      const exAll = container.querySelector('#rExportAll');
      if (exAll) exAll.addEventListener('click', () => {
        try {
          const folders = state.reflection.folders || [];
          const fname = (id) => { const f = folders.find(x => x.id === id); return f ? f.name : ''; };
          const groups = {};
          (state.reflection.entries || []).forEach(e2 => {
            const k = e2.folder ? (fname(e2.folder) || 'Folder') : 'No folder';
            (groups[k] = groups[k] || []).push(e2);
          });
          let md = '# Memento Notes export\n\n';
          Object.keys(groups).sort().forEach(k => {
            md += '## ' + k + '\n\n';
            groups[k].forEach(e2 => { md += self._noteToMd(e2) + '\n\n---\n\n'; });
          });
          const blob = new Blob([md], { type: 'text/markdown' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'memento-notes.md';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (e2) {} }, 4000);
        } catch (e2) {}
        if (opts) opts.hidden = true;
      });
      // Export the active note as Markdown: copy to clipboard or save a .md
      // file. The filename comes from the note's title line.
      // Find in note (+ replace): text-node walk wrapping <mark>, next/prev
      // cycles matches, replace swaps the current one. Marks unwrap cleanly.
      const findBar = container.querySelector('#rFind');
      const findIn = container.querySelector('#rFindIn');
      const findCount = container.querySelector('#rFindCount');
      let findIdx = 0;
      const findClear = () => {
        if (!body) return;
        body.querySelectorAll('mark.rfindhit').forEach(m => {
          const t = document.createTextNode(m.textContent);
          m.parentNode.replaceChild(t, m);
        });
        body.normalize();
      };
      const findRun = () => {
        if (!body || !findBar) return;
        findClear();
        const q = (findIn.value || '').trim();
        if (findCount) findCount.textContent = '';
        if (q.length < 2) return;
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const hits = [];
        const nodes = [];
        let nd;
        while ((nd = walker.nextNode())) nodes.push(nd);
        nodes.forEach(node => {
          let txt = node.textContent;
          let lo = txt.toLowerCase();
          const ql = q.toLowerCase();
          let ix = lo.indexOf(ql);
          if (ix < 0) return;
          const frag = document.createDocumentFragment();
          let pos = 0;
          while (ix >= 0) {
            frag.appendChild(document.createTextNode(txt.slice(pos, ix)));
            const mk = document.createElement('mark');
            mk.className = 'rfindhit';
            mk.textContent = txt.slice(ix, ix + q.length);
            frag.appendChild(mk);
            hits.push(mk);
            pos = ix + q.length;
            ix = lo.indexOf(ql, pos);
          }
          frag.appendChild(document.createTextNode(txt.slice(pos)));
          node.parentNode.replaceChild(frag, node);
        });
        const all = body.querySelectorAll('mark.rfindhit');
        if (findCount) findCount.textContent = all.length ? ((Math.min(findIdx, all.length - 1) + 1) + ' of ' + all.length) : 'No matches';
        if (all.length) {
          findIdx = Math.min(findIdx, all.length - 1);
          all.forEach((m, i) => m.classList.toggle('is-cur', i === findIdx));
          try { all[findIdx].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        }
      };
      const findStep = (d) => {
        const all = body ? body.querySelectorAll('mark.rfindhit') : [];
        if (!all.length) return;
        findIdx = (findIdx + d + all.length) % all.length;
        all.forEach((m, i) => m.classList.toggle('is-cur', i === findIdx));
        if (findCount) findCount.textContent = (findIdx + 1) + ' of ' + all.length;
        try { all[findIdx].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      };
      const findBtnEl = container.querySelector('#rFindBtn');
      if (findBtnEl && findBar) {
        findBtnEl.addEventListener('click', () => {
          findBar.hidden = !findBar.hidden;
          if (!findBar.hidden) { findIdx = 0; setTimeout(() => { try { findIn.focus(); } catch (e) {} }, 30); }
          else { findClear(); }
        });
        let ft = 0;
        findIn.addEventListener('input', () => { clearTimeout(ft); ft = setTimeout(() => { findIdx = 0; findRun(); }, 250); });
        findIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); findStep(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') { e.stopPropagation(); findBar.hidden = true; findClear(); } });
        container.querySelector('#rFindNext').addEventListener('click', () => findStep(1));
        container.querySelector('#rFindPrev').addEventListener('click', () => findStep(-1));
        container.querySelector('#rFindClose').addEventListener('click', () => { findBar.hidden = true; findClear(); });
        container.querySelector('#rFindRepBtn').addEventListener('click', () => {
          const all = body.querySelectorAll('mark.rfindhit');
          if (!all.length) return;
          const cur = all[Math.min(findIdx, all.length - 1)];
          cur.parentNode.replaceChild(document.createTextNode(container.querySelector('#rFindRep').value || ''), cur);
          body.normalize();
          save(false);
          findRun();
        });
      }
      // Import .md files: each becomes a note in the current folder.
      const impBtn = container.querySelector('#rImportMd');
      const impFile = container.querySelector('#rImportMdFile');
      if (impBtn && impFile) {
        impBtn.addEventListener('click', () => impFile.click());
        impFile.addEventListener('change', async () => {
          const files = Array.from(impFile.files || []);
          let n = 0;
          for (const f of files) {
            try {
              const text = await f.text();
              const htmlBody = self._mdToHtml(text);
              const folder = (self._view && self._view !== 'all' && self._view !== 'trash') ? self._view : null;
              const e2 = { id: 'rn_' + getTodayISO() + '_' + Date.now() + '_i' + n, iso: getTodayISO(), date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), text: '', html: htmlBody, title: '', folder: folder, updated: Date.now() };
              try { const pd = new DOMParser().parseFromString(htmlBody, 'text/html'); e2.text = ((pd && pd.body ? pd.body.textContent : '') || '').trim(); } catch (x) {}
              r.entries.push(e2);
              n++;
            } catch (x) {}
          }
          impFile.value = '';
          if (n) { try { persistNow(); } catch (x) {} reRender(); }
          try { if (typeof showComingSoonToast === 'function') showComingSoonToast(n ? (n + (n === 1 ? ' note imported.' : ' notes imported.')) : 'Nothing importable in that.'); } catch (x) {}
          if (opts) opts.hidden = true;
        });
      }
      // Mobile keyboard accessory bar: pinned above the virtual keyboard via
      // visualViewport geometry while the editor is focused.
      const kbar = container.querySelector('#rKbar');
      if (kbar && body) {
        const vv = window.visualViewport;
        const placeKbar = () => {
          if (kbar.hidden || !vv) return;
          const off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
          kbar.style.bottom = off + 'px';
        };
        const showKbar = () => {
          if (window.innerWidth >= 860) return;
          kbar.hidden = false;
          placeKbar();
        };
        const hideKbar = () => { kbar.hidden = true; };
        body.addEventListener('focus', showKbar);
        body.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== body) hideKbar(); }, 120));
        if (vv) { vv.addEventListener('resize', placeKbar); vv.addEventListener('scroll', placeKbar); }
        kbar.querySelectorAll('[data-kbar]').forEach(b => b.addEventListener('mousedown', (e) => {
          e.preventDefault();
          execNoteCmd(b.getAttribute('data-kbar'));
        }));
        const kdone = kbar.querySelector('[data-kbar-done]');
        if (kdone) kdone.addEventListener('mousedown', (e) => { e.preventDefault(); try { body.blur(); } catch (x) {} hideKbar(); });
      }
      // Snapshot restore: current content is kept as the undo.
      container.querySelectorAll('[data-rsnap]').forEach(b => b.addEventListener('click', () => {
        const a = getActive(); if (!a || !Array.isArray(a.snapshots)) return;
        const snap = a.snapshots[parseInt(b.getAttribute('data-rsnap'), 10)];
        if (!snap) return;
        const before = a.html;
        a.html = snap.html;
        a.updated = Date.now();
        try { persistNow(); } catch (e) {}
        reRender();
        try {
          if (typeof showUndoToast === 'function') showUndoToast('Snapshot restored.', () => {
            const a2 = (r.entries || []).find(x => x.id === a.id);
            if (a2) { a2.html = before; try { persistNow(); } catch (e2) {} reRender(); }
          });
        } catch (e) {}
      }));
      // All images: a wall of every image across notes; tap opens its note.
      const imgsBtn = container.querySelector('#rImagesAll');
      if (imgsBtn) imgsBtn.addEventListener('click', async () => {
        if (opts) opts.hidden = true;
        const old = document.getElementById('rImgWall'); if (old) old.remove();
        const wall = document.createElement('div');
        wall.id = 'rImgWall';
        wall.className = 'rimgwall';
        wall.innerHTML = '<div class="rimgwall__head"><span>Images in your notes</span><button type="button" class="rimgwall__x" aria-label="Close">&times;</button></div><div class="rimgwall__grid" id="rImgWallGrid"></div>';
        document.body.appendChild(wall);
        wall.querySelector('.rimgwall__x').addEventListener('click', () => wall.remove());
        const grid = wall.querySelector('#rImgWallGrid');
        let count = 0;
        for (const e2 of (r.entries || [])) {
          if (count >= 60) break;
          if (!e2.html || e2.html.indexOf('<img') === -1) continue;
          let doc2;
          try { doc2 = new DOMParser().parseFromString(e2.html, 'text/html'); } catch (x) { continue; }
          for (const im of Array.from(doc2.querySelectorAll('img'))) {
            if (count >= 60) break;
            const b3 = document.createElement('button');
            b3.type = 'button';
            b3.className = 'rimgwall__it';
            b3.setAttribute('data-imgnote', e2.id);
            const img3 = document.createElement('img');
            const iid = im.getAttribute('data-img-id');
            if (iid && typeof idbGetBlobURL === 'function') {
              try { const u = await idbGetBlobURL(iid); if (u) img3.src = u; } catch (x) {}
            } else if (im.getAttribute('src')) {
              img3.src = im.getAttribute('src');
            }
            if (!img3.src) continue;
            b3.appendChild(img3);
            b3.addEventListener('click', () => {
              wall.remove();
              r.activeNoteId = e2.id; self._mobileEditing = true; r.openInNote = true; self._grid = false;
              try { persistNow(); } catch (x) {}
              reRender();
            });
            grid.appendChild(b3);
            count++;
          }
        }
        if (!count) grid.innerHTML = '<div class="rnote-empty">No images in your notes yet.</div>';
      });
      // Multi-select: toggle the mode, then batch pin / move / delete.
      const selT = container.querySelector('#rSelectToggle');
      if (selT) selT.addEventListener('click', () => {
        self._selectMode = !self._selectMode;
        self._selected = new Set();
        reRender();
      });
      const selIds = () => Array.from(self._selected || []);
      const bp = container.querySelector('#rBatchPin');
      if (bp) bp.addEventListener('click', () => {
        selIds().forEach(id => { const n = (r.entries || []).find(x => x.id === id); if (n) n.pinned = true; });
        self._selectMode = false; self._selected = new Set();
        try { persistNow(); } catch (e) {}
        reRender();
      });
      const bm = container.querySelector('#rBatchMove');
      if (bm) bm.addEventListener('change', () => {
        const v = bm.value; if (!v) return;
        selIds().forEach(id => { const n = (r.entries || []).find(x => x.id === id); if (n) n.folder = (v === '__none') ? null : v; });
        self._selectMode = false; self._selected = new Set();
        try { persistNow(); } catch (e) {}
        reRender();
      });
      const bd = container.querySelector('#rBatchDel');
      if (bd) bd.addEventListener('click', () => {
        const ids = selIds(); if (!ids.length) return;
        const removed = [];
        ids.forEach(id => {
          const i = (r.entries || []).findIndex(x => x.id === id);
          if (i < 0) return;
          const n = r.entries[i];
          n.deletedAt = Date.now();
          if (!Array.isArray(r.trash)) r.trash = [];
          r.trash.unshift(n);
          r.entries.splice(i, 1);
          removed.push(n);
        });
        if (r.activeNoteId && ids.indexOf(r.activeNoteId) >= 0) r.activeNoteId = null;
        self._selectMode = false; self._selected = new Set();
        try { persistNow(); renderAll(); } catch (e) {}
        reRender();
        try {
          if (typeof showUndoToast === 'function') showUndoToast(removed.length + (removed.length === 1 ? ' note deleted.' : ' notes deleted.'), () => {
            removed.forEach(n => {
              r.trash = (r.trash || []).filter(t => t.id !== n.id);
              delete n.deletedAt;
              r.entries.unshift(n);
            });
            try { persistNow(); } catch (e2) {}
            reRender();
          });
        } catch (e2) {}
      });
      const exCopy = container.querySelector('#rExportCopy');
      const exDl = container.querySelector('#rExportDl');
      const exMd = () => self._noteToMd(getActive());
      if (exCopy) exCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(exMd());
          if (typeof showComingSoonToast === 'function') showComingSoonToast('Copied as Markdown.');
        } catch (e) {
          if (typeof showComingSoonToast === 'function') showComingSoonToast('Could not copy. Try the download instead.');
        }
        if (opts) opts.hidden = true;
      });
      if (exDl) exDl.addEventListener('click', () => {
        try {
          const n = getActive();
          const name = (self._title(n) || 'note').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 48) || 'note';
          const blob = new Blob([exMd()], { type: 'text/markdown' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = name + '.md';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
        } catch (e) {}
        if (opts) opts.hidden = true;
      });
      const setOn = (key, val) => { if (opts) opts.querySelectorAll('[data-ropt-' + key + ']').forEach(b => b.classList.toggle('is-on', b.getAttribute('data-ropt-' + key) === val)); };
      container.querySelectorAll('[data-ropt-theme]').forEach(b => b.addEventListener('click', () => {
        const v = b.getAttribute('data-ropt-theme');
        // Module-local theme only: never touches the global app theme.
        if (!r.disp) r.disp = {}; r.disp.theme = v;
        if (shell) { shell.classList.remove('rnotes--theme-light', 'rnotes--theme-dark'); if (v !== 'auto') shell.classList.add('rnotes--theme-' + v); }
        setOn('theme', v); try { persistNow(); } catch (e) {}
      }));
      container.querySelectorAll('[data-ropt-surface]').forEach(b => b.addEventListener('click', () => {
        const v = b.getAttribute('data-ropt-surface');
        if (!r.disp) r.disp = {}; r.disp.surface = v;
        if (shell) shell.classList.toggle('rnotes--solid', v === 'solid');
        setOn('surface', v); try { persistNow(); } catch (e) {}
      }));
      container.querySelectorAll('[data-ropt-font]').forEach(b => b.addEventListener('click', () => {
        const v = b.getAttribute('data-ropt-font');
        if (!r.disp) r.disp = {}; r.disp.font = v;
        if (shell) { shell.classList.remove('rnotes--font-serif', 'rnotes--font-mono'); if (v !== 'system') shell.classList.add('rnotes--font-' + v); }
        setOn('font', v); try { persistNow(); } catch (e) {}
      }));
      // Per-note style: font + size live on the note object, applied live as
      // classes on the editor body (module disp stays the default elsewhere).
      container.querySelectorAll('[data-rnote-font]').forEach(b => b.addEventListener('click', () => {
        const a = getActive(); if (!a) return;
        if (!a.style || typeof a.style !== 'object') a.style = {};
        a.style.font = b.getAttribute('data-rnote-font');
        if (body) { body.classList.remove('rbody--font-system', 'rbody--font-serif', 'rbody--font-mono'); body.classList.add('rbody--font-' + a.style.font); }
        if (opts) opts.querySelectorAll('[data-rnote-font]').forEach(x => x.classList.toggle('is-on', x === b));
        try { persistNow(); } catch (e) {}
      }));
      container.querySelectorAll('[data-rnote-size]').forEach(b => b.addEventListener('click', () => {
        const a = getActive(); if (!a) return;
        if (!a.style || typeof a.style !== 'object') a.style = {};
        const v = b.getAttribute('data-rnote-size');
        a.style.size = v;
        if (body) { body.classList.remove('rbody--size-xs', 'rbody--size-s', 'rbody--size-l', 'rbody--size-xl'); if (v !== 'm') body.classList.add('rbody--size-' + v); }
        if (opts) opts.querySelectorAll('[data-rnote-size]').forEach(x => x.classList.toggle('is-on', x === b));
        try { persistNow(); } catch (e) {}
      }));
      container.querySelectorAll('[data-rnote-lh]').forEach(b => b.addEventListener('click', () => {
        const a = getActive(); if (!a) return;
        if (!a.style || typeof a.style !== 'object') a.style = {};
        const v = b.getAttribute('data-rnote-lh');
        a.style.lh = v;
        if (body) { body.classList.remove('rbody--lh-c', 'rbody--lh-r'); if (v !== 'm') body.classList.add('rbody--lh-' + v); }
        if (opts) opts.querySelectorAll('[data-rnote-lh]').forEach(x => x.classList.toggle('is-on', x === b));
        try { persistNow(); } catch (e) {}
      }));
      // Tags: chips + input in the editor footer. Stored additively as
      // note.tags (lowercase, no #); the sidebar tag bar filters on them.
      const tagIn = container.querySelector('#rTagIn');
      if (tagIn) tagIn.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const a = getActive(); if (!a) return;
        const t = (tagIn.value || '').trim().toLowerCase().replace(/^#+/, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
        if (!t) return;
        if (!Array.isArray(a.tags)) a.tags = [];
        if (a.tags.indexOf(t) === -1) a.tags.push(t);
        try { persistNow(); } catch (x) {}
        reRender();
      });
      container.querySelectorAll('[data-rtag-del]').forEach(b => b.addEventListener('click', () => {
        const a = getActive(); if (!a || !Array.isArray(a.tags)) return;
        a.tags = a.tags.filter(t => t !== b.getAttribute('data-rtag-del'));
        try { persistNow(); } catch (x) {}
        reRender();
      }));
      container.querySelectorAll('[data-rnote-tint]').forEach(b => b.addEventListener('click', () => {
        const a = getActive(); if (!a) return;
        if (!a.style || typeof a.style !== 'object') a.style = {};
        const v = b.getAttribute('data-rnote-tint');
        a.style.tint = v;
        if (body) { body.classList.remove('rbody--tint-warm', 'rbody--tint-rose', 'rbody--tint-sage', 'rbody--tint-mist'); if (v !== 'none') body.classList.add('rbody--tint-' + v); }
        if (opts) opts.querySelectorAll('[data-rnote-tint]').forEach(x => x.classList.toggle('is-on', x === b));
        try { persistNow(); } catch (e) {}
      }));
      // Gallery sort: persisted, applies to the list view too.
      const sortCtl = container.querySelector('#rSort');
      if (sortCtl) sortCtl.addEventListener('change', () => { if (!r.disp) r.disp = {}; r.disp.sort = sortCtl.value; try { persistNow(); } catch (e) {} reRender(); });
      // Full screen: hide the note list so the editor fills the screen. Button
      // toggles; Esc exits (captured before the sheet's own Esc-to-close).
      const fsBtn = container.querySelector('#rFsBtn');
      // Toggle full screen LIVE (class flips, not a re-render) so the panel
      // animates smoothly into a truly immersive, edge-to-edge view.
      const setFs = (on) => {
        self._fs = on;
        const sh = container.querySelector('.rnotes'); if (sh) sh.classList.toggle('rnotes--fs', on);
        try { document.body.classList.toggle('notes-fs', on); } catch (e) {}
        const hint = container.querySelector('.redit-foot__hint'); if (hint) hint.textContent = on ? 'Esc to exit full screen' : '';
      };
      if (fsBtn) fsBtn.addEventListener('click', (e) => { e.preventDefault(); setFs(!self._fs); });
      // Focus mode (Craft model): Cmd+. melts ALL chrome around the editor
      // column (library, pins, toolbar, footer). Per-session, never persisted.
      // Works with or without full screen; everything inside keeps working.
      const setZen = (on) => {
        self._zen = on;
        const sh = container.querySelector('.rnotes');
        if (sh) { sh.classList.toggle('rnotes--zen', on); if (!on) sh.classList.remove('is-mouse'); }
        try { document.body.classList.toggle('notes-zen', on); } catch (e) {}
        if (!on && self._zenIdleT) { clearTimeout(self._zenIdleT); self._zenIdleT = null; }
      };
      const zenExit = container.querySelector('#rZenExit');
      if (zenExit) zenExit.addEventListener('click', () => setZen(false));
      // Ghost chrome: in zen, the exit + stat pills surface on mousemove and
      // fade after ~2s idle (CSS keys off the .is-mouse class).
      if (self._zenMove) document.removeEventListener('mousemove', self._zenMove);
      self._zenMove = () => {
        if (!self._zen) return;
        const sh = container.querySelector('.rnotes'); if (!sh) return;
        sh.classList.add('is-mouse');
        if (self._zenIdleT) clearTimeout(self._zenIdleT);
        self._zenIdleT = setTimeout(() => { try { sh.classList.remove('is-mouse'); } catch (e) {} }, 2000);
      };
      document.addEventListener('mousemove', self._zenMove);
      if (self._fsEsc) document.removeEventListener('keydown', self._fsEsc, true);
      self._fsEsc = (e) => {
        // Cmd+. (or Ctrl+.) toggles focus mode while Notes is on screen.
        if (e.key === '.' && (e.metaKey || e.ctrlKey)) {
          const sh = container.querySelector('.rnotes');
          if (!sh || !sh.isConnected) return;
          if (window.innerWidth <= 720) return; // mobile layout already hides panes; zen would blank the screen
          e.preventDefault(); e.stopPropagation(); setZen(!self._zen); return;
        }
        if (e.key === 'Escape' && self._zen) { e.stopPropagation(); e.preventDefault(); setZen(false); return; }
        if (e.key === 'Escape' && self._fs) { e.stopPropagation(); e.preventDefault(); setFs(false); }
      };
      document.addEventListener('keydown', self._fsEsc, true);

      const imgInput = container.querySelector('#rImg');
      if (imgInput) imgInput.addEventListener('change', () => {
        const f = imgInput.files && imgInput.files[0]; if (!f) return;
        vivDownscaleImage(f, 1200, (dataURL, w, h) => {
          if (!dataURL) return;
          const insertInline = () => { if (body) { body.focus(); try { document.execCommand('insertImage', false, dataURL); } catch (e) {} save(true); } };
          if (IDB_OK) {
            idbStore(dataURL, w, h).then((imageId) => {
              if (imageId && body) {
                body.focus();
                try { document.execCommand('insertHTML', false, '<img class="rnote-img" data-img-id="' + imageId + '">'); } catch (e) {}
                hydrateImageEls(body);
                save(true);
              } else if (vivStorageOk(dataURL.length)) { insertInline(); }
              else { try { alert('Storage is getting full. Remove a few images first.'); } catch (e) {} }
            });
          } else {
            if (!vivStorageOk(dataURL.length)) { try { alert('Storage is getting full. Remove a few images first.'); } catch (e) {} return; }
            insertInline();
          }
        });
        imgInput.value = '';
      });
    }
  }
};

/* ============================================
   CALENDAR COMPONENT
   ============================================ */
let calYear, calMonth;

function renderCalendar(year, month) {
  calYear = year;
  calMonth = month;
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();
  const today = getTodayISO();
  // Month matches Heatmap and Chain: only the main Action earns a completed day.
  const _counts = buildConsistencyData();

  let html = '<div class="cal">';
  html += '<div class="cal__header">';
  html += `<button class="cal__nav" id="calPrev" aria-label="Previous month">‹</button>`;
  html += `<span class="cal__month">${monthNames[month]} ${year}</span>`;
  html += `<button class="cal__nav" id="calNext" aria-label="Next month">›</button>`;
  html += '</div>';

  html += '<div class="cal__weekdays">';
  dayNames.forEach(d => html += `<div class="cal__weekday">${d}</div>`);
  html += '</div>';

  html += '<div class="cal__days">';
  for (let i = 0; i < startDow; i++) html += '<div class="cal__day cal__day--empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const isDone = consistencyDayHasMainAction(_counts[dateStr]);
    let cls = 'cal__day';
    if (isToday) cls += ' cal__day--today';
    if (isDone) cls += ' cal__day--done';

    const isPast = dateStr <= today;
    if (isPast) cls += ' cal__day--clickable';
    html += `<div class="${cls}" data-date="${dateStr}">`;
    if (isDone) {
      html += '<div class="cal__dot-mark"></div>';
    }
    html += `<span style="${isDone ? 'opacity:0.4' : ''}">${d}</span>`;
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

function bindCalendarNav(container) {
  const prev = container.querySelector('#calPrev');
  const next = container.querySelector('#calNext');
  if (prev) prev.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    refreshCalendar(container);
  });
  if (next) next.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    refreshCalendar(container);
  });

  // Tap any past/present day to toggle
  container.querySelectorAll('.cal__day--clickable').forEach(dayEl => {
    dayEl.addEventListener('click', () => toggleStreakDay(dayEl.dataset.date, container));
  });
}

// Single source of truth for a user-initiated day toggle (calendar tap AND
// heatmap-cell backfill share this exact path). Toggles the date in
// state.streak.history, recalculates, persists, and re-renders the streak sheet.
// Non-future dates only; never a bulk rewrite.
function toggleStreakDay(date, container) {
  const today = getTodayISO();
  if (!date || date > today) return;
  if (state.streak.history.includes(date)) {
    state.streak.history = state.streak.history.filter(d => d !== date);
  } else {
    state.streak.history.push(date);
    state.streak.history.sort();
  }
  if (state.streak.history.length > 400) state.streak.history = state.streak.history.slice(-400);
  recalculateStreak();
  persistNow();
  renderAll();
  refreshCalendar(container);
}

function refreshCalendar(container) {
  // Re-render the entire streak sheet to update calendar
  container.innerHTML = SHEET_TEMPLATES.streak.render();
  SHEET_TEMPLATES.streak.bind(container);
}
