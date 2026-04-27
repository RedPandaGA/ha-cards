/**
 * Levoit Vital 200S — Custom Lovelace Card v2
 *
 * Installation:
 *   1. Copy this file to config/www/levoit-vital200s-card.js
 *   2. Settings → Dashboards → ⋮ → Resources → Add resource
 *      URL: /local/levoit-vital200s-card.js   Type: JavaScript module
 *   3. Add card (Manual):
 *
 *      type: custom:levoit-vital200s-card
 *      fan_entity: fan.cat_room
 *      pm25_entity: sensor.cat_room_pm2_5            # optional
 *      filter_entity: sensor.cat_room_filter_life     # optional
 *      aq_entity: sensor.cat_room_air_quality         # optional
 *      display_entity: switch.cat_room_display        # optional
 *      child_lock_entity: switch.cat_room_child_lock  # optional
 *      light_detect_entity: switch.cat_room_light_detection # optional
 *      auto_pref_entity: select.cat_room_auto_preference    # optional
 */

// AQ level 1-5 → colour ramp: green → yellow → orange → red
const AQ_LEVEL_COLORS = {
  1: { dot: '#22c55e', label: 'Excellent', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)'  },
  2: { dot: '#84cc16', label: 'Good',      bg: 'rgba(132,204,22,0.15)', border: 'rgba(132,204,22,0.4)' },
  3: { dot: '#eab308', label: 'Moderate',  bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.4)'  },
  4: { dot: '#f97316', label: 'Poor',      bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)' },
  5: { dot: '#ef4444', label: 'Very Poor', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)'  },
};

const MODE_COLORS = {
  manual: { active: 'rgba(56,189,248,0.18)', border: '#38bdf8', text: '#7dd3fc' },
  auto:   { active: 'rgba(74,222,128,0.18)', border: '#4ade80', text: '#86efac' },
  sleep:  { active: 'rgba(167,139,250,0.18)',border: '#a78bfa', text: '#c4b5fd' },
  pet:    { active: 'rgba(251,191,36,0.18)', border: '#fbbf24', text: '#fcd34d' },
};

class LevoitVital200SCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._pollTimer = null;
    this._pollCountdown = null;
  }

  setConfig(config) {
    if (!config.fan_entity) throw new Error('fan_entity is required');
    this._config = config;
    this._renderShell();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateState();
  }

  disconnectedCallback() {
    this._clearTimer();
  }

  getCardSize() { return 3; }
  static getStubConfig() { return { fan_entity: 'fan.air_purifier' }; }

  _callService(domain, service, data) {
    this._hass.callService(domain, service, data);
  }

  _state(id) {
    return (id && this._hass) ? (this._hass.states[id] || null) : null;
  }

  _clearTimer() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  }

  _renderShell() {
    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; font-family: var(--primary-font-family, sans-serif); }

        ha-card { padding: 12px 14px 10px; }

        /* ── Header ─────────────────────────────────── */
        .header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .title-row { display: flex; align-items: center; gap: 8px; }
        .icon { font-size: 18px; line-height: 1; }
        .name { font-size: 14px; font-weight: 600; color: var(--primary-text-color); }
        .sub  { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; }

        .power-btn {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid var(--divider-color);
          background: transparent; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--secondary-text-color); transition: all 0.15s;
          flex-shrink: 0;
        }
        .power-btn:hover { background: var(--secondary-background-color); }
        .power-btn.on {
          background: rgba(34,197,94,0.15);
          border-color: #22c55e; color: #22c55e;
        }
        .power-btn svg { width: 14px; height: 14px; }

        /* ── Badges row ──────────────────────────────── */
        .badges {
          display: flex; gap: 5px; flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .badge {
          font-size: 10px; font-weight: 500;
          padding: 2px 7px; border-radius: 20px;
          border: 1px solid; white-space: nowrap;
        }

        /* ── Section label ───────────────────────────── */
        .section-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--secondary-text-color);
          margin-bottom: 5px;
        }

        /* ── Speed ───────────────────────────────────── */
        .speed-section { margin-bottom: 8px; }
        .speed-header {
          display: flex; align-items: baseline;
          justify-content: space-between; margin-bottom: 5px;
        }
        .speed-current { font-size: 18px; font-weight: 600; color: var(--primary-text-color); }
        .speed-max { font-size: 11px; color: var(--secondary-text-color); }
        .speed-btns { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; }
        .speed-btn {
          padding: 6px 0; border: 1px solid var(--divider-color);
          border-radius: 6px; background: transparent; cursor: pointer;
          font-size: 13px; font-weight: 500;
          color: var(--secondary-text-color); transition: all 0.12s;
        }
        .speed-btn:hover { background: var(--secondary-background-color); }
        .speed-btn.active {
          background: rgba(56,189,248,0.18);
          border-color: #38bdf8; color: #7dd3fc;
        }

        /* ── Mode ────────────────────────────────────── */
        .mode-section { margin-bottom: 8px; }
        .mode-btns { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; }
        .mode-btn {
          padding: 5px 4px; border: 1px solid var(--divider-color);
          border-radius: 6px; background: transparent; cursor: pointer;
          font-size: 11px; color: var(--secondary-text-color);
          text-align: center; transition: all 0.12s; text-transform: capitalize;
        }
        .mode-btn:hover { background: var(--secondary-background-color); }

        /* ── Divider ─────────────────────────────────── */
        .divider { border: none; border-top: 1px solid var(--divider-color); margin: 8px 0; }

        /* ── Metrics ─────────────────────────────────── */
        .metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-bottom: 8px; }
        .metric {
          background: var(--secondary-background-color);
          border-radius: 7px; padding: 7px 8px;
          border: 1px solid transparent;
        }
        .metric-label { font-size: 10px; color: var(--secondary-text-color); margin-bottom: 2px; }
        .metric-value { font-size: 16px; font-weight: 600; color: var(--primary-text-color); line-height: 1; }
        .metric-unit  { font-size: 10px; color: var(--secondary-text-color); }
        .aq-dot {
          display: inline-block; width: 8px; height: 8px;
          border-radius: 50%; margin-right: 4px; vertical-align: middle;
        }

        /* ── Toggles ─────────────────────────────────── */
        .toggles { display: flex; gap: 5px; margin-bottom: 8px; }
        .toggle-item {
          flex: 1; display: flex; align-items: center;
          justify-content: space-between;
          background: var(--secondary-background-color);
          border-radius: 7px; padding: 6px 8px;
        }
        .toggle-label { font-size: 11px; color: var(--secondary-text-color); }
        .toggle-switch {
          width: 28px; height: 16px;
          background: var(--divider-color); border-radius: 8px;
          position: relative; cursor: pointer; transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle-switch::after {
          content: ''; position: absolute;
          width: 10px; height: 10px; background: white;
          border-radius: 50%; top: 3px; left: 3px; transition: transform 0.2s;
        }
        .toggle-switch.on { background: #38bdf8; }
        .toggle-switch.on::after { transform: translateX(12px); }

        /* ── Poll footer ─────────────────────────────── */
        .poll-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 2px;
        }
        .poll-label { font-size: 10px; color: var(--secondary-text-color); }
        .poll-bar-wrap {
          flex: 1; height: 3px; background: var(--divider-color);
          border-radius: 2px; margin: 0 8px; overflow: hidden;
        }
        .poll-bar {
          height: 100%; border-radius: 2px;
          background: #38bdf8; transition: width 1s linear;
        }
        .poll-bar.syncing { background: #a78bfa; }
        .poll-countdown { font-size: 10px; color: var(--secondary-text-color); min-width: 28px; text-align: right; }

        .unavailable { text-align: center; padding: 20px; color: var(--secondary-text-color); font-size: 13px; }
      </style>
      <ha-card><div id="root"></div></ha-card>`;

    this._root = this.shadowRoot.getElementById('root');
  }

  _updateState() {
    if (!this._hass || !this._config.fan_entity) return;
    const fanState = this._state(this._config.fan_entity);

    if (!fanState) {
      this._root.innerHTML = `<div class="unavailable">Entity not found: ${this._config.fan_entity}</div>`;
      return;
    }
    if (fanState.state === 'unavailable') {
      this._root.innerHTML = `<div class="unavailable">🌬 Purifier unavailable</div>`;
      return;
    }

    const isOn   = fanState.state === 'on';
    const attrs  = fanState.attributes;
    const mode   = attrs.preset_mode || 'manual';
    const pct    = attrs.percentage || 0;
    const level  = pct > 0 ? Math.round(pct / 25) : (attrs.fan_set_level || attrs.fan_level || 0);
    const name   = attrs.friendly_name || this._config.fan_entity;

    // Sensor values — prefer dedicated entities, fall back to fan attrs
    const pm25S      = this._state(this._config.pm25_entity);
    const pm25       = pm25S ? pm25S.state : (attrs.pm25 ?? '—');
    const filterS    = this._state(this._config.filter_entity);
    const filterLife = filterS ? filterS.state : (attrs.filter_life ?? '—');
    const aqS        = this._state(this._config.aq_entity);
    const aqLevel    = parseInt(attrs.air_quality_level ?? (aqS?.attributes?.raw_level ?? 1));
    const aqText     = aqS ? aqS.state : (attrs.air_quality ?? '—');

    // Switch states
    const displayS     = this._state(this._config.display_entity);
    const displayOn    = displayS ? displayS.state === 'on' : (String(attrs.display) === 'on');
    const childLockS   = this._state(this._config.child_lock_entity);
    const childLockOn  = childLockS ? childLockS.state === 'on' : Boolean(attrs.child_lock);
    const lightS       = this._state(this._config.light_detect_entity);
    const lightOn      = lightS ? lightS.state === 'on' : (String(attrs.light_detection) === 'on');

    // Poll timing from fan entity attributes
    const pollInterval   = attrs.poll_interval_seconds || 90;
    const sinceLastPoll  = attrs.seconds_since_last_poll;
    const holdActive     = Boolean(attrs.optimistic_hold_active);
    const holdExpiresIn  = attrs.optimistic_hold_expires_in || 0;

    // Mode badge
    const mc = MODE_COLORS[mode] || MODE_COLORS.manual;
    const modeBadgeStyle = `background:${mc.active};border-color:${mc.border};color:${mc.text}`;

    // AQ colour
    const aqC = AQ_LEVEL_COLORS[Math.min(Math.max(aqLevel, 1), 5)] || AQ_LEVEL_COLORS[1];

    // Speed section disabled when off or not manual
    const speedDisabled = !isOn || mode !== 'manual';

    // Auto pref
    const autoPrefS = this._state(this._config.auto_pref_entity);
    const autoPref  = autoPrefS ? autoPrefS.state : (attrs.auto_preference || 'default');

    const autoPrefHTML = this._config.auto_pref_entity ? `
      <div style="margin-bottom:8px">
        <div class="section-label">Auto preference</div>
        <div style="display:flex;gap:5px">
          ${['default','efficient','quiet'].map(p => `
            <button class="mode-btn ${autoPref===p ? 'active-pref' : ''}" data-pref="${p}"
              style="${autoPref===p ? 'background:rgba(56,189,248,0.18);border-color:#38bdf8;color:#7dd3fc' : ''}"
            >${p}</button>`).join('')}
        </div>
      </div>` : '';

    this._root.innerHTML = `
      <div class="header">
        <div class="title-row">
          <span class="icon">🌬</span>
          <div>
            <div class="name">${name}</div>
            <div class="sub">Levoit Vital 200S</div>
          </div>
        </div>
        <button class="power-btn ${isOn ? 'on' : ''}" id="power-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
            <line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </button>
      </div>

      <div class="badges">
        <span class="badge" style="${modeBadgeStyle}">${mode}</span>
        ${aqText !== '—' ? `<span class="badge" style="background:${aqC.bg};border-color:${aqC.border};color:${aqC.dot}">
          <span class="aq-dot" style="background:${aqC.dot}"></span>${aqC.label}
        </span>` : ''}
      </div>

      <div class="speed-section" style="${speedDisabled ? 'opacity:0.4;pointer-events:none' : ''}">
        <div class="speed-header">
          <span class="section-label">Fan speed</span>
          <span>
            <span class="speed-current">${isOn && mode === 'manual' ? (level || '—') : '—'}</span>
            <span class="speed-max"> / 4</span>
          </span>
        </div>
        <div class="speed-btns">
          ${[1,2,3,4].map(s => `
            <button class="speed-btn ${level===s && isOn && mode==='manual' ? 'active' : ''}" data-speed="${s}">${s}</button>
          `).join('')}
        </div>
      </div>

      <div class="mode-section">
        <div class="section-label">Mode</div>
        <div class="mode-btns">
          ${['manual','auto','sleep','pet'].map(m => {
            const mc2 = MODE_COLORS[m];
            const isActive = m === mode && isOn;
            return `<button class="mode-btn" data-mode="${m}"
              style="${isActive ? `background:${mc2.active};border-color:${mc2.border};color:${mc2.text}` : ''}"
            >${m}</button>`;
          }).join('')}
        </div>
      </div>

      <hr class="divider">

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">PM2.5</div>
          <div><span class="metric-value">${pm25}</span><span class="metric-unit"> µg/m³</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">Filter life</div>
          <div><span class="metric-value">${filterLife}</span><span class="metric-unit">%</span></div>
        </div>
        <div class="metric" style="border-color:${aqC.border};background:${aqC.bg}">
          <div class="metric-label">AQ level</div>
          <div>
            <span class="aq-dot" style="background:${aqC.dot}"></span>
            <span class="metric-value" style="color:${aqC.dot}">${aqLevel}</span>
            <span class="metric-unit" style="color:${aqC.dot}"> ${aqC.label}</span>
          </div>
        </div>
      </div>

      <div class="toggles">
        <div class="toggle-item">
          <span class="toggle-label">Display</span>
          <div class="toggle-switch ${displayOn ? 'on' : ''}" data-toggle="display"></div>
        </div>
        <div class="toggle-item">
          <span class="toggle-label">Child lock</span>
          <div class="toggle-switch ${childLockOn ? 'on' : ''}" data-toggle="child_lock"></div>
        </div>
        <div class="toggle-item">
          <span class="toggle-label">Light detect</span>
          <div class="toggle-switch ${lightOn ? 'on' : ''}" data-toggle="light_detection"></div>
        </div>
      </div>

      ${autoPrefHTML}

      <div class="poll-footer">
        <span class="poll-label" id="poll-label">${holdActive ? '⏳ Syncing…' : 'Next poll'}</span>
        <div class="poll-bar-wrap">
          <div class="poll-bar ${holdActive ? 'syncing' : ''}" id="poll-bar" style="width:0%"></div>
        </div>
        <span class="poll-countdown" id="poll-countdown">—</span>
      </div>`;

    this._attachListeners(isOn, mode);
    this._startPollTimer(pollInterval, sinceLastPoll, holdActive, holdExpiresIn);
  }

  _startPollTimer(interval, sinceLastPoll, holdActive, holdExpiresIn) {
    this._clearTimer();

    // Snapshot values so the closure stays accurate
    const startedAt = Date.now();
    const initialRemaining = sinceLastPoll != null
      ? Math.max(0, interval - sinceLastPoll)
      : interval;

    const bar        = this.shadowRoot.getElementById('poll-bar');
    const countdown  = this.shadowRoot.getElementById('poll-countdown');
    const label      = this.shadowRoot.getElementById('poll-label');
    if (!bar || !countdown) return;

    const tick = () => {
      const elapsed  = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, initialRemaining - elapsed);
      const fraction  = 1 - (remaining / interval);

      if (holdActive) {
        const holdLeft = Math.max(0, holdExpiresIn - elapsed);
        label.textContent    = '⏳ Syncing…';
        bar.className        = 'poll-bar syncing';
        bar.style.width      = `${Math.min(100, (1 - holdLeft / 180) * 100).toFixed(1)}%`;
        countdown.textContent = holdLeft > 0 ? `${Math.round(holdLeft)}s` : '—';
      } else {
        label.textContent    = 'Next poll';
        bar.className        = 'poll-bar';
        bar.style.width      = `${(fraction * 100).toFixed(1)}%`;
        countdown.textContent = `${Math.round(remaining)}s`;
      }
    };

    tick();
    this._pollTimer = setInterval(tick, 1000);
  }

  _attachListeners(isOn, mode) {
    const cfg = this._config;
    const fan = cfg.fan_entity;

    this._root.querySelector('#power-btn')?.addEventListener('click', () => {
      this._callService('fan', isOn ? 'turn_off' : 'turn_on', { entity_id: fan });
    });

    this._root.querySelectorAll('.speed-btn').forEach(b => b.addEventListener('click', () => {
      this._callService('fan', 'set_percentage', { entity_id: fan, percentage: parseInt(b.dataset.speed) * 25 });
    }));

    this._root.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
      if (!isOn) this._callService('fan', 'turn_on', { entity_id: fan });
      this._callService('fan', 'set_preset_mode', { entity_id: fan, preset_mode: b.dataset.mode });
    }));

    this._root.querySelectorAll('.toggle-switch').forEach(sw => sw.addEventListener('click', () => {
      const map = { display: cfg.display_entity, child_lock: cfg.child_lock_entity, light_detection: cfg.light_detect_entity };
      const id  = map[sw.dataset.toggle];
      if (id) this._callService('switch', sw.classList.contains('on') ? 'turn_off' : 'turn_on', { entity_id: id });
    }));

    this._root.querySelectorAll('[data-pref]').forEach(b => b.addEventListener('click', () => {
      if (cfg.auto_pref_entity) {
        this._callService('select', 'select_option', { entity_id: cfg.auto_pref_entity, option: b.dataset.pref });
      }
    }));
  }
}

customElements.define('levoit-vital200s-card', LevoitVital200SCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'levoit-vital200s-card',
  name: 'Levoit Vital 200S',
  description: 'Compact control card for the Levoit Vital 200S air purifier',
  preview: false,
});