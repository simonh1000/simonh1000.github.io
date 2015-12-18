---
title: Responsive images (srcset / sizes)
layout: post
category: web
---

A responsive website will need to work across a very wide range of eventualities. In order to cater for the largest, high density screens, a very large image needs to be server, but that is overkill for cheap smartphone screens (with bandwidth limitations too).

There is now an [HTML syntax](http://responsiveimages.org/) for conditional image loading, and this post seeks to provide examples of its use.

The key point is that the developer has to provide enough information in the html markup so that the browser itself can make a reasonable evaluation of the best image version to use. (Note that the browser will generally download a large image and scale it down than stretch a smaller one.)

There is a nice [Udacity course](https://www.udacity.com/course/responsive-images--ud882) here that helped me, and this post is an effort to capture the key elements of the `srcset` syntax directly.

Consider this piece of code.
{% highlight html %}
    <style media="screen">
        .container {
            width: 100%;
        }
        #image1 {
            width: 100%;
        }
        #image2 {
            width: 50%;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="image1-4000.jpg" id="image1" />
        <img src="image2.jpg" id="image2" />
    </div>
</body>
{% endhighlight %}

Simple enough? Two images, one that covers the page, and another that just goes half way. Exaggerating for effect, I'm using a 4000px wide image1, but have made 2000, 1000 and 640px versions too. The challenge is load a suitable image for all possible screen sizes.

At the moment that the browser loads the page, it knows:
 - The width of the browser viewport; and
 - The pixel-density of the screen

Although in this simple example, the browser has all the style information to determine the actual width of the image, this is not generally the case (as the css file is one of the files the browser is downloading at it loads the page).

Consequently, the markup needs to provide details of the images available, and whatever guidance is possible on the size the image will be rendering at.

First we need to describe some additional measurement terms that are designed for response needs.

## Units
In addition to px measurements, browsers also support the following which allow the developer to describe a type of relative size:

- `vh` : 'viewport height' in % of total viewport
- `vw` : 'viewport width'

In the code examples below, we will also use the `w` unit which is the width, in pixels.

<!-- ### Covering the viewport
{% highlight css %}
width: 100vmin
height: 100vmin
{% endhighlight %}

vmax also available to cover viewport -->

## Images available - `srcset`
Srcset is the syntax to describe the images available. There are two basic ways of describing the images to the browser: what pixel-density the image is suitable for; or what are dimensions of the image directly.

### Pixel density descriptors
Desktop screens often have a pixel density of '1x', while modern smartphones may well be '2x' or more. For example, an iPhone 5 has a screenwidth of 320px but, as the pixel density is 2x, it looks best with 640px images (or bigger).

Let's use the 2000px photo for ordinary screens and use the 4000px one just for large 'retina' screens. For this, we need the `srcset` attribute.

{% highlight html %}
<img src="image1-2000.jpg" id="image1"
     srcset="image1-2000.jpg 1x, image1-4000.jpg 2x" />
{% endhighlight %}

### Image widths
The alternative is to provide the browser with the exact widths of the images directly.

{% highlight html %}
<img src="image1-2000.jpg" id="image1"
     srcset="image1-2000.jpg 2000w, image1-4000.jpg 4000w" />
{% endhighlight %}

## Expected rendering - `sizes`
The browser will not normally know how wide the images are going to render, as it does not have the css information available when parsing the html. In the example above, `.container` and `#image1` are 100% wide but that need not always be the case, and `.container` may itself be nested inside some other element with additional width styling. Moreover, we may be using media queries in the stylesheet that means different styling applies for different screen sizes.

With screens of all sizes, the exact dimensions of the final image cannot be precisely determined, but the developer can provide their best estimate to the browser.

In the example above image1 is going to (100%) fill the screen horizontally. We can provide that information to the browser via the `sizes` attribute.

{% highlight html %}
<img src="image1-2000.jpg" id="image1"
     srcset="image1-640.jpg 640w, image1-1000.jpg 1000w, image1-2000.jpg 2000w, image1-4000.jpg 4000w"
     sizes="100w" />
{% endhighlight %}

A more realistic scenario is that two blocks of a page will sit side-by-side on a large screen, but align vertically on smaller screens. In other words, with this additional css

{% highlight css %}
@media (min-width: 640px) {
    #image1 {
        width: 50%;
        float: left;
    }
    #image2 {
        width: 50%;
        float: left;
    }
}
{% endhighlight %}

We need to provide this information directly to the image tag too.

{% highlight html %}
<img src="image1-2000.jpg" id="image1"
     srcset="image1-640.jpg 640w, image1-1000.jpg 1000w, image1-2000.jpg 2000w, image1-4000.jpg 4000w"
     sizes="(max-width: 640px) 50vw, 100vw" />
{% endhighlight %}
