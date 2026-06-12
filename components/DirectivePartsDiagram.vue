<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<template>
  <div flex="~ col items-center justify-center">
    <div
      text="~ md md:2xl"
      flex="~ col gap-2"
      font-code
    >
      <div class="directive-line">
        <span class="name">v-on</span>:<span class="argument">submit</span>.<span class="modifiers">prevent</span>="<span class="value">handleSubmit</span>"
      </div>

      <div class="directive-line">
        <span class="name" />@<span class="argument">submit</span>.<span class="modifiers">prevent</span>="<span class="value">handleSubmit</span>"
      </div>

      <div class="directive-line">
        <span class="name">v-bind</span>:<span class="argument">id</span>="<span class="value">player.id</span>"
      </div>

      <div class="directive-line">
        <span class="name" />:<span class="argument">id</span>="<span class="value">player.id</span>"
      </div>

      <div class="directive-line">
        <span class="name">v-text</span>="<span class="value">message</span>"
      </div>

      <div class="directive-line">
        <span class="name" />@<span class="argument">click</span>.<span class="modifiers">stop</span>
      </div>

      <div class="directive-line">
        <span class="name">v-if</span>="<span class="value">resolved.children?.length</span>"
      </div>

      <div class="directive-line">
        <span class="name">v-for</span>="<span class="value">{ child, idx } in splitChildrenWithIndex(node)</span>"
      </div>
    </div>
  </div>
  <div class="legend-container" flex="~ wrap gap-2">
    <div class="name">
      <h2>
        Name
      </h2>
      <p>
        Starts with `v-`. May be omitted when using shorthands
      </p>
    </div>

    <div class="argument">
      <h2>
        Argument
      </h2>
      <p>
        Follows the colon or shortand symbol
      </p>
    </div>

    <div class="modifiers">
      <h2>
        Modifiers
      </h2>
      <p>
        Denoted by the leading dot
      </p>
    </div>

    <div class="value">
      <h2>
        Value
      </h2>
      <p>
        Intepreted as JS expressions
      </p>
    </div>
  </div>
</template>

<style scoped>
.legend-container {
  div {
    flex: 1;
    min-width: 150px;

    h2 {
      margin-top: 1rem;
    }
  }
}

.legend-container .name {
  color: var(--colors-primary-500);
}

.legend-container .argument {
  color: var(--colors-info-400);
}

.legend-container .modifiers {
  color: var(--colors-tip-400);
}

.legend-container .value {
  color: var(--colors-primary-dark-300);
}

.directive-line {
  cursor: default;

  span {
    transition: color 200ms ease-out;
  }
}

.directive-line:hover .name {
  color: var(--colors-primary-500);
}

.directive-line:hover .argument {
  color: var(--colors-info-400);
}

.directive-line:hover .modifiers {
  color: var(--colors-tip-400);
}

.directive-line:hover .value {
  color: var(--colors-primary-dark-300);
}
</style>
