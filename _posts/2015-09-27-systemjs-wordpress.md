---
title: SystemJS, Angular and Wordpress
layout: post
category: web
---

SystemJS needs some quite careful configuration, especially with Angular, and Wordpress plays around with paths quite a bit, so getting the three to play nicely is possible but fiddly. Here's how I made it all work.

(These instructions are for "jspm": "^0.16.10" ("systemjs": "0.19.3",), angular 1.x and wordpress 4.x)

In my Wordpress theme directory I ended up with the following file structure. My app has its source in `assets/app` and the production code is compiled to `./dist`.

```
/
|- /lib
|--- config.php
|- /assets
|--- /app
|----- app.js
|----- /services
|--- /jspm_packages
|--- config.js
|--- loader.js
|- /dist
|- /node_modules
|- gulpfile.js
|- *.php,...

```

## Development
I want SystemJS to load all the necessary files automatically, and with no compilation during development.

### SystemJS

The first trick is with `config.js` where we need to use the full directory (relative to the wordpress root) as my `baseUrl`.

{% highlight js %}
System.config({
    baseURL: "./wp-content/themes/af2015/assets",
    defaultJSExtensions: true,
    transpiler: "babel",
    babelOptions: {
      "optional": [
        "runtime",
        "optimisation.modules.system"
      ]
    },
    paths: {
        "github:*": "jspm_packages/github/*",
        "npm:*": "jspm_packages/npm/*"
    },
    map: {....
{% endhighlight %}

### Wordpress `wp_enqueue_script`
`/lib/config.php` uses `wp_enqueue_script` to inject the relevant script(s) after doing a simple test of whether this is the development server or not.

{% highlight php startinline %}
if (preg_match('/192\.168/', $_SERVER['SERVER_NAME'], $matches)) {
    // echo "LOCALHOST";
    wp_enqueue_script('system', get_template_directory_uri() . '/assets/jspm_packages/system.js', [], '1.0.0', true );
    wp_enqueue_script('config', get_template_directory_uri() . '/assets/config.js', ['system'], '1.0.0', true );
    wp_enqueue_script('loader', get_template_directory_uri() . '/assets/loader.js', ['config'], '1.0.0', true );
} else {
    // echo "PRODUCTION";
    wp_enqueue_script('build', get_template_directory_uri() . '/dist/build.js', [], '1.0.0', true );
}
{% endhighlight %}

`loader.js` is a very simple script:

{% highlight js %}
System.import('app/app.js')
.catch(function(e) {
    console.error(e);
});
{% endhighlight %}

### Angular

#### 1) Bootstrapping

This was the most confusing part of the whole exercise as I started getting bugs when I added / removed totally unrelated (e.g. jQuery) packages to my overall page. Turned out SystemJS affects the timing of page loading and can disrupt the conventional `ng-app` directive used to load angular.

As a result, it is [recommended](https://github.com/jspm/registry/issues/358) to bootstrap Angular manually:

{% highlight js %}
import angular from 'angular';
import ...

angular.module("myApp", [])
.service(...)
.controller(...)

// Bootstrap app manually
angular.bootstrap(document.getElementById('app-container'), ['myApp']);
{% endhighlight %}

#### 2) Templates

I started off trying to point to absolute Urls of templates, but subsequently switched to a template caching approach, with the templates compiled into a 'standalone' module that I could then 'import' from my main app.

## Production

In production, I compile all my Javascript to a bundle and place it in the './dist' directory. The php snippet above helps Wordpress insert the bundle into the HTML it renders in production, and I use gulp to build the bundle.

The trick is that the `baseUrl` needs to change for the bundle. This took me the longest to work out and here is the way I now use. The key line is where I call `Builder` and override the `baseUrl` to `'./assets'`.

{% highlight js %}
var Builder = require('systemjs-builder');
// Next line over-rides baseUrl in config.js
var builder = new Builder('./assets', './assets/config.js');

gulp.task('bundle', function (cb) {
    builder.buildStatic('./assets/app/app.js', './dist/bundle.js');
});
{% endhighlight %}

### Angular

ng-annotate does not work out of the box with the bundle created by systemjs-builder, as it cannot find the functio  calls that it needs to work on. But it is sufficient to add "ngInject" as the first line of the function / class body to help it.
