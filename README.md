# What people say about solar

Collects YouTube comments left under local coverage of solar projects, and gives you a
page for reading and coding them.

Live at **https://hbedle-subsurface.github.io/elsa_yt/**

---

## What changed in this rebuild, and why

The first version searched by state and it did not work. Of 1,405 comments collected,
**71% came from two videos** — a floating solar plant in India and a canal project in
California — and only **22 of 1,405** sat under a video that named one of the eight states
at all. Three separate mistakes caused that, and all three are fixed here.

**Searching by state does nothing on YouTube.** YouTube ignores a state name when it has a
stronger title match, so "solar farm Oklahoma" returned whatever was popular about solar
farms. Local coverage is titled by county — *Payne County residents pack hearing* — so
counties are what gets searched now. The county list comes from the news crawler, which
already pulls county names out of headlines.

**The filter let anything through on a title match.** Subject and locality were added into
one score with the bar at 3, and a topic phrase in the title scored exactly 3. So
"Inside a floating solar plant of India" cleared the bar with no local signal whatever.
Those are now two separate tests and both must pass:

- *Subject* — a solar phrase appears in the title or description.
- *Local* — a named county, a named US state, broadcast call letters in the channel name
  (KFOR, WJCL, WCPO), or a county or city government channel.

Points still exist, but only to order what survives. They cannot admit anything on their
own. Replayed against the old collection, this keeps 11 videos of 36 and drops every
India, China, Britain, Central Asia, TEDx and product-channel result.

**Geography was being invented.** When a video named no state, the old version fell back
to whichever state's search found it — labelling a Georgia story as Louisiana and an
Indiana one as Missouri. That fallback is gone. A video's location comes from what the
video says, and which search found it is recorded as `found_by_search`, shown in the
interface as provenance, and never used as a place.

**The county extractor took the preceding word**, producing "These Jackson County" and
"The Llano County". Counties in the configured list are now matched by name, so Roger
Mills and Le Flore survive intact; anything outside the list falls back to a pattern that
takes one word unless the first is a real county-name prefix — El Paso, St. Charles, Dona
Ana, Val Verde, Palo Pinto.

---

## Setting it up

Needs a free YouTube API key. Five minutes:

1. **console.cloud.google.com** → create a project. Ignore the free trial banner; billing
   is not required and the quota cannot be charged.
2. **APIs & Services → Library** → **YouTube Data API v3** → Enable.
3. **APIs & Services → Credentials** → Create credentials → API key. Under API
   restrictions, restrict it to YouTube Data API v3. Leave application restrictions at
   None — Actions runs from changing IPs.
4. This repo: **Settings → Secrets and variables → Actions → New repository secret**,
   named exactly `YOUTUBE_API_KEY`.
5. **Settings → Actions → General → Workflow permissions → Read and write.**
6. **Actions → Collect comments → Run workflow.**

---

## The thirty day rule

YouTube's developer policies require stored API data to be deleted or refreshed within 30
calendar days, so this cannot be a growing archive the way the news crawler is.

Every run re-fetches comments for every tracked video, which keeps them inside the window.
When a video drops out of the tracked set, its comment **text is removed** — the permalink
and your own coding survive, because your categories and notes are your research data, not
YouTube's.

So: the weekly run is load-bearing, and **export regularly**. *Your coding, as a table*
includes the comment text, and that file under your own data management plan is where a
permanent corpus belongs.

---

## Where it searches

`collect/queries.json` holds everything.

**All 77 Oklahoma counties**, one search each, listed in `extra_counties`. A complete
sweep of one state rather than the counties a reporter happened to write about, so a quiet
county is a finding instead of a gap. 77 county searches plus 6 national ones is 83, which
fits inside a single run, so no rotation is needed and every county is checked every week.

`county_source.url` is set to `null`, so nothing is pulled from the news crawler. Point it
at the crawler's `articles.json` to have counties added automatically as it finds them —
useful if you later add Texas, where listing all 254 counties would not fit in a run.

`home_state` is Oklahoma. Four Oklahoma county names — Delaware, Texas, Oklahoma and
Washington — are also state names or repeat in other states, so searches for them turn up
coverage from Ohio, Missouri and elsewhere. Those results are kept and flagged rather than
dropped, with a filter in the left rail to hide them. A state name directly followed by
"County" is read as a county, not a state.

Agrivoltaics and canal or reservoir solar are searched nationally rather than by county,
since the volume is too low to split up. They still have to pass the local test, which is
what keeps the global explainer channels out.

---

## What is stored, and what is not

Per comment: the text, the date, the like count, whether it is a reply, and a permalink.

**Not stored: the author's name, channel, or profile image.** The API returns them; this
code does not request them into storage. That is deliberate — better ethics, and it makes
the IRB conversation short. Get the determination before coding in earnest; public social
media analysis is usually exempt, but these are posts by identifiable people and having it
on file protects the grant.

---

## Weekly or daily

Weekly. All 83 searches fit in one run, so a daily schedule would repeat the same sweep
every day for results that change on the scale of months, and it would spend 83 of the
roughly 100 daily search calls doing it — leaving no room to trigger a manual run when you
want to test something.

If you want it anyway, change the cron in `.github/workflows/collect.yml` from
`'17 13 * * 1'` to `'17 13 * * *'`. Twice a week, `'17 13 * * 1,4'`, is a reasonable middle
if an active controversy is accruing comments faster than weekly.

---

## Honest expectations

This returns tens of relevant videos, not hundreds. Local TV does not cover every county
hearing, and when it does the comments skew toward people arguing about solar in general
rather than neighbors describing their own county. Treat it as a supporting source. The
news crawler is the better instrument, and for what people actually say in their own
words, county meeting minutes and written public comment are better than either.

It is also not a sample of public opinion. It is people who watched a local clip and felt
strongly enough to type. Good for *what arguments get made and in what words*; no use for
*how many people think X*.

---

## Files

```
.github/workflows/collect.yml   the weekly run and the Run workflow button
collect/collect.py              the collector; standard library only
collect/queries.json            counties, searches, the two tests, the caps
codebook.json                   the concern categories
index.html                      the page and its styling
app.js                          filtering, reading, coding, exporting
data/comments.json              the comments; written by the workflow
data/videos.json                the videos they sit under
data/runs.json                  run history and the county rotation cursor
```

Pages must be `main` / root, and the repo public unless you have Pro. The page needs a web
server; it will not work opened from the file system.

```
python3 collect/collect.py --dry-run                    # print the searches, call nothing
YOUTUBE_API_KEY=... python3 collect/collect.py --counties "Payne County, Reno County"
python3 -m http.server                                  # then open localhost:8000
```

## Credit

Comment data comes from the YouTube Data API v3 and remains subject to the YouTube API
Services Terms of Service. Comments belong to the people who wrote them.

Built for undergraduate research on public response to solar development in the
south-central states, at the University of Oklahoma.

## License

Creative Commons Attribution-ShareAlike 4.0 International. See `LICENSE`. Covers the
software, not the collected data.
