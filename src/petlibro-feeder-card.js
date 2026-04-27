/**
 * PetLibro Feeder Card — Custom Lovelace Card
 * For use with the jjjonesjr33/petlibro HA integration.
 *
 * Config:
 *   type: custom:petlibro-feeder-card
 *   entity_prefix: granary_feeder     # Required: slug from HA entity IDs
 *   name: "My Feeder"                 # Optional: display name override
 *   unit: weight                      # Optional: "weight" (default) or "volume"
 *   # Optional entity overrides (if integration names differ):
 *   entity_online:            binary_sensor.granary_feeder_wi_fi
 *   entity_battery_pct:       sensor.granary_feeder_battery_ac
 *   entity_battery_state:     sensor.granary_feeder_battery_level
 *   entity_food_low:          binary_sensor.granary_feeder_food_status
 *   entity_dispensing:        binary_sensor.granary_feeder_food_dispenser
 *   entity_feed_times_today:  sensor.granary_feeder_today_feeding_times
 *   entity_fed_weight_today:  sensor.granary_feeder_today_feeding_quantity_weight
 *   entity_fed_volume_today:  sensor.granary_feeder_today_feeding_quantity_volume
 *   entity_last_feed_time:    sensor.granary_feeder_last_feed_time
 *   entity_last_feed_weight:  sensor.granary_feeder_last_feed_quantity_weight
 *   entity_last_feed_volume:  sensor.granary_feeder_last_feed_quantity_volume
 *   entity_next_feed_time:    sensor.granary_feeder_next_feed_time
 *   entity_next_feed_weight:  sensor.granary_feeder_next_feed_quantity_weight
 *   entity_next_feed_volume:  sensor.granary_feeder_next_feed_quantity_volume
 *   entity_schedule_enabled:  binary_sensor.granary_feeder_feeding_schedule
 *   entity_feed_qty_number:   number.granary_feeder_manual_feed_quantity
 *   entity_feed_button:       button.granary_feeder_manual_feed
 */

class PetLibroFeederCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._localQty = null; // tracks optimistic quantity before hass sync
  }

  // ── Config ──────────────────────────────────────────────────────────────
  setConfig(config) {
    if (!config.entity_prefix && !config.entity_online) {
      throw new Error("petlibro-feeder-card: 'entity_prefix' is required.");
    }
    this._config = config;
    this._prefix = config.entity_prefix || "";
    this._name = config.name || this._titleFromPrefix(this._prefix);
    this._unit = config.unit === "volume" ? "volume" : "weight";
    this._buildEntityMap();
    this._render();
  }

  _titleFromPrefix(prefix) {
    return prefix.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  _buildEntityMap() {
    const p = this._prefix;
    const c = this._config;
    this._e = {
      online:           c.entity_online          || `binary_sensor.${p}_wi_fi`,
      batteryPct:       c.entity_battery_pct     || `sensor.${p}_battery_ac`,
      batteryState:     c.entity_battery_state   || `sensor.${p}_battery_level`,
      foodLow:          c.entity_food_low        || `binary_sensor.${p}_food_status`,
      dispensing:       c.entity_dispensing      || `binary_sensor.${p}_food_dispenser`,
      feedTimesToday:   c.entity_feed_times_today|| `sensor.${p}_today_feeding_times`,
      fedWeightToday:   c.entity_fed_weight_today|| `sensor.${p}_today_feeding_quantity_weight`,
      fedVolumeToday:   c.entity_fed_volume_today|| `sensor.${p}_today_feeding_quantity_volume`,
      lastFeedTime:     c.entity_last_feed_time  || `sensor.${p}_last_feed_time`,
      lastFeedWeight:   c.entity_last_feed_weight|| `sensor.${p}_last_feed_quantity_weight`,
      lastFeedVolume:   c.entity_last_feed_volume|| `sensor.${p}_last_feed_quantity_volume`,
      nextFeedTime:     c.entity_next_feed_time  || `sensor.${p}_next_feed_time`,
      nextFeedWeight:   c.entity_next_feed_weight|| `sensor.${p}_next_feed_quantity_weight`,
      nextFeedVolume:   c.entity_next_feed_volume|| `sensor.${p}_next_feed_quantity_volume`,
      scheduleEnabled:  c.entity_schedule_enabled|| `binary_sensor.${p}_feeding_schedule`,
      feedQtyNumber:    c.entity_feed_qty_number || `number.${p}_manual_feed_quantity`,
      feedButton:       c.entity_feed_button     || `button.${p}_manual_feed`,
    };
  }

  // ── Hass ─────────────────────────────────────────────────────────────────
  set hass(hass) {
    this._hass = hass;
    // Sync local qty from number entity on first load
    if (this._localQty === null) {
      const numState = hass.states[this._e.feedQtyNumber];
      if (numState) this._localQty = parseInt(numState.state) || 1;
      else this._localQty = 1;
    }
    this._render();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _state(entityId) {
    const s = this._hass?.states[entityId];
    return s ? s.state : null;
  }

  _isOn(entityId) {
    return this._state(entityId) === "on";
  }

  _attr(entityId, attr) {
    const s = this._hass?.states[entityId];
    return s?.attributes?.[attr] ?? null;
  }

  _numAttr(entityId, attr, fallback = null) {
    const v = this._attr(entityId, attr);
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  _numState(entityId, fallback = null) {
    const v = this._state(entityId);
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  _formatTime(entityId) {
    const raw = this._state(entityId);
    if (!raw || raw === "unknown" || raw === "unavailable") return "—";
    try {
      const d = new Date(raw);
      if (isNaN(d)) return raw;
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return raw;
    }
  }

  _feedAmountLabel(weightEntityId, volumeEntityId) {
    if (this._unit === "volume") {
      const v = this._numState(volumeEntityId);
      return v !== null ? `${v} ml` : "—";
    } else {
      const w = this._numState(weightEntityId);
      return w !== null ? `${w} g` : "—";
    }
  }

  _numberMeta(entityId) {
    const s = this._hass?.states[entityId];
    if (!s) return { min: 1, max: 16, step: 1 };
    return {
      min:  parseFloat(s.attributes.min  ?? 1),
      max:  parseFloat(s.attributes.max  ?? 16),
      step: parseFloat(s.attributes.step ?? 1),
    };
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  _feedNow() {
    if (!this._hass) return;
    // First set the quantity on the number entity, then press the button
    this._hass.callService("number", "set_value", {
      entity_id: this._e.feedQtyNumber,
      value: this._localQty,
    });
    // Small delay so HA processes the number first
    setTimeout(() => {
      this._hass.callService("button", "press", {
        entity_id: this._e.feedButton,
      });
    }, 300);
    // Flash feedback
    this._flashFeedButton();
  }

  _flashFeedButton() {
    const btn = this.shadowRoot.querySelector(".feed-btn");
    if (!btn) return;
    btn.classList.add("feeding");
    btn.textContent = "Feeding…";
    setTimeout(() => {
      btn.classList.remove("feeding");
      btn.textContent = "Feed Now";
    }, 3000);
  }

  _changeQty(delta) {
    const { min, max, step } = this._numberMeta(this._e.feedQtyNumber);
    const cur = this._localQty ?? 1;
    const next = Math.min(max, Math.max(min, cur + delta * step));
    this._localQty = next;
    // Update number entity optimistically
    this._hass?.callService("number", "set_value", {
      entity_id: this._e.feedQtyNumber,
      value: next,
    });
    this._render();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    if (!this._config) return;
    const h = this._hass;

    // --- Data extraction ---
    const online     = this._isOn(this._e.online);
    const batPct     = this._numState(this._e.batteryPct);
    const batState   = this._state(this._e.batteryState) || "";
    const foodLow    = this._isOn(this._e.foodLow);
    const dispensing = this._isOn(this._e.dispensing);

    const feedTimesToday = this._numState(this._e.feedTimesToday, 0);
    const todayLabel     = this._feedAmountLabel(this._e.fedWeightToday, this._e.fedVolumeToday);

    const lastTime   = this._formatTime(this._e.lastFeedTime);
    const lastAmt    = this._feedAmountLabel(this._e.lastFeedWeight, this._e.lastFeedVolume);

    const nextTime   = this._formatTime(this._e.nextFeedTime);
    const nextAmt    = this._feedAmountLabel(this._e.nextFeedWeight, this._e.nextFeedVolume);
    const hasNext    = nextTime !== "—";

    const schedEnabled = this._isOn(this._e.scheduleEnabled);

    const qty = this._localQty ?? 1;
    const { min, max } = this._numberMeta(this._e.feedQtyNumber);

    // --- Battery bar ---
    const batPctClamped = batPct !== null ? Math.max(0, Math.min(100, batPct)) : null;
    const batColor = batPctClamped === null ? "#888"
      : batPctClamped > 50 ? "#4caf50"
      : batPctClamped > 20 ? "#ff9800"
      : "#f44336";
    const batLabel = batPctClamped !== null
      ? `${batPctClamped}% ${batState ? `· ${batState}` : ""}`
      : batState || "—";
    const batWidth = batPctClamped !== null ? `${batPctClamped}%` : "0%";

    // --- HTML ---
    this.shadowRoot.innerHTML = `
<style>
  :host {
    display: block;
    font-family: var(--primary-font-family, "Roboto", sans-serif);
  }
  .card {
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,.12));
    overflow: hidden;
    color: var(--primary-text-color, #212121);
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 10px;
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.08));
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .icon { font-size: 1.5em; line-height: 1; }
  .title {
    font-size: 1.05em;
    font-weight: 600;
    letter-spacing: .01em;
  }
  .status-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: .78em;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 20px;
    background: ${online ? "rgba(76,175,80,.15)" : "rgba(158,158,158,.15)"};
    color: ${online ? "#388e3c" : "#757575"};
  }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: ${online ? "#4caf50" : "#9e9e9e"};
    ${online ? "animation: pulse 2s infinite;" : ""}
  }
  @keyframes pulse {
    0%,100% { opacity: 1; } 50% { opacity: .5; }
  }

  /* Battery */
  .battery-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--secondary-background-color, rgba(0,0,0,.03));
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.06));
  }
  .bat-icon { font-size: 1.1em; }
  .bat-track {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: var(--divider-color, #e0e0e0);
    overflow: hidden;
  }
  .bat-fill {
    height: 100%;
    border-radius: 4px;
    background: ${batColor};
    width: ${batWidth};
    transition: width .4s ease;
  }
  .bat-label {
    font-size: .8em;
    color: var(--secondary-text-color, #757575);
    min-width: 60px;
    text-align: right;
  }

  /* Food Low Banner */
  .food-low-banner {
    display: ${foodLow ? "flex" : "none"};
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(244,67,54,.1);
    color: #c62828;
    font-size: .85em;
    font-weight: 600;
    border-bottom: 1px solid rgba(244,67,54,.2);
  }

  /* Dispensing Banner */
  .dispensing-banner {
    display: ${dispensing ? "flex" : "none"};
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    background: rgba(33,150,243,.1);
    color: #1565c0;
    font-size: .82em;
    font-weight: 600;
    border-bottom: 1px solid rgba(33,150,243,.2);
    animation: blink .8s step-start infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.5} }

  /* Stats section */
  .stats {
    padding: 12px 16px;
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.06));
  }
  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .stats-row:last-child { margin-bottom: 0; }
  .stat-label {
    font-size: .78em;
    color: var(--secondary-text-color, #757575);
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .stat-value {
    font-size: .95em;
    font-weight: 500;
  }

  /* Feed schedule rows */
  .feed-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 16px;
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.04));
  }
  .feed-row-label {
    font-size: .78em;
    color: var(--secondary-text-color, #757575);
    text-transform: uppercase;
    letter-spacing: .04em;
    width: 48px;
    flex-shrink: 0;
  }
  .feed-time {
    font-size: .95em;
    font-weight: 500;
    flex: 1;
  }
  .feed-amt {
    font-size: .85em;
    color: var(--secondary-text-color, #757575);
  }
  .next-badge {
    display: ${hasNext ? "inline-block" : "none"};
    font-size: .68em;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    background: rgba(33,150,243,.15);
    color: #1565c0;
    letter-spacing: .03em;
  }

  /* Manual feed */
  .manual-feed {
    padding: 12px 16px;
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.06));
  }
  .manual-feed-title {
    font-size: .75em;
    color: var(--secondary-text-color, #757575);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 8px;
  }
  .manual-feed-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .qty-group {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }
  .qty-btn {
    background: none;
    border: none;
    padding: 0 12px;
    height: 36px;
    font-size: 1.2em;
    cursor: pointer;
    color: var(--primary-text-color, #212121);
    transition: background .15s;
  }
  .qty-btn:hover { background: var(--secondary-background-color, rgba(0,0,0,.06)); }
  .qty-btn:disabled { opacity: .35; cursor: default; }
  .qty-display {
    padding: 0 12px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .95em;
    font-weight: 600;
    border-left: 1px solid var(--divider-color, #e0e0e0);
    border-right: 1px solid var(--divider-color, #e0e0e0);
    min-width: 64px;
  }
  .feed-btn {
    flex: 1;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: var(--primary-color, #03a9f4);
    color: #fff;
    font-size: .9em;
    font-weight: 600;
    letter-spacing: .03em;
    cursor: pointer;
    transition: opacity .15s, background .15s;
  }
  .feed-btn:hover { opacity: .88; }
  .feed-btn.feeding { background: #888; cursor: default; }
  .feed-btn:disabled { opacity: .4; cursor: default; }

  /* Footer */
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: .78em;
    color: var(--secondary-text-color, #757575);
  }
  .sched-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 10px;
    background: ${schedEnabled ? "rgba(76,175,80,.12)" : "rgba(158,158,158,.12)"};
    color: ${schedEnabled ? "#388e3c" : "#9e9e9e"};
    font-weight: 500;
  }
</style>

<div class="card">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <span class="icon">🐾</span>
      <span class="title">${this._name}</span>
    </div>
    <div class="status-pill">
      <div class="status-dot"></div>
      ${online ? "Online" : "Offline"}
    </div>
  </div>

  <!-- Battery -->
  <div class="battery-row">
    <span class="bat-icon">🔋</span>
    <div class="bat-track"><div class="bat-fill"></div></div>
    <span class="bat-label">${batLabel}</span>
  </div>

  <!-- Food Low Banner -->
  <div class="food-low-banner">⚠️ Food Hopper Low — Refill Needed</div>

  <!-- Dispensing Banner -->
  <div class="dispensing-banner">⚡ Dispensing Now…</div>

  <!-- Today's Stats -->
  <div class="stats">
    <div class="stats-row">
      <span class="stat-label">Today</span>
      <span class="stat-value">${feedTimesToday} feeding${feedTimesToday !== 1 ? "s" : ""} · ${todayLabel}</span>
    </div>
  </div>

  <!-- Last Feed -->
  <div class="feed-row">
    <span class="feed-row-label">Last</span>
    <span class="feed-time">${lastTime}</span>
    <span class="feed-amt">${lastAmt}</span>
  </div>

  <!-- Next Feed -->
  <div class="feed-row" style="background:${hasNext ? "rgba(33,150,243,.04)" : "transparent"}">
    <span class="feed-row-label">Next</span>
    <span class="feed-time">${nextTime}</span>
    <span class="feed-amt">${nextAmt}</span>
    <span class="next-badge">NEXT</span>
  </div>

  <!-- Manual Feed -->
  <div class="manual-feed">
    <div class="manual-feed-title">Manual Feed</div>
    <div class="manual-feed-controls">
      <div class="qty-group">
        <button class="qty-btn dec-btn" ${qty <= min ? "disabled" : ""}>−</button>
        <div class="qty-display">${qty} portion${qty !== 1 ? "s" : ""}</div>
        <button class="qty-btn inc-btn" ${qty >= max ? "disabled" : ""}>+</button>
      </div>
      <button class="feed-btn" ${!online ? "disabled" : ""}>Feed Now</button>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Schedule</span>
    <span class="sched-pill">${schedEnabled ? "✓ Enabled" : "✗ Disabled"}</span>
  </div>

</div>`;

    // Attach events after render
    this.shadowRoot.querySelector(".dec-btn")?.addEventListener("click", () => this._changeQty(-1));
    this.shadowRoot.querySelector(".inc-btn")?.addEventListener("click", () => this._changeQty(1));
    this.shadowRoot.querySelector(".feed-btn")?.addEventListener("click", () => {
      if (!online) return;
      this._feedNow();
    });
  }

  // ── Card size hint for Lovelace layout ───────────────────────────────────
  getCardSize() { return 4; }

  // ── Editor stub (optional, for UI editor) ────────────────────────────────
  static getConfigElement() { return document.createElement("div"); }
  static getStubConfig() {
    return { entity_prefix: "granary_feeder", name: "Granary Feeder" };
  }
}

customElements.define("petlibro-feeder-card", PetLibroFeederCard);

// Register card in Lovelace custom card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type:        "petlibro-feeder-card",
  name:        "PetLibro Feeder Card",
  description: "Status & control card for PetLibro smart feeders (jjjonesjr33/petlibro integration).",
  preview:     true,
});
