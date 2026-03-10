<template>
  <section class="socials">
    <div class="socials__card">
      <header class="socials__header">
        <v-avatar class="socials__avatar" size="112">
          <v-img
            src="/img/ayrthon-profile.jpg"
            alt="Ayrthon portrait"
            cover
          />
        </v-avatar>

        <div class="socials__identity">
          <p class="socials__eyebrow">Social links</p>
          <h1 class="socials__name">Ayrthon</h1>
          <p class="socials__role">R&B Singer · Songwriter · Audio Engineer</p>
        </div>
      </header>

      <main class="socials__links">
        <v-btn
          v-for="link in links"
          :key="link.label"
          class="socials__button"
          :class="`socials__button--${link.key}`"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          variant="flat"
          size="large"
          block
        >
          <template #prepend>
            <span
              v-if="link.iconSrc"
              class="socials__icon"
            >
              <img
                :src="link.iconSrc"
                :alt="`${link.label} logo`"
                loading="lazy"
              />
            </span>
          </template>
          {{ link.label }}
        </v-btn>
      </main>

      <footer class="socials__footer">
        <NuxtLink to="/" class="socials__home-link">Back to home</NuxtLink>
      </footer>
    </div>
  </section>
</template>

<script setup>
const links = [
  {
    key: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/ayrthonofficial",
    iconSrc: "https://cdn.simpleicons.org/instagram/ffffff",
  },
  {
    key: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@ayrthon.music",
    iconSrc: "https://cdn.simpleicons.org/tiktok/ffffff",
  },
  {
    key: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@AyrthonOfficial",
    iconSrc: "https://cdn.simpleicons.org/youtube/ffffff",
  },
  {
    key: "twitch",
    label: "Twitch",
    href: "https://www.twitch.tv/ayrthonofficial",
    iconSrc: "https://cdn.simpleicons.org/twitch/ffffff",
  },
  {
    key: "discord",
    label: "Discord Server",
    href: "https://discord.com/invite/T3dUVpUqqw",
    iconSrc: "https://cdn.simpleicons.org/discord/ffffff",
  },
  {
    key: "spotify",
    label: "Spotify",
    href: "https://open.spotify.com/artist/5qMluevUHltbHiivTwEGcw?si=pEovKlqvS6eHJHyFis8KKQ",
    iconSrc: "https://cdn.simpleicons.org/spotify/ffffff",
  },
  {
    key: "bandcamp",
    label: "Bandcamp",
    href: "https://ayrthon.bandcamp.com/",
    iconSrc: "https://cdn.simpleicons.org/bandcamp/ffffff",
  },
];
</script>

<style scoped>
.socials {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(191, 219, 254, 0.18), transparent 55%),
    radial-gradient(circle at 100% 0%, rgba(96, 165, 250, 0.22), transparent 55%),
    radial-gradient(circle at 50% 100%, rgba(30, 64, 175, 0.45), #020617 70%);
  color: #e5edff;
}

.socials__card {
  width: 100%;
  max-width: 420px;
  border-radius: 28px;
  padding: 24px 20px 20px;
  background:
    radial-gradient(circle at 20% 0%, rgba(191, 219, 254, 0.14), transparent 60%),
    radial-gradient(circle at 100% 0%, rgba(129, 140, 248, 0.18), transparent 60%),
    rgba(15, 23, 42, 0.98);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(148, 163, 184, 0.4);
  backdrop-filter: blur(18px);
  position: relative;
  overflow: hidden;
}

.socials__card::before {
  content: "";
  position: absolute;
  inset: -40%;
  background:
    radial-gradient(circle at 0% 0%, rgba(191, 219, 254, 0.22), transparent 55%),
    radial-gradient(circle at 100% 0%, rgba(129, 140, 248, 0.24), transparent 55%);
  opacity: 0.7;
  mix-blend-mode: screen;
  pointer-events: none;
}

.socials__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}

.socials__avatar {
  box-shadow:
    0 0 0 2px rgba(148, 163, 253, 0.95),
    0 18px 45px rgba(15, 23, 42, 0.9);
  position: relative;
}

.socials__avatar::after {
  content: "";
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  border: 1px solid rgba(129, 140, 248, 0.6);
  box-shadow: 0 0 25px rgba(56, 189, 248, 0.7);
  opacity: 0.7;
  pointer-events: none;
}

.socials__identity {
  text-align: center;
}

.socials__eyebrow {
  font-size: 11px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #9ca3ff;
  margin-bottom: 6px;
}

.socials__name {
  font-size: 1.7rem;
  margin: 0;
  color: #f9fbff;
}

.socials__role {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #cbd5f5;
}

.socials__links {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
  position: relative;
  z-index: 1;
}

.socials__button {
  justify-content: center;
  border-radius: 999px;
  text-transform: none;
  font-weight: 500;
  font-size: 0.98rem;
  letter-spacing: 0.02em;
  color: #e5edff;
  /* neutral base; real color comes from per-platform modifiers */
  background-color: #020617;
  box-shadow:
    0 0 0 1px rgba(147, 197, 253, 0.7),
    0 10px 24px rgba(15, 23, 42, 0.95),
    0 1px 0 rgba(255, 255, 255, 0.03);
  border: none;
  outline: none;
  transition:
    transform 0.16s ease-out,
    box-shadow 0.16s ease-out,
    border-color 0.16s ease-out,
    background 0.16s ease-out;
}

.socials__button :deep(.v-btn__content) {
  justify-content: center;
  gap: 10px;
}

.socials__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.socials__icon img {
  display: block;
  width: 100%;
  height: 100%;
}

.socials__button--instagram {
  background: linear-gradient(90deg, #4f46e5, #ec4899);
}

.socials__button--tiktok {
  background: linear-gradient(90deg, #0f172a, #22d3ee);
}

.socials__button--youtube {
  background: linear-gradient(90deg, #b91c1c, #f97373);
}

.socials__button--discord {
  background: linear-gradient(90deg, #312e81, #6366f1);
}

.socials__button--twitch {
  background: linear-gradient(90deg, #4c1d95, #a855f7);
}

.socials__button--spotify {
  background: linear-gradient(90deg, #064e3b, #22c55e);
}

.socials__button--bandcamp {
  background: linear-gradient(90deg, #0f172a, #38bdf8);
}

.socials__button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px rgba(226, 232, 240, 0.95),
    0 18px 40px rgba(15, 23, 42, 0.9),
    0 1px 0 rgba(255, 255, 255, 0.03);
}

.socials__footer {
  margin-top: 20px;
  text-align: center;
  font-size: 0.78rem;
  color: #9aa7e4;
}

.socials__home-link {
  color: #c4d1ff;
  text-decoration: none;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.socials__home-link:hover {
  text-decoration: underline;
}

@media (min-width: 640px) {
  .socials__card {
    padding-inline: 26px;
  }
}
</style>

