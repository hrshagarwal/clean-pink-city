"""Pie / donut charts for the report. Run from gis/; writes the PNGs next to it."""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

R = json.load(open("numbers.json"))
FIG = ""
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.titlesize": 10, "axes.titleweight": "bold",
                     "axes.titlecolor": "#16213b"})
INK, INK2 = "#16213b", "#4b5672"
WET, DRY, GREY, ORANGE, YELLOW, VIOLET, RED, MAG = "#1baf7a", "#2a78d6", "#8a90a3", "#eb6834", "#eda100", "#4a3aa7", "#d03b3b", "#b02457"


def donut(ax, vals, labels, colors, centre, sub, start=90, min_pct=2.5, label_r=1.18):
    tot = sum(vals)
    w, _ = ax.pie(vals, colors=colors, startangle=start, counterclock=False,
                  wedgeprops=dict(width=0.38, edgecolor="white", linewidth=2))
    import math
    items = []
    for wedge, v, lab in zip(w, vals, labels):
        if v <= 0 or v / tot * 100 < min_pct:
            continue
        ang = math.radians((wedge.theta1 + wedge.theta2) / 2)
        items.append([math.cos(ang), math.sin(ang), f"{lab}\n{v/tot*100:.0f}%"])
    # de-overlap labels on each side by enforcing a minimum vertical gap
    for side in (1, -1):
        grp = sorted([it for it in items if (it[0] >= 0) == (side == 1)], key=lambda it: it[1])
        ys = [label_r * it[1] for it in grp]
        for i in range(1, len(ys)):
            if ys[i] - ys[i - 1] < 0.32:
                ys[i] = ys[i - 1] + 0.32
        for it, ly in zip(grp, ys):
            x, y, txt = it
            lx = side * max(label_r * abs(x), 1.0 if abs(ly) < 1.1 else 0.55)
            ax.annotate(txt, xy=(0.81 * x, 0.81 * y), xytext=(lx, ly), ha="left" if side == 1 else "right", va="center",
                        fontsize=8, color=INK, arrowprops=dict(arrowstyle="-", color="#c3c2b7", lw=0.8))
    ax.text(0, 0.08, centre, ha="center", va="center", fontsize=15, fontweight="bold", color=INK)
    ax.text(0, -0.2, sub, ha="center", va="center", fontsize=8, color=INK2)
    ax.set_aspect("equal")


# 1. composition donut + Jaipur wet/dry (official) -------------------------------
comp = R["comp"]
names = {"Biodegradable (food, vegetable, garden)": "Wet / food", "Inert (dust, sweepings, C&D fines)": "Inert, dust",
         "Plastics": "Plastic", "Paper & cardboard": "Paper", "Metals & scrap": "Metal",
         "Textile, rubber, domestic hazardous": "Textile, other", "Glass": "Glass"}
cols = [WET, GREY, DRY, ORANGE, VIOLET, MAG, YELLOW]
fig, ax = plt.subplots(1, 2, figsize=(7.4, 3.0), gridspec_kw=dict(width_ratios=[1.25, 1]))
donut(ax[0], [v["tpd"] for v in comp.values()], [names[k] for k in comp], cols, f"{R['tot_tpd']:.1f} t", "per day, Ward 44", min_pct=3)
ax[0].set_title("(a) What Kardhani's waste is made of", pad=12)
donut(ax[1], [834, 643], ["Wet", "Dry"], [WET, DRY], "1,477 t", "per day, Jaipur")
ax[1].set_title("(b) Jaipur city, official data", pad=12)
plt.tight_layout(); plt.savefig(FIG + "pie_composition.png", dpi=250, bbox_inches="tight"); plt.close()

# 2. fate: existing vs proposed ----------------------------------------------------
lab = {"Composted": "Composted", "Recycled (formal + informal)": "Recycled", "Inert reused": "Inert reused",
       "RDF / Waste-to-energy": "RDF / WtE", "Dumped / landfilled": "Dumped", "Uncollected (littered, burnt, drains)": "Uncollected"}
fcols = [WET, DRY, GREY, YELLOW, MAG, RED]
fig, ax = plt.subplots(1, 2, figsize=(7.4, 3.0))
for a, key, ttl, div in [(ax[0], "existing_fate", "(a) Today", R["diversion_existing"]), (ax[1], "proposed_fate", "(b) With my design", R["diversion_proposed"])]:
    d = R[key]
    donut(a, list(d.values()), [lab[k] for k in d], fcols, f"{div*100:.0f}%", "composted, recycled\nor reused", min_pct=3)
    a.set_title(ttl, pad=12)
plt.tight_layout(); plt.savefig(FIG + "pie_fate.png", dpi=250, bbox_inches="tight"); plt.close()

# 3. cost: capital and yearly benefit --------------------------------------------
cap = {"E-hoppers": 27.0, "Compost shed": 30.0, "Dry waste centre": 15.0, "3-bin sets": 8.3, "App, awareness, bins": 8.8}
ben = {"Recyclables": 40.2, "User charge": 15.9, "Compost sale": 11.8, "Govt. compost support": 5.9, "Less transport": 3.7}
fig, ax = plt.subplots(1, 2, figsize=(7.4, 2.9))
donut(ax[0], list(cap.values()), list(cap.keys()), [DRY, WET, ORANGE, VIOLET, YELLOW], "Rs 89 L", "one-time cost")
ax[0].set_title("(a) Where the money goes", pad=12)
donut(ax[1], list(ben.values()), list(ben.keys()), [DRY, VIOLET, WET, YELLOW, GREY], "Rs 77 L", "benefit per year", start=200)
ax[1].set_title("(b) Where the benefit comes from", pad=12)
plt.tight_layout(); plt.savefig(FIG + "pie_cost.png", dpi=250, bbox_inches="tight"); plt.close()
print("charts written")

# 4. generation: composition donut + Jaipur donut + forecast line ---------------
fig, ax = plt.subplots(1, 3, figsize=(10.5, 3.0), gridspec_kw=dict(width_ratios=[1.25, 1, 1.05]))
donut(ax[0], [v["tpd"] for v in comp.values()], [names[k] for k in comp], cols, f"{R['tot_tpd']:.1f} t", "per day, Ward 44", min_pct=3)
ax[0].set_title("(a) Kardhani's waste (my estimate)", pad=12)
donut(ax[1], [834, 643], ["Wet", "Dry"], [WET, DRY], "1,477 t", "per day, Jaipur")
ax[1].set_title("(b) Jaipur, official data", pad=12)
yrs = [int(y) for y in R["forecast"]]; fc = list(R["forecast"].values())
a = ax[2]; a.plot(yrs, fc, color=DRY, lw=2.2); a.fill_between(yrs, fc, color=DRY, alpha=0.08)
a.scatter([yrs[0], yrs[-1]], [fc[0], fc[-1]], s=36, color=DRY, edgecolor="white", lw=1.4, zorder=3)
a.annotate(f"{fc[0]:.1f} TPD", (yrs[0], fc[0]), xytext=(4, -16), textcoords="offset points", fontsize=8, color=INK)
a.annotate(f"{fc[-1]:.1f} TPD", (yrs[-1], fc[-1]), xytext=(-46, 8), textcoords="offset points", fontsize=8, color=INK)
a.set_ylim(0, 19); a.set_xlim(2025.5, 2041.5); a.set_ylabel("TPD", color=INK2)
for sp in ("top", "right"): a.spines[sp].set_visible(False)
a.grid(axis="y", color="#e1e0d9", lw=0.6); a.set_axisbelow(True); a.tick_params(colors=INK2, labelsize=8)
a.set_title("(c) 15-year forecast", pad=12)
plt.tight_layout(); plt.savefig(FIG + "pie_generation.png", dpi=250, bbox_inches="tight"); plt.close()
print("generation chart written")
