# Amoxtli Vue

Forked from [learn.nuxt.com](https://learn.nuxt.com) and reimagined as a multimedia platform for learning Vue.

# amoxtli-vue

> **[ah-MOSH-tlee](https://nahuatl.wired-humanities.org/content/amoxtli)** in Nahuatl means book. So this is the book of Vue.

This is a spiritual successor to [notes-on-vue](https://notes-on-vue.ackzell.dev). The goal is to provide a multimedia and interactive experience that will cater to different learning styles, with emphasis on the hands-on aspect which the original site attempted to accomplish via CodePen embeds, but it always lacked the sense of a "real" environment where to try Vue.

## Text

Same as with the original project, text based and "blog post" style content.

## Video content

We should be able to add video content. It can showcase interesting talks, particular concepts explained or even video content made explicitly as a resource to this project. eg. recorded sessions / video course.

## Interactive Playground

Besides the obvious feature why to choose [TutorialKit](https://tutorialkit.dev/) for this project ([WebContainers](https://webcontainers.io/)) Vue itself also [has a REPL](https://github.com/vuejs/repl) that when placed in a _Preview_ pane can act as a perfect companion to allow "students" to get their hands on the framework immediately. This should be really good for the very basics, providing an environment with the "sample" code for each concept, but also providing a way for users to experiment on their own without distractions.
![Screenshot 3](docs/images/yehyecoa-vue.png)

## Development

Requires [Node.js v22+](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Server runs at [http://localhost:3000](http://localhost:3000).

## Deploy

Deployed to Cloudflare Pages via GitHub Actions on every push.
