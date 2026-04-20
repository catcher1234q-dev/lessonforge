from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import fitz
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, PageBreak, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "seed-marketplace-products.json"
PDF_DIR = ROOT / "seed-assets" / "launch-products"
PREVIEW_DIR = ROOT / "public" / "catalog-previews"


SELLERS = {
    "avery": {
        "sellerName": "Avery Johnson",
        "sellerHandle": "@teachwithavery",
        "sellerId": "avery-johnson",
        "sellerStripeAccountEnvKey": "STRIPE_CONNECTED_ACCOUNT_AVERY",
    },
    "monica": {
        "sellerName": "Monica Rivera",
        "sellerHandle": "@literacywithmonica",
        "sellerId": "monica-rivera",
        "sellerStripeAccountEnvKey": "STRIPE_CONNECTED_ACCOUNT_MONICA",
    },
    "theo": {
        "sellerName": "Theo Barnes",
        "sellerHandle": "@sciencewiththeo",
        "sellerId": "theo-barnes",
        "sellerStripeAccountEnvKey": "STRIPE_CONNECTED_ACCOUNT_THEO",
    },
    "priya": {
        "sellerName": "Priya Ellis",
        "sellerHandle": "@socialstudieswithpriya",
        "sellerId": "priya-ellis",
        "sellerStripeAccountEnvKey": "STRIPE_CONNECTED_ACCOUNT_PRIYA",
    },
}


def spec(
    *,
    product_id: str,
    title: str,
    subject: str,
    grade_band: str,
    standards_tag: str,
    format_label: str,
    resource_type: str,
    price_cents: int,
    seller: str,
    summary: str,
    short_description: str,
    full_description: str,
    tags: list[str],
    focus_skills: list[str],
    student_prompts: list[str],
    teacher_notes: list[str],
    answer_key: list[str],
):
    return {
        "id": product_id,
        "title": title,
        "subject": subject,
        "gradeBand": grade_band,
        "standardsTag": standards_tag,
        "format": format_label,
        "resourceType": resource_type,
        "priceCents": price_cents,
        "seller": seller,
        "summary": summary,
        "shortDescription": short_description,
        "fullDescription": full_description,
        "tags": tags,
        "focusSkills": focus_skills,
        "studentPrompts": student_prompts,
        "teacherNotes": teacher_notes,
        "answerKey": answer_key,
    }


PRODUCT_SPECS = [
    spec(
        product_id="math-stripe-test-5",
        title="5th Grade Math Spiral Review, 4 Weeks, Daily Warm Ups",
        subject="Math",
        grade_band="Grade 5",
        standards_tag="CCSS.MATH.CONTENT.5.NBT.B.7",
        format_label="Spiral Review Pack",
        resource_type="Warm-Up Pack",
        price_cents=600,
        seller="avery",
        summary="A four-week spiral review set with daily fifth grade warm-ups for decimals, fractions, place value, and multi-step problem solving.",
        short_description="Use these daily warm-ups for bell work, morning work, or quick independent review with built-in teacher support.",
        full_description="This fifth grade spiral review pack gives teachers a month of ready-to-use math warm-ups. The pages mix decimal operations, fraction reasoning, place value, and multi-step word problems so students keep major skills fresh all month long. The file includes student practice, simple teacher pacing notes, and an answer key that supports fast daily review.",
        tags=["math spiral review", "daily warm ups", "decimal review", "fractions", "Grade 5"],
        focus_skills=["decimal addition and subtraction", "fraction comparison", "place value reasoning", "multi-step word problems"],
        student_prompts=[
            "Solve 6.45 + 2.8. Explain how lining up the decimal helps you keep the place values correct.",
            "Compare 7/8 and 5/6. Write one sentence that explains which fraction is closer to 1.",
            "Round 48.392 to the nearest tenth and nearest whole number.",
            "A class read 128 pages in 4 days. If the pages were shared evenly, how many pages were read each day?",
            "Order 0.57, 0.507, 0.75, and 0.705 from least to greatest.",
            "Solve 9.2 - 3.87 and describe where regrouping was needed.",
        ],
        teacher_notes=[
            "Use one page each day for 10 to 12 minutes of independent math review before the lesson block starts.",
            "Invite students to circle one problem they want to discuss so the whole-group debrief stays focused and quick.",
            "Students who need support can use place value charts or fraction bars before solving independently.",
        ],
        answer_key=[
            "6.45 + 2.8 = 9.25",
            "7/8 is closer to 1 than 5/6 because 7/8 is 1/8 away and 5/6 is 1/6 away",
            "48.392 rounds to 48.4 and 48",
            "128 pages shared over 4 days = 32 pages each day",
        ],
    ),
    spec(
        product_id="math-fractions-4",
        title="4th Grade Fractions Practice",
        subject="Math",
        grade_band="Grade 4",
        standards_tag="CCSS.MATH.CONTENT.4.NF.A.1",
        format_label="Fractions Practice Pack",
        resource_type="Worksheet Pack",
        price_cents=650,
        seller="avery",
        summary="A printable fourth grade fractions resource with visual models, equivalent fractions, comparing fractions, and independent practice.",
        short_description="Students build fraction confidence with clear models, comparison problems, and answer-supported practice pages.",
        full_description="This fourth grade fractions practice pack is designed for classroom use right away. Teachers get printable student pages for visual fraction models, equivalent fraction practice, and fraction comparison tasks that fit whole-group lessons, partner work, small groups, or homework. The included notes and answer key make it easy to use for both instruction and review.",
        tags=["fractions", "equivalent fractions", "4th grade math", "worksheet pack", "fraction models"],
        focus_skills=["equivalent fractions", "fraction models", "comparing fractions", "math explanation"],
        student_prompts=[
            "Shade 3/4, 5/8, and 2/3 on separate fraction bars. Label the numerator and denominator for each model.",
            "Complete: 1/2 = __/4 = __/8 and 2/3 = __/6 = __/12.",
            "Compare 5/8 and 3/8 with >, <, or = and explain why the numerators matter here.",
            "Compare 4/5 and 7/10 by using a common denominator or a visual model.",
            "Draw a model for 3/6 and write an equivalent fraction.",
            "Mia ate 3/4 of a pizza and Eli ate 5/8 of a pizza. Who ate more? Show your reasoning.",
        ],
        teacher_notes=[
            "Model one visual fraction problem together before students begin the independent page.",
            "Keep fraction strips available for students who still need a concrete bridge to abstract comparison work.",
            "Ask students to explain one equivalent fraction match in words, not only with numbers.",
        ],
        answer_key=[
            "1/2 = 2/4 = 4/8",
            "2/3 = 4/6 = 8/12",
            "5/8 > 3/8 because the denominators are the same and 5 parts are greater than 3 parts",
            "4/5 > 7/10 because 4/5 = 8/10",
        ],
    ),
    spec(
        product_id="math-multiplication-fluency-3",
        title="3rd Grade Multiplication Fluency",
        subject="Math",
        grade_band="Grade 3",
        standards_tag="CCSS.MATH.CONTENT.3.OA.C.7",
        format_label="Fluency Worksheet Set",
        resource_type="Worksheet Set",
        price_cents=500,
        seller="avery",
        summary="A third grade multiplication fluency set with equal-group models, arrays, fact families, and mixed facts to 12.",
        short_description="Students practice multiplication facts with models and strategy reminders instead of drill-only pages.",
        full_description="This third grade multiplication fluency resource helps students move from equal groups and arrays into more automatic fact recall. The pages are built for real classroom practice with visual support, mixed fact review, and a short teacher-friendly answer key. It works well for centers, intervention, morning work, or quick homework practice.",
        tags=["multiplication fluency", "arrays", "equal groups", "facts to 12", "Grade 3"],
        focus_skills=["equal groups", "arrays", "facts to 12", "fact families"],
        student_prompts=[
            "Draw 4 groups of 3 and write the matching multiplication equation and total.",
            "Use an array to show 6 x 4. Label the rows and columns clearly.",
            "Solve 7 x 3, 8 x 2, 9 x 5, and 4 x 11.",
            "Find the missing factor: __ x 5 = 35 and 4 x __ = 28.",
            "Write two multiplication equations that both have a product of 24.",
            "Explain how an array helps you solve 8 x 3.",
        ],
        teacher_notes=[
            "Begin with counters or graph paper if students still need a concrete model for each fact family.",
            "Let students highlight one fact they know quickly and one fact they still solve with a strategy.",
            "Use the quick check page as a small-group placement tool rather than as a timed test.",
        ],
        answer_key=[
            "4 groups of 3 = 12",
            "6 x 4 = 24",
            "7 x 3 = 21, 8 x 2 = 16, 9 x 5 = 45, 4 x 11 = 44",
            "7 x 5 = 35 and 4 x 7 = 28",
        ],
    ),
    spec(
        product_id="math-place-value-2",
        title="2nd Grade Place Value",
        subject="Math",
        grade_band="Grade 2",
        standards_tag="CCSS.MATH.CONTENT.2.NBT.A.1",
        format_label="Place Value Activity Pack",
        resource_type="Activity Pack",
        price_cents=475,
        seller="avery",
        summary="A second grade place value pack for hundreds, tens, and ones with base-ten visuals, number comparisons, and place value writing.",
        short_description="Students practice building, reading, and comparing numbers to 1,000 using classroom-friendly place value pages.",
        full_description="This second grade place value pack focuses on hundreds, tens, and ones through simple printable activities that fit math workshop, small groups, and independent review. Students build numbers with base-ten blocks, compare numbers, and explain the value of digits using clear models and teacher-supported routines.",
        tags=["place value", "hundreds tens ones", "base ten blocks", "Grade 2", "number sense"],
        focus_skills=["hundreds tens ones", "base-ten blocks", "comparing numbers", "expanded form"],
        student_prompts=[
            "Build 245 with base-ten blocks. Write how many hundreds, tens, and ones you used.",
            "Compare 317 and 371 with >, <, or = and explain which digit helped you decide first.",
            "Write 408 in expanded form and words.",
            "Show the value of the 6 in 362 and the value of the 6 in 268.",
            "Order 219, 291, and 192 from least to greatest.",
            "Write a number that has 5 hundreds, 3 tens, and 7 ones.",
        ],
        teacher_notes=[
            "Use base-ten blocks or quick sketches before moving students into written explanations.",
            "Ask students to say the value of a digit out loud before writing it in expanded form.",
            "The compare-and-explain prompts work especially well in partner math talk.",
        ],
        answer_key=[
            "245 = 2 hundreds, 4 tens, 5 ones",
            "317 < 371 because the tens digit 1 is less than 7",
            "408 = 400 + 8",
            "5 hundreds, 3 tens, 7 ones = 537",
        ],
    ),
    spec(
        product_id="math-intervention-5",
        title="5th Grade Decimal Operations",
        subject="Math",
        grade_band="Grade 5",
        standards_tag="CCSS.MATH.CONTENT.5.NBT.B.7",
        format_label="Decimal Intervention Pack",
        resource_type="Intervention Pack",
        price_cents=700,
        seller="avery",
        summary="A decimal operations pack with guided examples, place value support, practice pages, and a quick assessment.",
        short_description="Use this decimal intervention file for reteach groups, targeted review, or independent decimal practice.",
        full_description="This fifth grade decimal operations pack is built for teachers who need a clean reteach or intervention resource. The pages focus on adding, subtracting, and multiplying decimals with models, worked examples, and short practice sets that help students explain their thinking as they compute.",
        tags=["decimal operations", "math intervention", "Grade 5", "small group", "decimal practice"],
        focus_skills=["decimal addition", "decimal subtraction", "decimal multiplication", "place value support"],
        student_prompts=[
            "Solve 4.6 + 2.75 and label the ones, tenths, and hundredths places in your answer.",
            "Solve 8.2 - 3.47 and explain where regrouping happened.",
            "Multiply 3.4 x 2. Show the product with a place value sketch or number sentence.",
            "Compare 4.08 and 4.8. Explain why the zero matters.",
            "Write a decimal that is between 6.12 and 6.13 and explain why it fits.",
            "A teacher bought markers for $3.75 and stickers for $2.40. What was the total cost?",
        ],
        teacher_notes=[
            "Students who struggle can first place each problem on a blank place value chart before computing.",
            "Encourage students to say decimal numbers correctly so place value language becomes more precise.",
            "Use the final word problem as a quick check for operation choice and decimal setup.",
        ],
        answer_key=[
            "4.6 + 2.75 = 7.35",
            "8.2 - 3.47 = 4.73",
            "3.4 x 2 = 6.8",
            "4.08 < 4.8 because 4.8 is 4.80",
        ],
    ),
    spec(
        product_id="math-geometry-centers-5",
        title="4th Grade Geometry",
        subject="Math",
        grade_band="Grade 4",
        standards_tag="CCSS.MATH.CONTENT.4.G.A.1",
        format_label="Geometry Practice Pack",
        resource_type="Practice Pack",
        price_cents=575,
        seller="avery",
        summary="A fourth grade geometry pack covering points, lines, angles, parallel lines, and shape classification with printable practice pages.",
        short_description="Students identify and classify geometry basics with pages that work in centers, review, or whole-group lessons.",
        full_description="This fourth grade geometry resource helps students learn the language of points, lines, angles, and shapes through clear printable practice. The file includes vocabulary support, shape-classification prompts, and teacher notes that fit everyday classroom instruction without extra prep.",
        tags=["geometry", "angles", "shapes", "Grade 4", "math centers"],
        focus_skills=["angles", "parallel and perpendicular lines", "shape classification", "geometry vocabulary"],
        student_prompts=[
            "Label a point, line segment, ray, and line on the sample diagram.",
            "Circle the pair of lines that are parallel and the pair that are perpendicular.",
            "Sort the shapes into quadrilaterals, triangles, and other polygons.",
            "Name one acute angle, one right angle, and one obtuse angle in the picture.",
            "Explain how a rectangle and a square are alike and different.",
            "Write one sentence that uses the words line segment and angle correctly.",
        ],
        teacher_notes=[
            "Review the geometry vocabulary aloud before students work independently on the classification page.",
            "Have students trace the sides of shapes with a finger to slow down and notice angle changes.",
            "The comparison question between a rectangle and square works well as a math journal entry.",
        ],
        answer_key=[
            "Students should correctly identify points, line segments, rays, and lines based on arrows and endpoints",
            "Parallel lines never meet and perpendicular lines form right angles",
            "Squares and rectangles are both quadrilaterals with four right angles",
            "An acute angle is less than 90 degrees and an obtuse angle is greater than 90 degrees",
        ],
    ),
    spec(
        product_id="reading-comprehension-passages-3",
        title="3rd Grade Reading Comprehension Passages",
        subject="Reading",
        grade_band="Grade 3",
        standards_tag="CCSS.ELA-LITERACY.RI.3.1",
        format_label="Reading Passage Pack",
        resource_type="Passage Pack",
        price_cents=650,
        seller="monica",
        summary="A set of short third grade reading passages with text-dependent questions, vocabulary prompts, and written response practice.",
        short_description="Teachers get readable fiction and nonfiction passages with simple comprehension routines and answer support.",
        full_description="This third grade reading comprehension pack includes printable passages, text evidence questions, and short written responses that make it easy to run independent practice, literacy centers, or guided reading follow-up. The pages are designed to look like a real classroom resource, with clear student directions and teacher notes for discussion.",
        tags=["reading comprehension", "third grade reading", "text evidence", "passages", "printable literacy"],
        focus_skills=["text evidence", "central idea", "sequence", "vocabulary in context"],
        student_prompts=[
            "Passage: Maya planted bean seeds in two cups. One cup sat in sunlight, and one stayed in a dark closet. After a week, the sunny plant was tall and green while the closet plant looked pale. Question: Which detail best explains why the plants looked different?",
            "Passage: Ben forgot his lunch, but his teacher had extra crackers and fruit in the classroom. Ben thanked her and promised to check his bag more carefully tomorrow. Question: What lesson did Ben learn?",
            "Underline one clue in the passage that helps you identify the main idea.",
            "Write one sentence that explains what happened first, next, and last in the story.",
            "Use the context clue in this sentence to define curious: Nora felt curious, so she peeked under the cloth to see what was making the noise.",
            "Write a short response that answers the question and includes one detail from the text.",
        ],
        teacher_notes=[
            "Read the passage aloud once before students annotate so they hear fluent phrasing and vocabulary in context.",
            "Invite students to box the question and underline the part of the text they plan to use in their answer.",
            "These pages work well for partner retells before written response time.",
        ],
        answer_key=[
            "The plant in sunlight had what it needed to grow, so it stayed green and healthy",
            "Ben learned to prepare for school and check his lunch before leaving home",
            "A strong written response should include a clear answer and one specific text detail",
            "Curious means wanting to know more",
        ],
    ),
    spec(
        product_id="main-idea-details-4",
        title="4th Grade Main Idea and Details",
        subject="Reading",
        grade_band="Grade 4",
        standards_tag="CCSS.ELA-LITERACY.RI.4.2",
        format_label="Main Idea Practice Pack",
        resource_type="Practice Pack",
        price_cents=625,
        seller="monica",
        summary="A fourth grade reading resource that helps students identify the main idea and choose details that best support it.",
        short_description="Use these pages to teach students how to sort key details from extra information in informational text.",
        full_description="This fourth grade main idea resource gives teachers short informational reading tasks with clear main idea questions, detail sorting practice, and written response support. The activities are designed for reading groups, independent work, or whole-class practice and include teacher notes that keep the routine simple.",
        tags=["main idea", "key details", "informational text", "Grade 4 reading", "reading response"],
        focus_skills=["main idea", "supporting details", "informational text", "written response"],
        student_prompts=[
            "Read the short article about beavers building dams. Circle the sentence that best states the main idea.",
            "Choose two details from the article that support the idea that beavers change their environment.",
            "Read the paragraph about school gardens and decide which detail does not support the main idea.",
            "Write the main idea of the article in your own words using one complete sentence.",
            "Explain why one detail is stronger support than another detail.",
            "Finish the response frame: The main idea is __ because the author says __.",
        ],
        teacher_notes=[
            "Model the difference between a topic and a main idea before students complete the first page.",
            "Ask students to color-code the main idea and supporting details to slow down their reading.",
            "The response frame is useful for students who need extra structure with written answers.",
        ],
        answer_key=[
            "The main idea should summarize what the whole article is mostly about, not one single detail",
            "Strong supporting details directly explain or prove the main idea",
            "A detail that is interesting but not connected to the central point should be left out",
            "Students should answer with one sentence that includes the article topic and its key point",
        ],
    ),
    spec(
        product_id="context-clues-task-cards-5",
        title="5th Grade Context Clues Task Cards",
        subject="Reading",
        grade_band="Grade 5",
        standards_tag="CCSS.ELA-LITERACY.L.5.4",
        format_label="Task Card Set",
        resource_type="Task Card Set",
        price_cents=675,
        seller="monica",
        summary="A set of fifth grade context clues task cards that asks students to infer word meanings from nearby words and sentence clues.",
        short_description="Students practice vocabulary strategies with printable task cards, a recording sheet, and an answer key sample.",
        full_description="This fifth grade context clues task card set gives teachers a flexible vocabulary resource for literacy stations, review rotations, or partner practice. Students read short passages, infer word meanings, and explain which clue helped them decide. The file includes task card pages, a recording sheet, and teacher support notes.",
        tags=["context clues", "vocabulary", "task cards", "Grade 5 reading", "literacy center"],
        focus_skills=["context clues", "vocabulary", "recording sheet practice", "text explanation"],
        student_prompts=[
            "Card 1: The trail was steep and rocky, so the hikers moved cautiously. What does cautiously mean?",
            "Card 2: The kitten was famished after skipping breakfast, so it rushed to its bowl. What does famished mean?",
            "Card 3: The speech was brief, lasting only two minutes. What does brief mean?",
            "Card 4: The crowd was silent during the solemn ceremony. What does solemn mean?",
            "Card 5: The bright scarf was vivid against the gray coat. What does vivid mean?",
            "Explain which words in one sentence gave you the strongest clue.",
        ],
        teacher_notes=[
            "Have students underline the clue words before they choose a meaning so the strategy stays visible.",
            "Students can work in pairs and compare which clue they noticed first before checking the answer key.",
            "Use the final explanation prompt as a quick formative check on whether students are naming the evidence behind the vocabulary guess.",
        ],
        answer_key=[
            "cautiously means carefully",
            "famished means very hungry",
            "brief means short",
            "solemn means serious or respectful",
            "vivid means bright or intense",
        ],
    ),
    spec(
        product_id="paragraph-writing-3",
        title="3rd Grade Paragraph Writing",
        subject="Writing",
        grade_band="Grade 3",
        standards_tag="CCSS.ELA-LITERACY.W.3.2",
        format_label="Writing Practice Pack",
        resource_type="Writing Pack",
        price_cents=600,
        seller="monica",
        summary="A third grade writing pack with paragraph planning pages, topic sentence practice, and simple revision support.",
        short_description="Students learn how to build a clear paragraph with a topic sentence, supporting details, and a closing sentence.",
        full_description="This third grade paragraph writing resource supports the basics of organized writing in a way that feels manageable for young writers. Teachers get planning organizers, guided paragraph frames, and short editing prompts that fit writing workshop, intervention, or homework. The answer support focuses on what a strong paragraph should include, not one perfect response.",
        tags=["paragraph writing", "writing workshop", "third grade writing", "topic sentence", "editing"],
        focus_skills=["topic sentence", "supporting details", "closing sentence", "revision"],
        student_prompts=[
            "Choose one topic: favorite recess game, caring for a class pet, or helping at home. Write a topic sentence.",
            "Add two supporting details that match your topic sentence.",
            "Write a closing sentence that reminds the reader of your main idea.",
            "Read your paragraph and circle one detail that could be clearer.",
            "Use the editing checklist to check capitals, punctuation, and complete sentences.",
            "Write one new detail that makes your paragraph stronger.",
        ],
        teacher_notes=[
            "Model one paragraph together before asking students to plan independently.",
            "Keep the focus on organization first, then move to grammar edits after the ideas are on paper.",
            "Invite students to read their paragraph aloud to hear whether the details match the topic sentence.",
        ],
        answer_key=[
            "A strong paragraph should include one topic sentence, at least two matching details, and a closing sentence",
            "Student responses will vary based on the topic they choose",
            "Revision should add detail or clarity, not start a brand-new topic",
            "The editing checklist should catch capitals, periods, and complete thoughts",
        ],
    ),
    spec(
        product_id="opinion-writing-4",
        title="4th Grade Opinion Writing",
        subject="Writing",
        grade_band="Grade 4",
        standards_tag="CCSS.ELA-LITERACY.W.4.1",
        format_label="Opinion Writing Pack",
        resource_type="Writing Pack",
        price_cents=675,
        seller="monica",
        summary="A fourth grade opinion writing resource with planning pages, reason-and-example practice, and revision prompts.",
        short_description="Students organize an opinion piece with reasons, examples, and a strong conclusion.",
        full_description="This fourth grade opinion writing pack helps students move from a topic and opinion into a short organized writing piece. Teachers can use the pages during writing workshop, test-prep writing review, or intervention groups. The file includes planning support, sentence stems, and teacher notes that keep the process simple and usable.",
        tags=["opinion writing", "writing workshop", "Grade 4 writing", "reasons and examples", "essay organizer"],
        focus_skills=["state an opinion", "support with reasons", "examples and evidence", "conclusion writing"],
        student_prompts=[
            "Pick one prompt: longer recess, class pets, or homework on weekends. Write your opinion clearly in one sentence.",
            "List two reasons that support your opinion.",
            "Add one example or detail for each reason.",
            "Use a transition word to connect your ideas: also, for example, because, or finally.",
            "Write a conclusion that reminds the reader of your opinion.",
            "Revise one sentence to make your reason stronger and more specific.",
        ],
        teacher_notes=[
            "Students benefit from hearing the difference between a reason and an example before independent writing begins.",
            "Use the organizer page first, then move into paragraph drafting so the writing stays focused.",
            "Invite peer partners to check whether each reason clearly supports the stated opinion.",
        ],
        answer_key=[
            "A strong opinion sentence clearly tells what the writer believes",
            "Reasons should match the opinion and examples should explain the reason",
            "Transition words help the writing sound organized",
            "The conclusion should restate the opinion without repeating the opening sentence word for word",
        ],
    ),
    spec(
        product_id="narrative-writing-5",
        title="5th Grade Narrative Writing",
        subject="Writing",
        grade_band="Grade 5",
        standards_tag="CCSS.ELA-LITERACY.W.5.3",
        format_label="Narrative Writing Pack",
        resource_type="Writing Pack",
        price_cents=700,
        seller="monica",
        summary="A fifth grade narrative writing resource with planning, scene writing practice, dialogue prompts, and revision notes.",
        short_description="Students plan and draft a short narrative with a clear beginning, middle, end, and stronger descriptive details.",
        full_description="This fifth grade narrative writing file is built for classrooms that need a real, simple resource for storytelling practice. The pages guide students through planning, scene building, dialogue, and revision without requiring a long unit setup. Teachers get teacher notes, student organizers, and an answer key sample that describes what strong narrative writing should include.",
        tags=["narrative writing", "descriptive writing", "Grade 5 writing", "story planning", "dialogue"],
        focus_skills=["story structure", "dialogue", "descriptive details", "revision"],
        student_prompts=[
            "Plan a small moment story about a surprise, a challenge, or a proud moment.",
            "Write a beginning that introduces the setting and the narrator.",
            "Draft the middle of the story and include at least one line of dialogue.",
            "Write an ending that shows how the event changed the narrator or what the narrator learned.",
            "Revise one part of the story by adding stronger sensory detail.",
            "Underline one action verb that helps the reader picture the scene.",
        ],
        teacher_notes=[
            "Encourage students to write about a single event instead of a whole day so the story has enough detail.",
            "Dialogue should sound natural and help move the scene forward rather than fill space.",
            "Revision is strongest when students zoom in on one paragraph instead of trying to fix everything at once.",
        ],
        answer_key=[
            "A strong narrative includes a clear beginning, middle, and end",
            "Dialogue should reveal action, feelings, or what happens next",
            "Sensory detail helps readers picture the scene",
            "Student story content will vary, but the structure should remain clear and organized",
        ],
    ),
    spec(
        product_id="life-cycles-2",
        title="2nd Grade Life Cycles",
        subject="Science",
        grade_band="Grade 2",
        standards_tag="2-LS4-1",
        format_label="Science Activity Pack",
        resource_type="Activity Pack",
        price_cents=575,
        seller="theo",
        summary="A second grade life cycles pack with simple diagrams, labeling practice, and short observation pages.",
        short_description="Students study plant and animal life cycles with printable pages that fit whole-group science or centers.",
        full_description="This second grade life cycles resource helps teachers introduce how living things grow and change over time. Students label simple diagrams, order life cycle stages, and write short observations using age-appropriate pages. The file includes teacher notes and an answer key sample for quick classroom use.",
        tags=["life cycles", "second grade science", "science worksheet", "plant life cycle", "animal life cycle"],
        focus_skills=["life cycle stages", "plant growth", "animal growth", "science observation"],
        student_prompts=[
            "Cut and order the stages of a butterfly life cycle: egg, caterpillar, chrysalis, butterfly.",
            "Label the plant life cycle picture with seed, sprout, plant, and flower.",
            "Write one sentence that explains how a caterpillar changes over time.",
            "Circle the stage where a seed first begins to grow.",
            "Compare a frog life cycle and a butterfly life cycle. What is one way they are alike?",
            "Draw a plant in two stages and label each stage.",
        ],
        teacher_notes=[
            "Use real photographs or a short video clip before students begin the printable page to build background knowledge.",
            "Keep the language concrete by repeating words like stage, grow, and change during discussion.",
            "Young writers may need sentence frames for compare-and-contrast questions.",
        ],
        answer_key=[
            "Butterfly order: egg, caterpillar, chrysalis, butterfly",
            "Plant labels: seed, sprout, plant, flower",
            "A strong sentence explains that living things change and grow in stages",
            "Both frog and butterfly life cycles include stages and change over time",
        ],
    ),
    spec(
        product_id="weather-3",
        title="3rd Grade Weather",
        subject="Science",
        grade_band="Grade 3",
        standards_tag="3-ESS2-1",
        format_label="Weather Investigation Pack",
        resource_type="Investigation Pack",
        price_cents=600,
        seller="theo",
        summary="A third grade weather pack with observation charts, weather tool explanations, and short response pages.",
        short_description="Students track weather patterns and use evidence from simple charts and forecasts.",
        full_description="This third grade weather resource gives teachers a clean set of printable pages for introducing daily weather observations, weather tools, and simple pattern questions. The activities are classroom-ready for science notebooks, small groups, or independent stations and include teacher notes for quick prep.",
        tags=["weather", "science observations", "Grade 3 science", "forecast", "investigation pack"],
        focus_skills=["weather observations", "patterns", "forecast tools", "evidence-based explanation"],
        student_prompts=[
            "Record today’s temperature, cloud cover, and wind conditions in the observation chart.",
            "Match the tool to the job: thermometer, rain gauge, wind vane, barometer.",
            "Study the five-day chart and describe one weather pattern you notice.",
            "Explain why dark clouds and a dropping temperature might lead to rain.",
            "Write one safety tip for stormy weather.",
            "Circle the detail in the forecast that tells you what to wear outside.",
        ],
        teacher_notes=[
            "If possible, begin with a quick outdoor observation so the chart connects to a real weather moment.",
            "Remind students that patterns are repeated changes they can notice over several days.",
            "The final safety question works well as an exit ticket after discussion.",
        ],
        answer_key=[
            "Thermometer measures temperature, rain gauge measures rainfall, wind vane shows wind direction",
            "A weather pattern answer should describe repeated changes over several days",
            "Dark clouds and cooler temperatures can be signs that rain is likely",
            "Student clothing choices should match the evidence given in the forecast",
        ],
    ),
    spec(
        product_id="ecosystems-5",
        title="5th Grade Ecosystems",
        subject="Science",
        grade_band="Grade 5",
        standards_tag="5-LS2-1",
        format_label="Ecosystems Study Pack",
        resource_type="Study Pack",
        price_cents=725,
        seller="theo",
        summary="A fifth grade ecosystems resource with food chain pages, habitat questions, and ecosystem change prompts.",
        short_description="Students explore producers, consumers, decomposers, habitats, and ecosystem balance through printable science pages.",
        full_description="This fifth grade ecosystems pack supports a real classroom unit on how organisms interact with one another and with their environment. The file includes food chain practice, habitat analysis, and written explanation prompts that fit science stations, notebooks, or homework. Teacher notes and an answer key sample help teachers move quickly from print to instruction.",
        tags=["ecosystems", "food chains", "science notebook", "Grade 5 science", "habitats"],
        focus_skills=["producers and consumers", "food chains", "habitat changes", "scientific explanation"],
        student_prompts=[
            "Sort the organisms into producers, consumers, and decomposers: grass, rabbit, hawk, mushroom.",
            "Build a simple food chain using the organisms meadow grass, grasshopper, frog, and snake.",
            "Explain what might happen if the frog population decreases in the food chain.",
            "Read the habitat card and identify two things living things need from an ecosystem.",
            "Describe one way pollution could affect an ecosystem.",
            "Write a short claim about why balance matters in an ecosystem and support it with one piece of evidence.",
        ],
        teacher_notes=[
            "Model the difference between a producer and a consumer before students complete the sorting task.",
            "Use arrows consistently in the food chain examples so students understand the direction of energy flow.",
            "The final claim-and-evidence prompt works well after a class discussion or short video clip.",
        ],
        answer_key=[
            "Producer: grass; consumers: rabbit, hawk; decomposer: mushroom",
            "One correct food chain is meadow grass -> grasshopper -> frog -> snake",
            "If frogs decrease, grasshoppers may increase and snakes may have less food",
            "Living things need food, water, shelter, air, and space from an ecosystem",
        ],
    ),
    spec(
        product_id="communities-2",
        title="2nd Grade Communities",
        subject="Social Studies",
        grade_band="Grade 2",
        standards_tag="D2.Civ.2.K-2",
        format_label="Communities Activity Pack",
        resource_type="Activity Pack",
        price_cents=500,
        seller="priya",
        summary="A second grade communities resource with local community helpers, goods and services, and neighborhood discussion pages.",
        short_description="Students learn about community roles and responsibilities through simple printable activities and short response pages.",
        full_description="This second grade communities pack introduces community helpers, local services, and neighborhood responsibility with pages that feel familiar and easy to use. Teachers can print and teach right away using the included student practice, discussion questions, and answer support.",
        tags=["communities", "community helpers", "goods and services", "second grade social studies", "neighborhood"],
        focus_skills=["community helpers", "goods and services", "citizenship", "local community"],
        student_prompts=[
            "Match each community helper to the job: firefighter, teacher, doctor, mail carrier.",
            "Circle the things that are goods and underline the things that are services.",
            "Write one way people can help keep a neighborhood safe and clean.",
            "Read the short paragraph about a library and tell how it helps a community.",
            "Choose one community helper and write two tools that person might use.",
            "Draw a map of your neighborhood with three important places labeled.",
        ],
        teacher_notes=[
            "Use pictures of real local places before students begin the mapping page so the topic feels familiar.",
            "You can turn the goods-and-services sort into a quick partner game before independent work.",
            "The neighborhood responsibility question works well as a class discussion starter.",
        ],
        answer_key=[
            "Goods are items people buy or use, while services are jobs people do to help others",
            "Community helper matches should connect the worker to the role they perform",
            "Neighborhood maps should include labeled places such as school, park, library, or store",
            "A strong response about helping a community should mention a real helpful action",
        ],
    ),
    spec(
        product_id="map-skills-3",
        title="3rd Grade Map Skills",
        subject="Social Studies",
        grade_band="Grade 3",
        standards_tag="D2.Geo.1.3-5",
        format_label="Map Skills Pack",
        resource_type="Practice Pack",
        price_cents=575,
        seller="priya",
        summary="A third grade map skills resource with map keys, cardinal directions, grid questions, and simple geography practice.",
        short_description="Students read and use maps with printable direction questions, legends, and location tasks.",
        full_description="This third grade map skills pack is built for classrooms that need a simple, useful geography resource. Students practice reading map keys, using cardinal directions, and locating places on a basic grid map. The file includes teacher notes and answer support for quick social studies lessons or review work.",
        tags=["map skills", "cardinal directions", "geography", "third grade social studies", "map key"],
        focus_skills=["map key", "cardinal directions", "grid locations", "location language"],
        student_prompts=[
            "Use the map key to identify the school, park, library, and fire station on the town map.",
            "Which place is north of the library and east of the park?",
            "Write directions from the school to the post office using north, south, east, and west.",
            "Find the location at B-3 and tell what landmark is there.",
            "Explain why a map key helps readers understand a map quickly.",
            "Draw one new symbol for the map key and tell what it stands for.",
        ],
        teacher_notes=[
            "Practice saying the directions aloud together before students write them on the page.",
            "If students mix up left and right, have them trace north at the top of the map before each question.",
            "Grid questions work well with dry-erase sleeves if you want to reuse the same page in centers.",
        ],
        answer_key=[
            "Students should use the map key symbols to name the correct landmarks",
            "Direction answers should include correct use of north, south, east, and west",
            "A map key explains what the symbols on a map mean",
            "Grid answers depend on the labeled town map used in the printable page",
        ],
    ),
    spec(
        product_id="government-5",
        title="5th Grade Government",
        subject="Social Studies",
        grade_band="Grade 5",
        standards_tag="D2.Civ.1.3-5",
        format_label="Government Study Pack",
        resource_type="Study Pack",
        price_cents=725,
        seller="priya",
        summary="A fifth grade government resource introducing branches of government, civic responsibilities, and short reading-response practice.",
        short_description="Students review the three branches of government with simple reading tasks and response prompts.",
        full_description="This fifth grade government pack helps teachers introduce core civics ideas in a way that feels clear and age-appropriate. The pages cover branches of government, checks and balances, and civic responsibility through short readings, matching tasks, and written response practice. Teacher notes make it easy to use for social studies blocks or review days.",
        tags=["government", "civics", "branches of government", "Grade 5 social studies", "civic responsibility"],
        focus_skills=["branches of government", "roles and responsibilities", "checks and balances", "civic action"],
        student_prompts=[
            "Match each branch of government to its main job: makes laws, carries out laws, interprets laws.",
            "Read the short paragraph about Congress and underline the words that tell its job.",
            "Explain one reason the branches of government are separated.",
            "Write one example of a civic responsibility students can practice in school or the community.",
            "Compare the jobs of the President and the Supreme Court in one or two sentences.",
            "Finish the sentence: Checks and balances help because __.",
        ],
        teacher_notes=[
            "Students often remember the branch names more easily than the jobs, so keep the job language visible on the board.",
            "Use a quick role-play or class chart before the writing question if students need help connecting government ideas to real actions.",
            "The compare-and-contrast prompt works well for partner talk before independent writing.",
        ],
        answer_key=[
            "Legislative makes laws, executive carries out laws, judicial interprets laws",
            "Separated branches keep one group from having all the power",
            "Civic responsibilities can include following rules, voting when older, or helping the community",
            "Checks and balances help each branch limit the power of the others",
        ],
    ),
    spec(
        product_id="classroom-jobs-kit",
        title="Classroom Jobs Kit",
        subject="Classroom Management",
        grade_band="K-5",
        standards_tag="Teacher support resource",
        format_label="Classroom Toolkit",
        resource_type="Toolkit",
        price_cents=550,
        seller="monica",
        summary="A classroom jobs kit with student-friendly job cards, responsibility pages, and teacher setup notes.",
        short_description="Help students take ownership of classroom routines with printable job descriptions and rotation support.",
        full_description="This classroom jobs kit is built for real classrooms that want smoother routines and shared responsibility. The file includes printable job cards, simple reflection prompts, and teacher notes for setting up job rotations without extra prep. It works across elementary grade levels and supports a more organized classroom culture.",
        tags=["classroom jobs", "classroom management", "teacher toolkit", "elementary classroom", "routines"],
        focus_skills=["routine ownership", "job expectations", "responsibility", "classroom systems"],
        student_prompts=[
            "Read the class librarian job card and underline the two main responsibilities.",
            "Choose one classroom job and write why it matters to the whole class.",
            "Use the rotation chart to decide who has materials manager this week.",
            "Write one rule for how a student should complete a classroom job well.",
            "Fill in the reflection box: I did my job well today because __.",
            "Suggest one new classroom job that would help the room run smoothly.",
        ],
        teacher_notes=[
            "Introduce just a few jobs at first so students can learn the system before the full rotation begins.",
            "Pair the reflection prompt with a quick end-of-day check-in to build accountability without adding a long routine.",
            "Laminate the job cards or place them in sleeves if you plan to rotate names every week.",
        ],
        answer_key=[
            "Strong job expectations should explain what the student does and how often it should happen",
            "Reflection answers will vary, but they should mention completing a responsibility correctly",
            "The best new job suggestions solve a real classroom need",
            "Rotation charts should clearly show who is assigned to each role",
        ],
    ),
    spec(
        product_id="behavior-reflection-sheets",
        title="Behavior Reflection Sheets",
        subject="Classroom Management",
        grade_band="K-5",
        standards_tag="Teacher support resource",
        format_label="Reflection Form Pack",
        resource_type="Form Pack",
        price_cents=450,
        seller="monica",
        summary="A set of printable behavior reflection sheets that help students think through choices, impact, and next steps.",
        short_description="Use simple reflection forms to support calm problem-solving after behavior issues or classroom conflicts.",
        full_description="This behavior reflection pack gives teachers clear, calm forms for helping students think about what happened, who was affected, and what they can do next. The pages are designed for elementary classrooms and include teacher notes for using the forms as part of a supportive behavior routine.",
        tags=["behavior reflection", "classroom management", "student accountability", "teacher forms", "elementary"],
        focus_skills=["self-reflection", "repairing harm", "problem solving", "next steps"],
        student_prompts=[
            "What happened? Write or draw the situation in a calm, honest way.",
            "Who was affected by what happened?",
            "What feeling were you having when this happened?",
            "What could you do differently next time?",
            "What is one way you can fix or repair the problem now?",
            "Circle whether you need help talking through the problem with a teacher.",
        ],
        teacher_notes=[
            "Use the form after students are calm enough to think clearly, not in the middle of escalation.",
            "Younger students may need the write-or-draw option or a sentence frame to complete the page successfully.",
            "The repair question is useful because it keeps the reflection connected to action, not just explanation.",
        ],
        answer_key=[
            "Student responses will vary based on the incident and age level",
            "A useful reflection names what happened, who was affected, and one better next step",
            "Repair actions should be realistic and connected to the problem",
            "The form works best as a supportive conversation tool, not as a punishment by itself",
        ],
    ),
    spec(
        product_id="morning-work-2",
        title="2nd Grade Morning Work",
        subject="Morning Work",
        grade_band="Grade 2",
        standards_tag="CCSS.MATH.CONTENT.2.OA.B.2",
        format_label="Morning Work Pack",
        resource_type="Morning Work Pack",
        price_cents=575,
        seller="avery",
        summary="A second grade morning work pack with short math and reading review, handwriting space, and teacher-friendly routines.",
        short_description="Use these morning pages to start the day with quick review, written response, and independent routines.",
        full_description="This second grade morning work resource gives teachers a simple daily review routine that covers math, reading, and language review in a manageable format. Students can work independently while the teacher settles the room, and the pages include teacher notes plus an answer key sample for quick checking.",
        tags=["morning work", "daily review", "second grade", "math review", "reading review"],
        focus_skills=["daily review routines", "basic fact practice", "sentence writing", "independent work"],
        student_prompts=[
            "Solve 28 + 14 and 45 - 19.",
            "Write the value of the 6 in 362.",
            "Read the sentence and fix one punctuation mistake.",
            "Write one sentence about something you see in the morning picture box.",
            "Circle the word with the long a sound: rain, cat, bag, hat.",
            "Read the short question and answer in one complete sentence.",
        ],
        teacher_notes=[
            "Use the same routine every day so students know how to begin work as soon as they enter the room.",
            "These pages work well in folders or dry-erase sleeves if you want a reusable structure.",
            "The sentence-writing box gives you a quick window into handwriting and written language skills.",
        ],
        answer_key=[
            "28 + 14 = 42 and 45 - 19 = 26",
            "The 6 in 362 is worth 60",
            "Students should fix the punctuation error and write a complete sentence",
            "The long a word is rain",
        ],
    ),
    spec(
        product_id="daily-review-4",
        title="4th Grade Daily Review",
        subject="Morning Work",
        grade_band="Grade 4",
        standards_tag="CCSS.MATH.CONTENT.4.OA.A.3",
        format_label="Daily Review Pack",
        resource_type="Daily Review Pack",
        price_cents=625,
        seller="avery",
        summary="A fourth grade daily review pack mixing math, reading, and language review into a quick start-of-day routine.",
        short_description="Students begin the day with focused review that fits bell work, morning work, or early finisher routines.",
        full_description="This fourth grade daily review resource is made for busy classroom mornings. Each page blends short math, reading, and language tasks so teachers can start the day with meaningful independent work instead of filler. The file includes student pages, teacher support notes, and an answer key sample.",
        tags=["daily review", "morning work", "Grade 4", "bell work", "mixed review"],
        focus_skills=["mixed review", "word problems", "editing", "reading response"],
        student_prompts=[
            "Solve 328 + 147 and explain how you checked your answer.",
            "Read the sentence and fix the capitalization or punctuation mistake.",
            "Read the short paragraph and answer one main idea question.",
            "Solve the word problem: A teacher has 36 pencils and shares them equally among 6 tables. How many pencils per table?",
            "Write one synonym for the underlined word in the sentence.",
            "Complete the reflection line: Today I want to focus on __ during math class.",
        ],
        teacher_notes=[
            "These pages are designed to feel familiar so students can begin without waiting for directions.",
            "If time is tight, choose one math item and one language item for a shorter warm-up routine.",
            "Student reflection lines can help you spot confidence trends over the week.",
        ],
        answer_key=[
            "328 + 147 = 475",
            "36 pencils shared among 6 tables = 6 pencils each",
            "Editing and vocabulary answers depend on the printed sentence choices in the page",
            "A strong main idea answer should include one supporting detail from the paragraph",
        ],
    ),
    spec(
        product_id="math-test-prep-task-cards-5",
        title="5th Grade Math Test Prep Task Cards",
        subject="Test Prep",
        grade_band="Grade 5",
        standards_tag="CCSS.MATH.CONTENT.5.NF.B.7",
        format_label="Task Card Set",
        resource_type="Task Card Set",
        price_cents=725,
        seller="avery",
        summary="A fifth grade math test prep task card set with mixed review, recording pages, and answer support for classroom rotations.",
        short_description="Teachers get printable mixed-review task cards that fit review week, stations, or small-group prep.",
        full_description="This fifth grade math test prep resource gives teachers a classroom-ready set of mixed review task cards that can be used in stations, partner review, or whole-class practice. The file includes sample task card pages, a recording sheet, and teacher notes for pacing and discussion during review season.",
        tags=["test prep", "task cards", "fifth grade math", "mixed review", "recording sheet"],
        focus_skills=["mixed math review", "recording sheet practice", "word problems", "test readiness"],
        student_prompts=[
            "Card 1: Solve 3.8 + 2.45.",
            "Card 2: Compare 5/8 and 3/4.",
            "Card 3: A class earned 168 points over 4 days. How many points per day if they earned the same amount?",
            "Card 4: Round 73.582 to the nearest tenth.",
            "Card 5: Multiply 3.4 x 2.",
            "Use the recording sheet to show your strategy for one card in words or pictures.",
        ],
        teacher_notes=[
            "Use 6 to 8 cards at a time so students can finish a round and still have time to check answers together.",
            "The recording sheet matters because it keeps strategy explanations visible during review, not just final answers.",
            "Students can discuss one difficult card with a partner before the whole-group debrief.",
        ],
        answer_key=[
            "3.8 + 2.45 = 6.25",
            "3/4 > 5/8 because 3/4 = 6/8",
            "168 points over 4 days = 42 points each day",
            "73.582 rounds to 73.6",
            "3.4 x 2 = 6.8",
        ],
    ),
    spec(
        product_id="reading-test-prep-3",
        title="3rd Grade Reading Test Prep",
        subject="Test Prep",
        grade_band="Grade 3",
        standards_tag="CCSS.ELA-LITERACY.RL.3.1",
        format_label="Reading Review Pack",
        resource_type="Review Pack",
        price_cents=650,
        seller="monica",
        summary="A third grade reading test prep resource with short passages, multiple-choice practice, and text evidence writing support.",
        short_description="Students practice test-style reading questions while still reading real passages and writing short evidence-based responses.",
        full_description="This third grade reading test prep pack gives teachers a focused but teacher-friendly resource for passage reading, multiple-choice review, and short written response practice. It is designed to support test readiness without turning literacy time into drill-only work. The file includes printable pages, teacher notes, and answer support.",
        tags=["reading test prep", "third grade reading", "text evidence", "multiple choice practice", "test readiness"],
        focus_skills=["passage reading", "multiple-choice strategy", "text evidence", "constructed response"],
        student_prompts=[
            "Read the short story about a girl preparing for a race. Answer the question: Why was she nervous before the race?",
            "Choose the best main idea from four answer choices.",
            "Underline one sentence in the passage that gives evidence for your answer.",
            "Read the nonfiction paragraph about bees and answer a vocabulary-in-context question.",
            "Write one short response using the frame: I know this because the text says __.",
            "Circle one strategy that helped you the most today: reread, underline clues, or cross out wrong answers.",
        ],
        teacher_notes=[
            "Model how to cross out two clearly wrong answers before students choose the best one.",
            "Students should underline evidence before writing so their short responses stay grounded in the passage.",
            "The final strategy reflection helps students notice which reading moves are actually helping them.",
        ],
        answer_key=[
            "Students should answer with evidence from the race story or bee paragraph",
            "A strong multiple-choice explanation names the clue that ruled out other answers",
            "The sentence frame should include a real quote or paraphrase from the text",
            "Reread, underline clues, and cross out wrong answers are all valid strategies when used correctly",
        ],
    ),
    spec(
        product_id="phonics-intervention-1",
        title="1st Grade Phonics Intervention",
        subject="Intervention",
        grade_band="Grade 1",
        standards_tag="CCSS.ELA-LITERACY.RF.1.3",
        format_label="Phonics Intervention Pack",
        resource_type="Intervention Pack",
        price_cents=550,
        seller="monica",
        summary="A first grade phonics intervention resource with short vowel practice, word building, and simple decoding pages.",
        short_description="Use these printable phonics pages in small groups, intervention folders, or take-home review.",
        full_description="This first grade phonics intervention pack gives teachers a simple decoding resource built for small groups and targeted review. Students practice short vowels, word building, and reading simple words in context with pages that are easy to print and use. Teacher notes and answer support are included for quick implementation.",
        tags=["phonics intervention", "first grade reading", "short vowels", "word building", "small group"],
        focus_skills=["short vowels", "word building", "decoding", "reading simple sentences"],
        student_prompts=[
            "Read and sort the short a and short i words: map, lip, cap, sit.",
            "Build new words by changing one sound: cat -> cap -> cup.",
            "Circle the word that matches the picture in each row.",
            "Read the sentence: Tim hid in the big red box. Underline the short i word.",
            "Write one new short e word that you know.",
            "Read the decodable sentence and draw a quick picture to match it.",
        ],
        teacher_notes=[
            "Keep sound boxes or letter tiles nearby so students can build before they write.",
            "The intervention pages work best in short bursts of 8 to 10 minutes with immediate corrective feedback.",
            "Use the sentence reading page to check whether students can transfer isolated sound practice into connected text.",
        ],
        answer_key=[
            "Short a words: map, cap; short i words: lip, sit",
            "One correct chain is cat -> cap -> cup",
            "Students should identify the target vowel sound in the sentence correctly",
            "Short e word answers will vary",
        ],
    ),
    spec(
        product_id="math-small-group-pack-4",
        title="4th Grade Math Small Group Pack",
        subject="Intervention",
        grade_band="Grade 4",
        standards_tag="CCSS.MATH.CONTENT.4.NBT.B.4",
        format_label="Small Group Pack",
        resource_type="Intervention Pack",
        price_cents=675,
        seller="avery",
        summary="A fourth grade math small group pack with place value review, multi-digit addition and subtraction, and guided reteach pages.",
        short_description="Teachers get focused reteach pages that work during intervention blocks or small-group rotations.",
        full_description="This fourth grade math small group pack is built for intervention time and reteach groups. The printable pages focus on place value, multi-digit operations, and error analysis with enough structure for teacher-led small groups but enough independence for follow-up practice. The file includes teacher notes and answer support.",
        tags=["math intervention", "small group", "fourth grade math", "reteach", "multi-digit operations"],
        focus_skills=["place value review", "multi-digit addition", "multi-digit subtraction", "error analysis"],
        student_prompts=[
            "Solve 4,328 + 579 and explain how you regrouped.",
            "Solve 7,002 - 846 and mark the place where borrowing happened.",
            "Write 5,406 in expanded form and words.",
            "Look at the worked problem and find the mistake in the regrouping step.",
            "Compare 4,508 and 4,580 with >, <, or = and explain your thinking.",
            "Write one word problem that could be solved with subtraction.",
        ],
        teacher_notes=[
            "The error-analysis question is useful because it shows whether students understand the algorithm, not just the final answer.",
            "Use place value charts during the first page and then remove them on later pages as students become more confident.",
            "This pack works well for a three-day reteach cycle followed by one independent review day.",
        ],
        answer_key=[
            "4,328 + 579 = 4,907",
            "7,002 - 846 = 6,156",
            "5,406 = 5,000 + 400 + 6",
            "4,508 < 4,580 because the tens digit 0 is less than 8",
        ],
    ),
    spec(
        product_id="back-to-school-procedures-pack",
        title="Back to School Procedures Pack",
        subject="Seasonal",
        grade_band="K-5",
        standards_tag="Teacher support resource",
        format_label="Procedures Pack",
        resource_type="Toolkit",
        price_cents=650,
        seller="monica",
        summary="A back-to-school procedures pack with routine posters, student practice pages, and teacher planning notes.",
        short_description="Set classroom expectations early with simple printables for routines, transitions, and student reflection.",
        full_description="This back-to-school procedures pack is designed for a real classroom launch. Teachers get printable routine pages, quick student practice sheets, and planning notes that help introduce transitions, supply routines, line expectations, and independent work behavior. It is practical, clean, and easy to use during the first weeks of school.",
        tags=["back to school", "procedures", "classroom routines", "teacher toolkit", "seasonal resource"],
        focus_skills=["routine building", "student expectations", "transition practice", "classroom systems"],
        student_prompts=[
            "Read the classroom routine card for lining up and underline two important steps.",
            "Complete the practice page for unpacking, turning in folders, and starting morning work.",
            "Draw what a quiet independent work time should look like.",
            "Write one reason classroom procedures help the whole class learn.",
            "Use the reflection box: One routine I can practice this week is __.",
            "Create a simple class agreement sentence about respect or responsibility.",
        ],
        teacher_notes=[
            "Introduce only a few core routines at a time so students can practice them well before adding more.",
            "The student practice page works well after modeling and before the first independent transition.",
            "Reflection boxes help students connect routines to classroom success instead of seeing them as random rules.",
        ],
        answer_key=[
            "Strong procedure responses should match the routine card and classroom expectations",
            "The why-it-matters question should connect routines to safety, respect, or learning time",
            "Student drawings and agreements will vary based on classroom expectations",
            "This pack is most useful when paired with modeling and repeated practice",
        ],
    ),
    spec(
        product_id="end-of-year-memory-book",
        title="End of Year Memory Book",
        subject="Seasonal",
        grade_band="K-5",
        standards_tag="Teacher support resource",
        format_label="Memory Book Pack",
        resource_type="Writing Pack",
        price_cents=600,
        seller="monica",
        summary="An end-of-year memory book with reflection pages, class favorites, goal setting, and printable keepsake pages.",
        short_description="Students reflect on the school year with writing and drawing pages that can become a simple memory book.",
        full_description="This end-of-year memory book gives classrooms a clean, useful way to close the school year. The printable pages include reflection prompts, favorite memories, class highlights, and a look-ahead page for future goals. The file is simple enough for busy spring weeks but polished enough to feel like a real keepsake resource.",
        tags=["end of year", "memory book", "student reflection", "writing activity", "seasonal resource"],
        focus_skills=["reflection writing", "goal setting", "drawing and writing", "classroom closure"],
        student_prompts=[
            "Write about your favorite class memory from this year.",
            "Finish the sentence: I felt proud when __.",
            "Draw and label your favorite place in the classroom.",
            "Write one thing you learned in math and one thing you learned in reading.",
            "Set one goal for next school year.",
            "Write a thank-you message to your class or teacher.",
        ],
        teacher_notes=[
            "These pages work well as a calm spring writing activity when students need a meaningful project but not a heavy new lesson.",
            "Invite students to share one page with a partner before assembling the final booklet.",
            "The goal-setting page is a nice bridge between celebrating the year and looking ahead positively.",
        ],
        answer_key=[
            "Student reflection answers will vary and should be personal and school-appropriate",
            "A complete response includes a full sentence and a clear idea",
            "The learning page should mention one math skill and one reading skill",
            "Goal-setting answers should focus on one realistic hope for next year",
        ],
    ),
]


PREVIEW_PAGE_NUMBERS = [1, 2, 3, 6]
PREVIEW_LABELS = [
    "Teacher overview",
    "Student page 1",
    "Student page 2",
    "Answer key sample",
]
PREMIUM_PRODUCT_IDS = {
    "math-stripe-test-5",
    "reading-comprehension-passages-3",
    "opinion-writing-4",
    "ecosystems-5",
    "math-test-prep-task-cards-5",
    "phonics-intervention-1",
    "back-to-school-procedures-pack",
    "end-of-year-memory-book",
}


def slugify(value: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", value.lower())).strip("-")


def file_name_from_title(title: str) -> str:
    return f"{slugify(title)}.pdf"


def is_premium_product(spec_data: dict) -> bool:
    return spec_data["id"] in PREMIUM_PRODUCT_IDS


def build_preview_pages(page_count: int) -> list[int]:
    if page_count >= 8:
        return [1, 2, 4, page_count]

    return [1, 2, 3, page_count]


def build_preview_labels(page_count: int) -> list[str]:
    if page_count >= 8:
        return [
            "Teacher overview",
            "Student page 1",
            "Student page 3",
            "Answer key sample",
        ]

    return PREVIEW_LABELS


def include_items(spec_data: dict, page_count: int) -> list[str]:
    return [
        f"{page_count}-page printable PDF with teacher overview and answer support",
        f"Student-facing {spec_data['format'].lower()} pages tied to {spec_data['focusSkills'][0]}",
        "Answer key support and teacher notes for quick classroom use",
        "Teacher notes with setup, pacing, and differentiation ideas",
        "Real preview pages pulled directly from the downloadable file",
    ]


def updated_label(index: int) -> str:
    options = [
        "Updated this week",
        "Updated 2 days ago",
        "Updated yesterday",
        "Recently refreshed for launch",
    ]
    return options[index % len(options)]


def paragraph(text: str, styles):
    return Paragraph(text, styles["body"])


def bullets(items: list[str], styles):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["bullet"])) for item in items],
        bulletType="bullet",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=9,
    )


def subject_color(subject: str):
    if subject == "Math":
        return colors.HexColor("#2563EB")
    if subject in {"Reading", "Writing"}:
        return colors.HexColor("#BE123C")
    if subject == "Science":
        return colors.HexColor("#059669")
    if subject == "Social Studies":
        return colors.HexColor("#7C3AED")
    if subject == "Intervention":
        return colors.HexColor("#B45309")
    if subject == "Morning Work":
        return colors.HexColor("#0F766E")
    if subject == "Test Prep":
        return colors.HexColor("#1D4ED8")
    if subject == "Classroom Management":
        return colors.HexColor("#475569")
    return colors.HexColor("#A16207")


def build_styles(accent):
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "CatalogTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.white,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "CatalogSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "page_heading": ParagraphStyle(
            "CatalogHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=accent,
            spaceAfter=10,
        ),
        "page_subheading": ParagraphStyle(
            "CatalogSubheading",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "CatalogBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "CatalogBullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#1F2937"),
        ),
        "footer": ParagraphStyle(
            "CatalogFooter",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748B"),
            alignment=TA_CENTER,
        ),
    }


def draw_header(canvas, _doc, spec_data):
    accent = subject_color(spec_data["subject"])
    canvas.saveState()
    canvas.setFillColor(accent)
    canvas.rect(0, 10.1 * inch, 8.5 * inch, 0.9 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawCentredString(4.25 * inch, 10.6 * inch, spec_data["title"])
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(
        4.25 * inch,
        10.38 * inch,
        f"{spec_data['gradeBand']} · {spec_data['subject']} · {spec_data['standardsTag']}",
    )
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(
        4.25 * inch,
        0.45 * inch,
        f"LessonForgeHub · {spec_data['title']} · Page {canvas.getPageNumber()}",
    )
    canvas.restoreState()


def page_sections(spec_data):
    prompts = spec_data["studentPrompts"]
    sections = [
        {
            "heading": "Teacher Overview",
            "subheading": "What this resource teaches and how to use it",
            "body": [
                spec_data["summary"],
                f"Focus skills: {', '.join(spec_data['focusSkills'])}.",
                "Suggested uses: whole-group modeling, small-group reteach, independent practice, homework, or a quick review station.",
            ],
            "bullets": [],
        },
        {
            "heading": "Student Page 1",
            "subheading": "Primary practice and guided application",
            "body": prompts[:2],
            "bullets": [],
        },
        {
            "heading": "Student Page 2",
            "subheading": "More independent practice",
            "body": prompts[2:4],
            "bullets": [],
        },
        {
            "heading": "Student Page 3",
            "subheading": "Extension and written response",
            "body": prompts[4:6],
            "bullets": [],
        },
    ]

    if is_premium_product(spec_data):
        sections.extend(
            [
                {
                    "heading": "Student Page 4",
                    "subheading": "Extended practice and application",
                    "body": [
                        f"Use these extra tasks to extend {spec_data['focusSkills'][0]} with a little more independence and written explanation.",
                        prompts[0],
                        prompts[3],
                    ],
                    "bullets": [],
                },
                {
                    "heading": "Student Page 5",
                    "subheading": "Review, reflection, and teacher-ready checks",
                    "body": [
                        f"Students revisit the core skill set in a stronger mixed-practice format before the answer key and teacher support pages.",
                        prompts[1],
                        prompts[5],
                    ],
                    "bullets": [],
                },
            ]
        )

    sections.extend(
        [
            {
                "heading": "Teacher Notes",
                "subheading": "Implementation tips and differentiation ideas",
                "body": spec_data["teacherNotes"],
                "bullets": [
                    "Use the preview pages to show buyers the real layout, directions, and level of rigor before purchase.",
                    f"Keep this resource in a {spec_data['subject'].lower()} folder so it is easy to reteach or reuse later.",
                ],
            },
            {
                "heading": "Answer Key Sample",
                "subheading": "Teacher-facing answer support",
                "body": spec_data["answerKey"],
                "bullets": [
                    "Student responses may vary on open-ended questions, but they should still match the skill focus for the page.",
                    "Use this page as a quick teacher check rather than a scripted lesson plan.",
                ],
            },
        ]
    )

    sections[0]["bullets"] = include_items(spec_data, len(sections))
    return sections


def build_pdf(spec_data, file_path: Path):
    accent = subject_color(spec_data["subject"])
    styles = build_styles(accent)
    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=1.35 * inch,
        bottomMargin=0.8 * inch,
        title=spec_data["title"],
        author=spec_data["sellerName"],
    )
    story = []

    for index, section in enumerate(page_sections(spec_data)):
        if index > 0:
            story.append(PageBreak())

        story.append(Paragraph(section["heading"], styles["page_heading"]))
        story.append(Paragraph(section["subheading"], styles["page_subheading"]))
        story.append(Spacer(1, 0.08 * inch))

        for block in section["body"]:
            story.append(paragraph(block, styles))

        if section["bullets"]:
            story.append(Spacer(1, 0.08 * inch))
            story.append(bullets(section["bullets"], styles))

        if index == 0:
            story.append(Spacer(1, 0.16 * inch))
            story.append(
                Paragraph(
                    f"Seller: {spec_data['sellerName']} · Price: ${spec_data['priceCents'] / 100:.2f} · Tags: {', '.join(spec_data['tags'][:4])}",
                    styles["body"],
                )
            )

    doc.build(
        story,
        onFirstPage=lambda canvas, doc: draw_header(canvas, doc, spec_data),
        onLaterPages=lambda canvas, doc: draw_header(canvas, doc, spec_data),
    )


def render_preview_pages(spec_data, file_path: Path):
    preview_root = PREVIEW_DIR / spec_data["id"]
    preview_root.mkdir(parents=True, exist_ok=True)
    with fitz.open(file_path) as pdf:
        for page_number in spec_data["previewPages"]:
            page = pdf.load_page(page_number - 1)
            pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
            pix.save(preview_root / f"page-{page_number}.png")


def build_runtime_record(spec_data: dict, index: int):
    seller = SELLERS[spec_data["seller"]]
    file_name = file_name_from_title(spec_data["title"])
    page_count = len(page_sections(spec_data))
    preview_pages = build_preview_pages(page_count)
    preview_labels = build_preview_labels(page_count)
    preview_urls = [
        f"/catalog-previews/{spec_data['id']}/page-{page}.png"
        for page in preview_pages
    ]

    return {
        "id": spec_data["id"],
        "title": spec_data["title"],
        "subject": spec_data["subject"],
        "gradeBand": spec_data["gradeBand"],
        "standardsTag": spec_data["standardsTag"],
        "updatedAt": updated_label(index),
        "format": spec_data["format"],
        "summary": spec_data["summary"],
        "shortDescription": spec_data["shortDescription"],
        "fullDescription": spec_data["fullDescription"],
        "demoOnly": False,
        "resourceType": spec_data["resourceType"],
        "licenseType": "Single classroom",
        "fileTypes": ["PDF"],
        "includedItems": include_items(spec_data, page_count),
        "thumbnailUrl": preview_urls[0],
        "previewAssetUrls": preview_urls,
        "previewLabels": preview_labels,
        "previewPages": preview_pages,
        "originalAssetUrl": "/api/lessonforge/library-delivery",
        "assetVersionNumber": 1,
        "previewIncluded": True,
        "thumbnailIncluded": True,
        "rightsConfirmed": True,
        "freshnessScore": 12 - (index % 4),
        "sellerName": seller["sellerName"],
        "sellerHandle": seller["sellerHandle"],
        "sellerId": seller["sellerId"],
        "sellerStripeAccountEnvKey": seller["sellerStripeAccountEnvKey"],
        "priceCents": spec_data["priceCents"],
        "isPurchasable": True,
        "productStatus": "Published",
        "createdPath": "Manual upload",
        "tags": spec_data["tags"],
        "fileName": file_name,
        "pageCount": page_count,
    }


def main():
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    for existing_pdf in PDF_DIR.glob("*.pdf"):
        existing_pdf.unlink()

    for preview_folder in PREVIEW_DIR.iterdir():
        if preview_folder.is_dir():
            shutil.rmtree(preview_folder)

    runtime_records = []

    for index, spec_data in enumerate(PRODUCT_SPECS):
        runtime_record = build_runtime_record(spec_data, index)
        runtime_records.append(runtime_record)
        pdf_path = PDF_DIR / runtime_record["fileName"]
        build_pdf({**spec_data, **runtime_record}, pdf_path)
        render_preview_pages(runtime_record, pdf_path)

    DATA_PATH.write_text(json.dumps(runtime_records, indent=2), encoding="utf-8")
    print(f"wrote {DATA_PATH.relative_to(ROOT)}")
    print(f"generated {len(runtime_records)} PDFs in {PDF_DIR.relative_to(ROOT)}")
    print(f"generated preview images in {PREVIEW_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
