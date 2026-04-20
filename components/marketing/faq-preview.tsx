"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const questions = [
  {
    question: "Are payments secure?",
    answer:
      "Yes. Payments are processed through a payment provider and, after a purchase is confirmed, the resource appears in the buyer library.",
  },
  {
    question: "What happens after I buy a resource?",
    answer:
      "You can return to your library to reopen purchased resources and find support if something needs attention.",
  },
  {
    question: "Can I get a refund after downloading?",
    answer:
      "Digital purchases are usually final after access is delivered. Refunds are reviewed for broken files, missing access, misleading listings, duplicate charges, or rights issues.",
  },
  {
    question: "How do sellers get paid?",
    answer:
      "Sellers complete payout onboarding, choose a plan, and see the payout percentage before they start selling. Refunds, disputes, or rights issues can affect payout timing.",
  },
  {
    question: "Where do I go if something looks wrong?",
    answer:
      "Start with the Support page or use the report path on a product or purchase. Refund, privacy, seller agreement, and terms pages are linked in the footer.",
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
            Questions teachers usually ask.
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
