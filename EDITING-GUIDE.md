# Nibble content editing guide

Nibble's live content is controlled by:

```text
data/site-data.js
```

Most future editing should happen there, not in `app.js`.

## Add a quiz question

Add a new object inside `quizQuestions`:

```js
{
  id: "q-ch1-003",
  chapter: "ch1",
  type: "multiple-choice",
  question: "What base is hexadecimal?",
  options: ["2", "8", "10", "16"],
  answer: "16",
  explanation: "Hexadecimal is base 16.",
  examTip: "Know binary, denary and hexadecimal place values.",
  source: { type: "textbook", reference: "Watson & Williams Chapter 1" }
}
```

Use chapter IDs `ch1` to `ch12`.

## Add exam-style questions

For public deployment, avoid copying full copyrighted exam questions. Adapt the question in your own words and keep a source reference:

```js
source: { type: "exam-style", reference: "Adapted from Cambridge Paper 2, algorithms topic" }
```

## Brand language

Use:

- Bite, Today's Bite, Daily Bite
- Snack Cards or Memory Bites
- Taste Test
- Today's Plate
- Almost there

Avoid:

- failed
- incorrect
- study for hours
- heavy school wording

The app behaviour is in:

```text
app.js
```

The visual brand is in:

```text
brand.css
```
