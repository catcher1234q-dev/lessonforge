"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const questions = [
  {
    question: "Do I need an account before I can understand the product?",
    answer:
      "No. The site is set up so you can browse the marketplace, open listings, and understand the main product flow before signing in.",
  },
  {
    question: "What should I click first if I am confused?",
    answer:
      "Start with the marketplace if you want the buyer view, the seller flow if you want to publish, or your account page if you want one signed-in home for purchases, saved items, and seller progress.",
  },
  {
    question: "Is this mainly for buyers or sellers?",
    answer:
      "Both. Buyers can browse, preview, shortlist, and purchase. Sellers can onboard, create listings, manage assets, and prepare products for buyers.",
  },
  {
    question: "What role does AI play here?",
    answer:
      "AI is optional listing help for sellers. It can support things like organization, standards suggestions, thumbnails, and listing polish, but the product is designed so the teacher stays in control.",
  },
  {
    question: "How do seller payouts work on resource sales?",
    answer:
      "LessonForge routes purchases through checkout and then applies the seller plan revenue split. The pricing section shows how much the seller keeps on each plan.",
  },
];

export function FAQPreview() {
  const [openQuestion, setOpenQuestion] = useState(questions[0]?.question ?? "");

  return (
    <section id="faq" className="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            FAQ
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            Quick answers before you click deeper.
          </h2>
        </div>

        <div className="mt-6 grid gap-3">
          {questions.slice(0, 4).map((item) => {
            const isOpen = item.question === openQuestion;

            return (
              <article
                key={item.question}
                className="rounded-[1.25rem] border border-ink/5 bg-white px-5 py-4 shadow-soft-xl"
              >
                <button
                  className="flex w-full items-center justify-between gap-4 text-left"
                  onClick={() =>
                    setOpenQuestion((current) =>
                      current === item.question ? "" : item.question,
                    )
                  }
                  type="button"
                >
                  <h3 className="text-base font-semibold text-ink">{item.question}</h3>
                  {isOpen ? (
                    <Minus className="h-5 w-5 text-brand" />
                  ) : (
                    <Plus className="h-5 w-5 text-brand" />
                  )}
                </button>
                {isOpen ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                    {item.answer}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
