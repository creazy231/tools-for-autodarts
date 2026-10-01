<template>
  <div>
    <div @click="input?.focus()" class="adt-token-input">
      <span
        v-for="(token, index) in modelValue"
        :key="token"
        class="adt-token"
        :class="[{ 'is-invalid': errors.get(token) }]"
        :title="errors.get(token) || token"
      >
        <span class="truncate">{{ token }}</span>
        <button
          @click.stop="remove(index)"
          :aria-label="t('common.remove', { name: token })"
          class="adt-token-remove"
          type="button"
        >
          <span class="icon-[material-symbols--close-rounded]" />
        </button>
      </span>
      <input
        @blur="commit"
        @keydown="onKeydown"
        @paste="onPaste"
        :id="id"
        ref="input"
        v-model="draft"
        :placeholder="modelValue.length ? '' : placeholderText"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        type="text"
      >
    </div>
    <!--
      In the flow rather than floating: the trigger field is the last thing in
      every dialog, and a list laid over the dialog's edge would be cut off by
      its scroller.
    -->
    <div v-if="suggested.length" class="adt-suggestions" role="listbox">
      <button
        @mousedown.prevent="pick(hint.trigger)"
        v-for="(hint, index) in suggested"
        :key="hint.trigger"
        :aria-selected="index === active"
        class="adt-suggestion"
        :class="[{ 'is-active': index === active }]"
        role="option"
        tabindex="-1"
        type="button"
      >
        <span class="adt-suggestion-trigger">{{ hint.trigger }}</span>
        <span class="adt-suggestion-text">{{ hint.description }}</span>
      </button>
    </div>
    <p v-if="firstError" class="adt-field-hint !text-[var(--ad-rose-500)]">
      {{ firstError }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Values as chips in a field: triggers, board IDs.
 *
 * Enter adds what was typed, and so does leaving the field, so a Save clicked
 * with a word still in it keeps the word. Pasted lines become one chip each,
 * which is what the old one-per-line boxes held. A space never splits one,
 * because a player's name is one trigger with spaces in it.
 */
const props = withDefaults(defineProps<{
  modelValue: string[];
  id?: string;
  /** Left out, the field says "Type and press Enter" in the current language. */
  placeholder?: string;
  /** Offered as the field is typed into. */
  suggestions?: { trigger: string; description: string }[];
  /** A message for a chip that will not work, or "" for one that will. */
  validate?: (token: string) => string;
  /** Triggers are stored lower case; board IDs are kept as typed. */
  lowercase?: boolean;
}>(), {
  id: undefined,
  placeholder: undefined,
  suggestions: () => [],
  validate: undefined,
  lowercase: true,
});

const emit = defineEmits<{ "update:modelValue": [ value: string[] ] }>();

const { t } = useI18n();

const draft = ref("");
const active = ref(-1);
const input = ref<HTMLInputElement>();

const placeholderText = computed(() => props.placeholder ?? t("common.typeAndPressEnter"));
const errors = computed(() => new Map(props.modelValue.map(token => [ token, props.validate?.(token) ?? "" ])));
const firstError = computed(() => [ ...errors.value.values() ].find(Boolean) ?? "");
const suggested = computed(() => {
  const typed = normalize(draft.value);
  if (!typed) return [];
  const free = props.suggestions.filter(hint => !props.modelValue.includes(hint.trigger));
  const starting = free.filter(hint => hint.trigger.startsWith(typed));
  const containing = free.filter(hint => !hint.trigger.startsWith(typed)
    && (hint.trigger.includes(typed) || hint.description.toLowerCase().includes(typed)));
  return [ ...starting, ...containing ].slice(0, 6);
});

watch(draft, () => {
  active.value = -1;
});

function normalize(text: string): string {
  const trimmed = text.trim();
  return props.lowercase ? trimmed.toLowerCase() : trimmed;
}

function add(tokens: string[]) {
  const next = [ ...props.modelValue ];
  for (const raw of tokens) {
    const token = normalize(raw);
    if (token && !next.includes(token)) next.push(token);
  }
  if (next.length !== props.modelValue.length) emit("update:modelValue", next);
}

function commit() {
  if (draft.value.trim()) add([ draft.value ]);
  draft.value = "";
}

function pick(trigger: string) {
  add([ trigger ]);
  draft.value = "";
  input.value?.focus();
}

function remove(index: number) {
  emit("update:modelValue", props.modelValue.filter((_, at) => at !== index));
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  const list = suggested.value;

  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && list.length) {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    active.value = active.value < 0
      ? (step > 0 ? 0 : list.length - 1)
      : (active.value + step + list.length) % list.length;
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (list[active.value]) pick(list[active.value].trigger);
    else commit();
  } else if (event.key === "Backspace" && !draft.value && props.modelValue.length) {
    remove(props.modelValue.length - 1);
  } else if (event.key === "Escape" && draft.value) {
    draft.value = "";
  }
}

function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text") ?? "";
  if (!/[\r\n]/.test(text)) return; // one line pastes into the field as usual
  event.preventDefault();
  add(`${draft.value}${text}`.split(/\r\n|\n|\r/));
  draft.value = "";
}
</script>
