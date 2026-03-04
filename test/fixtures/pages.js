export const strongHtml = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AI NYC | Answer Engine Optimization</title>
  <meta property="og:title" content="AI NYC | Answer Engine Optimization" />
  <meta name="geo.region" content="US-NY" />
  <link rel="canonical" href="https://ainyc.ai/" />
  <link rel="alternate" type="text/markdown" href="/llms.txt" />
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "ProfessionalService"],
      "name": "AI NYC",
      "email": "hello@ainyc.ai",
      "telephone": "+1-212-555-0100",
      "dateModified": "2026-02-01",
      "sameAs": ["https://ainyc.ai", "https://en.wikipedia.org/wiki/New_York_City"],
      "areaServed": [{"@type": "City", "name": "New York"}],
      "geo": {"@type": "GeoCoordinates", "latitude": 40.7128, "longitude": -74.0060},
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "New York",
        "addressRegion": "NY",
        "addressCountry": "US"
      },
      "knowsAbout": ["Answer Engine Optimization", "JSON-LD"],
      "founder": [{"@type": "Person", "name": "Arber"}]
    }
  </script>
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is AEO?",
          "acceptedAnswer": {"@type": "Answer", "text": "AEO helps you rank in AI answers."}
        }
      ]
    }
  </script>
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to improve AEO",
      "step": [{"@type": "HowToStep", "name": "Add schema"}]
    }
  </script>
</head>
<body>
  <h1>What is Answer Engine Optimization?</h1>
  <h2>How to improve AEO</h2>
  <h2>Why entity authority matters?</h2>
  <h3>Step by step implementation</h3>
  <p>AI NYC helps NYC businesses get cited in ChatGPT, Gemini, and Perplexity.</p>
  <p>Copyright 2026 AI NYC. Contact hello@ainyc.ai.</p>
  <ol>
    <li>Audit current visibility</li>
    <li>Deploy JSON-LD</li>
    <li>Publish llms files</li>
  </ol>
  <dl>
    <dt>AEO</dt>
    <dd>Answer Engine Optimization</dd>
  </dl>
  <details>
    <summary>What is AEO?</summary>
    <p>AEO is optimization for AI answer engines.</p>
  </details>
  <details>
    <summary>How is AEO different from SEO?</summary>
    <p>AEO targets model answers.</p>
  </details>
  <a href="https://en.wikipedia.org/wiki/Answer_engine_optimization">AEO history on Wikipedia</a>
  <a href="https://www.nyc.gov/">NYC official resources</a>
</body>
</html>
`

export const weakHtml = `
<!doctype html>
<html>
<head>
  <title>Site</title>
</head>
<body>
  <p>Hello world.</p>
</body>
</html>
`

export const defaultAuxiliary = {
  llmsTxt: {
    state: 'ok',
    body: '# llms\n' + 'word '.repeat(120),
  },
  llmsFullTxt: {
    state: 'ok',
    body: '# llms full\n' + 'word '.repeat(260),
  },
  robotsTxt: {
    state: 'ok',
    body: `User-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /`,
  },
  sitemapXml: {
    state: 'ok',
    body: `<urlset><url><loc>https://ainyc.ai/</loc><lastmod>2026-02-20</lastmod></url></urlset>`,
  },
}
