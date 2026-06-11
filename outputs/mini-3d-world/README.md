# Mini 3D City World

Static Three.js diorama modeled from `assets/source-city.png`.

## Local Preview

```powershell
python -m http.server 5177 --directory .
```

Open `http://127.0.0.1:5177`.

## GitHub Pages

1. Create a new GitHub repository.
2. Copy this folder into the repository root.
3. Push to `main`.
4. In GitHub, set Pages to use GitHub Actions.

The included workflow deploys the static files directly. No build step or package install is required.

## Files

- `index.html` loads the app and pins Three.js from the CDN.
- `styles.css` contains the responsive interface.
- `src/main.js` builds the interactive model.
- `assets/source-city.png` is the screenshot reference texture.