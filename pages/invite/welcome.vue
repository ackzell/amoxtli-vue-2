<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<template>
  <div class="flex flex-col">
    <div class="p-4 flex justify-end">
      <ColorSchemeToggle />
    </div>

    <div text-sm m-auto h-full of-scroll prose>
      <h1 font-mono>
        Hello!
      </h1>

      <p>Gotcha! I in fact, did not one shotted it and it will hopefully show 😅😅</p>

      <p>
        In a more serious note: This is a private preview of this project. I shared it with you because I really value your opinion and I believe you would give me some raw and honest feedback. So thank you very much for being here. It is still a Work in Progress, but I think I can share what I already have to start steering in the right direction.
      </p>

      <p>
        Thank you very much for taking the time to check it out, and I trully appreciate you doing this! My goal is to get your opinions on different aspects of this "book about Vue".
      </p>

      <p>
        <ul>
          <li>On your experience with the platform:</li>
          <ul>
            <li>Whether you used something similar before. </li>
            <li>If you found some technical difficulty like a slow experience, browser hanging (😖), something that looks like it's missing... etc</li>
            <li>Anything that stood out and you felt like made a difference (for the better or the worst) Like the annotations, the step by step snippets... etc</li>
            <li>We all have opinions on design, those are welcome as well</li>
          </ul>
          <li> On the contents:</li>
          <ul>
            <li>How difficult it was to follow along</li>
            <li>If the order of the contents made it feel like progressing in understanding the framework</li>
            <li>If you think that adding more media would benefit more the project like images / animations for flows. (I am considering recording a video per lesson / per chapter)</li>
          </ul>

          <li> Any other note that you feel like sharing:</li>
        </ul>
      </p>

      <p>
        I can also perhaps share some ideas for features that I have in mind that haven't quite been implemented yet:
        <ul>
          <li>The learn.nuxt.com project had the ability to download the files, I want to re-enable that</li>
          <li>They also have a command palette , that I intend to keep and further integrate</li>
          <li>More challenges</li>
          <li>Actuall checks for whether the solution was correct</li>
          <li>Progress tracking</li>
          <li>I considered gamifisicating the platform, but I feel like that is a whole 'nother beast</li>
          <li>I am really curious about the live workshops. I envisioned <a href="https://www.youtube.com/watch?v=I73zTR3OIqQ"><code>yehyecoa-vue</code></a> for this. </li>
        </ul>
      </p>

      <p>
        And as far as the content goes:

        <ul>
          <li>More basics: events, forms, </li>
          <li>Some specific libraries like Pinia, a validataion lib, i18n</li>
          <li>Testing: vitest with testing library</li>
          <li>Fun stuff like motion for vue, TresJS</li>
        </ul>
      </p>
    </div>
  </div>
</template>>
