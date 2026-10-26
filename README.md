<img width="582" height="760" alt="image" src="https://github.com/user-attachments/assets/5d1f9214-8cf4-4269-9896-f110897f1690" /># Homework Buddy

A web app where children aged 8 to 9 practise from their school books and a parent prepares them for exams. It runs in a laptop or PC browser (it is built to be published as a Claude artifact) and keeps its data with the viewer.

Open source under the [MIT licence](LICENSE). The licence covers the code only; no school book, exam paper or other third-party content is part of this repository.

![The book shelf and contents page, shown with the sample content](docs/screenshots/books-sample.png)

## What is in this repository
The app engine and screens only:
- question engine: seeded generators, answer checking, worksheets with rebuildable codes, school-style exams, print and PDF, "enter answers from paper";
- practice screens, parent progress page, rewards (a companion, stamps), Word Quest typing practice;
- the design mockups and decisions (`docs/design/`);
- how a new book is added (`docs/BOOK_PIPELINE.md`).

## What is NOT in this repository
- **No book text.** The school books, their exercises, question banks, transcripts and exam papers are copyrighted and live in a separate private repository.
- **No children's data.** The app keeps profiles and progress on the viewer's side; nothing about real children is stored here.
- The app's book registry uses generic chapter titles ("Maths unit 3"); the design mockups under `docs/design/` may show book-style sample titles.

## Building with the sample content
To let the app build and its tests run, this tree ships small original samples written for it (`src/subjects/SAMPLE_CONTENT.md`): a Maths unit (adding and comparing numbers), a made-up reading lesson and a placeholder map.

```
npm ci
npm run typecheck
npm test
npm run build      # one self-contained page in dist/
npm run dev        # local development server
```

Everything you see in the running app comes from the sample content; the real books are not included. To use your own private content, see `ARCHITECTURE.md` ("Plugging in your own content") and `docs/BOOK_PIPELINE.md`.

Third-party notices: `NOTICE.md` and `THIRD_PARTY.md`.

## Credits
Created by Hokage-Nanadaime, built together with Claude (Anthropic). See `AUTHORS.md`.
Maintained by Hokage-Nanadaime
## Contributing
Contributions are welcome as pull requests; the owner reviews and merges every one. See `CONTRIBUTING.md`.
