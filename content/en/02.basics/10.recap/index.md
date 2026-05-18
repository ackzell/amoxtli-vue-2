---
title: Basics Recap
---

# Recap

Now you know how to get a hold of Vue as a library for using it without a build step, what the **Vue Instance** is, and also what the **Root Component** is.

The former is the value returned by the `createApp()` method that comes from `Vue` itself, while the latter is the component that will hold the rest of your _component hierarchy_.

The **template** is where we will be using mostly HTML, with a few enhancements provided by the framework, but I am getting ahead of myself a little here.

You also learned a few more details about using Vue _without a build step_, where nothing else but the library itself is involved. This is especially handy when you want to "sprinkle" some interactivity on your websites or applications that are mostly statically generated content, for example. Although in those cases, as the :tooltip-trigger{id="production-use"}[official docs point out], the recommendation would be to reach for even lighter solutions such as alpine.js or petite vue.

::tooltip-content{id="production-use"}
Quoting from [the official docs](https://vuejs.org/guide/quick-start.html#enabling-import-maps):

> While it is possible to use Vue without a build system, an alternative approach to consider is using [vuejs/petite-vue](https://github.com/vuejs/petite-vue) that could better suit the context where [jquery/jquery](https://github.com/jquery/jquery) (in the past) or [alpinejs/alpine](https://github.com/alpinejs/alpine) (in the present) might be used instead.

::
