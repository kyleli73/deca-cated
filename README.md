# deca-cated

A local study app for DECA multiple-choice cluster exams. Import your past
exams, take them under exam conditions, review every answer with its
explanation, and track your progress. Everything stays in your browser on
your computer: no account, no server.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run dev
```

Open <http://localhost:5173>.

### Install it as an app (works offline)

```sh
npm run app
```

Open <http://localhost:5173> in Chrome or Edge and click the install icon at
the right of the address bar. After that, deca-cated opens from your dock or
Start menu and works without internet, even when `npm run app` isn't running.

`npm run dev` and `npm run app` use the same address, so they share the same
saved exams and stats.

### On your phone

The phone version is the same app, published at
<https://kyleli73.github.io/deca-cated/>. Add it to your home screen and it
opens full screen like an app and works offline:

- **iPhone:** open the address in Safari, tap **Share**, then
  **Add to Home Screen**.
- **Android:** open it in Chrome, tap the **⋮** menu, then **Install app**.

Its exams and stats are stored on the phone, separate from your computer. To
copy everything across, use **Settings → Download backup** on one device (on a
phone this opens the share sheet, so you can save it to Files or Google Drive)
and **Restore from backup…** on the other. Restoring replaces what's there.

On the phone there's no **News** (it needs the local server on your computer).
Import from links works for DECA's sample exams; for sites that block other
apps, open the link, save the PDF, and choose it as a file.

Every push to `main` rebuilds the phone version
(`.github/workflows/pages.yml`). The first time, turn it on in the repository
on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Import an exam

1. Go to **Import**.
2. Drop in the exam PDF, or paste its text. The exam should have numbered
   questions with options A–D, then an answer key: each entry has the number
   and correct letter, an explanation, a `SOURCE:` line and a code like
   `FI:093`.
3. Check the questions. Anything the importer wasn't sure about is flagged:
   - **Red** issues (missing answer, missing option) must be fixed before
     saving.
   - **Amber** warnings (no explanation, no code, an option that looks too
     long) are optional.
4. Check the exam's cluster, year and level, then save. For DECA exam PDFs
   these are filled in from the cover page ("Finance Cluster Exam",
   "2024-2025 Competitive Events Program", "for State/Province Use" =
   Association). The year is the spring year of the season, so 2024-25 is 2025.
   Sample exams only say when they were posted ("Posted online March 2019"),
   so that's 2019; they don't say a level, so check it.

Questions you already have from another exam are linked, not copied, so your
stats count each question once. If a repeated question's answer differs from
the stored copy, the review screen tells you and lets you choose which version
to keep. You can edit any question later from **Library**, which also shows
how many times you've completed each exam, your best score and when you last
took it.

Scanned PDFs (pictures of pages) have no text to read. Paste the text instead.

### Import from links

Instead of downloading PDFs yourself, paste their links into **PDF links** on
the Import page (one per line; a pasted bulleted list works too) and click
**Import N exams**. The app downloads each exam and opens it for checking; click
**Save & next** to move to the next one. DECA's posted sample exams
(`https://cdn.prod.website-files.com/…/…Sample_Exam….pdf`) download straight
from the browser. For sites that block that, the app's local server downloads
the file instead, so `npm run dev` or `npm run app` must be running.

Want to try it first? Import `samples/finance-sample-exam.pdf` or paste
`samples/finance-sample-exam-pasted.txt`. It's a 100-question practice exam
written to test the importer. It is not official DECA content, and its sources
are made up.

## Study

- **Full exam**: a stored exam or 100 random questions from the clusters you
  pick. Default time is 70 minutes (change it in Settings).
- **Mistakes review**: questions you got wrong, or got right by guessing, come
  back until you get them right without guessing on 3 different days (after
  1 day, then 3 more days).
- **Custom drill**: filter by cluster, year, instructional area or questions
  you've never seen.

During an exam, clicking an answer moves to the next question.

| Key | Does |
| --- | --- |
| <kbd>A</kbd>–<kbd>D</kbd> (or <kbd>1</kbd>–<kbd>4</kbd>) | Answer |
| <kbd>G</kbd> | Mark this question as a guess (press again to unmark) |
| <kbd>Shift</kbd>+<kbd>A</kbd>–<kbd>D</kbd> | Answer and mark it as a guess |
| <kbd>←</kbd> <kbd>→</kbd> | Previous or next question |

**Save & exit** keeps your answers and time; resume from the Study page.

### Marking guesses

A score counts lucky guesses as if you knew them. To see what you actually
know, mark a question as a guess when you aren't sure: press **G** (or click
**Guessing**) before you answer, or answer with **Shift**+letter. Guessed
questions get a dashed outline in the question grid. You can change the mark
later by going back to the question.

Afterwards:

- **Results** show **You knew** (right without guessing) next to your score,
  and split your answers into *knew it*, *lucky guesses*, *sure but wrong*
  and *guessed wrong*. *Sure but wrong* are the ones to review first: you
  thought you knew them.
- **What you know, by instructional area** ranks areas by what you got right
  without guessing. The dark part of each bar is what you knew; the light part
  is what you guessed right.
- **Guessed** in the review list shows only your guesses, and **Retry missed &
  guessed** drills both.
- Lucky guesses go into **Mistakes review** and **Wrong answers** like wrong
  answers, so you'll see them again until you know them.
- **Stats** add up all of this across every exam and drill.

### Calculator

Click **Calculator** in the top bar (on any page, including during an exam).
It docks on the right on a computer and along the bottom on a phone.

- Type straight into it or click the keys. Brackets and the normal order of
  operations work: `(12000-2000)/5` = 2,000.
- `xʸ` is for compound interest: `1000×(1+0.05)^3` = 1,157.63.
- `%` works like a phone calculator: `200+10%` = 220, `200×10%` = 20.
- **Ans** is the last answer. Click any line in **History** to reuse it.
- **Enter** = equals, **Backspace** deletes, **Delete** clears, **Esc** closes.

While you're typing in the calculator, number keys never answer the question.
Click the question again to go back to the A–D shortcuts.

## Wrong answers and Blooket

**Wrong answers** lists every question you've missed or only got right by
guessing, with your answer, the correct answer and the explanation. From there:

- **Print or save as PDF**: a clean printable copy.
- **Download for Blooket (.csv)**: name the set, then in Blooket create a
  set with that name, choose **CSV Import**, and upload the file. Blooket
  takes the questions and answers; the explanations stay in deca-cated.

Each download is listed under **Your Blooket sets**. Once the set is made on
Blooket, open it, copy its link from the address bar and paste it there. Every
question in that set then gets an **Open in Blooket ↗** link. Blooket doesn't
let other apps create sets or open a single question, so the link opens the
whole set. Only blooket.com links are accepted.

## News

**News** collects business, finance and DECA reading for between study
sessions:

- **DECA:** the latest articles from DECA Direct.
- **Business news:** CBC Business, BBC Business and NPR Business.
- **Economy explained:** NPR's *The Indicator* and *Planet Money*, short
  explainers on the economy and business.

Each article shows which DECA instructional areas it touches on (like
Economics or Business Law). Under **Sources** you can switch sources off or add
any site's RSS feed.

News sites don't let web pages read their feeds directly, so the app's own
local server (the one `npm run dev` or `npm run app` starts) fetches them for
you. It runs only on your computer, only answers deca-cated itself, and only
fetches public addresses. Articles are saved, so if you open the installed app
without the server running, or you're offline, you still see the last ones
loaded.

## Back up your data

Your data lives in this browser on this computer. Clearing the browser's site
data, or switching browsers or computers, starts you fresh. To back up:

1. **Settings → Download backup (.json)**. Keep the file somewhere safe (for
   example, Google Drive).
2. To restore, or to move to another computer: **Settings → Restore from
   backup…**. This replaces everything on that device with the backup.

## Development

```sh
npm test            # unit tests: parser, storage, stats, spaced repetition, backup, Blooket CSV
npm run test:e2e    # browser tests: full exam run-through, import review, timer, backup, offline, Blooket sets, phone version
npm run typecheck
npm run samples     # regenerate samples/ from tests/fixtures/sampleExam.ts
npm run check-pdf -- path/to/exam.pdf   # how the importer reads a PDF, without the app
```

The importer was checked against a real 2024-25 Finance Cluster exam (Test
1312). All 100 questions, options, answers, explanations, codes, performance
indicators and sources matched the PDF's text exactly. It also reads DECA's
posted Finance sample exams (2017–2021, Tests 1143, 1163, 1184, 1208 and 1229,
including 1229's two-column answer choices) and the 2025 ICDC Finance exam with
nothing flagged. Real exams are
copyrighted by MBA Research, so they are not stored in this repository; the
test fixtures copy their layout with made-up questions.

Built with Vite, React, TypeScript, Dexie (IndexedDB), pdf.js and
vite-plugin-pwa.
