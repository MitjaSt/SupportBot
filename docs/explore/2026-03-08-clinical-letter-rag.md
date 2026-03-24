# Exploration: Clinical Letter Photo → RAG Guidance

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Allow users to photograph or screenshot a clinical letter or test result, extract the text via vision AI, and use that as the input to a RAG query — returning guidance from Macular Society content on what the condition means for daily life and what support is available.

---

## Problem interpretations

### Interpretation A: The diagnosis-moment gap

A person receives an AMD diagnosis letter from their ophthalmologist. The letter contains clinical language they don't understand, references grading scales they've never seen, and offers no emotional context or next step. They are frightened and don't know where to turn. The Macular Society helpline exists, but they don't know to call it — and even if they did, they'd need to read the letter to describe their situation.

This gap is well-evidenced in the literature: a 2014 qualitative study published in PMC found clear information deficits at diagnosis — patients were ill-informed, couldn't self-advocate, and current verbal/written information methods were deemed "unsuitable for older patients with vision impairment."

### Interpretation B: Ongoing care navigation

A person already living with macular degeneration attends a follow-up appointment and receives a letter about disease progression, a change in treatment (e.g. switching anti-VEGF agents), or a referral to a new service. They want to understand what has changed and whether there is peer support, adaptive equipment advice, or lifestyle guidance relevant to their new situation. This is a recurring need, not just a one-off at diagnosis.

### Interpretation C: The self-advocacy enablement gap

Patients with macular degeneration frequently don't know what they're entitled to: low vision assessments, DVLA notification obligations, benefit entitlements, employment accommodations. A clinical letter might contain the trigger information (e.g. "visual acuity 6/36 in right eye") that, if understood, would prompt a person to seek these entitlements. The RAG system already holds the knowledge to bridge this — but only if it can receive the right query.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Newly diagnosed AMD patient | Receives clinical letter, distressed and confused | Calls helpline (if they know it exists), googles terms | High |
| Long-term patient, worsening condition | Gets follow-up letter with new clinical findings | Waits for next appointment to ask questions | High |
| Carer / family member | Reads letter on behalf of patient | Interprets as best they can, often misses implications | Medium |
| Patient with low literacy or non-English background | Receives letter in standard clinical English | Relies entirely on family or social worker | High |

**Accessibility note:** The primary user group has macular degeneration — central vision loss. Photographing a document accurately, cropping it, and uploading it is a non-trivial task for someone who cannot clearly see the centre of their visual field. Any implementation must account for this severely.

---

## Why now

- GPT-4o's vision capability (image-to-text on real-world photos) is mature enough for typed clinical letters and makes this technically feasible without a dedicated OCR service.
- The Macular Society's RAG knowledge base is already built and indexed — the retrieval layer is ready; this extends the input modality, not the knowledge.
- NHS England's 2024 Decision Support Tool for Wet AMD explicitly identified patient information deficits as a priority area, and named Macular Society as a key third-sector partner for filling that gap.
- Existing AI medical record services (Docus, MediScan) are clinician-oriented and commercially priced. No charity-grade, domain-specific equivalent exists for macular patients.

---

## Existing solutions

**Internal:**
- The RAG system can already answer questions about macular conditions when the user types a query. The gap is translating a clinical document into a usable query.
- Voice input (Whisper) exists — a user could describe the letter verbally, but extracting clinical specifics verbally is unreliable.
- No image upload, OCR, or vision API integration currently exists.

**External:**
- **Docus AI**: Upload lab results for AI interpretation — clinician-oriented, not charity-context, GDPR unclear for UK users.
- **MediScan**: Full medical record summarisation for legal and clinical professionals — not patient-facing.
- **GPT-4o Vision (direct)**: A technically capable user could paste a photo into ChatGPT and ask, but there's no Macular Society grounding, no safety layer, and no domain context.
- NHS Patient Access / NHS App: Shows records digitally but doesn't interpret or guide.

---

## Possible directions

### Direction A: Vision-model extraction → RAG query (fully automated)

User uploads a photo. GPT-4o Vision (or equivalent) extracts the key clinical terms and findings. These are passed silently as context to the RAG system, which returns guidance from the knowledge base. The user never sees the raw extracted text — they just get a warm, grounded response about what life with their condition looks like and what Macular Society offers.

Scope: image upload endpoint, vision API call, extracted-text-to-query transformation, existing RAG pipeline, no new UI beyond a file upload button.

### Direction B: Extraction → user-editable summary → query

Same extraction step, but the system shows the user a plain-English summary of what it extracted ("We found: AMD grade 3, visual acuity 6/24, referred to low vision clinic") and asks them to confirm before querying. Adds a trust and correction layer — important if OCR is imperfect.

Scope: adds a confirmation UI step; increases latency but reduces the risk of acting on misread clinical text.

### Direction C: Guided manual query with letter as reference

Instead of automated extraction, a UI flow prompts the user through key questions ("What does your letter say about your type of macular condition? What did the doctor say about your vision?") using the letter as a reference document they hold. No image processing at all — just structured query construction. Lower technical risk, higher UX burden for a low-vision user.

---

## Hard problems

- **Medical liability boundary**: Even without diagnosing, extracting "AMD Grade 3, VA 6/36" from a letter and responding with guidance risks users interpreting the response as clinical advice. The line between "here's what this means for your life" and "here's what this means medically" is easily blurred in practice.
- **Image quality from low-vision users**: Someone with central vision loss photographing a letter they cannot clearly see will often produce blurry, cropped, or skewed images. OCR accuracy degrades sharply on poor photos. The user cannot verify the capture quality.
- **GDPR — special category health data**: Clinical letters are special category data under UK GDPR Article 9. Uploading them to a third-party API (OpenAI) requires explicit consent, a lawful basis, and a signed Data Processing Agreement. OpenAI's DPA explicitly covers UK GDPR (UK data is defined separately; transfers use SCCs plus the UK Addendum). However, **Zero Data Retention (ZDR) is not the default** — by default OpenAI stores API inputs for 30 days. ZDR must be explicitly requested and agreed with OpenAI. Without ZDR, special category health data would sit in OpenAI's infrastructure for 30 days, which almost certainly cannot be justified under Article 9. Obtaining ZDR is therefore a hard prerequisite, not an optional enhancement.
- **OCR on NHS letter formats**: NHS clinical letters vary enormously — typed, printed from different systems, sometimes handwritten annotations, variable fonts and layouts. Accuracy is not guaranteed.
- **Scope creep into clinical interpretation**: If the system answers "your VA is 6/36, which means..." it has crossed into clinical territory. The retrieval-only grounding helps, but the knowledge base itself may contain clinical descriptions that, in this new context, read as diagnostic.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Can Zero Data Retention (ZDR) be obtained from OpenAI for this account? | Without ZDR, clinical images are stored for 30 days — incompatible with Article 9 obligations for special category data. Hard blocker if unavailable. | Contact OpenAI enterprise/sales to request ZDR; confirm in writing before any build. |
| Once ZDR is in place, does the DPO consider the remaining risk acceptable? | DPA covers UK GDPR and ZDR removes the 30-day storage issue, but the DPO must still confirm lawful basis (likely explicit consent under Article 9(2)(a)) and sign off on the processing activity. | Submit a DPIA (Data Protection Impact Assessment) to the DPO with the ZDR confirmation in hand. |
| How accurately does GPT-4o Vision extract text from phone photos of clinical letters taken by low-vision users? | Core technical feasibility assumption | Spike: collect 5–10 sample letters, test with poor photo simulations |
| Do users actually receive letters they want to query — or is verbal communication from the clinician the primary channel? | Determines real-world frequency of use | User research with helpline staff or Macular Society members |
| Would Macular Society staff or trustees be comfortable with this feature? | Charity reputational and governance risk | Stakeholder consultation |
| Does the existing RAG knowledge base have sufficient coverage of condition-specific guidance to respond usefully to clinical letter inputs? | A technically working feature could still produce unhelpful responses | Synthetic query testing: feed extracted clinical findings, evaluate RAG responses |

---

## Promising direction

**Direction B** — extraction with user-editable confirmation

Direction A is technically elegant but creates opacity and heightens both liability and OCR error risk. Direction C avoids image processing but places too much burden on the user. Direction B threads the needle: the system does the hard work of extraction, but the user sees and confirms what was understood before it drives a RAG query. This consent/confirmation step also serves as a natural point to display a "we are not providing clinical advice" disclaimer, and gives users agency — critical for a low-vision population who may have been told wrong things by automated systems before.

The GDPR position is now partially resolved: OpenAI's DPA explicitly covers UK GDPR. The remaining blocker is Zero Data Retention — this must be agreed with OpenAI before any build. If ZDR cannot be obtained (or while it is being negotiated), an on-premises vision model via Ollama is a viable fallback: data never leaves the server, removing the third-party transfer concern entirely. The Ollama service is already in the Docker infrastructure, so the fallback path has low setup cost.
