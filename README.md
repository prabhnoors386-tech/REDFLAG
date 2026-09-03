# REDFLAG — MPLADS Risk & Anomaly Intelligence

A lightweight, explainable Smart India Hackathon 2026 MVP for prioritising MPLADS works for human review.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Data provenance

The included dataset is explicitly labelled **Synthetic / Demonstration**. It is designed to exercise the detector pipeline without presenting synthetic records as verified government records.

The app is structured around a replaceable data service. A verified external API can be added later without scattering API calls through UI components.

## MVP intelligence

- Data quality validation
- Cost / peer outlier signal
- Sanction and completion timeline signals
- Rule-based compliance/prohibited-work review
- Lightweight TF-IDF-style text similarity
- Agency portfolio risk
- Explainable 0–100 score
- Severity + confidence
- Alerts, review/dismiss/escalate states
- Case export
- Responsive investigation workflow

The score is an analytical prioritisation aid, not a legal finding of fraud or wrongdoing.

## Current intentional limitation

Physical-progress/payment mismatch, GPS hotspot analytics, vendor network analysis, computer vision, and supervised fraud classification are not dependencies of this MVP because the research source does not establish reliable public availability of those fields/labels.
