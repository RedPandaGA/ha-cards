# Redpanda Lovelace Cards

Custom Lovelace cards for Home Assistant.

## Cards included

| Card | Element | Integration required |
|---|---|---|
| **Petlibro Fountain** | `petlibro-fountain-card` | [jjjonesjr33/petlibro](https://github.com/jjjonesjr33/petlibro) |
| **Petlibro Feeder** | `petlibro-feeder-card` | [jjjonesjr33/petlibro](https://github.com/jjjonesjr33/petlibro) |
| **Levoit Vital 200S** | `levoit-vital200s-card` | Redpanda Vesync Integration |
| **LG Washer/Dryer** | `lg-washer-dryer-card` | [ha-smartthinq-sensors](https://github.com/ollo69/ha-smartthinq-sensors) |

---

## Installation via HACS

1. Open HACS → Frontend
2. Click **⋮ → Custom Repositories**
3. Add your repo URL, category: **Lovelace**
4. Click **Download** on the Redpanda Lovelace Cards card
5. Reload your browser

HACS registers the resource automatically — no manual resource entry needed.

---

## Manual installation

1. Download `dist/redpanda-lovelace-cards.js` from the latest release
2. Copy to `config/www/redpanda-lovelace-cards.js`
3. Settings → Dashboards → ⋮ → Resources → Add resource
   - URL: `/local/redpanda-lovelace-cards.js`
   - Type: JavaScript module
4. Reload browser

---

## Card usage

### Petlibro Fountain
```yaml
type: custom:petlibro-fountain-card
entity_prefix: dockstream_fountain
```

### Petlibro Feeder
```yaml
type: custom:petlibro-feeder-card
entity_prefix: granary_feeder
name: "My Feeder"
```

### Levoit Vital 200S
```yaml
type: custom:levoit-vital200s-card
fan_entity: fan.cat_room
pm25_entity: sensor.cat_room_pm2_5
filter_entity: sensor.cat_room_filter_life
aq_entity: sensor.cat_room_air_quality
display_entity: switch.cat_room_display
child_lock_entity: switch.cat_room_child_lock
light_detect_entity: switch.cat_room_light_detection
auto_pref_entity: select.cat_room_auto_preference
```

### LG Washer/Dryer
```yaml
type: custom:lg-washer-dryer-card
washer_entity: sensor.washer_run_state
dryer_entity: sensor.dryer_run_state
```

---

## Development — editing cards

Each card lives in its own file under `src/`. Edit them individually, then rebuild the bundle — requires only Python 3, no installs:

```bash
python3 build.py
```

Commit both the edited `src/` file and the regenerated `dist/redpanda-lovelace-cards.js`, then create a new GitHub release to make the update available in HACS.

### Release checklist
1. Edit card(s) in `src/`
2. Bump the version number in `version.txt`
3. `python3 build.py`
4. `git add src/ dist/ version.txt && git commit -m "v1.x.x — description"`
5. `git tag v1.x.x && git push && git push --tags`
6. Create a GitHub Release from the tag
