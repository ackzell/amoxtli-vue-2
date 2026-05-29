---
title: Rendering Lists
ogImage: true
---

# Rendering Lists

Say you had a favorite rock band, and I'll just pick a random one... maybe... THE greatest and bestest band of all times, of course: The Beatles. And when I said you, I meant "I have a favorite band", in case you didn't notice.

Anyhow, let's create a simple structure that will hold some data about the band ≤members:

```js showLineNumbers=false
const theBeatles = [
  {
    firstName: 'John',
    lastName: 'Lennon'
  },
  {
    firstName: 'Paul',
    lastName: 'McCartney'
  },
  {
    firstName: 'George',
    lastName: 'Harrison'
  },
  {
    firstName: 'Ringo',
    lastName: 'Star'
  }
]
```

And we want to show their data on the page.

Maybe your first instinct would be to use `{{ }}`. So let's try that first.

```file:/src/App.vue title="App.vue"  /theBeatles/ collapse={1-23,28-58}
-
```

Well, we do see them on the page. But it just shows the entire array "as is", like:

<div className='bg-bgr-50 dark:bg-bgr-dark p-4 border dark:border-bgr-700 border-bgr-100 font-code'>
{`{[ { "firstName": "John", "lastName": "Lennon" }, { "firstName": "Paul", "lastName": "McCartney" }, { "firstName": "George", "lastName": "Harrison" }, { "firstName": "Ringo", "lastName": "Star" } ]}`}
</div>

Not great 😬

Fortunately, HTML has specific tags for this purpose that also help to present the data more clearly: `<ol>`, `<ul>` and `<li>`. And we want to write :tooltip-trigger{id="semantic-markup"}[semantic markup] as much as we can, right? right?? enter:

## `v-for`

This is how we list our musical legends using `v-for`:

```file:/src/App.vue /v-for="[^"]+"/ collapse={1-26, 38-58}
-
```

So the syntax is:

```vue showLineNumbers=false
<some-tag v-for="item in items" />
```

Where

- `some-tag` can be a DOM element, a `<template>` tag or a component
- `item` is an **alias** for the array element being iterated on
- `items` is your source data array

Awesome! so this time we have the objects from the array listed out, but they still don't look that great. Notice the output now renders the object itself (because of the `{{beatle}}` interpolation), which means that we can access it's properties!

```file:/src/App.vue /v-for="[^"]+"/ collapse={1-36, 47-58}
-
```

You can destructure the **alias** of the array element (each `beatle`) and make use of the object properties (`firstName` and `lastName`) within the _scope_ of your `v-for`. Depending on how you like writing your code, this might prove useful. (I prefer keeping my references visible, so: `beatle.firstName` and `beatle.lastName` would be how I actually write it, like this: <ButtonShowSolution /> ).

This is the most basic way to use the directive, but it has some more characteristics I want to explore in the coming lessons.

::tooltip-content{id="semantic-markup"}

> With over 100 HTML elements and the ability to create custom elements, there are infinite ways to mark up your content. But, some ways—notably _semantically_— are better than others.

> Semantic means "relating to meaning". Writing semantic HTML means using HTML elements to structure your content based on each element's meaning, not its appearance.

[Read more here](https://web.dev/learn/html/semantic-html)
::
