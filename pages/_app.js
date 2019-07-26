import App, { Container } from 'next/app';
import React from 'react';
import withReactRouter from '../next/with-react-router';

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    return (
      <Container>
        <Component {...pageProps} />
      </Container>
    );
  }
}

export default withReactRouter(MyApp);
