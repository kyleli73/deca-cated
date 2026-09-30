/** Made-up feeds and pages in the formats the News page reads. */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toUTCString();

export const RSS_FEED = () => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Sample Business</title>
    <atom:link href="https://news.example.com/rss" rel="self" type="application/rss+xml"/>
    <item>
      <title><![CDATA[Central bank holds interest rate as inflation cools]]></title>
      <link>https://news.example.com/rates</link>
      <description><![CDATA[<p>The bank kept its key rate at 2.75%&nbsp;on Wednesday. <img src="x.jpg"> Economists expect a cut next year.</p>]]></description>
      <pubDate>${hoursAgo(2)}</pubDate>
    </item>
    <item>
      <title>Retailer&apos;s brand refresh wins back customers</title>
      <link>https://news.example.com/retail</link>
      <description>Sales rose 8% after the rebrand &amp; new loyalty program.</description>
      <pubDate>${hoursAgo(30)}</pubDate>
    </item>
    <item>
      <title>No link here</title>
    </item>
  </channel>
</rss>`;

export const ATOM_FEED = () => `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Markets</title>
  <entry>
    <title type="html">Start-up founders face tighter credit</title>
    <link rel="alternate" href="https://markets.example.com/startups"/>
    <link rel="enclosure" href="https://markets.example.com/startups.mp3"/>
    <updated>${new Date(Date.now() - 5 * 3_600_000).toISOString()}</updated>
    <summary>Lenders are asking small businesses for more collateral.</summary>
  </entry>
</feed>`;

export const PODCAST_FEED = () => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Explainer</title>
    <item>
      <title>What is a tariff, really?</title>
      <link>https://audio.example.com/tariffs</link>
      <description>A ten-minute explainer on who pays for tariffs.</description>
      <pubDate>${hoursAgo(20)}</pubDate>
      <enclosure url="https://audio.example.com/tariffs.mp3" type="audio/mpeg" length="1"/>
    </item>
  </channel>
</rss>`;

/** Shaped like a Webflow CMS list page (DECA Direct's "Recent Articles"). */
export const DECA_PAGE = `<!doctype html><html><body>
<nav><a href="/articles">All articles</a><a href="/subcategories/business">Business</a></nav>
<div role="list" class="w-dyn-items">
  <div role="listitem" class="article-card w-dyn-item">
    <a href="/articles/competition-prep-tips" class="image-link"><img src="a.jpg" alt=""></a>
    <div class="card-body">
      <div class="category">Competition Prep</div>
      <a href="/articles/competition-prep-tips"><h3>Five Ways to Prepare for Your Cluster Exam</h3></a>
      <p>Build a study plan, take timed practice exams and review every explanation.</p>
      <div class="date">September 29, 2026</div>
    </div>
  </div>
  <div role="listitem" class="article-card w-dyn-item">
    <a href="https://www.decadirect.org/articles/finance-careers?utm=1">
      <div>Careers</div><h3>Exploring Careers in Finance</h3><div>Sep 24, 2026</div>
    </a>
  </div>
  <div role="listitem" class="article-card w-dyn-item">
    <a href="/articles/leadership-series">Emerging Leader Series: Running Great Chapter Meetings</a>
  </div>
</div>
<footer><a href="/articles/x">Go</a></footer>
</body></html>`;
