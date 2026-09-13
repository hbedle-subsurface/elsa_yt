# What people say about solar

Collects YouTube comments left under local coverage of solar projects, and gives you a
page for reading and coding them.

Live at **https://hbedle-subsurface.github.io/elsa_YT/**

Local TV stations cover county hearings and post the clips. The comments underneath are
written by people who live there, at more length and in plainer words than a news article
reports them. That is the point of this: a news story says residents raised concerns about
property values; a comment says *they keep saying property values won't drop but my
appraiser told me otherwise, and nobody at that meeting answered the question.*

---

## Setting it up

Unlike the news crawler, this one needs a key. It is free and takes about five minutes.

1. Go to **console.cloud.google.com**, sign in, create a project (any name).
2. **APIs & Services → Library**, search for **YouTube Data API v3**, click **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**. Copy it.
4. In this repository: **Settings → Secrets and variables → Actions → New repository
   secret**. Name it exactly `YOUTUBE_API_KEY`, paste the key, save.
5. **Settings → Actions → General → Workflow permissions → Read and write permissions.**
6. **Actions → Collect comments → Run workflow.**

Restrict the key to the YouTube Data API while you are in Credentials. It cannot cost
money — the quota is free and capped, not billed — but a loose key is a loose key.

---

## The thirty day rule

**This is the constraint that shapes everything else.** YouTube's developer policies
require stored API data to be deleted or refreshed within 30 calendar days. So this cannot
be a growing archive the way the news tool is.

What happens instead: every run re-fetches the comments for every video still being
tracked, which refreshes them inside the window. When a video falls out of the tracked set
— it ages out, or the cap in `queries.json` pushes it off the end — the comment **text is
dropped**. What survives is the permalink and your own coding: your categories, your
notes, your follow-up marks. Those are your research data, not YouTube's.

Two consequences worth planning around:

- **The weekly run is load-bearing.** Miss a month and the text goes, for everything.
- **Export regularly.** *Your coding, as a table* includes the comment text. That file
  is yours to keep under your own data management plan, and that is where a permanent
  corpus should live — not in this repository.

---

## What it searches

`collect/queries.json` holds the whole search.

YouTube search is not a news database. It ignores most boolean syntax and matches loosely
against titles, descriptions and tags, so the phrases are short and plain: `"solar farm"
county meeting Oklahoma`, `"solar farm" residents oppose Kansas`, `agrivoltaics`,
`"floating solar"`. Twenty searches on the defaults, well inside the roughly 100 search
calls a day that YouTube allows.

### Which videos get their comments read

Not all of them. A search for solar returns product reviews, installer ads and explainer
channels, and their comments are useless for this. Each video is scored on its title,
channel name and description:

- A topic phrase must appear somewhere, or the video is dropped outright. This is a gate,
  not points — without it, channel boilerplate like *subscribe for more news from Payne
  County, Oklahoma* pushes consumer panel reviews over the line.
- 3 if the topic phrase is in the title, 2 if only in the description.
- 1 per hearing word — meeting, zoning, commission, moratorium, oppose — up to 2.
- 1 each for a named county, a named state, and a channel that looks like a local
  station or a county board.

Below `keep_threshold` the comments are never fetched, which saves quota and keeps the
reading list clean.

### States, stated and inferred

A video that names a state in its title or description is placed there as fact. Otherwise
it is placed by which state's search found it, which is a good guess. The two are stored
separately, exported in separate columns, and shown in the interface as "likely Oklahoma".

---

## What is stored, and what is not

Stored per comment: the text, the date, the like count, whether it is a reply, and a
permalink.

**Not stored: the author's display name, their channel, their profile picture, or
anything else identifying who wrote it.** The API returns those; this code does not
request them into storage. That is deliberate — it is better research ethics, and it makes
the IRB conversation short.

Which brings up the thing to do before Elsa codes anything in earnest: **get an IRB
determination.** Analysis of public social media is usually exempt or not human-subjects
research, but these are posts by identifiable people and having the determination on file
protects the grant. The design above is what makes that straightforward.

---

## Reading and coding

Comments are the unit. Filter down the left by state, county, topic, channel, or a search
across the comment text, then read and code.

Unlike the news tool, the suggested categories here are worth something. A headline
mentions one of the five things raised at a hearing; a comment is long enough that word
matching usually lands close. Still read before ticking — the panel says so.

Arrow keys move between comments, escape goes back. Comments you have opened are marked
read. `codebook.json` holds the 27 categories and is the same file the collector reads, so
there is only one copy.

### What comes out

| Button | File | One row per |
|---|---|---|
| Your coding, as a table | `coded_comments_<date>.csv` | comment in the current filter, with its text and one 1/0 column per category |
| The videos | `videos_<date>.csv` | video, with comment count and location |
| Back up your work | `coding_backup_<date>.json` | — |

---

## Files

```
.github/workflows/collect.yml   the weekly run and the Run workflow button
collect/collect.py              the collector; standard library only
collect/queries.json            searches, scoring, the tracking cap
codebook.json                   the concern categories
index.html                      the page and its styling
app.js                          filtering, reading, coding, exporting
data/comments.json              the comments; written by the workflow
data/videos.json                the videos they sit under
data/runs.json                  a log of each run
```

Pages must be set to `main` / root, and the repository public unless you have Pro. The
page needs a web server — it will not work opened from the file system.

Testing a change without waiting for Monday:

```
python3 collect/collect.py --dry-run                     # print the searches, call nothing
YOUTUBE_API_KEY=... python3 collect/collect.py --states Oklahoma
python3 -m http.server                                   # then open localhost:8000
```

---

## Credit

Comment data comes from the YouTube Data API v3 and remains subject to the YouTube API
Services Terms of Service. Comments belong to the people who wrote them.

Built for undergraduate research on public response to solar development in the
south-central states, at the University of Oklahoma.

## License

Creative Commons Attribution-ShareAlike 4.0 International. See `LICENSE`. This covers the
software, not the collected data.
