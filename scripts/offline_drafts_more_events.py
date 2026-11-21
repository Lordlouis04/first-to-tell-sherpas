"""Offline drafts for the extra simulated events in prompts/events_extra.json.

Same contract as offline_drafts_tech_selloff.py: written in a Claude Code session following
prompts/impact_engine.md, validated with the backend's pydantic schema + figure-grounding check,
saved to data/cache/impact/. Regenerate with the API:  python backend/impact.py <event_id> <family> --force
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
import impact  # noqa: E402

NO_PROFILE = "Client profile not available (no MCP); tone inferred from the plan narrative."
COMMON = {"simulated_inputs": ["event"], "generated_by": "offline-draft"}


def fig(figure, meaning, source):
    return {"figure": figure, "meaning": meaning, "source": source}


DRAFTS = [
    # ---------- Fed rate cut ----------
    {"event_id": "rate_cut_2026_11", "family_id": "johnson",
     "affected": "medium", "action_type": "understand", "urgency_score": 50, "goal_at_risk": None,
     "why_this_family": "$560,000 of their debt is a mortgage at 6.5%, so falling rates could free cash for the thin reserve and the 401(k)s they don't fund today.",
     "plan_figures_cited": [fig("$560,000", "mortgage balance", "PLAN.financial_health.debt"),
                            fig("6.5%", "mortgage rate", "PLAN.financial_health.debt"),
                            fig("$65,040", "total debt payments per year, incl. mortgage", "PLAN.portfolio.summary_main")],
     "tone": "joint-couple", "subject": "Lower rates and your mortgage",
     "draft": ("Daniel and Emily, the Federal Reserve has cut rates by 0.5 percentage points, and mortgage rates are expected "
               "to follow. That matters for you: $560,000 of your debt is the mortgage at 6.5%, and total debt payments take "
               "$65,040 a year. If rates keep falling, it may be worth looking at whether refinancing makes sense, though "
               "costs and timing need checking first. Any monthly savings could go where your plan needs them most: your "
               "cash cushion and your two 401(k)s, which get $0 today. No decision is needed now; let's look at the numbers "
               "together when you have time."),
     "voice_script": ("Hi Daniel and Emily, it's Mohamed. Rates have just come down, and your mortgage is at 6.5%. If mortgage "
                      "rates keep falling, refinancing could free up money for your cash cushion. No decision needed now; "
                      "let's look at it together soon."),
     "advisor_note": "Refinancing costs, remaining term and live rate quotes are not in the data; confirm before the call. " + NO_PROFILE},
    {"event_id": "rate_cut_2026_11", "family_id": "weah",
     "affected": "low", "action_type": "understand", "urgency_score": 30, "goal_at_risk": None,
     "why_this_family": "About $60,223 of their $150,000 cash sits above the reserve, and falling rates make that idle cash earn less.",
     "plan_figures_cited": [fig("$150,000", "cash held", "PLAN.financial_health.summary_main"),
                            fig("$60,223", "cash above reserve and near-term goals", "PLAN.financial_health.summary_main"),
                            fig("18%", "credit card rate", "PLAN.financial_health.summary_main")],
     "tone": "joint-couple", "subject": "Lower rates and your spare cash",
     "draft": ("Timothy and Melanie, the Federal Reserve has cut rates by 0.5 percentage points, so the interest on savings "
               "accounts is likely to drop. You hold $150,000 in cash, and about $60,223 of it sits above your reserve and "
               "near-term goals. With rates falling, that spare cash earns less while it waits, which makes the conversation "
               "your plan already suggested a little more timely: how to share it between life insurance, an umbrella "
               "policy, the 18% card and college saving for Liam and Josh. Nothing urgent here, and the order is your "
               "choice. Let's find a time for both of you."),
     "voice_script": ("Hi Timothy and Melanie, it's Mohamed. Rates have come down, so the spare cash you hold will earn a bit "
                      "less. It's a good moment to decide together how to use it, as your plan suggested. Nothing urgent; "
                      "let's find a time for both of you."),
     "advisor_note": "Current savings rate on their cash account is not in the data. " + NO_PROFILE},
    {"event_id": "rate_cut_2026_11", "family_id": "carter",
     "affected": "medium", "action_type": "understand", "urgency_score": 65,
     "goal_at_risk": {"name": "Home purchase", "date": "2027-01"},
     "why_this_family": "His home purchase is two months away and the plan has no mortgage payment yet, so the rate move changes a number he will soon commit to.",
     "plan_figures_cited": [fig("$113,300", "cash to hold for the January 2027 home purchase", "PLAN.financial_health.protection_emergency_fund"),
                            fig("$2,800", "rent per month today", "PLAN.financial_health.debt")],
     "tone": "numbers-first", "subject": "Lower rates and your January home purchase",
     "draft": ("Michael, the Federal Reserve has cut rates by 0.5 percentage points, and mortgage rates are expected to follow. "
               "That's relevant to your January 2027 home purchase, which needs $113,300 in cash. Your plan doesn't yet "
               "include what the new mortgage payment would be, and that payment will decide how the purchase fits next to "
               "your rent of $2,800 a month today and your retirement saving. Let's look at current rate quotes together and "
               "put a real monthly number into your plan, so you can decide on timing with the full picture."),
     "voice_script": ("Hi Michael, it's Mohamed. Rates just came down, which matters for your January home purchase. Your plan "
                      "doesn't include the new mortgage payment yet, so let's get real quotes and put that number in, so you "
                      "can decide on timing with the full picture."),
     "advisor_note": "New mortgage payment is missing from the plan data; gather lender quotes. " + NO_PROFILE},

    # ---------- Tax law: higher 2027 contribution limits ----------
    {"event_id": "tax_limits_2027", "family_id": "lewis",
     "affected": "high", "action_type": "act", "urgency_score": 60,
     "goal_at_risk": {"name": "Retirement", "date": "2044-07"},
     "why_this_family": "She has $0 in retirement accounts and savings projected to run out at 73, so higher tax-advantaged limits are directly useful.",
     "plan_figures_cited": [fig("$7,500", "deductible traditional IRA room", "PLAN.financial_health.summary_main"),
                            fig("$4,400", "HSA room if the health plan qualifies", "PLAN.financial_health.summary_main"),
                            fig("$1,408", "yearly tax value of the HSA at 32%", "PLAN.portfolio.recommendations_main"),
                            fig("$6,418", "yearly cash flow shortfall", "PLAN.financial_health.summary_main")],
     "tone": "numbers-first", "subject": "A new tax law opens more room for your retirement",
     "draft": ("Samantha, a new tax law raises next year's contribution limits for 401(k), IRA and HSA accounts. For you this "
               "is more than a headline: your retirement accounts hold $0 today, and your plan shows savings running out at "
               "age 73. Under the limits in your plan, you could put up to $7,500 into a deductible traditional IRA and up "
               "to $4,400 into an HSA, which is worth about $1,408 a year in tax. Higher limits widen that room. Since your "
               "cash flow is about $6,418 a year short, the realistic step is redirecting what you already save. Let's look "
               "at it together."),
     "voice_script": ("Hi Samantha, it's Mohamed. A new tax law raises next year's limits for retirement and health savings "
                      "accounts. Your retirement accounts are empty today, so this is a real opening. Let's look at "
                      "redirecting what you already save into them."),
     "advisor_note": "Event is SIMULATED and the new 2027 limit figures are not in the plan data; confirm official numbers. Check whether a workplace 401(k) is available. " + NO_PROFILE},
    {"event_id": "tax_limits_2027", "family_id": "carter",
     "affected": "low", "action_type": "reassure", "urgency_score": 25,
     "goal_at_risk": {"name": "Retirement", "date": "2047-04"},
     "why_this_family": "He already has unused 401(k) room; the law adds more, but his near-term home purchase and tight cash flow mean no action now.",
     "plan_figures_cited": [fig("$17,000", "current 401(k) deferral", "PLAN.portfolio.portfolio_today_whats_working"),
                            fig("$24,500", "401(k) limit in the plan", "PLAN.portfolio.portfolio_today_whats_working"),
                            fig("$7,500", "unused 401(k) room", "PLAN.portfolio.summary_main"),
                            fig("$1,800", "tax value of that room", "PLAN.portfolio.portfolio_today_verdict")],
     "tone": "numbers-first", "subject": "The new contribution limits: no action needed yet",
     "draft": ("Michael, a new tax law raises next year's contribution limits for 401(k), IRA and HSA accounts. Here is what "
               "it means for you. Today you defer $17,000 to your 401(k) against a $24,500 limit, so you already have $7,500 "
               "of unused room, worth about $1,800 in tax. A higher limit adds room, but it doesn't change your priorities: "
               "the January 2027 home purchase and your cash cushion come first, and your cash flow is already tight. So no "
               "action is needed now. Once the home is settled, let's look at using that room to close your retirement gap."),
     "voice_script": ("Hi Michael, it's Mohamed. A new law raises next year's retirement contribution limits. For now nothing "
                      "changes for you: your home purchase and cash cushion come first. Once the home is settled, we can use "
                      "that extra room for retirement."),
     "advisor_note": "Event is SIMULATED; confirm official 2027 limits. " + NO_PROFILE},
    {"event_id": "tax_limits_2027", "family_id": "johnson",
     "affected": "medium", "action_type": "understand", "urgency_score": 45,
     "goal_at_risk": {"name": "Retirement", "date": "2044"},
     "why_this_family": "Neither contributes to their 401(k) and the retirement gap needs $34,165 a year, so the law is a natural prompt to start.",
     "plan_figures_cited": [fig("$24,500", "401(k) limit each, per the plan", "PLAN.financial_health.summary_main"),
                            fig("$34,165", "extra yearly saving to close the retirement gap", "PLAN.financial_health.summary_main"),
                            fig("$15,032", "free cash flow per year", "PLAN.financial_health.summary_main")],
     "tone": "joint-couple", "subject": "New contribution limits, and a first step for your 401(k)s",
     "draft": ("Daniel and Emily, a new tax law raises next year's contribution limits for 401(k), IRA and HSA accounts. The "
               "headline matters less for you than the starting point: each of you contributes $0 to your 401(k) today, while "
               "each of you could put in up to $24,500 under the limits in your plan. Closing your retirement gap would take "
               "about $34,165 more a year, more than your $15,032 of free cash flow, so this is about small, steady steps "
               "rather than the maximum. A good first check is whether either employer offers a match. Let's look at it "
               "together."),
     "voice_script": ("Hi Daniel and Emily, it's Mohamed. A new law raises next year's retirement contribution limits. Neither "
                      "of you is contributing to your 401(k) today, so let's start by checking whether your employers offer a "
                      "match, then take small, steady steps."),
     "advisor_note": "Event is SIMULATED; confirm official 2027 limits and whether either employer offers a match. " + NO_PROFILE},

    # ---------- Home prices +6% ----------
    {"event_id": "home_prices_2026_11", "family_id": "carter",
     "affected": "high", "action_type": "act", "urgency_score": 75,
     "goal_at_risk": {"name": "Home purchase", "date": "2027-01"},
     "why_this_family": "His $550,000 home purchase is two months away; a 6% price rise changes the cash he needs, and he holds $30,000 against $113,300.",
     "plan_figures_cited": [fig("$550,000", "planned home purchase in 2027", "PLAN.goals"),
                            fig("$113,300", "cash to hold for the purchase", "PLAN.financial_health.protection_emergency_fund"),
                            fig("$30,000", "accessible cash today", "PLAN.financial_health.summary_main")],
     "tone": "calm-first", "subject": "Home prices and your January budget",
     "draft": ("Michael, home prices in major US markets are up 6% over the past year. With your purchase planned for January "
               "2027, it's worth checking that the budget still holds. Your plan budgets $550,000 for the home and sets aside "
               "$113,300 in cash for it, and you hold $30,000 today. If prices in your area have moved, the cash needed for "
               "the down payment and closing costs moves with them. Let's look together at what comparable homes cost now and "
               "confirm the budget and timing, so your plan reflects what you'd actually pay."),
     "voice_script": ("Hi Michael, it's Mohamed. Home prices have risen about 6% over the past year, so let's check that your "
                      "January budget still holds and confirm how much cash you'll need before you commit."),
     "advisor_note": "Local price data for his target area is not in the plan; national figure is SIMULATED. " + NO_PROFILE},
    {"event_id": "home_prices_2026_11", "family_id": "weah",
     "affected": "low", "action_type": "reassure", "urgency_score": 20,
     "goal_at_risk": {"name": "Home purchase", "date": "2030"},
     "why_this_family": "Their $600,000 home purchase is in 2030; rising prices may change the budget, but there is time.",
     "plan_figures_cited": [fig("$600,000", "planned home purchase in 2030", "PLAN.goals"),
                            fig("$350,000", "current home value", "PLAN.financial_health.assets")],
     "tone": "joint-couple", "subject": "Home prices and your 2030 plans",
     "draft": ("Timothy and Melanie, home prices in major US markets are up 6% over the past year. Your plan has a $600,000 "
               "home purchase in 2030, so there's time, and one year of prices doesn't set the price you'll pay then. Your "
               "current home, valued at $350,000, is part of the picture too. Nothing to do today. When we next review, let's "
               "check whether $600,000 is still the right figure for the home you want and how it fits next to college saving "
               "for Liam and Josh."),
     "voice_script": ("Hi Timothy and Melanie, it's Mohamed. Home prices have gone up, and you're planning a home purchase in "
                      "2030. There's time and nothing to do today, but at our next review let's check that the budget still "
                      "fits the home you want."),
     "advisor_note": NO_PROFILE},
    {"event_id": "home_prices_2026_11", "family_id": "lewis",
     "affected": "low", "action_type": "understand", "urgency_score": 25,
     "goal_at_risk": {"name": "Home purchase", "date": "2030"},
     "why_this_family": "Her home is most of her wealth and she plans a $500,000 purchase in 2030 that competes with college and retirement.",
     "plan_figures_cited": [fig("$900,000", "home value, owned outright", "PLAN.financial_health.assets"),
                            fig("$500,000", "planned second home in 2030", "PLAN.goals"),
                            fig("$750", "cash above reserve and near-term goals", "PLAN.financial_health.summary_main")],
     "tone": "numbers-first", "subject": "Home prices: your home today and your 2030 plan",
     "draft": ("Samantha, home prices in major US markets are up 6% over the past year. Two sides of that touch your plan. Your "
               "home, valued at $900,000 and fully owned, is most of your wealth. And you're planning a second home purchase "
               "of $500,000 in 2030, which could cost more if prices keep rising. That purchase competes with college for "
               "Ethan and Ava and with retirement saving, and only $750 of your cash sits above your reserve and near-term "
               "goals. No action is needed now; at our next review, let's revisit the 2030 budget alongside college costs."),
     "voice_script": ("Hi Samantha, it's Mohamed. Home prices are up, which lifts the value of your home and may raise the cost "
                      "of the one you plan for 2030. Nothing to do now; let's revisit that budget alongside college costs at "
                      "our next review."),
     "advisor_note": NO_PROFILE},

    # ---------- Tuition +5% ----------
    {"event_id": "tuition_2027", "family_id": "lewis",
     "affected": "high", "action_type": "act", "urgency_score": 80,
     "goal_at_risk": {"name": "College for Ethan", "date": "2027-08"},
     "why_this_family": "Ethan's $12,500 payment is due August 2027, $98,838 of college funding is still needed and only $750 of cash sits above the reserve.",
     "plan_figures_cited": [fig("$12,500", "Ethan's college payment due August 2027", "PLAN.portfolio.recommendations_main"),
                            fig("$98,838", "college funding still needed", "PLAN.financial_health.summary_main"),
                            fig("$80,000", "cash held", "PLAN.financial_health.summary_main"),
                            fig("$750", "cash above reserve and near-term goals", "PLAN.financial_health.summary_main"),
                            fig("$6,418", "yearly cash flow shortfall", "PLAN.financial_health.summary_main")],
     "tone": "numbers-first", "subject": "Tuition is going up: let's plan Ethan's and Ava's college",
     "draft": ("Samantha, universities are announcing 5% tuition increases for the 2027-28 academic year. That lands right on "
               "your plan: Ethan's $12,500 payment is due in August 2027, and your plan still needs $98,838 for college for "
               "Ethan and Ava, with $0 in 529 plans today. Your $80,000 in cash covers the next payment, but only $750 sits "
               "above your reserve and near-term goals, and your cash flow is about $6,418 a year short. Let's look this month "
               "at Ethan's actual costs and a funding plan for both children, so college doesn't eat into your safety cushion."),
     "voice_script": ("Hi Samantha, it's Mohamed. Universities are raising tuition for next year, and Ethan's payment is due in "
                      "August. Your cash can cover it, but the cushion is thin, so let's map out college costs for both "
                      "children this month."),
     "advisor_note": "Ethan's school and actual cost are not in the data. Plan shows college starting Aug 2026 but the next payment due Aug 2027; confirm. " + NO_PROFILE},
]

if __name__ == "__main__":
    _, events = impact.load_prompt()
    impact.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    ok = True
    for d in DRAFTS:
        ev, fid = d["event_id"], d["family_id"]
        assert fid in events[ev].get("applies_to", [fid]), (ev, fid)
        r = impact.ImpactResult.model_validate({**d, **COMMON})
        src = json.dumps({"EVENT": events[ev], "PLAN": impact.plan_digest(fid)}, ensure_ascii=False)
        bad = impact.ungrounded_figures(r, src)
        wc = (len(r.draft.split()), len(r.voice_script.split()))
        print(f"{ev[:18]:18} {fid:8} draft={wc[0]}w voice={wc[1]}w ungrounded={bad}")
        if bad or wc[0] > 120 or wc[1] > 60:
            ok = False
            continue
        (impact.CACHE_DIR / f"{ev}__{fid}.json").write_text(r.model_dump_json(indent=2), encoding="utf8")
    sys.exit(0 if ok else 1)
