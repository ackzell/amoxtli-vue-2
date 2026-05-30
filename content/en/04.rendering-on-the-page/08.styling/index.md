---
title: Styling primer
ogImage: true
---

# Styling primer

Let's focus a little bit on the styles for the chat we were just looking at. Note we have a `sender` property on all the elements of our `chatMessages` array.

<!-- prettier-ignore -->
```file:/src/App.vue title="App.vue"  /sender: '[^']+'/ {"We use that 'sender' value for the class name on every li item": 38} /:class="entry.sender"/ collapse={24-30, 49-82, 93-108} {"Which matches one of the class names we prepared in our CSS":83-91} /\.me\b/ /\.they\b/
-
```

I will leave it here for now, so that we can explore styling our output in more detail in a dedicated chapter.
