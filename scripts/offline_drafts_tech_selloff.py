"""Offline drafts for tech_selloff_2026_11 (no API key yet).

Written in a Claude Code session following prompts/impact_engine.md, then passed through the SAME
pydantic schema + figure-grounding check as backend/impact.py, and saved to the same cache path.
Regenerate with the real API later:  python backend/impact.py tech_selloff_2026_11 --force
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
import impact  # noqa: E402

EVENT = "tech_selloff_2026_11"
COMMON = {"event_id": EVENT, "simulated_inputs": ["event"], "generated_by": "offline-draft"}
NO_PROFILE = "Client profile not available (no MCP); tone inferred from the plan narrative."

DRAFTS = [
    {
        "family_id": "carter",
        "affected": "high", "action_type": "act", "urgency_score": 90,
        "goal_at_risk": {"name": "Home purchase", "date": "2027-01"},
        "why_this_family": "His January 2027 home purchase needs $113,300 but only $30,000 is in cash, so the rest depends on investments that are 73.5% in stocks.",
        "plan_figures_cited": [
            {"figure": "$113,300", "meaning": "cash to hold for the January 2027 home purchase", "source": "PLAN.financial_health.protection_emergency_fund"},
            {"figure": "$30,000", "meaning": "accessible cash today", "source": "PLAN.financial_health.summary_main"},
            {"figure": "73.5%", "meaning": "share of invested savings in stocks", "source": "PLAN.financial_health.assets"},
            {"figure": "33%", "meaning": "technology share of stock holdings", "source": "PLAN.portfolio.recommendations_main"},
        ],
        "tone": "calm-first",
        "subject": "The tech drop and your January home purchase",
        "draft": ("Michael, you've likely seen the news: Nvidia is down 30% in two weeks and US stocks about 8%. "
                  "Drops like this happen, and your long-term plan was built to ride them out. "
                  "The part that matters now is your home purchase in January 2027. It needs $113,300 and you hold "
                  "$30,000 in cash, so the rest depends on investments that are 73.5% in stocks, with technology "
                  "about 33% of your stock holdings. Your plan already flagged keeping near-term home money separate "
                  "from long-term investments. Let's look together this week at where that money sits and confirm the "
                  "size and timing of the purchase, so a market dip doesn't make the decision for you."),
        "voice_script": ("Hi Michael, it's Mohamed. Tech stocks have dropped sharply, and I want to talk about your "
                         "January home purchase. It needs $113,300 and you hold $30,000 in cash, so let's look this "
                         "week at where the rest sits, so a dip doesn't decide the timing for you."),
        "advisor_note": "Confirm where the home-purchase money is held today (cash vs brokerage) and whether the January 2027 date is firm. " + NO_PROFILE,
    },
    {
        "family_id": "lewis",
        "affected": "high", "action_type": "understand", "urgency_score": 70,
        "goal_at_risk": {"name": "College for Ethan", "date": "2027-08"},
        "why_this_family": "Her invested savings are 85.1% stocks with technology at 30.6% and US at 92.6%, a concentration her plan already flagged, and college money rides the same swings.",
        "plan_figures_cited": [
            {"figure": "85.1%", "meaning": "share of invested savings in stocks", "source": "PLAN.financial_health.assets"},
            {"figure": "30.6%", "meaning": "technology share of stock holdings", "source": "PLAN.portfolio.recommendations_main"},
            {"figure": "92.6%", "meaning": "US share of stock holdings", "source": "PLAN.portfolio.recommendations_main"},
            {"figure": "$12,500", "meaning": "Ethan's college payment due August 2027", "source": "PLAN.portfolio.recommendations_main"},
            {"figure": "$80,000", "meaning": "cash, covering 7.9 months of essentials", "source": "PLAN.financial_health.summary_main"},
            {"figure": "$3,032", "meaning": "yearly tax cost of taxable holdings", "source": "PLAN.portfolio.recommendations_main"},
        ],
        "tone": "numbers-first",
        "subject": "What the tech sell-off means for your portfolio",
        "draft": ("Samantha, on the tech sell-off: Nvidia is down 30% in two weeks and US stocks about 8%. "
                  "Your invested savings are 85.1% in stocks, technology is 30.6% of your stock holdings and 92.6% "
                  "is in the US, so you'll feel this more than most. Two steadying facts: your $80,000 in cash covers "
                  "7.9 months of essentials, and Ethan's $12,500 college payment isn't due until August 2027, so "
                  "nothing forces a decision today. Your plan already flagged the tech and US concentration and the "
                  "tax cost of your taxable holdings, about $3,032 a year. This is a good moment to look at both "
                  "together, starting with the missing cost basis so we know what any change would really cost."),
        "voice_script": ("Hi Samantha, it's Mohamed. With tech down this much, your portfolio will show it, since "
                         "technology is 30.6% of your stock holdings. Your $80,000 cash cushion means nothing is forced "
                         "today. Let's use this moment to look at the concentration your plan already flagged."),
        "advisor_note": "Cost basis and purchase dates for taxable holdings are missing; confirm before discussing any change. " + NO_PROFILE,
    },
    {
        "family_id": "weah",
        "affected": "medium", "action_type": "understand", "urgency_score": 45,
        "goal_at_risk": {"name": "Home purchase", "date": "2030"},
        "why_this_family": "Their invested mix is about 81% stocks and Timothy (Growth) and Melanie (Moderate) see risk differently, but $150,000 in cash means no goal depends on today's prices.",
        "plan_figures_cited": [
            {"figure": "81%", "meaning": "approximate share of invested savings in stocks", "source": "PLAN.financial_health.summary_main"},
            {"figure": "$150,000", "meaning": "cash held", "source": "PLAN.financial_health.summary_main"},
            {"figure": "$600,000", "meaning": "planned home purchase in 2030", "source": "PLAN.goals"},
        ],
        "tone": "joint-couple",
        "subject": "The tech drop, and a conversation for both of you",
        "draft": ("Timothy and Melanie, you may have seen that Nvidia is down 30% in two weeks and US stocks about 8%. "
                  "With your invested savings at about 81% in stocks, your balances will show it. Your $150,000 in cash "
                  "isn't affected and covers about 16 months of essentials, so nothing in your plan depends on today's "
                  "prices. The goal closest to the market is the $600,000 home in 2030, which still has time. "
                  "Timothy, your profile is Growth; Melanie, yours is Moderate, so a drop like this may feel different "
                  "to each of you. Your plan already suggested revisiting your mix together, and this is a natural "
                  "moment for that conversation."),
        "voice_script": ("Hi Timothy and Melanie, it's Mohamed. Tech has dropped, and your balances will show it. "
                         "Your cash cushion is untouched, so nothing urgent changes. Since you each feel risk "
                         "differently, I'd like to sit down with both of you and agree on a mix you're both "
                         "comfortable with."),
        "advisor_note": "Plan shows both 81.2% (financial health) and about 77% (portfolio) equity; confirm which figure to quote. " + NO_PROFILE,
    },
    {
        "family_id": "johnson",
        "affected": "low", "action_type": "reassure", "urgency_score": 20,
        "goal_at_risk": {"name": "Retirement", "date": "2044"},
        "why_this_family": "At 60.2% stocks with retirement in 2044, the sell-off changes little; the real lever in their plan is a cash reserve of only 1.4 months.",
        "plan_figures_cited": [
            {"figure": "60.2%", "meaning": "share of invested savings in stocks", "source": "PLAN.financial_health.assets"},
            {"figure": "$19,000", "meaning": "accessible cash", "source": "PLAN.financial_health.protection_emergency_fund"},
            {"figure": "1.4 months", "meaning": "essential expenses covered by cash", "source": "PLAN.financial_health.protection_emergency_fund"},
        ],
        "tone": "joint-couple",
        "subject": "The tech headlines: no action needed, here's why",
        "draft": ("Daniel and Emily, a quick note on the tech headlines: Nvidia is down 30% in two weeks and US stocks "
                  "about 8%. No action is needed from you. Your invested savings are 60.2% in stocks and your "
                  "retirement is planned for 2044, so there is plenty of time for markets to move through this. "
                  "Daniel, your profile is Growth and Emily's is Moderate; this drop doesn't change what either of you needs to do. "
                  "The part of your plan I'd rather we focus on is your cash: $19,000 covers about 1.4 months of "
                  "essentials. That cushion is what keeps a dip like this from ever forcing a decision, so it's worth "
                  "a calm conversation when it suits you."),
        "voice_script": ("Hi Daniel and Emily, it's Mohamed. You may have seen the tech news. No action is needed: "
                         "your retirement is years away and your mix is moderate. When it suits you, I'd like to talk "
                         "about building up your cash cushion, which matters more for you than this drop."),
        "advisor_note": "No action needed on the event itself. Cash reserve is the real topic; consider pairing with the layoffs scenario if it applies. " + NO_PROFILE,
    },
]

LAYOFFS = "layoffs_johnson_employer"
LAYOFF_DRAFTS = [
    {
        "family_id": "johnson",
        "affected": "high", "action_type": "act", "urgency_score": 85,
        "goal_at_risk": {"name": "Emergency cash reserve", "date": "2026-11"},
        "why_this_family": "Their cash covers only 1.4 months of essentials and an $18,000 card at 24.9% competes for the same dollars, so a pause in Daniel's income would be felt within weeks.",
        "plan_figures_cited": [
            {"figure": "$19,000", "meaning": "accessible cash", "source": "PLAN.financial_health.protection_emergency_fund"},
            {"figure": "1.4 months", "meaning": "essential expenses covered by cash (8 to 9 months recommended)", "source": "PLAN.financial_health.protection_emergency_fund"},
            {"figure": "$18,000", "meaning": "credit card balance", "source": "PLAN.financial_health.summary_main"},
            {"figure": "24.9%", "meaning": "credit card interest rate", "source": "PLAN.financial_health.summary_main"},
            {"figure": "$120,000", "meaning": "Emily's salary", "source": "PLAN.financial_health.protection_emergency_fund"},
            {"figure": "$15,032", "meaning": "free cash flow per year", "source": "PLAN.financial_health.summary_main"},
        ],
        "tone": "joint-couple",
        "subject": "The layoff news at Daniel's company",
        "draft": ("Daniel and Emily, I saw that Daniel's employer is announcing 10% layoffs. Nothing has happened to "
                  "Daniel's job, and an announcement isn't a decision, so let's take this calmly and prepare together. "
                  "Your plan already showed that cash is the thin spot: $19,000 covers about 1.4 months of essentials, "
                  "against a recommended 8 to 9 months. The $18,000 card at 24.9% would also weigh more if income paused. "
                  "Emily's $120,000 salary is a real anchor. Let's look this week at what a few months on one income "
                  "would look like, and how your $15,032 a year of free cash flow could build the cushion first."),
        "voice_script": ("Hi Daniel and Emily, it's Mohamed. I saw the layoff news at Daniel's company. Nothing has "
                         "changed yet, so let's prepare calmly. Your cash covers about 1.4 months, so I'd like to look "
                         "together at what a few months on one income would look like. I'll send you some times."),
        "advisor_note": "Event is SIMULATED. Confirm Daniel's role and severance terms before the call; check whether either employer offers a 401(k) match. " + NO_PROFILE,
    },
]

if __name__ == "__main__":
    _, events = impact.load_prompt()
    impact.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    ok = True
    batches = [(EVENT, d) for d in DRAFTS] + [(LAYOFFS, d) for d in LAYOFF_DRAFTS]
    for ev, d in batches:
        fid = d["family_id"]
        r = impact.ImpactResult.model_validate({**d, **COMMON, "event_id": ev})
        src = json.dumps({"EVENT": events[ev], "PLAN": impact.plan_digest(fid)}, ensure_ascii=False)
        bad = impact.ungrounded_figures(r, src)
        wc = (len(r.draft.split()), len(r.voice_script.split()))
        print(f"{ev[:14]:14} {fid:8} draft={wc[0]}w voice={wc[1]}w ungrounded={bad}")
        if bad or wc[0] > 120 or wc[1] > 60:
            ok = False
            continue
        (impact.CACHE_DIR / f"{ev}__{fid}.json").write_text(r.model_dump_json(indent=2), encoding="utf8")
    sys.exit(0 if ok else 1)
