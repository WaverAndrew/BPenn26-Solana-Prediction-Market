# Video backgrounds

Drop `.mp4` files here. Next.js serves them from `/videos/`.

## Lookup order (per card)

1. `market-{id}.mp4` — exact match for that market (e.g. `market-1.mp4`)
2. `{category}.mp4`  — fallback for all markets in that category
3. Animated gradient  — shown if no video file is found

## Category filenames

| File              | Category        |
|-------------------|-----------------|
| `politics.mp4`    | Politics (0)    |
| `sports.mp4`      | Sports (1)      |
| `crypto.mp4`      | Crypto (2)      |
| `entertainment.mp4` | Entertainment (3) |
| `science.mp4`     | Science (4)     |
| `world.mp4`       | Other (5)       |

## Tips

- Keep files under ~10 MB — they loop continuously
- Short clips (5–15 s) loop more seamlessly
- Portrait or landscape both work; the player uses `object-cover`
- Free sources: Pexels (pexels.com/videos), Mixkit (mixkit.co), Coverr (coverr.co)
