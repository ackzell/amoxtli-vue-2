---
title: Multiple App Instances
---

# Multiple app instances

You are not limited to a single app instance per page. You can create as many as you want / need, and mount them to different elements in the DOM.

This is especially useful when you want to use it in a setup where you need different parts of your webpage to be interactive.

Check the example to see what I mean.

We mounted 2 app instances: `firstApp` and `secondApp`. We used the `#app1` and `#app2` DOM elements as the templates and mounted the instances respectively.

::info
Note that we also are using different syntax flavors for the 2 instances, namely **Composition API** for the first one and **Options API** for the second. We'll look a little more into that later on.
::
 