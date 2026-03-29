"""
Plotly chart factory for the JEE Analytics Dashboard.
Uses pre-aggregated SQL queries to avoid loading the full dataset.
"""

import os

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from azure_sql import get_aggregated_stats, load_raw_attempted

# Colour palette
COLORS = {
    "physics":      "#6C63FF",
    "chemistry":    "#00C9A7",
    "maths":        "#FF6B6B",
    "correct":      "#00C9A7",
    "incorrect":    "#FF6B6B",
    "unattempted":  "#94A3B8",
    "bg":           "rgba(0,0,0,0)",
    "grid":         "rgba(255,255,255,0.08)",
    "text":         "#E2E8F0",
    "subtext":      "#94A3B8",
}

SUBJECT_COLOR_MAP = {
    "physics":   COLORS["physics"],
    "chemistry": COLORS["chemistry"],
    "maths":     COLORS["maths"],
}

FONT = "DM Sans, Inter, sans-serif"

SUBJECTS = ["physics", "chemistry", "maths"]
SUBJECT_LABELS = {
    "physics":   "Physics",
    "chemistry": "Chemistry",
    "maths":     "Mathematics",
}

BASE_LAYOUT = dict(
    paper_bgcolor=COLORS["bg"],
    plot_bgcolor=COLORS["bg"],
    font=dict(family=FONT, color=COLORS["text"], size=13),
    margin=dict(t=48, b=40, l=48, r=24),
    legend=dict(
        bgcolor="rgba(0,0,0,0)",
        bordercolor="rgba(0,0,0,0)",
        font=dict(color=COLORS["text"]),
    ),
    xaxis=dict(gridcolor=COLORS["grid"], zerolinecolor=COLORS["grid"]),
    yaxis=dict(gridcolor=COLORS["grid"], zerolinecolor=COLORS["grid"]),
)


# Data loaders 

def load_data() -> pd.DataFrame:
    """
    Kept for backward compatibility with api_main.py.
    Returns the aggregated summary (3 rows).
    """
    return get_aggregated_stats()


def load_summary() -> pd.DataFrame:
    """Per-subject aggregates — 3 rows, no raw data transferred."""
    return get_aggregated_stats()


# Helper: ensure summary has all expected columns

def _ensure_summary(summary: pd.DataFrame) -> pd.DataFrame:
    """
    get_aggregated_stats() returns SQL-computed columns.
    Add subject_label and subject_key columns used by chart functions.
    """
    df = summary.copy()
    df.columns = df.columns.str.lower()
    df["subject_key"]   = df["subject"].str.lower()
    df["subject_label"] = df["subject_key"].map(SUBJECT_LABELS).fillna(df["subject"])
    # Ensure numeric columns are the right type
    for col in ["total", "attempted", "correct", "incorrect", "unattempted", "accuracy", "avg_time"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df

# 1. Accuracy Bar Chart
def fig_accuracy_bar(summary: pd.DataFrame) -> go.Figure:
    """Grouped bar: Total | Attempted | Correct | Incorrect — per subject."""
    stats = _ensure_summary(summary)

    categories = ["Total", "Attempted", "Correct", "Incorrect"]
    cols_map   = {
        "Total":     "total",
        "Attempted": "attempted",
        "Correct":   "correct",
        "Incorrect": "incorrect",
    }
    bar_colors = {
        "Total":     "#64748B",
        "Attempted": "#818CF8",
        "Correct":   COLORS["correct"],
        "Incorrect": COLORS["incorrect"],
    }

    fig = go.Figure()
    for cat in categories:
        fig.add_trace(go.Bar(
            name=cat,
            x=stats["subject_label"],
            y=stats[cols_map[cat]],
            marker_color=bar_colors[cat],
            marker_line_width=0,
            text=stats[cols_map[cat]].astype(int),
            textposition="outside",
            textfont=dict(size=11),
        ))

    fig.update_layout(barmode="group", **BASE_LAYOUT)
    fig.update_yaxes(title_text="Number of Questions")
    return fig

# 2. Accuracy Rate Bar (horizontal)
def fig_accuracy_rate(summary: pd.DataFrame) -> go.Figure:
    """Horizontal bar: accuracy % per subject + overall."""
    stats = _ensure_summary(summary)

    total_attempted = int(stats["attempted"].sum())
    total_correct   = int(stats["correct"].sum())
    overall_acc     = round(total_correct / total_attempted * 100, 1) if total_attempted else 0

    subjects   = list(stats["subject_label"]) + ["Overall"]
    accuracies = list(stats["accuracy"])       + [overall_acc]
    colors     = [SUBJECT_COLOR_MAP.get(k, "#94A3B8") for k in stats["subject_key"]] + ["#F59E0B"]

    fig = go.Figure(go.Bar(
        x=accuracies,
        y=subjects,
        orientation="h",
        marker=dict(color=colors, line_width=0),
        text=[f"{v}%" for v in accuracies],
        textposition="outside",
        textfont=dict(size=12, color=COLORS["text"]),
    ))
    fig.update_layout(**BASE_LAYOUT)
    fig.update_xaxes(range=[0, 115], title_text="Accuracy (%)", ticksuffix="%")
    fig.update_yaxes(title_text="")
    return fig

# 3. Overall Score Donut
def fig_score_donut_overall(summary: pd.DataFrame) -> go.Figure:
    """Donut: overall correct / incorrect / unattempted."""
    stats = _ensure_summary(summary)

    correct     = int(stats["correct"].sum())
    attempted   = int(stats["attempted"].sum())
    incorrect   = int(stats["incorrect"].sum())
    total       = int(stats["total"].sum())
    unattempted = total - attempted

    labels = ["Correct", "Incorrect", "Unattempted"]
    values = [correct, incorrect, unattempted]
    clrs   = [COLORS["correct"], COLORS["incorrect"], COLORS["unattempted"]]

    fig = go.Figure(go.Pie(
        labels=labels, values=values,
        hole=0.55,
        marker=dict(colors=clrs, line=dict(color=COLORS["bg"], width=3)),
        textinfo="label+percent",
        textfont=dict(size=13, color=COLORS["text"]),
        hovertemplate="%{label}: %{value} (%{percent})<extra></extra>",
    ))
    fig.add_annotation(
        text=f"<b>{correct}/{total}</b>",
        x=0.5, y=0.5, showarrow=False,
        font=dict(size=20, color=COLORS["text"]),
    )
    fig.update_layout(showlegend=True, **BASE_LAYOUT)
    return fig

# 4. Per-Subject Donut Subplots
def fig_score_donuts_subjects(summary: pd.DataFrame) -> go.Figure:
    """3-panel donut row — one per subject."""
    stats = _ensure_summary(summary)

    fig = make_subplots(
        rows=1, cols=3,
        specs=[[{"type": "domain"}] * 3],
        subplot_titles=[SUBJECT_LABELS.get(s, s) for s in SUBJECTS],
    )

    for i, subj in enumerate(SUBJECTS):
        row_data = stats[stats["subject_key"] == subj]
        if row_data.empty:
            continue
        row = row_data.iloc[0]

        fig.add_trace(go.Pie(
            labels=["Correct", "Incorrect", "Unattempted"],
            values=[row["correct"], row["incorrect"], row["unattempted"]],
            hole=0.55,
            marker=dict(
                colors=[COLORS["correct"], COLORS["incorrect"], COLORS["unattempted"]],
                line=dict(color=COLORS["bg"], width=2),
            ),
            textinfo="percent",
            textfont=dict(size=12),
            name=SUBJECT_LABELS[subj],
            hovertemplate="%{label}: %{value}<extra></extra>",
        ), row=1, col=i + 1)

        fig.add_annotation(
            text=f"<b>{int(row['correct'])}/{int(row['total'])}</b>",
            x=[0.11, 0.5, 0.89][i], y=0.5,
            showarrow=False,
            font=dict(size=14, color=COLORS["text"]),
        )

    for ann in fig.layout.annotations:
        ann.font.color = COLORS["subtext"]
        ann.font.size  = 14

    fig.update_layout(**BASE_LAYOUT)
    return fig

# 5. Average Time Bar
def fig_avg_time_bar(summary: pd.DataFrame) -> go.Figure:
    """Bar: average time per attempted question, per subject."""
    stats = _ensure_summary(summary)

    fig = go.Figure(go.Bar(
        x=stats["subject_label"],
        y=stats["avg_time"],
        marker=dict(
            color=[SUBJECT_COLOR_MAP.get(k, "#94A3B8") for k in stats["subject_key"]],
            line_width=0,
        ),
        text=[f"{v}s" for v in stats["avg_time"]],
        textposition="outside",
        textfont=dict(size=12),
    ))
    fig.update_layout(**BASE_LAYOUT)
    fig.update_yaxes(title_text="Time (s)")
    return fig

# 6. Time Distribution Box Plot  (needs raw data — only 2 columns)
def fig_time_box(raw: pd.DataFrame) -> go.Figure:
    """
    Box plot of time_taken per subject.
    Expects raw df with columns: subject, time_taken  (attempted rows only).
    """
    raw = raw.copy()
    raw.columns = raw.columns.str.lower()
    raw["subject_label"] = raw["subject"].str.lower().map(SUBJECT_LABELS).fillna(raw["subject"])

    fig = px.box(
        raw, x="subject_label", y="time_taken",
        color="subject_label",
        color_discrete_map={SUBJECT_LABELS[k]: v for k, v in SUBJECT_COLOR_MAP.items()},
        points="outliers",
        labels={"subject_label": "", "time_taken": "Time Taken (s)"},
    )
    fig.update_traces(marker=dict(size=4, opacity=0.6))
    fig.update_layout(**BASE_LAYOUT)
    return fig

# Master builder
def build_all_figures(summary: pd.DataFrame = None, raw: pd.DataFrame = None) -> dict:
    """
    Build all figures.
    - summary: aggregated stats (3 rows). Fetched automatically if not provided.
    - raw:     subject + time_taken for attempted rows. Fetched automatically if not provided.
    """
    if summary is None:
        summary = load_summary()
    if raw is None:
        raw = load_raw_attempted()

    return {
        "accuracy_bar":          fig_accuracy_bar(summary),
        "accuracy_rate":         fig_accuracy_rate(summary),
        "score_donut_overall":   fig_score_donut_overall(summary),
        "score_donuts_subjects": fig_score_donuts_subjects(summary),
        "avg_time_bar":          fig_avg_time_bar(summary),
        "time_box":              fig_time_box(raw),
    }

def export_to_json(figs: dict, out_dir: str = ".") -> None:
    """Serialise all figures to JSON files for a JS/React dashboard."""
    os.makedirs(out_dir, exist_ok=True)
    for name, fig in figs.items():
        path = os.path.join(out_dir, f"{name}.json")
        with open(path, "w") as f:
            f.write(fig.to_json())
        print(f"  ✓ {path}")