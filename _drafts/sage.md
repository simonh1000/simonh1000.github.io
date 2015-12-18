---
title: Configuring Roots Sage (Wordpress)
layout: post
category: web
---

# Congfiguring Sage

### Turning off sidebar

`lib/config.php`
overwrite the return from `display_sidebar()` so that it is always false
  return false;

### Make a conventional template

Copy the template across to the openshift directory, ready to be committed and uploaded to openshift

{% highlight php %}
gbs = [
  '**/*.php',
  'dist/**/*'
];

gulp.task('simon', function() {
  gulp.src(gbs, {base: "."})
  .pipe(gulp.dest('/home/simon/public_html/openshift/af2015b/.openshift/themes/af2015'));
})
{% endhighlight %}
