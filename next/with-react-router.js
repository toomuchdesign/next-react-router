import React from 'react';
import { BrowserRouter } from 'react-router-dom';
const isServer = typeof window === 'undefined';

export default App => {
  return class AppWithReactRouter extends React.Component {
    render() {
      if (isServer) {
        const { StaticRouter } = require('react-router');

        // @TODO: how to return context to express before serving response?
        const context = {};
        return (
          <StaticRouter location={this.props.router.asPath} context={context}>
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
