# Hyperlocal Community Barter Prototype

This repository contains a very small prototype server implementing core
features from the PRD:

- User signup and login
- Create barter posts with category and geolocation
- Search posts by category, keyword and radius
- Minimal HTML frontend at `/` for manual interaction

Data is stored in a simple JSON file (`data.json`) and authentication uses
random tokens kept in memory. It is intended for demonstration purposes only.

## Running

```bash
npm start
```

Then open `http://localhost:3000` in a browser.

## Testing

```bash
npm test
```

The test script performs a signup, login, post creation and list retrieval.
