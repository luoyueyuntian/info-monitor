import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    appName: "Info Monitor",
    architecture: "Vue 3 + Node API + Python worker",
  }),
});
