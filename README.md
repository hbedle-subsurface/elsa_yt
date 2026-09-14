# What people say about energy projects

Collects YouTube comments left under local coverage of energy infrastructure proposed in
Oklahoma, and gives you a page for reading and coding them.

Thirteen topics: **solar, wind, battery storage, carbon capture and CO2 pipelines,
nuclear, hydrogen, hydropower and dams, transmission lines, disposal wells and
earthquakes, geothermal, biogas and digesters**, plus agrivoltaics and solar on canals and
reservoirs. The left rail filters by any of them.

Three of those are there for reasons particular to Oklahoma.

**Hydropower** is the Pensacola Dam. FERC found the dam responsible for chronic flooding
in Miami and ordered GRDA to buy the land it floods; GRDA appealed to the D.C. Circuit.
The city and 456 property owners are in civil litigation, four tribal nations have filed
in the relicensing, and a 2019 act of Congress limited FERC's authority over this one dam
specifically. Decades of public response, tribal sovereignty and easement law in a single
case.

**Disposal wells and earthquakes** is the comparison case where opposition won. The
2009–2016 swarm, sustained public pressure, and regulation that actually changed. It also
shares its mechanism with carbon capture, so the two can be read against each other.

**Transmission lines** are where eminent domain bites, and where solar and wind fights
often end up. Oklahoma already lived through Plains & Eastern Clean Line.

Data centers live in a companion repository, **datacenter_yt** — a data center is demand
rather than generation, and on its own it sweeps every Oklahoma place in under two weeks
instead of thirteen.

**The two share one API key, so they must not run on the same day.** The YouTube quota
belongs to the Google Cloud project rather than the repository. This one runs Mondays,
datacenter_yt runs Thursdays.

`codebook.json` is deliberately identical in both, so the two exports carry the same
columns and can be stacked in a spreadsheet and compared directly. Keep them in sync.

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

## What to expect, honestly

A complete sweep of all 77 Oklahoma counties for solar returned six videos carrying
**fourteen comments**. Oklahoma local TV does cover these hearings; almost nobody comments
on the clips. That is a finding, and it is worth writing up rather than working around.

The expansion is a bet that some of the other technologies behave differently. Data
centers are the strongest candidate: a Gallup survey in March 2026 found 71% of Americans
oppose a data center near them, 48% strongly — higher than opposition to a nearby nuclear
plant — and opposition swung 49 points in nine months. Oklahoma City's council passed a
moratorium, SB 1488 would pause data centers over 100 MW statewide until 2029, HB 2992
adds ratepayer protections, and the Cherokee Nation barred them on its tribal lands. That
is a live fight with national attention behind it, which is the thing rural solar lacked.

Wind is the other candidate, on a much longer opposition history in the state.

If the other technologies come back as thin as solar did, that is the answer: this
conversation does not happen on YouTube in Oklahoma, and the effort belongs in county
minutes and written public comment instead.

---

## Where it searches

`collect/queries.json` holds everything.

Seventy-seven counties across seven technologies is 539 combinations, and YouTube allows
roughly 100 searches a day. So there are **two tiers**:

**Statewide, every run.** 37 searches covering every technology — "Oklahoma data center
moratorium", "Oklahoma wind turbine moratorium", "Oklahoma CO2 pipeline eminent domain"
and so on. Anything that makes the state news is caught within a week.

**Place by place, on rotation.** 662 place-and-technology combinations. Each run takes the
next 48 and picks up where the last one stopped, so a full cycle is about twelve weeks.

**Not every topic sweeps every place.** A topic can carry its own `places` list.
Hydropower is a Grand Lake story, so it sweeps twelve places around it. Disposal wells and
earthquakes sweeps the fifteen in the seismic belt north of Oklahoma City. Sweeping all
127 for either would spend the budget asking counties with no dam and no disposal wells.
Transmission sweeps everywhere, because lines cross the state.

Nuclear, hydrogen, geothermal, biogas, agrivoltaics and canal solar are **statewide only**
— Oklahoma has no operating reactor and the others are early enough that asking 127 places
individually would return nothing 127 times. If something appears, the statewide searches
catch it. The position is kept in
`data/runs.json` and printed at the top of every run.

**Towns matter more than they look.** Most Oklahoma counties do not zone; municipalities
do. A data center or battery site near a town is decided by a city council, and the
coverage is titled "Norman city council", never "Cleveland County" — so a county-only
sweep would miss it entirely. Towns are also a local signal in their own right, so a clip
about Yukon from a channel with no call letters is still recognized as local. Town names
are matched on word boundaries, because Ada sits inside Canada and Miami is mostly in
Florida.

85 searches a run, against roughly a hundred a day shared with datacenter_yt — which is
why the two run on different days.

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
