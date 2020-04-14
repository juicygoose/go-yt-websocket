var App = React.createClass({
    componentWillMount: function() {
    },
    render: function() {
  
      if (this.loggedIn) {
        return (<LoggedIn />);
      } else {
        return (<LoggedIn />);
      }
    }
  });

var Home = React.createClass({
render: function() {
    return (
    <div className="container">
    <div className="col-xs-12 jumbotron text-center">
        <h1>Hacienda</h1>
        <p>This is a test</p>
        <a className="btn btn-primary btn-lg btn-login btn-block">Sign In</a>
    </div>
    </div>);
}
});

var LoggedIn = React.createClass({
getInitialState: function() {
    return {
    products: []
    }
},
render: function() {
    return (
    <div className="col-lg-12">
        <span className="pull-right"><a onClick={this.logout}>Log out</a></span>
        <h2>Welcome to We R VR</h2>
        <p>Below you'll find the latest games that need feedback. Please provide honest feedback so developers can make the best games.</p>

    </div>);
}
});


ReactDOM.render(<App />, document.getElementById('app'));