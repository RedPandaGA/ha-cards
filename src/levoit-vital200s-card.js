/**
 * Levoit Vital 200S — Custom Lovelace Card v3
 *
 *   type: custom:levoit-vital200s-card
 *   fan_entity: fan.cat_room
 *   pm25_entity: sensor.cat_room_pm2_5
 *   filter_entity: sensor.cat_room_filter_life
 *   aq_entity: sensor.cat_room_air_quality
 *   display_entity: switch.cat_room_display
 *   child_lock_entity: switch.cat_room_child_lock
 *   light_detect_entity: switch.cat_room_light_detection
 *   auto_pref_entity: select.cat_room_auto_preference
 */

const AQ_LEVEL_COLORS = {
  1: { dot: '#22c55e', label: 'Excellent', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)'  },
  2: { dot: '#84cc16', label: 'Good',      bg: 'rgba(132,204,22,0.12)', border: 'rgba(132,204,22,0.35)' },
  3: { dot: '#eab308', label: 'Moderate',  bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)'  },
  4: { dot: '#f97316', label: 'Poor',      bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
  5: { dot: '#ef4444', label: 'Very Poor', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)'  },
};

const MODE_COLORS = {
  manual: { a: 'rgba(56,189,248,0.18)',  b: '#38bdf8', t: '#7dd3fc' },
  auto:   { a: 'rgba(74,222,128,0.18)',  b: '#4ade80', t: '#86efac' },
  sleep:  { a: 'rgba(167,139,250,0.18)', b: '#a78bfa', t: '#c4b5fd' },
  pet:    { a: 'rgba(251,191,36,0.18)',  b: '#fbbf24', t: '#fcd34d' },
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :host{display:block;font-family:var(--primary-font-family,sans-serif)}
  ha-card{padding:9px 12px 8px}

  .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .nm{font-size:14px;font-weight:600;color:var(--primary-text-color)}

  .pwr{width:24px;height:24px;border-radius:50%;border:1px solid var(--divider-color);
    background:transparent;cursor:pointer;display:flex;align-items:center;
    justify-content:center;color:var(--secondary-text-color);transition:all .15s;flex-shrink:0}
  .pwr:hover{background:var(--secondary-background-color)}
  .pwr.on{background:rgba(34,197,94,.15);border-color:#22c55e;color:#22c55e}
  .pwr svg{width:11px;height:11px}

  .sl{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
    color:var(--secondary-text-color);margin-bottom:3px}

  .spd-hdr{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:3px}
  .spd-n{font-size:15px;font-weight:600;color:var(--primary-text-color)}
  .spd-m{font-size:10px;color:var(--secondary-text-color)}

  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px}
  .sb{padding:4px 0;border:1px solid var(--divider-color);border-radius:5px;
    background:transparent;cursor:pointer;font-size:12px;font-weight:500;
    color:var(--secondary-text-color);transition:all .12s;text-align:center}
  .sb:hover{background:var(--secondary-background-color)}
  .sb.on{background:rgba(56,189,248,.18);border-color:#38bdf8;color:#7dd3fc}
  .mb{padding:4px 0;border:1px solid var(--divider-color);border-radius:5px;
    background:transparent;cursor:pointer;font-size:11px;
    color:var(--secondary-text-color);text-align:center;transition:all .12s;text-transform:capitalize}
  .mb:hover{background:var(--secondary-background-color)}

  .div{border:none;border-top:1px solid var(--divider-color);margin:5px 0}

  .mets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:5px}
  .met{background:var(--secondary-background-color);border-radius:6px;
    padding:5px 7px;border:1px solid transparent}
  .ml{font-size:9px;color:var(--secondary-text-color);margin-bottom:1px}
  .mv{font-size:15px;font-weight:600;color:var(--primary-text-color);line-height:1.1}
  .mu{font-size:9px;color:var(--secondary-text-color)}
  .dot{display:inline-block;width:7px;height:7px;border-radius:50%;
    margin-right:3px;vertical-align:middle;flex-shrink:0}

  .togs{display:flex;gap:4px;margin-bottom:5px}
  .tog{flex:1;display:flex;align-items:center;justify-content:space-between;
    background:var(--secondary-background-color);border-radius:6px;padding:5px 7px}
  .tl{font-size:10px;color:var(--secondary-text-color)}
  .ts{width:26px;height:14px;background:var(--divider-color);border-radius:7px;
    position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
  .ts::after{content:'';position:absolute;width:9px;height:9px;background:white;
    border-radius:50%;top:2.5px;left:2.5px;transition:transform .2s}
  .ts.on{background:#38bdf8}
  .ts.on::after{transform:translateX(12px)}

  .pf{display:flex;align-items:center;gap:5px}
  .pl{font-size:9px;color:var(--secondary-text-color);white-space:nowrap}
  .pbw{flex:1;height:3px;background:var(--divider-color);border-radius:2px;overflow:hidden}
  .pb{height:100%;border-radius:2px;background:#38bdf8;transition:width 1s linear}
  .pb.sy{background:#a78bfa}
  .pc{font-size:9px;color:var(--secondary-text-color);min-width:24px;text-align:right}

  .dim{opacity:.35;pointer-events:none}
  .na{text-align:center;padding:16px;color:var(--secondary-text-color);font-size:13px}
`;

class LevoitVital200SCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._pollTimer = null;
  }

  setConfig(config) {
    if (!config.fan_entity) throw new Error('fan_entity is required');
    this._config = config;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div id="r"></div></ha-card>`;
    this._r = this.shadowRoot.getElementById('r');
  }

  set hass(hass) { this._hass = hass; this._update(); }
  disconnectedCallback() { this._clearTimer(); }
  getCardSize() { return 3; }
  static getStubConfig() { return { fan_entity: 'fan.air_purifier' }; }

  _svc(d, s, data) { this._hass.callService(d, s, data); }
  _st(id) { return (id && this._hass) ? (this._hass.states[id] || null) : null; }
  _clearTimer() { if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; } }

  _update() {
    if (!this._hass || !this._config.fan_entity) return;
    const fs = this._st(this._config.fan_entity);
    if (!fs) { this._r.innerHTML = `<div class="na">Entity not found</div>`; return; }
    if (fs.state === 'unavailable') { this._r.innerHTML = `<div class="na">🌬 Unavailable</div>`; return; }

    const isOn  = fs.state === 'on';
    const a     = fs.attributes;
    const mode  = a.preset_mode || 'manual';
    const pct   = a.percentage || 0;
    const lvl   = pct > 0 ? Math.round(pct / 25) : (a.fan_set_level || a.fan_level || 0);
    const name  = a.friendly_name || this._config.fan_entity;
    const cfg   = this._config;

    const pm25   = (s => s ? s.state : (a.pm25 ?? '—'))(this._st(cfg.pm25_entity));
    const flife  = (s => s ? s.state : (a.filter_life ?? '—'))(this._st(cfg.filter_entity));
    const aqS    = this._st(cfg.aq_entity);
    const aqLvl  = parseInt(a.air_quality_level ?? (aqS?.attributes?.raw_level ?? 1));
    const aqC    = AQ_LEVEL_COLORS[Math.min(Math.max(aqLvl || 1, 1), 5)];

    const dispOn  = (s => s ? s.state==='on' : String(a.display)==='on')(this._st(cfg.display_entity));
    const clkOn   = (s => s ? s.state==='on' : Boolean(a.child_lock))(this._st(cfg.child_lock_entity));
    const ldOn    = (s => s ? s.state==='on' : String(a.light_detection)==='on')(this._st(cfg.light_detect_entity));

    const pollInt  = a.poll_interval_seconds || 90;
    const since    = a.seconds_since_last_poll;
    const holdOn   = Boolean(a.optimistic_hold_active);
    const holdExp  = a.optimistic_hold_expires_in || 0;

    const dim = !isOn || mode !== 'manual';

    this._r.innerHTML = `
      <div class="hdr">
        <span class="nm">${name}</span>
        <button class="pwr ${isOn?'on':''}" id="pwr">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </button>
      </div>

      <div class="${dim?'dim':''}">
        <div class="spd-hdr">
          <span class="sl">Fan speed</span>
          <span class="spd-n">${isOn&&mode==='manual'?(lvl||'—'):'—'}<span class="spd-m"> / 4</span></span>
        </div>
        <div class="g4">
          ${[1,2,3,4].map(s=>`<button class="sb ${lvl===s&&isOn&&mode==='manual'?'on':''}" data-speed="${s}">${s}</button>`).join('')}
        </div>
      </div>

      <div class="sl">Mode</div>
      <div class="g4">
        ${['manual','auto','sleep','pet'].map(m=>{
          const mc=MODE_COLORS[m], act=m===mode&&isOn;
          return `<button class="mb" data-mode="${m}"
            style="${act?`background:${mc.a};border-color:${mc.b};color:${mc.t}`:''}">${m}</button>`;
        }).join('')}
      </div>

      <hr class="div">

      <div class="mets">
        <div class="met">
          <div class="ml">PM2.5</div>
          <div><span class="mv">${pm25}</span><span class="mu"> µg/m³</span></div>
        </div>
        <div class="met">
          <div class="ml">Filter life</div>
          <div><span class="mv">${flife}</span><span class="mu">%</span></div>
        </div>
        <div class="met" style="border-color:${aqC.border};background:${aqC.bg}">
          <div class="ml">AQ level</div>
          <div style="display:flex;align-items:center">
            <span class="dot" style="background:${aqC.dot}"></span>
            <span class="mv" style="color:${aqC.dot}">${aqLvl}</span>
            <span class="mu" style="color:${aqC.dot};margin-left:3px">${aqC.label}</span>
          </div>
        </div>
      </div>

      <div class="togs">
        <div class="tog"><span class="tl">Display</span>
          <div class="ts ${dispOn?'on':''}" data-toggle="display"></div></div>
        <div class="tog"><span class="tl">Child lock</span>
          <div class="ts ${clkOn?'on':''}" data-toggle="child_lock"></div></div>
        <div class="tog"><span class="tl">Light detect</span>
          <div class="ts ${ldOn?'on':''}" data-toggle="light_detection"></div></div>
      </div>

      <div class="pf">
        <span class="pl" id="pl">${holdOn?'⏳ Syncing':'Next poll'}</span>
        <div class="pbw"><div class="pb ${holdOn?'sy':''}" id="pb" style="width:0%"></div></div>
        <span class="pc" id="pc">—</span>
      </div>`;

    this._bind(isOn);
    this._timer(pollInt, since, holdOn, holdExp);
  }

  _timer(interval, since, holdOn, holdExp) {
    this._clearTimer();
    const t0  = Date.now();
    const rem0 = since != null ? Math.max(0, interval - since) : interval;
    const pb   = this.shadowRoot.getElementById('pb');
    const pc   = this.shadowRoot.getElementById('pc');
    const pl   = this.shadowRoot.getElementById('pl');
    if (!pb || !pc) return;
    const tick = () => {
      const el = (Date.now() - t0) / 1000;
      if (holdOn) {
        const left = Math.max(0, holdExp - el);
        pl.textContent = '⏳ Syncing';
        pb.className   = 'pb sy';
        pb.style.width = `${Math.min(100,(1-left/180)*100).toFixed(1)}%`;
        pc.textContent = left > 0 ? `${Math.round(left)}s` : '—';
      } else {
        const rem = Math.max(0, rem0 - el);
        pl.textContent = 'Next poll';
        pb.className   = 'pb';
        pb.style.width = `${((1-rem/interval)*100).toFixed(1)}%`;
        pc.textContent = `${Math.round(rem)}s`;
      }
    };
    tick();
    this._pollTimer = setInterval(tick, 1000);
  }

  _bind(isOn) {
    const cfg = this._config, fan = cfg.fan_entity;
    this._r.querySelector('#pwr')?.addEventListener('click', () =>
      this._svc('fan', isOn ? 'turn_off' : 'turn_on', { entity_id: fan }));
    this._r.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () =>
      this._svc('fan', 'set_percentage', { entity_id: fan, percentage: parseInt(b.dataset.speed) * 25 })));
    this._r.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      if (!isOn) this._svc('fan', 'turn_on', { entity_id: fan });
      this._svc('fan', 'set_preset_mode', { entity_id: fan, preset_mode: b.dataset.mode });
    }));
    this._r.querySelectorAll('[data-toggle]').forEach(sw => sw.addEventListener('click', () => {
      const map = { display: cfg.display_entity, child_lock: cfg.child_lock_entity, light_detection: cfg.light_detect_entity };
      const id = map[sw.dataset.toggle];
      if (id) this._svc('switch', sw.classList.contains('on') ? 'turn_off' : 'turn_on', { entity_id: id });
    }));
  }
}

customElements.define('levoit-vital200s-card', LevoitVital200SCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'levoit-vital200s-card', name: 'Levoit Vital 200S', description: 'Compact control card for the Levoit Vital 200S air purifier' });