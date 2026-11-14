# Rules from the organizers' FAQ

Source: "Business Cup 2.0 | FAQ по кейсу" (150 answers). Q numbers point to that document. Where this file and `HACKATHON.md` differ, this file is newer.

## Pass/fail (any one fails the whole submission)

- **B2C only.** The person pays out of their own pocket. If an employer, school or company pays, it is B2B and fails (Q2, Q38, Q42). Freelancers paying for themselves count as B2C (Q38). A product for a teen is fine if a US parent aged 25–45 pays (Q43).
- **Web only.** Runs in the browser. A PWA and mobile-adaptive design are fine; a native app (Swift, .ipa, .apk) fails (Q60, Q87). A browser extension only as an extra; the core flow must work on the site (Q40).
- **All three items submitted:** deck PDF, production link, public GitHub repo (Q16, Q18).
- **No 18+ content, no real-money gambling, legal products only** (Q5, Q110, Q113).

## Audience and track

- Target user: US adults aged 25–45. The problem, user, prices and pitch must be US-focused at pitch time (Q6, Q29). Choosing the exact segment is part of the score (Q13).
- One main track (Money, Entertainment or Skills), one user, one main pain. Touching a second track is fine (Q9, Q10, Q80, Q101).
- Don't copy Zimran's own products (Finelo, Coursiv). Their niches are fine with a new angle (Q12, Q31, Q57).

## The product (40%: "Does it work?")

- Deployed at a public URL. Any host, free subdomain is fine (vercel.app). Not a local server, Figma or video (Q1, Q111). GitHub Pages only for static sites (Q105).
- **Link must stay live at least until the end of the final, Nov 15** (Q47, Q73).
- The jury completes the core flow **without sign-up or payment**. Accounts are allowed if there is a one-click guest or demo mode. localStorage and anonymous sessions are fine (Q54, Q65, Q99, Q115, Q135).
- Only the core flow must work end-to-end. **Hide or remove buttons that don't work** (Q3, Q85).
- **Not hardcoded** = the result depends on the input. Seed data, sample inputs and "try an example" buttons are fine if they run through the real logic and are labeled as sample/demo (Q66, Q69, Q84, Q94, Q127). The jury tries their own inputs and reads the code (Q96, Q134).
- LLMs and paid APIs are allowed and count as real if they run live on the user's input. The product must be more than a wrapper: structured path, saved data/progress, personalization, mechanics (Q32, Q36, Q56, Q136). Code doing the math with an LLM explaining it counts as real (Q96).
- Demo mode with sped-up time is fine if clearly labeled demo (Q35).
- Two-person flows: put instructions for the jury on the home page (which links, what order) (Q52).
- **UI in English** (Q75).
- Before submitting, walk the flow yourself from the production link as if you were the jury (Q118).

## Payments (20%: "What do we sell?")

- Real payments not required. **Minimum: a working paywall with a clear price.** A pricing page alone is not enough (Q37, Q67).
- Stripe test-mode checkout is a plus; showing the test card on screen is fine (Q55, Q95).
- Subscription not required; any model where the user pays (Q51). Partner revenue (e.g. bank commission) is OK as a secondary source (Q83).

## Retention

- **At least one return mechanic must be built and working** in the product: progress, personal plan, reminders, saved data (Q72, Q100).
- They value renewals over daily use: opened weekly but renewed for 6 months beats a daily habit that churns in a month (Q30).
- Seasonal products: yearly plan or one-time payment is OK if it's clear why the user comes back next season (Q148).

## Code and repo

- Any stack. Keep code clean and readable; simple working architecture beats complex unfinished (Q22, Q28).
- **Public repo** at submission with the full source of what is deployed. A private working repo is allowed alongside (Q46). No PR needed (Q104). Any license or none (Q61).
- **No keys or secrets in the repo.** Keep secret keys on the server and make sure APIs work during judging (Q26, Q46, Q48).
- Don't collect extra personal data. Sensitive topics (health, debt) are OK: no medical advice, no excess sensitive data (Q26, Q78, Q138). Add a "not legal advice" disclaimer where relevant (Q50).
- README: short setup instructions and a list of key dependencies (APIs, models) (Q23, Q48). Extra detail that doesn't fit the deck can go in the README (Q53).
- CI/CD and automated tests not required (Q23).
- Templates, libraries and generic boilerplate are fine; the product itself must be built during the hackathon. They may check commit history (Q64, Q93, Q98).

## Deck (`pitch/`)

- **PDF, in English, max 10 slides including title and appendix** (Q53, Q75, Q81).
- No video (it doesn't play in PDF): show the product with screenshots of key screens and the flow (Q76, Q145).
- Cover: problem and user, product and core flow, what they pay for and how much, why they come back, business potential, how we differ (Q86, Q141).
- Numbers expected: price, CAC by channel, retention, LTV, with sources or clear reasoning. Full TAM/SAM/SOM and detailed financial model not required (Q58, Q81, Q142). Use public benchmarks (RevenueCat, Adapty) and cite them (Q33). Clearly labeled hypotheses with sources are enough (Q49).
- Acquisition plan with cost (CAC) is a plus (Q143). No fixed ad budget; the logic matters (Q144).
- Real interviews, surveys or US user signals are a plus for Problem & user; label what is real and what is a test (Q39, Q102, Q149).
- Roadmap may mention later B2B if the submitted model is B2C (Q129).

## Originality (10%)

- Judged by mechanic and value, not category. A new segment, mechanic or value in an existing category counts as new (Q71, Q79, Q97, Q123). A B2C version of a B2B-only product counts (Q147).
- A new acquisition channel alone is not a new angle (Q31). A mobile app moved to web unchanged is a copy (Q79).
- Execution beats originality: 40% vs 10% (Q146).

## Timeline and logistics

- **Deadline: Nov 15, 12:00.** The captain submits via the emailed link: deck PDF, product URL, public GitHub URL (Q70, Q82).
- Jury reviews 12:00–15:00 in a browser (mobile-adaptive is a plus) (Q70, Q103).
- Finalists announced 15:00 in Telegram `@business_cup_2026`. Top 10 pitch live at 16:30 in Green Hall: 5 min pitch + 2 min Q&A, in Kazakh, Russian or English (Q45, Q70, Q77, Q140).
- Organizers' questions go only through the official form (Q122).
