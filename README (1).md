# 🛒 Product Sort Game — Web Port

> **Originally built:** December 2025 · C# WinForms · Data Structures & Algorithms finals project  
> **Web port:** June 2026 · Vanilla JS · Drag-and-drop, mobile-touch-aware, GitHub Pages ready

A falling-item sorting game. Products drop from the top — drag each one into the correct basket (Fruit, Vegetable, or Dairy) before they hit the floor. Miss too many and it's game over.

---

## 🎮 Play Now

**[▶ Launch Game](https://abaldosado.github.io/product-sort-game/)**

---

## Gameplay

| Rule | Detail |
|------|--------|
| Correct sort | **+10 points** |
| Missed or wrong | **−1 heart** (start: 5 hearts, max: 10) |
| 5 correct in a row | **+1 heart** |
| Every 200 points | Speed increases (~5% faster per milestone) |
| Game over | Reach 0 hearts |

---

## Project Structure

```
product-sort-game/
├── index.html        ← entire game (HTML + CSS + JS, single file)
├── images/
│   ├── basket.png
│   ├── Apple.png
│   ├── Banana.png
│   ├── Broccoli.png
│   ├── Butter.png
│   ├── Carrot.png
│   ├── Cheese.png
│   ├── Cream.png
│   ├── Cucumber.png
│   ├── Grape.png
│   ├── Mango.png
│   ├── Milk.png
│   ├── Orange.png
│   ├── Potato.png
│   ├── Tomato.png
│   └── Yogurt.png
└── sounds/
    ├── Bgmusic.wav
    ├── Click.wav
    ├── Correct.wav
    ├── Wrong.wav
    ├── Levelup.wav
    └── Gameover.wav
```

---

## Run Locally

Just open `index.html` in any browser. No build step, no dependencies.

> **Note:** Browsers block `file://` audio autoplay. Run via a local server for sound:
> ```bash
> npx serve .
> # or
> python -m http.server 8080
> ```

---

## Deploy to GitHub Pages

1. Create a new repo (e.g. `product-sort-game`)
2. Push all files maintaining the folder structure above
3. **Settings → Pages → Branch: `main` → Folder: `/ (root)` → Save**
4. Live at `https://<your-username>.github.io/product-sort-game/`

---

## Original (C# WinForms)

The original version is preserved in the [`winforms/`](./winforms/) branch.  
Requires **Visual Studio 2022** and **.NET Framework 4.8** to build and run.

---

## Tech

- Vanilla JS — no frameworks, no bundler
- `requestAnimationFrame` game loop with delta-time for smooth 60fps falling
- Mouse + Touch drag-and-drop with CSS transform scale for responsive layout
- `localStorage` for persistent high score
- Single `index.html` — fully self-contained
