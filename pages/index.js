import { Route, Link, Switch } from "react-router-dom";
import { Redirect } from 'react-router'

function Status({ code, children }) {
  return (
    <Route
      render={({ staticContext }) => {
        if (staticContext) staticContext.status = code;
        return children;
      }}
    />
  );
}

function Index() {
  return <h2>Home</h2>;
}

function About() {
  return <h2>About</h2>;
}

function Users() {
  return <h2>Users</h2>;
}

function NotFound() {
  return (
    <>
      <Status code={404}/>
      <h2>Not found</h2>;
    </>
  )
}

function App() {
  return(
    <div>
      <h1>Welcome to Next.js!</h1>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about/">About</Link>
          </li>
          <li>
            <Link to="/users/">Users</Link>
          </li>
          <li>
            <Link to="/people/">People</Link>
          </li>
        </ul>
      </nav>

      <Switch>
        <Route path="/" exact component={Index} />
        <Route path="/about/" component={About} />
        <Route path="/users/" component={Users} />
        <Redirect from="/people/" to="/users/" />
        <Route component={NotFound}/>
      </Switch>
    </div>
  );
}

export default App;
