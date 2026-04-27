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
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas
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
    included_items: list[str] | None = None,
    how_to_use: list[str] | None = None,
    file_list: list[str] | None = None,
    preview_labels: list[str] | None = None,
    preview_pages: list[int] | None = None,
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
        "includedItems": included_items or [],
        "howToUse": how_to_use or [],
        "fileList": file_list or [],
        "previewLabels": preview_labels or [],
        "previewPages": preview_pages or [],
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
        summary="A printable classroom jobs system that helps teachers launch responsibilities, rotate roles, and keep daily routines running smoothly.",
        short_description="Set up classroom jobs with ready-to-print cards, a rotation tracker, and student accountability pages you can use right away.",
        full_description="This classroom jobs kit gives teachers a complete system for introducing student responsibilities without piecing materials together from scratch. The PDF includes a teacher setup guide, a full classroom job list, printable job cards, a student application, a weekly rotation chart, a reflection page, and display pieces for a classroom board. It is designed for elementary classrooms that want stronger routines, more student ownership, and less day-to-day reteaching.",
        tags=["classroom jobs", "classroom management", "teacher toolkit", "elementary classroom", "routines"],
        focus_skills=["routine ownership", "job expectations", "responsibility", "classroom systems"],
        included_items=[
            "10-page classroom jobs toolkit with setup guidance and printable classroom materials",
            "24 classroom job titles with short responsibility descriptions teachers can use right away",
            "Student job application, weekly rotation tracker, and job reflection page",
            "Display header and label pieces for a classroom jobs board or pocket chart",
            "Real preview pages from the finished printable PDF",
        ],
        how_to_use=[
            "Print the teacher guide first, choose the job cards that fit your room, and introduce expectations during a class meeting.",
            "Use the student application to learn which jobs students want, then assign roles with the weekly rotation chart.",
            "Display the header and labels on a classroom board and revisit the reflection page during weekly job changes.",
        ],
        file_list=[
            "10-page printable PDF",
            "Named file: classroom-jobs-kit.pdf",
            "Includes teacher guide, job cards, tracker, student forms, and display pieces",
        ],
        preview_labels=[
            "Cover and classroom board style",
            "Printable job cards",
            "Weekly rotation chart",
            "Student reflection page",
        ],
        preview_pages=[1, 4, 8, 9],
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
        price_cents=500,
        seller="avery",
        summary="A Grade 5 math task card system with mixed-review problems, recording pages, and answer support for centers, review, and intervention.",
        short_description="Print this Grade 5 task card set for centers, small groups, or test-prep review when students need mixed practice that stays organized.",
        full_description="This Grade 5 math test prep resource is built like a real task card system instead of a worksheet packet. Teachers get 16 printable task cards across place value, decimals, fractions, geometry, measurement, and multi-step problem solving, plus a recording sheet, answer key, standards skill map, and reteach notes. The format works well for centers, intervention, partner review, or whole-class test prep when students need short problems with a mix of multiple choice, open response, and short constructed response.",
        tags=["test prep", "task cards", "fifth grade math", "mixed review", "recording sheet"],
        focus_skills=["mixed math review", "decimal operations", "fraction reasoning", "test readiness"],
        included_items=[
            "10-page Grade 5 math task card system with 16 printable review cards",
            "Teacher directions, a standards skill map, a student recording sheet, and a full answer key",
            "Mixed question types across place value, decimals, fractions, measurement, geometry, and word problems",
            "Teacher reteach notes with common mistakes and quick intervention ideas",
            "Real preview pages from the finished printable PDF",
        ],
        how_to_use=[
            "Print the task card pages and recording sheet, then choose whether students rotate through the cards in centers, partner review, or a small intervention group.",
            "Use one task card set at a time for focused review, or mix all 16 cards together during test-prep week for broader practice.",
            "Check the answer key and reteach notes afterward to see which skills need another mini-lesson or small-group review.",
        ],
        file_list=[
            "10-page printable PDF",
            "Named file: 5th-grade-math-test-prep-task-cards.pdf",
            "Includes task cards, recording sheet, answer key, and reteach notes",
        ],
        preview_labels=[
            "Cover and use case",
            "Task card page sample",
            "Student recording sheet",
            "Answer key sample",
        ],
        preview_pages=[1, 4, 8, 9],
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
        price_cents=600,
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
        summary="A first-week classroom procedures system with posters, practice pages, and teacher tools that make routines clear from day one.",
        short_description="Teach, practice, and reinforce classroom routines with a step-by-step pack built for the first week of school.",
        full_description="This back to school procedures pack gives teachers a complete launch system instead of a loose packet of reminders. The printable PDF includes a five-day teacher plan, student-friendly procedure posters, guided practice pages, a teacher checklist, scenario cards, expectations, a reinforcement tracker, and a quick reset guide for reteaching routines later. It is designed for elementary classrooms that need calm structure, clear expectations, and repeatable routines during the first week of school.",
        tags=["back to school", "procedures", "classroom routines", "teacher toolkit", "seasonal resource"],
        focus_skills=["routine building", "student expectations", "transition practice", "classroom systems"],
        included_items=[
            "10-page first-week classroom procedures toolkit with teacher-facing planning and printable student supports",
            "Five-day launch plan plus six core routine posters for arrival, morning routine, transitions, lining up, bathroom, and dismissal",
            "Student practice pages, scenario cards, a teacher checklist, and a reinforcement tracker",
            "Classroom expectations and a quick reset guide for reteaching routines when needed",
            "Real preview pages from the finished printable PDF",
        ],
        how_to_use=[
            "Follow the five-day launch plan to introduce only a few routines at a time, then use the matching posters and practice pages the same day.",
            "Keep the checklist, expectations page, and reinforcement tracker close by during the first week so you can see which routines need another round of practice.",
            "Reuse the scenario cards and quick reset guide later in the year any time classroom routines need a short reteach.",
        ],
        file_list=[
            "10-page printable PDF",
            "Named file: back-to-school-procedures-pack.pdf",
            "Includes teacher plan, posters, student practice, checklist, tracker, and reset guide",
        ],
        preview_labels=[
            "Cover and first-week focus",
            "Procedure poster sample",
            "Student practice page",
            "Quick reset guide",
        ],
        preview_pages=[1, 3, 5, 10],
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
        price_cents=500,
        seller="monica",
        summary="A polished end-of-year memory book that helps students reflect, celebrate friendships, and take home a finished keepsake.",
        short_description="Use this printable memory book when you want an end-of-year project that feels special, organized, and worth saving.",
        full_description="This end-of-year memory book is built to feel like a finished keepsake, not a throwaway countdown packet. Students move through guided reflection pages, favorites, best memories, friendship pages, class autographs, and next-year goals while teachers keep the project calm and manageable. The layout is clean, print-friendly, and structured enough for elementary classrooms that need a meaningful closing activity without extra prep.",
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
        included_items=[
            "10-page printable end-of-year memory book with cover, reflection pages, autograph page, and final wrap-up page",
            "Student writing and drawing pages for favorites, memories, learning growth, friendships, and future goals",
            "Teacher pacing notes for turning the project into a calm multi-day keepsake activity",
            "Print-friendly pages with structured boxes, writing lines, and balanced layouts that work across elementary grades",
            "Real preview pages pulled directly from the finished downloadable PDF",
        ],
        how_to_use=[
            "Print the full packet and complete one or two pages each day during the final week or two of school.",
            "Model one response on the first reflection page, then let students work independently or with a partner before sharing.",
            "Assemble the finished pages into a keepsake booklet that students can take home after class celebrations or portfolio cleanup.",
        ],
        file_list=[
            "10-page printable PDF",
            "Named file: end-of-year-memory-book.pdf",
            "Student cover, reflection, autograph, and goal-setting pages",
            "Teacher pacing notes page",
        ],
        preview_labels=[
            "Cover page",
            "About me page",
            "My best memory page",
            "Final reflection page",
        ],
        preview_pages=[1, 2, 5, 10],
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
    if spec_data["id"] in {"end-of-year-memory-book", "classroom-jobs-kit", "back-to-school-procedures-pack", "math-test-prep-task-cards-5"}:
        return []

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


def draw_memory_book_cover(canvas, spec_data):
    accent = subject_color(spec_data["subject"])
    soft = colors.HexColor("#FFF7ED")
    warm = colors.HexColor("#FDBA74")
    ink = colors.HexColor("#334155")

    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)

    canvas.setFillColor(accent)
    canvas.roundRect(0.7 * inch, 8.6 * inch, 7.1 * inch, 1.25 * inch, 0.22 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 24)
    canvas.drawCentredString(4.25 * inch, 9.32 * inch, "End of Year")
    canvas.drawCentredString(4.25 * inch, 8.96 * inch, "Memory Book")
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(4.25 * inch, 8.7 * inch, "A printable keepsake for reflection, celebration, and looking ahead")

    canvas.setFillColor(soft)
    canvas.roundRect(0.9 * inch, 1.2 * inch, 6.7 * inch, 6.8 * inch, 0.28 * inch, stroke=0, fill=1)

    canvas.setStrokeColor(warm)
    canvas.setLineWidth(2)
    canvas.roundRect(1.15 * inch, 5.95 * inch, 4.6 * inch, 1.45 * inch, 0.16 * inch, stroke=1, fill=0)
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.setLineWidth(1.2)
    canvas.roundRect(5.95 * inch, 5.95 * inch, 1.25 * inch, 1.45 * inch, 0.16 * inch, stroke=1, fill=0)

    canvas.setFillColor(ink)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawString(1.35 * inch, 7.02 * inch, "This memory book belongs to:")
    canvas.setFont("Helvetica", 11)
    canvas.drawString(1.35 * inch, 6.32 * inch, "Student name")
    canvas.drawString(6.18 * inch, 6.32 * inch, "Grade")

    field_specs = [
        ("Teacher", 1.15 * inch, 4.85 * inch, 2.8 * inch),
        ("School year", 4.25 * inch, 4.85 * inch, 2.95 * inch),
    ]
    for label, x_pos, y_pos, width in field_specs:
        canvas.setFillColor(colors.white)
        canvas.roundRect(x_pos, y_pos, width, 0.82 * inch, 0.14 * inch, stroke=1, fill=1)
        canvas.setFillColor(ink)
        canvas.setFont("Helvetica", 11)
        canvas.drawString(x_pos + 0.16 * inch, y_pos + 0.53 * inch, label)

    for x_pos, y_pos in [(1.25 * inch, 3.7 * inch), (5.6 * inch, 3.25 * inch), (1.35 * inch, 2.35 * inch)]:
        canvas.setFillColor(colors.HexColor("#FED7AA"))
        canvas.circle(x_pos, y_pos, 0.16 * inch, stroke=0, fill=1)

    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 11)
    canvas.drawString(1.65 * inch, 3.62 * inch, "Favorite memory")
    canvas.drawString(5.98 * inch, 3.16 * inch, "Friends")
    canvas.drawString(1.78 * inch, 2.27 * inch, "Goals for next year")

    canvas.setFont("Helvetica-Oblique", 10)
    canvas.drawCentredString(4.25 * inch, 1.45 * inch, "Celebrate the year, save the memories, and take the story home.")
    canvas.restoreState()


def draw_memory_book_frame(canvas, spec_data, page_title, subtitle):
    accent = subject_color(spec_data["subject"])
    soft = colors.HexColor("#FFF7ED")
    ink = colors.HexColor("#334155")

    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.rect(0, 10.1 * inch, 8.5 * inch, 0.9 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawCentredString(4.25 * inch, 10.55 * inch, spec_data["title"])
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(4.25 * inch, 10.33 * inch, f"{spec_data['gradeBand']} · {spec_data['subject']} · {spec_data['standardsTag']}")

    canvas.setFillColor(soft)
    canvas.roundRect(0.65 * inch, 0.95 * inch, 7.2 * inch, 8.7 * inch, 0.2 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 22)
    canvas.drawString(0.95 * inch, 9.02 * inch, page_title)
    canvas.setFillColor(ink)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(0.95 * inch, 8.72 * inch, subtitle)
    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(4.25 * inch, 0.45 * inch, f"LessonForgeHub · {spec_data['title']} · Page {canvas.getPageNumber()}")
    canvas.restoreState()


def draw_lined_box(canvas, x_pos, y_pos, width, height, line_gap=0.36 * inch):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.setLineWidth(1)
    canvas.roundRect(x_pos, y_pos, width, height, 0.12 * inch, stroke=1, fill=0)
    current_y = y_pos + height - 0.38 * inch
    while current_y > y_pos + 0.22 * inch:
        canvas.line(x_pos + 0.18 * inch, current_y, x_pos + width - 0.18 * inch, current_y)
        current_y -= line_gap
    canvas.restoreState()


def draw_prompt_label(canvas, text, x_pos, y_pos, accent):
    canvas.saveState()
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(x_pos, y_pos, text)
    canvas.restoreState()


def draw_memory_book_page(canvas, spec_data, page):
    accent = subject_color(spec_data["subject"])
    muted = colors.HexColor("#64748B")
    ink = colors.HexColor("#334155")

    draw_memory_book_frame(canvas, spec_data, page["title"], page["subtitle"])

    if page["kind"] == "about-me":
        draw_prompt_label(canvas, "My name is:", 1.0 * inch, 8.0 * inch, accent)
        draw_lined_box(canvas, 2.2 * inch, 7.6 * inch, 4.7 * inch, 0.65 * inch, 0.5 * inch)
        draw_prompt_label(canvas, "I am proud of:", 1.0 * inch, 6.85 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 5.7 * inch, 3.15 * inch, 1.0 * inch)
        draw_prompt_label(canvas, "Draw yourself or something you love about school.", 4.5 * inch, 6.85 * inch, accent)
        canvas.roundRect(4.5 * inch, 4.65 * inch, 2.4 * inch, 2.0 * inch, 0.12 * inch, stroke=1, fill=0)
        draw_prompt_label(canvas, "One thing that makes me special:", 1.0 * inch, 4.15 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 1.85 * inch, 5.9 * inch, 2.0 * inch)

    elif page["kind"] == "favorites":
        favorites = [
            ("Favorite subject", "Favorite book"),
            ("Favorite school lunch", "Favorite class activity"),
            ("Favorite place at school", "Favorite brain break"),
        ]
        top = 7.7 * inch
        for left, right in favorites:
            draw_prompt_label(canvas, left, 1.0 * inch, top, accent)
            draw_prompt_label(canvas, right, 4.45 * inch, top, accent)
            draw_lined_box(canvas, 1.0 * inch, top - 0.95 * inch, 2.7 * inch, 0.72 * inch, 0.5 * inch)
            draw_lined_box(canvas, 4.45 * inch, top - 0.95 * inch, 2.45 * inch, 0.72 * inch, 0.5 * inch)
            top -= 1.55 * inch
        canvas.setFillColor(muted)
        canvas.setFont("Helvetica", 10)
        canvas.drawString(1.0 * inch, 2.0 * inch, "Tip: Encourage students to answer in complete words or short phrases.")

    elif page["kind"] == "learned":
        prompts = [
            "This year I learned how to...",
            "One skill that got easier for me was...",
            "A challenge I worked through was...",
        ]
        top = 7.8 * inch
        for prompt in prompts:
            draw_prompt_label(canvas, prompt, 1.0 * inch, top, accent)
            draw_lined_box(canvas, 1.0 * inch, top - 1.2 * inch, 5.9 * inch, 0.95 * inch)
            top -= 2.1 * inch

    elif page["kind"] == "best-memory":
        draw_prompt_label(canvas, "My best memory from this school year was...", 1.0 * inch, 8.0 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 4.6 * inch, 5.9 * inch, 3.0 * inch, 0.34 * inch)
        draw_prompt_label(canvas, "Draw the moment here.", 1.0 * inch, 4.1 * inch, accent)
        canvas.roundRect(1.0 * inch, 1.55 * inch, 5.9 * inch, 2.2 * inch, 0.12 * inch, stroke=1, fill=0)

    elif page["kind"] == "friends":
        draw_prompt_label(canvas, "Friends I will remember", 1.0 * inch, 8.0 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 5.55 * inch, 5.9 * inch, 2.05 * inch)
        draw_prompt_label(canvas, "A kind memory from my classmates", 1.0 * inch, 5.0 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 2.15 * inch, 5.9 * inch, 2.45 * inch)

    elif page["kind"] == "teacher":
        prompts = [
            "One thing my teacher helped me learn...",
            "Something I will remember about my teacher...",
        ]
        top = 7.9 * inch
        for prompt in prompts:
            draw_prompt_label(canvas, prompt, 1.0 * inch, top, accent)
            draw_lined_box(canvas, 1.0 * inch, top - 1.1 * inch, 5.9 * inch, 0.95 * inch)
            top -= 2.0 * inch
        draw_prompt_label(canvas, "Draw a thank-you picture or favorite class moment.", 1.0 * inch, 3.75 * inch, accent)
        canvas.roundRect(1.0 * inch, 1.7 * inch, 5.9 * inch, 1.8 * inch, 0.12 * inch, stroke=1, fill=0)

    elif page["kind"] == "looking-ahead":
        prompts = [
            "Next year I am excited to...",
            "A goal I have for myself is...",
            "I want to keep getting better at...",
        ]
        top = 7.9 * inch
        for prompt in prompts:
            draw_prompt_label(canvas, prompt, 1.0 * inch, top, accent)
            draw_lined_box(canvas, 1.0 * inch, top - 1.0 * inch, 5.9 * inch, 0.82 * inch)
            top -= 1.95 * inch

    elif page["kind"] == "autographs":
        draw_prompt_label(canvas, "Class Autographs", 1.0 * inch, 8.0 * inch, accent)
        canvas.setFillColor(muted)
        canvas.setFont("Helvetica", 10)
        canvas.drawString(1.0 * inch, 7.7 * inch, "Invite classmates to sign their names or leave a short kind note.")
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.setLineWidth(1)
        for row in range(4):
            for col in range(2):
                x_pos = 1.0 * inch + col * 3.05 * inch
                y_pos = 6.4 * inch - row * 1.35 * inch
                canvas.roundRect(x_pos, y_pos, 2.7 * inch, 0.95 * inch, 0.1 * inch, stroke=1, fill=0)

    elif page["kind"] == "final-reflection":
        draw_prompt_label(canvas, "When I look back on this year, I want to remember...", 1.0 * inch, 8.0 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 4.75 * inch, 5.9 * inch, 2.85 * inch)
        draw_prompt_label(canvas, "One word that describes my year:", 1.0 * inch, 4.1 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 3.45 * inch, 2.9 * inch, 0.62 * inch, 0.5 * inch)
        draw_prompt_label(canvas, "A message for future me:", 1.0 * inch, 2.8 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 1.55 * inch, 5.9 * inch, 0.95 * inch)

    else:
        draw_prompt_label(canvas, "Use this page for reflection and writing.", 1.0 * inch, 8.0 * inch, accent)
        draw_lined_box(canvas, 1.0 * inch, 2.0 * inch, 5.9 * inch, 5.2 * inch)


def draw_jobs_cover(canvas, spec_data):
    accent = colors.HexColor("#334155")
    gold = colors.HexColor("#F59E0B")
    slate = colors.HexColor("#E2E8F0")
    teal = colors.HexColor("#0F766E")
    blush = colors.HexColor("#FCE7F3")
    pale = colors.HexColor("#F8FAFC")

    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.roundRect(0.7 * inch, 8.55 * inch, 7.1 * inch, 1.45 * inch, 0.24 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 24)
    canvas.drawCentredString(4.25 * inch, 9.3 * inch, "Classroom Jobs Kit")
    canvas.setFont("Helvetica", 10.5)
    canvas.drawCentredString(4.25 * inch, 8.96 * inch, "A Simple System for Student Responsibility and Classroom Routines")

    canvas.setFillColor(pale)
    canvas.roundRect(0.9 * inch, 1.15 * inch, 6.7 * inch, 6.85 * inch, 0.28 * inch, stroke=0, fill=1)

    card_specs = [
        ("Line Leader", "Guides the class safely and listens for teacher directions.", 1.2 * inch, 6.15 * inch, teal),
        ("Materials Manager", "Passes out supplies, collects tools, and resets bins.", 4.35 * inch, 6.15 * inch, gold),
        ("Technology Helper", "Supports devices, chargers, and quick tech setup.", 1.2 * inch, 4.2 * inch, colors.HexColor("#2563EB")),
        ("Kindness Leader", "Looks for ways to welcome classmates and model respect.", 4.35 * inch, 4.2 * inch, colors.HexColor("#BE185D")),
    ]
    for title, body, x_pos, y_pos, tone in card_specs:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(slate)
        canvas.setLineWidth(1)
        canvas.roundRect(x_pos, y_pos, 2.6 * inch, 1.45 * inch, 0.14 * inch, stroke=1, fill=1)
        canvas.setFillColor(tone)
        canvas.roundRect(x_pos + 0.12 * inch, y_pos + 1.05 * inch, 2.05 * inch, 0.28 * inch, 0.08 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(x_pos + 0.22 * inch, y_pos + 1.14 * inch, title)
        canvas.setFillColor(accent)
        text = canvas.beginText(x_pos + 0.2 * inch, y_pos + 0.78 * inch)
        text.setFont("Helvetica", 9)
        for line in simpleSplit(body, "Helvetica", 9, 2.15 * inch):
            text.textLine(line)
        canvas.drawText(text)

    canvas.setFillColor(blush)
    canvas.roundRect(1.2 * inch, 2.15 * inch, 5.9 * inch, 1.15 * inch, 0.16 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(1.45 * inch, 2.95 * inch, "Inside this toolkit")
    canvas.setFont("Helvetica", 10)
    canvas.drawString(1.45 * inch, 2.62 * inch, "Teacher setup guide  •  24 job cards  •  Rotation chart  •  Student forms")
    canvas.drawString(1.45 * inch, 2.35 * inch, "Display pieces for a classroom jobs board")
    canvas.restoreState()


def draw_jobs_frame(canvas, spec_data, page_title, subtitle, accent=None):
    accent = accent or colors.HexColor("#334155")
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.rect(0, 10.05 * inch, 8.5 * inch, 0.95 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 17)
    canvas.drawCentredString(4.25 * inch, 10.56 * inch, spec_data["title"])
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(4.25 * inch, 10.31 * inch, f"{spec_data['gradeBand']} · {spec_data['subject']} · {spec_data['standardsTag']}")
    canvas.setFillColor(colors.HexColor("#F8FAFC"))
    canvas.roundRect(0.62 * inch, 0.95 * inch, 7.25 * inch, 8.65 * inch, 0.2 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 21)
    canvas.drawString(0.95 * inch, 9.02 * inch, page_title)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.setFont("Helvetica", 10.5)
    canvas.drawString(0.95 * inch, 8.72 * inch, subtitle)
    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(4.25 * inch, 0.44 * inch, f"LessonForgeHub · {spec_data['title']} · Page {canvas.getPageNumber()}")
    canvas.restoreState()


def draw_wrapped_text(canvas, text, x_pos, y_pos, width, font="Helvetica", size=10, leading=14, color=colors.HexColor("#1F2937")):
    canvas.saveState()
    canvas.setFillColor(color)
    text_obj = canvas.beginText(x_pos, y_pos)
    text_obj.setFont(font, size)
    text_obj.setLeading(leading)
    for line in simpleSplit(text, font, size, width):
        text_obj.textLine(line)
    canvas.drawText(text_obj)
    canvas.restoreState()


def draw_jobs_setup_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_jobs_frame(canvas, spec_data, "Teacher Setup Guide", "Launch the jobs system with simple routines that are easy to maintain.", accent)
    steps = [
        ("1. Choose your jobs", "Pick the 8 to 12 jobs that match your classroom routines and print only the cards you want to start with."),
        ("2. Teach the expectations", "Model what each job looks like, sounds like, and when it should happen so students know the routine."),
        ("3. Assign students", "Use the student application and your knowledge of the class to make first-round assignments."),
        ("4. Rotate weekly", "Update the rotation chart once a week and keep the display visible so transitions stay smooth."),
        ("5. Reset and reflect", "Use the reflection page for a quick Friday check-in before new jobs are assigned."),
    ]
    y_pos = 7.7 * inch
    for heading, body in steps:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y_pos - 0.78 * inch, 5.9 * inch, 0.9 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 11.5)
        canvas.drawString(1.18 * inch, y_pos - 0.08 * inch, heading)
        draw_wrapped_text(canvas, body, 1.18 * inch, y_pos - 0.32 * inch, 5.45 * inch, size=9.5, leading=12.5)
        y_pos -= 1.18 * inch
    canvas.setFillColor(colors.HexColor("#FEF3C7"))
    canvas.roundRect(1.0 * inch, 1.35 * inch, 5.9 * inch, 1.08 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#92400E"))
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.18 * inch, 2.12 * inch, "Quick tip")
    draw_wrapped_text(canvas, "Start with fewer jobs for the first week, then rotate names one spot each Friday so the routine stays simple and predictable.", 1.18 * inch, 1.87 * inch, 5.35 * inch, size=9.4, leading=11.8)


def draw_jobs_list_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_jobs_frame(canvas, spec_data, "Classroom Job List", "Choose from common classroom roles that help routines run smoothly.", accent)
    jobs = [
        "Line Leader", "Door Holder", "Paper Passer", "Materials Manager",
        "Technology Helper", "Board Cleaner", "Library Helper", "Desk Inspector",
        "Messenger", "Attendance Helper", "Lunch Count Helper", "Pencil Manager",
        "Classroom Greeter", "Substitute Assistant", "Calendar Helper", "Plant Helper",
        "Recycling Helper", "Floor Monitor", "Chair Stacker", "Clean-Up Captain",
        "Supply Organizer", "Kindness Leader", "Light Monitor", "Homework Collector",
    ]
    columns = [jobs[:12], jobs[12:]]
    x_positions = [1.05 * inch, 4.1 * inch]
    for col, x_pos in zip(columns, x_positions):
        y_pos = 7.95 * inch
        for item in col:
            canvas.setFillColor(colors.white)
            canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
            canvas.roundRect(x_pos, y_pos - 0.42 * inch, 2.45 * inch, 0.52 * inch, 0.08 * inch, stroke=1, fill=1)
            canvas.setFillColor(accent)
            canvas.setFont("Helvetica", 10)
            canvas.drawString(x_pos + 0.16 * inch, y_pos - 0.12 * inch, item)
            y_pos -= 0.6 * inch


def draw_job_cards_page(canvas, spec_data, page_title, jobs, accent, card_fill):
    draw_jobs_frame(canvas, spec_data, page_title, "Print, cut, and display the cards that match your classroom routines.", accent)
    card_width = 2.8 * inch
    card_height = 1.33 * inch
    x_positions = [0.95 * inch, 3.75 * inch]
    y_positions = [7.35 * inch, 5.7 * inch, 4.05 * inch, 2.4 * inch]
    index = 0
    for y_pos in y_positions:
        for x_pos in x_positions:
            title, body = jobs[index]
            canvas.setFillColor(colors.white)
            canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
            canvas.setLineWidth(1.1)
            canvas.roundRect(x_pos, y_pos, card_width, card_height, 0.12 * inch, stroke=1, fill=1)
            canvas.setFillColor(card_fill)
            canvas.roundRect(x_pos + 0.12 * inch, y_pos + 0.9 * inch, 2.1 * inch, 0.25 * inch, 0.07 * inch, stroke=0, fill=1)
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 11)
            canvas.drawString(x_pos + 0.22 * inch, y_pos + 0.975 * inch, title)
            draw_wrapped_text(canvas, body, x_pos + 0.2 * inch, y_pos + 0.68 * inch, 2.35 * inch, size=8.5, leading=10.2)
            index += 1


def draw_jobs_application_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_jobs_frame(canvas, spec_data, "Student Job Application", "Learn which classroom jobs students feel excited and ready to try.", accent)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.setFillColor(accent)
    canvas.drawString(1.0 * inch, 8.0 * inch, "Name")
    draw_lined_box(canvas, 1.65 * inch, 7.7 * inch, 5.2 * inch, 0.55 * inch, 0.5 * inch)
    fields = [
        ("My top three job choices are...", 6.65 * inch, 1.38 * inch),
        ("Strengths I could bring to a classroom job...", 4.85 * inch, 1.75 * inch),
        ("Why I want one of these jobs...", 2.55 * inch, 1.55 * inch),
    ]
    for label, y_pos, height in fields:
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(1.0 * inch, y_pos, label)
        draw_lined_box(canvas, 1.0 * inch, y_pos - height, 5.9 * inch, height - 0.18 * inch)


def draw_jobs_rotation_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_jobs_frame(canvas, spec_data, "Weekly Job Rotation Chart", "Track student assignments in one place so weekly changes stay clear and visible.", accent)
    columns = ["Job", "Student", "Next up", "Check-in note"]
    widths = [2.05 * inch, 2.05 * inch, 1.15 * inch, 0.95 * inch]
    x_pos = 0.95 * inch
    y_start = 7.8 * inch
    canvas.setFillColor(colors.HexColor("#E2E8F0"))
    current_x = x_pos
    for col, width in zip(columns, widths):
        canvas.rect(current_x, y_start, width, 0.5 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawCentredString(current_x + width / 2, y_start + 0.16 * inch, col)
        canvas.setFillColor(colors.HexColor("#E2E8F0"))
        current_x += width
    rows = ["Line Leader", "Materials Manager", "Technology Helper", "Messenger", "Kindness Leader", "Clean-Up Captain", "Library Helper", "Homework Collector"]
    y_pos = y_start - 0.5 * inch
    for row in rows:
        current_x = x_pos
        row_height = 0.7 * inch
        for width in widths:
            canvas.setFillColor(colors.white)
            canvas.rect(current_x, y_pos, width, row_height, stroke=1, fill=1)
            current_x += width
        canvas.setFillColor(colors.HexColor("#334155"))
        canvas.setFont("Helvetica", 9.5)
        canvas.drawString(x_pos + 0.1 * inch, y_pos + 0.25 * inch, row)
        y_pos -= row_height
    draw_wrapped_text(canvas, "Tip: Keep this page in a clipboard, binder, or sleeve so you can update it quickly each week. Move student names down one row or one column to keep the rotation simple.", 1.0 * inch, 1.55 * inch, 5.9 * inch, size=9.2, leading=11.8)


def draw_jobs_reflection_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_jobs_frame(canvas, spec_data, "Job Performance Reflection", "Use a quick reflection to help students think about ownership and improvement.", accent)
    prompts = [
        "I completed my job by...",
        "One thing I did well was...",
        "One thing I can improve next time is...",
    ]
    y_pos = 7.9 * inch
    for prompt in prompts:
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(1.0 * inch, y_pos, prompt)
        draw_lined_box(canvas, 1.0 * inch, y_pos - 1.05 * inch, 5.9 * inch, 0.82 * inch)
        y_pos -= 2.0 * inch


def draw_jobs_display_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    teal = colors.HexColor("#0F766E")
    gold = colors.HexColor("#F59E0B")
    rose = colors.HexColor("#DB2777")
    draw_jobs_frame(canvas, spec_data, "Display Header and Labels", "Create a classroom jobs board with simple print-and-post pieces.", accent)
    canvas.setFillColor(accent)
    canvas.roundRect(1.25 * inch, 7.35 * inch, 4.5 * inch, 0.85 * inch, 0.14 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 22)
    canvas.drawCentredString(3.5 * inch, 7.68 * inch, "Classroom Jobs")
    labels = [
        ("This Week", teal), ("Next Up", gold), ("Job Cards", rose),
        ("Helpers", accent), ("Rotation", teal), ("Our Team", gold),
    ]
    x_positions = [1.25 * inch, 3.3 * inch, 5.35 * inch]
    y_positions = [5.9 * inch, 4.85 * inch]
    index = 0
    for y_pos in y_positions:
        for x_pos in x_positions:
            label, tone = labels[index]
            canvas.setFillColor(tone)
            canvas.roundRect(x_pos, y_pos, 1.6 * inch, 0.55 * inch, 0.1 * inch, stroke=0, fill=1)
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 10.5)
            canvas.drawCentredString(x_pos + 0.8 * inch, y_pos + 0.2 * inch, label)
            index += 1
    draw_wrapped_text(canvas, "Print these pieces on cardstock, laminate if you want reuse, and attach them to a bulletin board, pocket chart, or classroom display wall.", 1.2 * inch, 3.55 * inch, 5.8 * inch, size=9.5, leading=12)


def build_classroom_jobs_pdf(spec_data, file_path: Path):
    job_cards = [
        ("Line Leader", "Leads the line safely, listens for directions, and helps the class move together."),
        ("Door Holder", "Opens the door for classmates and waits until everyone has passed through."),
        ("Paper Passer", "Hands out papers carefully and makes sure each classmate gets a copy."),
        ("Materials Manager", "Passes out supplies, collects tools, and returns materials to the right place."),
        ("Technology Helper", "Supports device setup, checks headphones, and helps with simple tech needs."),
        ("Board Cleaner", "Cleans the board or chart area neatly at the end of a lesson or day."),
        ("Library Helper", "Keeps book tubs tidy and returns class library books to the right spot."),
        ("Desk Inspector", "Checks that desks and table spaces are neat before transitions or dismissal."),
        ("Messenger", "Delivers notes or materials carefully when the teacher sends them."),
        ("Attendance Helper", "Helps gather attendance items or supports the attendance routine."),
        ("Lunch Count Helper", "Collects lunch choices or reminds classmates about the lunch routine."),
        ("Pencil Manager", "Keeps sharpened pencils ready and helps organize shared writing tools."),
        ("Classroom Greeter", "Welcomes classmates kindly and helps everyone feel included at the start of the day."),
        ("Substitute Assistant", "Explains classroom routines politely and helps a guest teacher find supplies."),
        ("Calendar Helper", "Updates the calendar or helps with the morning meeting date routine."),
        ("Plant Helper", "Watches classroom plants and reminds the teacher when they need care."),
        ("Recycling Helper", "Collects recyclables and keeps the recycling area neat and organized."),
        ("Floor Monitor", "Looks for scraps or spills and helps keep the floor safe and clean."),
        ("Chair Stacker", "Helps with chairs during clean-up, dismissal, or room resets."),
        ("Clean-Up Captain", "Leads a quick room check and reminds the class about clean-up expectations."),
        ("Supply Organizer", "Straightens shared bins, centers, or math tools so materials stay easy to find."),
        ("Kindness Leader", "Models encouraging words and looks for ways to include or help classmates."),
        ("Light Monitor", "Turns lights on or off when the teacher asks and helps with simple room setup."),
        ("Homework Collector", "Collects completed work and makes sure papers are handed in neatly."),
    ]

    pdf = canvas.Canvas(str(file_path), pagesize=letter)
    pdf.setTitle(spec_data["title"])
    pdf.setAuthor(spec_data["sellerName"])

    draw_jobs_cover(pdf, spec_data)
    pdf.showPage()
    draw_jobs_setup_page(pdf, spec_data)
    pdf.showPage()
    draw_jobs_list_page(pdf, spec_data)
    pdf.showPage()
    draw_job_cards_page(pdf, spec_data, "Job Description Cards · Set 1", job_cards[:8], colors.HexColor("#334155"), colors.HexColor("#0F766E"))
    pdf.showPage()
    draw_job_cards_page(pdf, spec_data, "Job Description Cards · Set 2", job_cards[8:16], colors.HexColor("#334155"), colors.HexColor("#2563EB"))
    pdf.showPage()
    draw_job_cards_page(pdf, spec_data, "Job Description Cards · Set 3", job_cards[16:], colors.HexColor("#334155"), colors.HexColor("#DB2777"))
    pdf.showPage()
    draw_jobs_application_page(pdf, spec_data)
    pdf.showPage()
    draw_jobs_rotation_page(pdf, spec_data)
    pdf.showPage()
    draw_jobs_reflection_page(pdf, spec_data)
    pdf.showPage()
    draw_jobs_display_page(pdf, spec_data)
    pdf.showPage()
    pdf.save()


def draw_procedures_cover(canvas, spec_data):
    navy = colors.HexColor("#334155")
    teal = colors.HexColor("#0F766E")
    gold = colors.HexColor("#F59E0B")
    soft = colors.HexColor("#F8FAFC")
    rose = colors.HexColor("#FCE7F3")

    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(navy)
    canvas.roundRect(0.72 * inch, 8.45 * inch, 7.06 * inch, 1.55 * inch, 0.24 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 23)
    canvas.drawCentredString(4.25 * inch, 9.22 * inch, "Back to School")
    canvas.drawCentredString(4.25 * inch, 8.88 * inch, "Procedures Pack")
    canvas.setFont("Helvetica", 10.5)
    canvas.drawCentredString(4.25 * inch, 8.58 * inch, "A first-week system for teaching routines, practice, and classroom resets")

    canvas.setFillColor(soft)
    canvas.roundRect(0.92 * inch, 1.18 * inch, 6.66 * inch, 6.75 * inch, 0.26 * inch, stroke=0, fill=1)

    poster_specs = [
        ("Arrival", ["Walk in calmly", "Unpack", "Turn in folders"], 1.22 * inch, 5.85 * inch, teal),
        ("Transitions", ["Listen", "Move safely", "Start quickly"], 4.42 * inch, 5.85 * inch, gold),
        ("Dismissal", ["Pack up", "Clean area", "Wait for call"], 2.82 * inch, 3.85 * inch, colors.HexColor("#DB2777")),
    ]
    for title, steps, x_pos, y_pos, tone in poster_specs:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(x_pos, y_pos, 2.1 * inch, 1.45 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(tone)
        canvas.roundRect(x_pos + 0.14 * inch, y_pos + 1.02 * inch, 1.32 * inch, 0.24 * inch, 0.08 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 10.5)
        canvas.drawString(x_pos + 0.24 * inch, y_pos + 1.09 * inch, title)
        yy = y_pos + 0.77 * inch
        canvas.setFillColor(navy)
        canvas.setFont("Helvetica", 8.8)
        for step in steps:
            canvas.drawString(x_pos + 0.22 * inch, yy, f"• {step}")
            yy -= 0.23 * inch

    canvas.setFillColor(rose)
    canvas.roundRect(1.2 * inch, 2.0 * inch, 5.9 * inch, 0.92 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(navy)
    canvas.setFont("Helvetica-Bold", 12.5)
    canvas.drawString(1.45 * inch, 2.56 * inch, "Inside this pack")
    canvas.setFont("Helvetica", 9.7)
    canvas.drawString(1.45 * inch, 2.28 * inch, "5-day teacher plan  •  posters  •  practice pages  •  checklist  •  tracker")
    canvas.restoreState()


def draw_procedures_frame(canvas, spec_data, page_title, subtitle, accent=None):
    accent = accent or colors.HexColor("#334155")
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.rect(0, 10.05 * inch, 8.5 * inch, 0.95 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 17)
    canvas.drawCentredString(4.25 * inch, 10.56 * inch, spec_data["title"])
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(4.25 * inch, 10.31 * inch, f"{spec_data['gradeBand']} · {spec_data['subject']} · {spec_data['standardsTag']}")
    canvas.setFillColor(colors.HexColor("#F8FAFC"))
    canvas.roundRect(0.62 * inch, 0.95 * inch, 7.25 * inch, 8.65 * inch, 0.2 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 20.5)
    canvas.drawString(0.95 * inch, 9.02 * inch, page_title)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.setFont("Helvetica", 10.4)
    canvas.drawString(0.95 * inch, 8.72 * inch, subtitle)
    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(4.25 * inch, 0.44 * inch, f"LessonForgeHub · {spec_data['title']} · Page {canvas.getPageNumber()}")
    canvas.restoreState()


def draw_procedures_plan_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "3 to 5 Day Teacher Plan", "Introduce only a few routines at a time so students can model, practice, and review.", accent)
    days = [
        ("Day 1", "Arrival, unpacking, and morning routine", "Model each step, practice twice, then stop and reteach one part before dismissal."),
        ("Day 2", "Transitions and lining up", "Teach movement cues, practice from desks to line, then review what a calm transition sounds like."),
        ("Day 3", "Bathroom and classroom expectations", "Walk through the bathroom routine, introduce expectations, and use the self-check page."),
        ("Day 4", "Dismissal and whole-group review", "Practice end-of-day cleanup, pack-up, and dismissal while reviewing any routine that still feels shaky."),
        ("Day 5", "Reset and reinforce", "Use the tracker, scenario cards, and quick reset guide to revisit any routine that needs another round."),
    ]
    y = 7.72 * inch
    for day, focus, steps in days:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(0.98 * inch, y - 0.82 * inch, 5.95 * inch, 0.96 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 11.2)
        canvas.drawString(1.15 * inch, y - 0.08 * inch, f"{day} · {focus}")
        draw_wrapped_text(canvas, steps, 1.15 * inch, y - 0.34 * inch, 5.5 * inch, size=9.4, leading=11.8)
        y -= 1.2 * inch
    canvas.setFillColor(colors.HexColor("#FEF3C7"))
    canvas.roundRect(0.98 * inch, 1.36 * inch, 5.95 * inch, 0.9 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#92400E"))
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.16 * inch, 1.9 * inch, "Launch reminder")
    draw_wrapped_text(canvas, "Keep posters visible all week and use the same language each time you stop, reteach, and practice a routine again.", 1.16 * inch, 1.64 * inch, 5.45 * inch, size=9.3, leading=11.5)


def draw_poster_card(canvas, title, steps, x_pos, y_pos, width, height, tone):
    canvas.setFillColor(colors.white)
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.roundRect(x_pos, y_pos, width, height, 0.12 * inch, stroke=1, fill=1)
    canvas.setFillColor(tone)
    canvas.roundRect(x_pos + 0.14 * inch, y_pos + height - 0.34 * inch, min(width - 0.28 * inch, 1.75 * inch), 0.24 * inch, 0.08 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 10.5)
    canvas.drawString(x_pos + 0.22 * inch, y_pos + height - 0.27 * inch, title)
    yy = y_pos + height - 0.62 * inch
    canvas.setFillColor(colors.HexColor("#334155"))
    canvas.setFont("Helvetica", 9)
    for step in steps:
        for i, line in enumerate(simpleSplit(f"• {step}", "Helvetica", 9, width - 0.42 * inch)):
            canvas.drawString(x_pos + 0.2 * inch, yy, line)
            yy -= 0.18 * inch
        yy -= 0.07 * inch


def draw_procedure_posters_page(canvas, spec_data, title, subtitle, posters):
    draw_procedures_frame(canvas, spec_data, title, subtitle, colors.HexColor("#334155"))
    card_width = 2.82 * inch
    card_height = 2.4 * inch
    positions = [(0.95 * inch, 5.85 * inch), (3.73 * inch, 5.85 * inch), (2.34 * inch, 2.85 * inch)]
    for (poster_title, steps, tone), (x_pos, y_pos) in zip(posters, positions):
        draw_poster_card(canvas, poster_title, steps, x_pos, y_pos, card_width, card_height, tone)


def draw_procedures_practice_page_one(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "Student Practice Page", "Use this page after modeling the routine so students can notice the right actions.", accent)
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.0 * inch, 7.95 * inch, "Morning routine checklist")
    checklist = ["Hang up backpack", "Turn in folder", "Choose lunch", "Start morning work"]
    y = 7.55 * inch
    for item in checklist:
        canvas.setStrokeColor(colors.HexColor("#94A3B8"))
        canvas.rect(1.05 * inch, y - 0.12 * inch, 0.16 * inch, 0.16 * inch, stroke=1, fill=0)
        canvas.setFillColor(colors.HexColor("#334155"))
        canvas.setFont("Helvetica", 10)
        canvas.drawString(1.35 * inch, y - 0.02 * inch, item)
        y -= 0.38 * inch
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.0 * inch, 5.9 * inch, "Correct or incorrect?")
    scenarios = [
        ("A student walks in, unpacks, and starts the warm-up.", "Correct"),
        ("A student talks with friends instead of joining the line.", "Incorrect"),
        ("A student asks for a bathroom break by following the class signal.", "Correct"),
    ]
    y = 5.5 * inch
    for text, answer in scenarios:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y - 0.55 * inch, 5.9 * inch, 0.66 * inch, 0.1 * inch, stroke=1, fill=1)
        draw_wrapped_text(canvas, text, 1.16 * inch, y - 0.18 * inch, 4.25 * inch, size=9.5, leading=11.8)
        canvas.setFillColor(colors.HexColor("#E2E8F0"))
        canvas.roundRect(5.55 * inch, y - 0.4 * inch, 1.05 * inch, 0.28 * inch, 0.06 * inch, stroke=0, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawCentredString(6.07 * inch, y - 0.3 * inch, answer)
        y -= 0.92 * inch
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.0 * inch, 2.15 * inch, "Short reflection")
    draw_lined_box(canvas, 1.0 * inch, 1.2 * inch, 5.9 * inch, 0.78 * inch)


def draw_procedures_practice_page_two(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "Routine Matching and Self-Check", "Give students one more round of guided practice before the routine becomes independent.", accent)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.setFillColor(accent)
    canvas.drawString(1.0 * inch, 7.95 * inch, "Match the routine to the reminder")
    left = ["Arrival", "Transitions", "Bathroom", "Dismissal"]
    right = ["Pack up, clean your area, and wait calmly", "Move quickly, quietly, and face the speaker", "Use the signal and return ready to learn", "Unpack, turn in folders, and begin work"]
    y = 7.45 * inch
    for idx, (l_text, r_text) in enumerate(zip(left, right), start=1):
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y - 0.18 * inch, 1.55 * inch, 0.36 * inch, 0.08 * inch, stroke=1, fill=1)
        canvas.roundRect(3.0 * inch, y - 0.28 * inch, 3.9 * inch, 0.56 * inch, 0.08 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 9.5)
        canvas.drawString(1.16 * inch, y - 0.02 * inch, f"{idx}. {l_text}")
        draw_wrapped_text(canvas, r_text, 3.16 * inch, y + 0.06 * inch, 3.45 * inch, size=9.2, leading=11)
        y -= 0.82 * inch
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.0 * inch, 3.78 * inch, "Student self-check")
    prompts = [
        "I followed our class routine when...",
        "A procedure I still need to practice is...",
    ]
    y = 3.38 * inch
    for prompt in prompts:
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(1.0 * inch, y, prompt)
        draw_lined_box(canvas, 1.0 * inch, y - 0.86 * inch, 5.9 * inch, 0.62 * inch)
        y -= 1.45 * inch


def draw_procedure_checklist_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "Teacher Procedure Checklist", "Keep this page nearby so you can see what has been taught, practiced, and reteached.", accent)
    columns = ["Routine", "Taught", "Practiced", "Reteach?"]
    widths = [2.55 * inch, 1.0 * inch, 1.1 * inch, 1.05 * inch]
    x = 1.0 * inch
    y = 7.85 * inch
    current = x
    canvas.setFillColor(colors.HexColor("#E2E8F0"))
    for col, w in zip(columns, widths):
        canvas.rect(current, y, w, 0.46 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 9.5)
        canvas.drawCentredString(current + w / 2, y + 0.16 * inch, col)
        canvas.setFillColor(colors.HexColor("#E2E8F0"))
        current += w
    rows = ["Arrival", "Morning routine", "Transitions", "Lining up", "Bathroom", "Dismissal", "Independent work", "Whole-group attention"]
    y -= 0.46 * inch
    for row in rows:
        current = x
        row_h = 0.62 * inch
        for w in widths:
            canvas.setFillColor(colors.white)
            canvas.rect(current, y, w, row_h, stroke=1, fill=1)
            current += w
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica", 9.5)
        canvas.drawString(x + 0.1 * inch, y + 0.21 * inch, row)
        y -= row_h
    draw_wrapped_text(canvas, "Use a check mark, date, or quick note in the last three columns. This works well for the first week and for future class resets.", 1.0 * inch, 1.45 * inch, 5.9 * inch, size=9.4, leading=11.8)


def draw_scenario_cards_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "Practice Scenario Cards", "Act out short classroom situations so students can spot the right routine choices.", accent)
    cards = [
        ("Arrival", "A student walks in, hangs up the backpack, and starts the warm-up right away.", "Correct"),
        ("Transitions", "A student keeps talking while the class is moving to the carpet.", "Incorrect"),
        ("Lining up", "A student faces forward, leaves space, and keeps hands to self.", "Correct"),
        ("Bathroom", "A student leaves without using the class signal or asking.", "Incorrect"),
    ]
    positions = [(1.0 * inch, 6.25 * inch), (4.15 * inch, 6.25 * inch), (1.0 * inch, 3.5 * inch), (4.15 * inch, 3.5 * inch)]
    for (title, body, tag), (x, y) in zip(cards, positions):
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(x, y, 2.75 * inch, 2.0 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(colors.HexColor("#0F766E") if tag == "Correct" else colors.HexColor("#B91C1C"))
        canvas.roundRect(x + 0.14 * inch, y + 1.56 * inch, 1.18 * inch, 0.24 * inch, 0.08 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(x + 0.24 * inch, y + 1.63 * inch, title)
        draw_wrapped_text(canvas, body, x + 0.18 * inch, y + 1.28 * inch, 2.35 * inch, size=9.2, leading=11.5)
        canvas.setFillColor(colors.HexColor("#E2E8F0"))
        canvas.roundRect(x + 1.72 * inch, y + 0.18 * inch, 0.7 * inch, 0.25 * inch, 0.06 * inch, stroke=0, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawCentredString(x + 2.07 * inch, y + 0.26 * inch, tag)


def draw_expectations_tracker_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "Classroom Expectations and Reinforcement Tracker", "Keep expectations simple, visible, and easy to celebrate during the first week.", accent)
    expectations = [
        ("Be safe", "Use calm bodies, careful movement, and classroom tools the right way."),
        ("Be respectful", "Listen, follow directions, and speak kindly to classmates and adults."),
        ("Be ready", "Bring materials, start quickly, and do your best work the first time."),
    ]
    y = 7.45 * inch
    for title, body in expectations:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y - 0.56 * inch, 5.9 * inch, 0.68 * inch, 0.1 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 10.5)
        canvas.drawString(1.16 * inch, y - 0.04 * inch, title)
        draw_wrapped_text(canvas, body, 2.05 * inch, y - 0.02 * inch, 4.55 * inch, size=9.1, leading=11)
        y -= 0.95 * inch
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.0 * inch, 4.2 * inch, "Reinforcement tracker")
    headers = ["Day", "Routine focus", "Class result"]
    widths = [1.0 * inch, 2.6 * inch, 2.3 * inch]
    x = 1.0 * inch
    y = 3.72 * inch
    current = x
    canvas.setFillColor(colors.HexColor("#E2E8F0"))
    for h, w in zip(headers, widths):
        canvas.rect(current, y, w, 0.42 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 9.3)
        canvas.drawCentredString(current + w / 2, y + 0.14 * inch, h)
        canvas.setFillColor(colors.HexColor("#E2E8F0"))
        current += w
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    y -= 0.42 * inch
    for day in days:
        current = x
        row_h = 0.56 * inch
        for w in widths:
            canvas.setFillColor(colors.white)
            canvas.rect(current, y, w, row_h, stroke=1, fill=1)
            current += w
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica", 9.4)
        canvas.drawString(x + 0.12 * inch, y + 0.18 * inch, day)
        y -= row_h


def draw_reset_guide_page(canvas, spec_data):
    accent = colors.HexColor("#334155")
    draw_procedures_frame(canvas, spec_data, "Quick Reset Guide", "Use this teacher page when a routine breaks down and the class needs a calm reteach.", accent)
    steps = [
        ("1. Reteach", "Name the routine that needs work and restate the expectation in one clear sentence."),
        ("2. Model", "Show students exactly what the routine should look like, sound like, and feel like."),
        ("3. Practice", "Run the routine again right away so students can try it with immediate feedback."),
        ("4. Reinforce", "Notice the correct behavior quickly and point back to the poster or tracker."),
    ]
    y = 7.55 * inch
    for heading, body in steps:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y - 0.72 * inch, 5.9 * inch, 0.82 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(1.16 * inch, y - 0.06 * inch, heading)
        draw_wrapped_text(canvas, body, 1.16 * inch, y - 0.3 * inch, 5.45 * inch, size=9.4, leading=11.8)
        y -= 1.08 * inch
    canvas.setFillColor(colors.HexColor("#FEF3C7"))
    canvas.roundRect(1.0 * inch, 2.25 * inch, 5.9 * inch, 1.1 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#92400E"))
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.16 * inch, 2.95 * inch, "Keep it simple")
    draw_wrapped_text(canvas, "Pick one routine, use the same words as the poster, and practice it immediately instead of piling on more reminders.", 1.16 * inch, 2.68 * inch, 5.45 * inch, size=9.3, leading=11.6)


def build_procedures_pack_pdf(spec_data, file_path: Path):
    poster_group_one = [
        ("Arrival", ["Walk in calmly", "Unpack your things", "Turn in folders", "Start the warm-up"], colors.HexColor("#0F766E")),
        ("Morning routine", ["Hang up backpack", "Choose lunch", "Check directions", "Begin work"], colors.HexColor("#F59E0B")),
        ("Transitions", ["Stop and listen", "Move safely", "Go to the spot", "Start quickly"], colors.HexColor("#2563EB")),
    ]
    poster_group_two = [
        ("Lining up", ["Face forward", "Keep space", "Hands to self", "Wait quietly"], colors.HexColor("#0F766E")),
        ("Bathroom", ["Use the signal", "Walk quietly", "Return ready to learn", "Wash hands"], colors.HexColor("#DB2777")),
        ("Dismissal", ["Pack materials", "Clean area", "Listen for directions", "Wait for dismissal"], colors.HexColor("#F59E0B")),
    ]

    pdf = canvas.Canvas(str(file_path), pagesize=letter)
    pdf.setTitle(spec_data["title"])
    pdf.setAuthor(spec_data["sellerName"])
    draw_procedures_cover(pdf, spec_data)
    pdf.showPage()
    draw_procedures_plan_page(pdf, spec_data)
    pdf.showPage()
    draw_procedure_posters_page(pdf, spec_data, "Core Procedure Posters · Set 1", "Print these posters for the routines students use the minute they walk in.", poster_group_one)
    pdf.showPage()
    draw_procedure_posters_page(pdf, spec_data, "Core Procedure Posters · Set 2", "Keep these posters visible while you model and practice movement and end-of-day routines.", poster_group_two)
    pdf.showPage()
    draw_procedures_practice_page_one(pdf, spec_data)
    pdf.showPage()
    draw_procedures_practice_page_two(pdf, spec_data)
    pdf.showPage()
    draw_procedure_checklist_page(pdf, spec_data)
    pdf.showPage()
    draw_scenario_cards_page(pdf, spec_data)
    pdf.showPage()
    draw_expectations_tracker_page(pdf, spec_data)
    pdf.showPage()
    draw_reset_guide_page(pdf, spec_data)
    pdf.showPage()
    pdf.save()


def draw_math_task_cards_cover(canvas, spec_data):
    navy = colors.HexColor("#1E3A8A")
    sky = colors.HexColor("#DBEAFE")
    gold = colors.HexColor("#F59E0B")
    soft = colors.HexColor("#F8FAFC")
    ink = colors.HexColor("#334155")

    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(navy)
    canvas.roundRect(0.72 * inch, 8.42 * inch, 7.06 * inch, 1.6 * inch, 0.24 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 23)
    canvas.drawCentredString(4.25 * inch, 9.22 * inch, "Grade 5 Math")
    canvas.drawCentredString(4.25 * inch, 8.88 * inch, "Test Prep Task Cards")
    canvas.setFont("Helvetica", 10.5)
    canvas.drawCentredString(4.25 * inch, 8.58 * inch, "A printable system for centers, review, intervention, and test prep practice")

    canvas.setFillColor(soft)
    canvas.roundRect(0.92 * inch, 1.15 * inch, 6.66 * inch, 6.82 * inch, 0.26 * inch, stroke=0, fill=1)
    sample_cards = [
        ("Place Value", "Which digit in 48.372 has a value of 3 tenths?", 1.22 * inch, 5.75 * inch),
        ("Fractions", "Which is greater: 5/6 or 7/9? Explain.", 4.05 * inch, 5.75 * inch),
        ("Word Problems", "A recipe uses 2.5 cups of flour for each batch. How much for 3 batches?", 2.63 * inch, 3.65 * inch),
    ]
    for title, body, x_pos, y_pos in sample_cards:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#BFDBFE"))
        canvas.roundRect(x_pos, y_pos, 2.28 * inch, 1.55 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(gold if title == "Fractions" else navy)
        canvas.roundRect(x_pos + 0.12 * inch, y_pos + 1.08 * inch, 1.25 * inch, 0.24 * inch, 0.08 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(x_pos + 0.22 * inch, y_pos + 1.15 * inch, title)
        draw_wrapped_text(canvas, body, x_pos + 0.18 * inch, y_pos + 0.84 * inch, 1.9 * inch, size=8.8, leading=10.4)
    canvas.setFillColor(sky)
    canvas.roundRect(1.18 * inch, 1.88 * inch, 5.95 * inch, 0.95 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(ink)
    canvas.setFont("Helvetica-Bold", 12.5)
    canvas.drawString(1.42 * inch, 2.46 * inch, "Inside this set")
    canvas.setFont("Helvetica", 9.8)
    canvas.drawString(1.42 * inch, 2.16 * inch, "16 task cards  •  recording sheet  •  answer key  •  reteach notes")
    canvas.restoreState()


def draw_math_task_cards_frame(canvas, spec_data, page_title, subtitle, accent=None):
    accent = accent or colors.HexColor("#1E3A8A")
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, 8.5 * inch, 11 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.rect(0, 10.05 * inch, 8.5 * inch, 0.95 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 17)
    canvas.drawCentredString(4.25 * inch, 10.56 * inch, spec_data["title"])
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(4.25 * inch, 10.31 * inch, f"{spec_data['gradeBand']} · {spec_data['subject']} · {spec_data['standardsTag']}")
    canvas.setFillColor(colors.HexColor("#F8FAFC"))
    canvas.roundRect(0.62 * inch, 0.95 * inch, 7.25 * inch, 8.65 * inch, 0.2 * inch, stroke=0, fill=1)
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 20.5)
    canvas.drawString(0.95 * inch, 9.02 * inch, page_title)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.setFont("Helvetica", 10.4)
    canvas.drawString(0.95 * inch, 8.72 * inch, subtitle)
    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(4.25 * inch, 0.44 * inch, f"LessonForgeHub · {spec_data['title']} · Page {canvas.getPageNumber()}")
    canvas.restoreState()


def draw_math_task_directions_page(canvas, spec_data):
    accent = colors.HexColor("#1E3A8A")
    draw_math_task_cards_frame(canvas, spec_data, "Teacher Directions", "Choose the format that fits your class, then keep the routines simple and repeatable.", accent)
    modes = [
        ("Centers", "Place one set of four cards at each station and rotate students every 8 to 10 minutes."),
        ("Small group", "Use one set at a time, ask students to show work aloud, and stop after each card for quick reteach."),
        ("Whole class", "Project or read one card, let students solve independently, then compare strategies together."),
        ("Test prep review", "Mix all 16 cards across two or three days and use the recording sheet to see which standards still need practice."),
    ]
    y = 7.62 * inch
    for title, body in modes:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#BFDBFE"))
        canvas.roundRect(1.0 * inch, y - 0.74 * inch, 5.9 * inch, 0.84 * inch, 0.12 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(1.16 * inch, y - 0.06 * inch, title)
        draw_wrapped_text(canvas, body, 1.16 * inch, y - 0.3 * inch, 5.45 * inch, size=9.4, leading=11.8)
        y -= 1.08 * inch
    canvas.setFillColor(colors.HexColor("#FEF3C7"))
    canvas.roundRect(1.0 * inch, 1.55 * inch, 5.9 * inch, 0.82 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#92400E"))
    canvas.setFont("Helvetica-Bold", 10.8)
    canvas.drawString(1.16 * inch, 2.03 * inch, "Teacher tip")
    draw_wrapped_text(canvas, "Have students answer every card on the recording sheet, but ask them to show full work for at least four cards each round.", 1.16 * inch, 1.78 * inch, 5.4 * inch, size=9.2, leading=11.5)


def draw_skill_map_page(canvas, spec_data):
    accent = colors.HexColor("#1E3A8A")
    draw_math_task_cards_frame(canvas, spec_data, "Standards Skill Map", "Use this quick reference to choose cards by skill group or spot-check weak areas.", accent)
    groups = [
        ("Place value", "read, compare, round decimals; understand digit value"),
        ("Operations with decimals", "add, subtract, multiply, and divide with place value alignment"),
        ("Fractions", "compare, add unlike denominators, and interpret multiplication or division"),
        ("Measurement and data", "solve with line plots, conversions, or measurement facts"),
        ("Geometry", "classify figures and graph points in the first quadrant"),
        ("Word problems", "solve multi-step situations using the right operation and explain thinking"),
    ]
    y = 7.75 * inch
    for title, body in groups:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y - 0.56 * inch, 5.9 * inch, 0.66 * inch, 0.1 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 10.6)
        canvas.drawString(1.16 * inch, y - 0.02 * inch, title)
        draw_wrapped_text(canvas, body, 2.45 * inch, y, 4.0 * inch, size=9.1, leading=11)
        y -= 0.88 * inch


def draw_task_card(canvas, x_pos, y_pos, width, height, card_number, skill_label, problem, response_type, choices=None):
    accent = colors.HexColor("#1E3A8A")
    canvas.setFillColor(colors.white)
    canvas.setStrokeColor(colors.HexColor("#94A3B8"))
    canvas.setLineWidth(1.1)
    canvas.roundRect(x_pos, y_pos, width, height, 0.12 * inch, stroke=1, fill=1)
    canvas.setFillColor(accent)
    canvas.roundRect(x_pos + 0.12 * inch, y_pos + height - 0.34 * inch, 1.0 * inch, 0.24 * inch, 0.08 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9.8)
    canvas.drawString(x_pos + 0.2 * inch, y_pos + height - 0.27 * inch, f"Card {card_number}")
    canvas.setFillColor(colors.HexColor("#F59E0B"))
    canvas.roundRect(x_pos + 1.28 * inch, y_pos + height - 0.34 * inch, 1.18 * inch, 0.24 * inch, 0.08 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.drawString(x_pos + 1.38 * inch, y_pos + height - 0.27 * inch, skill_label)
    draw_wrapped_text(canvas, problem, x_pos + 0.18 * inch, y_pos + height - 0.6 * inch, width - 0.36 * inch, size=8.9, leading=10.6)
    if choices:
        y_text = y_pos + 0.7 * inch
        for choice in choices:
            draw_wrapped_text(canvas, choice, x_pos + 0.22 * inch, y_text, width - 0.44 * inch, size=8.5, leading=10.2)
            y_text -= 0.22 * inch
    else:
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.setFont("Helvetica-Oblique", 8.3)
        canvas.drawString(x_pos + 0.2 * inch, y_pos + 0.22 * inch, response_type)


def draw_task_cards_page(canvas, spec_data, title, subtitle, cards):
    draw_math_task_cards_frame(canvas, spec_data, title, subtitle, colors.HexColor("#1E3A8A"))
    positions = [(1.0 * inch, 5.85 * inch), (4.1 * inch, 5.85 * inch), (1.0 * inch, 2.82 * inch), (4.1 * inch, 2.82 * inch)]
    for card, (x_pos, y_pos) in zip(cards, positions):
        draw_task_card(canvas, x_pos, y_pos, 2.75 * inch, 2.35 * inch, **card)


def draw_recording_sheet_page(canvas, spec_data):
    accent = colors.HexColor("#1E3A8A")
    draw_math_task_cards_frame(canvas, spec_data, "Student Recording Sheet", "Use the numbered boxes for answers and the work area for cards that need more steps.", accent)
    cols = 4
    rows = 4
    start_x = 1.0 * inch
    start_y = 7.65 * inch
    box_w = 1.38 * inch
    box_h = 0.82 * inch
    gap_x = 0.18 * inch
    gap_y = 0.24 * inch
    num = 1
    for row in range(rows):
        for col in range(cols):
            x = start_x + col * (box_w + gap_x)
            y = start_y - row * (box_h + gap_y)
            canvas.setFillColor(colors.white)
            canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
            canvas.roundRect(x, y, box_w, box_h, 0.08 * inch, stroke=1, fill=1)
            canvas.setFillColor(accent)
            canvas.setFont("Helvetica-Bold", 9.5)
            canvas.drawString(x + 0.1 * inch, y + 0.56 * inch, str(num))
            canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
            canvas.line(x + 0.36 * inch, y + 0.28 * inch, x + box_w - 0.12 * inch, y + 0.28 * inch)
            num += 1
    canvas.setFillColor(accent)
    canvas.setFont("Helvetica-Bold", 10.8)
    canvas.drawString(1.0 * inch, 2.55 * inch, "Show your work for Cards 4, 8, 12, and 16.")
    draw_lined_box(canvas, 1.0 * inch, 1.2 * inch, 5.9 * inch, 1.1 * inch, 0.28 * inch)


def draw_answer_key_page(canvas, spec_data, answers):
    accent = colors.HexColor("#1E3A8A")
    draw_math_task_cards_frame(canvas, spec_data, "Answer Key", "Use the quick solution notes to check work and spot where students started to slip.", accent)
    left = answers[:8]
    right = answers[8:]
    columns = [(left, 1.0 * inch), (right, 4.05 * inch)]
    for group, x in columns:
        y = 7.8 * inch
        for number, answer, note in group:
            canvas.setFillColor(colors.white)
            canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
            canvas.roundRect(x, y - 0.56 * inch, 2.65 * inch, 0.66 * inch, 0.08 * inch, stroke=1, fill=1)
            canvas.setFillColor(accent)
            canvas.setFont("Helvetica-Bold", 9.5)
            canvas.drawString(x + 0.12 * inch, y - 0.03 * inch, f"{number}. {answer}")
            draw_wrapped_text(canvas, note, x + 0.12 * inch, y - 0.24 * inch, 2.35 * inch, size=8.3, leading=9.8)
            y -= 0.82 * inch


def draw_reteach_notes_page(canvas, spec_data):
    accent = colors.HexColor("#1E3A8A")
    draw_math_task_cards_frame(canvas, spec_data, "Teacher Reteach Notes", "Use these quick reminders after students finish the cards to target the next small-group review.", accent)
    notes = [
        ("Place value", "Students sometimes round the wrong digit. Cover the digits to the right and decide if the target digit stays or grows."),
        ("Decimal operations", "Students may forget to line up place values. Rewrite the numbers in a vertical format before solving."),
        ("Fractions", "Students often add denominators when they should find common denominators. Model equivalent fractions first."),
        ("Measurement and data", "Students may rush unit conversions. Ask what unit the problem starts with and what unit it ends with."),
        ("Geometry", "Students may confuse coordinate order. Repeat that the x-value comes first and moves left to right."),
        ("Word problems", "Students may choose the first operation they notice. Have them label what the question is really asking before solving."),
    ]
    y = 7.68 * inch
    for title, body in notes:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
        canvas.roundRect(1.0 * inch, y - 0.58 * inch, 5.9 * inch, 0.68 * inch, 0.1 * inch, stroke=1, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 10.2)
        canvas.drawString(1.14 * inch, y - 0.02 * inch, title)
        draw_wrapped_text(canvas, body, 2.2 * inch, y, 4.45 * inch, size=9.0, leading=10.8)
        y -= 0.86 * inch


def build_math_test_prep_task_cards_pdf(spec_data, file_path: Path):
    cards = [
        {"card_number": 1, "skill_label": "Place value", "problem": "Which value is equal to the digit 7 in 47.382?", "response_type": "Multiple choice", "choices": ["A. 7 tenths", "B. 7 ones", "C. 7 hundredths", "D. 7 thousandths"]},
        {"card_number": 2, "skill_label": "Place value", "problem": "Write 6 ones, 3 tenths, and 8 hundredths as a decimal.", "response_type": "Short response"},
        {"card_number": 3, "skill_label": "Word problem", "problem": "A school store sold 328 pencils on Monday and 247 pencils on Tuesday. How many pencils were sold in all?", "response_type": "Open response"},
        {"card_number": 4, "skill_label": "Measurement", "problem": "A ribbon is 2.5 meters long. Three pieces of the same length are needed. How many meters of ribbon are needed?", "response_type": "Constructed response"},
        {"card_number": 5, "skill_label": "Decimals", "problem": "Solve 18.45 + 6.7.", "response_type": "Short response"},
        {"card_number": 6, "skill_label": "Decimals", "problem": "Which number sentence is correct?", "response_type": "Multiple choice", "choices": ["A. 4.08 > 4.8", "B. 3.56 < 3.506", "C. 7.2 = 7.20", "D. 9.14 < 9.104"]},
        {"card_number": 7, "skill_label": "Decimals", "problem": "A runner completed 12.6 miles on Saturday and 8.75 miles on Sunday. How many miles altogether?", "response_type": "Open response"},
        {"card_number": 8, "skill_label": "Operations", "problem": "Solve 3.6 × 4. What does the product represent?", "response_type": "Constructed response"},
        {"card_number": 9, "skill_label": "Fractions", "problem": "Which fraction is greater, 5/6 or 7/9? Show how you know.", "response_type": "Constructed response"},
        {"card_number": 10, "skill_label": "Fractions", "problem": "Solve 2/3 + 1/6.", "response_type": "Short response"},
        {"card_number": 11, "skill_label": "Fractions", "problem": "A recipe needs 3/4 cup of milk. Emma pours 1/2 cup first. How much more milk does she need?", "response_type": "Open response"},
        {"card_number": 12, "skill_label": "Reasoning", "problem": "Jalen says 3/8 + 1/8 = 4/16. Explain his mistake and give the correct answer.", "response_type": "Constructed response"},
        {"card_number": 13, "skill_label": "Geometry", "problem": "Point A is at (3, 5). Which statement is true?", "response_type": "Multiple choice", "choices": ["A. It is 5 units right and 3 units up.", "B. It is 3 units right and 5 units up.", "C. It is 3 units left and 5 units up.", "D. It is 5 units right and 3 units down."]},
        {"card_number": 14, "skill_label": "Measurement", "problem": "A line plot shows lengths of 1/4, 1/4, 1/2, and 3/4 inch. What is the total length of all the pieces?", "response_type": "Open response"},
        {"card_number": 15, "skill_label": "Word problem", "problem": "A class is filling 6 binders. Each binder needs 18 sheets of paper. How many sheets are needed in all?", "response_type": "Short response"},
        {"card_number": 16, "skill_label": "Multi-step", "problem": "The school bought 8 boxes of markers with 12 markers in each box. Then 19 markers were used. How many markers are left?", "response_type": "Constructed response"},
    ]
    answers = [
        (1, "A", "The 7 is in the tenths place, so its value is 0.7."),
        (2, "6.38", "6 ones + 3 tenths + 8 hundredths = 6.38."),
        (3, "575", "Add 328 + 247 to find the total pencils sold."),
        (4, "7.5 meters", "Multiply 2.5 × 3."),
        (5, "25.15", "Write 6.70 so the decimal places line up before adding."),
        (6, "C", "A decimal can have trailing zeroes, so 7.2 = 7.20."),
        (7, "21.35 miles", "Add 12.60 + 8.75."),
        (8, "14.4", "Four groups of 3.6 gives a product of 14.4."),
        (9, "5/6", "Compare with common denominators: 5/6 = 15/18 and 7/9 = 14/18."),
        (10, "5/6", "Rename 2/3 as 4/6, then add 4/6 + 1/6."),
        (11, "1/4 cup", "Subtract 1/2 from 3/4."),
        (12, "1/2", "He added the denominators. The denominators stay 8, so 3/8 + 1/8 = 4/8 = 1/2."),
        (13, "B", "Ordered pairs list x first and y second."),
        (14, "1 3/4 inches", "Add 1/4 + 1/4 + 1/2 + 3/4."),
        (15, "108 sheets", "Multiply 6 × 18."),
        (16, "77 markers", "First find 8 × 12 = 96, then subtract 19."),
    ]

    pdf = canvas.Canvas(str(file_path), pagesize=letter)
    pdf.setTitle(spec_data["title"])
    pdf.setAuthor(spec_data["sellerName"])
    draw_math_task_cards_cover(pdf, spec_data)
    pdf.showPage()
    draw_math_task_directions_page(pdf, spec_data)
    pdf.showPage()
    draw_skill_map_page(pdf, spec_data)
    pdf.showPage()
    draw_task_cards_page(pdf, spec_data, "Task Cards · Set 1", "Mix of place value, measurement, and computation review.", cards[:4])
    pdf.showPage()
    draw_task_cards_page(pdf, spec_data, "Task Cards · Set 2", "Decimals and operations review for stations, partners, or quick checks.", cards[4:8])
    pdf.showPage()
    draw_task_cards_page(pdf, spec_data, "Task Cards · Set 3", "Fractions and reasoning cards that ask students to explain their thinking.", cards[8:12])
    pdf.showPage()
    draw_task_cards_page(pdf, spec_data, "Task Cards · Set 4", "Multi-step application cards with geometry, measurement, and problem solving.", cards[12:16])
    pdf.showPage()
    draw_recording_sheet_page(pdf, spec_data)
    pdf.showPage()
    draw_answer_key_page(pdf, spec_data, answers)
    pdf.showPage()
    draw_reteach_notes_page(pdf, spec_data)
    pdf.showPage()
    pdf.save()


def build_memory_book_pdf(spec_data, file_path: Path):
    pages = [
        {"title": "About Me", "subtitle": "Introduce yourself and share a few details about who you are.", "kind": "about-me"},
        {"title": "My Favorites", "subtitle": "Capture the little classroom things that made this year special.", "kind": "favorites"},
        {"title": "This Year I Learned", "subtitle": "Reflect on new skills, growth, and moments of pride.", "kind": "learned"},
        {"title": "My Best Memory", "subtitle": "Tell the story of one moment you want to remember for a long time.", "kind": "best-memory"},
        {"title": "My Friends", "subtitle": "Save the names, kind words, and friendship memories from this year.", "kind": "friends"},
        {"title": "My Teacher", "subtitle": "Share appreciation and a favorite class moment.", "kind": "teacher"},
        {"title": "Looking Ahead", "subtitle": "Dream about what comes next and set a simple goal.", "kind": "looking-ahead"},
        {"title": "Class Autographs", "subtitle": "Collect signatures or notes from classmates before the year ends.", "kind": "autographs"},
        {"title": "Final Reflection", "subtitle": "Wrap up the year with one final look back and one hopeful look ahead.", "kind": "final-reflection"},
    ]

    pdf = canvas.Canvas(str(file_path), pagesize=letter)
    pdf.setTitle(spec_data["title"])
    pdf.setAuthor(spec_data["sellerName"])

    draw_memory_book_cover(pdf, spec_data)
    pdf.showPage()

    for page in pages:
        draw_memory_book_page(pdf, spec_data, page)
        pdf.showPage()

    pdf.save()


def build_pdf(spec_data, file_path: Path):
    if spec_data["id"] == "end-of-year-memory-book":
        build_memory_book_pdf(spec_data, file_path)
        return
    if spec_data["id"] == "classroom-jobs-kit":
        build_classroom_jobs_pdf(spec_data, file_path)
        return
    if spec_data["id"] == "back-to-school-procedures-pack":
        build_procedures_pack_pdf(spec_data, file_path)
        return
    if spec_data["id"] == "math-test-prep-task-cards-5":
        build_math_test_prep_task_cards_pdf(spec_data, file_path)
        return

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
    page_count = 10 if spec_data["id"] in {"end-of-year-memory-book", "classroom-jobs-kit", "back-to-school-procedures-pack", "math-test-prep-task-cards-5"} else len(page_sections(spec_data))
    preview_pages = spec_data["previewPages"] or build_preview_pages(page_count)
    preview_labels = spec_data["previewLabels"] or build_preview_labels(page_count)
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
        "includedItems": spec_data["includedItems"] or include_items(spec_data, page_count),
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
        "howToUse": spec_data["howToUse"],
        "fileList": spec_data["fileList"],
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
