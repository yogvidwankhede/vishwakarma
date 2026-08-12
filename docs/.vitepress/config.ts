// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Vishwakarma',
  description:
    '21 Claude Code skills for AI coding agents — design judgment, colour, motion, accessibility, layout & theming. Works with Cursor, Windsurf, Cline & 10+ agents.',

  base: '/vishwakarma/',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Vishwakarma' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          '21 Claude Code skills for AI coding agents — design judgment, colour, motion, accessibility, layout & theming.',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          '21 Claude Code skills for AI coding agents — design judgment, colour, motion, accessibility, layout & theming.',
      },
    ],
  ],

  cleanUrls: true,

  sitemap: {
    hostname: 'https://yogvidwankhede.github.io/vishwakarma/',
  },

  themeConfig: {
    logo: { src: '/favicon.svg', width: 24, height: 24 },

    nav: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'GitHub', link: 'https://github.com/yogvidwankhede/vishwakarma' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [{ text: 'Getting started', link: '/getting-started' }],
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'The Design Contract', link: '/design-contract' },
          { text: 'The Motion Grammar', link: '/motion-grammar' },
          { text: 'Prompt engineering', link: '/prompt-engineering' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Agent integration', link: '/agents' },
          { text: 'Authoring skills', link: '/authoring-skills' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/yogvidwankhede/vishwakarma' }],

    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright © 2026 Yogvid Wankhede and the Vishwakarma project authors.',
    },

    editLink: {
      pattern: 'https://github.com/yogvidwankhede/vishwakarma/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },
})
