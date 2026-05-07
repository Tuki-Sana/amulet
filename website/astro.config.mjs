// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Amulet',
      logo: {
        src: './public/logo-icon.png',
        alt: 'Amulet',
      },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ja: { label: '日本語', lang: 'ja' },
      },
      expressiveCode: {
        themes: ['tokyo-night'],
        styleOverrides: {
          frames: {
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      customCss: ['./src/styles/starlight-theme.css'],
      sidebar: [
        {
          label: 'Fundamentals',
          translations: { ja: '基礎知識' },
          items: [
            { slug: 'concepts' },
            { slug: 'getting-started' },
            { slug: 'usage' },
            { slug: 'security' },
          ],
        },
        {
          label: 'Deployment',
          translations: { ja: 'デプロイ' },
          items: [
            { slug: 'deployment' },
            { slug: 'deploy-ubuntu' },
            { slug: 'deploy-rootless-systemd' },
          ],
        },
        {
          label: 'Maintenance',
          translations: { ja: '保守・その他' },
          items: [
            { slug: 'troubleshooting' },
            { slug: 'migration-away' },
          ],
        },
      ],
      components: {
        LanguageSelect: './src/components/LanguageToggle.astro',
      },
      head: [
        {
          tag: 'script',
          attrs: { src: '/tap-copy.js', defer: true },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
        },
        {
          tag: 'link',
          attrs: {
            href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Outfit:wght@400;600;700;900&display=swap',
            rel: 'stylesheet',
          },
        },
      ],
    }),
  ],
});
