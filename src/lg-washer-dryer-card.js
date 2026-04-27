// lg-washer-dryer-card.js — v2.3.1
/**
 * LG Washer/Dryer — Custom Lovelace Card
 *
 * Displays real-time status for LG washer/dryer appliances integrated via
 * the ha-smartthinq-sensors HACS integration. Tracks run phase, cycle progress,
 * remaining time, tub-clean counter, door lock, remote start, error state,
 * and a colour-coded history bar for the current/most recent cycle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALLATION
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Copy this file to  /config/www/lg-washer-dryer-card.js
 * 2. In HA: Settings → Dashboards → ⋮ → Resources → Add resource
 *    URL:  /local/lg-washer-dryer-card.js?v=230    Type: JavaScript module
 *    (bump ?v= each time you update the file to bust HA's cache)
 * 3. Add a card to your dashboard (YAML mode) — see examples below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY TWO ENTITIES?
 * ─────────────────────────────────────────────────────────────────────────────
 * ha-smartthinq-sensors can expose two sensors for a combo unit:
 *
 *   entity: sensor.washer_combo
 *     Its ATTRIBUTES hold all useful data (time remaining, temp, cycle,
 *     spin speed, dry level, tub count, door lock, remote start, errors).
 *     Its STATE is a generic power state ("on"/"off") — not the wash phase.
 *
 *   run_state_entity: sensor.washer_run_state   (optional but recommended)
 *     Its STATE is the actual wash phase: "Washing", "Spinning", "Drying" …
 *     Used for ring colour, pill, and the history bar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENTITIES USED BY THIS CARD
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PRIMARY (required):
 *   entity: sensor.washer_combo
 *     Source of all appliance ATTRIBUTES.
 *
 *     Attributes read:
 *       current_course   – Active wash program       e.g. "Cotton", "Bedding"
 *       water_temp       – Water temperature          e.g. "Cold", "30°C"
 *       spin_speed       – Spin speed setting         e.g. "High", "800 rpm"
 *       dry_level        – Dryer heat level           e.g. "Medium"
 *       remain_time      – Remaining time             e.g. "0:32:00"
 *       initial_time     – Total cycle time           e.g. "1:05:00"
 *       tubclean_count   – Cycles since tub clean     e.g. 12
 *       run_completed    – Boolean: cycle done
 *       door_lock        – Boolean: door locked
 *       remote_start     – Boolean: remote start on
 *       error_state      – Boolean: error present
 *       error_message    – String: error description
 *
 * RUN STATE (optional but recommended for combo units):
 *   run_state_entity: sensor.washer_run_state
 *     Sensor whose STATE is the current wash phase. Also the source for
 *     the cycle history bar.
 *
 *     Known state values → ring colours:
 *       "Standby" / "-"      → grey    (idle — excluded from history bar)
 *       "Sensing Load"       → indigo
 *       "Washing"            → blue
 *       "Rinsing"            → cyan
 *       "Draining"           → blue
 *       "Spinning"           → purple
 *       "Steam"              → indigo
 *       "Drying"             → orange
 *       "Cooling"            → cyan
 *       "Cycle Finished"     → green
 *       (error flag active)  → red
 *
 * AUTO-DERIVED BINARY SENSORS (fallback when attributes are absent):
 *   Built from entity: prefix. Example: sensor.washer_combo →
 *     binary_sensor.washer_combo_door_lock
 *     binary_sensor.washer_combo_remote_start
 *     binary_sensor.washer_combo_error_state
 *     binary_sensor.washer_combo_wash_completed
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURATION OPTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * type: custom:lg-washer-dryer-card
 *
 * # Required
 * entity: sensor.washer_combo
 *
 * # Optional — run state source (strongly recommended for combo units)
 * run_state_entity: sensor.washer_run_state
 *
 * # Optional — display
 * name: "Washer / Dryer"      # header title          default: "Washer / Dryer"
 * tub_max: 30                 # cycles until overdue  default: 30
 * warn_at: 25                 # warn badge threshold  default: 25
 *
 * # Optional — binary sensor overrides (fix odd entity naming)
 * door_lock_entity:      binary_sensor.washer_door_lock
 * remote_start_entity:   binary_sensor.washer_remote_start
 * error_state_entity:    binary_sensor.washer_error_state
 * wash_completed_entity: binary_sensor.washer_wash_completed
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXAMPLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Minimal (single-sensor — state IS the run phase):
 *   type: custom:lg-washer-dryer-card
 *   entity: sensor.washer_run_state
 *
 * Combo unit:
 *   type: custom:lg-washer-dryer-card
 *   entity: sensor.washer_combo
 *   run_state_entity: sensor.washer_run_state
 *   name: Laundry Room Washer
 *
 * Full with overrides:
 *   type: custom:lg-washer-dryer-card
 *   entity: sensor.lg_wm4000hba_combo
 *   run_state_entity: sensor.lg_wm4000hba_run_state
 *   name: Laundry Room Washer
 *   tub_max: 30
 *   warn_at: 25
 *   door_lock_entity:      binary_sensor.lg_wm4000hba_door_lock
 *   remote_start_entity:   binary_sensor.lg_wm4000hba_remote_start
 *   error_state_entity:    binary_sensor.lg_wm4000hba_error_state
 *   wash_completed_entity: binary_sensor.lg_wm4000hba_wash_completed
 * ─────────────────────────────────────────────────────────────────────────────
 */

class LgWasherDryerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized   = false;
    this._lastHistFetch = 0;
    this._histPending   = false;
  }

  static getStubConfig() {
    return {
      entity: 'sensor.washer_combo',
      run_state_entity: 'sensor.washer_run_state',
      name: 'Washer / Dryer',
      tub_max: 30,
      warn_at: 25,
    };
  }

  setConfig(config) {
    if (!config.entity) throw new Error(
      'lg-washer-dryer-card: Please specify an entity (e.g. sensor.washer_combo)'
    );
    this.config = { name: 'Washer / Dryer', tub_max: 30, warn_at: 25, ...config };
    if (!this._initialized) {
      this._buildDOM();
      this._initialized = true;
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._initialized) this._update();
  }

  _buildDOM() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .card {
          background: #1c1c1e;
          border-radius: 16px;
          padding: 20px;
          color: #f5f5f7;
          font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }

        /* ── Header ── */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .device-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(255,255,255,0.09);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .device-name { font-size: 15px; font-weight: 600; color: #f5f5f7; }
        .device-mode { font-size: 12px; color: #636366; margin-top: 2px; }
        .pill {
          font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
          padding: 4px 10px; border-radius: 20px; white-space: nowrap;
          background: rgba(10,132,255,0.18); color: #0a84ff;
          transition: background 0.3s, color 0.3s;
        }

        /* ── Timer ring ── */
        .timer-wrap {
          display: flex; align-items: center; justify-content: center;
          margin: 0 0 20px; position: relative;
        }
        .timer-svg { width: 128px; height: 128px; transform: rotate(-90deg); flex-shrink: 0; }
        .timer-track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 9; }
        .timer-ring {
          fill: none; stroke: #0a84ff; stroke-width: 9;
          stroke-linecap: round;
          stroke-dasharray: 339.29; stroke-dashoffset: 339.29;
          transition: stroke-dashoffset 0.8s ease, stroke 0.4s ease;
        }
        .timer-center { position: absolute; text-align: center; pointer-events: none; }
        .timer-value { font-size: 24px; font-weight: 600; color: #f5f5f7; line-height: 1; }
        .timer-unit  { font-size: 11px; color: #636366; margin-top: 5px; }

        /* ── History ── */
        .hist-wrap { margin-bottom: 14px; }
        .hist-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 7px;
        }
        .hist-title { font-size: 11px; color: #636366; }
        .hist-age   { font-size: 10px; color: #48484a; font-style: italic; }
        .hist-bar {
          display: flex; height: 10px; border-radius: 5px;
          overflow: hidden; background: rgba(255,255,255,0.07);
        }
        .hist-seg {
          height: 100%;
          flex-shrink: 0; flex-grow: 0;
          transition: opacity 0.2s, filter 0.2s; cursor: default;
        }
        .hist-seg:hover { opacity: 0.8; filter: brightness(1.2); }
        .hist-msg { font-size: 10px; color: #48484a; line-height: 10px; padding: 0 8px; align-self: center; }
        /* Legend list */
        .hist-legend { margin-top: 9px; display: flex; flex-direction: column; gap: 4px; }
        .hist-leg-row {
          display: flex; align-items: center; gap: 7px; min-height: 16px;
        }
        .hist-leg-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        }
        .hist-leg-state {
          font-size: 10px; font-weight: 600; color: #f5f5f7; flex: 1;
        }
        .hist-leg-time { font-size: 10px; color: #636366; white-space: nowrap; }
        .hist-leg-dur  { font-size: 10px; color: #48484a;  white-space: nowrap; min-width: 42px; text-align: right; }
        .hist-no-cycle {
          font-size: 10px; color: #48484a; padding: 6px 0;
          display: block; text-align: center;
        }

        /* ── Chips ── */
        .chips {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; margin-bottom: 14px;
        }
        .chip {
          background: rgba(255,255,255,0.07); border-radius: 10px;
          padding: 10px 6px; text-align: center;
        }
        .chip-icon  { font-size: 15px; margin-bottom: 4px; }
        .chip-label { font-size: 9px; color: #636366; text-transform: uppercase; letter-spacing: 0.04em; }
        .chip-value { font-size: 13px; font-weight: 600; color: #f5f5f7; margin-top: 2px; }

        /* ── Tub clean ── */
        .tub { margin-bottom: 14px; }
        .tub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
        .tub-title  { font-size: 11px; color: #636366; }
        .tub-right  { display: flex; align-items: center; gap: 6px; }
        .tub-count  { font-size: 12px; font-weight: 600; color: #34c759; transition: color 0.4s; }
        .tub-badge  {
          font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px;
          background: rgba(255,69,58,0.2); color: #ff453a; display: none;
        }
        .tub-badge.show { display: inline-block; }
        .tub-track { height: 6px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
        .tub-fill  {
          height: 100%; width: 0%; border-radius: 3px; background: #34c759;
          transition: width 0.7s ease, background 0.4s ease;
        }
        .tub-sub { font-size: 10px; color: #48484a; margin-top: 5px; text-align: right; }

        /* ── Divider ── */
        .divider { height: 1px; background: rgba(255,255,255,0.07); margin-bottom: 14px; }

        /* ── Status row ── */
        .status { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .status-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .status-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; background: rgba(255,255,255,0.06);
          opacity: 0.3; transition: opacity 0.25s, background 0.25s;
        }
        .status-icon.on         { opacity: 1; }
        .status-icon.on.green   { background: rgba(52,199,89,0.18); }
        .status-icon.on.blue    { background: rgba(10,132,255,0.18); }
        .status-icon.on.red     { background: rgba(255,69,58,0.18); }
        .status-label { font-size: 10px; color: #636366; text-align: center; }

        /* ── Banners ── */
        .banner {
          margin-top: 14px; padding: 12px 14px; border-radius: 10px;
          font-size: 13px; line-height: 1.5; display: none;
        }
        .banner.show { display: block; }
        .banner-title { font-weight: 600; margin-bottom: 3px; }
        .banner-body  { font-size: 12px; opacity: 0.85; }
        .banner-done  { background: rgba(52,199,89,0.15);  border: 1px solid rgba(52,199,89,0.3);  color: #34c759; }
        .banner-error { background: rgba(255,69,58,0.15);  border: 1px solid rgba(255,69,58,0.3);  color: #ff453a; }
        .banner-tub   { background: rgba(255,159,10,0.15); border: 1px solid rgba(255,159,10,0.3); color: #ff9f0a; }
      </style>

      <div class="card">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="device-icon">🫧</div>
            <div>
              <div class="device-name" id="devName">Washer / Dryer</div>
              <div class="device-mode" id="devMode">—</div>
            </div>
          </div>
          <div class="pill" id="pill">—</div>
        </div>

        <!-- Timer ring -->
        <div class="timer-wrap">
          <svg class="timer-svg" viewBox="0 0 120 120">
            <circle class="timer-track" cx="60" cy="60" r="54"/>
            <circle class="timer-ring" id="ring" cx="60" cy="60" r="54"/>
          </svg>
          <div class="timer-center">
            <div class="timer-value" id="timeVal">—</div>
            <div class="timer-unit"  id="timeUnit">remaining</div>
          </div>
        </div>

        <!-- Cycle history bar (current/most-recent run only) -->
        <div class="hist-wrap">
          <div class="hist-header">
            <span class="hist-title">Last Cycle</span>
            <span class="hist-age" id="histAge"></span>
          </div>
          <div class="hist-bar" id="histBar">
            <span class="hist-msg">Loading…</span>
          </div>
          <div class="hist-legend" id="histLegend"></div>
        </div>

        <!-- Chips -->
        <div class="chips">
          <div class="chip">
            <div class="chip-icon">🔄</div>
            <div class="chip-label">Cycle</div>
            <div class="chip-value" id="chipCycle">—</div>
          </div>
          <div class="chip">
            <div class="chip-icon">🌡</div>
            <div class="chip-label">Temp</div>
            <div class="chip-value" id="chipTemp">—</div>
          </div>
          <div class="chip">
            <div class="chip-icon"  id="chip3icon">💨</div>
            <div class="chip-label" id="chip3label">Spin</div>
            <div class="chip-value" id="chip3val">—</div>
          </div>
        </div>

        <!-- Tub clean -->
        <div class="tub">
          <div class="tub-header">
            <div class="tub-title">🧺 Tub Clean Counter</div>
            <div class="tub-right">
              <span class="tub-count" id="tubCount">— / 30</span>
              <span class="tub-badge" id="tubBadge">Clean Soon!</span>
            </div>
          </div>
          <div class="tub-track"><div class="tub-fill" id="tubFill"></div></div>
          <div class="tub-sub" id="tubSub"></div>
        </div>

        <div class="divider"></div>

        <!-- Status row -->
        <div class="status">
          <div class="status-item">
            <div class="status-icon green" id="siDone">✅</div>
            <div class="status-label">Done</div>
          </div>
          <div class="status-item">
            <div class="status-icon blue" id="siDoor">🔒</div>
            <div class="status-label">Door Lock</div>
          </div>
          <div class="status-item">
            <div class="status-icon blue" id="siRemote">📡</div>
            <div class="status-label">Remote</div>
          </div>
          <div class="status-item">
            <div class="status-icon red" id="siError">⚠</div>
            <div class="status-label">Error</div>
          </div>
        </div>

        <!-- Banners -->
        <div class="banner banner-done" id="bannerDone">
          <div class="banner-title">✅ Cycle Complete!</div>
          <div class="banner-body">Your laundry is ready — don't forget to transfer it!</div>
        </div>
        <div class="banner banner-error" id="bannerError">
          <div class="banner-title">⚠ Error Detected</div>
          <div class="banner-body" id="bannerErrorMsg">Check your washer for details.</div>
        </div>
        <div class="banner banner-tub" id="bannerTub">
          <div class="banner-title">🧺 Tub Clean Recommended</div>
          <div class="banner-body" id="bannerTubMsg">Run a Tub Clean cycle soon to keep your washer fresh.</div>
        </div>
      </div>
    `;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  _$ = (id) => this.shadowRoot.getElementById(id);

  _isTruthy(val) {
    if (val === undefined || val === null) return false;
    if (typeof val === 'boolean') return val;
    const s = String(val).toLowerCase().trim();
    return s === 'true' || s === 'on' || s === '1' || s === 'yes';
  }

  _parseMinutes(t) {
    if (!t) return 0;
    const s = String(t).trim();
    const parts = s.split(':');
    if (parts.length >= 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    return parseInt(s) || 0;
  }

  _formatTime(t) {
    if (!t) return '—';
    const s = String(t).trim();
    if (!s || s === '0' || s === '0:00' || s === '0:00:00') return '—';
    const parts = s.split(':');
    if (parts.length === 3) return parts[0] + ':' + parts[1];
    if (parts.length === 2) return s;
    const n = parseInt(s);
    return isNaN(n) ? s : n + ' min';
  }

  _setStatus(el, on, colorClass) {
    el.className = 'status-icon' + (on ? ` on ${colorClass}` : ` ${colorClass}`);
  }

  /** Returns { ring, bg, fg } colour theme for a given lower-cased run-state string. */
  _getTheme(suLower, isError, isDone) {
    if (isError) return { ring: '#ff453a', bg: 'rgba(255,69,58,0.18)',   fg: '#ff453a' };
    if (isDone)  return { ring: '#34c759', bg: 'rgba(52,199,89,0.18)',   fg: '#34c759' };

    const MAP = {
      'standby':        { ring: '#3a3a3c', bg: 'rgba(142,142,147,0.18)', fg: '#8e8e93' },
      'off':            { ring: '#3a3a3c', bg: 'rgba(142,142,147,0.18)', fg: '#8e8e93' },
      'idle':           { ring: '#3a3a3c', bg: 'rgba(142,142,147,0.18)', fg: '#8e8e93' },
      'unavailable':    { ring: '#3a3a3c', bg: 'rgba(142,142,147,0.18)', fg: '#8e8e93' },
      'unknown':        { ring: '#3a3a3c', bg: 'rgba(142,142,147,0.18)', fg: '#8e8e93' },
      '-':              { ring: '#3a3a3c', bg: 'rgba(142,142,147,0.18)', fg: '#8e8e93' },
      'sensing load':   { ring: '#5e5ce6', bg: 'rgba(94,92,230,0.18)',   fg: '#5e5ce6' },
      'sensing':        { ring: '#5e5ce6', bg: 'rgba(94,92,230,0.18)',   fg: '#5e5ce6' },
      'washing':        { ring: '#0a84ff', bg: 'rgba(10,132,255,0.18)',  fg: '#0a84ff' },
      'rinsing':        { ring: '#32ade6', bg: 'rgba(50,173,230,0.18)',  fg: '#32ade6' },
      'draining':       { ring: '#0a84ff', bg: 'rgba(10,132,255,0.18)', fg: '#0a84ff' },
      'spinning':       { ring: '#bf5af2', bg: 'rgba(191,90,242,0.18)', fg: '#bf5af2' },
      'steam':          { ring: '#5e5ce6', bg: 'rgba(94,92,230,0.18)',   fg: '#5e5ce6' },
      'drying':         { ring: '#ff9f0a', bg: 'rgba(255,159,10,0.18)', fg: '#ff9f0a' },
      'cooling':        { ring: '#32ade6', bg: 'rgba(50,173,230,0.18)', fg: '#32ade6' },
      'cool down':      { ring: '#32ade6', bg: 'rgba(50,173,230,0.18)', fg: '#32ade6' },
      'cycle finished': { ring: '#34c759', bg: 'rgba(52,199,89,0.18)',  fg: '#34c759' },
      'end':            { ring: '#34c759', bg: 'rgba(52,199,89,0.18)',  fg: '#34c759' },
      'finished':       { ring: '#34c759', bg: 'rgba(52,199,89,0.18)',  fg: '#34c759' },
      'complete':       { ring: '#34c759', bg: 'rgba(52,199,89,0.18)',  fg: '#34c759' },
    };

    if (MAP[suLower]) return MAP[suLower];
    if (suLower.includes('spin'))   return MAP['spinning'];
    if (suLower.includes('rins'))   return MAP['rinsing'];
    if (suLower.includes('drain'))  return MAP['draining'];
    if (suLower.includes('dry'))    return MAP['drying'];
    if (suLower.includes('cool'))   return MAP['cooling'];
    if (suLower.includes('steam'))  return MAP['steam'];
    if (suLower.includes('sens'))   return MAP['sensing load'];
    if (suLower.includes('wash'))   return MAP['washing'];
    if (suLower.includes('end') || suLower.includes('finish') || suLower.includes('complet'))
                                    return MAP['cycle finished'];
    return { ring: '#0a84ff', bg: 'rgba(10,132,255,0.18)', fg: '#0a84ff' };
  }

  // ── History ──────────────────────────────────────────────────────────────────

  /** True for states that represent machine-is-idle (not part of a cycle). */
  _isIdleState(s) {
    const sl = String(s).toLowerCase().trim();
    return ['standby', 'off', 'idle', 'unavailable', 'unknown', '-', ''].includes(sl);
  }

  _maybeRefreshHistory(isIdle) {
    if (this._histPending) return;
    const pollMs  = isIdle ? 5 * 60 * 1000 : 30 * 1000;
    if ((Date.now() - this._lastHistFetch) < pollMs) return;
    this._lastHistFetch = Date.now();
    this._histPending   = true;
    this._fetchHistory().finally(() => { this._histPending = false; });
  }

  async _fetchHistory() {
    const entityId = this.config.run_state_entity || this.config.entity;
    // Always fetch the last 24 h — we'll slice to the current run client-side
    const now   = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let states  = null;

    // Try WebSocket API (HA 2022.6+) then fall back to REST
    try {
      const result = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time:   now.toISOString(),
        entity_ids: [entityId],
        no_attributes: true,
        significant_changes_only: false,
        minimal_response: true,
      });
      const raw = result[entityId] || [];
      states = raw.map(r => ({
        state: String(r.s !== undefined ? r.s : (r.state || '')),
        time:  LgWasherDryerCard._parseHistTime(r),
      }));
    } catch (_) {
      try {
        const path = `history/period/${start.toISOString()}` +
          `?filter_entity_id=${entityId}` +
          `&end_time=${now.toISOString()}` +
          `&no_attributes=true&minimal_response=true&significant_changes_only=false`;
        const result = await this._hass.callApi('GET', path);
        const raw = (Array.isArray(result) && result[0]) ? result[0] : [];
        states = raw.map(r => ({
          state: String(r.s !== undefined ? r.s : (r.state || '')),
          time:  LgWasherDryerCard._parseHistTime(r),
        }));
      } catch (_2) { /* leave states = null */ }
    }

    this._renderHistory(states, now);
  }

  /**
   * Parse a state-history record's timestamp robustly.
   * Handles WS minimal_response (lc as epoch float), WS standard (lc as ISO
   * string), REST minimal_response (lc as ISO string), and REST standard
   * (last_changed as ISO string). Falls back through lu then last_updated.
   */
  static _parseHistTime(r) {
    // Prefer lc (last_changed), then lu (last_updated), then last_changed key
    const raw = r.lc !== undefined ? r.lc
              : r.lu !== undefined ? r.lu
              : r.last_changed     !== undefined ? r.last_changed
              : r.last_updated     !== undefined ? r.last_updated
              : null;
    if (raw === null) return new Date(0);
    // Numeric → epoch seconds (WS minimal_response)
    if (typeof raw === 'number') return new Date(raw * 1000);
    // String → ISO 8601 (REST or WS non-minimal)
    return new Date(raw);
  }

  _renderHistory(states, now) {
    const bar      = this._$('histBar');
    const legend   = this._$('histLegend');
    const ageEl    = this._$('histAge');
    if (!bar) return;

    const GREY_BAR    = `<div class="hist-seg" style="flex:1;background:#3a3a3c"></div>`;
    const NO_CYCLE_LE = `<span class="hist-no-cycle">No cycle in the last day</span>`;

    // ── Error / empty state ──
    if (!states) {
      bar.innerHTML    = GREY_BAR;
      if (legend) legend.innerHTML = `<span class="hist-no-cycle">History unavailable</span>`;
      if (ageEl)  ageEl.textContent = '';
      return;
    }

    // Sort ascending
    states.sort((a, b) => a.time - b.time);

    // ── Find the most recent run ─────────────────────────────────────────────
    // Walk backwards to find the last non-idle state (end of most recent run)
    let runEndIdx = -1;
    for (let i = states.length - 1; i >= 0; i--) {
      if (!this._isIdleState(states[i].state)) { runEndIdx = i; break; }
    }

    if (runEndIdx === -1) {
      // No active state in history at all
      bar.innerHTML = GREY_BAR;
      if (legend) legend.innerHTML = NO_CYCLE_LE;
      if (ageEl)  ageEl.textContent = '';
      return;
    }

    // Walk backwards from runEndIdx until we hit an idle state → that marks run start
    let runStartIdx = runEndIdx;
    for (let i = runEndIdx - 1; i >= 0; i--) {
      if (this._isIdleState(states[i].state)) break;
      runStartIdx = i;
    }

    const runStates = states.slice(runStartIdx, runEndIdx + 1);

    // Determine when the run ended:
    //   - If the state AFTER runEndIdx is idle → it ended when that idle state started
    //   - If there's nothing after → still in progress (ended = now)
    const afterIdx  = runEndIdx + 1;
    const runEndTime = (afterIdx < states.length && this._isIdleState(states[afterIdx].state))
      ? states[afterIdx].time
      : now;

    const runStartTime = runStates[0].time;
    const isOngoing    = runEndTime >= new Date(now.getTime() - 60 * 1000); // within 1 min of now

    // ── 24-hour cutoff ───────────────────────────────────────────────────────
    // If the run ENDED (not ongoing) more than 24 h ago → grey out
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (!isOngoing && runEndTime < cutoff24h) {
      bar.innerHTML = GREY_BAR;
      if (legend) legend.innerHTML = NO_CYCLE_LE;
      if (ageEl)  ageEl.textContent = '';
      return;
    }

    // ── Build proportional segments ──────────────────────────────────────────
    const segs = [];
    for (let i = 0; i < runStates.length; i++) {
      const segStart = runStates[i].time;
      const segEnd   = i < runStates.length - 1 ? runStates[i + 1].time : runEndTime;
      const ms       = segEnd - segStart;
      if (ms <= 0) continue;

      const sl     = runStates[i].state.toLowerCase();
      const isDone = sl === 'cycle finished' || sl.includes('finish') ||
                     sl.includes('complet')  || sl.includes('end');
      const theme  = this._getTheme(sl, false, isDone);

      segs.push({
        ms,
        color:     theme.ring,
        state:     runStates[i].state,
        startTime: segStart,
        endTime:   segEnd,
        isLast:    i === runStates.length - 1,
      });
    }

    // Render bar
    if (segs.length) {
      const totalMs = segs.reduce((sum, s) => sum + s.ms, 0);
      bar.innerHTML = segs.map(s => {
        const pct = totalMs > 0 ? (s.ms / totalMs * 100).toFixed(4) : 0;
        return `<div class="hist-seg"
                     style="flex-basis:${pct}%;background:${s.color}"
                     title="${s.state}"></div>`;
      }).join('');
    } else {
      bar.innerHTML = GREY_BAR;
    }

    // ── Render legend ────────────────────────────────────────────────────────
    if (legend) {
      const fmtTimestamp = (d) => {
        // Show full date if the date differs from today
        const today = new Date();
        const sameDay = d.getFullYear() === today.getFullYear() &&
                        d.getMonth()    === today.getMonth()    &&
                        d.getDate()     === today.getDate();
        if (sameDay) {
          return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
               d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      };

      const fmtDuration = (ms) => {
        const s   = Math.round(ms / 1000);
        const h   = Math.floor(s / 3600);
        const m   = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m${sec > 0 ? ' ' + sec + 's' : ''}`;
        return `${sec}s`;
      };

      legend.innerHTML = segs.map(s => {
        const durText = (s.isLast && isOngoing)
          ? '<span class="hist-leg-dur" style="color:#636366">now</span>'
          : `<span class="hist-leg-dur">${fmtDuration(s.ms)}</span>`;

        return `
          <div class="hist-leg-row">
            <span class="hist-leg-dot"   style="background:${s.color}"></span>
            <span class="hist-leg-state">${s.state}</span>
            <span class="hist-leg-time">${fmtTimestamp(s.startTime)}</span>
            ${durText}
          </div>`;
      }).join('');
    }

    // ── Age stamp in header ──────────────────────────────────────────────────
    if (ageEl) {
      if (isOngoing) {
        ageEl.textContent = 'in progress';
      } else {
        const ms    = now - runEndTime;
        const mins  = Math.floor(ms / 60000);
        const hours = Math.floor(mins / 60);
        ageEl.textContent = hours > 0
          ? `ended ${hours}h ${mins % 60}m ago`
          : mins > 0
            ? `ended ${mins}m ago`
            : 'ended just now';
      }
    }
  }

  // ── Main update ─────────────────────────────────────────────────────────────
  _update() {
    const hass = this._hass;

    const attrEntity  = hass.states[this.config.entity];
    const stateEntity = this.config.run_state_entity
      ? hass.states[this.config.run_state_entity]
      : attrEntity;

    if (!attrEntity) {
      this._$('pill').textContent = 'entity: not found';
      return;
    }
    if (this.config.run_state_entity && !stateEntity) {
      this._$('pill').textContent = 'run_state_entity: not found';
      return;
    }

    const attrs   = attrEntity.attributes;
    const state   = (stateEntity ? stateEntity.state : attrEntity.state) || 'off';
    const suLower = state.toLowerCase();
    const TUB_MAX = Number(this.config.tub_max) || 30;
    const WARN_AT = Number(this.config.warn_at) || 25;
    const CIRC    = 339.29;

    const prefix = this.config.entity.replace(/^sensor\./, '');

    const resolveFlag = (overrideKey, attrName, bsSuffix) => {
      if (this.config[overrideKey]) {
        const bs = hass.states[this.config[overrideKey]];
        return bs ? bs.state === 'on' : false;
      }
      if (attrs[attrName] !== undefined) return this._isTruthy(attrs[attrName]);
      const bs = hass.states[`binary_sensor.${prefix}_${bsSuffix}`];
      return bs ? bs.state === 'on' : false;
    };

    const isDoor   = resolveFlag('door_lock_entity',      'door_lock',    'door_lock');
    const isRemote = resolveFlag('remote_start_entity',   'remote_start', 'remote_start');
    const isError  = resolveFlag('error_state_entity',    'error_state',  'error_state');

    const isDoneFlag = resolveFlag('wash_completed_entity', 'run_completed', 'wash_completed');
    const isDone = isDoneFlag
      || suLower === 'cycle finished'
      || suLower.includes('end')
      || suLower.includes('finish')
      || suLower.includes('complet');

    const isIdle = this._isIdleState(suLower);

    const theme = this._getTheme(suLower, isError, isDone);

    // ── Header ──
    this._$('devName').textContent = this.config.name || 'Washer / Dryer';
    this._$('devMode').textContent = attrs.current_course || (isIdle ? 'Standby' : state);

    const pillEl = this._$('pill');
    pillEl.textContent      = state;
    pillEl.style.background = theme.bg;
    pillEl.style.color      = theme.fg;

    // ── Timer ring ──
    const remMin  = this._parseMinutes(attrs.remain_time);
    const initMin = this._parseMinutes(attrs.initial_time) || Math.max(remMin, 1);
    const pct     = (isDone || isIdle) ? (isDone ? 1 : 0) : Math.min(remMin / initMin, 1);
    const offset  = CIRC * (1 - pct);

    const ringEl = this._$('ring');
    ringEl.style.stroke           = theme.ring;
    ringEl.style.strokeDashoffset = offset;

    if (isDone) {
      this._$('timeVal').textContent  = '✓';
      this._$('timeUnit').textContent = 'finished';
    } else if (isIdle) {
      this._$('timeVal').textContent  = '—';
      this._$('timeUnit').textContent = 'ready';
    } else {
      this._$('timeVal').textContent  = this._formatTime(attrs.remain_time);
      this._$('timeUnit').textContent = 'remaining';
    }

    // ── Chips ──
    this._$('chipCycle').textContent = attrs.current_course || '—';
    this._$('chipTemp').textContent  = attrs.water_temp     || '—';

    const isDrying = suLower.includes('dry') || !!attrs.dry_level;
    if (isDrying) {
      this._$('chip3icon').textContent  = '🌬';
      this._$('chip3label').textContent = 'Dry Level';
      this._$('chip3val').textContent   = attrs.dry_level  || '—';
    } else {
      this._$('chip3icon').textContent  = '💨';
      this._$('chip3label').textContent = 'Spin';
      this._$('chip3val').textContent   = attrs.spin_speed || '—';
    }

    // ── Tub clean ──
    const tub     = parseInt(attrs.tubclean_count) || 0;
    const tubPct  = Math.min(tub / TUB_MAX, 1) * 100;
    const tubColor = tub >= WARN_AT
      ? '#ff453a'
      : tub >= Math.floor(TUB_MAX * 0.5)
        ? '#ff9f0a'
        : '#34c759';
    this._$('tubCount').textContent     = `${tub} / ${TUB_MAX}`;
    this._$('tubCount').style.color     = tubColor;
    this._$('tubFill').style.width      = tubPct + '%';
    this._$('tubFill').style.background = tubColor;
    this._$('tubBadge').classList.toggle('show', tub >= WARN_AT);
    this._$('tubSub').textContent = tub >= TUB_MAX
      ? 'Tub clean overdue!'
      : `${TUB_MAX - tub} cycles until recommended tub clean`;

    // ── Status icons ──
    this._setStatus(this._$('siDone'),   isDone,   'green');
    this._setStatus(this._$('siDoor'),   isDoor,   'blue');
    this._setStatus(this._$('siRemote'), isRemote, 'blue');
    this._setStatus(this._$('siError'),  isError,  'red');

    // ── Banners ──
    this._$('bannerDone').classList.toggle('show', isDone && !isError);
    this._$('bannerError').classList.toggle('show', isError);
    if (isError) {
      this._$('bannerErrorMsg').textContent =
        attrs.error_message || 'Check your washer for details.';
    }
    this._$('bannerTub').classList.toggle('show', tub >= WARN_AT);
    if (tub >= WARN_AT) {
      this._$('bannerTubMsg').textContent =
        `Your washer has run ${tub} cycles since the last tub clean. Run a Tub Clean cycle soon.`;
    }

    // ── History (throttled) ──
    this._maybeRefreshHistory(isIdle);
  }

  getCardSize() { return 6; }
}

customElements.define('lg-washer-dryer-card', LgWasherDryerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'lg-washer-dryer-card',
  name:        'LG Washer/Dryer Card',
  description: 'Status card for LG washer/dryer combo via ha-smartthinq-sensors',
  preview:     false,
});

console.info(
  '%c LG-WASHER-DRYER-CARD %c v2.3.1 ',
  'background:#0071e3;color:#fff;font-weight:600;padding:2px 6px;border-radius:4px 0 0 4px',
  'background:#34c759;color:#fff;font-weight:600;padding:2px 6px;border-radius:0 4px 4px 0'
);
