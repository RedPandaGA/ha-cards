// neakasa-m1-card.js — v1.0.1
/**
 * Neakasa M1 Self-Cleaning Litter Box — Custom Lovelace Card
 *
 * Displays real-time status for the Neakasa M1 self-cleaning litter box
 * integrated via the timniklas/hass-neakasa HACS integration.
 * https://github.com/timniklas/hass-neakasa
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALLATION
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Copy this file to /config/www/neakasa-m1-card.js
 * 2. In HA: Settings → Dashboards → ⋮ → Resources → Add resource
 *    URL : /local/neakasa-m1-card.js?v=100   Type: JavaScript module
 *    (bump ?v= each time you update the file to bust HA's cache)
 * 3. Add a card in YAML mode — see examples below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW ENTITY IDs ARE DERIVED
 * ─────────────────────────────────────────────────────────────────────────────
 * All entity IDs are auto-built from entity_prefix using the naming
 * conventions produced by the hass-neakasa integration. Every entity can
 * be individually overridden in the card config if HA slugifies the device
 * name differently.
 *
 * Example auto-derived IDs (prefix = "neakasa_m1"):
 *   sensor.neakasa_m1_cat_litter_level          — litter level (%)
 *   sensor.neakasa_m1_cat_litter_state          — litter state (sufficient/moderate/insufficient)
 *   sensor.neakasa_m1_bin_state                 — bin state (normal/full/missing)
 *   sensor.neakasa_m1_device_status             — device status (idle/cleaning/leveling/…)
 *   sensor.neakasa_m1_last_usage                — last usage timestamp (ISO 8601)
 *   sensor.neakasa_m1_last_stay_time            — last stay duration (seconds)
 *   binary_sensor.neakasa_m1_garbage_can_full   — garbage can full flag (fallback for bin_state)
 *   button.neakasa_m1_clean                     — trigger a clean cycle
 *   button.neakasa_m1_level                     — trigger a leveling cycle
 *   switch.neakasa_m1_child_lock                — child lock switch
 *   switch.neakasa_m1_automatic_cover           — automatic cover switch
 *   switch.neakasa_m1_automatic_leveling        — automatic leveling switch
 *   switch.neakasa_m1_silent_mode               — silent mode switch
 *   switch.neakasa_m1_unstoppable_cycle         — unstoppable cycle switch
 *
 * Cat weight sensors are NOT auto-derived — they must be configured explicitly
 * under the `cats:` key since their names depend on what you registered in the app.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURATION OPTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * type: custom:neakasa-m1-card
 *
 * # Required
 * entity_prefix: neakasa_m1            # HA device slug — no domain prefix, no trailing _
 *
 * # Optional — display
 * name: "Litter Box"                   # Card title  (default: "Neakasa M1 Litter Box")
 *
 * # Optional — cat weight sensors (one entry per registered cat)
 * cats:
 *   - name: Whiskers                   # Display name shown on chart legend and chips
 *     entity: sensor.neakasa_m1_cat_whiskers
 *   - name: Shadow
 *     entity: sensor.neakasa_m1_cat_shadow
 *
 * # Optional — entity overrides (use these to correct odd HA slug naming)
 * entity_cat_litter_level:    sensor.my_device_cat_litter_level
 * entity_cat_litter_state:    sensor.my_device_cat_litter_state
 * entity_bin_state:           sensor.my_device_bin_state
 * entity_device_status:       sensor.my_device_device_status
 * entity_last_usage:          sensor.my_device_last_usage
 * entity_last_stay_time:      sensor.my_device_last_stay_time
 * entity_garbage_can_full:    binary_sensor.my_device_garbage_can_full
 * entity_clean:               button.my_device_clean
 * entity_level:               button.my_device_level
 * entity_child_lock:          switch.my_device_child_lock
 * entity_automatic_cover:     switch.my_device_automatic_cover
 * entity_automatic_leveling:  switch.my_device_automatic_leveling
 * entity_silent_mode:         switch.my_device_silent_mode
 * entity_unstoppable_cycle:   switch.my_device_unstoppable_cycle
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXAMPLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Minimal (no cats configured — graph section hidden):
 *   type: custom:neakasa-m1-card
 *   entity_prefix: neakasa_m1
 *
 * With cats:
 *   type: custom:neakasa-m1-card
 *   entity_prefix: neakasa_m1
 *   name: "Litter Box"
 *   cats:
 *     - name: Whiskers
 *       entity: sensor.neakasa_m1_cat_whiskers
 *     - name: Shadow
 *       entity: sensor.neakasa_m1_cat_shadow
 *
 * Full with entity overrides (fix odd HA slug naming):
 *   type: custom:neakasa-m1-card
 *   entity_prefix: neakasa_m1
 *   name: "Litter Box"
 *   cats:
 *     - name: Whiskers
 *       entity: sensor.neakasa_m1_whiskers_weight
 *   entity_bin_state:          sensor.neakasa_m1_bin_status
 *   entity_device_status:      sensor.neakasa_m1_status
 *   entity_last_stay_time:     sensor.neakasa_m1_stay_duration
 *   entity_clean:              button.neakasa_m1_start_clean
 *   entity_level:              button.neakasa_m1_start_level
 *   entity_child_lock:         switch.neakasa_m1_lock
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── Constants ──────────────────────────────────────────────────────────────── */

/** Up to 5 cats before colors repeat. Extend the array if you have more. */
const CAT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#14b8a6'];

/** Emoji icons for each known device_status value. */
const STATUS_ICONS = {
  idle:                  '😴',
  cleaning:              '🔄',
  leveling:              '⚖️',
  flipover:              '🔃',
  cat_present:           '🐱',
  paused:                '⏸️',
  cleaning_interrupted:  '⚠️',
};

/**
 * Switch definitions — each entry maps a display label to its config
 * override key and the suffix appended to entity_prefix.
 */
const SWITCH_DEFS = [
  { label: 'Child Lock',  overrideKey: 'entity_child_lock',          domain: 'switch', suffix: 'child_lock'          },
  { label: 'Auto Cover',  overrideKey: 'entity_automatic_cover',     domain: 'switch', suffix: 'automatic_cover'     },
  { label: 'Auto Level',  overrideKey: 'entity_automatic_leveling',  domain: 'switch', suffix: 'automatic_leveling'  },
  { label: 'Silent Mode', overrideKey: 'entity_silent_mode',         domain: 'switch', suffix: 'silent_mode'         },
  { label: 'Unstoppable', overrideKey: 'entity_unstoppable_cycle',   domain: 'switch', suffix: 'unstoppable_cycle'   },
];

/* ── Card Class ─────────────────────────────────────────────────────────────── */

class NeakasaM1Card extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._config        = {};           // card YAML config
    this._hass          = null;         // HA hass object
    this._rendered      = false;        // whether shadow DOM has been built
    this._settingsOpen  = false;        // gear dropdown state
    this._currentRange  = 'week';       // active history range: 'week' | 'month'
    this._catVisible    = [];           // per-cat visibility flags for the chart
    this._historyData   = {};           // cached history: { week: [...], month: [...] }
    this._fetchPending  = false;        // debounce guard for history fetches
  }

  /* ── HA Card Lifecycle ──────────────────────────────────────────────────── */

  /**
   * Called by HA when the card YAML config is set or changed.
   * Validates required fields and resets render state so the card
   * rebuilds on the next hass update.
   */
  setConfig(config) {
    if (!config.entity_prefix) {
      throw new Error('neakasa-m1-card: entity_prefix is required');
    }
    this._config     = config;
    this._catVisible = (config.cats || []).map(() => true);
    // Force a full re-render on next hass assignment
    this._rendered      = false;
    this._historyData   = {};
    this._currentRange  = 'week';
  }

  /**
   * Called by HA whenever any entity state changes.
   * Builds the DOM on the first call, then applies incremental state updates.
   */
  set hass(hass) {
    this._hass = hass;

    if (!this._rendered) {
      this._render();
    }

    this._updateStates();

    // Fetch history data if we don't have it for the active range yet
    if ((this._config.cats || []).length && !this._historyData[this._currentRange]) {
      this._scheduleFetch(this._currentRange);
    }
  }

  /** HA uses this to size the card in the dashboard grid (rows of ~50 px). */
  getCardSize() {
    return (this._config.cats || []).length ? 9 : 6;
  }

  /* ── Entity ID Resolution ───────────────────────────────────────────────── */

  /**
   * Returns a fully-qualified entity ID.
   * Checks the card config for an explicit override key first;
   * falls back to `{entity_prefix}_{suffix}`.
   *
   * @param {string} overrideKey  - config key for the explicit override
   * @param {string} suffix       - default suffix appended to entity_prefix
   * @returns {string}
   */
  _eid(overrideKey, domain, suffix) {
    return this._config[overrideKey] || `${domain}.${this._config.entity_prefix}_${suffix}`;
  }

  /** Returns the full HA state object for an entity, or null. */
  _getState(entityId) {
    if (!this._hass || !entityId) return null;
    return this._hass.states[entityId] || null;
  }

  /** Returns the state string for an entity, or a fallback value. */
  _stateVal(entityId, fallback = 'unavailable') {
    const s = this._getState(entityId);
    return s ? s.state : fallback;
  }

  /* ── Shadow DOM Render ──────────────────────────────────────────────────── */

  /**
   * Builds the full shadow DOM from scratch.
   * Called once on the first `set hass()` invocation (or after a config change).
   * Subsequent state updates use targeted DOM mutations via _updateStates().
   */
  _render() {
    const cfg  = this._config;
    const cats = cfg.cats || [];

    // ── Cat filter chips (only rendered when > 1 cat configured) ──
    const catChips = cats.length > 1
      ? cats.map((c, i) => {
          const color = CAT_COLORS[i % CAT_COLORS.length];
          return `
            <button class="cat-chip active" data-cat-idx="${i}"
                    style="background:${this._hexAlpha(color, 0.12)};border-color:${color};">
              <span class="chip-dot" style="background:${color};"></span>${this._esc(c.name)}
            </button>`;
        }).join('')
      : '';

    // ── Switch rows for the settings dropdown ──
    const swRows = SWITCH_DEFS.map((sw, i) => `
      <div class="sw-row">
        <span class="sw-name">${sw.label}</span>
        <label class="toggle">
          <input type="checkbox" class="sw-input" data-sw-idx="${i}">
          <span class="slider-track"></span>
        </label>
      </div>`).join('');

    // ── Weight history graph (hidden when no cats configured) ──
    const graphSection = cats.length ? `
      <div class="graph-card">
        <div class="graph-header">
          <span class="section-label" style="margin:0;">Cat Weight History</span>
          <div class="range-group">
            <button class="range-btn active" data-range="week">Week</button>
            <button class="range-btn"        data-range="month">Month</button>
          </div>
        </div>
        ${cats.length > 1 ? `<div class="cat-filters">${catChips}</div>` : ''}
        <div class="graph-area">
          <svg id="chartSvg" viewBox="0 0 400 165" preserveAspectRatio="xMidYMid meet"></svg>
          <div class="tooltip" id="tooltip"></div>
        </div>
        <div class="legend" id="legend"></div>
      </div>` : '';

    // ── Full shadow DOM ──
    this.shadowRoot.innerHTML = `
      <style>${this._buildCSS()}</style>
      <div class="card">

        <!-- ── Card header with title and settings gear ── -->
        <div class="card-header">
          <div class="card-title">${this._esc(cfg.name || 'Neakasa M1 Litter Box')}</div>
          <button class="gear-btn" id="gearBtn" title="Settings">⚙️</button>

          <!-- Settings dropdown — toggled by gear button -->
          <div class="settings-dropdown" id="settingsDropdown">
            <div class="dropdown-title">Settings</div>
            ${swRows}
          </div>
        </div>

        <!-- ── Waste bin status banner (large, color-coded) ── -->
        <div class="bin-banner normal" id="binBanner">
          <div class="bin-icon" id="binIcon">✅</div>
          <div class="bin-text">
            <div class="bin-label">Waste Bin</div>
            <div class="bin-value normal" id="binValue">Normal</div>
            <span class="bin-badge normal" id="binBadge">OK</span>
          </div>
        </div>

        <!-- ── Two-column status row: litter level + device status ── -->
        <div class="status-row">

          <!-- Litter level with animated fill bar and state badge -->
          <div class="mini-card">
            <div class="section-label">Litter Level</div>
            <div class="litter-pct" id="litterPct">—</div>
            <div class="bar-track">
              <div class="bar-fill" id="litterBar" style="width:0%;background:#10b981;"></div>
            </div>
            <span class="state-badge sufficient" id="litterBadge">—</span>
          </div>

          <!-- Device status with last stay duration in the top-right corner -->
          <div class="mini-card">
            <div class="dev-card-inner">
              <div class="dev-top">
                <div class="dev-top-left">
                  <div class="section-label" style="margin-bottom:6px;">Status</div>
                  <div class="dev-icon"   id="devIcon">—</div>
                  <div class="dev-status" id="devStatus">—</div>
                </div>
                <div class="dev-stay-block">
                  <div class="dev-stay-num"   id="lastStayNum">—</div>
                  <div class="dev-stay-label">Last Stay</div>
                </div>
              </div>
              <div class="dev-sub">Last used: <b id="lastUsage">—</b></div>
            </div>
          </div>
        </div>

        <!-- ── Action buttons: Clean and Level ── -->
        <div class="action-row">
          <button class="action-btn clean" id="btnClean">🧹 Clean</button>
          <button class="action-btn level" id="btnLevel">⚖️ Level</button>
        </div>

        <!-- ── Cat weight history graph (only present when cats: is configured) ── -->
        ${graphSection}

      </div>`;

    this._rendered = true;
    this._attachListeners();
  }

  /* ── Embedded CSS ───────────────────────────────────────────────────────── */

  /**
   * Returns the full CSS string injected into the shadow root.
   * Uses HA CSS variables where possible so the card adapts to the active theme.
   */
  _buildCSS() {
    return `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ── Card shell ── */
      .card {
        background:  var(--ha-card-background, var(--card-background-color, #faf9f6));
        border-radius: var(--ha-card-border-radius, 20px);
        padding: 20px;
        color: var(--primary-text-color, #1d1d1f);
        font-family: var(--paper-font-body1_-_font-family,
                     -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        position: relative;
      }

      /* ── Card header ── */
      .card-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 16px; position: relative;
      }
      .card-title {
        font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--secondary-text-color, #86868b);
        display: flex; align-items: center; gap: 8px; flex: 1;
      }
      .card-title::after {
        content: ''; flex: 1; height: 1px;
        background: rgba(0,0,0,0.06); margin-left: 8px;
      }

      /* ── Gear / settings button ── */
      .gear-btn {
        width: 32px; height: 32px; border-radius: 10px; border: none;
        background: var(--card-background-color, white);
        cursor: pointer; font-size: 15px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.10);
        transition: all 0.2s;
        color: var(--secondary-text-color, #6e6e73);
        flex-shrink: 0;
      }
      .gear-btn:hover { background: #eef2ff; color: #6366f1; transform: rotate(30deg); }
      .gear-btn.open  { background: #6366f1; color: white;  transform: rotate(60deg); }

      /* ── Settings dropdown ── */
      .settings-dropdown {
        position: absolute; top: 44px; right: 0;
        background: var(--card-background-color, white);
        border-radius: 16px; padding: 16px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08);
        z-index: 100; min-width: 220px;
        opacity: 0;
        transform: translateY(-8px) scale(0.97);
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform-origin: top right;
      }
      .settings-dropdown.open {
        opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
      }
      .dropdown-title {
        font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--secondary-text-color, #86868b);
        margin-bottom: 12px; padding-bottom: 8px;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }

      /* ── Switch rows (inside dropdown) ── */
      .sw-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);
      }
      .sw-row:last-child { border-bottom: none; padding-bottom: 0; }
      .sw-name { font-size: 13px; font-weight: 500; }
      .toggle  { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .slider-track {
        position: absolute; cursor: pointer; inset: 0;
        background: #d2d2d7; border-radius: 22px; transition: background 0.25s;
      }
      .slider-track::before {
        content: ''; position: absolute;
        height: 16px; width: 16px; left: 3px; bottom: 3px;
        background: white; border-radius: 50%;
        transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        box-shadow: 0 1px 4px rgba(0,0,0,0.20);
      }
      .toggle input:checked + .slider-track                { background: #6366f1; }
      .toggle input:checked + .slider-track::before        { transform: translateX(16px); }

      /* ── Bin status banner ── */
      .bin-banner {
        display: flex; align-items: center; gap: 14px;
        border-radius: 14px; padding: 15px 18px;
        margin-bottom: 16px; transition: all 0.4s;
      }
      .bin-banner.normal  { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
      .bin-banner.full    { background: linear-gradient(135deg, #fee2e2, #fecaca); }
      .bin-banner.missing { background: linear-gradient(135deg, #fef3c7, #fde68a); }
      .bin-icon  { font-size: 36px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.10)); }
      .bin-text  { flex: 1; }
      .bin-label {
        font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; opacity: 0.6;
      }
      .bin-value { font-size: 24px; font-weight: 800; line-height: 1.1; margin-top: 2px; }
      .bin-value.normal  { color: #065f46; }
      .bin-value.full    { color: #991b1b; }
      .bin-value.missing { color: #78350f; }
      .bin-badge {
        display: inline-block; font-size: 10px; font-weight: 700;
        padding: 2px 9px; border-radius: 20px; margin-top: 4px;
        text-transform: uppercase; letter-spacing: 0.06em;
      }
      .bin-badge.normal  { background: rgba(6,95,70,0.15);   color: #065f46; }
      .bin-badge.full    { background: rgba(153,27,27,0.15); color: #991b1b; }
      .bin-badge.missing { background: rgba(120,53,15,0.15); color: #78350f; }

      /* ── Two-column status row ── */
      .status-row {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 12px; margin-bottom: 16px;
      }
      .mini-card {
        background: var(--card-background-color, white);
        border-radius: 14px; padding: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
      }
      .section-label {
        font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--secondary-text-color, #86868b);
        margin-bottom: 10px;
      }

      /* ── Litter level ── */
      .litter-pct    { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 8px; }
      .bar-track     { background: #f0f0f0; border-radius: 8px; height: 10px; overflow: hidden; margin-bottom: 8px; }
      .bar-fill      { height: 100%; border-radius: 8px; transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1), background 0.4s; }
      .state-badge {
        display: inline-block; font-size: 10px; font-weight: 700;
        padding: 3px 10px; border-radius: 20px;
        letter-spacing: 0.05em; text-transform: uppercase;
      }
      .state-badge.sufficient   { background: #d1fae5; color: #065f46; }
      .state-badge.moderate     { background: #fef3c7; color: #92400e; }
      .state-badge.insufficient { background: #fee2e2; color: #991b1b; }
      .state-badge.unknown      { background: #f0f0f0; color: #6e6e73; }

      /* ── Device status card (right column) ── */
      .dev-card-inner  { display: flex; flex-direction: column; height: 100%; }
      .dev-top         { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
      .dev-top-left    { display: flex; flex-direction: column; }
      .dev-stay-block  { text-align: right; }
      .dev-stay-num    { font-size: 22px; font-weight: 800; color: #6366f1; line-height: 1; }
      .dev-stay-label  {
        font-size: 9px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--secondary-text-color, #86868b);
        margin-top: 2px;
      }
      .dev-icon   { font-size: 26px; line-height: 1; margin-bottom: 3px; }
      .dev-status { font-size: 13px; font-weight: 700; text-transform: capitalize; line-height: 1.2; }
      .dev-sub    { font-size: 10px; color: var(--secondary-text-color, #86868b); margin-top: 6px; line-height: 1.4; }
      .dev-sub b  { color: var(--primary-text-color, #1d1d1f); font-weight: 600; }

      /* ── Action buttons ── */
      .action-row {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 10px; margin-bottom: 16px;
      }
      .action-btn {
        display: flex; align-items: center; justify-content: center; gap: 7px;
        padding: 13px; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700; cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
        user-select: none; letter-spacing: 0.01em;
      }
      .action-btn:hover   { transform: translateY(-1px); }
      .action-btn:active  { transform: scale(0.95); box-shadow: none; }
      .action-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
      .action-btn.clean   { background: #6366f1; color: white;   box-shadow: 0 4px 12px rgba(99,102,241,0.40); }
      .action-btn.level   { background: #eef2ff; color: #4338ca; box-shadow: 0 4px 12px rgba(67,56,202,0.12);  }

      /* ── Weight history graph card ── */
      .graph-card {
        background: var(--card-background-color, white);
        border-radius: 14px; padding: 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .graph-header  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .range-group   { display: flex; gap: 4px; flex-shrink: 0; }
      .range-btn {
        padding: 5px 12px; border: none; border-radius: 20px;
        font-size: 11px; font-weight: 700; cursor: pointer;
        transition: all 0.2s; background: #f0f0f0; color: #6e6e73;
      }
      .range-btn.active { background: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.30); }

      /* Cat visibility filter chips */
      .cat-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
      .cat-chip {
        display: flex; align-items: center; gap: 5px;
        padding: 4px 10px 4px 7px;
        border-radius: 20px; border: 2px solid transparent;
        font-size: 11px; font-weight: 700; cursor: pointer;
        transition: all 0.2s; user-select: none;
        color: var(--primary-text-color, #1d1d1f);
      }
      .cat-chip.inactive {
        color: var(--secondary-text-color, #86868b);
        background: #f0f0f0 !important;
        border-color: transparent !important;
      }
      .cat-chip.inactive .chip-dot { opacity: 0.3; }
      .chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; transition: opacity 0.2s; }

      /* SVG chart wrapper */
      .graph-area    { position: relative; height: 165px; margin-bottom: 10px; }
      .graph-area svg { width: 100%; height: 100%; overflow: visible; }

      /* Hover tooltip */
      .tooltip {
        position: absolute; background: rgba(29,29,31,0.90); color: white;
        padding: 7px 11px; border-radius: 8px; font-size: 11px; font-weight: 600;
        pointer-events: none; opacity: 0; transition: opacity 0.15s;
        white-space: nowrap; z-index: 10;
        backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.30);
      }

      /* Chart legend */
      .legend       { display: flex; gap: 14px; flex-wrap: wrap; }
      .legend-item  { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--secondary-text-color, #6e6e73); }
      .ldot         { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    `;
  }

  /* ── Event Listeners ────────────────────────────────────────────────────── */

  /**
   * Attaches all interactive event listeners to the shadow DOM.
   * Called once at the end of _render().
   */
  _attachListeners() {
    const root = this.shadowRoot;

    // Gear button toggles the settings dropdown
    root.getElementById('gearBtn').addEventListener('click', e => {
      e.stopPropagation();
      this._toggleSettings();
    });

    // Clicking anywhere on the card body (outside the dropdown) closes it
    root.querySelector('.card').addEventListener('click', e => {
      if (!this._settingsOpen) return;
      const dd  = root.getElementById('settingsDropdown');
      const btn = root.getElementById('gearBtn');
      if (!btn.contains(e.target) && !dd.contains(e.target)) {
        this._closeSettings();
      }
    });

    // Week / Month range buttons
    root.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => this._setRange(btn.dataset.range, btn));
    });

    // Cat visibility chips (only present when > 1 cat configured)
    root.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', () => this._toggleCat(parseInt(chip.dataset.catIdx, 10)));
    });

    // Switch toggles — each calls the HA switch service
    root.querySelectorAll('.sw-input').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.swIdx, 10);
        const sw  = SWITCH_DEFS[idx];
        const eid = this._eid(sw.overrideKey, sw.domain, sw.suffix);
        this._hass.callService('switch', input.checked ? 'turn_on' : 'turn_off', { entity_id: eid });
      });
    });

    // Action buttons — call button.press service
    root.getElementById('btnClean').addEventListener('click', () => {
      const eid = this._eid('entity_clean', 'button', 'clean');
      this._pressButton(eid, root.getElementById('btnClean'), '🧹 Clean');
    });
    root.getElementById('btnLevel').addEventListener('click', () => {
      const eid = this._eid('entity_level', 'button', 'level');
      this._pressButton(eid, root.getElementById('btnLevel'), '⚖️ Level');
    });
  }

  /* ── State Update ───────────────────────────────────────────────────────── */

  /**
   * Reads current HA state for all entities and updates the DOM.
   * Called every time `set hass()` fires — must be fast and non-destructive.
   */
  _updateStates() {
    if (!this._rendered) return;
    const root = this.shadowRoot;

    // ── Bin state ──────────────────────────────────────────────────────────
    // Primary: sensor bin_state. Fallback: binary_sensor garbage_can_full.
    let binRaw = this._stateVal(this._eid('entity_bin_state', 'sensor', 'bin_state')).toLowerCase();
    if (binRaw === 'unavailable' || binRaw === 'unknown') {
      const isFull = this._stateVal(this._eid('entity_garbage_can_full', 'binary_sensor', 'garbage_can_full')) === 'on';
      binRaw = isFull ? 'full' : 'normal';
    }
    this._applyBinState(root, binRaw);

    // ── Litter level ───────────────────────────────────────────────────────
    const levelRaw = this._stateVal(this._eid('entity_cat_litter_level', 'sensor', 'cat_litter_level'));
    const levelPct = parseFloat(levelRaw);
    root.getElementById('litterPct').textContent = isNaN(levelPct) ? '—' : `${Math.round(levelPct)}%`;
    if (!isNaN(levelPct)) {
      // Green above 60 %, amber 30-60 %, red below 30 %
      const color = levelPct > 60 ? '#10b981' : levelPct > 30 ? '#f59e0b' : '#ef4444';
      const bar   = root.getElementById('litterBar');
      bar.style.width      = `${Math.min(100, levelPct)}%`;
      bar.style.background = color;
    }

    // ── Litter state badge ─────────────────────────────────────────────────
    const litterState = this._stateVal(this._eid('entity_cat_litter_state', 'sensor', 'cat_litter_state'));
    const lsKey       = litterState.toLowerCase().replace(/\s+/g, '_');
    const badge       = root.getElementById('litterBadge');
    badge.className   = `state-badge ${['sufficient','moderate','insufficient'].includes(lsKey) ? lsKey : 'unknown'}`;
    badge.textContent = litterState === 'unavailable' ? '—' : litterState.replace(/_/g, ' ');

    // ── Device status ──────────────────────────────────────────────────────
    const devRaw  = this._stateVal(this._eid('entity_device_status', 'sensor', 'device_status'));
    const devKey  = devRaw.toLowerCase().replace(/\s+/g, '_');
    root.getElementById('devIcon').textContent   = STATUS_ICONS[devKey] || '❓';
    root.getElementById('devStatus').textContent =
      devRaw === 'unavailable' ? '—' : devRaw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // ── Last stay time ─────────────────────────────────────────────────────
    const stayRaw  = this._stateVal(this._eid('entity_last_stay_time', 'sensor', 'last_stay_time'));
    const staySecs = parseInt(stayRaw, 10);
    root.getElementById('lastStayNum').textContent = isNaN(staySecs) ? '—' : this._fmtDuration(staySecs);

    // ── Last usage timestamp ───────────────────────────────────────────────
    const usageRaw = this._stateVal(this._eid('entity_last_usage', 'sensor', 'last_usage'));
    let   usageStr = '—';
    if (usageRaw && usageRaw !== 'unavailable' && usageRaw !== 'unknown') {
      try {
        usageStr = new Date(usageRaw).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
      } catch (_) { usageStr = usageRaw; }
    }
    root.getElementById('lastUsage').textContent = usageStr;

    // ── Switch states ──────────────────────────────────────────────────────
    SWITCH_DEFS.forEach((sw, i) => {
      const eid   = this._eid(sw.overrideKey, sw.domain, sw.suffix);
      const state = this._stateVal(eid);
      const input = root.querySelector(`.sw-input[data-sw-idx="${i}"]`);
      if (input) input.checked = (state === 'on');
    });
  }

  /**
   * Applies the correct color class and labels to the bin banner.
   * @param {ShadowRoot} root
   * @param {string} state  — 'normal' | 'full' | 'missing'
   */
  _applyBinState(root, state) {
    const META = {
      normal:  { icon: '✅', label: 'Normal',  badge: 'OK'      },
      full:    { icon: '🗑️', label: 'Full',    badge: 'Full'    },
      missing: { icon: '❌', label: 'Missing', badge: 'Missing' },
    };
    const m = META[state] || META.normal;
    const cls = META[state] ? state : 'normal';

    root.getElementById('binBanner').className   = `bin-banner ${cls}`;
    root.getElementById('binIcon').textContent   = m.icon;
    root.getElementById('binValue').textContent  = m.label;
    root.getElementById('binValue').className    = `bin-value ${cls}`;
    const b       = root.getElementById('binBadge');
    b.className   = `bin-badge ${cls}`;
    b.textContent = m.badge;
  }

  /* ── History API ────────────────────────────────────────────────────────── */

  /**
   * Schedules a history fetch with a short debounce so rapid hass
   * updates during HA startup don't flood the history API.
   * @param {string} range  — 'week' | 'month'
   */
  _scheduleFetch(range) {
    if (this._fetchPending) return;
    this._fetchPending = true;
    setTimeout(() => {
      this._fetchPending = false;
      this._fetchHistory(range);
    }, 600);
  }

  /**
   * Fetches historical weight data for all configured cats from the HA
   * history REST API and stores the result in _historyData[range].
   * @param {string} range  — 'week' | 'month'
   */
  async _fetchHistory(range) {
    const cats      = this._config.cats || [];
    const entityIds = cats.map(c => c.entity).filter(Boolean);
    if (!entityIds.length || !this._hass) return;

    // Show a loading placeholder while the request is in flight
    const svg = this.shadowRoot?.getElementById('chartSvg');
    if (svg) {
      svg.innerHTML = '<text x="200" y="82" text-anchor="middle" fill="#86868b" font-size="12" font-family="system-ui">Loading…</text>';
    }

    const days  = range === 'week' ? 7 : 30;
    const end   = new Date();
    const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
    const url   = `history/period/${start.toISOString()}` +
                  `?filter_entity_id=${entityIds.join(',')}` +
                  `&end_time=${end.toISOString()}&minimal_response=true`;

    try {
      const result = await this._hass.callApi('GET', url);
      // result: array of state arrays, one per entity.
      // Each state object: { state: "4.2", last_changed: "2024-01-01T…" }
      this._historyData[range] = result.map(stateList =>
        (stateList || [])
          .filter(s => s.state && !isNaN(parseFloat(s.state)))
          .map(s => ({ x: new Date(s.last_changed).getTime(), y: parseFloat(s.state) }))
      );
      // Only redraw if this is still the active range
      if (this._currentRange === range) this._drawChart();
    } catch (err) {
      console.error('neakasa-m1-card: history fetch failed', err);
      if (svg) {
        svg.innerHTML = '<text x="200" y="82" text-anchor="middle" fill="#ef4444" font-size="12" font-family="system-ui">History unavailable</text>';
      }
    }
  }

  /* ── Chart Renderer ─────────────────────────────────────────────────────── */

  /**
   * Renders the SVG line chart from the cached _historyData.
   * Skips invisible cats and rescales axes to the visible data.
   */
  _drawChart() {
    const root = this.shadowRoot;
    const svg  = root?.getElementById('chartSvg');
    if (!svg) return;

    const cats   = this._config.cats || [];
    const series = this._historyData[this._currentRange];
    if (!series) return;

    const pad   = { top: 10, right: 8, bottom: 26, left: 36 };
    const W = 400, H = 165;
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;

    // Collect visible series that have at least one data point
    const visible = series
      .map((pts, i) => ({
        pts,
        i,
        color: CAT_COLORS[i % CAT_COLORS.length],
        name:  cats[i]?.name || `Cat ${i + 1}`,
      }))
      .filter(d => this._catVisible[d.i] && d.pts.length > 0);

    if (!visible.length) {
      svg.innerHTML = '<text x="200" y="82" text-anchor="middle" fill="#86868b" font-size="12" font-family="system-ui">No data to display</text>';
      this._updateLegend(series, cats);
      return;
    }

    // ── Scale calculation ──────────────────────────────────────────────────
    const allY   = visible.flatMap(d => d.pts.map(p => p.y));
    const allX   = visible.flatMap(d => d.pts.map(p => p.x));
    const minY   = Math.min(...allY) - 0.15;
    const maxY   = Math.max(...allY) + 0.15;
    const minX   = Math.min(...allX);
    const maxX   = Math.max(...allX);
    const rangeY = (maxY - minY) || 0.5;
    const rangeX = (maxX - minX) || 1;

    const toSvg = (x, y) => ({
      sx: pad.left  + ((x - minX) / rangeX) * plotW,
      sy: pad.top   + (1 - (y - minY) / rangeY) * plotH,
    });

    // ── Build SVG markup ───────────────────────────────────────────────────
    let html = `<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="#f8f8f8" rx="6"/>`;

    // Horizontal grid lines with Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const yv = minY + (rangeY / 4) * i;
      const sy = pad.top + (1 - i / 4) * plotH;
      html += `<line x1="${pad.left}" y1="${sy}" x2="${W - pad.right}" y2="${sy}" stroke="#e8e8e8" stroke-width="1"/>`;
      html += `<text x="${pad.left - 4}" y="${sy + 4}" text-anchor="end" fill="#86868b" font-size="9" font-family="system-ui">${yv.toFixed(1)}</text>`;
    }

    // X-axis date labels (spaced to avoid crowding)
    const refPts = visible[0].pts;
    const step   = Math.max(1, Math.floor(refPts.length / 5));
    refPts.forEach((p, i) => {
      if (i % step !== 0) return;
      const sv  = toSvg(p.x, minY);
      const lbl = new Date(p.x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      html += `<text x="${sv.sx.toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#86868b" font-size="9" font-family="system-ui">${lbl}</text>`;
    });

    // One line + dot series per visible cat
    visible.forEach(({ pts, color, name }) => {
      const svPts = pts.map(p => toSvg(p.x, p.y));
      const d     = svPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ');
      html += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
      svPts.forEach((p, i) => {
        html += `<circle cx="${p.sx.toFixed(1)}" cy="${p.sy.toFixed(1)}" r="4.5" fill="${color}"
          class="dot" data-val="${pts[i].y.toFixed(2)}" data-ts="${pts[i].x}" data-name="${this._esc(name)}"
          style="cursor:pointer;"/>`;
      });
    });

    svg.innerHTML = html;

    // ── Hover tooltips ────────────────────────────────────────────────────
    const tt = root.getElementById('tooltip');
    svg.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('mouseenter', () => {
        const lbl  = new Date(parseInt(dot.dataset.ts, 10))
          .toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        tt.textContent   = `${dot.dataset.name}: ${dot.dataset.val} kg  (${lbl})`;
        const ga         = svg.closest('.graph-area').getBoundingClientRect();
        const dr         = dot.getBoundingClientRect();
        tt.style.left    = `${Math.max(0, dr.left - ga.left - 60)}px`;
        tt.style.top     = `${dr.top  - ga.top  - 42}px`;
        tt.style.opacity = '1';
      });
      dot.addEventListener('mouseleave', () => { tt.style.opacity = '0'; });
    });

    this._updateLegend(series, cats);
  }

  /**
   * Rebuilds the chart legend below the SVG.
   * Dims entries for cats that are currently hidden.
   */
  _updateLegend(series, cats) {
    const legend = this.shadowRoot?.getElementById('legend');
    if (!legend) return;
    legend.innerHTML = (series || []).map((pts, i) => {
      const color   = CAT_COLORS[i % CAT_COLORS.length];
      const name    = cats[i]?.name || `Cat ${i + 1}`;
      const lastVal = pts.at(-1) ? `${pts.at(-1).y.toFixed(2)} kg` : '—';
      const muted   = this._catVisible[i] ? '' : 'opacity:0.35;';
      return `<div class="legend-item" style="${muted}">
        <div class="ldot" style="background:${color};"></div>
        ${this._esc(name)}: <strong>${lastVal}</strong>
      </div>`;
    }).join('');
  }

  /* ── UI Action Helpers ──────────────────────────────────────────────────── */

  /** Toggles the settings gear dropdown open/closed. */
  _toggleSettings() {
    if (this._settingsOpen) {
      this._closeSettings();
    } else {
      const dd  = this.shadowRoot.getElementById('settingsDropdown');
      const btn = this.shadowRoot.getElementById('gearBtn');
      this._settingsOpen = true;
      dd.classList.add('open');
      btn.classList.add('open');
    }
  }

  /** Closes the settings dropdown. */
  _closeSettings() {
    const dd  = this.shadowRoot.getElementById('settingsDropdown');
    const btn = this.shadowRoot.getElementById('gearBtn');
    this._settingsOpen = false;
    dd.classList.remove('open');
    btn.classList.remove('open');
  }

  /**
   * Switches the chart to the given time range.
   * Fetches history if not already cached for that range.
   * @param {string} range  — 'week' | 'month'
   * @param {HTMLElement} btn  — the clicked range button element
   */
  _setRange(range, btn) {
    this._currentRange = range;
    this.shadowRoot.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (!this._historyData[range]) {
      this._fetchHistory(range);
    } else {
      this._drawChart();
    }
  }

  /**
   * Toggles visibility for cat index `i` in the chart.
   * Updates the chip appearance and redraws the chart.
   * @param {number} i  — zero-based cat index
   */
  _toggleCat(i) {
    this._catVisible[i] = !this._catVisible[i];
    const chip  = this.shadowRoot.querySelector(`.cat-chip[data-cat-idx="${i}"]`);
    if (chip) {
      const color = CAT_COLORS[i % CAT_COLORS.length];
      chip.classList.toggle('active',   this._catVisible[i]);
      chip.classList.toggle('inactive', !this._catVisible[i]);
      if (this._catVisible[i]) {
        chip.style.background  = this._hexAlpha(color, 0.12);
        chip.style.borderColor = color;
      }
    }
    this._drawChart();
  }

  /**
   * Presses a HA button entity and shows transient feedback on the button.
   * @param {string}      entityId  — fully-qualified button entity ID
   * @param {HTMLElement} btnEl     — the button DOM element to animate
   * @param {string}      label     — original button label to restore
   */
  _pressButton(entityId, btnEl, label) {
    if (!this._hass || !entityId) return;
    const orig      = btnEl.innerHTML;
    btnEl.disabled  = true;
    btnEl.innerHTML = '⏳ Working…';
    this._hass.callService('button', 'press', { entity_id: entityId });
    setTimeout(() => {
      btnEl.innerHTML = '✅ Done';
      setTimeout(() => { btnEl.innerHTML = orig; btnEl.disabled = false; }, 900);
    }, 1400);
  }

  /* ── Utility ────────────────────────────────────────────────────────────── */

  /**
   * Formats a duration in seconds to a compact human-readable string.
   * @param {number} secs
   * @returns {string}  e.g. "45s", "3m", "1.5h"
   */
  _fmtDuration(secs) {
    if (secs < 60)   return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  }

  /**
   * Converts a hex color + alpha into an rgba() string.
   * @param {string} hex  — 6-digit hex color (e.g. '#6366f1')
   * @param {number} a    — alpha 0–1
   * @returns {string}
   */
  _hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /**
   * Escapes a string for safe insertion into HTML attribute values or text.
   * @param {string} str
   * @returns {string}
   */
  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

/* ── Register Custom Element ────────────────────────────────────────────────── */

customElements.define('neakasa-m1-card', NeakasaM1Card);

/**
 * Registers the card with the HA custom card registry so it appears
 * in the card picker UI with a name and description.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type:        'neakasa-m1-card',
  name:        'Neakasa M1 Litter Box',
  description: 'Real-time status card for the Neakasa M1 self-cleaning litter box (timniklas/hass-neakasa)',
  preview:     false,
});
