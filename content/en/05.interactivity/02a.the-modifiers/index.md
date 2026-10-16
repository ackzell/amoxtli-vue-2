---
title: "The modifiers"
ogImage: true
---

# The modifiers

That's a great name for an alternative rock band lol.

No? Just me? (🦗🦗)

Anywho... let me present to you a scenario:

The requirement is that we have a couple nested boxes and we want to register when the user clicks **only on the outer one**, ie. clicks on the lighter colored box.

In other words: I **should not** see the console log at all if we click the inner (darker) box.

Right now this is what logs in the console when I do:

```html
outer clicked, target:
<div class="box" id="inner"></div>
```

See if you can add the code that fixes it:

```html live showConsole hide={10-30}
<div class="box" id="outer">
  <div class="box" id="inner"></div>
</div>

<script>
  const outer = document.querySelector('#outer')

  outer.addEventListener('click', (event) => {
    console.log('outer clicked, target:', event.target)
  })
</script>

<style>
  .box {
    margin: 0 auto;
  }

  #outer {
    width: 80px;
    height: 80px;
    background: mediumorchid;
    display: flex;
    align-items: center;
  }

  #inner {
    width: 50px;
    height: 50px;
    background: rebeccapurple;
  }
</style>
```

If you did something similar to the following:

::diff-view{lang="js"}

```
outer.addEventListener('click', (event) => {
  console.log('outer clicked, target:', event.target)
})
```

```
outer.addEventListener('click', (event) => {
  if (event.target !== event.currentTarget) return
  console.log('outer clicked, target:', event.target)
})
```

::

Then you would be _absolutely right!_ (😬)

This is the new code that behaves the way we want:

```html live showConsole hide={13-32}
<div class="box" id="outer">
  <div class="box" id="inner"></div>
</div>

<script>
  const outer = document.querySelector('#outer')

  outer.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) return
    console.log('outer clicked, target:', event.target)
  })
</script>

<style>
  .box {
    margin: 0 auto;
  }

  #outer {
    width: 80px;
    height: 80px;
    background: mediumorchid;
    display: flex;
    align-items: center;
  }

  #inner {
    width: 50px;
    height: 50px;
    background: rebeccapurple;
  }
</style>
```

On these examples I hid the CSS on purpose, but you can see how long web dev can get to write if you do it by hand. Thank goodness for frameworks!

```vue live showConsole hide={7-25}
<template>
  <div
    id="outer"
    class="box"
    @click.self="console.log('outer clicked, target:', $event.target)"
  >
    <div id="inner" class="box" />
  </div>
</template>

<style>
  .box {
  margin: 0 auto;
}

#outer {
  width: 80px;
  height: 80px;
  background: mediumorchid;
  display: flex;
  align-items: center;
}

#inner {
  width: 50px;
  height: 50px;
  background: rebeccapurple;
}
</style>
```

Huh!? We could do everything in the template if we really wanted to. Not my point though. The real takeaway here is that when dealing with events we can use _modifiiers_ to accomplish tasks that otherwise could become very boilerplaite-y.

```vue ".self" collapse={11-29} {"This is it. It's all it takes": 5}
<template>
  <div
    id="outer"
    class="box"
    @click.self="console.log('outer clicked, target:', $event.target)"
  >
    <div id="inner" class="box" />
  </div>
</template>

<style>
  .box {
  margin: 0 auto;
}

#outer {
  width: 80px;
  height: 80px;
  background: mediumorchid;
  display: flex;
  align-items: center;
}

#inner {
  width: 50px;
  height: 50px;
  background: rebeccapurple;
}
</style>
```

::tip
You can dig deeper into them on [the official docs](https://vuejs.org/guide/essentials/event-handling.html#event-modifiers). But you essentially have modifiers for all the more common events. Straight quote from the docs:

```html showLineNumbers=false
<!-- the click event's propagation will be stopped -->
<a @click.stop="doThis"></a>

<!-- the submit event will no longer reload the page -->
<form @submit.prevent="onSubmit"></form>

<!-- modifiers can be chained -->
<a @click.stop.prevent="doThat"></a>

<!-- just the modifier -->
<form @submit.prevent></form>

<!-- only trigger handler if event.target is the element itself -->
<!-- i.e. not from a child element -->
<div @click.self="doThat">...</div>
```

::

## Key modifiers are also a thing

Yes, you can also listen for specific keys being used in your apps.

Check this out:

```vue live showConsole hide={1-9, 11-15}
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const i = document.getElementById('my-input')
  i.focus()
})
</script>

<template>
  <h2>Specific modifier</h2>
  <ol>
    <li>Make sure the input is in focus.</li>
    <li>Press "Page Down" on your keyboard.</li>
  </ol>

  <input
    id="my-input"
    type="text"
    @keydown.page-down.prevent="console.log('you pressed Page Down!')"
  >
</template>
```

We are specifically listening for the <kbd>Page Down</kbd> key on the keyboard. When it is pressed, then we want to log to the console and NOT scroll the page.

```vue title="Specific modifier"  "@keydown" ".page-down" ".prevent" collapse={1-9, 11-15} {"When the page down keyboard key is pressed, do not scroll, do this instead": 20}
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const i = document.getElementById('my-input')
  i.focus()
})
</script>

<template>
  <h2>Specific modifier</h2>
  <ol>
    <li>Make sure the input is in focus.</li>
    <li>Press "Page Down" on your keyboard.</li>
  </ol>

  <input
    id="my-input"
    type="text"
    @keydown.page-down.prevent="console.log('you pressed Page Down!')"
  >
</template>
```

Let's build a quick tool that would tell us what the user pressed. They focus the input and press any key, then we log the corresponding value to the console:

```vue live showConsole hide={1-9, 11-15}
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const i = document.getElementById('my-other-input')
  i.focus()
})
</script>

<template>
  <h2>Any modifier</h2>
  <ol>
    <li>Make sure the input is in focus.</li>
    <li>Press any key on your keyboard.</li>
  </ol>

  <input
    id="my-other-input"
    type="text"
    @keydown.prevent="console.log('$event.key was', $event.key)"
  >
</template>
```

```vue collapse={1-9, 11-15} {"Listten for any key, do NOT perform any action but this":20} "@keydown" ".prevent"
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const i = document.getElementById('my-other-input')
  i.focus()
})
</script>

<template>
  <h2>Any modifier</h2>
  <ol>
    <li>Make sure the input is in focus.</li>
    <li>Press any key on your keyboard.</li>
  </ol>

  <input
    id="my-other-input"
    type="text"
    @keydown.prevent="console.log('$event.key was', $event.key)"
  >
</template>
```

::tip
Also in the [official docs](https://vuejs.org/guide/essentials/event-handling.html#key-modifiers) a little more in depth explanation for how key modifiers can be leveraged
::

## And don't forget mouse button modifiers

This is a band that formed shortly after the lead singer from The Modifiers left to pursue other artistic horizons.

They are as you can probably imagine, a similar syntax:

- `.left`
- `.middle`
- `.right`

```vue live showConsole hide={11-22}
<template>
  <div
    class="box"
    @click.left="console.log('left click!')"
    @click.right="console.log('right click!')"
    @click.middle="console.log('middle click!')"
  >
    Click here with any button in your mouse
  </div>
</template>

<style>
.box {
  display: flex;
  align-items: center;
  text-align: center;
  width: 80%;
  height: 100px;
  border: 1px dotted tomato;
}
</style>
```

But now I am curious: my mouse has a couple other thumb buttons I use to browse back and forward. Will those work? 🤔

```vue live showConsole hide={11-22}
<template>
  <div
    class="box"
    @mousedown.prevent
    @mouseup.prevent="console.log('click was:', $event.button)"
  >
    Click here with any button in your mouse
  </div>
</template>

<style>
.box {
  display: flex;
  align-items: center;
  text-align: center;
  width: 80%;
  height: 100px;
  border: 1px dotted tomato;
}
</style>
```

> A few attempts later...

Welp, my specific mouse didn't quite work. But we just learned how we can distinguish between mouse buttons 😅
