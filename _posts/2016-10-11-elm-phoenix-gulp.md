---
title: Developing Elm using Gulp with Elixir / Phoenix
layout: post
category: misc
---

I found brunch did not work so well with Elm, so my fall back was Gulp, which [I know well](https://github.com/simonh1000/elm-fullstack-starter). Here are my notes on setting up Phoenix and Gulp for an Elm project.

### Create new Phoenix project

I will start the project with brunch included initially, but then replace the references to it later, and we can delete `brunch-config.json` subsequently.

```
mix phoenix.new jwt_example
(click n to stop installation of NPM libraries)
cd phoenix
mix deps.get
mkdir web/elm
```

We are going to put all of our Elm files in `web/elm`.

### package.json

We will replace the main parts of package.json in order to insert the files we need for compiling Elm.

```
"dependencies": {
  "phoenix": "file:deps/phoenix",
  "phoenix_html": "file:deps/phoenix_html"
},
"devDependencies": {
  "gulp": "^3.9.1",
  "gulp-elm": "^0.5.0"
}
```

Then run `npm install`.

### gulpfile.js

In practise, we will want to use gulp for our CSS and any other javascript needed. But for the Elm part specifically, we need the following.

```
var gulp = require('gulp');
var elm = require('gulp-elm');

var elmPaths = [
 'web/elm/**/*.elm'
];
var elmMain = 'web/elm/Main.elm'

gulp.task('elm-init', elm.init);

gulp.task('elm', ['elm-init'], function() {
    // By explicitly handling errors, we prevent Gulp crashing when compile fails
    function onErrorHandler(err) {
        console.log(err.message);
    }
    return gulp.src(elmMain)
        .pipe(elm())
        .on('error', onErrorHandler)
        .pipe(gulp.dest('priv/static/js'));
});

//==================WATCHERS=====================

gulp.task('watch', ['elm', 'css-app'], function() {
  // ELM
  gulp.watch(elmPaths, ['elm']);
});
```

### Adding Gulp to config/dev/exs

We will replace the brunch watcher with one for Gulp.

```
config :phoenix, Phoenix.Endpoint,
  [...]
  # watchers: [node: ["node_modules/brunch/bin/brunch", "watch", "--stdin",
  #                   cd: Path.expand("../", __DIR__)]]
  watchers: [node: ["node_modules/gulp/bin/gulp.js", "watch", "--stdin",
                    cd: Path.expand("../", __DIR__)]]
```

### elm-package.json

Finally we need to help the Elm compiler find the files in the web directory. We add the following to elm-package.json.
```
"source-directories": [
    "web/elm"
],
```

After that it should be just a matter of running `mix phoenix.server` to get started, and then start working on your Elm project.
