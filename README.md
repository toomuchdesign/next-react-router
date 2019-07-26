# Next.js + react-router

- Install Next.js as usual
- Configure custom `server.js` to redirect any request to same single entrypoint
- Declare a `with-react-router` HOC to wrap the app with `react-router` browser or static router
- Wrap the app with `with-react-router` HOC on page initialization with a custom  `./pages/_app.js` component
- `react-router` is now able to universal render replacing native Next.js routing system
