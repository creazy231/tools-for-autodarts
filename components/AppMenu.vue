<template>
  <div ref="root" class="relative inline-flex">
    <slot :open="open" :toggle="toggle" name="trigger" />
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="scale-95 opacity-0"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        @keydown="onKeydown"
        v-if="open"
        ref="menu"
        :class="above ? 'origin-bottom' : 'origin-top'"
        :style="position"
        class="adt-menu"
        role="menu"
      >
        <template v-for="(item, index) in items" :key="item.label">
          <div v-if="item.separated && index > 0" class="adt-menu-divider" role="separator" />
          <button
            @click="choose(item)"
            class="adt-menu-item"
            :class="[{ 'is-danger': item.danger }]"
            :disabled="item.disabled"
            role="menuitem"
            type="button"
          >
            <span v-if="item.icon" class="adt-menu-item-icon" :class="[item.icon]" />
            <span class="min-w-0">
              {{ item.label }}
              <span v-if="item.hint" class="adt-menu-item-hint">{{ item.hint }}</span>
            </span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * A button that opens a short list of actions, on the site's popover surface.
 *
 * Fixed rather than absolute, placed from the trigger's box. The settings
 * dialogs scroll, and a menu inside the scroller was cut off at its edge. So
 * the menu closes on any scroll instead of drifting from its button: in our
 * shadow root, and in the page around it, as the Tools page scrolls its host
 * element and scroll events do not cross the shadow boundary. Outside clicks
 * are read from the composed path, because a click in the shadow root reaches
 * `document` retargeted to the host.
 */
interface MenuItem {
  label: string;
  hint?: string;
  /** A literal `icon-[…]` class, so Tailwind finds it in the source. */
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Draw a line above it. */
  separated?: boolean;
  action: () => void;
}

const props = withDefaults(defineProps<{
  items: MenuItem[];
  /** Which edge of the trigger the menu lines up with. */
  align?: "start" | "end";
}>(), {
  align: "end",
});

const open = ref(false);
const above = ref(false);
const position = ref<Record<string, string>>({});
const root = ref<HTMLElement>();
const menu = ref<HTMLElement>();
let scope: Node | undefined;

onBeforeUnmount(unlisten);

async function toggle() {
  if (open.value) close();
  else await show();
}

async function show() {
  const trigger = root.value?.getBoundingClientRect();
  if (!trigger) return;

  above.value = false;
  position.value = { top: `${trigger.bottom + 8}px` };
  open.value = true;
  listen();
  await nextTick();

  // Lined up with the trigger's edge, and slid along when it is wider than the
  // room on that side, so that it keeps clear of the far edge too: under a
  // button in the middle of a phone screen. offsetWidth, because the enter
  // transition is still scaling the rect down.
  const room = window.innerWidth - 8 - (menu.value?.offsetWidth ?? 0);
  const edge: Record<string, string> = props.align === "end"
    ? { right: `${Math.max(8, Math.min(window.innerWidth - trigger.right, room))}px` }
    : { left: `${Math.max(8, Math.min(trigger.left, room))}px` };
  position.value = { ...edge, top: `${trigger.bottom + 8}px` };

  // Upwards when it would run off the bottom and there is more room above.
  const box = menu.value?.getBoundingClientRect();
  if (box && box.bottom > window.innerHeight - 8 && trigger.top > window.innerHeight - trigger.bottom) {
    above.value = true;
    position.value = { ...edge, top: `${Math.max(8, trigger.top - 8 - box.height)}px` };
  }
  menu.value?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
}

function close() {
  open.value = false;
  unlisten();
}

function choose(item: MenuItem) {
  close();
  item.action();
}

function onKeydown(event: KeyboardEvent) {
  const buttons = [ ...(menu.value?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []) ];
  const at = buttons.indexOf(event.target as HTMLButtonElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  } else if (event.key === "Escape") {
    event.preventDefault();
    close();
    root.value?.querySelector<HTMLElement>("button")?.focus();
  } else if (event.key === "Tab") {
    close();
  }
}

function onPointerDown(event: PointerEvent) {
  if (root.value && !event.composedPath().includes(root.value)) close();
}

function listen() {
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("scroll", close, true);
  scope = root.value?.getRootNode();
  scope?.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);
}

function unlisten() {
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("scroll", close, true);
  scope?.removeEventListener("scroll", close, true);
  window.removeEventListener("resize", close);
}
</script>
