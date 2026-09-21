# Iron Shell

3D browser game: **drive a tank** through a ruined desert outpost and blast waves of invading aliens. Chase camera follows the hull so the terrain rolls past you.

## Play

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` (needs a local server for ES modules).

## Controls

| Input | Action |
| --- | --- |
| W / S or ↑ ↓ | Drive forward / reverse |
| A / D or ← → | Steer |
| Mouse | Aim turret |
| Space or click / hold | Fire |
| On-screen pads | Mobile drive + fire |
| Enter | Start / continue / redeploy |

## Features

- Three.js chase-cam desert drive
- Dune terrain, ruined buildings, water tower, dusk sky + fog
- Procedural tank with independent turret aim
- Billboard alien swarm (scout / brute / razor / orb)
- Hull integrity, repair pickups, waves, local high score

## Layout

```
index.html                 UI shell + Three import map
css/styles.css             HUD and stage
js/game.js                 Three.js scene + gameplay
assets/ground-sand.jpg     Terrain texture
assets/alien-*.png         Alien billboard sprites
icons/favicon.svg
```
