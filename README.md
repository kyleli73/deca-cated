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

Questions you already have from another exam are linked, not copied, so your
stats count each question once. If a repeated question's answer differs from
the stored copy, the review screen tells you and lets you choose which version
to keep. You can edit any question later from **Library**.

Scanned PDFs (pictures of pages) have no text to read. Paste the text instead.

Want to try it first? Import `samples/finance-sample-exam.pdf` or paste
`samples/finance-sample-exam-pasted.txt`. It's a 100-question practice exam
written to test the importer. It is not official DECA content, and its sources
are made up.

## Study

- **Full exam**: a stored exam or 100 random questions from the clusters you
  pick. Default time is 70 minutes (change it in Settings).
- **Mistakes review**: questions you got wrong come back until you get them
  right on 3 different days (after 1 day, then 3 more days).
- **Custom drill**: filter by cluster, year, instructional area or questions
  you've never seen.

During an exam, clicking an answer moves to the next question.

| Key | Does |
| --- | --- |
| <kbd>A</kbd>–<kbd>D</kbd> (or <kbd>1</kbd>–<kbd>4</kbd>) | Answer |
| <kbd>←</kbd> <kbd>→</kbd> | Previous or next question |

**Save & exit** keeps your answers and time; resume from the Study page.

## Wrong answers and Blooket

**Wrong answers** lists every question you've missed, with your answer, the
correct answer and the explanation. From there:

- **Print or save as PDF**: a clean printable copy.
- **Download for Blooket (.csv)**: in Blooket, create a set, choose
  **CSV Import**, and upload the file. Blooket takes the questions and
  answers; the explanations stay in deca-cated.

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
npm run test:e2e    # browser tests: full exam run-through, import review, timer, backup, offline
npm run typecheck
npm run samples     # regenerate samples/ from tests/fixtures/sampleExam.ts
npm run check-pdf -- path/to/exam.pdf   # how the importer reads a PDF, without the app
```

The importer was checked against a real 2024-25 Finance Cluster exam (Test
1312). All 100 questions, options, answers, explanations, codes, performance
indicators and sources matched the PDF's text exactly. Real exams are
copyrighted by MBA Research, so they are not stored in this repository; the
test fixtures copy their layout with made-up questions.

Built with Vite, React, TypeScript, Dexie (IndexedDB), pdf.js and
vite-plugin-pwa.
