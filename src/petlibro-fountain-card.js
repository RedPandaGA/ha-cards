// petlibro-fountain-card.js — v1.0.0
/**
 * Petlibro Dockstream Fountain — Custom Lovelace Card
 *
 * Displays real-time status for Petlibro Dockstream water fountains
 * integrated via the jjjonesjr33/petlibro HACS integration (dev branch).
 * Covers PLWF116 and all Dockstream variants (Smart, Smart RFID,
 * Dockstream 2 Smart, Dockstream 2 Smart Cordless).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALLATION
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Copy this file to /config/www/petlibro-fountain-card.js
 * 2. In HA: Settings → Dashboards → ⋮ → Resources → Add resource
 *    URL: /local/petlibro-fountain-card.js?v=100   Type: JavaScript module
 *    (bump ?v= each time you update the file to bust HA's cache)
 * 3. Add a card to your dashboard (YAML mode) — see examples below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW ENTITY IDs ARE DERIVED
 * ─────────────────────────────────────────────────────────────────────────────
 * All entity IDs are auto-built from entity_prefix (required) using the
 * naming conventions produced by the petlibro integration.  Every entity
 * can be individually overridden in the card config if HA slugifies the
 * device name differently.
 *
 * Example auto-derived IDs (prefix = "my_fountain"):
 *   sensor.my_fountain_current_weight_percent
 *   sensor.my_fountain_remaining_cleaning_days
 *   sensor.my_fountain_remaining_filter_days
 *   sensor.my_fountain_today_s_water_consumption
 *   sensor.my_fountain_yesterday_s_water_consumption
 *   sensor.my_fountain_today_drinking_times
 *   sensor.my_fountain_yesterday_drinking_times
 *   sensor.my_fountain_today_s_total_drinking_time
 *   sensor.my_fountain_today_s_average_drinking_time
 *   sensor.my_fountain_battery_ac           (Dockstream 2 Cordless only)
 *   sensor.my_fountain_battery_level        (Dockstream 2 Cordless only)
 *   binary_sensor.my_fountain_barn_door_error
 *   button.my_fountain_cleaning_reset
 *   button.my_fountain_filter_reset
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURATION OPTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * type: custom:petlibro-fountain-card
 *
 * # Required
 * entity_prefix: dockstream_smart_fountain   # HA device slug (no domain)
 *
 * # Optional — display
 * name: "Cat Fountain"         # card header title  default: "Petlibro Fountain"
 * show_reset_buttons: true     # show cleaning/filter reset buttons  default: false
 *
 * # Optional — max values for progress bars
 * cleaning_cycle_days: 30      # total cleaning cycle length (days)  default: 30
 * filter_cycle_days: 30        # total filter cycle length (days)     default: 30
 * battery_max: 100             # max battery %                        default: 100
 *
 * # Optional — entity overrides (fix odd naming)
 * entity_weight_percent:            sensor.my_device_current_weight_percent
 * entity_remaining_cleaning_days:   sensor.my_device_remaining_cleaning_days
 * entity_remaining_filter_days:     sensor.my_device_remaining_filter_days
 * entity_today_drinking_amount:     sensor.my_device_today_s_water_consumption
 * entity_yesterday_drinking_amount: sensor.my_device_yesterday_s_water_consumption
 * entity_today_drinking_count:      sensor.my_device_today_drinking_times
 * entity_yesterday_drinking_count:  sensor.my_device_yesterday_drinking_times
 * entity_today_drinking_time:       sensor.my_device_today_s_total_drinking_time
 * entity_today_avg_time:            sensor.my_device_today_s_average_drinking_time
 * entity_battery_pct:               sensor.my_device_battery_ac
 * entity_battery_state:             sensor.my_device_battery_level
 * entity_barn_door_error:           binary_sensor.my_device_barn_door_error
 * entity_cleaning_reset:            button.my_device_cleaning_reset
 * entity_filter_reset:              button.my_device_filter_reset
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXAMPLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Minimal:
 *   type: custom:petlibro-fountain-card
 *   entity_prefix: dockstream_smart_fountain
 *
 * With reset buttons visible:
 *   type: custom:petlibro-fountain-card
 *   entity_prefix: dockstream_smart_fountain
 *   name: "Whisker's Fountain"
 *   show_reset_buttons: true
 *   cleaning_cycle_days: 30
 *   filter_cycle_days: 30
 *
 * Full with entity overrides (fix odd device naming):
 *   type: custom:petlibro-fountain-card
 *   entity_prefix: petlibro_dockstream_fountain_plwf116
 *   name: "Cat Fountain"
 *   show_reset_buttons: true
 *   entity_weight_percent: sensor.my_fountain_current_weight_percent
 *   entity_remaining_cleaning_days: sensor.my_fountain_remaining_cleaning_days
 *   entity_remaining_filter_days: sensor.my_fountain_remaining_filter_days
 *   entity_today_drinking_amount: sensor.my_fountain_today_s_water_consumption
 *   entity_yesterday_drinking_amount: sensor.my_fountain_yesterday_s_water_consumption
 *   entity_today_drinking_count: sensor.my_fountain_today_drinking_times
 *   entity_yesterday_drinking_count: sensor.my_fountain_yesterday_drinking_times
 *   entity_today_drinking_time: sensor.my_fountain_today_s_total_drinking_time
 *   entity_today_avg_time: sensor.my_fountain_today_s_average_drinking_time
 *   entity_battery_pct: sensor.my_fountain_battery_ac
 *   entity_battery_state: sensor.my_fountain_battery_level
 *   entity_barn_door_error: binary_sensor.my_fountain_barn_door_error
 *   entity_cleaning_reset: button.my_fountain_cleaning_reset
 *   entity_filter_reset: button.my_fountain_filter_reset
 * ─────────────────────────────────────────────────────────────────────────────
 */

class PetlibroFountainCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    if (!config.entity_prefix) {
      throw new Error('petlibro-fountain-card: entity_prefix is required');
    }
    this._config = {
      name: 'Petlibro Fountain',
      show_reset_buttons: false,
      cleaning_cycle_days: 30,
      filter_cycle_days: 30,
      battery_max: 100,
      ...config,
    };
    this._buildEntities();
    this._render();
  }

  _buildEntities() {
    const p = this._config.entity_prefix;
    const c = this._config;
    this._entities = {
      weight_percent:            c.entity_weight_percent            || `sensor.${p}_current_weight_percent`,
      remaining_cleaning_days:   c.entity_remaining_cleaning_days   || `sensor.${p}_remaining_cleaning_days`,
      remaining_filter_days:     c.entity_remaining_filter_days     || `sensor.${p}_remaining_filter_days`,
      today_drinking_amount:     c.entity_today_drinking_amount     || `sensor.${p}_today_s_water_consumption`,
      yesterday_drinking_amount: c.entity_yesterday_drinking_amount || `sensor.${p}_yesterday_s_water_consumption`,
      today_drinking_count:      c.entity_today_drinking_count      || `sensor.${p}_today_drinking_times`,
      yesterday_drinking_count:  c.entity_yesterday_drinking_count  || `sensor.${p}_yesterday_drinking_times`,
      today_drinking_time:       c.entity_today_drinking_time       || `sensor.${p}_today_s_total_drinking_time`,
      today_avg_time:            c.entity_today_avg_time            || `sensor.${p}_today_s_average_drinking_time`,
      battery_pct:               c.entity_battery_pct               || `sensor.${p}_battery_ac`,
      battery_state:             c.entity_battery_state             || `sensor.${p}_battery_level`,
      barn_door_error:           c.entity_barn_door_error           || `binary_sensor.${p}_barn_door_error`,
      cleaning_reset:            c.entity_cleaning_reset            || `button.${p}_cleaning_reset`,
      filter_reset:              c.entity_filter_reset              || `button.${p}_filter_reset`,
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _state(entityId) {
    if (!this._hass || !entityId) return null;
    const s = this._hass.states[entityId];
    return s || null;
  }

  _val(entityId, fallback = null) {
    const s = this._state(entityId);
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return fallback;
    return s.state;
  }

  _numVal(entityId, fallback = 0) {
    const v = this._val(entityId);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  _unit(entityId) {
    const s = this._state(entityId);
    return s?.attributes?.unit_of_measurement || '';
  }

  _formatSeconds(secs) {
    const s = parseInt(secs, 10) || 0;
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  }

  async _pressButton(entityId) {
    if (!this._hass || !entityId) return;
    try {
      await this._hass.callService('button', 'press', { entity_id: entityId });
    } catch (e) {
      console.error('petlibro-fountain-card: button press error', e);
    }
  }

  _batteryColor(pct) {
    if (pct <= 20) return '#ef5350';
    if (pct <= 50) return '#ff9800';
    return '#4caf50';
  }

  _waterColor(pct) {
    if (pct <= 15) return '#ef5350';
    if (pct <= 35) return '#ff9800';
    return '#29b6f6';
  }

  _daysColor(pct) {
    if (pct <= 20) return '#ef5350';
    if (pct <= 40) return '#ff9800';
    return '#66bb6a';
  }

  _render() {
    if (!this._config) return;
    const e = this._entities;
    const cfg = this._config;

    // Data
    const waterPct        = this._numVal(e.weight_percent, null);
    const cleanDays       = this._numVal(e.remaining_cleaning_days, null);
    const filterDays      = this._numVal(e.remaining_filter_days, null);
    const batteryPct      = this._numVal(e.battery_pct, null);
    const batteryState    = this._val(e.battery_state);
    const todayAmount     = this._numVal(e.today_drinking_amount, null);
    const yestAmount      = this._numVal(e.yesterday_drinking_amount, null);
    const todayCount      = this._numVal(e.today_drinking_count, null);
    const yestCount       = this._numVal(e.yesterday_drinking_count, null);
    const todayTime       = this._numVal(e.today_drinking_time, null);
    const todayAvg        = this._numVal(e.today_avg_time, null);
    const barnError       = this._val(e.barn_door_error) === 'on';
    const todayUnit       = this._unit(e.today_drinking_amount) || 'mL';
    const yestUnit        = this._unit(e.yesterday_drinking_amount) || 'mL';
    const waterUnit       = this._unit(e.weight_percent) || '%';

    const cleanPct  = cleanDays !== null ? Math.min(100, (cleanDays  / cfg.cleaning_cycle_days) * 100) : null;
    const filterPct = filterDays !== null ? Math.min(100, (filterDays / cfg.filter_cycle_days)  * 100) : null;
    const batPct    = batteryPct !== null ? Math.min(100, Math.max(0, batteryPct)) : null;
    const waterFill = waterPct  !== null ? Math.min(100, Math.max(0, waterPct)) : null;

    const hasBattery = batPct !== null;
    const hasWater   = waterFill !== null;
    const hasClean   = cleanPct !== null;
    const hasFilter  = filterPct !== null;

    // ── Water wave SVG path ──────────────────────────────────────────────────
    // fills from bottom; fill area = waterFill%
    const waveHtml = (fill) => {
      if (fill === null) return `<div class="water-no-data">No Data</div>`;
      const fillH = Math.max(0, Math.min(100, fill)); // %
      const yFill = 100 - fillH; // SVG viewBox 0–100, top of water
      // two sine waves offset
      const waveColor = this._waterColor(fill);
      return `
        <svg viewBox="0 0 200 200" preserveAspectRatio="none" class="water-svg">
          <defs>
            <clipPath id="clip-wave">
              <rect x="0" y="${yFill * 2}" width="200" height="${fillH * 2}"/>
            </clipPath>
          </defs>
          <!-- background fill -->
          <rect x="0" y="${yFill * 2}" width="200" height="${fillH * 2}"
                fill="${waveColor}" opacity="0.18"/>
          <!-- animated wave -->
          <g clip-path="url(#clip-wave)">
            <path class="wave1" fill="${waveColor}" opacity="0.55"
              d="M0,${yFill * 2 + 8}
                 Q25,${yFill * 2} 50,${yFill * 2 + 8}
                 Q75,${yFill * 2 + 16} 100,${yFill * 2 + 8}
                 Q125,${yFill * 2} 150,${yFill * 2 + 8}
                 Q175,${yFill * 2 + 16} 200,${yFill * 2 + 8}
                 V200 H0 Z"/>
            <path class="wave2" fill="${waveColor}" opacity="0.8"
              d="M0,${yFill * 2 + 12}
                 Q25,${yFill * 2 + 4} 50,${yFill * 2 + 12}
                 Q75,${yFill * 2 + 20} 100,${yFill * 2 + 12}
                 Q125,${yFill * 2 + 4} 150,${yFill * 2 + 12}
                 Q175,${yFill * 2 + 20} 200,${yFill * 2 + 12}
                 V200 H0 Z"/>
          </g>
          <!-- percent label -->
          <text x="100" y="${Math.max(yFill * 2 + 30, 30)}" text-anchor="middle"
                font-size="32" font-weight="bold"
                fill="${fillH < 30 ? '#263238' : '#fff'}"
                class="water-label">${Math.round(fill)}%</text>
        </svg>`;
    };

    const bar = (pct, color, label, value) => {
      if (pct === null) {
        return `
          <div class="bar-row">
            <span class="bar-label">${label}</span>
            <span class="bar-value muted">—</span>
          </div>`;
      }
      return `
        <div class="bar-row">
          <span class="bar-label">${label}</span>
          <span class="bar-value">${value}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.max(2, pct)}%;background:${color}"></div>
        </div>`;
    };

    const statRow = (icon, label, value, unit = '') => `
      <div class="stat-row">
        <span class="stat-icon">${icon}</span>
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value !== null ? `${value} ${unit}`.trim() : '—'}</span>
      </div>`;

    const resetBtn = (entityId, label, icon, color) => `
      <button class="reset-btn" data-entity="${entityId}"
              style="--btn-color:${color}" title="${label}">
        ${icon} ${label}
      </button>`;

    // ── HTML ─────────────────────────────────────────────────────────────────
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card {
          background: var(--ha-card-background, #1c1c1c);
          border-radius: 12px;
          padding: 16px;
          color: var(--primary-text-color, #e8e8e8);
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
          box-shadow: var(--ha-card-box-shadow, 0 2px 12px rgba(0,0,0,.4));
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .header-title {
          font-size: 1.1rem;
          font-weight: 600;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .online-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #4caf50;
          box-shadow: 0 0 6px #4caf50;
          flex-shrink: 0;
        }
        .error-badge {
          background: #ef5350;
          color: #fff;
          font-size: .7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          letter-spacing: .05em;
          animation: pulse 1.2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; } 50% { opacity: .5; }
        }
        .drop-icon { font-size: 1.3rem; }

        /* Water level */
        .water-section {
          display: flex;
          gap: 14px;
          margin-bottom: 14px;
          align-items: center;
        }
        .water-container {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #29b6f6;
          background: #102027;
          flex-shrink: 0;
          position: relative;
        }
        .water-svg {
          width: 100%;
          height: 100%;
        }
        .water-label { font-family: inherit; }
        .wave1 { animation: shift1 3s ease-in-out infinite alternate; }
        .wave2 { animation: shift2 4s ease-in-out infinite alternate; }
        @keyframes shift1 {
          from { transform: translateX(0); }
          to   { transform: translateX(-30px); }
        }
        @keyframes shift2 {
          from { transform: translateX(-20px); }
          to   { transform: translateX(20px); }
        }
        .water-no-data {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: .75rem; color: #78909c;
        }
        .water-info { flex: 1; min-width: 0; }
        .water-title {
          font-size: .75rem;
          color: #78909c;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }
        .water-subtitle {
          font-size: .82rem;
          color: #90a4ae;
        }

        /* Progress bars */
        .bars-section { margin-bottom: 14px; }
        .bar-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .bar-label { font-size: .8rem; color: #90a4ae; }
        .bar-value { font-size: .85rem; font-weight: 600; }
        .bar-value.muted { color: #546e7a; }
        .bar-track {
          height: 6px;
          background: rgba(255,255,255,.08);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width .6s ease;
        }

        /* Stats */
        .stats-section { margin-bottom: 14px; }
        .stats-title {
          font-size: .75rem;
          color: #78909c;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 8px;
        }
        .stat-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .stat-row:last-child { border-bottom: none; }
        .stat-icon { font-size: 1rem; width: 22px; text-align: center; flex-shrink: 0; }
        .stat-label { font-size: .83rem; color: #90a4ae; flex: 1; }
        .stat-value { font-size: .9rem; font-weight: 600; }

        /* Divider */
        .divider {
          height: 1px;
          background: rgba(255,255,255,.07);
          margin: 10px 0;
        }

        /* Reset buttons */
        .reset-section { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
        .reset-btn {
          flex: 1;
          min-width: 130px;
          padding: 8px 12px;
          border: 1px solid var(--btn-color);
          border-radius: 8px;
          background: transparent;
          color: var(--btn-color);
          font-size: .82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background .2s, color .2s;
          letter-spacing: .03em;
        }
        .reset-btn:hover {
          background: var(--btn-color);
          color: #fff;
        }
        .reset-btn:active { opacity: .7; }
      </style>

      <ha-card>
        <div class="card">
          <!-- Header -->
          <div class="header">
            <span class="drop-icon">💧</span>
            <span class="header-title">${cfg.name}</span>
            ${barnError ? '<span class="error-badge">⚠ ERROR</span>' : ''}
            <div class="online-dot"></div>
          </div>

          <!-- Water Level -->
          <div class="water-section">
            <div class="water-container">
              ${waveHtml(waterFill)}
            </div>
            <div class="water-info">
              <div class="water-title">Water Level</div>
              ${waterFill !== null
                ? `<div class="water-subtitle">${waterFill < 15 ? '⚠ Water Low!' : waterFill < 35 ? 'Getting low' : 'Good level'}</div>`
                : `<div class="water-subtitle muted">No data</div>`}
            </div>
          </div>

          <div class="divider"></div>

          <!-- Progress Bars -->
          <div class="bars-section">
            ${hasBattery ? bar(batPct, this._batteryColor(batPct),
                '🔋 Battery',
                batteryState ? `${Math.round(batPct)}% · ${batteryState}` : `${Math.round(batPct)}%`)
              : ''}
            ${bar(cleanPct, this._daysColor(cleanPct),
                '🧹 Cleaning',
                cleanDays !== null ? `${Math.round(cleanDays)} days left` : null)}
            ${bar(filterPct, this._daysColor(filterPct),
                '🔬 Filter',
                filterDays !== null ? `${Math.round(filterDays)} days left` : null)}
          </div>

          <div class="divider"></div>

          <!-- Today's Stats -->
          <div class="stats-section">
            <div class="stats-title">Today</div>
            ${statRow('💧', 'Water consumed', todayAmount !== null ? Math.round(todayAmount) : null, todayUnit)}
            ${statRow('🐾', 'Drinking sessions', todayCount, '')}
            ${statRow('⏱', 'Total drink time', todayTime !== null ? this._formatSeconds(todayTime) : null)}
            ${statRow('📊', 'Avg session length', todayAvg !== null ? this._formatSeconds(todayAvg) : null)}
          </div>

          <div class="divider"></div>

          <!-- Yesterday's Stats -->
          <div class="stats-section">
            <div class="stats-title">Yesterday</div>
            ${statRow('💧', 'Water consumed', yestAmount !== null ? Math.round(yestAmount) : null, yestUnit)}
            ${statRow('🐾', 'Drinking sessions', yestCount, '')}
          </div>

          ${cfg.show_reset_buttons ? `
            <div class="divider"></div>
            <div class="reset-section">
              ${resetBtn(e.cleaning_reset, 'Cleaning Reset', '🧹', '#26c6da')}
              ${resetBtn(e.filter_reset,   'Filter Reset',   '🔬', '#7e57c2')}
            </div>` : ''}
        </div>
      </ha-card>
    `;

    // Attach reset button listeners
    this.shadowRoot.querySelectorAll('.reset-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const entityId = btn.dataset.entity;
        const label = btn.textContent.trim();
        btn.disabled = true;
        btn.style.opacity = '0.5';
        await this._pressButton(entityId);
        setTimeout(() => {
          btn.disabled = false;
          btn.style.opacity = '1';
        }, 3000);
      });
    });
  }

  getCardSize() { return 6; }

  static getConfigElement() { return document.createElement('div'); }

  static getStubConfig() {
    return {
      type: 'custom:petlibro-fountain-card',
      entity_prefix: 'dockstream_smart_fountain',
      name: 'Cat Fountain',
      show_reset_buttons: false,
    };
  }
}

customElements.define('petlibro-fountain-card', PetlibroFountainCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'petlibro-fountain-card',
  name:        'Petlibro Fountain Card',
  description: 'Status card for Petlibro Dockstream water fountains',
  preview:     false,
});
