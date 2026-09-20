---
title: v-on
ogImage: true
---

# `v-on`

`v-on` is another built-in [directive](/rendering-on-the-page/directives) that Vue provides so we can avoid the whole boilerplate that `addEventListener` requires.

The equivalent to the previous logic in Vue would be:

::magic-move{lang="vue"}

```vue title="Add a button inside the template"
<template>
  <button>
    Click me
  </button>
</template>
```

```vue title="Use the built-in directive: v-on"
<template>
  <button v-on>
    Click me
  </button>
</template>
```

```vue title="Pass an argument (the event we want to listen to): click"
<template>
  <button v-on:click>
    Click me
  </button>
</template>
```

```vue title="Pass the value (what should happen): console.log()"
<template>
  <button v-on:click="console.log('Button clicked!')">
    Click me
  </button>
</template>
```

::

The _value_ we pass to `v-on` can be **inline handler** that is executed when the event (in this case `click`) set in the _argument_ fires. Great for simple cases like the one above.

Try it:

```vue live showConsole
<template>
  <button v-on:click="console.log('Button clicked!')">
    Click me
  </button>
</template>
```

We can also extract the logic into a **method handler**, particularly useful when we have more complex logic. The goal is to let the user provide a name and then greet them personally in the console:

```vue title="App.vue" "handleClick"  "updateName" {"One handler to update the name":4-8} {"Another handler for the button click":10-17} {"Note we are reading the DOM event in this handler":5}
<script setup>
let name = ''

function updateName(event) {
  if (event.target.value) {
    name = event.target.value
  }
}

function handleClick() {
  let message = 'No name was provided'
  if (name) {
    message = `Hello ${name}!`
  }

  console.log(message)
}
</script>

<template>
  <label for="username">What is your name? </label>
  <input name="username" type="text" v-on:change="updateName">
  <button v-on:click="handleClick">
    Call my name
  </button>
</template>
```

```vue live showConsole
<script setup>
let name = ''

function updateName(event) {
  if (event.target.value) {
    name = event.target.value
  }
}

function handleClick() {
  let message = 'No name was provided'
  if (name) {
    message = `Hello ${name}!`
  }

  console.log(message)
}
</script>

<template>
  <label for="username">What is your name? </label>
  <input name="username" type="text" v-on:change="updateName">
  <button v-on:click="handleClick">
    Call my name
  </button>
</template>
```

I attempted to create a minimal example, and yet it quickly grew a few more lines of code. But I hope you can appreciate the benefit of extracting the handlers into methods and keeping the `template` as readable as possible while allowing us to implement conditionals within the handler methods.

## Typing the event handler

Now that we are also dealing with the DOM events, it would be worth leveraging TS (in case you are using it, of course) to help us know what kind of things we could expect from that object. (ie. not to have an `any` type there while authoring our code)

```vue twoslash
<script setup>
let name = ''

function updateName(event) {
  if (event.target.value) {
    //  ^?
    name = event.target.value
  }
}
</script>

<template>
  <input name="username" type="text" v-on:change="updateName">
</template>
```

Let's try helping the compiler a little bit.

```vue-diff
<script setup>
let name = ''
- function updateName(event) {
+ function updateName(event: Event) {
+   const input = event.target as HTMLInputElement
-   if (event.target.value) {
+   if (input.value) {
  }
}
</script>
```

::diff-view{lang="vue" before="JS" after="TS"}

```
<script setup>
let name = ''

function updateName(event) {

  if (event.target.value) {
    name = event.target.value
  }
}
</script>

<template>
  <input name="username" type="text" v-on:change="updateName">
</template>
```

```
<script setup lang="ts">
let name = ''

function updateName(event: Event) {

  const input = event.target as HTMLInputElement

  if (input.value) {
    name = input.value
  }
}
</script>

<template>
  <input name="username" type="text" v-on:change="updateName">
</template>
```

::

After introducing our changes, we are able to more confidently work with our events as you can see below. The event is now typed and that helps us create an `input` variable that now has a `value` property that is available and listed via intellisense in our editor.

<!-- eslint-skip -->

```vue twoslash
<script setup lang="ts">
// @noErrors
let name = ''

function updateName(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.val
  //           ^|






</script>
```

Great! Now we can be certain that the input value will be treated as a string.

## Shorthand `@`

Just like the shorthand for `v-bind` is `:`, the shorthand for `v-on` is `@`. So the above code can be rewritten as:

```vue title="App.vue" "@click="
  <button @click="handleClick">
    Click me
  </button>
```

I prefer using it and most of the code I've seen out there uses it, but you can use the full syntax if you want to be more explicit.

::tip

There is also a linting rule that allows you to enforce the use of the shorthand, so if you try to use `v-on` instead of `@`, you'll get a warning: [vue/v-on-style](https://eslint.vuejs.org/rules/v-on-style). But it could be the other way around too, if you prefer the full syntax.

::
