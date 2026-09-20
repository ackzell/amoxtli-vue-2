---
title: User input
ogImage: true
---

# User input

Having an app that shows stuff on the screen is cool and all, but the user should also be able to interact with it if we want to build something actually useful.

Let's see what we can do to make our app interactive.

## Listen to events

The most basic way to make an app interactive is to listen to DOM events. For example, we can listen to the `click` event on a button and do something when the user clicks it.

This is what it would look like [if we did it in plain JS](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Events#eventtarget.addeventlistener):

::magic-move{lang="html"}

```html title="Add a button somewhere in the page" showLineNumbers=false
<button id="my-button">Click me</button>
```

```html title="Get a hold of the button" showLineNumbers=false
<button id="my-button">Click me</button>

<script>
  const btn = document.querySelector('#my-button')
</script>
```

```html title="Add an event listener to the button" showLineNumbers=false
<button id="my-button">Click me</button>

<script>
  const btn = document.querySelector('#my-button')

  btn.addEventListener('click', function handleClick(event) {
    console.log('Button clicked!')
  })
</script>
```

```html title="Optionally, extract method" showLineNumbers=false
<button id="my-button">Click me</button>

<script>
  const btn = document.querySelector('#my-button')

  function handleClick(event) {
    console.log('Button clicked!')
  }

  btn.addEventListener('click', handleClick)
</script>
```

::

```html live showConsole
<button id="my-button">Click me</button>

<script>
  const btn = document.querySelector('#my-button')

  function handleClick(event) {
    console.log('Button clicked!')
  }

  btn.addEventListener('click', handleClick)
</script>
```

So, for a button that lives in the page, we need to first _select it_ using `querySelector` and then add an event listener to it using `addEventListener`. This is a bit of boilerplate that we have to write every time we want to listen to an event.

::info
For many many years, an awesome library called [`jQuery`](https://jquery.com/) has been a great way to simplify our lives because it brought in a simpler API to do the same thing, besides providing a way of dealing with cross-browser inconsistencies.
::
