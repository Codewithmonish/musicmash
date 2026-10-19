import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Our font sizes are named (text-body-sm, text-display...). Without this, tailwind-merge would
// read them as text *colours* and drop e.g. text-white when both appear in one class list.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'body-sm', 'body', 'subheading', 'heading-sm', 'heading', 'display'] }],
    },
  },
})

/** Join class names; later Tailwind classes win over earlier conflicting ones. */
export const cn = (...inputs) => twMerge(clsx(inputs))
