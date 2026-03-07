<template>
  <section class="landing">
    <div class="landing__overlay">
      <main class="landing__content">
        <div class="landing__copy">
          <p class="landing__eyebrow">R&B Singer - Songwriter / Audio Engineer</p>
          <h1 class="landing__title">The Official Ayrthon Website</h1>
        </div>

        <div class="landing__actions">
          <v-btn
            class="landing__primary"
            color="primary"
            variant="flat"
            size="large"
            href="https://ayrthon.bandcamp.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buy music!
          </v-btn>

          <v-btn
            class="landing__secondary"
            color="primary"
            variant="text"
            size="large"
            href="https://open.spotify.com/artist/5qMluevUHltbHiivTwEGcw?si=EdUmPh78SxyviXTWE5yjYg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Spotify!
          </v-btn>
        </div>
      </main>

      <footer class="landing__footer">
        <span>© {{ year }} Ayrthon. All rights reserved.</span>
      </footer>
    </div>
  </section>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style scoped>
.landing {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  color: #e7edff;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 10% 10%, rgba(80, 140, 255, 0.55), transparent 55%),
    radial-gradient(circle at 80% 90%, rgba(44, 80, 200, 0.7), transparent 55%),
    #02061a;
  position: relative;
  overflow: hidden;
}

.landing::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("/img/ayrthon-hero.jpg");
  background-size: cover;
  background-position: 70% center;
  background-repeat: no-repeat;
  opacity: 0.9;
  mix-blend-mode: screen;
  pointer-events: none;
}

.landing__overlay {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  width: 100%;
  padding: 32px 24px 40px;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.landing__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 620px;
}

.landing__eyebrow {
  font-size: 13px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #9ab7ff;
  margin-bottom: 16px;
}

.landing__title {
  font-size: clamp(2.4rem, 3.2vw + 1.4rem, 3.7rem);
  line-height: 1.05;
  margin: 0 0 16px;
  color: #f3f7ff;
  text-shadow:
    0 0 18px rgba(0, 34, 102, 0.9),
    0 0 44px rgba(0, 140, 255, 0.7);
}

.landing__subtitle {
  font-size: 0.98rem;
  line-height: 1.7;
  color: #c0c8f2;
  max-width: 36rem;
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
}

.landing__primary {
  border-radius: 999px;
  padding-inline: 28px;
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.03em;
  box-shadow:
    0 16px 45px rgba(7, 86, 190, 0.7),
    0 0 0 1px rgba(156, 194, 255, 0.28);
}

.landing__secondary {
  border-radius: 999px;
  padding-inline: 24px;
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.03em;
  backdrop-filter: blur(14px);
  background-color: rgba(3, 13, 46, 0.85);
  box-shadow: 0 0 0 1px rgba(123, 166, 255, 0.5);
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.landing__secondary:hover {
  background-color: #1db954 !important;
  color: #fff !important;
  box-shadow: 0 0 0 1px rgba(29, 185, 84, 0.5);
}

.landing__footer {
  margin-top: 72px;
  font-size: 0.8rem;
  color: #8f9ad6;
}

@media (max-width: 768px) {
  .landing::before {
    background-position: 75% center;
    opacity: 0.75;
  }

  .landing__overlay {
    padding: 24px 20px 32px;
  }

  .landing__eyebrow {
    letter-spacing: 0.12em;
    font-size: 12px;
  }

  .landing__title {
    font-size: 2.1rem;
  }

  .landing__subtitle {
    font-size: 0.95rem;
  }

  .landing__footer {
    margin-top: 48px;
  }
}
</style>
