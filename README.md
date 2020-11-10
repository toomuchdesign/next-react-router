# Next.js + react-router

This repo documents an attempt of using [Next.js](https://github.com/zeit/next.js/) (preserving native SSR features) with the following setup:

- Single entry point (like [Create React App](https://github.com/facebook/create-react-app) and [Hops](https://github.com/xing/hops)). No file system-based routing
- [react-router](https://github.com/ReactTraining/react-router) as only routing system

This document is available as:
- [GitHub repository](https://github.com/toomuchdesign/next-react-router)
- [dev.to post](https://dev.to/toomuchdesign/next-js-react-router-2kl8)

## Disclaimers

- Next.js team strongly advises against this approach.
- This experiment was carried out at the times of Next.js v9.3: the framework has changed a lot since then.

## Part one, basic setup

### 1 - Install Next.js

Relevant [repo commit][1-initial-setup].

[Install NextJS](https://nextjs.org/docs#setup) as usual and create the **single entry point** file at `pages/index.js`.

### 2 - Redirect all requests to single entrypoint

Relevant [repo commit][2-redirect-to-entrypoint].

In order to skip file system-based routing, we'll configure a [custom Next.js server](https://nextjs.org/docs#custom-server-and-routing) to forward all the requests to our single entrypoint.

We'll use Next.js [`Server.render` method](https://github.com/zeit/next.js/blob/2b1a5c3eb4f67a30e1a9000d7d21e14bbe536687/packages/next-server/server/next-server.ts#L405) to render and serve the entrypoint.

```js
// server.js
const express = require('express');
const nextJS = require('next');

async function start() {
  const dev = process.env.NODE_ENV !== 'production';
  const app = nextJS({dev});
  const server = express();
  await app.prepare();

  // Redirect all requests to main entrypoint pages/index.js
  server.get('/*', async (req, res, next) => {
    try {
      app.render(req, res, '/');
    } catch (e) {
      next(e);
    }
  });

  server.listen(3000, err => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:3000`);
  });
}

start();
```

Run the dev server, and the entrypoint page at `pages/index.js` should be served as response for any requested url. 👊

### 3 - Introduce react-router

Relevant [repo commit][3-introduce-react-router].

In order to get different responses according to the requested url we need a routing system.

We'll use `react-router` (see it's [docs about SSR](https://reacttraining.com/react-router/web/guides/server-rendering)) and wrap the application with a `StaticRouter` or a `BrowserRouter` based on the environment application environment (server or browser).

Install `react-router` and `react-router-dom`:

```
npm i react-router react-router-dom -S
```

...and update the `pages/index.js` entrypoint to use some `Link` and `Route` components from `react-router-dom` (see repo).

Let's now declare a `withReactRouter` HOC to wrap the application with the proper router:

```js
// next/with-react-router.js
import React from 'react';
import {BrowserRouter} from 'react-router-dom';
const isServer = typeof window === 'undefined';

export default App => {
  return class AppWithReactRouter extends React.Component {
    render() {
      if (isServer) {
        const {StaticRouter} = require('react-router');
        return (
          <StaticRouter
            location={this.props.router.asPath}
          >
            <App {...this.props} />
          </StaticRouter>
        );
      }
      return (
        <BrowserRouter>
          <App {...this.props} />
        </BrowserRouter>
      );
    }
  };
};
```

...and wrap the application with `withReactRouter` HOC:

```js
// pages/_app.js
import App, {Container} from 'next/app';
import React from 'react';
import withReactRouter from '../next/with-react-router';

class MyApp extends App {
  render() {
    const {Component, pageProps} = this.props;
    return (
      <Container>
        <Component {...pageProps} />
      </Container>
    );
  }
}

export default withReactRouter(MyApp);
```

Run the dev server, and you should be able to see your routes live and server side rendered.

## Part two, context information

One of my favourite `react-router` features consists of the possibility of [adding context information](https://reacttraining.com/react-router/web/guides/server-rendering/adding-app-specific-context-information) during the rendering phase and **returning server side responses** based on the information collected into the **`context` object**.

This enables client side code to take control of the responses returned by the node server like **returning a HTTP 404** instead of a "not found page" or returning a **real HTTP 302 redirect** instead of a client side one.

In order to achieve this behaviour we have to configure Next.js to do the following:

1. render the requested page providing a context object to the app router
2. check whether context object was mutated during the rendering process
3. decide whether to return the rendered page or do something else based on context object

### 4 - Provide context object to the router

Relevant [repo commit][4-provide-context].

We'll inject an empty `context` object into Express' `req.local` object and make it available to the router application via [React Context](https://reactjs.org/docs/context.html).

Let's inject `context` object into Express' `req.local` object:

```diff
// server.js
server.get('/*', async (req, res, next) => {
  try {
+   req.locals = {};
+   req.locals.context = {};
    app.render(req, res, '/');
```

Next.js provides a `req` and `res` objects as props of [`getInitialProps` static method](https://nextjs.org/docs#fetching-data-and-component-lifecycle). We'll fetch `req.originalUrl` and `req.locals.context` and handle it over to the static router.

```diff
// next/with-react-router.js
  return class AppWithReactRouter extends React.Component {
+   static async getInitialProps(appContext) {
+     const {
+       ctx: {
+         req: {
+           originalUrl,
+           locals = {},
+         },
+       },
+     } = appContext;
+     return {
+       originalUrl,
+       context: locals.context || {},
+     };
+   }

  // Code omitted
          <StaticRouter
-           location={this.props.router.asPath}
+           location={this.props.originalUrl}
+           context={this.props.context}
          >
```

### 5 - Separate rendering and response

Relevant [repo commit][final-setup].

Since we want to provide extra server behaviours based on `req.locals.context` in-between SSR and server response, Next.js `Server.render` falls short of flexibility.

We'll re-implement `Server.render` in `server.js` using Next.js `Server.renderToHTML` and `Server.sendHTML` methods.

Please note that some code was omitted. Refer to the source code for the complete implementation.

```diff
// server.js
  server.get('/*', async (req, res, next) => {
    try {
+     // Code omitted

      req.locals = {};
      req.locals.context = {};
-     app.render(req, res, '/');
+     const html = await app.renderToHTML(req, res, '/', {});
+
+     // Handle client redirects
+     const context = req.locals.context;
+     if (context.url) {
+       return res.redirect(context.url)
+     }
+
+     // Handle client response statuses
+     if (context.status) {
+       return res.status(context.status).send();
+     }
+
+     // Code omitted
+     app.sendHTML(req, res, html);
    } catch (e) {
```

Before sending the response with the rendered HTML to the client, we now check the `context` object and redirect or return a custom HTTP code, if necessary.

In order to try it out, update the `pages/index.js` entrypoint to [make use of `<Redirect>` and `<Status>` components](https://github.com/toomuchdesign/next-react-router/blob/master/pages/index.js) and start the dev server.

## Summary

We showed how it's be possible to setup Next.js take full **advantage of `react-router`**, enabling **single entrypoint** approach and fully **preserving SSR**.

In order to do so we:
1. Redirected all server requests to a **single entrypoint**
2. **Wrapped** the application (using HOC) with the proper **`react-router` router**
3. Injected `req` server object with a **`locals.context` object**
4. Provided **HOC wrapper** with `req.locals.context` and `req.originalUrl`
5. **Extended next.js `Server.render`** to take into account `req.locals.context` before sending HTML

The re-implementation of `Server.render` in userland code is the most disturbing part of it, but it might be made unnecessary by extending a bit `Server.render` API in Next.js.

### Results

#### `react-router` rendered server side

react-router's `<Route>` components get **statically rendered** on the server based on received [`req.originalUrl`](https://expressjs.com/en/api.html#req.originalUrl) url.

![Server side render](/docs/ssr.png)

#### HTTP 302 redirect triggered by client code

When server rendering process encounters `<Redirect from="/people/" to="/users/" />` component, the server response will return an **HTTP 302 response** with the expected **`Location` header**.

![HTTP 302 redirect](/docs/302.png)

#### HTTP 404 triggered by client code

When server rendering process encounters `<Status code={404}/>` component, the **server** response returns an **HTTP response** with the **expected status code**.

![HTTP 404 redirect](/docs/404.png)

### Further consideration

I'm sure this setup is way far from being optimal. I'll be happy take into account any suggestions, feedbacks, improvements, ideas.

### Issues

- Static pages not being exported
- Dev mode cannot build requested route on demand
- `getInitialProps` not implemented

[1-initial-setup]: https://github.com/toomuchdesign/next-react-router/tree/1-initial-setup
[2-redirect-to-entrypoint]: https://github.com/toomuchdesign/next-react-router/tree/2-redirect-to-entrypoint
[3-introduce-react-router]: https://github.com/toomuchdesign/next-react-router/tree/3-introduce-react-router
[4-provide-context]: https://github.com/toomuchdesign/next-react-router/tree/4-provide-context
[final-setup]: https://github.com/toomuchdesign/next-react-router/
