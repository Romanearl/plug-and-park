# Spot photos

Real photos for the charging spots go in this folder. Until a spot has a photo here, the app shows a generated illustration, so the demo always looks complete.

**Only use your own photos, or free-licence photos you're allowed to reuse.** Never hot-link images from other websites.

## 1. Name the files

`<spotId>-<n>.jpg`, where `n` starts at 1. The spot ids are in `src/data/seed.ts`. For example:

```
sp_kwuntong_1-1.jpg
sp_kwuntong_1-2.jpg
sp_saikung_1-1.jpg
```

## 2. Size them

- 1200×800 pixels (3:2, landscape), JPEG.
- **Under 250 KB** each. Squoosh (squoosh.app) at quality 70–75 usually gets there.
- No faces or number plates.

## 3. Add them to `manifest.json`

The app shows only photos listed in the manifest, in this order:

```json
{
  "sp_kwuntong_1": ["sp_kwuntong_1-1.jpg", "sp_kwuntong_1-2.jpg"],
  "sp_saikung_1": ["sp_saikung_1-1.jpg"]
}
```

A spot can have fewer photos than its carousel slots; the rest stay illustrations. A missing or broken file falls back to the illustration silently.

## 4. Credit every photo

Add one line per photo to the **Photo credits** section of the main `README.md`:

```
- sp_kwuntong_1-1.jpg — photo by <name>, <licence or "own photo">
```
