---
title: "Dynamic Classes"
ogImage: true
---

# Dynamic Classes

> Well, if I can bind the `style` attribute, I should be able to bind the `class` attribute too, right?

Right you are!

So let's do that now, and see a few things worth knowing for this use case.

## Explicit class names

In the following example, we will bind the `class` attribute to a dynamic value based on the state of a checkbox. When the checkbox is checked, the text will change color because we are conditionally applying a different class to the text element.

```file:/src/App.vue live showConsole showLineNumbers hide={5-13, 24-56, 78-199, 211-245}
-
```

Here is the whole implementation, with some notes that explain more about what is going on with the code.

```vue /\bchecked-class\b/ /unchecked-class/ {"We can still have static classes as well as the dynamic ones just like with any other attribute binding": 16} /isChecked/ collapse={8-9}
<script setup>
import { nextTick, ref } from 'vue'

const isChecked = ref(false)

async function handleClick() {
  isChecked.value = !isChecked.value

  await nextTick() // Wait for the DOM to update before logging
  console.log(document.querySelector('.my-text'))
}
</script>

<template>
  <div
    class="my-text"
    :class="isChecked ? 'checked-class' : 'unchecked-class'"
  >
    This text will change color based on the value of <code>isChecked</code>.
  </div>

  <label>
    <input type="checkbox" @click="handleClick">
    Checked: {{ isChecked }}
  </label>
</template>

<style>
.checked-class {
  color: lightseagreen;
}

.unchecked-class {
  color: slateblue;
}
</style>
```

## Toggling classes

You can also toggle a class on or off based on :tooltip-trigger{id="truthy-falsy"}[`truthy` | `falsy` values]:

::tooltip-content{id="truthy-falsy"}

From the [MDN Docs](https://developer.mozilla.org/en-US/docs/Glossary/Truthy):

> In JavaScript, a truthy value is a value that is considered true when encountered in a Boolean context. All values are truthy unless they are defined as falsy. That is, all values are truthy except false, 0, -0, 0n, "", null, undefined, NaN, and document.all.

::

```vue live hide={1-15, 55-67} showConsole
<script setup>
import { nextTick, ref } from 'vue'

const isHighlighted = ref(false)

async function onCheckboxClick() {
  isHighlighted.value = !isHighlighted.value

  await nextTick() // Wait for the DOM to update before logging
  console.log(
    document.querySelector('ul')
  )
}
</script>

<template>
  <label>
    <input type="checkbox" @click="onCheckboxClick">
    Toggle the <code>highlighted</code> class on the last list item.
  </label>

  <ul>
    <li
      class="my-item"
      :class="{ highlighted: '' }"
    >
      This will never have the class <code>highlighted</code>.
    </li>
    <li
      class="my-item"
      :class="{ highlighted: false }"
    >
      This will never have the class <code>highlighted</code>.
    </li>
    <li
      class="my-item"
      :class="{ highlighted: 'yeah' }"
    >
      This will always have the class <code>highlighted</code>.
    </li>
    <li
      class="my-item"
      :class="{ highlighted: 123 }"
    >
      This will always have the class <code>highlighted</code>.
    </li>
    <li
      class="my-item"
      :class="{ highlighted: isHighlighted }"
    >
      This will have the class <code>highlighted</code> if <code>isHighlighted</code> is true.
    </li>
  </ul>
</template>

<style>
li {
  padding: 0.25rem;
  margin: 0.25rem;
}

.highlighted {
  color: #42b983;
  border: 1px solid #42b983;
}
</style>
```

You probably noticed that we are using an object now instead of a string for the `:class` binding we used in the first example. The keys of the object are the classnames, and only when their values are truthy, the class will be applied to the element.

::tip
Don't forget you can still apply your static classes along with the dynamic ones. You can do that by adding a `class` attribute to the element, and then using the `:class` binding for the dynamic classes. (`.my-item` in the example above is a static class, while `.highlighted` is a dynamic class.)
::

## Multiple classes

We can also apply multiple classes at once, and there are a couple ways to do it: instead of a string, we use an object or an array.

From the previous example, let's now make the `.my-item` class also be conditionally applied to the element

```vue live hide={1-15, 33-44} showConsole
<script setup>
import { nextTick, ref } from 'vue'

const shouldApply = ref(false)

async function onApplyCheckboxClick() {
  shouldApply.value = !shouldApply.value

  await nextTick() // Wait for the DOM to update before logging
  console.log(
    document.querySelector('ul').children[0]
  )
}
</script>

<template>
  <label>
    <input type="checkbox" @click="onApplyCheckboxClick">
    Toggle the <code>highlighted</code> and <code>my-item</code> classes on the list item.
  </label>

  <ul>
    <li
      :class="{
        'highlighted': shouldApply,
        'my-item': shouldApply,
      }"
    >
      This will have the classes <code>highlighted</code> and <code>my-item</code> if <code>shouldApply</code> is true.
    </li>
  </ul>
</template>

<style>
li {
  padding: 0.25rem;
  margin: 0.25rem;
}

.highlighted {
  color: #42b983;
  border: 1px solid #42b983;
}
</style>
```

Take a look at this now:

```vue live hide={1-15} showConsole
<script setup>
import { nextTick, ref } from 'vue'

const isToggledOn = ref(false)
const activeClasses = ['highlighted', 'bold']

async function onToggleClasses() {
  isToggledOn.value = !isToggledOn.value

  await nextTick() // Wait for the DOM to update before logging
  console.log(
    document.querySelector('ul')
  )
}
</script>

<template>
  <label>
    <input type="checkbox" @click="onToggleClasses">
    Toggle the <code>highlighted</code> and <code>bold</code> classes on the last list item.
  </label>

  <ul>
    <li
      class="my-item" :class="isToggledOn && activeClasses"
    >
      This will have the classes <code>highlighted</code> and <code>bold</code> if <code>isToggledOn</code> is true.
    </li>
    <li
      class="my-item"
      :class="[
        isToggledOn && 'highlighted',
        isToggledOn ? 'bold' : '',
      ]"
    >
      This will also have the classes <code>highlighted</code> and <code>bold</code> if <code>isToggledOn</code> is true.
    </li>
  </ul>
</template>

<style>
.my-item {
  padding: 0.25rem;
  margin: 0.25rem;
}

.bold {
  font-weight: bold;
}

.highlighted {
  color: #42b983;
  border: 1px solid #42b983;
}
</style>
```

Notice that `isToggledOn && 'highlighted'` and `isToggledOn ? 'bold' : ''` do the same thing here: only include the class when the condition is true.

::tip
At the end of the day we want to provide the class names we want to apply: either as the _keys_ in an object, or as the _string entries_ in an array that is bound to the `class` attribute.

::

## Objects in arrays

Consider this now: the actual class name is dynamically generated.

The user has the ability to toggle custom styles for the content below and a dropdown will let them choose between different styles.

```vue live showConsole hide={1-17}
<script setup>
import { nextTick, ref } from 'vue'

const shouldFirstClassBeApplied = true
const customStyleEnabled = ref(false)

const classNames = ['error', 'warning', 'info', 'success']
const selectedClassName = ref('')

async function handleSelectionChange(ev) {
  selectedClassName.value = ev.target.value
  await nextTick()

  console.log(document.querySelector('.first-class'))
}
</script>

<template>
  <label>
    <input
      type="checkbox"
      :value="customStyleEnabled"
      @change="customStyleEnabled = !customStyleEnabled"
    >
    Apply custom style?
  </label>

  <select @change="handleSelectionChange">
    <option value="">
      pick one
    </option>
    <option
      v-for="currentClassName in classNames"
      :key="currentClassName"
      :value="currentClassName"
    >
      {{ currentClassName }}
    </option>
  </select>

  <div
    :class="[
      shouldFirstClassBeApplied ? 'first-class' : '',
      { [selectedClassName]: customStyleEnabled && selectedClassName },
    ]"
  >
    Vue rocks!
  </div>
</template>

<style>
.first-class {
  padding: 1rem;
  font-style: bold;
}

.error {
  color: tomato;
}

.warning {
  color: gold;
}

.info {
  color: dodgerblue;
}

.success {
  color: limegreen;
}
</style>
```

Here is the full code again, this time with annotations, as per usual:

```vue {"These will be used as keys for the object we dynamically assign to the class attribute":7} {"The class name will be dynamically applied based on both the checkbox value as well as the selected style from the dropdown":44}
<script setup>
import { nextTick, ref } from 'vue'

const shouldFirstClassBeApplied = true
const customStyleEnabled = ref(false)

const classNames = ['error', 'warning', 'info', 'success']
const selectedClassName = ref('')

async function handleSelectionChange(ev) {
  selectedClassName.value = ev.target.value
  await nextTick()

  console.log(document.querySelector('.first-class'))
}
</script>

<template>
  <label>
    <input
      type="checkbox"
      :value="customStyleEnabled"
      @change="customStyleEnabled = !customStyleEnabled"
    >
    Apply custom style?
  </label>

  <select @change="handleSelectionChange">
    <option value="">
      pick one
    </option>
    <option
      v-for="currentClassName in classNames"
      :key="currentClassName"
      :value="currentClassName"
    >
      {{ currentClassName }}
    </option>
  </select>

  <div
    :class="[
      shouldFirstClassBeApplied ? 'first-class' : '',
      { [selectedClassName]: customStyleEnabled && selectedClassName },
    ]"
  >
    Vue rocks!
  </div>
</template>

<style>
.first-class {
  padding: 1rem;
  font-style: bold;
}

.error {
  color: tomato;
}

.warning {
  color: gold;
}

.info {
  color: dodgerblue;
}

.success {
  color: limegreen;
}
</style>
```
