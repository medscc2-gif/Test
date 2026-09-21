# Iron Shell

Browser game: drive a tank across a desert veldt and blast waves of invading aliens.

## Play

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Controls

| Input | Action |
| --- | --- |
| A / D or ← → | Move tank |
| Space or click / hold | Fire |
| Mouse X | Aim turret |
| On-screen pads | Mobile move + fire |
| Enter | Start / continue / redeploy |

## Features

- Wave-based alien swarm with scouts, brutes, razors, and orbs
- Hull integrity (3 hits), brief invulnerability after damage
- Occasional repair pickups
- Score + local high score
- Screen shake, muzzle flash, and breach-sky atmosphere

## Layout

```
index.html       UI shell + overlay
css/styles.css   HUD and stage
js/game.js       Canvas engine + gameplay
icons/favicon.svg
```
