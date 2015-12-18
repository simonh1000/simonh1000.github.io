---
title: Angular 2 - in defence of one-way data binding
layout: post
category: web
tags: Angular, Elm
---

Horrified! That seemed to be the collective reaction when the Angular team announced two-way data binding would _not_ be directly present in Angular2. Since then, the team have worked hard to reassure the community.

However, one-way binding is attracting ever more devotees. This pattern has been popularised by [React](https://facebook.github.io/react/) / [Redux](http://redux.js.org/), and is epitomised by [Elm](http://elm-lang.org/). One-way binding, coupled with a single (immutable) source of state truth, is increasingly seen as a route to faster, [hot reloadable](https://www.youtube.com/watch?v=xsSnOQynTHs), testable code, while enabling stunning (time-travelling) debug tools.

What would a one-way, single state pattern look like in Angular2? This post seeks to emulate the basic patterns in first four examples from [The Elm Architecture](https://github.com/evancz/elm-architecture-tutorial/). I don't know whether this is the one-way pattern envisaged by the Angular team, so this may be more charicature than model code.

## The basic pattern

Throughout these examples, we will keep state in a parent component. The parent will inform the children of the state they need to render, and the children will send action events back to the parent to cause state updates. After each update, the parent will cause the children to re-render with new values. All the code is in Typescript and can be found [here, and see the different branches corresponding to each example](https://github.com/simonh1000/angular-one-way-binding/).

## Example 1: A counter

To start we will implement a single, simple counting component that shows its currently value and which can be increased or decreased, as shown in the image.
![A Counter](/images/counter.png#counter)

Let's start with the 'View' template, which simply attaches a click listener to each button using the new Angular syntax.

{% highlight html %}
<button (click)="action('dec')">Decrement</button>
<span>{% raw %}{{count}}{% endraw %}</span>
<button (click)="action('inc')">Increment</button>
{% endhighlight %}

Now let's look at the component's Javascript.

{% highlight js %}
import { Component, View, Input, Output, EventEmitter } from 'angular2/angular2';

@Component({ selector: 'counter' })
@View({ templateUrl: 'app/components/counter/counter.html' })
export class CounterComponent {
  @Input() count;
  @Output() updater = new EventEmitter();

  constructor() { }

  action(val) {
    let delta: Number = (val === 'inc') ? 1 : -1;
    this.updater.next(this.count + delta);
  }
};
{% endhighlight %}

There are several things to note here:

- the CounterComponent class has no local state!
- The component receives, as an `@Input`, its count value, which is rendered directly by the view; and
- data leaves the component via the `@Output` function in the form of an event. In this case we emit (via the `next` method) what the state should be updated to.

The CounterComponent is instantiated by the parent App component.
{% highlight js %}
import { Component, View } from 'angular2/angular2';
import { CounterComponent } from '../counter/counter-component';

@Component({ selector: 'app' })
@View({
  template: `<counter [count]="model" (updater)="pupdate($event)"></counter>`,
  directives: [CounterComponent],
})
export class AppComponent {
  model: number;

  constructor() {
    this.model = 0;
  }

  pupdate(newVal) {
    this.model = newVal;
  }
}
{% endhighlight %}

Here we see:

- the model, which is a single number for the time being;
- the template that passes 'downward' the value in the model, and which providers the `updater` function to receive 'events' back from the child.
- Received events are handled by the parent update function, `pudate` which updates state to the new value.

## Example 2 : Two Counters

How can we extend the pattern above to handle two counters? Let's introduce a Counters component that will simply be instantiated by App.

Counters provides this View:

{% highlight html %}
<counter [count]="model.top" (updater)="pupdate('top')($event)"></counter>
<counter [count]="model.bot" (updater)="pupdate('bot')($event)"></counter>
{% endhighlight %}

And uses this controller:

{% highlight js %}
@Component({ selector: 'counters' })
@View({
  templateUrl: 'app/components/counters/counters.html',
  directives: [CounterComponent]
})
export class CountersComponent {
  model: Object;

  constructor() {
    this.model = {
      "top" : 10,
      "bot" : 20
    }
  }

  pupdate(modelName) {
    return ( newVal => this.model[modelName] = newVal);
  }  
};
{% endhighlight %}

And that's it:

- Nothing needs to happen to the Counter component - it is entirely reusable as is;
- We have a model with two parts
- we pass different updater functions to each Counter by creating closures ('partially applying') of `pupdate`.

## Example 3 : Many Counters

OK, two was good but what about a flexible number? Again, we won't need to touch `Counter`, but we will need some additional tools for its parent, `Counters`.

{% highlight js %}
export class CountersComponent {
  model: Array<Number>;

  constructor() {
    this.model = [];
  }

  addCounter() {
    this.model.push(0);
  }
{% endhighlight %}

This time our model has become an array, and we need a method to add elements to the model. `pupdate` does not need changing but note that it's `modelName` parameter now will be the index in the model Array. (We also bring in the `NgFor` Directive, which we need in the rewritten View.)

{% highlight html %}
<button (click)="addCounter()">Add counter</button>
<counter
	*ng-for="#val of model; #i=index"
	[count]="val"
	(updater)="pupdate(i)($event)">
</counter>
{% endhighlight %}

## Example 4: Adding an extra action

In example 3 we could only add a `Counter`. What if we want to remove them too? This time we will need to change `Counter` a little to add `<button (click)="remove()">X</button>` to the View and implement the `remove` method to emit a second type of Event up to the parent:

{% highlight js %}
@Output() remover = new EventEmitter();
remove() {
  this.remover.next('X');
}
{% endhighlight %}

`Counters` needs to provide for this extra event when it instantiates new `counter` elements:

{% highlight html %}
<counter
	*ng-for="#val of model; #i=index"
	[count]="val"
	(updater)="pupdate(i)($event)"
	(remover)="premove(i)($event)">
</counter>
{% endhighlight %}

And `premove` works equivalently to `addCounter` to update the global state:

{% highlight js %}
premove(idx) {
  return (e => this.model.splice(idx, 1));
}
{% endhighlight %}

## Conclusions

We have seen a succession of examples that added functionality while retaining a single source of state truth. Rendering was effectively 'pure' and actions were transmitted to the parent to maintain the state. The Angular loop is still quite different from Elm's but we have achieved some of the core elements on the one-way data binding pattern.

## Postscript: Using Redux & immutable for state management

As a little exercise for myself, I decided to do away with the mutable state in the examples above. As the focus here is on Angular I won't present all of the Redux and immutable data handling code, but just show my Angular code's redux calls. You can find the full code in the repo.

{% highlight js %}
export class CountersComponent {
  model: Array<Number>;
  store: any;

  constructor() {
    this.store = makeStore();

    this.store.subscribe(
      () => this.model = this.store.getState().toJS()
    );
  }

  addCounter() {
    this.store.dispatch({ type: ADD_COUNTER });
  }

  premove(idx) {
    return (e => this.store.dispatch({ type: REMOVE_COUNTER, index: idx}));
  }

  pupdate(idx) {
    // return (newVal => this.model[idx] = newVal);
    return (newVal => this.store.dispatch({ type: UPD_COUNTER, index:idx, value:newVal}));
  }
}
{% endhighlight %}
