import { computed, onMounted, onUnmounted, ref } from "vue";

export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export function useBreakpoint() {
  const width = ref(typeof window !== "undefined" ? window.innerWidth : 1280);

  function onResize() {
    width.value = window.innerWidth;
  }

  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  const sm = computed(() => width.value >= BREAKPOINTS.sm);
  const md = computed(() => width.value >= BREAKPOINTS.md);
  const lg = computed(() => width.value >= BREAKPOINTS.lg);
  const xl = computed(() => width.value >= BREAKPOINTS.xl);
  const xxl = computed(() => width.value >= BREAKPOINTS["2xl"]);

  const current = computed<Breakpoint>(() => {
    if (xxl.value) return "2xl";
    if (xl.value) return "xl";
    if (lg.value) return "lg";
    if (md.value) return "md";
    return "sm";
  });

  const isMobile = computed(() => !md.value);
  const isTablet = computed(() => md.value && !xl.value);
  const isDesktop = computed(() => xl.value);

  return { width, sm, md, lg, xl, xxl, current, isMobile, isTablet, isDesktop };
}
