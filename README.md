# Anatomy Lab Study

A visual study app for anatomy lab practicals. It's plain HTML/CSS/JS with no build step, hosted on GitHub Pages, and it installs to an iPhone home screen.

**Games** (every game uses the same topic data): Picture Flashcards · Matching (term → definition or picture) · Label the Diagram · Quick Quiz · Weak Spots

Progress is stored in the browser's `localStorage` on the device. Nothing is uploaded, and there are no accounts.

## Adding a topic

1. Copy `decks/blood-vessels.js` to a new file, e.g. `decks/brain.js`, and edit it. The comment at the top explains each field.
2. Add the file name to `decks/index.js`.
3. Commit and push. The new topic appears on the home screen.

To use a real photo instead of the drawn diagram, put it in `images/` and give the term `img: "images/your-photo.jpg"`.
A photo-based topic can also be used for Label the Diagram: add a shape `{ image: "images/x.jpg", x: 0, y: 0, w: 800, h: 600 }` to the diagram and give each label `at: [x, y]` instead of `vessel` / `t`.

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell |
| `css/app.css` | All styles |
| `js/app.js` | Router, home screen, topic page |
| `js/games.js` | The five games |
| `js/diagram.js` | Draws diagrams (tapered vessels, glowing highlight) |
| `js/dnd.js` | Touch drag-and-drop (plus tap-to-place) |
| `js/store.js` | Progress saved in localStorage |
| `decks/` | Topic content |
| `sw.js` | Offline support (network-first, so updates show up right away) |

## Run locally

```
python -m http.server 8000
```

Then open http://localhost:8000.
