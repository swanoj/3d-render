# 3D Render

A browser-based 3D rendering project: Vite, React and React Three Fiber (three.js), deployed on Vercel.

The starter renders one lit object in a studio you can orbit. Replace the scene in `src/App.tsx` with the real one.

## Run it

Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check, then build to dist/
npm run lint     # Oxlint
npm run preview  # serve the build locally
```

## Deploy

Vercel project `3d-render` in the `os3` team, linked to this repository. A push to `main` deploys production; every other branch gets a preview deployment.

## Stack

- [three](https://threejs.org) renders.
- [@react-three/fiber](https://r3f.docs.pmnd.rs) writes the scene as React components.
- [@react-three/drei](https://drei.docs.pmnd.rs) provides the camera controls, studio lighting and contact shadow.

The lighting is a set of `Lightformer` softboxes rendered into the environment map, so the page fetches no HDR files from a CDN.
