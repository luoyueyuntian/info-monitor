<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-logo" :src="brandLogo" alt="Info Monitor logo" />
        <div class="brand-copy">
          <h1>Info Monitor</h1>
          <p>Topic-driven monitoring workspace</p>
        </div>
      </div>
      <nav class="nav">
        <RouterLink to="/">Inbox</RouterLink>
        <RouterLink to="/events">Events</RouterLink>
        <RouterLink to="/themes">Themes</RouterLink>
        <RouterLink to="/sources/status">Source Status</RouterLink>
      </nav>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import brandLogo from "./assets/logo-128.png";
</script>
